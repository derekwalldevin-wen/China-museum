# 设计品质第一轮：中文字排体系（衬线正文 · 2em 缩进 · 12px 下限）

日期：2026-10-02。按你的决定执行：**正文改衬线**、**段首缩进 2em**；长卷浏览暂缓；动效允许用 GSAP/Three.js（下一轮做）。

## 一、改了什么

### 1. 阅读面衬线化，界面外壳保留无衬线
`src/components/story-experience.css` 建立字体变量与配对规则：

- 阅读面（正文、导语、游线卡片叙述、对比文字、来源说明）→ `'Noto Serif SC','Source Han Serif SC','Songti SC','SimSun',serif`
- 界面外壳（按钮、标签、图注、元信息、眉题）→ `'Noto Sans SC',…,sans-serif`
- 标题此前写的是**泛型 `serif`**（Windows 落到 SimSun），现在统一到已下载的思源宋体 —— 这是原先最明显的一处跨平台不一致。

字体请求同步调整为 `Noto Serif SC:wght@400;700`（原来请求 500;700;900，却没用上 400/600，正文衬线只能靠合成）。标题字重从 600 改 700，**少一组字重请求**。

### 2. 中文排版按 clreq 补齐
- **段首缩进 `2em`**（实测 34px/17px = 2em ✓）
- **行长收到 34 字/行**（阅读栏 576px ÷ 17px；此前 645px ÷ 17px ≈ 38 字，偏宽）
- `text-align: justify` + `text-justify: inter-ideograph`（书页式两端对齐）
- `text-spacing-trim: trim-start` + `text-autospace: normal`（标点宽度调整、中西文自动间距；不支持的浏览器原样渲染）
- `hanging-punctuation: allow-end`、`text-wrap: pretty/balance`、数字 `tabular-nums`

### 3. 字号体系与下限
- 建立字阶变量：**12 / 14 / 16 / 17 / 20 / 24 / 28 / 44**（一页字号种类从 13 种收敛到 9 种）
- **字号下限 12px**：64 处 `text-[9px]/[10px]/[11px]` 工具类统一抬到 12px；8 处 HTML 外壳的 CSS 小字（署名 9px、访客入口 10px、品牌副标题 8px、开场页眉题 7–11px 等）同样抬到 12px
- `#visitor-link` 触控高度 22px → 32px（短屏 24px），满足 WCAG 2.5.8

### 4. 新增可复跑的自检
`scripts/design-audit.mjs`：在真实浏览器里以 1440 与 390 两个视口检查故事页与首页，输出
`docs/audits/design/design-audit.json` + `.md`，并按六个维度打分。标准与"v1 覆盖不到的部分"见同目录 `README.md`。

自检口径也修正过两处**我自己写错的判据**：
- 原先把"故事页打开时仍留在 DOM 里的地图层"（`aria-hidden`/`inert`）算进字号违规，误报 76 处；
- 原先要求所有图片 `lazy`，而故事首图 eager 才是 LCP 正解 —— 改为"首图 eager + 列表图 lazy"。

## 二、验收（本轮实跑）

| 项目 | 结果 |
| --- | --- |
| `npm run build` | 成功 |
| 全量单元测试 | **180/180 通过** |
| `e2e-stories` | **460/460 通过** |
| `e2e-map` | **7/7 通过** |
| `e2e-home-refinement` | 通过（**期间抓到并修掉一处真回归**，见下） |
| `e2e-visitor-records` | **10/10 通过** |
| 设计品质自检（本地） | **100/100**（阈值 85） |
| 设计品质自检（**线上**） | **100/100** —— 直接对 `huaxia-museum-atlas.pages.dev` 跑同一脚本 |
| 首屏 JS | 320,701 B（≤322KB 目标、≤328KB 硬上限） |

### 期间修掉的回归（值得记下来）
把页脚小字抬到 12px、访客入口抬到 32px 之后，`e2e-home-refinement` 在 **390×667 短屏**报 `story/footer overlap`：
页脚从约 50px 长到 59px，把故事入口挤到重叠。修法是**从留白让空间，而不是牺牲可读性**：
- 短屏（≤767px 且 ≤720px 高）把故事入口自身内边距收紧（13px→8px），高度 135→121px；
- 入口底距 52px→62px，抬到页脚之上；
- 访客入口短屏 32px→24px（仍满足 WCAG 2.5.8 下限）。
字号下限与 44px 触控目标**一个都没降**。

## 三、下一步（按设计顾问流程：先诊断，再给方案）

`README.md` 已列出 v1 量表覆盖不到的八项。下一轮我建议先把**动效与手感**补进量表并落地：
滚动驱动的章节浮现（`animation-timeline: scroll()`，全球覆盖 87.22%，`@supports` + `prefers-reduced-motion` 兜底），
再按需引入 GSAP（3.13 起含 ScrollTrigger/SplitText 全部免费，商用亦可）做编排，但**必须拆成按需分片**，不进首屏。
