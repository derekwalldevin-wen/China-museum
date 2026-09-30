# 青铜器四件故事扩写与证据边界（2026-09-26）

本批在201件既有藏品中扩写4件：后母戊鼎、四羊方尊、大克鼎、晋侯鸟尊。每件含4章故事、3条细节、亲子思考题、证据不足处及2条带比较理由的跨文物跳转；新增9条可点击文字来源。完整故事现为31/201件，六条原有游线20站不变。没有新增或替换任何图片，也未改变图片的AI、授权、待核和隔离状态。

## 逐件判断

| 藏品 | 直接材料 | 改正与明确的未知 |
| --- | --- | --- |
| 后母戊鼎 | [国博逐件页](https://www.chnmuseum.cn/zp/zpml/kgfjp/202008/t20200824_247255.shtml)、[国博专题](https://www.chnmuseum.cn/portals/0/web/zt/100n/guobao_content-4.html) | 832.84千克、身足整体/双耳后铸为馆藏记录；工匠人数是推算。1939与1946年为馆方后述，未核到原始现场及修复档案。 |
| 四羊方尊 | [国博逐件页](https://www.chnmuseum.cn/zp/zpml/kgfjp/202108/t20210806_250991.shtml)、[国博专题](https://www.chnmuseum.cn/Portals/0/web/zt/100n/guobao_content-8.html) | 先铸羊角龙头再接铸、战时碎裂与1952年修复分别写明；未见修复日志、残片编号与材料表。 |
| 大克鼎 | [上博数字馆藏](https://www.shanghaimuseum.net/mu/frontend/pg/article/id/CI00000656)、[上博研究专题](https://www.shanghaimuseum.net/mu/asset2/20151104094055028/)、[潘达于馆方追思](https://www.shanghaimuseum.net/mu/frontend/pg/article/id/I00000824) | 1890年出土旧说被馆方研究修正为“清光绪中期”；潘达于护藏与1951年捐赠不是器物修复记录。专题引用的日记原稿未在线逐页核读。 |
| 晋侯鸟尊 | [北大遗址综述](https://archaeology.pku.edu.cn/info/1030/3486.htm)、[光明日报采访（央视网转载）](https://news.cctv.cn/2025/06/12/ARTIQ427GCr2FxztbtOOjczn250612.shtml) | M114、九字铭文和后找到的象鼻残片据受访报道；燮父身份是多证据研究解释，不是铭文直书。未核M114完整报告与单件修复档案。 |

## 验证

- 数据生成后 `node --test scripts/*.test.mjs`：76/76通过，含31件索引/摘要一致、86条来源唯一性、逐章来源及图片边界。
- `npm run build`：成功。首页入口325.31 kB/gzip103.96 kB；故事按需分块178.10 kB/gzip66.43 kB。受限沙箱最初阻止Vite读取配置父目录，经授权重跑成功。
- 本地生产预览：独立无头浏览器在1440px桌面和390px手机各检查4件直达、四章/三细节、筛选不丢、横向无溢出；后母戊鼎→四羊方尊关联跳转与浏览器返回、阅读位置恢复通过，共10项。截图 `docs/audits/story-browser/local/desktop-bronze-batch4.png` 与 `mobile-bronze-batch4.png`。
- 全量长程浏览器脚本在打开新故事期间发生一次CDP调试通道超时；隔离新浏览器配置后短程复测通过。未把未完成的长程脚本标成通过。
- 本轮未发布线上。图片授权和文字引证是两种不同证据，任何馆方文字链接都不自动授权图片。
