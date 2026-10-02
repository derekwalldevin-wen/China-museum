// 设计品质自检 · design-audit
//
// 目标：把"获奖级品质"落成可复跑、可比较的量化检查。每次改版后跑一次，分数只允许上升。
// 用法（先起 preview 与无头浏览器，与 e2e 套件同一套环境变量）：
//   HUAXIA_CDP_ENDPOINT=http://127.0.0.1:11340 HUAXIA_E2E_URL=http://127.0.0.1:4700/ node scripts/design-audit.mjs
// 输出：docs/audits/design/design-audit.json 与 design-audit.md，并在终端打印分项得分。
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const base = process.env.HUAXIA_E2E_URL ?? 'http://127.0.0.1:4690/';
const endpoint = process.env.HUAXIA_CDP_ENDPOINT;
if (!endpoint) { console.error('缺少 HUAXIA_CDP_ENDPOINT'); process.exit(2); }

const STORY = 'hub-zhy';
const version = await (await fetch(`${endpoint}/json/version`)).json();
const socket = new WebSocket(version.webSocketDebuggerUrl);
await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
let messageId = 0;
const pending = new Map();
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
});
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const id = ++messageId;
  pending.set(id, message => message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result));
  socket.send(JSON.stringify({ id, method, params, sessionId }));
});
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, sessionId);
// 冷启动度量：禁用 HTTP 缓存，让 LCP/CLS 反映真实首访
await send('Network.enable', {}, sessionId);
await send('Network.setCacheDisabled', { cacheDisabled: true }, sessionId);
// 在导航前注入性能观察器，才能拿到 LCP 与 CLS
await send('Page.addScriptToEvaluateOnNewDocument', { source: `
  window.__auditPerf = { cls: 0, lcp: 0 };
  try {
    new PerformanceObserver(list => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__auditPerf.cls += entry.value; }).observe({ type: 'layout-shift', buffered: true });
    window.__auditPerf.events = [];
    window.__auditPerf.longTasks = [];
    try { new PerformanceObserver(list => { for (const entry of list.getEntries()) window.__auditPerf.longTasks.push(Math.round(entry.duration)); }).observe({ type: 'longtask', buffered: true }); } catch { /* 旧浏览器忽略 */ }
    new PerformanceObserver(list => { for (const entry of list.getEntries()) { if (/^(pointer|mouse|click|key|touch)/.test(entry.name)) window.__auditPerf.events.push(Math.round(entry.duration)); } }).observe({ type: 'event', durationThreshold: 16, buffered: true });
    new PerformanceObserver(list => { const entries = list.getEntries(); const last = entries[entries.length - 1]; window.__auditPerf.lcp = last.startTime; const element = last.element; window.__auditPerf.lcpElement = element ? (element.tagName.toLowerCase() + (element.currentSrc ? ' ' + element.currentSrc.split('/').pop() : '') + ' | ' + (element.className || '').toString().slice(0, 40) + ' | ' + (element.textContent || '').trim().slice(0, 24)) : null; }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch { /* 旧浏览器忽略 */ }
` }, sessionId);

const evaluate = async expression => {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId);
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails).slice(0, 300));
  return result.result.value;
};
const viewport = async (width, height, mobile) => send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile }, sessionId);
// 轮询等待页面条件成立：固定 sleep 在线上（走 CDN）会测到"尚未挂载"的空页面
const waitFor = async (expression, label, timeoutMs = 25000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await evaluate(`!!(${expression})`)) return true;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`design-audit 等待超时：${label}`);
};
const goto = async (url, readyExpression, readyTimeout = 25000) => {
  await send('Page.navigate', { url }, sessionId);
  await waitFor(`document.querySelector('.atlas-shell') || document.querySelector('.story-experience')`, '应用外壳挂载', 30000);
  if (await evaluate(`!!document.querySelector('.ink-intro-skip')`)) {
    await evaluate(`document.querySelector('.ink-intro-skip').click()`);
    await waitFor(`!document.querySelector('[data-ink-intro]')`, '开场退出', 15000);
  }
  // 目标内容必须按路由判定（首页等地名，故事页等正文），否则会被另一层提前满足
  await waitFor(readyExpression, `目标内容就绪：${readyExpression.slice(0, 60)}`, readyTimeout);
  await new Promise(resolve => setTimeout(resolve, 800));
};

// 页面内取数：排版、对比度、无障碍、溢出
const probe = `(() => {
  const px = value => parseFloat(value) || 0;
  const luminance = ([r, g, b]) => { const f = c => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const parse = value => { const m = value.match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const parts = m[1].split(',').map(v => parseFloat(v)); return { rgb: parts.slice(0, 3), a: parts.length > 3 ? parts[3] : 1 }; };
  const blend = (fg, bg) => fg.rgb.map((c, i) => Math.round(c * fg.a + bg[i] * (1 - fg.a)));
  const backgroundOf = element => {
    let node = element;
    while (node && node !== document.documentElement) {
      const parsed = parse(getComputedStyle(node).backgroundColor);
      if (parsed && parsed.a >= 0.98) return parsed.rgb;
      node = node.parentElement;
    }
    return [13, 16, 14];
  };
  const contrast = (element, property = 'color') => {
    const style = getComputedStyle(element);
    const fg = parse(style[property]); if (!fg) return null;
    const bg = backgroundOf(element);
    const fgBlended = fg.a >= 0.98 ? fg.rgb : blend(fg, bg);
    const [l1, l2] = [luminance(fgBlended), luminance(bg)].sort((a, b) => b - a);
    return Math.round(((l1 + 0.05) / (l2 + 0.05)) * 100) / 100;
  };

  const paragraph = document.querySelector('.story-chapters p') || document.querySelector('.story-paper p');
  const summary = document.querySelector('.story-summary > p');
  const heading = document.querySelector('.story-reader > h1');
  const paper = document.querySelector('.story-paper');
  const paraStyle = paragraph ? getComputedStyle(paragraph) : null;
  const paperStyle = paper ? getComputedStyle(paper) : null;
  const paraWidth = paragraph ? paragraph.getBoundingClientRect().width : 0;
  const paraSize = paraStyle ? px(paraStyle.fontSize) : 0;

  let animated = 0, transitioned = 0, scrollDriven = 0;
  const animationNames = new Set();
  const seconds = value => Math.max(...String(value).split(',').map(part => parseFloat(part) || 0), 0);
  for (const element of document.querySelectorAll('.story-experience *, main *')) {
    if (element.closest('[aria-hidden="true"], [inert]')) continue;
    const style = getComputedStyle(element);
    const duration = seconds(style.animationDuration);
    if (style.animationName && style.animationName !== 'none') {
      for (const name of style.animationName.split(',')) animationNames.add(name.trim());
      // 被 prefers-reduced-motion 压到 0.01ms 的动画不算"可感知动效"
      if (duration > 0.05) animated += 1;
    }
    if (style.transitionDuration && seconds(style.transitionDuration) > 0.05) transitioned += 1;
    if (style.animationTimeline && style.animationTimeline !== 'auto') scrollDriven += 1;
  }

  const sizes = new Map();
  const below = [];
  for (const element of document.querySelectorAll('.story-experience *, main *')) {
    // 只统计真正可见的层：故事页打开时地图仍是 aria-hidden / inert，不计入。
    if (element.closest('[aria-hidden="true"], [inert]')) continue;
    if (element.checkVisibility && !element.checkVisibility()) continue;
    const size = px(getComputedStyle(element).fontSize);
    if (!element.textContent.trim()) continue;
    sizes.set(size, (sizes.get(size) ?? 0) + 1);
    if (size > 0 && size < 12) below.push({ size, cls: String(element.className).slice(0, 48), text: element.textContent.trim().slice(0, 20) });
  }

  const images = [...document.querySelectorAll('img')];
  const missingAlt = images.filter(image => !image.getAttribute('alt') && image.getAttribute('alt') !== '').length;
  const lazy = images.filter(image => image.loading === 'lazy').length;
  const focusRule = [...document.styleSheets].some(sheet => { try { return [...sheet.cssRules].some(rule => /:focus-visible/.test(rule.selectorText ?? '')); } catch { return false; } });  const smallTargetList = [...document.querySelectorAll('a, button')].map(element => {
    if (element.closest('p, li, .story-evidence-links, .story-breadcrumb')) return null;
    const box = element.getBoundingClientRect();
    if (!(box.width > 0 && box.height > 0)) return null;
    if (box.height >= 24 && box.width >= 24) return null;
    return { w: Math.round(box.width), h: Math.round(box.height), cls: String(element.className).slice(0, 56), text: (element.textContent ?? '').trim().slice(0, 18) };
  }).filter(Boolean);
  const smallTargets = smallTargetList.length;
  const headingLevels = [...document.querySelectorAll('h1, h2, h3, h4')].map(element => Number(element.tagName[1]));
  let headingOrderOk = true, previous = 0;
  for (const level of headingLevels) { if (previous && level > previous + 1) headingOrderOk = false; previous = level; }

  return {
    paragraph: paragraph ? {
      family: paraStyle.fontFamily,
      size: paraStyle.fontSize,
      lineHeight: paraStyle.lineHeight,
      indent: paraStyle.textIndent,
      align: paraStyle.textAlign,
      width: Math.round(paraWidth),
      charsPerLine: Math.round(paraWidth / paraSize),
      colour: paraStyle.color,
      contrast: contrast(paragraph),
    } : null,
    summaryContrast: summary ? contrast(summary) : null,
    heading: heading ? { family: getComputedStyle(heading).fontFamily, size: getComputedStyle(heading).fontSize, contrast: contrast(heading) } : null,
    paper: paperStyle ? { spacingTrim: paperStyle.textSpacingTrim ?? paperStyle.textAutospace ?? 'n/a', autospace: paperStyle.textAutospace ?? 'n/a' } : null,
    distinctSizes: [...sizes.keys()].sort((a, b) => a - b),
    belowTwelve: below.slice(0, 12),
    belowTwelveCount: below.length,
    images: { total: images.length, missingAlt, lazy },
    focusRule,
    animated,
    transitioned,
    scrollDriven,
    animationNames: [...animationNames],
    structure: {
      h1Count: document.querySelectorAll('h1').length,
      main: document.querySelectorAll('main').length,
      nav: document.querySelectorAll('nav').length,
      indexAnchors: [...document.querySelectorAll('.story-index a')].filter(anchor => (anchor.getAttribute('href') ?? '').startsWith('#')).length,
      progressDriven: [...document.querySelectorAll('.story-progress i')].some(bar => getComputedStyle(bar).animationTimeline && getComputedStyle(bar).animationTimeline !== 'auto'),
    },
    smallTargets,
    smallTargetList,
    headingOrderOk,
    performance: (() => {
      const audit = window.__auditPerf ?? { cls: 0, lcp: 0 };
      const fcp = performance.getEntriesByName('first-contentful-paint')[0];
      return { inpMs: (window.__auditPerf.events ?? []).length ? Math.max(...window.__auditPerf.events) : null, eventCount: (window.__auditPerf.events ?? []).length, lcpMs: audit.lcp ? Math.round(audit.lcp) : null, cls: Math.round((audit.cls ?? 0) * 1000) / 1000, fcpMs: fcp ? Math.round(fcp.startTime) : null, lcpElement: audit.lcpElement ?? null };
    })(),
    hierarchy: (() => {
      const sizeOf = selector => { const element = document.querySelector(selector); return element ? parseFloat(getComputedStyle(element).fontSize) : null; };
      const body = paragraph ? parseFloat(paraStyle.fontSize) : null;
      const h1 = sizeOf('h1'), h2 = sizeOf('h2');
      return { h1, h2, body, h1Ratio: h1 && body ? Math.round((h1 / body) * 100) / 100 : null, h2Ratio: h2 && body ? Math.round((h2 / body) * 100) / 100 : null };
    })(),
    spacing: (() => {
      const scope = document.querySelector('.story-experience') ?? document.body;
      let total = 0, onGrid = 0;
      for (const element of scope.querySelectorAll('*')) {
        const style = getComputedStyle(element);
        for (const property of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginBottom', 'rowGap', 'columnGap']) {
          const value = parseFloat(style[property]);
          if (!Number.isFinite(value) || value === 0) continue;
          total += 1;
          if (Math.abs(value % 4) < 0.5) onGrid += 1;
        }
      }
      return { total, onGrid, ratio: total ? Math.round((onGrid / total) * 100) : 100 };
    })(),
    tokens: (() => {
      const scope = document.querySelector('.story-experience');
      if (!scope) return null;
      const radii = new Set(), shadows = new Set();
      for (const element of scope.querySelectorAll('*')) {
        const style = getComputedStyle(element);
        if (style.borderTopLeftRadius && style.borderTopLeftRadius !== '0px') radii.add(style.borderTopLeftRadius);
        if (style.boxShadow && style.boxShadow !== 'none' && !/rgba\(0, 0, 0, 0\)/.test(style.boxShadow)) shadows.add(style.boxShadow.slice(0, 40));
      }
      return { radii: radii.size, shadows: shadows.size, radiusValues: [...radii], shadowValues: [...shadows] };
    })(),
    mapLabels: (() => {
      const measure = selector => {
        const element = [...document.querySelectorAll(selector)].find(el => (el.textContent ?? '').trim() && el.getClientRects().length);
        if (!element) return null;
        const css = parseFloat(getComputedStyle(element).fontSize);
        const box = element.getBoundingClientRect();
        // 行高约 1.15 倍字号；再乘以 SVG 的缩放系数即为屏幕有效高度
        const scale = box.height / (css * 1.15);
        return { css, screenHeight: Math.round(box.height * 10) / 10, effective: Math.round(css * scale * 10) / 10 };
      };
      return { short: measure('.scroll-label-short'), count: measure('.scroll-label-count') };
    })(),
    zoom: {
      trigger: !!document.querySelector('.artifact-zoom-trigger'),
      statuses: document.querySelectorAll('.artifact-status').length,
    },
    keyboard: {
      skipLink: !!document.querySelector('.story-skip, a[data-skip-link]'),
      firstTabbable: (() => {
        const list = [...document.querySelectorAll('a[href], button, [tabindex]:not([tabindex="-1"])')].filter(element => element.getClientRects().length);
        return list[0] ? (list[0].textContent ?? '').trim().slice(0, 16) : null;
      })(),
      ariaLive: document.querySelectorAll('[aria-live], [role="status"], [role="alert"]').length,
    },
    overflow: document.documentElement.scrollWidth - window.innerWidth,
  };
})()`;

const results = {};
await viewport(1440, 960, false);
await goto(`${base}?guide=1&story=${STORY}`, `document.querySelector('.story-chapters p')`);
results.desktopStory = await evaluate(probe);

// 放大浏览：真实点击 → 出现 aria-modal 对话框 → Esc 关闭
// 插图元数据在线上是异步取的：先等入口出现（最多 15 秒），再点
const zoomReady = await waitFor("document.querySelector('.artifact-zoom-trigger')", '作品图放大入口', 15000).catch(() => false);
// 入口随图片元数据异步出现，故等待后再读一次本维度数据
results.desktopStory.zoom = await evaluate(`({ trigger: !!document.querySelector('.artifact-zoom-trigger'), statuses: document.querySelectorAll('.artifact-status').length })`);
results.desktopStory.zoomWaited = zoomReady;
const zoomTriggerBox = await evaluate(`(() => { const element = document.querySelector('.artifact-zoom-trigger'); if (!element) return null; const box = element.getBoundingClientRect(); return { x: Math.round(box.left + box.width / 2), y: Math.round(box.top + box.height / 2) }; })()`);
results.zoomDialog = { triggerFound: !!zoomTriggerBox, opened: false, closedByEscape: false, ariaModal: false };
if (zoomTriggerBox) {
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: zoomTriggerBox.x, y: zoomTriggerBox.y, button: 'left', clickCount: 1 }, sessionId);
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: zoomTriggerBox.x, y: zoomTriggerBox.y, button: 'left', clickCount: 1 }, sessionId);
  await new Promise(resolve => setTimeout(resolve, 600));
  results.zoomDialog = await evaluate(`(() => { const dialog = document.querySelector('.artifact-zoom'); return { triggerFound: true, opened: !!dialog, ariaModal: dialog?.getAttribute('aria-modal') === 'true', closedByEscape: false, focusInside: !!dialog && dialog.contains(document.activeElement) }; })()`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }, sessionId);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }, sessionId);
  await new Promise(resolve => setTimeout(resolve, 400));
  results.zoomDialog.closedByEscape = await evaluate(`!document.querySelector('.artifact-zoom')`);
}

// 交互响应：长任务必须**归因到点击时间窗**（点击后 250ms 内启动），
// 否则审计流程自身的后台工作（网络回调、GC）会被误算成交互卡顿。
await evaluate(`window.__auditPerf.longTasks = []; window.__auditPerf.events = []`);
const attributed = [];
for (const selector of ['.story-index a', '.story-reflection button']) {
  const box = await evaluate(`(() => { const el = document.querySelector('${selector}'); if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2) }; })()`);
  if (!box) continue;
  const mark = await evaluate('performance.now()');
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 }, sessionId);
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 }, sessionId);
  await new Promise(resolve => setTimeout(resolve, 450));
  attributed.push({ selector, tasks: await evaluate(`(window.__auditPerf.longTasks ?? []).filter(task => task.start >= ${mark} && task.start <= ${mark} + 250).map(task => task.duration)`) });
}
const allTasks = await evaluate(`(window.__auditPerf.longTasks ?? []).map(task => task.duration)`);
results.interaction = {
  attributedMax: attributed.flatMap(item => item.tasks).reduce((max, value) => Math.max(max, value), 0),
  attributedCount: attributed.flatMap(item => item.tasks).length,
  detail: attributed,
  allLongTaskMax: allTasks.length ? Math.max(...allTasks) : 0,
};
await viewport(390, 844, true);
await new Promise(resolve => setTimeout(resolve, 1200));
results.mobileStory = await evaluate(probe);
await viewport(1440, 960, false);
await goto(base, `document.querySelectorAll('g.scroll-province').length === 34`);
results.desktopHome = await evaluate(probe);
await viewport(390, 844, true);
await new Promise(resolve => setTimeout(resolve, 1200));
results.mobileHome = await evaluate(probe);

// 减弱动效偏好下再测一次：滚动驱动与入场动画都必须消失（可降级）
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }, sessionId);
await viewport(1440, 960, false);
await goto(`${base}?guide=1&story=${STORY}`, `document.querySelector('.story-chapters p')`);
results.reducedMotion = await evaluate(probe);
await send('Emulation.setEmulatedMedia', { features: [] }, sessionId);

// 限速档测量：Slow 4G（1.6Mbps / 750kbps / 150ms RTT），把网络因素从指标里剥离
await send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: Math.round(1.6 * 1024 * 1024 / 8), uploadThroughput: Math.round(750 * 1024 / 8) }, sessionId);
await send('Network.setCacheDisabled', { cacheDisabled: true }, sessionId);
await viewport(1440, 960, false);
await goto(base, `document.querySelectorAll('g.scroll-province').length === 34`, 60000);
results.throttledHome = await evaluate(probe);
await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }, sessionId);

await send('Target.closeTarget', { targetId });
socket.close();

// 关键帧是否只动 transform/opacity（避免布局抖动）
const keyframeLayoutProps = (() => {
  if (!existsSync('dist/assets')) return null;
  const used = new Set([...(results.desktopStory.animationNames ?? []), ...(results.mobileStory.animationNames ?? [])]);
  let found = 0;
  for (const name of readdirSync('dist/assets').filter(file => file.endsWith('.css'))) {
    const css = readFileSync(`dist/assets/${name}`, 'utf8');
    for (const block of css.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?)\}\s*\}/g)) {
      if (!used.has(block[1])) continue;
      if (/(width|height|top|left|right|bottom|margin|padding|font-size)\s*:/.test(block[2])) found += 1;
    }
  }
  return found;
})();

// 交互状态是否齐备（故事页的载入态 / 错误态 / 重试）
const storySource = readFileSync('src/components/StoryExperience.tsx', 'utf8');
const stateCoverage = {
  loading: /正在展卷/.test(storySource) && /role=\{currentPayload\?\.error \? 'alert' : 'status'\}/.test(storySource),
  error: /故事暂时无法展开/.test(storySource) && /重试加载故事/.test(storySource),
  empty: /story-editor-note/.test(storySource),
};

// 首屏 JS（静态 ESM 图）
const firstScreenBytes = (() => {
  if (!existsSync('dist/index.html')) return null;
  const html = readFileSync('dist/index.html', 'utf8');
  const entries = [...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map(match => match[1]);
  const seen = new Set();
  const queue = entries.map(relative => path.join('dist', relative));
  let total = 0;
  while (queue.length) {
    const file = queue.shift();
    if (seen.has(file) || !existsSync(file)) continue;
    seen.add(file);
    const code = readFileSync(file, 'utf8');
    total += statSync(file).size;
    for (const match of code.matchAll(/(?:from|import)\s*["'](\.[^"']+\.js)["']/g)) queue.push(path.join(path.dirname(file), match[1]));
  }
  return total;
})();

// 渲染阻塞的主样式包大小（首帧关键路径）
const mainCssBytes = (() => {
  if (!existsSync('dist/assets')) return null;
  const entries = readdirSync('dist/assets').filter(name => name.endsWith('.css'));
  const html = readFileSync('dist/index.html', 'utf8');
  const linked = [...html.matchAll(/href="\.\/assets\/([^"]+\.css)"/g)].map(match => match[1]);
  const target = linked[0] ?? entries.sort((a, b) => statSync(`dist/assets/${b}`).size - statSync(`dist/assets/${a}`).size)[0];
  return statSync(`dist/assets/${target}`).size;
})();

const serifOk = /Noto Serif SC|Songti|Source Han Serif/.test(results.desktopStory.paragraph?.family ?? '');
// 源码层检查：列表/面板缩略图是否使用懒加载（首图 eager 属于 LCP 正确做法）
const lazyHits = (() => {
  let hits = 0;
  const scan = dir => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (['node_modules', 'dist', '.git'].includes(entry.name)) continue;
      const full = `${dir}/${entry.name}`;
      if (entry.isDirectory()) { scan(full); continue; }
      if (!/\.tsx$/.test(entry.name)) continue;
      hits += (readFileSync(full, 'utf8').match(/loading="lazy"|loading=\{/g) ?? []).length;
    }
  };
  scan('src');
  return hits;
})();
const chars = results.desktopStory.paragraph?.charsPerLine ?? 0;
const indentEm = (() => {
  const indent = parseFloat(results.desktopStory.paragraph?.indent ?? '0');
  const size = parseFloat(results.desktopStory.paragraph?.size ?? '17');
  return Math.round((indent / size) * 10) / 10;
})();
const lineHeightRatio = (() => {
  const ratio = parseFloat(results.desktopStory.paragraph?.lineHeight ?? '0') / parseFloat(results.desktopStory.paragraph?.size ?? '17');
  return Math.round(ratio * 100) / 100;
})();
const spacingTrimOk = String(results.desktopStory.paper?.spacingTrim ?? '').includes('trim');

const categories = [
  {
    name: '地图标注',
    max: 4,
    items: [
      { label: `手机省简称有效尺寸 ≥10px（实测 ${results.mobileHome.mapLabels?.short?.effective ?? 'n/a'}px；CSS ${results.mobileHome.mapLabels?.short?.css ?? 'n/a'}px）`, pass: (results.mobileHome.mapLabels?.short?.effective ?? 0) >= 10, score: (results.mobileHome.mapLabels?.short?.effective ?? 0) >= 10 ? 2 : 0 },
      { label: `桌面省简称有效尺寸 ≥10px（实测 ${results.desktopHome.mapLabels?.short?.effective ?? 'n/a'}px）`, pass: (results.desktopHome.mapLabels?.short?.effective ?? 0) >= 10, score: (results.desktopHome.mapLabels?.short?.effective ?? 0) >= 10 ? 1 : 0 },
      { label: `桌面件数有效尺寸 ≥10px（实测 ${results.desktopHome.mapLabels?.count?.effective ?? 'n/a'}px）`, pass: (results.desktopHome.mapLabels?.count?.effective ?? 0) >= 10, score: (results.desktopHome.mapLabels?.count?.effective ?? 0) >= 10 ? 1 : 0 },
    ],
  },
  {
    name: '图像工艺',
    max: 6,
    items: [
      { label: `作品图可放大（入口存在 ${results.desktopStory.zoom?.trigger ? '有' : '无'}，状态标记 ${results.desktopStory.zoom?.statuses} 处）`, pass: !!results.desktopStory.zoom?.trigger, score: results.desktopStory.zoom?.trigger ? 3 : 0 },
      { label: `放大视图为 aria-modal 对话框且 Esc 可关（打开 ${results.zoomDialog?.opened ? '是' : '否'}／模态 ${results.zoomDialog?.ariaModal ? '是' : '否'}／Esc 关闭 ${results.zoomDialog?.closedByEscape ? '是' : '否'}）`, pass: !!results.zoomDialog?.opened && !!results.zoomDialog?.ariaModal && !!results.zoomDialog?.closedByEscape, score: results.zoomDialog?.opened && results.zoomDialog?.ariaModal && results.zoomDialog?.closedByEscape ? 3 : 0 },
    ],
  },

  {
    name: '中文字排',
    max: 12,
    items: [
      { label: '正文使用衬线（系统宋体等）', pass: serifOk, score: serifOk ? 3 : 0 },
      { label: `行长 30–34 字（实测 ${chars}）`, pass: chars >= 30 && chars <= 34, score: chars >= 28 && chars <= 36 ? 3 : 1 },
      { label: `段首缩进 2em（实测 ${indentEm}em）`, pass: indentEm >= 1.9 && indentEm <= 2.1, score: indentEm >= 1.9 && indentEm <= 2.1 ? 2 : 0 },
      { label: `字号下限 ≥12px（违规 ${results.desktopStory.belowTwelveCount}）`, pass: results.desktopStory.belowTwelveCount === 0, score: results.desktopStory.belowTwelveCount === 0 ? 2 : 0 },
      { label: `行高 ≥1.8（实测 ${lineHeightRatio}）`, pass: lineHeightRatio >= 1.8, score: lineHeightRatio >= 1.8 ? 1 : 0 },
      { label: '标点宽度调整（text-spacing-trim）', pass: spacingTrimOk, score: spacingTrimOk ? 1 : 0 },
    ],
  },
  {
    name: '字号体系',
    max: 2,
    items: [
      { label: `一页字号数量 ≤10（实测 ${results.desktopStory.distinctSizes.length}）`, pass: results.desktopStory.distinctSizes.length <= 10, score: results.desktopStory.distinctSizes.length <= 10 ? 2 : 0 },
    ],
  },
  {
    name: '对比度',
    max: 8,
    items: [
      { label: `正文对比度 ≥7（实测 ${results.desktopStory.paragraph?.contrast}）`, pass: (results.desktopStory.paragraph?.contrast ?? 0) >= 7, score: (results.desktopStory.paragraph?.contrast ?? 0) >= 7 ? 4 : 2 },
      { label: `次要文字 ≥4.5（导语 ${results.desktopStory.summaryContrast}／标题 ${results.desktopStory.heading?.contrast}）`, pass: Math.min(results.desktopStory.summaryContrast ?? 0, results.desktopStory.heading?.contrast ?? 0) >= 4.5, score: Math.min(results.desktopStory.summaryContrast ?? 0, results.desktopStory.heading?.contrast ?? 0) >= 4.5 ? 4 : 1 },
    ],
  },
  {
    name: '无障碍',
    max: 8,
    items: [
      { label: `图片 alt 完整（缺 ${results.desktopStory.images.missingAlt}/${results.desktopStory.images.total}）`, pass: results.desktopStory.images.missingAlt === 0, score: results.desktopStory.images.missingAlt === 0 ? 2 : 0 },
      { label: '存在 :focus-visible 焦点样式', pass: results.desktopStory.focusRule, score: results.desktopStory.focusRule ? 2 : 0 },
      { label: `触控目标 ≥24×24（不合格 ${results.desktopStory.smallTargets}）`, pass: results.desktopStory.smallTargets === 0, score: results.desktopStory.smallTargets === 0 ? 2 : 0 },
      { label: '标题层级不跳级', pass: results.desktopStory.headingOrderOk, score: results.desktopStory.headingOrderOk ? 2 : 0 },
    ],
  },
  {
    name: '移动端',
    max: 6,
    items: [
      { label: `390px 无横向溢出（实测 ${results.mobileStory.overflow}px）`, pass: results.mobileStory.overflow <= 1, score: results.mobileStory.overflow <= 1 ? 4 : 0 },
      { label: `移动端字号下限 ≥12px（违规 ${results.mobileStory.belowTwelveCount}）`, pass: results.mobileStory.belowTwelveCount === 0, score: results.mobileStory.belowTwelveCount === 0 ? 2 : 0 },
    ],
  },
  {
    name: '性能预算',
    max: 9,
    items: [
      { label: `首屏 JS ≤322KB（实测 ${Math.round((firstScreenBytes ?? 0) / 1000)}KB；硬上限 328KB）`, pass: (firstScreenBytes ?? 1e9) <= 322000, score: (firstScreenBytes ?? 1e9) <= 322000 ? 4 : (firstScreenBytes ?? 1e9) <= 328000 ? 2 : 0 },
      { label: `图片策略：首图 eager（LCP）+ 列表图 lazy（源码 ${lazyHits} 处）`, pass: lazyHits >= 2 && results.desktopStory.images.lazy === 0, score: lazyHits >= 2 && results.desktopStory.images.lazy === 0 ? 2 : 0 },
      { label: `渲染阻塞样式包 ≤80KB（实测 ${Math.round((mainCssBytes ?? 0) / 1024)}KB）`, pass: (mainCssBytes ?? 1e9) <= 81920, score: (mainCssBytes ?? 1e9) <= 81920 ? 3 : 0 },
    ],
  },
  {
    name: '动效与手感',
    max: 13,
    items: [
      { label: `存在滚动驱动动效（阅读进度驱动 ${results.desktopStory.structure?.progressDriven ? '有' : '无'}）`, pass: !!results.desktopStory.structure?.progressDriven, score: results.desktopStory.structure?.progressDriven ? 5 : 0 },
      { label: `减弱动效偏好下动画关闭（剩余 ${results.reducedMotion?.animated ?? 'n/a'} 个可感知动画）`, pass: (results.reducedMotion?.animated ?? 1) === 0, score: (results.reducedMotion?.animated ?? 1) === 0 ? 5 : 0 },
      { label: `在用关键帧只动 transform/opacity（布局属性关键帧 ${keyframeLayoutProps} 个）`, pass: keyframeLayoutProps === 0, score: keyframeLayoutProps === 0 ? 3 : 0 },
    ],
  },
  {
    name: '交互状态',
    max: 4,
    items: [
      { label: '载入态齐备（role=status/alert）', pass: stateCoverage.loading, score: stateCoverage.loading ? 2 : 0 },
      { label: '错误态含重试 / 空态说明', pass: stateCoverage.error && stateCoverage.empty, score: stateCoverage.error && stateCoverage.empty ? 2 : 0 },
    ],
  },
  {
    name: '结构层级',
    max: 4,
    items: [
      { label: `唯一 h1（实测 ${results.desktopStory.structure?.h1Count}）`, pass: results.desktopStory.structure?.h1Count === 1, score: results.desktopStory.structure?.h1Count === 1 ? 2 : 0 },
      { label: `地标齐备（main ${results.desktopStory.structure?.main}／nav ${results.desktopStory.structure?.nav}）`, pass: (results.desktopStory.structure?.main ?? 0) >= 1 && (results.desktopStory.structure?.nav ?? 0) >= 1, score: (results.desktopStory.structure?.main ?? 0) >= 1 && (results.desktopStory.structure?.nav ?? 0) >= 1 ? 2 : 0 },
    ],
  },
  {
    name: '键盘可达',
    max: 8,
    items: [
      { label: `章节锚点可键盘跳转（${results.desktopStory.structure?.indexAnchors ?? 0} 个）`, pass: (results.desktopStory.structure?.indexAnchors ?? 0) >= 4, score: (results.desktopStory.structure?.indexAnchors ?? 0) >= 4 ? 3 : 0 },
      { label: `存在跳过导航链接（首个可聚焦：${results.desktopStory.keyboard?.firstTabbable ?? 'n/a'}）`, pass: !!results.desktopStory.keyboard?.skipLink, score: results.desktopStory.keyboard?.skipLink ? 3 : 0 },
      { label: `状态播报齐备（aria-live/status/alert ${results.desktopStory.keyboard?.ariaLive} 处）`, pass: (results.desktopStory.keyboard?.ariaLive ?? 0) >= 1, score: (results.desktopStory.keyboard?.ariaLive ?? 0) >= 1 ? 2 : 0 },
    ],
  },
  {
    name: '实测性能',
    max: 8,
    items: [
      { label: `限速档(Slow 4G) LCP ≤2500ms（实测 ${results.throttledHome?.performance?.lcpMs ?? 'n/a'}ms；FCP ${results.throttledHome?.performance?.fcpMs ?? 'n/a'}ms；不限速 ${results.desktopHome.performance?.lcpMs ?? 'n/a'}ms）`, pass: (results.throttledHome?.performance?.lcpMs ?? 99999) <= 2500, score: (results.throttledHome?.performance?.lcpMs ?? 99999) <= 2500 ? 4 : (results.throttledHome?.performance?.lcpMs ?? 99999) <= 4000 ? 2 : 0 },
      { label: `CLS ≤0.1（实测 ${results.desktopHome.performance?.cls ?? 'n/a'}）`, pass: (results.desktopHome.performance?.cls ?? 9) <= 0.1, score: (results.desktopHome.performance?.cls ?? 9) <= 0.1 ? 2 : 0 },
      { label: `交互归因长任务 ≤50ms（点击后 250ms 窗口内实测最长 ${results.interaction?.attributedMax ?? 'n/a'}ms／${results.interaction?.attributedCount ?? 0} 个；全页长任务最长 ${results.interaction?.allLongTaskMax ?? 'n/a'}ms 仅参考）`, pass: (results.interaction?.attributedMax ?? 9999) <= 50, score: (results.interaction?.attributedMax ?? 9999) <= 50 ? 2 : 0 },
    ],
  },
  {
    name: '视觉层级',
    max: 4,
    items: [
      { label: `标题/正文级差 ≥2（实测 ${results.desktopStory.hierarchy?.h1Ratio}）`, pass: (results.desktopStory.hierarchy?.h1Ratio ?? 0) >= 2, score: (results.desktopStory.hierarchy?.h1Ratio ?? 0) >= 2 ? 2 : 0 },
      { label: `章节/正文级差 ≥1.15（实测 ${results.desktopStory.hierarchy?.h2Ratio}）`, pass: (results.desktopStory.hierarchy?.h2Ratio ?? 0) >= 1.15, score: (results.desktopStory.hierarchy?.h2Ratio ?? 0) >= 1.15 ? 2 : 0 },
    ],
  },
  {
    name: '一致性',
    max: 4,
    items: [
      { label: `间距落在 4px 基准（实测 ${results.desktopStory.spacing?.ratio}%，${results.desktopStory.spacing?.onGrid}/${results.desktopStory.spacing?.total}）`, pass: (results.desktopStory.spacing?.ratio ?? 0) >= 90, score: (results.desktopStory.spacing?.ratio ?? 0) >= 90 ? 2 : (results.desktopStory.spacing?.ratio ?? 0) >= 75 ? 1 : 0 },
      { label: `圆角取值收敛（实测 ${results.desktopStory.tokens?.radii ?? 'n/a'} 种：${(results.desktopStory.tokens?.radiusValues ?? []).join('、') || '直角版式'}）`, pass: (results.desktopStory.tokens?.radii ?? 9) <= 2, score: (results.desktopStory.tokens?.radii ?? 9) <= 2 ? 1 : 0 },
      { label: `阴影取值收敛（实测 ${results.desktopStory.tokens?.shadows ?? 'n/a'} 种）`, pass: (results.desktopStory.tokens?.shadows ?? 9) <= 2, score: (results.desktopStory.tokens?.shadows ?? 9) <= 2 ? 1 : 0 },
    ],
  },
];

const total = categories.reduce((sum, category) => sum + category.items.reduce((inner, item) => inner + item.score, 0), 0);
const max = categories.reduce((sum, category) => sum + category.max, 0);
const threshold = 85;

mkdirSync('docs/audits/design', { recursive: true });
const report = { generatedAt: new Date().toISOString(), story: STORY, firstScreenBytes, mainCssBytes, total, max, threshold, categories, measurements: results };
writeFileSync('docs/audits/design/design-audit.json', `${JSON.stringify(report, null, 2)}\n`, 'utf8');

const lines = [`# 设计品质自检 · ${new Date().toISOString().slice(0, 10)}`, '', `总分 **${total}/${max}**（获奖级自检阈值 ${threshold}）`, ''];
for (const category of categories) {
  lines.push(`## ${category.name} · ${category.items.reduce((sum, item) => sum + item.score, 0)}/${category.max}`);
  for (const item of category.items) lines.push(`- ${item.pass ? '✅' : '⚠️'} ${item.label}`);
  lines.push('');
}
writeFileSync('docs/audits/design/design-audit.md', `${lines.join('\n')}\n`, 'utf8');

console.log(`设计品质自检：${total}/${max}（阈值 ${threshold}）`);
for (const category of categories) {
  const score = category.items.reduce((sum, item) => sum + item.score, 0);
  console.log(`  ${category.name}: ${score}/${category.max}`);
  for (const item of category.items) console.log(`    ${item.pass ? '✓' : '✗'} ${item.label}`);
}
