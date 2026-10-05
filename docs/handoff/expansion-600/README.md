# 华夏博物志扩容写作交接：累计新增120件

本地项目当前343件文物、63馆、218篇完整故事；新增120件摘要及独立AI示意图，其中tranche-01为10件、tranche-02为20件、tranche-03为45件、tranche-04为45件。目标600尚差257件；不要把640条目录候选当成已核藏品或已入库文物。本轮不发布线上，第四批须用户确认后启动。

第三批45件请先读取 `docs/handoff/2026-10-05-deepseek-tranche-04.md` 和本目录 `tranche-04-writing-pack.json`。新增杭州中国丝绸博物馆20件、兰州甘肃简牍博物馆20件，补充长沙简牍博物馆5件。逐件证据与图片处理文件为 `assets/expansion/{reviewed,admission,processing}-tranche-04.json`；保留官方药名、尺寸、织物材质冲突，成组不拆，AI图不作细部证据。最终验收以阶段04报告为准。

阶段03：读取本目录 `tranche-03-writing-pack.json`；对应逐件证据、入库、图片处理文件为 `assets/expansion/{reviewed,admission,processing}-tranche-03.json`，证据CSV为 `admission-tranche-03.csv`。45件含成都15、深圳23、国博7；新增钱币、铸范、陶俑、石器、照明和温酒器具。未增加完整故事，待后续扩写。石拍出土地官网记载冲突；国宝金匮保留“传1921年”限定；明代玉竹节笔筒不可改写为清代。5项断代证据不充分记录留在 `deferred-tranche-03.json`，不计入库。AI图的视觉审查不是原貌核验，铭文、纹饰与部件数量不能从图中取证。

## 文件入口

- `assets/expansion/candidate-register.csv` / `.json`：国博480条、深圳160条公开目录记录。保存直接详情URL、目录核读日期和原始页面哈希。候选还需详情核读、具体实物去重；列表相同名称或不同URL可能指同一件器物。
- `assets/expansion/reviewed-tranche-01.json`：本次10件正文核读、馆舍地址/地理点位证据、支持范围和未知项。
- `assets/expansion/admission-tranche-01.json`：实际入库及原始/卡片/详情哈希。
- `tranche-01-writing-pack.json`：可供DeepSeek扩写的逐件资料、制作/发现/研究线索及比较理由。
- `assets/expansion/originals/tranche-01/`：AI原始PNG，不是馆藏照片。
- `assets/expansion/processing-tranche-01.json`、`public/data/image-processing/expansion-tranche-01.json`：逐件提示词、原件哈希、像素尺寸、派生处理链。
- `src/data/collection-expansion.json`：新增数据唯一入口，既有ID和原文不改；摘要与参考资料按馆加载，未添加长篇故事。

## 写作约束

阶段02文件沿用`reviewed/admission/processing-tranche-02.json`、`originals/tranche-02/`及`tranche-02-writing-pack.json`；入库证据CSV为`assets/expansion/admission-tranche-02.csv`。`deferred-tranche-02.json`的3项不计入库。

新增重点：7漆器、6织绣、3简牍、4生活器具。效律60枚按一个内容组计数，与秦律十八种不同；黑夫家信来自睡虎地4号墓，法律竹简来自11号墓。蓝地牡丹织金缎官网年代字段为明、正文为清，维持明清分组和明确待核，不强选年代。经穴漆人页面内部经脉数量冲突，不能拼出精确总数；它不是现代临床穴位图。李时珍嘉靖任职不能证明其使用过万历药柜。

1. 官方URL支持范围已逐件列明。馆方谈及类型史不等于说明本件的出土地点和主人。
2. 深圳四件明确为2010年捐赠入藏；不能写成2010年考古出土，也不能把捐赠团体所在地写为产地。年代总栏与具体栏不一致时已保留说明。
3. 石犀年代跨战国晚期至汉，筛选暂放先秦，详情保留完整定年；与李冰的联系是可能性解释，不是确定结论。
4. 巴蜀图语未作为已破解文字；铜戈上的蚕形图像不等于已复原整条纺织生产链。
5. AI图仅帮助认识大概器形。历史复原核验继续pending；不能从AI图中提取铭文、纹饰、釉色或人物事实。官网展示照片许可仍unknown，未承认再使用许可。
6. 关联理由只作为后续游线策划；没有为新摘要伪造完整故事或已证实的工艺传承。比较对象ID已测试存在。

## 运行与回滚

`npm run build`会生成馆藏索引、按馆完整资料、按馆图片清单、故事分块与分享计数。JPEG/WebP离线重生使用已安装的Python/Pillow，Windows需设`HUAXIA_PYTHON`为有效解释器。

`node --test scripts/*.test.mjs`验证全部数据；`node scripts/e2e-expansion-600.mjs 02`验收新增20件，仅允许127.0.0.1。`prepare-expansion-ai.py 02`与`admit-expansion-tranche.mjs 02`支持第二批，不覆盖第一批清单和原件。验收时先完成构建，再串行运行浏览器脚本，不在改写dist期间导航。

`assets/expansion/baseline-223/`保存基线，只作回滚和对照，不修改。原有223件数据与图像登记已逐字段对照不变。本轮未部署线上；不要调用部署命令。
