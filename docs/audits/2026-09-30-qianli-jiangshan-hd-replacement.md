# 《千里江山图》高清图替换（公有领域全卷扫件）

日期：2026-09-30。执行者：DeepSeek。范围：按用户要求为《千里江山图》卷取得合适的高清图并替换上线。

## 一、替换前的实际状态（问题确认）

| 位置 | 替换前 | 替换后 |
| --- | --- | --- |
| 详情图 | `/artifacts/gg-qljs.jpg`，**900×36 像素、6,023 字节** | `/artifact-sources/verified/gg-qljs-detail-pd.jpg`，**16000×640、2,358,635 字节** |
| 卡片图 | `/artifacts-v2/p1/gg-qljs.png`，**AI 生成示意图** | `/artifact-sources/verified/gg-qljs-card-pd.jpg`，**1000×720 原作局部、185,452 字节** |
| 响应式派生 | 无 | `53ce6558…-scroll-detail-w16000.webp`（**2.28 MB**）+ 卡片 240/400/640/960 WebP |

站内同类基准：《清明上河图》详情图 16000×770 / 3.81 MB、长卷派生 2.95 MB。本次替换后的数量级与之相当，派生图还略小。

## 二、为什么绕了一圈：网络与授权

1. 登记里原本就记着正确的公有领域来源（Wikimedia Commons 的 PD-scan）与全卷原件地址，但 `sourceReview` 明确写着「已知高清原件本次仍连接超时；按用户指示跳过」。
2. 本轮实测：`commons.wikimedia.org` 直连超时 45s、`upload.wikimedia.org` 被重置、`zh.wikipedia.org` 的 DNS 被污染（解析到 31.13.106.4）；archive.org、web.archive.org、Google Arts、wsrv.nl、images.weserv.nl、statically.io、wikiwand、raw.githubusercontent **全部不可达**。
3. 当时唯一可达的替代是**故宫数字文物库**，但其页面源码中的著作权声明写明「均为故宫博物院著作权所有……可以访问进行个人研究，但**不得用于任何商业用途**」。公网站点使用需书面授权，因此**没有采用**。
4. 用户选择开启代理后，系统代理 `localhost:15236` 生效，Commons API 与原件随即可达（HTTP 200）。

## 三、取得的原件与授权核读

Commons API（`action=query&prop=imageinfo&iiprop=url|size|mime|extmetadata`）核读结果：

- 文件：`Wang Ximeng. A Thousand Li of Rivers and Mountains. (Complete, 51,3x1191,5 cm). 1113. Palace museum, Beijing.jpg`
- 尺寸/体积：**39974×1600、14.04 MB、image/jpeg**
- 授权：`LicenseShortName = Public domain`、`UsageTerms = Public domain`、`Restrictions = none`
- 原件经代理下载：14,724,731 字节，sha256 `8642d4f3d5f7edaa022200dfe2cdea56b1183c78c6cd4abbf47620daf7fda8f4`
- 画面核验：全卷青绿山水，卷首有题跋与鉴藏印，1:1 裁切可见山石、屋木、舟桥笔触与绢丝纹理，**无水印**

同时比对了登记中另一候选 `王希孟千里江山图卷.png`：153767×6110、**1894.76 MB** PNG，虽然也是公有领域，但体积过大且远超 WebP 编码上限，故不采用。

## 四、派生与登记

- **详情图**：从 39974×1600 等比缩放为 **16000×640**（JPEG q90 渐进式）。之所以取 16000：与站内《清明上河图》同一量级，且**低于响应式管线 WebP 的 16383 像素上限**（`scroll-detail` 档位按源图宽度出图，若直接用 39974 会编码失败）。
- **卡片图**：从原件裁取中段山峰与水面局部 2000×1440 → 等比缩放 1000×720（JPEG q92），无水印无题跋文字。
- `src/data/images.json`（**授权与清晰度的权威源**）更新：
  - card 与 detail 均改为 `kind: source`、`authorizationStatus: verified`、`assetMatchStatus: verified`；
  - 补齐 `sourceUrl / sourceTitle / author / institution / license(Public domain) / licenseUrl / verifiedAt / linkCheckedAt / assetSha256 / originalSourceUrl / originalSha256 / modifications / evidenceNote`；
  - `retiredAssets` 登记两件弃用素材及原因（AI 卡片、900×36 历史缩图）。构建时的 `exclude-quarantined-assets.mjs` 会据此**自动把这些副本排除出 `dist`**，原始文件仍留在 `public/`（实测：dist 中两件已不存在，新素材正常产出）。
  - `sourceReview` 更新为「原先记录的高清原件连接超时已解决」。

## 五、测试与门禁

替换后出现的红灯与处理：

1. **3 项历史快照测试**因 gg-qljs 的登记变更而失败（它们冻结了旧状态）：
   - `collection-additions.test.mjs`「其余记录未变」：**不改写历史基线文件**，而是新增 `refreshedLater` 例外；同时按该文件既有的 `previousUnchangedRecordsSha256` 惯例，把旧哈希移入该字段、写入新哈希，并新增 `refreshedRecords` 记录本次刷新的原因。
   - `collection.test.mjs`「round 3 覆盖 58 项」：新增 `supersededLater`，让 gg-qljs 的登记行按「已弃用来源」校验（其 `retiredAssets` 确实包含登记行里的旧 src，且旧文件仍在盘上、哈希仍可对上）。
   - `image-metadata-loading.test.mjs`「授权边界」：verified 数量 12 → **14**（gg-qljs 两个变体），并断言其卡片为 `source`。
2. **新增一项确定性守卫**（`collection.test.mjs`）：断言 gg-qljs 的响应式源宽度 ≥8000px、源高度 ≥300px（低于 300 会触发阅读器的「低清历史缩图」提示），卡片为 `source`，且两件弃用素材仍在 `retiredAssets` 中。
3. **两处 E2E 等待条件本身有问题，已修正**：
   - `e2e-stories.mjs` 原先等待 gg-qljs 出现「低清历史缩图」提示——替换后该提示**正确地不再出现**。改为断言**不再出现低清提示**、图像确实加载、且经响应式管线投递。（最初我写成断言 naturalWidth ≥8000，但故事插图按视口取候选，移动端 390px 是正确行为，已改为不依赖设备的断言。）
   - `e2e-responsive-images.mjs` 原先等待清明上河图「长卷阅卷台」里的 `<img>` 指向 `/artifact-responsive/`；而该阅读器实际渲染的是 **长卷切片**（`/artifact-scroll-tiles/…`），响应式 WebP 走的是画廊路径——**这是替换之前就存在的过期断言**（该文件、阅读器实现与 `qingming-tiles.json` 本轮均未改动，可核对 `git status`）。已改为按切片路径断言，画廊的响应式断言保留。

## 六、本轮验收

| 项目 | 结果 |
| --- | --- |
| `node --test scripts/*.test.mjs` | **143/143 通过**（含新增的清晰度守卫） |
| `npm run build` | 成功；`Excluded 19 quarantined/restricted build copies`；dist 中新素材存在、两件弃用素材已排除 |
| `e2e-responsive-images` | **5/5 通过** |
| `e2e-image-scheduling`（弱网） | **7/7 通过** |
| `e2e-image-metadata` | **5/5 通过** |
| `e2e-home-refinement` | **通过**（三视口 + 慢网络 + 图片失败降级） |
| `e2e-stories`（桌面 1440 + 390px） | **382/382 通过** |

### 线上发布与线上核验

- 部署：`wrangler pages deploy dist`（新增 23 个文件）→ `https://bae37026.huaxia-museum-atlas.pages.dev`，正式域名 `huaxia-museum-atlas.pages.dev`。
- 资源核验：4/4 线上素材与本地 **逐字节一致**——详情图 2,358,635 B（`53ce65584b7a`）、卡片图 185,452 B（`f48850ed6bcd`）、16000px 长卷派生 2,275,616 B、卡片 w960 派生 68,990 B。
- 线上页面核验（`docs/audits/story-browser/production/live-gg-qljs-{desktop,mobile}.png`）：故事图实际加载 `…/artifact-responsive/53ce65584b7a8ebb-scroll-detail-w16000.webp`；页面**不再出现**「低清历史缩图」；披露条为「图源 故宫博物院 · Public domain · 来源与授权已核」「来源图 · 非 AI 复原」；署名面板显示标题、作者、机构、许可与图像处理说明；线上入口包**不再引用**已弃用的 AI 卡片；无横向溢出。
- 卷首现状：该扫件是**完整卷**，横向阅卷的第一屏是卷首的蔡京题跋，向右滑动才是青绿山水。若更希望「开卷即见山水」，可以裁去题跋只留画心，请用户示意。

### 一处必须说清的缓存现象

弃用的旧素材**已从构建产物中移除**（`dist/artifacts/gg-qljs.jpg`、`dist/artifacts-v2/p1/gg-qljs.png` 均不存在），但线上仍能取到它们：

- 直取旧地址：`HTTP 200`、`Content-Type: image/jpeg`、`6,023 B`，响应头 `CF-Cache-Status: HIT`、`Age: 26444`、`Cache-Control: public, s-maxage=604800`；
- 加任意查询串绕开缓存：`200 text/html 1432 B`（即 SPA 回退页，说明**当前部署里已无该文件**）。

结论：这是 **Cloudflare 边缘缓存**里 7 天 TTL 的旧条目，不是部署里还有文件。`pages.dev` 不属于本账号的 zone，无法用 API 清理缓存，因此这两条旧缓存会在 TTL 到期后自行消失；应用已不再引用它们（已核对线上入口包）。

## 七、改动文件

- 新增 `public/artifact-sources/verified/gg-qljs-detail-pd.jpg`、`gg-qljs-card-pd.jpg`
- `src/data/images.json`（gg-qljs 记录：来源/授权/哈希/弃用素材）
- 生成物：`assets/responsive-images/{plan,manifest}.json`、`src/data/image-card-manifest.json`、`public/artifact-responsive/53ce6558…`、`f48850ed…` 系列
- `assets/provenance/ai-completion-2026-09-23/before-six.json`（哈希轨迹 + `refreshedRecords`）
- 测试：`scripts/collection.test.mjs`、`scripts/collection-additions.test.mjs`、`scripts/image-metadata-loading.test.mjs`、`scripts/e2e-stories.mjs`、`scripts/e2e-responsive-images.mjs`
