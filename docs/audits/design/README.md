# 设计品质自检标准（design-audit · v3）

目标：把"获奖级品质"落成**可复跑、可比较**的量化检查。每次改版后跑一次，分数只允许上升。

```powershell
npm run build
# 起无头浏览器（任意调试端口），然后：
$env:HUAXIA_CDP_ENDPOINT='http://127.0.0.1:11520'
$env:HUAXIA_E2E_URL='https://huaxia-museum-atlas.pages.dev/'   # 或本地 preview 地址
node scripts/design-audit.mjs
```

输出：`docs/audits/design/design-audit.json`（全部原始测量）与 `design-audit.md`（分项清单）。

## v3 评分维度（13 项，满分 100，自设获奖级阈值 85）

| 维度 | 分值 | 判据 |
| --- | --- | --- |
| 中文字排 | 16 | 正文衬线 4 · 行长 30–34 字 4 · 段首缩进 2em 3 · 字号下限 ≥12px 3 · 行高 ≥1.8 1 · 标点宽度调整 1 |
| 字号体系 | 4 | 一页字号种类 ≤10 |
| 对比度 | 10 | 正文 ≥7（AAA）5 · 次要文字 ≥4.5 5 |
| 无障碍 | 10 | 图片 alt 3 · `:focus-visible` 3 · 触控 ≥24×24（内联正文链接豁免）2 · 标题层级不跳级 2 |
| 移动端 | 6 | 390px 无横向溢出 4 · 移动端字号下限 ≥12px 2 |
| 性能预算 | 6 | 首屏 JS ≤322KB（硬上限 328KB）4 · 图片策略 2 |
| 动效与手感 | 14 | 滚动驱动动效 5 · 减弱动效下可感知动画为 0 5 · 在用关键帧只动 transform/opacity 4 |
| 交互状态 | 4 | 载入态（`role=status/alert`）2 · 错误态含重试＋空态说明 2 |
| 结构层级 | 4 | 唯一 `h1` 2 · `main`/`nav` 地标齐备 2 |
| 键盘可达 | 8 | 章节锚点 ≥4 个 3 · **跳过导航链接** 3 · 状态播报（aria-live/status/alert）2 |
| **实测性能** | 8 | **LCP ≤2500ms** 4 · **CLS ≤0.1** 4（用 `Page.addScriptToEvaluateOnNewDocument` 注入 PerformanceObserver 实测） |
| **视觉层级** | 6 | h1/正文级差 ≥2 3 · h2/正文级差 ≥1.15 3 |
| **一致性** | 4 | 间距落在 **4px 基准**的比例 ≥90% |

判据依据：W3C《中文排版需求》(clreq)、WCAG 2.1 / 2.5.8、Core Web Vitals 阈值（LCP 2.5s / CLS 0.1）。

## 测量口径上踩过的坑（都已修正并存证）

1. **隐藏层不计入**：故事页打开时地图层仍是 `aria-hidden`/`inert`，原先被算成 76 处字号违规。
2. **图片不是"全部 lazy"才好**：首图 eager 才是 LCP 正解 → 判据改为"首图 eager + 列表图 lazy"。
3. **关键帧只统计页面上真正在用的动画名**（Tailwind/shadcn 带进来但未使用的关键帧不计）。
4. **被 `prefers-reduced-motion` 压到 0.01ms 的动画不算"在动"** → 按**可感知动效（时长 >50ms）**判定。
5. **性能观察器必须在导航前注入**（`Page.addScriptToEvaluateOnNewDocument`），否则拿不到 LCP/CLS。

## v3 仍覆盖不到的部分（诚实说明）

**100/100 依然 ≠ 获奖级。** 剩下这些是 v4 及以后要补的：

1. **图像工艺**：主图裁切与观感、**放大细节浏览**、图注与状态标记（原件／复制件／AI 示意）的一致版式。
2. **地图标注排版**：SVG 地图仍有 7–11px 的 `.scroll-*` 标注 10 处，牵动地图布局，需要单独视觉 QA 轮次。
3. **手势连续性**：移动端滑动、返回、横向手势（游线前后站目前只有按钮）。
4. **视觉焦点的定量判据**：目前只量了字号级差，还没量"一屏一个焦点"。
5. **INP**：需要真实交互才可测，目前只有 LCP/CLS。
6. **圆角/描边/阴影 token 化**（间距已达标，其余尚未）。

## 关于 GSAP / Three.js

目标里写的是"**按需**引入"。目前的结论是：
- 首页开场动效**已经在用 Three.js**（`InkScrollIntro`，懒加载分片，`gl_PointSize` 等特征由 `bundle-budget.test.mjs` 守住不进首屏）；
- 故事页的滚动驱动**用纯 CSS 覆盖**（`animation-timeline: scroll()/view()`），零 JS、首屏包体零增长，因此**本轮没有引入 GSAP**；
- 若后续要做"手卷式相机推进"或复杂时间轴编排，再引入 GSAP（3.13 起含 ScrollTrigger/SplitText 全部免费、可商用），但必须拆成按需分片——首屏余量目前约 7.3KB。
