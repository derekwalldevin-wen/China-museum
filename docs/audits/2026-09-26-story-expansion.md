# 故事扩展第一批本地审计（2026-09-26）

## 范围与结果

- 201件既有藏品中，分层故事由20件增至27件；新增7件分别为故宫鸡缸杯、汝窑三足樽式炉，国博鹳鱼石斧图陶缸、雁鱼釭灯、船形陶壶，首博堇鼎、伯矩鬲。
- 新增10条文字证据链接，7篇均有四段故事、三项细节、亲子问答、不确定性与两条带理由的比较跳转。六条既有主题游线及其20站不变；新增篇章在“继续发现”目录独立可达。
- 首博堇鼎与伯矩鬲旧短摘要分别删除单件“坐实”与“七个立体牛首”的失准措辞。图像台账、选图、许可、AI标识和隔离规则没有修改。

## 证据边界

- 故宫鸡缸杯的逐件页与院刊御窑址残片研究分开引用；窑址残片不冒充故宫杯的出土记录。[逐件页](https://intl.dpm.org.cn/Ceramicsis/852.html)｜[院刊论文](https://img.dpm.org.cn/Uploads/File/2018/06/01/u5b1122eb882ec.pdf)
- 汝窑炉从[故宫逐件页](https://www.dpm.org.cn/collection/ceramic/226752.html)核馆藏号、弦纹与支钉；同页供御年数存在不同口径，不写成确定数字。
- 两件彩陶的出土地与年份来自[国博古代中国展品目录](https://www.chnmuseum.cn/portals/0/web/zt/gudai/detail1.html)；它不提供完整发掘记录。雁鱼灯[逐件页](https://www.chnmuseum.cn/zp/zpml/kgfjp/202008/t20200824_247233.shtml)没有本件墓号，不挪用同类灯的发现史。
- 堇鼎[逐件页](https://www.capitalmuseum.org.cn/collection/96e22dcba9ca4c52943ad07d2611bf96)与伯矩鬲[逐件页](https://www.capitalmuseum.org.cn/collection/d49fbc66d3094c1ab54b5d533954c2c3)明确是Ⅱ区253号与251号两座不同墓；对遗址的判断还参考[北京大学考古概述](https://archaeology.pku.edu.cn/info/1030/3485.htm)。
- 本批尚未找到七件的逐件原始保护档案或完整发掘报告全文。缺口在故事中逐件标注；文字引用不代表图片授权。

## 本地验证

- `npm run generate:data`：59馆、201件，生成59馆懒加载载荷与201条搜索记录。
- `node --test scripts/*.test.mjs`：75项全通过，含故事数据、URL、搜索一致性、图片授权/衍生、地图等原有边界。首次运行遇到更新权威摘要后派生数据未刷新，生成后重跑通过。
- `npm run build`：通过；入口324.96 kB / gzip103.77 kB，故事懒加载块157.54 kB / gzip58.85 kB。受限沙箱内Vite权限错误，授权环境重跑成功。
- 本地预览`http://127.0.0.1:4174/`：桌面1440px与手机390px无头浏览器76项通过；覆盖七件独立URL、目录入口、首博互链与后退、原六条游线、筛选参数、刷新及阅读位置恢复。[结果](story-browser/local/results.json)；截图含`desktop-directory.png`、`mobile-directory.png`、`desktop-standalone.png`和`mobile-standalone.png`。
- 未部署线上。长线目标仍有174件现有藏品需分层故事，另需核实并扩充约99件藏品及相应图像，再做全站发布验收。
