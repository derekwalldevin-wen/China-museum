# 用户高清《清明上河图》接入与首页发布

发布完成：2026-09-16。

- 生产站点：https://huaxia-museum-atlas.pages.dev/
- 本次部署：https://fd7bd40c.huaxia-museum-atlas.pages.dev/
- 发布包含当前山水首页、Three.js 墨卷开场、首页精修与本次图片替换。

## 原件与展示范围

用户目录包含8个JPEG，共481,042,470字节。编号为1、2、4、5、7、8、9、10；未提供3、6。已记录所有文件SHA-256及尺寸，见 `assets/user-qingming/source-inventory.json`。没有从文件名推定下载来源或许可。

目视总览显示1、2、4、5以题跋为主，7—10含连续画心。7/8、8/9、9/10三处接缝已通过独立边界预览核对，见 `assets/user-qingming/seams.jpg`。本次发布画心浏览版，保留少量装裱边缘，不宣称包含完整题跋或完整装裱。

原始文件未修改、未上传。使用JPEG解码降采样、等比Lanczos缩小、原顺序边缘拼接；第10段取左侧19000像素以内。没有补缝、镜像、调色、锐化或AI补绘。

## 实际替换

1件文物、2个展示角色：

| 角色 | 新文件 | 像素 | JPEG字节 | 常用WebP字节 |
| --- | --- | --- | --- | --- |
| 卡片 | `gg-qmsh-hongqiao-card.jpg` | 960×737 | 236,179 | 400px：10,414 |
| 阅卷台 | `gg-qmsh-reading.jpg` | 16000×770 | 3,990,673 | 同像素：2,951,844 |

卡片裁自第8段虹桥，与详情同源。旧AI卡片及900×42低清缩图已退出活动选图和发布包，历史资产保留在本地。卡片失败时仍可使用同源画心回退，WebP失败可回退同一JPEG。

四份输入哈希、卡片裁切框、拼接各段位置、输出哈希和处理步骤公开在 `/data/image-processing/gg-qmsh-user-2026-09-16.json`，详情页提供入口。原始图像登记快照保留于 `assets/user-qingming/images-before-import.json`。

## 授权结论

本次新增授权确认：0。两张角色图均为 `source`，授权及文件出处继续 `pending`。用户文件没有附带来源页与许可证，因此不填写未经核验的 `sourceUrl`、`license`、`licenseUrl`、`verifiedAt` 或 `linkCheckedAt`；旧Commons许可没有迁移到新文件。用户提供影像不等于公开许可证据。

活动第三轮登记已指向新文件和新哈希；旧登记快照保留于 `assets/user-qingming/round3-register-before-import.json`。

## 验证与发布

- 生产构建成功；63项数据、索引、溯源、派生文件与预算测试通过。
- 本地及线上桌面/390px手机交互验收各25项通过：组合筛选、刷新、分享、前进后退、详情返回、长卷键盘/触控及来源披露。
- 本地故事验收48项通过，覆盖20件故事、六条游线和阅读位置恢复。
- 本地及线上图片调度各7项通过，包含弱网、快速滚动、返回和失败回退。
- 线上地图7项通过：桌面及手机全部34省命中，港澳引线、博物馆朱印及北京经纬回读正常。
- 390px馆内首屏仍为2张图片；字节数由37,140降至27,750，减少9,390字节（约25.3%）。
- 主站及部署域名分别核对19个关键文件，共38次HTTP200与SHA-256一致检查；包括主包、CSS、开场、地图、两张新JPEG、响应式图片、溯源和处理记录。见 `responsive-images-browser/deployment.json`。

部分旧验收等待图片下载完成而非React/解码完成，或在开场过渡中点击控件；本次改为等待对应真实就绪状态。Node直连文件校验出现长时间停滞后，使用同机无头Edge完成同源抓取和SHA-256校验。未使用Computer Use。

证据：`user-qingming/local/results.json`、`user-qingming/production/results.json`、`image-scheduling-browser/production/results.json`、`map-browser/production/results.json`、`story-browser/local/results.json`。

## 剩余边界

网页长卷是缩小后的浏览副本，不提供原生十余万像素画心的无限放大。约2.95MB详情图在很弱网络仍需等待，后续可做分片按需加载。没有低端安卓真机结果；本次手机检查为无头浏览器模拟。来源页和数字文件许可仍需外部证据补齐。
