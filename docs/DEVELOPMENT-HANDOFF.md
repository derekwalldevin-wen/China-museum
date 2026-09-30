# 开发交接 · 2026-09-15

## 最新：图片安全清单与按馆溯源已上线

- `images.json`继续作为唯一权威源；构建期生成25,242 B安全卡片清单和59馆完整溯源JSON。卡片只读取已解析显示结果，详情才fetch当前馆并缓存；失败后保留安全预览、URL和原位重试。
- 卡片相关延迟JS由161,591 B/gzip27,307 B降至55,344 B/gzip11,974 B，分别下降65.75%/56.15%；入口保持317,376 B/gzip100,983 B。
- 数据/包体51项、本地无头95项、线上89项、发布资源哈希133/133通过。部署1a9aab02；报告见 `docs/audits/2026-09-15-image-metadata-loading-optimization.md`。
- 不要把详情payload改回动态import：失败模块会被浏览器缓存，当前静态JSON fetch才能可靠原位重试。安全清单是性能/展示边界，不是保密系统。

## 最新：191件文物轻索引与按馆加载已上线

- `museums.ts`继续作为权威源，但不再进入生产首包；构建前生成轻索引、59馆完整payload和首次搜索才加载的全文语料。
- 入口由351,977 B/gzip122,352 B降至317,376 B/gzip100,983 B，分别下降9.83%和17.47%；直达馆藏只请求当前馆，手机直达不启动地图下载。
- 静态43/43、本地无头90项、线上84项、发布资源哈希73/73通过。部署5dfe2530；报告见 `docs/audits/2026-09-15-artifact-data-loading-optimization.md`。
- 馆payload失败保留URL后整页重载；全文检索JSON失败时基础搜索可用并可原位重试。不要改回失败后重复动态import。

## 最新：二维卷轴地图离线几何分级已上线

- 原始 GeoJSON 25,240 点/424,582 B 保留；新增标准 7,530 点/131,069 B 和紧凑 4,749 点/84,923 B。浏览器只选择已生成级别，不在运行时简化。
- 优化前地图块 434.60 kB/gzip 125.32 kB；桌面加载路径 141.90/42.42 kB，手机 95.75/29.50 kB。入口主包维持 351.98/gzip 122.35 kB。
- 34 省逐一桌面鼠标和手机触摸命中、港澳引线、59 馆朱印和坐标回读均通过；本地 84 项无头检查、线上 80 项检查及 13/13 资源哈希一致。
- 主域名已更新，本次部署 aa0297d9。完整报告见 `docs/audits/2026-09-15-map-geometry-optimization.md`。

## 最新：故事导览样板已上线

- 详见 `docs/audits/2026-09-15-story-pilot.md`。新增10件故事、三卷主题目录、14项文字证据、30细节、10题、12关联跳转；10条旧摘要已实质修正。不是全191件完成。
- 独立URL层 `guide/trail/story` 保留原筛选与artifact参数；StoryExperience按路由key重挂载，同步恢复sessionStorage阅读及展开状态；MuseumDetail按馆/文物保存详情位置，退出层恢复，焦点preventScroll。
- ArtifactScrollReader预留清晰度提示、控制与页脚空间防慢加载跳动；AI scroll不进原作阅卷台。既有图片隔离与授权边界不解除，本批新增图/替换/授权确认均0。
- 数据23、本地无头53、生产无头53通过，完整结果在 `docs/audits/story-browser/`。最终部署96b565ba，主域名主包 `index-B3zpj_pT.js` 与2个故事资源哈希一致。
- 测试需串行；旧e2e-browser默认生产，新e2e-stories默认localhost，务必明确HUAXIA_E2E_URL。通过HUAXIA_E2E_OUTPUT区分旧回归结果目录。不调用Computer Use，不重试受阻原图。
- 剩余：171件尚无分层故事样板，铜凤灯逐件编号待核、2幅高清原卷未接入、全库6件旧图隔离、真机Safari及亲子学习效果未测。

## 最新收尾（优先于下方历史记录）

- 见 `docs/audits/2026-09-15-round3-closeout.md`：实际替换浙江剑 1 件，CC0 原件 1 个、同源展示图 2 张；其余 6 件继续隔离，2 幅高清长卷未替换。
- 用户允许跳过无法运行/下载的项目，不要再次无休止重试或要求必须上传原件。
- 原件及双哈希在 `assets/source-originals/`、`assets/provenance/zj-yzj-verified-processing.json`；退役图不得回退或重新发布。
- 数据测试 15/15、本地无头桌面手机 25/25、构建及定向 lint 通过；线上结果以收尾报告为准。

## 最新补充：第三轮图像来源与授权

以下旧记录仅供历史参考，已由后续 URL 筛选与无头验收工作取代。最新结果见 docs/audits/2026-09-15-artifact-provenance-round-3.md、round3-register.json、round3-progress.md。

- 58 件优先队列：来源详情 43 + scroll 23，重叠 8。
- 37 个来源记录页面核读、34 份逐文件许可声明；本地资产授权 verified 仍为 0，来源图 pending 42 / restricted 1。
- 4 处来源馆藏错配 + 3 处疑点共 7 件 imageHold；禁止主备图展示。长信宫灯来源图受限，详情使用明确标识的既有 AI 示意图。
- 高分辨率全卷候选已找到，下载失败，实际新图片替换 0。禁止后续声称已替换。
- 普通 npm run build 自动排除 15 张争议/受限图的 dist 副本，public 原件保留作为证据。P1/P2 脚本不得覆盖 sourceReview。
- 数据测试 14 项；无头桌面/手机及故障注入 23 项。最终发布与线上测试以 round3-progress.md 为准。
- 不调用 Computer Use，使用本地无头 Edge/CDP。维持二维卷轴风格。

---

## 以下为历史交接

站点：https://huaxia-museum-atlas.pages.dev/

## 本轮完成

- 首页朝代、类别控制全国馆藏结果；地图所选省份不自动限制全国检索。
- 结果中显式选择地域后，按朝代、类别、地域取交集；卡片标出省份、城市和收藏馆。
- 馆内筛选与全国筛选分别保存；从结果进入详情时继承朝代和类别，关闭详情返回原结果。
- 结果组件在详情打开时保留挂载，避免主动丢弃列表状态。
- 空结果可扩大到全国或取消类别；文案明确统计的是本站已收录馆藏。

关键文件：`src/App.tsx`、`src/components/CollectionResults.tsx`、`src/data/collection.ts`。

## 验证与边界

- `node --experimental-strip-types --test scripts/collection.test.mjs`：4 项数据测试通过。
- `node node_modules/eslint/bin/eslint.js src`：通过。
- `npm run build`：通过。
- 已发布 Cloudflare Pages 部署 `99b304e0`。
- 浏览器控制连接失败，尚未完成这轮真实页面点击及手机端验收；不能把构建和数据测试说成 UI 验证。
- 全国筛选保存在当前页面会话内，刷新或分享 URL 尚不恢复筛选；文物详情仍沿用原来的 URL 导航。

## 后续优先顺序

1. 实际验收首页选朝代、类别组合、地域切换、空结果、打开/关闭详情、浏览器后退及手机滚动。
2. 将全国筛选写入 URL，并验证刷新、分享、浏览器前进后退的一致性。
3. 改进窄屏筛选区域与地图放大定位，再继续图片来源和资产完整性工作。

保持二维卷轴风格，不重新添加用户已要求删除的山江简笔画。不要把“AI 示意图”标为文物实拍。普通开发使用 Codex 本地工具，不调用 Claude Code。

模型使用建议：复杂导航和产品逻辑用 Astra / High，日常实现用 Sol / High，边界明确的批量整理用 Luna / Medium；这是项目任务分工建议，不是额度消耗保证。
