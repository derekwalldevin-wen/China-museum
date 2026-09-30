# 第四十三批故事浏览器验收（DeepSeek 接手首轮）

日期：2026-09-30。执行者：DeepSeek。工作目录：`C:\Users\derek\Documents\kimi\Workspaces\博物馆\museum-atlas`。
范围：按 `docs/DEEPSEEK-HANDOFF-2026-09-30.md` 第一步，对第四十三批 `fj-dhgy`（福建博物院 明德化窑何朝宗款观音立像）与 `ah-wgj`（安徽 吴王光鉴）做本地桌面、390px 手机与弱网无头验收，并复核全量数据与包体测试。

**本轮所有结果均为本轮重新运行所得，未沿用 9 月 30 日之前的任何验收数字。未执行任何部署。**

## 一、结论

1. 生产构建成功；本地数据/包体测试 **125/125 通过**。
2. 故事浏览器验收 **304/304 通过**（桌面 1440×960 与手机 390×844 各一套，含 `fj-dhgy`、`ah-wgj` 两件直达检查）。上轮为 300 项，本轮新增两件 × 两台设备 = 4 项。
3. 390px 弱网图片调度 **7/7 通过**；首屏仍为 **2 张**卡片文物图、**27,750 B**，与交接文档记录的上轮边界完全一致。
4. 第四十三批补充证据 **4/4 通过**，并留下两件在桌面与手机下的首屏/来源面板截图共 8 张。
5. 图片授权登记未被改动（SHA-256 仍为 `33866b42…bda65`，206 条）；AI 标识、URL 筛选回填、阅读位置与历史恢复、退出回原详情等边界均在本轮重新验证通过。
6. 发现两个需要处理的环境/文案问题，见第五节；其中文案问题**本轮故意未改**，以保持被验收构建与证据一一对应。

## 二、复现的本地权威状态

| 项目 | 本轮实测 | 交接文档 |
| --- | --- | --- |
| 文物 / 博物馆 | 206 / 59 | 206 / 59 |
| 完整分层故事 | 140 | 140 |
| 主题游线 | 6 | 6 |
| 文字来源登记 | 419（`stories*.json` 去重） | 419 |
| 图片登记 `src/data/images.json` | SHA-256 `33866b421aa0f6a36a9b543a39b8a9ce4ba47fe8ff8c735363dcefa22bfbda65`，206 条 | 同 |
| 缺完整故事的现有文物 | 66（逐件差集见下） | 66 |
| Git 元数据 | 无 `.git` | 无 |

`npm run build` 的 `prebuild` 生成结果与交接文档一致：来源 `src/data/museums.ts` 59 馆 206 件；轻索引 206 条；搜索语料 206 条；59 个按馆载荷；故事目录 140 载荷 / 6 游线；图片卡片清单 206 条。

66 件缺故事的文物分布（按馆，逐件名从权威源导出）：内蒙古博物院 2、沈阳故宫博物院 3、吉林省博物院 2、黑龙江省博物馆 2、江西省博物馆 3、景德镇中国陶瓷博物馆 3、孔子博物馆 3、洛阳博物馆 2、开封市博物馆 2、殷墟博物馆 3、荆州博物馆 2、广东省博物馆 3、广西壮族自治区博物馆 2、重庆中国三峡博物馆 3、四川博物院 3、贵州省博物馆 3、西藏博物馆 3、宁夏博物馆 2、新疆维吾尔自治区博物馆 2、香港故宫文化博物馆 3、澳门博物馆 2、大同市博物馆 1、辽宁省博物馆 1、南京博物院 1、扬州博物馆 2、泉州海外交通史博物馆 2、山东博物馆 1、青州市博物馆 1、海南省博物馆 1、西安博物院 1、敦煌研究院（莫高窟）1、青海省博物馆 1。

## 三、构建与测试

```powershell
npm run build                    # 成功
node --test scripts/*.test.mjs   # 125 通过 / 0 失败
```

构建产物（与本轮验收所用构建一致）：入口 `index-*.js` 325.55 KB（gzip 103.69 KB）、`StoryExperience` 51.29 KB（gzip 17.00 KB）、`InkScrollIntro` 510.07 KB（Three.js 开场块，存在既有大块警告，构建仍成功）；`postbuild` 排除 17 份隔离/受限资产的 `dist` 副本，原件保留。

## 四、浏览器验收

服务：`npm run preview -- --host 127.0.0.1 --port 4177`（vite preview，非线上站点）。
浏览器：本机 headless Edge `Edg/154.0.4258.37`，独立 `--user-data-dir`，经 `scripts/lib/headless-cdp.mjs` 走 CDP；未使用 Computer Use。

| 套件 | 命令 | 结果 | 证据 |
| --- | --- | --- | --- |
| 故事全量 | `node scripts/e2e-stories.mjs` | **304/304** | `docs/audits/story-browser/local/results.json` |
| 弱网图片调度 | `node scripts/e2e-image-scheduling.mjs` | **7/7** | `docs/audits/image-scheduling-browser/local/results.json` |
| 第四十三批定向 | `node scripts/e2e-story-batch43.mjs` | **4/4** | `docs/audits/story-browser/local/batch43-results.json` |

覆盖点（本轮实测通过）：两件直达 URL 后四章齐备、细节 ≥3、`trail` 错误参数被纠正、有理由的跨文物比较链接（`fj-dhgy → fj-jyz`，`ah-wgj → ah-czd`）、来源面板可展开且链接为新窗口 `rel="noreferrer"`、按钮/链接触控高度 ≥43px、无横向溢出；六条游线全站站点顺序、AI 示意披露（`非文物实拍`）、原典/考古报告/研究解释类型标识、跨件跳转后退恢复阅读位置、刷新与前进恢复同一阅读锚点、退出故事回到原详情与筛选滚动、分享直达与未知文物回退目录、无未捕获异常与意外网络失败。

来源面板实测条数：`fj-dhgy` 3 条、`ah-wgj` 4 条，且每条带类型标签（延伸资料/馆藏说明/考古报告书目）、核读深度（已核读全文 / 仅核读可检索片段）与“支持：…”说明；`ah-wgj` 修订说明明确写出已撤去“春秋最大青铜鉴”“青铜冰箱”“联姻抗楚外交棋局”的确定语气，保留馆方直接支持的尺寸、纹饰、铭文、出土与嫁女解释。

弱网口径：390×844、`connectionType: cellular3g`、latency 400ms、下行 20 KB/s、CPU 4× 限速；首屏稳定为 2 个卡片图请求、27,750 B，2 个固定尺寸占位；快速下滑后低位图在进入范围时才补取，反向滚动不重复请求，被拦截的 WebP 仅在卡片进入范围后重试同一原图。

截图证据（`docs/audits/story-browser/local/`）：
`batch43-desktop-fj-dhgy.png`、`batch43-desktop-fj-dhgy-sources.png`、`batch43-desktop-ah-wgj.png`、`batch43-desktop-ah-wgj-sources.png`、`batch43-mobile-fj-dhgy.png`、`batch43-mobile-fj-dhgy-sources.png`、`batch43-mobile-ah-wgj.png`、`batch43-mobile-ah-wgj-sources.png`。

## 五、发现的问题

1. **首页社媒描述仍写 191 件（陈旧文案，本轮未改）。** `index.html:10` 的 `og:description` 为“轻触真实省界与朱印，在一轴山河间浏览59座博物馆与191件代表文物。”，而权威源已是 206 件；`contest/video/vibelab-demo-storyboard.html` 也有同一处历史数字。文档与脚本中没有任何测试绑定该文案，属纯手写文案残留。**本轮为保持“被验收构建 = 证据来源”的一一对应关系，未修改该文件**；应在下一轮与其它改动一起修正为 206，并重新构建、重跑全量 E2E。
2. **默认 `%TEMP%` 下 esbuild 无法删除自己的临时文件，构建会失败并清空 `dist/`。** 报错 `[vite:esbuild-transpile] remove C:\Users\derek\AppData\Local\Temp\esbuild-…: Access is denied`。`%TEMP%` 下残留的 `esbuild-*` 文件带有 `DerekWen\CodexSandboxUsers` 的 ACL 记录（沙箱遗留），当前进程可删但 esbuild 子进程删除被拒。把 `TEMP`/`TMP` 指向工作区内目录（如 `.tmp/ebtemp`）后构建立即成功，并复现出交接文档的包体数字。**这是环境问题，不是项目代码问题**；建议后续构建固定该环境变量，或修复该目录 ACL。
3. **`npm.ps1` 被执行策略禁用**，PowerShell 下需改用 `npm.cmd`（或 `cmd /c "npm …"`），否则报 `UnauthorizedAccess`。

## 六、本轮未做

- 未做线上 `https://huaxia-museum-atlas.pages.dev/` 验收，未部署：本地改动仍只在本地，需用户新的发布指示。
- 未新增或扩写任何故事；66 件缺故事文物未动。
- `yx-sxd` 两鼎编号/现藏与 `jx-glc` 发现或征集口径的冲突仍按 `findings.md` 保留未知，未据此写作。
- 真机低端安卓仍无设备，弱网结论仅为模拟验收。

## 七、下一步

1. 修正 `index.html` 社媒描述 191 → 206，重建并重跑 `node --test scripts/*.test.mjs` 与 `node scripts/e2e-stories.mjs`，使文案修复同样有本轮证据。
2. 按逐件可核的馆方记录/考古正式材料继续补写 66 件，优先第二、三节所列各馆；先核身份与来源，再处理图片。
3. 扩充藏品至约 300 件前，任何新增 ID、馆归属、年代/类别、故事与图片权利链都要过测试。
4. 发布仍待用户授权；发布前重做生产构建、全量测试、桌面/手机本地与线上验收、资源哈希核对。

## 八、文案修正后的复验（同日，用户批准后）

`index.html:10` 的 `og:description` 已由 191 改为 **206**，并新增 `scripts/site-copy.test.mjs` 把首页社媒文案的两个数字绑定到权威源 `src/data/museums.ts`（馆数 59、件数 206）。今后任何增删藏品若忘记同步文案，该测试会直接失败并报出双方数字。

**负向对照（证明测试有效）**：把文案临时改回 191 后运行 `node --test scripts/site-copy.test.mjs`，得到 `fail 1` 与 `AssertionError: og:description claims 191 artifacts, authority source has 206`；恢复 206 后通过。

修正后的完整复验（全部为本轮重新运行）：

| 项目 | 结果 |
| --- | --- |
| `node --test scripts/*.test.mjs` | **127/127 通过**（原 125 + 新增 2 项文案绑定测试） |
| `npm run build` | 成功；`dist/index.html` 已确认为 206 |
| 故事全量 E2E | **304/304 通过**（桌面 + 390px 手机） |
| 390px 弱网图片调度 | **7/7 通过**（首屏 2 图 / 27,750 B 不变） |
| 第四十三批定向 | **4/4 通过** |

**过程记录（需后人注意）**：本次修正中曾用 PowerShell `Set-Content` 改写 `index.html` 做负向对照，导致该文件被写成非 UTF-8 编码而损坏（中文变成乱码、`206` 丢字节）。已用工具以 UTF-8 重写恢复，恢复后与原文逐行核对，**仅第 10 行由 191 变为 206**，其余 22 行完全一致；负向对照改用编辑工具重做。**结论：本项目的 UTF-8 源文件不要用 shell 的 `Set-Content`/`Out-File` 改写，必须使用编辑器工具。**

