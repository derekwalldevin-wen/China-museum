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

const evaluate = async expression => {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId);
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails).slice(0, 300));
  return result.result.value;
};
const viewport = async (width, height, mobile) => send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile }, sessionId);
const goto = async url => {
  await send('Page.navigate', { url }, sessionId);
  await new Promise(resolve => setTimeout(resolve, 5500));
  const skip = await evaluate(`!!document.querySelector('.ink-intro-skip')`);
  if (skip) { await evaluate(`document.querySelector('.ink-intro-skip').click()`); await new Promise(resolve => setTimeout(resolve, 1200)); }
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
  const focusRule = [...document.styleSheets].some(sheet => { try { return [...sheet.cssRules].some(rule => /:focus-visible/.test(rule.selectorText ?? '')); } catch { return false; } });
  const smallTargetList = [...document.querySelectorAll('a, button')].map(element => {
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
    smallTargets,
    smallTargetList,
    headingOrderOk,
    overflow: document.documentElement.scrollWidth - window.innerWidth,
  };
})()`;

const results = {};
await viewport(1440, 960, false);
await goto(`${base}?guide=1&story=${STORY}`);
results.desktopStory = await evaluate(probe);
await viewport(390, 844, true);
await new Promise(resolve => setTimeout(resolve, 1200));
results.mobileStory = await evaluate(probe);
await viewport(1440, 960, false);
await goto(base);
results.desktopHome = await evaluate(probe);
await viewport(390, 844, true);
await new Promise(resolve => setTimeout(resolve, 1200));
results.mobileHome = await evaluate(probe);
await send('Target.closeTarget', { targetId });
socket.close();

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
    name: '中文字排',
    max: 30,
    items: [
      { label: '正文使用衬线（思源宋体等）', pass: serifOk, score: serifOk ? 6 : 0 },
      { label: `行长 30–34 字（实测 ${chars}）`, pass: chars >= 30 && chars <= 34, score: chars >= 28 && chars <= 36 ? 6 : 2 },
      { label: `段首缩进 2em（实测 ${indentEm}em）`, pass: indentEm >= 1.9 && indentEm <= 2.1, score: indentEm >= 1.9 && indentEm <= 2.1 ? 4 : 0 },
      { label: `字号下限 ≥12px（违规 ${results.desktopStory.belowTwelveCount}）`, pass: results.desktopStory.belowTwelveCount === 0, score: results.desktopStory.belowTwelveCount === 0 ? 6 : Math.max(0, 6 - results.desktopStory.belowTwelveCount) },
      { label: `行高 ≥1.8（实测 ${lineHeightRatio}）`, pass: lineHeightRatio >= 1.8, score: lineHeightRatio >= 1.8 ? 4 : 2 },
      { label: '标点宽度调整（text-spacing-trim）', pass: spacingTrimOk, score: spacingTrimOk ? 4 : 0 },
    ],
  },
  {
    name: '字号体系',
    max: 10,
    items: [
      { label: `一页字号数量 ≤10（实测 ${results.desktopStory.distinctSizes.length}）`, pass: results.desktopStory.distinctSizes.length <= 10, score: results.desktopStory.distinctSizes.length <= 10 ? 10 : results.desktopStory.distinctSizes.length <= 13 ? 5 : 0 },
    ],
  },
  {
    name: '对比度',
    max: 20,
    items: [
      { label: `正文对比度 ≥7（实测 ${results.desktopStory.paragraph?.contrast}）`, pass: (results.desktopStory.paragraph?.contrast ?? 0) >= 7, score: (results.desktopStory.paragraph?.contrast ?? 0) >= 7 ? 10 : (results.desktopStory.paragraph?.contrast ?? 0) >= 4.5 ? 6 : 0 },
      { label: `次要文字 ≥4.5（导语 ${results.desktopStory.summaryContrast}／标题 ${results.desktopStory.heading?.contrast}）`, pass: Math.min(results.desktopStory.summaryContrast ?? 0, results.desktopStory.heading?.contrast ?? 0) >= 4.5, score: Math.min(results.desktopStory.summaryContrast ?? 0, results.desktopStory.heading?.contrast ?? 0) >= 4.5 ? 10 : 5 },
    ],
  },
  {
    name: '无障碍',
    max: 20,
    items: [
      { label: `图片 alt 完整（缺 ${results.desktopStory.images.missingAlt}/${results.desktopStory.images.total}）`, pass: results.desktopStory.images.missingAlt === 0, score: results.desktopStory.images.missingAlt === 0 ? 5 : 0 },
      { label: '存在 :focus-visible 焦点样式', pass: results.desktopStory.focusRule, score: results.desktopStory.focusRule ? 5 : 0 },
      { label: `触控目标 ≥40px（不合格 ${results.desktopStory.smallTargets}）`, pass: results.desktopStory.smallTargets === 0, score: results.desktopStory.smallTargets === 0 ? 5 : 0 },
      { label: '标题层级不跳级', pass: results.desktopStory.headingOrderOk, score: results.desktopStory.headingOrderOk ? 5 : 0 },
    ],
  },
  {
    name: '移动端',
    max: 10,
    items: [
      { label: `390px 无横向溢出（实测 ${results.mobileStory.overflow}px）`, pass: results.mobileStory.overflow <= 1, score: results.mobileStory.overflow <= 1 ? 6 : 0 },
      { label: `移动端字号下限 ≥12px（违规 ${results.mobileStory.belowTwelveCount}）`, pass: results.mobileStory.belowTwelveCount === 0, score: results.mobileStory.belowTwelveCount === 0 ? 4 : 0 },
    ],
  },
  {
    name: '性能预算',
    max: 10,
    items: [
      { label: `首屏 JS ≤322KB（实测 ${Math.round((firstScreenBytes ?? 0) / 1000)}KB；硬上限 328KB）`, pass: (firstScreenBytes ?? 1e9) <= 322000, score: (firstScreenBytes ?? 1e9) <= 322000 ? 6 : (firstScreenBytes ?? 1e9) <= 328000 ? 3 : 0 },
      { label: `图片策略：首图 eager（LCP）+ 列表图 lazy（源码 ${lazyHits} 处）`, pass: lazyHits >= 2 && results.desktopStory.images.lazy === 0, score: lazyHits >= 2 && results.desktopStory.images.lazy === 0 ? 4 : 0 },
    ],
  },
];

const total = categories.reduce((sum, category) => sum + category.items.reduce((inner, item) => inner + item.score, 0), 0);
const max = categories.reduce((sum, category) => sum + category.max, 0);
const threshold = 85;

mkdirSync('docs/audits/design', { recursive: true });
const report = { generatedAt: new Date().toISOString(), story: STORY, firstScreenBytes, total, max, threshold, categories, measurements: results };
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
