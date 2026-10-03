# 设计品质第三十轮：长卷浏览——低成本滚动吸附版

日期：2026-10-03。按用户决策执行第 4 条：长卷浏览从**低成本 scroll-snap 版**起步。

## 一、先看现状：长卷阅读器本来就存在

`ArtifactCard.tsx` 里已有 `ArtifactScrollReader`（横向阅卷台）：

- `role="region"` + `aria-label="…长卷阅卷台"`，`tabIndex=0` 可键盘浏览；
- 指针拖拽（`cursor-grab`）、滚轮、键盘左右键；
- 故宫《清明上河图》（`gg-qmsh`）**20 个分片**按需加载（每片 800×770，附带 webp/jpeg 与校验值）；
- 进度、低分辨率提示、来源披露。

所以"低成本"不是新建阅读器，而是**给现有的连续滚动加稳定停靠点**。

顺带发现一处"引用了却从未应用"的类：`StoryExperience` 的滑动手势守卫里写着 `.artifact-scroll-reader`，但这个类**从来没有加在元素上**。本轮补上——守卫从此真正生效。

## 二、做法

```css
.artifact-scroll-reader { scroll-snap-type: x proximity; }
.artifact-scroll-reader [data-scroll-tile] { scroll-snap-align: start; scroll-snap-stop: normal; }
@media (prefers-reduced-motion: reduce) { .artifact-scroll-reader { scroll-snap-type: none; } }
```

**为什么用 `proximity` 而不是 `mandatory`**：长卷是**连续阅读物**，强制吸附会在每个分片边界"拽住"视角，读起来一顿一顿；`proximity` 只在已经靠近边界时吸附——给出稳定停靠点，又不打断连续滑动。

## 三、行为实测（不是只看计算值）

| 场景 | 目标位置 | 结果 |
| --- | --- | --- |
| 默认 · 近边界（+40px） | 771 | **731 ＝分片边界，偏差 0px** ✓ 吸附生效 |
| 默认 · 更远处（+300px） | 1031 | 1097 ＝下一分片边界（距其仅 66px，就近吸附）✓ |
| **减弱动效** | — | `scroll-snap-type: none`，**完全不吸附**（771→771、1031→1031）✓ |

也验证了 390 与 1440 两档（容器 `scrollWidth` 7314 / 视口 1060，20 个分片各 366px 宽）。

## 四、量表 v20

新增判据：**长卷阅卷台启用滚动吸附**（默认含 `x`，且减弱动效下为 `none`）。
配平：动效与手感 11 → 12；性能预算 6 → 5（渲染阻塞样式包项 2 → 1 分）。

## 五、验收（本轮实跑）

| 项目 | 结果 |
| --- | --- |
| 全量单元测试 | **181/181 通过** |
| `e2e-stories` | **462/462 通过** |
| `e2e-map` | **7/7 通过** |
| `e2e-intro` | **6/6 通过** |
| `e2e-home-refinement` | 通过 |
| `e2e-visitor-records` | **10/10 通过** |
| 设计品质自检（本地） | **100/100**（吸附判据通过） |
| 设计品质自检（线上） | **100/100**（同值） |
| 线上发布核对 | `deployment list` 确认最新版本 `f733c350` ✓ |

线上已发布：`https://f733c350.huaxia-museum-atlas.pages.dev`（主域同步）。

## 六、下一步（若你要继续深化长卷）

低成本版已交付。若要更完整的长卷浏览，下一步可选：分片级**章节标注**（把 20 片映射到画卷段落）、**双击/滚轮缩放**、**缩略图导航条**、以及**进片预取策略**（当前已按可见范围预取 ±1 片）。
