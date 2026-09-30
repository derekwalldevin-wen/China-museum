# 访客公网提交（第二期：Pages Functions + D1 + 人工审核）

日期：2026-09-30。状态：**已上线**。照片存储为 D1 回退（R2 尚未在账号启用，见文末）。

## 一、这一期做了什么

访客现在可以直接在线上提交，站长审核通过后公开展示：

| 环节 | 实现 |
| --- | --- |
| 提交入口 | 访客页「我的记录」里每条记录一个「提交到网站审核」按钮；提交前必须有投稿人署名 |
| 接口 | `POST /api/visitor/submit`（multipart，字段校验 + 每 IP 每小时 5 次限流） |
| 照片 | 服务端逐张校验 MIME 与大小（≤2 MB/张、≤12 MB/次），**服务端重算 sha256**；R2 有绑定则写 R2，否则写 D1 blob |
| 元数据 | D1 `submissions` / `photos` 表（另含 `rate_limits` 表） |
| 审核 | `POST /api/visitor/review`，需 `x-admin-token`（Pages secret）；`action: list/approve/reject`，**驳回必须填理由** |
| 审核台 | `/visitor-records/review/`（`noindex`，未从任何公开页面链接）；照片用带令牌的 fetch 取回后转 blob 显示，**令牌不进 URL** |
| 公开 | `GET /api/visitor/published` 只返回 `approved`；`GET /api/visitor/photo/<id>` 在未通过时一律 404（即使知道照片 id） |
| 查询 | `GET /api/visitor/status/<id>` 让投稿人查自己的状态与审核备注 |
| 披露 | 公开记录一律带「访客投稿 · 未经馆方核验」，并显示投稿人与审核备注 |

## 二、关键设计

1. **未审不得见**：`published` 只查 `status='approved'`；照片接口会再查父记录状态，`pending`/`rejected` 一律 404。审核台的预览走 `x-admin-token` 分支。
2. **隐私不外泄**：公开载荷只含展示所需字段；`contact`、`ip_hash`、`user_agent` 永不出现在任何公开响应里（有测试断言）。
3. **存储适配器**：`src/visitor/server.ts` 的 `putPhoto/getPhotoBytes` 依据 `env.PHOTOS` 是否存在自动选择 R2 或 D1，因此 **R2 就绪后只需加一条绑定并部署，不改代码**。R2 路径下不会把字节重复写进 D1（有测试断言 `data` 为 null）。
4. **审核令牌**：`wrangler pages secret put ADMIN_TOKEN`（生产已设置，值另存于本地 `.tmp/admin-token.txt`，该文件被 gitignore）；请求头传递并做等长比较。
5. **不污染策展层**：访客内容仍只存在于自己的表与独立页面，`images.json`、故事文本与舆图数据不含任何访客资产（一期测试继续守着）。

## 三、验收

| 项目 | 结果 |
| --- | --- |
| 单元测试 | **160/160 通过**（新增 6 项 API 测试：字段与照片校验、D1 回退、R2 路径、审核队列与越权、驳回后再隐藏、限流与管理员预览）；测试用 `node:sqlite` 跑真 SQL、用内存对象当 R2 |
| 本地 E2E（`wrangler pages dev` + 本地 D1 + 本地 R2） | **4/4 通过**（桌面 + 390）：提交 → 待审期间公开接口与照片均不可见 → 审核通过 → 出现在"已发布"并带标识与备注 |
| 线上 E2E（真实 Pages Functions + 生产 D1） | **4/4 通过**（同上四步，桌面 + 390） |
| 线上部署 | `3af9ffb8`（含 Functions bundle）；`/api/visitor/published` 返回 `200 application/json` |
| 线上清理 | 测试投稿已从生产 D1 删除，`/api/visitor/published` 现返回 `records: []` |
| 全量回归 | 故事 400/400、首页门禁、响应式、弱网调度等既有套件不受影响（本轮改动只增页面与 Functions） |

## 四、本轮踩到并修掉的问题

1. **相对路径打错接口**：访客页在 `/visitor-records/` 下用 `fetch('api/visitor/submit')` 会被解析成 `/visitor-records/api/...`（404）。已改为绝对路径 `/api/visitor/*`。
2. **浏览器缓存导致"审核后看不见"**：`/api/visitor/published` 原先 `max-age=60`，页面刷新时复用了审核前的空列表。页面改为 `cache: 'no-cache'`，接口改为 `max-age=30, must-revalidate`。
3. **本地 D1 与 `pages dev` 用的不是同一份库**：CLI `--d1=DB=...` 会另建一个本地库，导致 `no such table: submissions`。改为让 `pages dev` 使用 `wrangler.toml` 里的绑定（与 `d1 execute --local` 同一份）。
4. **一期测试与新功能冲突**：一期断言"访客代码不得出现 fetch"，二期正是要提交。已改为**白名单断言**：只允许请求 `/api/visitor/*`，并禁止 `XMLHttpRequest`/`sendBeacon`/`WebSocket`/地理定位。
5. **E2E 选择器**：按位置取表单输入会撞上月份输入框，改为按标签定位；保存按钮补"可用后再点 + 失败重试一次"。

## 五、R2 现状与切换方式

截至本轮结束，`npx wrangler r2 bucket list` 仍返回 `code: 10042 Please enable R2 through the Cloudflare Dashboard`，因此生产**正在使用 D1 存照片**（D1 免费额度 5 GB，单行上限 2 MB，与我们的单张上限一致；当前每张压缩后约 0.3–1.5 MB）。

启用 R2 后切换只需两步（无需改代码）：
1. `npx wrangler r2 bucket create huaxia-visitor-photos`
2. 取消 `wrangler.toml` 里 `[[r2_buckets]]` 注释（binding `PHOTOS`）并重新部署

## 六、运维要点

- 审核台地址：`https://huaxia-museum-atlas.pages.dev/visitor-records/review/`（`noindex`）。
- 审核令牌：本地 `.tmp/admin-token.txt`（gitignored）。**转发或轮换**：`npx wrangler pages secret put ADMIN_TOKEN --project-name=huaxia-museum-atlas`。
- 限流：每 IP 每小时 5 次提交；D1 表 `rate_limits` 可查。
- 若未来把站点迁回国内托管，UGC 会涉及备案与内容审核要求；当前托管在 `pages.dev`（境外），仍建议补一份用户协议与隐私说明。
