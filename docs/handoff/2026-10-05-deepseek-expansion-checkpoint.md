# 华夏博物志交接检查点：第三批未完成

日期：2026-10-05（Asia/Shanghai）。这是实际状态交接，不是第三批45件完工报告。

后续更新：第三批现已完成。本文保留早期298件检查点，不代表最终状态；请改读 `2026-10-05-deepseek-tranche-04.md` 和对应阶段04验收报告，最终343件/63馆。

## 项目位置与当前状态

- 项目根目录：`C:\Users\derek\Documents\kimi\Workspaces\博物馆\museum-atlas`。
- 当前已入库：298件文物、61馆、218篇完整故事，来自当前 museum-index.json 与 story-catalog.json，不含候选。
- 已完成扩容75件：首批30件分 tranche-01（10件）和 tranche-02（20件）交付；第二批45件为 tranche-03。
- 用户所说的第三批45件对应 tranche-04，尚未完成，不能把 tranche-03 当作第三批成果。
- 第三批仅已保存 `assets/expansion/baseline-298.json`、建立 `scripts/research-expansion-tranche04.mjs` 并调查中国丝绸博物馆、长沙简牍博物馆、苏州博物馆的官方目录。目录调查不等于逐件核验或入库。
- 尚无 tranche-04 的 reviewed、admission、processing、ai-generation 文件与写作包；没有第三批新增配图、入库和验收回执。目前不能交接这45件进行正文扩写。
- 本轮未发布线上。第四批必须等待用户确认后才开始，不默认续做。

## DeepSeek现在可以使用的内容

以下75件已正式入库，有短摘要、独立AI图、官方记录和逐件写作资料，可先补全文字；先检查现有故事ID，避免覆盖或重复已有完整故事。

| 已完成阶段 | 文物数量 | 写作包 |
| --- | ---: | --- |
| 首批前10件 | 10 | `docs/handoff/expansion-600/tranche-01-writing-pack.json` |
| 首批剩余20件 | 20 | `docs/handoff/expansion-600/tranche-02-writing-pack.json` |
| 第二批45件 | 45 | `docs/handoff/expansion-600/tranche-03-writing-pack.json` |

逐件证据入口：`assets/expansion/reviewed-tranche-01/02/03.json`（分别三个实际文件）、`admission-tranche-01/02/03.csv`、`assets/expansion/evidence/` 中的HTML及元数据。图片原件和处理链：`assets/expansion/originals/tranche-01/02/03/`、`processing-tranche-01/02/03.json`。总说明：`docs/handoff/expansion-600/README.md`。

第二批45件组成：成都15、深圳23、国博7；重点为陶俑、石器、钱币、铸范、照明、文房和温酒器具。新增照片再使用授权确认数量为0，45张均是AI概括示意，不是馆藏照片。5项证据不足候选单独保留，不能补写后直接入库。

## 写作要求与修改范围

1. 保持已有文物ID、名称、收藏归属和事实摘要的限定；每个段落绑定直接支持其内容的来源。补读新资料时记录直接URL、日期和支持范围。
2. 区分器物事实、研究解释、当代阐释。人物、工序、发现、保护史未核即写未知，不按同类器物或AI图补造。
3. 关联跳转说明比较什么、为什么关联；不得暗示未经证明的直接传承。现有故事生成器要求 related 对象存在完整故事，不把写作包候选比较ID不经检查直接塞入 related。
4. 特别注意：石拍官网出土地冲突；国宝金匮“传1921年出土”；明代玉竹节笔筒不可改清。首批蓝地牡丹织金缎断代冲突、经穴漆人经脉数量冲突仍须保留。
5. 修改故事源数据 `src/data/stories*.json`，参照现有schema和逐段引用方式。故事生成器会发现命名合规的新批次，但 `src/data/stories.ts` 与现有测试的静态聚合也需要一致接入；先读实际实现，不只修改派生文件。
6. 不直接修改 story-catalog、story-payloads、museum-index、按馆图片清单等生成结果；使用既有生成流程。不要把全文、图片溯源或全部馆藏搬回入口主包。
7. 不修改 `src/data/images.json`、AI标识、照片许可、隔离、选图和长卷机制；不更换图片。不得把AI示意标为实拍或历史精确复原。
8. 保留二维卷轴、省界点击、港澳触控、组合筛选、URL与阅读位置恢复，以及390px馆内首屏2张文物图请求。入口静态JS预算328,000B不提高。

## 已有验收与后续验证

最新已完成扩容验收为2026-10-04第二批记录：189项测试、生产构建、133项本地桌面/390px无头检查通过；入口314,271B；故宫首屏2图20,010B，深圳2图13,402B。不是第三批验收，也不是2026-10-05重新执行的结果。

报告：`docs/audits/2026-10-04-expansion-600-tranche-03.md` 与同名 `-progress.json`。手机为无头模拟，真机及Safari未验。

正文修改完成后，在项目根目录运行：

```powershell
New-Item -ItemType Directory -Force .tmp/build-temp | Out-Null
$env:TEMP=(Resolve-Path .tmp/build-temp).Path
$env:TMP=$env:TEMP
npm run build
node --test scripts/*.test.mjs
$env:HUAXIA_E2E_URL='http://127.0.0.1:4180/'
node scripts/e2e-browser.mjs
node scripts/e2e-map.mjs
node scripts/e2e-image-scheduling.mjs
```

浏览器脚本依赖本地生产预览4180与隔离无头Edge CDP9223；先检查服务，不使用Computer Use。构建完成后串行验收，不在改写dist时导航。根据故事修改范围补充相应故事测试，不把基础冒烟当作全文逐件验收。没有用户批准不要部署。

## 可复制给DeepSeek的指令

> 请先阅读 docs/handoff/2026-10-05-deepseek-expansion-checkpoint.md。第三批45件尚未入库，不要把目录候选当成现有藏品。先基于 tranche-01、02、03-writing-pack.json，为已入库但缺完整故事的新增文物补充分层故事、细节、亲子思考题和带理由的关联跳转；每段绑定直接来源，未知保持未知，不从AI图取证。保持文物ID、图片溯源、AI标识、二维卷轴、URL及阅读位置恢复与328KB入口预算。完成测试、构建及本地桌面手机验收，不发布，不进行新的藏品扩容；汇报实际新增完整故事数量。

第三批完成后应另交付真正的 tranche-04 写作包与验收报告，不能将本文改标题后充当完工交接。第四批仅在用户确认后启动。
