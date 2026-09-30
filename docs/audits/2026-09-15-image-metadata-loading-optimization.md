# 图片元数据安全清单与按馆溯源分块验收 · 2026-09-15

## 结论

191件文物卡片不再携带全库完整图片溯源。`images.json`继续作为唯一权威源；构建期派生25,242 B安全卡片清单及59个按馆完整溯源JSON。展厅卡片只使用已解析的 `src/kind/fit/fallback` 与hold布尔值；打开详情时才获取当前馆的provenance、授权、审核、来源链接、哈希及处理链。

图片选择、旧图回退、6件隔离、restricted阻断、AI标识和23件长卷card/detail机制均未改变。二维卷轴、59馆轻索引、全国组合筛选、URL/阅读位置恢复、20件故事及地图精度分级未改动。

## 包体变化

| 项目 | 优化前 | 优化后 | 变化 |
|---|---:|---:|---:|
| `images.json`权威源 | 178,378 B/gzip 19,685 B | 保留，不进入生产JS | 内容未改 |
| ArtifactArt共享块 | 143,427 B/gzip 22,039 B | 32,680 B/gzip 5,343 B | -77.21% / -75.76% |
| 卡片相关延迟JS合计 | 161,591 B/gzip 27,307 B | 55,344 B/gzip 11,974 B | -65.75% / -56.15% |
| 入口JS | 317,376 B/gzip 100,983 B | 317,376 B/gzip 100,983 B | 不变 |
| 安全卡片清单源 | 无 | 25,242 B | 191条、无完整溯源字段 |
| 按馆完整溯源 | 单一全库块 | 59个JSON、合计160,339 B | 最大三星堆12,154 B/gzip 2,605 B |

HTML不预载按馆溯源；生产JS不含浙江剑原始SHA-256及完整证据备注。浏览所有59馆时分文件gzip合计约48,041 B，高于单大文件gzip，这是按馆隔离带来的压缩开销；日常打开单馆详情只请求一个约0.5–2.6 kB gzip的小文件。

## 数据与失败安全

- `scripts/generate-image-data.mjs`绑定 `images.json` SHA-256，校验191文物与59馆归属，生成安全清单、59馆payload和逐文件哈希报告。
- 安全清单禁止credit、provenance、review、sourceReview、retiredAssets、sourceUrl、licenseUrl、authorizationStatus、assetSha256、evidenceNote和processingManifest。
- 详情按馆fetch并缓存成功结果；失败Promise从缓存移除。失败时保留当前URL、筛选和安全卡片预览，明确不据预览补写来源结论，并提供原位重试。
- 完整payload逐件深比较等于原记录；23件scroll的card/detail解析完全一致。《清明上河图》仍是AI卡片＋来源详情，来源授权继续pending。

## 验证

- TypeScript、相关源码/脚本ESLint：通过。
- 静态、数据、图片边界及包体测试：51/51。
- 图片资产审计：59馆、191件、191映射；缺映射、缺文件、损坏、孤立映射均为0；原有6件hold、41个pending、2个verified和1个restricted来源变体未改变。
- 本地无头Edge：图片5、数据4、地图7、筛选详情25、故事48、弱网/失败6，共95项通过。
- 线上主域：图片5、数据4、地图7、筛选详情25、故事48，共89项通过。
- 生产资源：133个HTML/JS/CSS/JSON逐项HTTP读取并核对SHA-256，133/133一致；59馆溯源59/59一致。

## 发布与剩余风险

- 主站：`https://huaxia-museum-atlas.pages.dev/`
- 不可变部署：`https://1a9aab02.huaxia-museum-atlas.pages.dev/`

剩余风险：首次打开某馆详情会增加一个小JSON往返；连续查看59馆时小文件压缩总量高于原单文件，但不会一次下载。完整溯源属于公开静态资料，本次“安全清单”是加载和展示边界，不是保密机制。尚未人工验收真机Safari、折叠屏、超大字体及极端代理缓存。
