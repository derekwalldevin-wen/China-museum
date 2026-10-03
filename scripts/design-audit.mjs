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
// 面板探针：与主探针同口径（可见层、字号下限、文字对比度）
const panelProbe = `(() => {
  const scope = document.querySelector('[role="dialog"]') || document.querySelector('.atlas-shell');
  const pool = [...scope.querySelectorAll('*')].filter(element => !element.closest('[aria-hidden="true"], [inert]'));
  const parse = value => { const m = value.match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const parts = m[1].split(',').map(Number); return { rgb: parts.slice(0, 3), a: parts.length > 3 ? parts[3] : 1 }; };
  const lum = ([r, g, b]) => { const f = c => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const backgroundOf = element => { let node = element; while (node && node !== document.documentElement) { const parsed = parse(getComputedStyle(node).backgroundColor); if (parsed && parsed.a >= 0.9) return parsed.rgb; node = node.parentElement; } return [13, 16, 14]; };
  const ratio = element => { const fg = parse(getComputedStyle(element).color); if (!fg) return null; const bg = backgroundOf(element); const blended = fg.a >= 0.9 ? fg.rgb : fg.rgb.map((c, i) => Math.round(c * fg.a + bg[i] * (1 - fg.a))); const [hi, lo] = [lum(blended), lum(bg)].sort((a, b) => b - a); return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100; };
  let below = 0;
  for (const element of pool) {
    if (!(element.textContent || '').trim()) continue;
    const size = parseFloat(getComputedStyle(element).fontSize);
    if (Number.isFinite(size) && size < 12) below += 1;
  }
  const texts = [...scope.querySelectorAll('p, li, h1, h2, h3, dd, dt, span')].filter(element => !element.closest('[aria-hidden="true"], [inert]') && (element.textContent || '').trim().length > 12);
  const ratios = texts.map(ratio).filter(value => typeof value === 'number');
  // 大字号（≥24px 或 ≥18.66px 粗体）按 AA 的 3.0 门槛
  const lowContrast = texts.filter(element => { const value = ratio(element); if (typeof value !== 'number') return false; const style = getComputedStyle(element); const size = parseFloat(style.fontSize); const large = size >= 24 || (size >= 18.66 && parseInt(style.fontWeight, 10) >= 700); return value < (large ? 3 : 4.5); }).length;
  return { belowTwelveCount: below, contrastMin: ratios.length ? Math.min(...ratios) : null, lowContrast,
    backTarget: (() => {
      const back = [...document.querySelectorAll('button, a')].find(element => /返回|关闭/.test((element.textContent || '') + (element.getAttribute('aria-label') || '')));
      if (!back) return null;
      const box = back.getBoundingClientRect();
      return { w: Math.round(box.width), h: Math.round(box.height) };
    })() };
})()`;

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
  // 统一取"可见层"：故事页打开时地图仍是 aria-hidden / inert，历史上有三次统计被它污染
  const visiblePool = selector => [...document.querySelectorAll(selector)].filter(element => !element.closest('[aria-hidden="true"], [inert]'));
  // 中西文自动间距与数字对齐：用隐藏容器做对照测量（visibility:hidden 仍参与布局）
  const measureHost = (fontFamily, fontSize) => {
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:0;top:0;visibility:hidden;white-space:pre;font-family:' + fontFamily + ';font-size:' + fontSize + ';';
    document.body.appendChild(host);
    return host;
  };
  const bodyParagraph = document.querySelector('.story-paper p');
  const autospaceHost = measureHost(getComputedStyle(bodyParagraph ?? document.body).fontFamily, '17px');
  const autospaceWidth = css => { const span = document.createElement('span'); span.style.cssText = 'white-space:pre;' + css; span.textContent = '汉字ABC汉字'; autospaceHost.appendChild(span); return Math.round(span.getBoundingClientRect().width * 100) / 100; };
  const autospace = { on: autospaceWidth('text-autospace:normal;'), off: autospaceWidth('text-autospace:no-autospace;') };
  autospace.delta = Math.round((autospace.on - autospace.off) * 100) / 100;
  autospaceHost.remove();
  const digitHost = measureHost(getComputedStyle(document.querySelector('.atlas-footer') ?? document.body).fontFamily, '12px');
  const digitSpan = document.createElement('span'); digitSpan.style.whiteSpace = 'pre'; digitSpan.textContent = '0123456789'; digitHost.appendChild(digitSpan);
  const digitWidths = [];
  for (let digitIndex = 0; digitIndex < 10; digitIndex += 1) {
    const digitRange = document.createRange();
    digitRange.setStart(digitSpan.firstChild, digitIndex); digitRange.setEnd(digitSpan.firstChild, digitIndex + 1);
    digitWidths.push(Math.round(digitRange.getBoundingClientRect().width * 100) / 100);
  }
  digitHost.remove();
  const digits = { spread: Math.round((Math.max(...digitWidths) - Math.min(...digitWidths)) * 100) / 100 };
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
  for (const element of visiblePool('.story-experience *, main *')) {
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
  for (const element of visiblePool('.story-experience *, main *')) {
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
    kinsoku: (() => {
      // 破折号「—」按 GB/T 15834 允许出现在行首，不计入违规
      const BAD_START = '、。，．；：！？）］｝〉》」』】〕｀´〃…‥·～!?,.;:)]}';
      const BAD_END = '（［｛〈《「『【〔([{';
      let total = 0, badStart = 0, badEnd = 0; const samples = [];
      for (const paragraph of document.querySelectorAll('.story-chapters p')) {
        if ((paragraph.textContent ?? '').length < 20) continue;
        const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
        const lines = [];
        while (walker.nextNode()) {
          const node = walker.currentNode;
          for (let index = 0; index < node.data.length; index += 1) {
            const range = document.createRange();
            range.setStart(node, index); range.setEnd(node, index + 1);
            const rect = range.getBoundingClientRect();
            if (!rect.width && !rect.height) continue;
            const top = Math.round(rect.top);
            const last = lines[lines.length - 1];
            if (last && Math.abs(last.top - top) <= 3) last.text += node.data[index];
            else lines.push({ top, text: node.data[index] });
          }
        }
        for (const line of lines) {
          const value = line.text.replace(/\s/g, '');
          if (value.length < 4) continue;
          total += 1;
          if (BAD_START.includes(value[0])) { badStart += 1; if (samples.length < 4) samples.push('行首' + value[0]); }
          if (BAD_END.includes(value[value.length - 1])) { badEnd += 1; if (samples.length < 4) samples.push('行尾' + value[value.length - 1]); }
        }
      }
      return { lines: total, badStart, badEnd, samples };
    })(),
    mapHit: (() => {
      const circles = [...document.querySelectorAll('.scroll-label-hit')].filter(el => el.getClientRects().length);
      if (!circles.length) return null;
      const sizes = circles.map(el => { const box = el.getBoundingClientRect(); return { w: Math.round(box.width), h: Math.round(box.height) }; });
      return { count: sizes.length, minW: Math.min(...sizes.map(s => s.w)), minH: Math.min(...sizes.map(s => s.h)), ok44: sizes.filter(s => s.w >= 44 && s.h >= 44).length };
    })(),
    focal: (() => {
      const viewportArea = innerWidth * innerHeight;
      const pool = visiblePool('.story-experience *, .atlas-shell *');
      const bodyElement = document.querySelector('.story-chapters p') ?? document.body;
      const bodySize = parseFloat(getComputedStyle(bodyElement).fontSize) || 16;
      const loud = [];
      for (const element of pool) {
        const box = element.getBoundingClientRect();
        if (box.width <= 8 || box.height <= 8 || box.top >= innerHeight || box.bottom <= 0) continue;
        const style = getComputedStyle(element);
        if (style.visibility === 'hidden' || style.opacity === '0') continue;
        const own = [...element.childNodes].filter(node => node.nodeType === 3 && node.textContent.trim()).map(node => node.textContent.trim()).join('');
        if (own.length >= 2 && parseFloat(style.fontSize) >= bodySize * 1.6) loud.push({ kind: 'text', size: Math.round(parseFloat(style.fontSize)), text: own.slice(0, 12) });
        const isMedia = element.matches('img, svg, canvas');
        if (isMedia && !element.parentElement?.closest('img, svg, canvas, picture')) {
          const area = box.width * box.height;
          if (area >= viewportArea * 0.2) loud.push({ kind: 'media', tag: element.tagName.toLowerCase(), share: Math.round(area / viewportArea * 100) });
        }
      }
      // 文本按"含于更长文本"去重，只保留最外层的那条
      const texts = loud.filter(item => item.kind === 'text').filter((item, index, list) => !list.some((other, otherIndex) => otherIndex !== index && other.text.includes(item.text) && other.size >= item.size));
      return { loudTextCount: texts.length, loudMediaCount: loud.filter(item => item.kind === 'media').length, texts: texts.slice(0, 3), media: loud.filter(item => item.kind === 'media').slice(0, 3) };
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
    easings: (() => {
      const splitTop = value => {
        const parts = []; let depth = 0, current = '';
        for (const char of String(value)) {
          if (char === '(') depth += 1;
          if (char === ')') depth -= 1;
          if (char === ',' && depth === 0) { parts.push(current.trim()); current = ''; continue; }
          current += char;
        }
        if (current.trim()) parts.push(current.trim());
        return parts.filter(Boolean);
      };
      const seen = new Map();
      for (const element of visiblePool('.atlas-shell *, .story-experience *')) {
        const style = getComputedStyle(element);
        if (parseFloat(style.transitionDuration) > 0) for (const value of splitTop(style.transitionTimingFunction)) seen.set(value, (seen.get(value) ?? 0) + 1);
        if (style.animationName !== 'none' && parseFloat(style.animationDuration) > 0) for (const value of splitTop(style.animationTimingFunction)) seen.set(value, (seen.get(value) ?? 0) + 1);
      }
      const sorted = [...seen.entries()].sort((a, b) => b[1] - a[1]);
      return { kinds: seen.size, list: sorted.map(([value, count]) => value + '×' + count).join('、') };
    })(),
    motion: (() => {
      const first = value => String(value).split(',')[0].trim();
      const toMs = value => value.endsWith('ms') ? parseFloat(value) : parseFloat(value) * 1000;
      const seen = new Map();
      for (const element of visiblePool('.atlas-shell *, .story-experience *')) {
        const style = getComputedStyle(element);
        const transition = first(style.transitionDuration);
        if (parseFloat(transition) > 0) seen.set(transition, (seen.get(transition) ?? 0) + 1);
        const animation = first(style.animationDuration);
        if (style.animationName !== 'none' && parseFloat(animation) > 0) seen.set(animation, (seen.get(animation) ?? 0) + 1);
      }
      const scale = [100, 160, 220, 320, 520];
      const short = [...seen.entries()].filter(([value]) => toMs(value) > 1 && toMs(value) < 600);
      return {
        kinds: seen.size,
        shortKinds: short.length,
        onScaleKinds: short.filter(([value]) => scale.includes(Math.round(toMs(value)))).length,
        shortList: short.map(([value, count]) => value + '×' + count).join('、'),
      };
    })(),
    autospace,
    digits,
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
    imageReveal: (() => {
      // 用确定性选择器锁定"解码门控的那张图"：它由 ResponsiveArtifactImage 在解码完成后打标记。
      // 此前用 '.story-figure img' 兜底会在生产上抓到别的 img（transition-property: all / 0s），造成假失败。
      const image = document.querySelector('img[data-artifact-image-ready]') ?? document.querySelector('[data-detail-image-state="ready"] img') ?? document.querySelector('.story-figure img');
      if (!image) return null;
      const style = getComputedStyle(image);
      return { property: style.transitionProperty, duration: style.transitionDuration };
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
// 图片渐显：必须先等"解码门控的那张图"就绪再测。
// 此前在故事 shell 就绪时就测，生产上（较慢）首图还没打上 data-artifact-image-ready，
// 探针回退抓到原始 <img>（transition-property: all / 0s）→ 假失败。
await waitFor(`!!document.querySelector('img[data-artifact-image-ready]')`, '首图解码完成', 20000).catch(() => {});
results.storyImageReveal = await evaluate(`(() => {
  const image = document.querySelector('img[data-artifact-image-ready]');
  if (!image) return null;
  const style = getComputedStyle(image);
  return { property: style.transitionProperty, duration: style.transitionDuration };
})()`);

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
// 移动端阅读舒适度：正文段每行字数（正文段是 .story-paper 的直接子 p；导语在 .story-summary 内，不算正文）
results.mobileReading = await evaluate(`(() => {
  // 正文段的确切位置：article.story-paper > div.story-chapters > section > p
  const paragraph = [...document.querySelectorAll('.story-paper .story-chapters section > p')].find(el => (el.textContent || '').length > 80);
  if (!paragraph) return null;
  const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
  const lines = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    for (let index = 0; index < node.data.length; index += 1) {
      const range = document.createRange();
      range.setStart(node, index); range.setEnd(node, index + 1);
      const rect = range.getBoundingClientRect();
      if (!rect.height) continue;
      const top = Math.round(rect.top);
      const last = lines[lines.length - 1];
      if (last && Math.abs(last.top - top) <= 3) last.chars += 1;
      else lines.push({ top, chars: 1 });
    }
  }
  const body = lines.slice(1, -1).map(line => line.chars).filter(count => count > 4);
  const sorted = [...body].sort((a, b) => a - b);
  return { lines: body.length, median: sorted[Math.floor(sorted.length / 2)], min: sorted[0], max: sorted[sorted.length - 1] };
})()`);
await viewport(1440, 960, false);
await goto(base, `document.querySelectorAll('g.scroll-province').length === 34`);
results.desktopHome = await evaluate(probe);
await viewport(390, 844, true);
await new Promise(resolve => setTimeout(resolve, 1200));
results.mobileHome = await evaluate(probe);
// 首页像素级对比度（地图标注与荐读卡片：DOM 方法读不到底板与渐变）
await viewport(1440, 960, false);
await goto(base, `document.querySelectorAll('g.scroll-province').length === 34`);
// 其他页面覆盖：故事目录页与访客记录页（桌面 + 390）
const otherPages = {};
for (const [key, target, ready] of [
  ['directory', `${base}?guide=1`, `document.querySelectorAll('[data-trail]').length === 6`],
  ['visitor', new URL('visitor-records/', base).href, `document.querySelector('h1')`],
]) {
  for (const [device, width, height, mobile] of [['Desktop', 1440, 960, false], ['Mobile', 390, 844, true]]) {
    await viewport(width, height, mobile);
    await send('Page.navigate', { url: target }, sessionId);
    await waitFor(`document.querySelector('.atlas-shell') || document.querySelector('.vr-app') || document.querySelector('#root > *')`, '页面挂载', 30000);
    if (await evaluate(`!!document.querySelector('.ink-intro-skip')`)) {
      await evaluate(`document.querySelector('.ink-intro-skip').click()`);
      await waitFor(`!document.querySelector('[data-ink-intro]')`, '开场退出', 15000);
    }
    await waitFor(ready, '目标内容', 40000);
    await new Promise(resolve => setTimeout(resolve, 800));
    otherPages[`${key}${device}`] = await evaluate(probe);
  }
}
// 章节显现错峰：查"声明的显现区间"是否分层（确定性判据）。
// 不要用瞬态进度值判断——子元素各有自己的 view() 时间轴，几何位置不同也会出现不同进度，
// 那样即使没有错峰也会"通过"（第一版正是这种无效判据，已废弃）。
const revealSweep = async () => {
  // 本段执行时页面可能已被其他测量带离故事页，先回故事页
  await viewport(1440, 960, false);
  await goto(`${base}?guide=1&story=${STORY}`, `document.querySelector('.story-chapters p')`);
  await new Promise(resolve => setTimeout(resolve, 200));
  return evaluate(`(() => {
    const section = [...document.querySelectorAll('.story-chapters > section')].find(item => item.children.length >= 3);
    if (!section) return null;
    const ranges = [...section.children].map(child => {
      const style = getComputedStyle(child);
      return style.animationRange ?? style.getPropertyValue('animation-range') ?? '';
    }).filter(Boolean);
    return { count: ranges.length, distinct: new Set(ranges).size, ranges: ranges.slice(0, 6) };
  })()`);
};
results.revealStagger = await revealSweep();

results.otherPages = otherPages;

// 回到首页再测像素级对比度（上面的循环把页面停在了访客页）
await viewport(1440, 960, false);
await goto(base, `document.querySelectorAll('g.scroll-province').length === 34`);

// 博物馆详情面板（看文物必经之路）
const panel = {};
for (const [device, width, height, mobile] of [['Desktop', 1440, 960, false], ['Mobile', 390, 844, true]]) {
  await viewport(width, height, mobile);
  await send('Page.navigate', { url: new URL('?province=北京市&museum=gugong', base).href }, sessionId);
  await waitFor(`document.querySelector('.atlas-shell')`, '外壳', 30000);
  if (await evaluate(`!!document.querySelector('.ink-intro-skip')`)) {
    await evaluate(`document.querySelector('.ink-intro-skip').click()`);
    await waitFor(`!document.querySelector('[data-ink-intro]')`, '开场退出', 15000);
  }
  await waitFor(`!!document.querySelector('[data-artifact-scroll-root], [role="dialog"]')`, '面板就绪', 40000);
  await new Promise(resolve => setTimeout(resolve, 2000));
  panel[`museum${device}`] = await evaluate(panelProbe);
}
results.panel = panel;

// 长卷阅卷台吸附：打开故宫《清明上河图》长卷页读计算值，再模拟减弱动效确认禁用。
// 注意：本段会导航，必须放在所有"故事页测量"之后（否则后续测量会跑在别的页面上）。
await goto(`${base}?province=北京市&museum=gugong&artifact=gg-qmsh`, `document.querySelector('.atlas-shell')`, 30000).catch(() => {});
await waitFor(`document.querySelector('.artifact-scroll-reader')`, '长卷阅卷台', 30000).catch(() => {});
results.scrollSnap = await evaluate(`(() => {
  const reader = document.querySelector('.artifact-scroll-reader');
  if (!reader) return null;
  const tile = document.querySelector('[data-scroll-tile]');
  return {
    snapType: getComputedStyle(reader).scrollSnapType,
    tileAlign: tile ? getComputedStyle(tile).scrollSnapAlign : null,
    tiles: document.querySelectorAll('[data-scroll-tile]').length,
  };
})()`);
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }, sessionId);
results.scrollSnapReduced = await evaluate(`(() => {
  const reader = document.querySelector('.artifact-scroll-reader');
  return reader ? getComputedStyle(reader).scrollSnapType : null;
})()`);
await send('Emulation.setEmulatedMedia', { features: [] }, sessionId);

// 故事目录页卡片（压在渐变卡面上 → 必须像素级）
await viewport(1440, 960, false);
await goto(`${base}?guide=1`, `document.querySelectorAll('[data-trail]').length === 6`, 40000);
await new Promise(resolve => setTimeout(resolve, 1200));
results.directoryPixel = {
  title: await pixelContrast('.story-trail-card h2'),
  question: await pixelContrast('.story-trail-card .story-question'),
  intro: await pixelContrast('.story-trail-card > p'),
  hook: await pixelContrast('.story-standalone li small'),
  note: await pixelContrast('.story-editor-note'),
};
// 立即取最小值作为判据依据（自检里的 pixelContrast 返回的是数字）
const directoryContrastMin = Math.min(...Object.values(results.directoryPixel ?? {}).filter(value => typeof value === 'number'));

// 回首页再测像素级对比度（面板循环把页面停在了馆藏面板）
await viewport(1440, 960, false);
await goto(base, `document.querySelectorAll('g.scroll-province').length === 34`);

results.pixelContrast = {
  mapShort: await pixelContrast('.scroll-label-short'),
  mapCount: await pixelContrast('.scroll-label-count'),
  beaconTitle: await pixelContrast('.atlas-story-beacon h2'),
  beaconText: await pixelContrast('.atlas-story-beacon p'),
};

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

// 像素级对比度：DOM 方法读不到 SVG 印章底板与 CSS 渐变，必须按真实像素判定
async function pixelContrast(selector) {
  // 等元素稳定：完全不透明且没有进行中的动画（否则会截到淡入中途的画面）
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const stable = await evaluate(`(() => { const el = [...document.querySelectorAll('${selector}')].find(e => (e.textContent || '').trim() && e.getClientRects().length && !e.closest('[aria-hidden="true"], [inert]')); if (!el) return false; const style = getComputedStyle(el); return style.opacity === '1' && el.getAnimations().every(animation => animation.playState === 'finished' || animation.playState === 'idle'); })()`);
    if (stable) break;
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  const box = await evaluate(`(() => { const el = [...document.querySelectorAll('${selector}')].find(e => (e.textContent || '').trim() && e.getClientRects().length && !e.closest('[aria-hidden="true"], [inert]')); if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.max(0, Math.floor(b.left) - 6), y: Math.max(0, Math.floor(b.top) - 6), width: Math.ceil(b.width) + 12, height: Math.ceil(b.height) + 12 }; })()`);
  if (!box || box.width <= 0 || box.height <= 0) return null;
  const shot = await send('Page.captureScreenshot', { format: 'png', clip: { ...box, scale: 3 } }, sessionId);
  return evaluate(`(async () => {
    const el = [...document.querySelectorAll('${selector}')].find(e => (e.textContent || '').trim() && e.getClientRects().length && !e.closest('[aria-hidden="true"], [inert]'));
    if (!el) return null;
    const style = getComputedStyle(el);
    // 前景用声明色（SVG 文字取 fill），避免抗锯齿像素把"最暗端"拉偏
    const declared = (el instanceof SVGElement && style.fill && style.fill !== 'none') ? style.fill : style.color;
    const parse = value => { const m = value.match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const parts = m[1].split(',').map(Number); return { rgb: parts.slice(0, 3), a: parts.length > 3 ? parts[3] : 1 }; };
    const fg = parse(declared);
    if (!fg) return null;
    const image = new Image();
    image.src = 'data:image/png;base64,${shot.data}';
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const lum = ([r, g, b]) => { const f = c => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const pixels = [];
    for (let index = 0; index < data.length; index += 4) pixels.push({ rgb: [data[index], data[index + 1], data[index + 2]], value: lum([data[index], data[index + 1], data[index + 2]]) });
    pixels.sort((a, b) => a.value - b.value);
    // 背景 = 最亮 20% 的中位数
    const light = pixels.slice(Math.floor(pixels.length * 0.8));
    const bg = light[Math.floor(light.length / 2)].rgb;
    // 半透明前景先与背景合成
    const fgFinal = fg.a >= 0.99 ? fg.rgb : fg.rgb.map((c, i) => Math.round(c * fg.a + bg[i] * (1 - fg.a)));
    const [high, low] = [lum(fgFinal), lum(bg)].sort((a, b) => b - a);
    return Math.round(((high + 0.05) / (low + 0.05)) * 100) / 100;
  })()`);
}

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
    name: '其他页面',
    max: 7,
    items: [
      { label: `故事目录页 1 个 h1 且 390 无溢出（实测 ${results.otherPages?.directoryDesktop?.structure?.h1Count ?? 'n/a'} 个／${results.otherPages?.directoryMobile?.overflow ?? 'n/a'}px）`, pass: results.otherPages?.directoryDesktop?.structure?.h1Count === 1 && (results.otherPages?.directoryMobile?.overflow ?? 9) <= 1, score: results.otherPages?.directoryDesktop?.structure?.h1Count === 1 && (results.otherPages?.directoryMobile?.overflow ?? 9) <= 1 ? 1 : 0 },
      { label: `故事目录页无 <12px 文本（桌面 ${results.otherPages?.directoryDesktop?.belowTwelveCount ?? 'n/a'}／390 ${results.otherPages?.directoryMobile?.belowTwelveCount ?? 'n/a'}）`, pass: (results.otherPages?.directoryDesktop?.belowTwelveCount ?? 9) === 0 && (results.otherPages?.directoryMobile?.belowTwelveCount ?? 9) === 0, score: (results.otherPages?.directoryDesktop?.belowTwelveCount ?? 9) === 0 && (results.otherPages?.directoryMobile?.belowTwelveCount ?? 9) === 0 ? 1 : 0 },
      { label: `访客记录页 1 个 h1 且 390 无溢出（实测 ${results.otherPages?.visitorDesktop?.structure?.h1Count ?? 'n/a'} 个／${results.otherPages?.visitorMobile?.overflow ?? 'n/a'}px）`, pass: results.otherPages?.visitorDesktop?.structure?.h1Count === 1 && (results.otherPages?.visitorMobile?.overflow ?? 9) <= 1, score: results.otherPages?.visitorDesktop?.structure?.h1Count === 1 && (results.otherPages?.visitorMobile?.overflow ?? 9) <= 1 ? 1 : 0 },
      { label: `访客记录页无 <12px 文本（桌面 ${results.otherPages?.visitorDesktop?.belowTwelveCount ?? 'n/a'}／390 ${results.otherPages?.visitorMobile?.belowTwelveCount ?? 'n/a'}）`, pass: (results.otherPages?.visitorDesktop?.belowTwelveCount ?? 9) === 0 && (results.otherPages?.visitorMobile?.belowTwelveCount ?? 9) === 0, score: (results.otherPages?.visitorDesktop?.belowTwelveCount ?? 9) === 0 && (results.otherPages?.visitorMobile?.belowTwelveCount ?? 9) === 0 ? 1 : 0 },
      { label: `馆藏面板·桌面无 <12px 且无低对比文字（${results.panel?.museumDesktop?.belowTwelveCount ?? 'n/a'} 处／${results.panel?.museumDesktop?.lowContrast ?? 'n/a'} 处，最低 ${results.panel?.museumDesktop?.contrastMin ?? 'n/a'}）`, pass: (results.panel?.museumDesktop?.belowTwelveCount ?? 9) === 0 && (results.panel?.museumDesktop?.lowContrast ?? 9) === 0, score: (results.panel?.museumDesktop?.belowTwelveCount ?? 9) === 0 && (results.panel?.museumDesktop?.lowContrast ?? 9) === 0 ? 1 : 0 },
      { label: `故事目录卡片像素对比度 ≥4.5（标题 ${results.directoryPixel?.title ?? 'n/a'}／问题 ${results.directoryPixel?.question ?? 'n/a'}／说明 ${results.directoryPixel?.intro ?? 'n/a'}／钩子 ${results.directoryPixel?.hook ?? 'n/a'}／编辑说明 ${results.directoryPixel?.note ?? 'n/a'}）`, pass: directoryContrastMin >= 4.5, score: directoryContrastMin >= 4.5 ? 1 : 0 },
      { label: `馆藏面板·390 无 <12px 且无低对比文字（${results.panel?.museumMobile?.belowTwelveCount ?? 'n/a'} 处／${results.panel?.museumMobile?.lowContrast ?? 'n/a'} 处，最低 ${results.panel?.museumMobile?.contrastMin ?? 'n/a'}）`, pass: (results.panel?.museumMobile?.belowTwelveCount ?? 9) === 0 && (results.panel?.museumMobile?.lowContrast ?? 9) === 0, score: (results.panel?.museumMobile?.belowTwelveCount ?? 9) === 0 && (results.panel?.museumMobile?.lowContrast ?? 9) === 0 ? 1 : 0 },
    ],
  },
  {
    name: '视觉焦点',
    max: 4,
    items: [
      { label: `故事页首屏抢眼文本 ≤1（实测 ${results.desktopStory.focal?.loudTextCount ?? 'n/a'} 个：${(results.desktopStory.focal?.texts ?? []).map(item => item.text + '/' + item.size + 'px').join('、') || '无'}）`, pass: (results.desktopStory.focal?.loudTextCount ?? 9) <= 1, score: (results.desktopStory.focal?.loudTextCount ?? 9) <= 1 ? 1 : 0 },
      { label: `故事页首屏抢眼媒体 ≤1（实测 ${results.desktopStory.focal?.loudMediaCount ?? 'n/a'} 个：${(results.desktopStory.focal?.media ?? []).map(item => item.tag + '/' + item.share + '%').join('、') || '无'}）`, pass: (results.desktopStory.focal?.loudMediaCount ?? 9) <= 1, score: (results.desktopStory.focal?.loudMediaCount ?? 9) <= 1 ? 1 : 0 },
      { label: `首页首屏抢眼文本 ≤1（实测 ${results.desktopHome.focal?.loudTextCount ?? 'n/a'} 个）`, pass: (results.desktopHome.focal?.loudTextCount ?? 9) <= 1, score: (results.desktopHome.focal?.loudTextCount ?? 9) <= 1 ? 1 : 0 },
      { label: `首页首屏抢眼媒体 ≤1（实测 ${results.desktopHome.focal?.loudMediaCount ?? 'n/a'} 个）`, pass: (results.desktopHome.focal?.loudMediaCount ?? 9) <= 1, score: (results.desktopHome.focal?.loudMediaCount ?? 9) <= 1 ? 1 : 0 },
    ],
  },
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
    max: 5,
    items: [
      { label: `作品图可放大（入口存在 ${results.desktopStory.zoom?.trigger ? '有' : '无'}，状态标记 ${results.desktopStory.zoom?.statuses} 处）`, pass: !!results.desktopStory.zoom?.trigger, score: results.desktopStory.zoom?.trigger ? 2 : 0 },
      { label: `放大视图为 aria-modal 对话框且 Esc 可关（打开 ${results.zoomDialog?.opened ? '是' : '否'}／模态 ${results.zoomDialog?.ariaModal ? '是' : '否'}／Esc 关闭 ${results.zoomDialog?.closedByEscape ? '是' : '否'}）`, pass: !!results.zoomDialog?.opened && !!results.zoomDialog?.ariaModal && !!results.zoomDialog?.closedByEscape, score: results.zoomDialog?.opened && results.zoomDialog?.ariaModal && results.zoomDialog?.closedByEscape ? 2 : 0 },
      { label: `图片渐显（首图过渡 property=${results.storyImageReveal?.property ?? 'n/a'} duration=${results.storyImageReveal?.duration ?? 'n/a'}）`, pass: String(results.storyImageReveal?.property ?? '').includes('opacity') && parseFloat(results.storyImageReveal?.duration ?? '0') > 0, score: String(results.storyImageReveal?.property ?? '').includes('opacity') && parseFloat(results.storyImageReveal?.duration ?? '0') > 0 ? 1 : 0 },
    ],
  },

  {
    name: '中文字排',
    max: 10,
    items: [
      { label: '正文使用衬线（系统宋体等）', pass: serifOk, score: serifOk ? 1 : 0 },
      { label: `行长 30–34 字（实测 ${chars}）`, pass: chars >= 30 && chars <= 34, score: chars >= 28 && chars <= 36 ? 1 : 1 },
      { label: `段首缩进 2em（实测 ${indentEm}em）`, pass: indentEm >= 1.9 && indentEm <= 2.1, score: indentEm >= 1.9 && indentEm <= 2.1 ? 1 : 0 },
      { label: `字号下限 ≥12px（违规 ${results.desktopStory.belowTwelveCount}）`, pass: results.desktopStory.belowTwelveCount === 0, score: results.desktopStory.belowTwelveCount === 0 ? 2 : 0 },
      { label: `行高 ≥1.8（实测 ${lineHeightRatio}）`, pass: lineHeightRatio >= 1.8, score: lineHeightRatio >= 1.8 ? 1 : 0 },
      { label: '标点宽度调整（text-spacing-trim）', pass: spacingTrimOk, score: spacingTrimOk ? 1 : 0 },
      { label: `中西文自动间距生效（normal ${results.desktopStory.autospace?.on ?? 'n/a'}px vs no-autospace ${results.desktopStory.autospace?.off ?? 'n/a'}px，差 ${results.desktopStory.autospace?.delta ?? 'n/a'}px）`, pass: (results.desktopStory.autospace?.delta ?? 0) > 0, score: (results.desktopStory.autospace?.delta ?? 0) > 0 ? 1 : 0 },
      { label: `避头尾：行首无禁则标点（实测 ${results.desktopStory.kinsoku?.lines ?? 'n/a'} 行，违规 ${results.desktopStory.kinsoku?.badStart ?? 'n/a'} 处）`, pass: (results.desktopStory.kinsoku?.badStart ?? 9) === 0, score: (results.desktopStory.kinsoku?.badStart ?? 9) === 0 ? 1 : 0 },
      { label: `避头尾：行尾无开括号类（实测违规 ${results.desktopStory.kinsoku?.badEnd ?? 'n/a'} 处）`, pass: (results.desktopStory.kinsoku?.badEnd ?? 9) === 0, score: (results.desktopStory.kinsoku?.badEnd ?? 9) === 0 ? 1 : 0 },
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
    max: 4,
    items: [
      { label: `正文对比度 ≥7（实测 ${results.desktopStory.paragraph?.contrast}）`, pass: (results.desktopStory.paragraph?.contrast ?? 0) >= 7, score: (results.desktopStory.paragraph?.contrast ?? 0) >= 7 ? 1 : 0 },
      { label: `次要文字 ≥4.5（导语 ${results.desktopStory.summaryContrast}／标题 ${results.desktopStory.heading?.contrast}）`, pass: Math.min(results.desktopStory.summaryContrast ?? 0, results.desktopStory.heading?.contrast ?? 0) >= 4.5, score: Math.min(results.desktopStory.summaryContrast ?? 0, results.desktopStory.heading?.contrast ?? 0) >= 4.5 ? 1 : 0 },
      { label: `首页像素级对比度全部 ≥4.5（地图省简称 ${results.pixelContrast?.mapShort ?? 'n/a'}／件数 ${results.pixelContrast?.mapCount ?? 'n/a'}／荐读标题 ${results.pixelContrast?.beaconTitle ?? 'n/a'}／荐读说明 ${results.pixelContrast?.beaconText ?? 'n/a'}）`, pass: Math.min(results.pixelContrast?.mapShort ?? 0, results.pixelContrast?.mapCount ?? 0, results.pixelContrast?.beaconTitle ?? 0, results.pixelContrast?.beaconText ?? 0) >= 4.5, score: Math.min(results.pixelContrast?.mapShort ?? 0, results.pixelContrast?.mapCount ?? 0, results.pixelContrast?.beaconTitle ?? 0, results.pixelContrast?.beaconText ?? 0) >= 4.5 ? 2 : 0 },
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
      { label: `390px 无横向溢出（实测 ${results.mobileStory.overflow}px）`, pass: results.mobileStory.overflow <= 1, score: results.mobileStory.overflow <= 1 ? 2 : 0 },
      { label: `移动端字号下限 ≥12px（违规 ${results.mobileStory.belowTwelveCount}）`, pass: results.mobileStory.belowTwelveCount === 0, score: results.mobileStory.belowTwelveCount === 0 ? 2 : 0 },
      { label: `馆藏面板返回控件在 390 ≥44px（实测 ${results.panel?.museumMobile?.backTarget?.w ?? 'n/a'}×${results.panel?.museumMobile?.backTarget?.h ?? 'n/a'}px）`, pass: (results.panel?.museumMobile?.backTarget?.h ?? 0) >= 44, score: (results.panel?.museumMobile?.backTarget?.h ?? 0) >= 44 ? 1 : 0 },
      { label: `移动端正文行长适中（每行 ${results.mobileReading?.median ?? 'n/a'} 字，min ${results.mobileReading?.min ?? 'n/a'} / max ${results.mobileReading?.max ?? 'n/a'}；区间 14–26）`, pass: (results.mobileReading?.median ?? 0) >= 14 && (results.mobileReading?.median ?? 99) <= 26, score: (results.mobileReading?.median ?? 0) >= 14 && (results.mobileReading?.median ?? 99) <= 26 ? 1 : 0 },
    ],
  },
  {
    name: '性能预算',
    max: 5,
    items: [
      { label: `首屏 JS ≤322KB（实测 ${Math.round((firstScreenBytes ?? 0) / 1000)}KB；硬上限 328KB）`, pass: (firstScreenBytes ?? 1e9) <= 322000, score: (firstScreenBytes ?? 1e9) <= 322000 ? 2 : (firstScreenBytes ?? 1e9) <= 328000 ? 1 : 0 },
      { label: `图片策略：首图 eager（LCP）+ 列表图 lazy（源码 ${lazyHits} 处）`, pass: lazyHits >= 2 && results.desktopStory.images.lazy === 0, score: lazyHits >= 2 && results.desktopStory.images.lazy === 0 ? 2 : 0 },
      { label: `渲染阻塞样式包 ≤80KB（实测 ${Math.round((mainCssBytes ?? 0) / 1024)}KB）`, pass: (mainCssBytes ?? 1e9) <= 81920, score: (mainCssBytes ?? 1e9) <= 81920 ? 1 : 0 },
    ],
  },
  {
    name: '动效与手感',
    max: 12,
    items: [
      { label: `存在滚动驱动动效（阅读进度驱动 ${results.desktopStory.structure?.progressDriven ? '有' : '无'}）`, pass: !!results.desktopStory.structure?.progressDriven, score: results.desktopStory.structure?.progressDriven ? 3 : 0 },
      { label: `有效缓动取值收敛 ≤4 种（实测 ${results.desktopStory.easings?.kinds ?? 'n/a'} 种：${results.desktopStory.easings?.list ?? ''}）`, pass: (results.desktopStory.easings?.kinds ?? 99) <= 4, score: (results.desktopStory.easings?.kinds ?? 99) <= 4 ? 1 : 0 },
      { label: `动效时长收敛（有效短时长 ${results.desktopStory.motion?.shortKinds ?? 'n/a'} 种，全部落在尺度上 ${results.desktopStory.motion?.onScaleKinds ?? 'n/a'} 种：${results.desktopStory.motion?.shortList ?? ''}）`, pass: (results.desktopStory.motion?.shortKinds ?? 99) <= 5 && results.desktopStory.motion?.shortKinds === results.desktopStory.motion?.onScaleKinds, score: (results.desktopStory.motion?.shortKinds ?? 99) <= 5 && results.desktopStory.motion?.shortKinds === results.desktopStory.motion?.onScaleKinds ? 2 : 0 },
      { label: `减弱动效偏好下动画关闭（剩余 ${results.reducedMotion?.animated ?? 'n/a'} 个可感知动画）`, pass: (results.reducedMotion?.animated ?? 1) === 0, score: (results.reducedMotion?.animated ?? 1) === 0 ? 3 : 0 },
      { label: `在用关键帧只动 transform/opacity（布局属性关键帧 ${keyframeLayoutProps} 个）`, pass: keyframeLayoutProps === 0, score: keyframeLayoutProps === 0 ? 1 : 0 },
      { label: `长卷阅卷台启用滚动吸附（默认 snap-type=${results.scrollSnap?.snapType ?? 'n/a'}；低动态=${results.scrollSnapReduced ?? 'n/a'}）`, pass: String(results.scrollSnap?.snapType ?? '').includes('x') && results.scrollSnapReduced === 'none', score: String(results.scrollSnap?.snapType ?? '').includes('x') && results.scrollSnapReduced === 'none' ? 1 : 0 },
      { label: `章节显现错峰（声明区间分层 ${results.revealStagger?.distinct ?? 'n/a'} 种 / ${results.revealStagger?.count ?? 'n/a'} 个子元素：${(results.revealStagger?.ranges ?? []).join('、') || '—'}）`, pass: (results.revealStagger?.distinct ?? 0) >= 2, score: (results.revealStagger?.distinct ?? 0) >= 2 ? 1 : 0 },
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
    max: 5,
    items: [
      { label: `间距落在 4px 基准（实测 ${results.desktopStory.spacing?.ratio}%，${results.desktopStory.spacing?.onGrid}/${results.desktopStory.spacing?.total}）`, pass: (results.desktopStory.spacing?.ratio ?? 0) >= 90, score: (results.desktopStory.spacing?.ratio ?? 0) >= 90 ? 2 : (results.desktopStory.spacing?.ratio ?? 0) >= 75 ? 1 : 0 },
      { label: `界面数字对齐（数字逐字宽差 ${results.desktopHome.digits?.spread ?? 'n/a'}px）`, pass: (results.desktopHome.digits?.spread ?? 9) <= 0.1, score: (results.desktopHome.digits?.spread ?? 9) <= 0.1 ? 1 : 0 },
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
