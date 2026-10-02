# 设计品质第二十四轮：开场节奏实测，并修掉一个真实的无障碍缺口

日期：2026-10-03。这一轮本意是看**开场动画的节奏**，结果在验证退出通道时抓到一个真缺口——**已开启"减弱动效"的用户，开场仍会白播约 3.3 秒**。

## 一、开场节奏实测（默认偏好）

逐帧追踪（页面内 rAF 记录帧名与时刻）：

| 帧 | 时刻 | 与上一帧间隔 |
| --- | --- | --- |
| paper | 99ms | — |
| ink | 562ms | 463ms |
| artifact | 1297ms | 735ms |
| seal | 1996ms | 699ms |
| reveal | 2297ms | 301ms |

结束于 **2999ms**；性能标记：`shown@112`、`motion-ready@220`、`complete@3002`。

节奏是"**中段放缓、收尾加速**"（463 → 735 → 699 → 301ms），不是匀速——这是有设计意图的叙事节奏，不是缺陷。总时长约 **3.0 秒**（源码里的墙钟上限是 3300ms）。

## 二、抓到的真缺口：加载即"减弱动效"时开场不退出

代码里本来就有 `finish('reduced-motion')` 这条退出通道，但它**只挂在媒体查询的 `change` 事件上**：

```js
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const onReducedMotion = () => { if (reducedMotion.matches) finish('reduced-motion'); };
reducedMotion.addEventListener('change', onReducedMotion);   // ← 只监听"变化"
```

**证据**：把 `prefers-reduced-motion: reduce` 从加载前就模拟上，实测 1.5 秒时开场元素**仍然存在**，而且标记里**只有 `static:shown`、没有任何退出标记**——也就是说用户会看着静态故事板等到墙钟上限（3.3 秒）。

### 修法（一行）

```js
reducedMotion.addEventListener('change', onReducedMotion);
onReducedMotion();   // 注册后立即按当前值判断一次
```

### 复测

| | 修前 | 修后 |
| --- | --- | --- |
| 1.5 秒时开场元素 | 存在 ✗ | **不存在** ✓ |
| 退出标记 | 无 | **`exit:reduced-motion@131`**（与出现同一毫秒） |

并把这条固化进 E2E：`e2e-intro` 由 **5/5 → 6/6**（新增"加载即减弱动效 → 开场立即退出"）。

## 三、顺带修掉一个测试竞态

修完上述缺口后，`e2e-home-refinement` 立刻红：

```
TypeError: Cannot read properties of null (reading 'click')
```

原因：该套件用的是"**先判断跳过按钮存在、再点击**"的写法；而开场现在会在**同一帧内自行退出**，两次 evaluate 之间元素就没了。

**产品行为是对的，是测试写法有竞态。** 改成一次性可选点击，意图（越过开场）不变：

```js
await page.evaluate(`document.querySelector('.ink-intro-skip')?.click()`);
await page.wait(`!document.querySelector('[data-ink-intro]')`, 'intro dismissed');
```

修完两套全绿（`e2e-home-refinement` ✓、`e2e-intro` 6/6）。

## 四、验收（本轮实跑）

| 项目 | 结果 |
| --- | --- |
| 全量单元测试 | **181/181 通过** |
| `npm run build` | 成功 |
| `e2e-intro` | **6/6 通过**（含新增无障碍检查） |
| `e2e-stories` | **461/461 通过** |
| `e2e-home-refinement` | 通过（修竞态后） |
| `e2e-map` | **7/7 通过** |
| `e2e-visitor-records` | **10/10 通过** |
| 设计品质自检（本地） | **100/100** |
| 设计品质自检（线上） | **100/100** |
| 线上发布核对 | `deployment list` 确认最新版本 `e1c9679e` ✓ |

线上已发布：`https://e1c9679e.huaxia-museum-atlas.pages.dev`（主域同步）。

## 五、留给你定的一件事（带数据）

开场总时长约 **3.0 秒**（墙钟上限 3.3 秒），四条退出通道都已实测可用：

| 通道 | 实测 |
| --- | --- |
| 跳过按钮 | 页面内 **19ms** 内卸载（预算 200ms） |
| Esc 键 | 同上（瞬时） |
| 加载即减弱动效 | **同帧退出**（本轮修好） |
| 内容就绪 / 业务导航 | 自动结束 |

**是否要把它压缩到 2 秒左右**，属于艺术取向——你现在有实测数字可以定夺。
