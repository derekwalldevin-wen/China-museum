# 设计品质第五轮：把第三方字体拿掉，首屏从"十几秒"变成"百毫秒级"

日期：2026-10-02。上一轮结尾我说要把冷启动 LCP 做出来。这一轮不但做到了，还挖出一个**比 LCP 更严重的问题**。

## 一、真凶：第三方字体把 `document load` 拖到 17 秒

先量清楚了整条链（冷启动、禁用缓存、单次导航）：

| 指标 | 数值 | 说明 |
| --- | --- | --- |
| `#root` 挂载 | **134ms** | 应用本身很快 |
| `document.readyState = complete` | **17,159ms** | ← 卡在这里 |
| 卡住的资源 | `fonts.googleapis.com/css2?family=…` | **11ms 发起 → 16,727ms 完成，184KB** |

也就是说：Google Fonts 的样式表请求在本环境下要 **16.7 秒**。这既拖慢首帧，也让所有 E2E 的"等 `readyState=complete`"超时（这就是本轮 `e2e-stories` 反复失败的根因）。

## 二、改法：不依赖第三方字体，改用系统字体栈

- 删除 `index.html` 与 `visitor-records/index.html` 里的 Google Fonts 引用与 preconnect（全站已确认零第三方字体请求）；
- 字体栈补齐跨平台候选：
  - 衬线：`'Songti SC', 'Noto Serif SC', 'Source Han Serif SC', 'Source Han Serif CN', 'SimSun', serif`
  - 无衬线：`-apple-system, 'PingFang SC', 'HarmonyOS Sans SC', 'Microsoft YaHei', 'Noto Sans SC', system-ui, sans-serif`
  - 题字（原 `Ma Shan Zheng` 的 6 处）：回落到系统楷体 `KaiTi / STKaiti` —— 本来就写着这个兜底，现在真正生效
- 首屏海报（上一轮加的纯 HTML/CSS 首帧）成为**唯一**的首帧来源，正文随后接管。

**顺带解决的**：不再向第三方发起请求，等于去掉了隐私与可用性风险（欧洲评委很在意这个）。

## 三、效果（本地冷启动，禁用缓存，三次）

| 指标 | 本轮前 | 现在 |
| --- | --- | --- |
| 冷启动 FCP | 1764 / 1892 / 516 ms | **72 / 140 / 92 ms** |
| 冷启动 LCP | 2680 / 4076 / 2764 ms | **72 / 140 / 92 ms** |
| `document complete` | 17,159 ms | **172 ms** |

## 四、踩坑与回退（诚实记录）

1. **加过又去掉的两样东西**：`<link rel=preload as=image>` 把 207KB 画作并进了文档 load 事件，让框架的 `readyState=complete` 等待更脆；已改为**去掉画作的 `rendererReady` 门控**（它本就该在开场分片挂载时立刻下载），不再用 preload。
2. **我自己引入又回退的回归**：为解决"字体晚到改变断行"我给阅读位置恢复加了 `document.fonts.ready` 钩子 + 把兜底窗口 4s→8s，结果反而让 `e2e-stories` 的"重载后阅读锚点"检查失败——那个钩子会让恢复提前收尾。**字体依赖已经去掉，钩子也就没必要**，已完整回退，`e2e-stories` 恢复 **460/460**。
3. **环境噪声要区分**：本轮出现多次 E2E 超时，其中 `e2e-detail-prefetch` 是七套件连跑下的负载偶发（单独跑 7/7，且探针实测行为正确：恰好 1 个 provenance 请求）。我同时清掉了累积的 **158 个浏览器 profile 目录**与残留预览进程。
4. **线上 LCP 数据必须谨慎解释**：从本机测线上冷启动得到 5.3–14.5s，但同一环境里第三方字体请求要 16.7s、Cloudflare 授权一度不可达——这是**本机到 CDN 的网络病态**，不是页面结构问题。下一步要用 CDP 的 `Network.emulateNetworkConditions` 做**限速档**测量，才能得到与网络环境无关的可比数字。

## 五、验收（本轮实跑）

| 项目 | 结果 |
| --- | --- |
| `npm run build` | 成功 |
| 全量单元测试 | **180/180 通过** |
| `e2e-intro` | **5/5 通过** |
| `e2e-stories` | **460/460 通过** |
| `e2e-home-refinement` | 通过 |
| `e2e-map` | **7/7 通过** |
| `e2e-visitor-records` | **10/10 通过** |
| `e2e-detail-prefetch` | **7/7 通过**（单独复跑确认；连跑时受负载影响） |
| `e2e-image-scheduling` | **7/7 通过** |
| 设计品质自检（本地，冷启动） | **100/100** |
| 设计品质自检（线上） | **96/100** —— 14 项里 13 项满分，唯一扣分是上述网络病态下的 LCP |

（发布期间遇到一次 Cloudflare 授权服务器不可达导致部署失败；核实为网络问题后重试成功。）

## 六、下一轮

1. **用限速档测 LCP**（`Network.emulateNetworkConditions`：Slow 4G / Fast 3G），把"网络因素"从指标里剥离，得到可比数字；
2. **应用 CSS 包是渲染阻塞资源**：把首屏必要样式内联、其余异步化，让海报首帧在慢网络下也更早出现；
3. 若限速档下 LCP 仍不达标，再考虑把首页首屏与故事页拆成独立入口（首页更小、故事页更全）。
