# 本批10件新增文物：逐件影像核验与本地验收

核验日期：2026-09-22。范围仅为本批10件；未发布线上。

## 结论

10件均已逐项审查。5件接入开放许可摄影图，5件继续保留“真品图待补”；未生成AI图，未改变原有191件的图片记录、选图及隔离规则。

接入图片来自Wikimedia Commons摄影者，不是从博物馆官网复制的官方摄影图。馆方资料用于核实藏品身份，摄影者的许可用于判断图像复用。许可确认基于文件页/API声明、原件哈希绑定和具体藏品比对，不代表获得博物馆另行背书。

|藏品|结论|证据与边界|
|---|---|---|
|成化款斗彩鸡缸杯|继续待图|候选有CC BY-SA 4.0，但同类杯不止一件，无法凭器型和标题锁定到具体馆藏记录；未接入。|
|汝窑淡天青釉弦纹三足樽式炉|继续待图|未取得精确匹配的开放许可照片；本轮馆方页面连接超时，未声称已完成新的图片授权核读。|
|鹳鱼石斧图彩绘陶缸|已替换|Augustokremo，CC BY-SA 4.0；鹳鱼石斧纹饰、器耳和器身比对一致。采用08764正面图，不用08766背面图。|
|彩绘雁鱼青铜釭灯|已替换|Gary Todd，CC0；雁衔鱼结构、彩绘鳞纹和彩点、灯盘及把手匹配。官网与候选拍摄侧面不同。|
|船形彩陶壶|已替换|Editor at Large，CC BY-SA 2.5；双系耳、网格彩带和剥落位置匹配。已披露上传者此前旋转、裁切、清理记录；本站未再裁切或修复。|
|子仲姜盘|已替换|Alexey Yakovlev，CC0；双耳、沿口角兽、盘内动物布局与锈斑匹配。Commons文字中的年代、尺寸和铭文信息有误，未采纳；馆方事实优先。|
|朱克柔缂丝《莲塘乳鸭图》|继续待图|候选只有PD-Art声明，尚未完成对本站使用场景的适用性核验，无摄影者独立开放许可；不据古代作品年代直接确认数字影像授权。|
|唐越窑划花卉海棠杯|继续待图|官方藏品图可比对，未找到明确开放许可。|
|云纹铜禁|已替换|Gary Todd，CC0；中央素面、外围透空云纹、伏兽及支撑结构与馆方图一致。|
|葡萄花鸟纹银香囊|继续待图|官方藏品记录可比对，但未取得明确许可；未以其他香囊或复制品代替。|

许可数量：CC0 3件、CC BY-SA 4.0 1件、CC BY-SA 2.5 1件。其余5件不计入授权确认。

## 逐件来源

- 鸡缸杯：[故宫资料](https://intl.dpm.org.cn/Ceramicsis/852.html)；候选及不接入理由存于审查记录。
- 汝窑炉：[故宫资料](https://www.dpm.org.cn/collection/ceramic/226752.html)（本轮连接超时）。
- 鹳鱼石斧图陶缸：[国博资料](https://www.chnmuseum.cn/zp/zpml/kgfjp/202008/t20200824_247232.shtml)、[摄影原件与许可](https://commons.wikimedia.org/wiki/File:%E9%B9%B3%E9%B1%BC%E7%9F%B3%E6%96%A7%E5%9B%BE%E5%BD%A9%E7%BB%98%E9%99%B6%E7%BC%B808764.jpg)。
- 雁鱼灯：[国博资料](https://www.chnmuseum.cn/zp/zpml/kgfjp/202008/t20200824_247233.shtml)、[摄影原件与许可](https://commons.wikimedia.org/wiki/File:Western_Han_Bronze_Goose-shaped_Lamp_-_a.jpg)。
- 船形壶：[国博资料](https://www.chnmuseum.cn/zp/zpml/kgfjp/202008/t20200824_247229.shtml)、[摄影原件与许可](https://commons.wikimedia.org/wiki/File:CMOC_Treasures_of_Ancient_China_exhibit_-_boat-shaped_pot.jpg)。
- 子仲姜盘：[上博资料](https://www.shanghaimuseum.net/mu/frontend/pg/article/id/CI00000699)、[摄影原件与许可](https://commons.wikimedia.org/wiki/File:Zi_Zhong_Jiang_pan_bronzeware.jpg)。
- 莲塘乳鸭图：[上博资料](https://www.shanghaimuseum.net/mu/frontend/pg/article/id/E00004147)。
- 海棠杯：[宁波博物馆资料](https://www.nbmuseum.cn/art/2026/1/21/art_20384_8871.html)。
- 云纹铜禁：[河南博物院资料](https://www.chnmus.net/ch/collection/treasure/details.html?id=508168229516397923)、[摄影原件与许可](https://commons.wikimedia.org/wiki/File:Spring_%26_Autumn_Bronze_Jin.jpg)。
- 银香囊：[陕历博资料](https://www.sxhm.com/collections/detail/9948)。

## 处理与实现

- 原始下载及API响应保留在`assets/provenance/collection-image-review-2026-09-22/`。所有采用原件的SHA-1均与Commons公布值相同，另记录SHA-256。
- 增量生成器`admit-collection-images.py`只处理人工审核通过的5件，保留所有旧文件。网页JPEG最大宽1600px；卡片WebP宽240/400/640/960，详情宽480/800/1200/1600。共5张JPEG、40张WebP，无放大、本站裁切、AI补绘或虚构细节。
- 原件不覆盖；网站展示的是等比缩小版本，不宣称全像素原件。每件处理清单公开原件URL、原始/展示/派生哈希、尺寸、许可及操作；BY-SA派生沿用相同许可。
- 详情披露摄影者、影像标题、来源页、许可、核读日期、匹配说明、处理记录和馆方资料。图库选图采用contain，保持照片完整。
- 全库仍为201件、59馆；5件待图、6件既有隔离；响应式影像覆盖190件、244个输入资产、1273张派生。

## 验证结果

- `npm run build`成功。入口JS仍为324.39KB，未增加主包预算。原有开场动态分块510.07KB的Vite提示仍在，不属于本批变更。
- `node --test scripts/*.test.mjs`：66/66通过。涵盖逐件许可/原始哈希/展示与派生处理链、原有191件不变、全部201件索引/选图、地图、故事及URL筛选。
- `e2e-collection-additions.mjs`：1440px桌面与390px手机，各10件详情路由通过。图片解码、完整显示、来源/许可/处理记录链接、5件待图、横向溢出检查通过；无运行时异常及意外网络失败。
- `e2e-collection-image-review.mjs`：6项通过。正常和模拟弱网390px故宫馆内首屏均为2张卡片图、27,750字节。弱网配置：300ms延迟、100KiB/s下载、CPU 4倍降速，不是真机测试。
- 新增下部卡片快速滚动加载、详情打开、前进后退与列表位置恢复通过；阻断WebP时退回同一JPEG，JPEG一并失败时安全退回示意，不冒充已加载照片。
- 桌面子仲姜盘、手机鹳鱼石斧图详情截图已人工视觉检查。全部12张截图在`docs/audits/collection-image-review-browser/local/`，请求和交互记录在同目录`results.json`。
- 延迟卡片清单145,824→149,221字节，仍在150KB预算内；59馆完整溯源合计258,262→283,898字节（+25,636字节），仅调整此非首屏预算至285KB。ResponsiveArtifactImage分块114.54KB，仍在115KB预算内。

## 剩余风险及下一步

5件待图不应被统计为已有真品照片；鸡缸杯需要确切馆藏绑定，莲塘乳鸭图需要进一步权利适用性确认，其余3件需合适的许可影像。开放许可核验基于公开声明，不替代法务意见。照片保留现场照明与展陈背景，未为风格统一修改器物细节。

本地验收完成，线上未更新。后续如确认发布，仅需沿用现有部署流程及线上冒烟验收，不必重新生成图片。推荐Sol Medium / Medium执行该明确流程。
