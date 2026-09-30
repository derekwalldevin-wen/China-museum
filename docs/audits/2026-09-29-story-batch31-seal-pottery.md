# 第三十一批：东汉铜印与大地湾人头瓶

2026-09-29，本地内容修订；未发布线上。现有59馆、206件文物，完整分层故事由112增至114篇，文字来源由332增至339条；六条既有主题游线不变。新增两篇各四章、四张细节卡、一则亲子提问、两条跨文物比较，逐段绑定资料。

## 逐件证据与改动

| 藏品 | 能确认 | 解释及待核 | 改动 |
| --- | --- | --- | --- |
| `qh-gyq` 东汉“汉匈奴归义亲汉长”青铜印 | [国博逐件馆藏卡](https://www.chnmuseum.cn/zp/zpml/kgfjp/202110/t20211028_251956.shtml)证明国博馆藏、驼钮和八字阴刻；[国博展品目录](https://www.chnmuseum.cn/portals/0/web/zt/gudai/detail4.html)记尺寸及1979大通出土 | [地方转载回顾](https://www.guinan.gov.cn/zjgn/lsgk/content_1013648761)记1973乙M1，与国博年份相冲突；[2024正式研究的机构库摘要](https://ir.pku.edu.cn/handle/20.500.11897/25/simple-search?etal=0&filter_field_1=dateIssued&filter_field_2=subject&filter_type_1=equals&filter_type_2=equals&filter_value_1=%5B2020+TO+2026%5D&filter_value_2=K878.8&filtername=subject&filterquery=0601+%E8%80%83%E5%8F%A4%E5%AD%A6%3B0603+%E4%B8%96%E7%95%8C%E5%8F%B2%3B&filtertype=equals&order=desc&query=&rpp=20&sort_by=score)提示卢水胡说仍需辨析。墓主、准确年份、铸造及保护档案未知 | 从青海省博误置条目迁至国博，保留文物ID和旧`qinghai`链接兼容；删除单印证明整个地区治理状况的越界断言 |
| `gs-rts` 仰韶人头形器口彩陶瓶 | [甘博人员采访](https://www.gswbj.gov.cn/a/2023/06/16/17519.html)和[馆方供图资料](https://gansu.gscn.com.cn/system/2022/06/08/012776050.shtml)支持甘博馆藏、1973秦安邵店大地湾、庙底沟类型、塑头/彩绘结构 | “少女”“黄河母亲”是今日形容，非古人题名；具体身份、用途、工艺检测及逐件保护工单未知。[国博2019同名展品](https://m.chnmuseum.cn/portals/0/web/zt/20190516slkd/)标大地湾博物馆藏，未证为同一件 | 删除旧文的性别、母亲与“碎花裙”定论；同名藏品不混用图片和流转史 |

馆方网页文字可以支持上述论断，但不能推定站内获准复用网页图片。`src/data/images.json` SHA-256 仍为 `33866b421aa0f6a36a9b543a39b8a9ce4ba47fe8ff8c735363dcefa22bfbda65`；未修改AI、待核、隔离与授权记录。

## 验证

- `npm run build`：通过；派生目录114篇、59馆、206件。首次在沙箱内构建因Vite读取上级路径被拒，授权环境重跑成功，非代码错误。
- `node --test scripts/*.test.mjs`：112/112通过。首次故事摘要测试发现中英文引号不一致，修正后重跑通过。
- `scripts/e2e-story-batch31.mjs`：桌面1440px及手机390px共6项场景通过，包括新篇直达、来源面板、跨文物跳转、前进后退、阅读位置和铜印旧URL。测试曾断言未支持的任意`custom`参数保留而失败；应用原有URL规范化只保留业务参数，改为断言受支持的`era`，不宣称任意参数兼容。
- 全站故事无头回归：桌面1440px与手机390px共250/250项通过，包含114篇故事、94件独立故事目录及现有六条游线、筛选/分享、相关跳转、返回阅读位置。

## 后续证据边界

优先取得《上孙家寨汉晋墓》原始报告的逐件页以辨1973/1979；取得大地湾本件发掘层位、器物编号、保护记录，并核对同名瓶的逐件身份。未到手之前，不添加确定出土姿态、制作温度、使用内容、具体修复或图片许可。
