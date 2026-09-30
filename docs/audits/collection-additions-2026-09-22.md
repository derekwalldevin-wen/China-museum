# 馆藏扩充第一批：10 件馆方文字核读条目

核读日期：2026-09-22。由 191 件增至 201 件，仍为 59 馆；这批覆盖 6 馆、5 个省级地区。馆方页面用来确认器物身份、时代、馆藏与可核实的故事细节，**不构成图片转载许可**。本批没有接入馆方照片、AI 复原图或高清长卷；卡片与详情均显示统一示意线刻和“真品图待补”，详情另给馆方资料链接。

| ID | 馆藏 | 核读来源 | 边界 |
| --- | --- | --- | --- |
| gg-jgb | 成化款斗彩鸡缸杯·故宫博物院 | [故宫馆藏](https://intl.dpm.org.cn/Ceramicsis/852.html) | 款识与斗彩工艺据馆方；不以题材判真伪 |
| gg-ryzl | 汝窑淡天青釉弦纹三足樽式炉·故宫博物院 | [故宫馆藏](https://www.dpm.org.cn/collection/ceramic/226752.html) | 器形、釉色、支钉痕据馆方 |
| gb-gyts | 鹳鱼石斧图彩绘陶缸·中国国家博物馆 | [国博馆藏](https://www.chnmuseum.cn/zp/zpml/kgfjp/202008/t20200824_247232.shtml) | 不把图像寓意的学术解释写成确定史实 |
| gb-yygd | 彩绘雁鱼青铜釭灯·中国国家博物馆 | [国博馆藏](https://www.chnmuseum.cn/zp/zpml/kgfjp/202008/t20200824_247233.shtml) | 结构与排烟说明据馆方 |
| gb-cxct | 船形彩陶壶·中国国家博物馆 | [国博馆藏](https://www.chnmuseum.cn/zp/zpml/kgfjp/202008/t20200824_247229.shtml) | 不推断具体使用者或航行用途 |
| sh-zzjp | 子仲姜盘·上海博物馆 | [上博馆藏](https://www.shanghaimuseum.net/mu/frontend/pg/article/id/CI00000699) | 可转动动物与铭文据馆方 |
| sh-ltry | 朱克柔缂丝《莲塘乳鸭图》·上海博物馆 | [上博馆藏](https://www.shanghaimuseum.net/mu/frontend/pg/article/id/E00004147) | 不推断当前展出状态 |
| nb-htb | 唐越窑划花卉海棠杯·宁波博物院 | [宁波博物院馆藏](https://www.nbmuseum.cn/art/2026/1/21/art_20384_8871.html) | 中亚影响是可能的研究解释，非这件器物进口的证据 |
| hn-ywtj | 云纹铜禁·河南博物院 | [河南博物院馆藏](https://www.chnmus.net/ch/collection/treasure/details.html?id=508168229516397923) | 将修复过程与原始器物区分 |
| sxl-ptxn | 葡萄花鸟纹银香囊·陕西历史博物馆 | [陕历博馆藏](https://www.sxhm.com/collections/detail/9948) | 未把其他香囊的机关结构移植到本件 |

后续待核：10 件可复用且与具体器物绑定的影像、许可及处理链。现有 191 件影像选择、授权标识、隔离与长卷双图未修改。

## 本地验收

- `node --test scripts/*.test.mjs`：64/64 通过，覆盖新增索引、筛选、图片空值边界、按馆完整溯源和原有长卷机制。
- `npm run build`：通过；搜索语料延迟块 46.55 KB（新增前预算 45 KB，现按内容增量设 48 KB 上限），入口 JS 324.39 KB，未越过 325 KB 预算。
- `node scripts/e2e-collection-additions.mjs`：桌面 1440px 与手机 390px，各对 10 件直达详情进行无头验收；馆方资料链接、示意标签、无误接真品照片、无横向溢出均通过；浏览器无脚本及网络错误。
- 本次只更新本地代码及本地构建，未发布线上。
