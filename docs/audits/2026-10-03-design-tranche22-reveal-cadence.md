# 设计品质第二十二轮：章节显现的错峰节奏（并修掉一条无效判据与一次假发布）

日期：2026-10-03。上一轮立住了动效的"尺度＋缓动"，这一轮做**显现节奏**——结果过程中又抓到两个自己的问题：一条**无效判据**和一次**失败的发布**。

## 一、先量基线：整块一起亮，没有节奏

故事页的显现规则是：

```css
.story-chapters > section > * { animation: story-reveal linear both; animation-timeline: view(); animation-range: entry 6% cover 24%; }
```

**同一节的所有子元素共用同一个区间** → 小标题、正文、引文在滚动中**同时**落定。实测：同一滚动位置下 4 个子元素的进度只有 **1 个不同值**。

## 二、改为错峰

保持**首个子元素区间不变**（内容不会比以前更晚出现），后续元素依次递延：

```css
.story-chapters > section > *        { animation-range: entry 6%  cover 24% }
.story-chapters > section > *:nth-child(2) { animation-range: entry 9%  cover 27% }
.story-chapters > section > *:nth-child(3) { animation-range: entry 12% cover 30% }
.story-chapters > section > *:nth-child(4) { animation-range: entry 15% cover 33% }
.story-chapters > section > *:nth-child(n+5) { animation-range: entry 18% cover 36% }
```

实测效果（滚动到显现进行中的位置）：

| 子元素 | 显现进度 |
| --- | --- |
| 小标题 | 100% |
| 标题 | 99% |
| 正文 | **52%** |
| 引文 | **0%** |

**4 个子元素、4 个不同进度** ✓——从"整块亮"变成"标题→正文→引文依次落定"的层次。

## 三、我写了一条**无效判据**（已废弃重写）

第一版判据是"进行中的章节内**不同进度值 ≥2**"。看起来合理，其实**无效**：每个子元素都有自己的 `view()` 时间轴，**只要几何位置不同，进度天然就会不同**——不加错峰也可能凑出 2 个不同值。

证据：这条判据在**尚未部署新版的线上**也"通过"了（当时生产还是上一版）。一条会在没有改进时也通过的判据，等于没有。

**改为确定性判据**：检查子元素**声明的显现区间**是否分层（`getComputedStyle(child).animationRange` 的去重数 ≥2）。现在报的是：

```
章节显现错峰（声明区间分层 4 种 / 4 个子元素：
  entry 6% cover 24%、entry 9% cover 27%、entry 12% cover 30%、entry 15% cover 33%）
```

判据文案里直接列出区间，谁看都知道在验什么。

## 四、还发现一次**假发布**

第一次发布时 wrangler 打印了崩溃断言（`Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)`），但我没停在那一行——照旧对"线上"跑了自检并得到 100/100。随后核对 `wrangler pages deployment list` 才发现：**最新生产版本仍是上一轮的**，我那次自检测的是**旧站点**。

处理：
1. 重新发布（成功：`ae910aff`）；
2. **不信任命令输出，改为核对产物**——把线上故事页的 CSS 分片抓下来检查：

```
StoryExperience-D99Aua8L.css（13,602 字节）→ 含错峰规则: true
  nth-child(2){animation-range:entry 9% cover 27%}
```

这条已写进踩坑清单（第 29 条）：**发布后要核对线上产物本身**（构建产物哈希 + 分片内容），不能只看命令返回，也不能只看自检分数。

## 五、量表 v17

新增判据：**章节显现错峰**（声明区间分层，确定性）。关键帧项由 2 分降为 1 分配平；各维度上限合计仍正好 **100**。

## 六、验收（本轮实跑）

| 项目 | 结果 |
| --- | --- |
| 全量单元测试 | **181/181 通过** |
| `npm run build` | 成功 |
| `e2e-stories` | **461/461 通过** |
| `e2e-home-refinement` | 通过 |
| `e2e-intro` | **5/5 通过** |
| `e2e-map` | **7/7 通过** |
| `e2e-visitor-records` | **10/10 通过** |
| 设计品质自检（本地） | **100/100** |
| 设计品质自检（线上） | **100/100**（错峰区间在线上核对一致） |
| 线上产物核对 | 故事页 CSS 分片含错峰规则 ✓ |

线上已发布：`https://ae910aff.huaxia-museum-atlas.pages.dev`（主域同步）。

## 七、下一轮

动效三件（尺度、缓动、节奏）都立住了。下一步候选：**开场动画的节奏设计**（五帧故事板的时长配比是否合理）、**图片进场的解码后显现**（避免"先糊后清"）、以及**滚动进度的物理感**（进度条缓动）。仍等你拍板的是四项：地图密集区抽稀、手机命中区按省自适应、长卷浏览、以及上一轮那条 `ease` 取向建议。
