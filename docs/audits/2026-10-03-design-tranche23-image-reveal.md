# 设计品质第二十三轮：图片显现——从"一帧硬弹"到 470ms 渐显

日期：2026-10-03。这一轮做候选里的第二项：**图片显现方式**。做法还是老三样：先在真实网速下按时间采样，再改，再用**同一支探针**证明改了。

## 一、先量：解码门控是对的，但出现方式很生硬

Slow 4G 下用页面内 rAF 采样首图状态（每帧记录 opacity / filter / complete / 图片名）：

```
t=2147ms opacity=1  nw=1120  src=…-card-w675.webp      ← 先出卡片图
t=2251ms opacity=0  nw=0                                ← 隐藏，等 detail 图解码
t=2386ms opacity=0  nw=1120 src=…-detail-w1200.webp     ← detail 图开始加载
t=4464ms opacity=0  nw=1120 complete=true               ← 解码完成
t=4490ms opacity=1  nw=1120 complete=true               ← 一帧之内全亮
```

两个结论：

1. **解码门控是有效的** ✓——不会出现"半张图"或"先糊后清"；
2. **但出现方式是硬弹出** ✗——`opacity` 在 **26ms（一帧）**内从 0 跳到 1，过渡态采样点 **0 个**。

## 二、修法：给它一个真正的过渡

`ResponsiveArtifactImage` 此前只是切换 Tailwind 的 `opacity-0` / `opacity-100`，**没有任何过渡类**。改为：

```jsx
className={`… ${revealAfterDecode ? `transition-opacity duration-500 ease-out ${decodedReady ? 'opacity-100' : 'opacity-0'}` : ''}`}
```

`duration-500` 在上两轮建立的动效尺度里已被并入 `--motion-enter`（520ms），所以这里自动落在尺度上；`prefers-reduced-motion` 下全局开关会把它压成 0.01ms（瞬时）✓。

## 三、同一支探针证明有效

改完再采样：

```
t=4603ms opacity=0.37
t=4685ms opacity=0.63
t=4753ms opacity=0.77
t=4817ms opacity=0.87
t=4881ms opacity=0.92
t=4946ms opacity=0.97
t=5070ms opacity=1
```

**过渡态采样点 6 个 → 有渐显过渡 ✓**，全程约 **470ms**。前后对比用的是**同一支探针、同一网速档**。

## 四、线上同样验证（并把上一轮的教训用上）

- 线上跑同一支探针：**过渡态采样点 6 个 ✓**；
- 并且这次**先核对 `wrangler pages deployment list`**，确认最新生产版本就是本次发布（`e45ef2ed`，source `7e5c826`），再跑线上自检 → **100/100**。

（上一轮吃过"命令崩了但没检查、拿旧站点当线上"的亏，这轮把核对做成固定动作。）

## 五、量表 v18

新增判据：**图片渐显**（首图声明了 opacity 过渡且时长 > 0）1 分，归入图像工艺（上限 4 → 5）；性能预算由 7 降为 6（首屏 JS 项 3 → 2 分）配平。各维度上限合计仍正好 **100**。判据文案直接打印实测值：

```
✓ 图片渐显（首图过渡 property=opacity duration=0.52s）
```

## 六、验收（本轮实跑）

| 项目 | 结果 |
| --- | --- |
| 全量单元测试 | **181/181 通过** |
| `npm run build` | 成功 |
| `e2e-stories` | **461/461 通过** |
| `e2e-home-refinement` | 通过 |
| `e2e-intro` | **5/5 通过** |
| `e2e-map` | **7/7 通过** |
| 设计品质自检（本地） | **100/100** |
| 设计品质自检（线上） | **100/100**（图片渐显在生产同样通过） |
| 线上发布核对 | `deployment list` 确认最新版本 + 线上探针复测 ✓ |

线上已发布：`https://e45ef2ed.huaxia-museum-atlas.pages.dev`（主域同步）。

## 七、下一轮

动效清单还剩：**开场动画五帧的时长配比**、**滚动进度的物理感**（进度条缓动）。仍等你拍板的是四项：地图密集区抽稀、手机命中区按省自适应、长卷浏览、以及 `ease` 取向建议。
