# 文物图片清单体检（2026-10-01）

数据源：`src/data/images.json`（每件一条）+ `src/data/museum-index.json`（文物清单）+ 生产环境逐件实访。
图片判定口径：`variants.card.kind` 与 `variants.detail.kind`，取值 `ai`（AI 生成示意）或 `source`（真实来源图）。

## 一、总览

| 项目 | 数量 |
| --- | --- |
| 文物总数 | 206 |
| images.json 条目 | 206（无缺条目） |
| 卡片图线上可访问 | 206 / 206 |
| 详情图线上可访问 | 205 / 206 |
| **A. 完全没有 AI 图**（两变体皆为真实来源图） | **8** |
| B. 混合（详情图真实、卡片图是 AI） | 34 |
| C. 仅有 AI 图（老结构单张 + 新结构双 AI） | 164 |
| 其中 老结构（`{src, credit:"AI 生成示意", ai:true}`，卡片与详情同图） | 130 |
| 其中 新结构但两变体皆 AI | 34 |

结论：**206 件文物全部都有图**，卡片图 206/206 线上可用；详情图 205/206 可用，唯一例外是 `hb-cxd` 长信宫灯（其来源图授权状态为 `restricted`，为合规已主动不上线，页面仍有 AI 卡片）。

## 二、清单 A：完全没有 AI 生成图片的文物（8 件）

| id | 名称 | 博物馆 | 卡片/详情类型 | 授权状态（卡片/详情） | 线上（卡片/详情） |
| --- | --- | --- | --- | --- | --- |
| gg-qmsh | 《清明上河图》卷 | 故宫博物院 | source/source | pending / pending | ✓ / ✓ |
| gg-qljs | 《千里江山图》卷 | 故宫博物院 | source/source | verified / verified | ✓ / ✓ |
| gb-gyts | 鹳鱼石斧图彩绘陶缸 | 中国国家博物馆 | source/source | verified / verified | ✓ / ✓ |
| gb-yygd | 彩绘雁鱼青铜釭灯 | 中国国家博物馆 | source/source | verified / verified | ✓ / ✓ |
| gb-cxct | 船形彩陶壶 | 中国国家博物馆 | source/source | verified / verified | ✓ / ✓ |
| sh-zzjp | 子仲姜盘 | 上海博物馆 | source/source | verified / verified | ✓ / ✓ |
| zj-yzj | 战国越王者旨於睗剑 | 浙江省博物馆 | source/source | verified / verified | ✓ / ✓ |
| hn-ywtj | 云纹铜禁 | 河南博物院 | source/source | verified / verified | ✓ / ✓ |

说明：这 8 件当前两处都用**真实来源图**，其中 7 件授权已核验（verified）；`gg-qmsh`《清明上河图》为**用户提供影像**、授权仍为 `pending`。若计划为它们补 AI 示意，请注意：这是用 AI 图**替换**已可用的真实图，与"补齐缺口"性质不同。

## 三、清单 B：混合（详情真实图 + 卡片 AI 图，34 件）

| id | 名称 | 博物馆 | 卡片/详情类型 | 授权状态（卡片/详情） | 线上（卡片/详情） |
| --- | --- | --- | --- | --- | --- |
| gg-pft | 《平复帖》 | 故宫博物院 | ai/source | - / pending | ✓ / ✓ |
| gb-hmwd | 后母戊鼎 | 中国国家博物馆 | ai/source | - / pending | ✓ / ✓ |
| gb-syz | 四羊方尊 | 中国国家博物馆 | ai/source | - / pending | ✓ / ✓ |
| gb-jgs | 击鼓说唱俑 | 中国国家博物馆 | ai/source | - / pending | ✓ / ✓ |
| gb-jlfw | 孝端皇后九龙九凤冠 | 中国国家博物馆 | ai/source | - / pending | ✓ / ✓ |
| sb-qhbf | 元青花凤首扁壶 | 首都博物馆 | ai/source | - / pending | ✓ / ✓ |
| tb-xjhl | 范宽《雪景寒林图》 | 天津博物馆 | ai/source | - / pending | ✓ / ✓ |
| hb-cxd | 长信宫灯 | 河北博物院 | ai/source | - / restricted | ✓ / ✗ |
| hb-jly | 刘胜金缕玉衣 | 河北博物院 | ai/source | - / pending | ✓ / ✓ |
| nm-jgs | 战国鹰顶金冠饰 | 内蒙古博物院 | ai/source | - / pending | ✓ / ✓ |
| hlj-tzl | 金代铜坐龙 | 黑龙江省博物馆 | ai/source | - / pending | ✓ / ✓ |
| sh-dkd | 大克鼎 | 上海博物馆 | ai/source | - / pending | ✓ / ✓ |
| sh-syt | 王羲之《上虞帖》唐摹本 | 上海博物馆 | ai/source | - / pending | ✓ / ✓ |
| sh-sqf | 战国商鞅方升 | 上海博物馆 | ai/source | - / pending | ✓ / ✓ |
| sz-bz | 北宋真珠舍利宝幢 | 苏州博物馆 | ai/source | - / pending | ✓ / ✓ |
| zj-fcst | 黄公望《富春山居图·剩山图》 | 浙江省博物馆 | ai/source | - / pending | ✓ / ✓ |
| qzx-zyj | 明赵秉忠状元卷 | 青州市博物馆 | ai/source | - / pending | ✓ / ✓ |
| hn-jhg | 贾湖骨笛 | 河南博物院 | ai/source | - / pending | ✓ / ✓ |
| hn-fhxz | 商代妇好鸮尊 | 河南博物院 | ai/source | - / pending | ✓ / ✓ |
| hn-lhfh | 春秋莲鹤方壶 | 河南博物院 | ai/source | - / pending | ✓ / ✓ |
| kf-khc | 北魏孔惠超石造像 | 开封市博物馆 | ai/source | - / pending | ✓ / ✓ |
| jz-yzj | 战国越王州句剑 | 荆州博物馆 | ai/source | - / pending | ✓ / ✓ |
| hun-tbh | 西汉马王堆T形帛画 | 湖南博物院 | ai/source | - / pending | ✓ / ✓ |
| hun-ssd | 西汉直裾素纱单衣 | 湖南博物院 | ai/source | - / pending | ✓ / ✓ |
| cq-wyq | 东汉乌杨石阙 | 重庆中国三峡博物馆 | ai/source | - / pending | ✓ / ✓ |
| dz-qsg | 南宋宝顶山千手观音 | 大足石刻博物馆 | ai/source | - / pending | ✓ / ✓ |
| sxd-qs | 商代青铜神树 | 三星堆博物馆 | ai/source | - / pending | ✓ / ✓ |
| sxd-dlr | 商代青铜大立人 | 三星堆博物馆 | ai/source | - / pending | ✓ / ✓ |
| sxd-hjm | 商代黄金面具 | 三星堆博物馆 | ai/source | - / pending | ✓ / ✓ |
| sxd-zym | 商代青铜纵目面具 | 三星堆博物馆 | ai/source | - / pending | ✓ / ✓ |
| yn-jcn | 宋大理国银鎏金镶珠金翅鸟 | 云南省博物馆 | ai/source | - / pending | ✓ / ✓ |
| sxl-hzx | 西汉“皇后之玺”玉印 | 陕西历史博物馆 | ai/source | - / pending | ✓ / ✓ |
| sxl-yjb | 唐鸳鸯莲瓣纹金碗 | 陕西历史博物馆 | ai/source | - / pending | ✓ / ✓ |
| hk-jgb | 明永乐青花龙穿花纹扁瓶 | 香港故宫文化博物馆 | ai/source | - / pending | ✓ / ✓ |

## 四、清单 C：目前只有 AI 图的文物（164 件）

| id | 名称 | 博物馆 | 卡片/详情类型 | 授权状态（卡片/详情） | 线上（卡片/详情） |
| --- | --- | --- | --- | --- | --- |
| gg-jgyg | 金瓯永固杯 | 故宫博物院 | ai/ai | ai / ai | ✓ / ✓ |
| gg-gzdc | 各种釉彩大瓶 | 故宫博物院 | ai/ai | - / - | ✓ / ✓ |
| gg-jgb | 成化款斗彩鸡缸杯 | 故宫博物院 | ai/ai | ai / ai | ✓ / ✓ |
| gg-ryzl | 汝窑淡天青釉弦纹三足樽式炉 | 故宫博物院 | ai/ai | ai / ai | ✓ / ✓ |
| gb-hsyl | 红山文化C形玉龙 | 中国国家博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| yn-dwy | 西汉“滇王之印”金印 | 中国国家博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| qh-gyq | 东汉“汉匈奴归义亲汉长”铜印 | 中国国家博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| sb-jd | 堇鼎 | 首都博物馆 | ai/ai | - / - | ✓ / ✓ |
| sb-bjl | 伯矩鬲 | 首都博物馆 | ai/ai | - / - | ✓ / ✓ |
| tb-tbd | 西周太保鼎 | 天津博物馆 | ai/ai | - / - | ✓ / ✓ |
| tb-yhc | 乾隆款珐琅彩芍药雉鸡图玉壶春瓶 | 天津博物馆 | ai/ai | - / - | ✓ / ✓ |
| hb-sjfa | 错金银四龙四凤铜方案座 | 河北博物院 | ai/ai | - / - | ✓ / ✓ |
| dz-jp | 北宋定窑白釉刻花龙首净瓶 | 定州博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| dz-yzp | 东汉透雕神仙故事玉座屏 | 定州博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| dz-lgd | 东汉龙螭衔环谷纹青玉璧 | 定州博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| sx-nz | 晋侯鸟尊 | 山西博物院 | ai/ai | ai / ai | ✓ / ✓ |
| sx-hmms | 侯马盟书 | 山西博物院 | ai/ai | ai / ai | ✓ / ✓ |
| sx-qh | 北魏司马金龙墓木板漆画 | 山西博物院 | ai/ai | ai / ai | ✓ / ✓ |
| dt-lbl | 北魏蓝玻璃碗 | 大同市博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| dt-ytz | 司马金龙墓釉陶俑阵 | 大同市博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| nm-jyx | 元钧窑“小宋自造”香炉 | 内蒙古博物院 | ai/ai | ai / ai | ✓ / ✓ |
| nm-lsy | 辽三彩鸳鸯壶 | 内蒙古博物院 | ai/ai | ai / ai | ✓ / ✓ |
| lb-zfsg | 传周昉《簪花仕女图》卷 | 辽宁省博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| lb-gf | 《虢国夫人游春图》宋摹本 | 辽宁省博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| lb-yzl | 红山文化玉猪龙 | 辽宁省博物馆 | ai/ai | - / - | ✓ / ✓ |
| sy-ljy | 清太宗皇太极御用鹿角椅 | 沈阳故宫博物院 | ai/ai | ai / ai | ✓ / ✓ |
| sy-yyd | 清太祖努尔哈赤御用宝剑 | 沈阳故宫博物院 | ai/ai | ai / ai | ✓ / ✓ |
| sy-wyc | 清乾隆款粉彩五燕瓷瓶 | 沈阳故宫博物院 | ai/ai | ai / ai | ✓ / ✓ |
| jl-efj | 苏轼《洞庭春色赋·中山松醪赋》卷 | 吉林省博物院 | ai/ai | ai / ai | ✓ / ✓ |
| jl-wjg | 张瑀《文姬归汉图》卷 | 吉林省博物院 | ai/ai | ai / ai | ✓ / ✓ |
| jl-ljm | 夫余鎏金铜面具 | 吉林省博物院 | ai/ai | ai / ai | ✓ / ✓ |
| hlj-gys | 新石器时代桂叶形石矛 | 黑龙江省博物馆 | ai/ai | - / - | ✓ / ✓ |
| hlj-syj | 金代双鱼纹铜镜 | 黑龙江省博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| sh-ltry | 朱克柔缂丝《莲塘乳鸭图》 | 上海博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| nj-js | 西汉金兽 | 南京博物院 | ai/ai | ai / ai | ✓ / ✓ |
| nj-mb | 明洪武釉里红岁寒三友纹梅瓶 | 南京博物院 | ai/ai | ai / ai | ✓ / ✓ |
| nj-zlqx | 竹林七贤与荣启期砖画 | 南京博物院 | ai/ai | ai / ai | ✓ / ✓ |
| nj-frs | 清乾隆芙蓉石蟠螭耳盖炉 | 南京博物院 | ai/ai | ai / ai | ✓ / ✓ |
| sz-lhw | 五代秘色瓷莲花碗 | 苏州博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| sz-jx | 北宋嵌螺钿人物花鸟纹经箱 | 苏州博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| yz-mb | 元霁蓝釉白龙纹梅瓶 | 扬州博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| yz-tj | 唐打马球图铜镜 | 扬州博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| yz-zbq | 郑板桥《兰竹石图》 | 扬州博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| zj-sncy | 河姆渡文化双鸟朝阳纹牙雕 | 浙江省博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| zj-aywt | 五代吴越国鎏金银阿育王塔 | 浙江省博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| nb-wgj | 清末民初万工轿 | 宁波博物院 | ai/ai | ai / ai | ✓ / ✓ |
| nb-yrjd | 战国羽人竞渡纹铜钺 | 宁波博物院 | ai/ai | ai / ai | ✓ / ✓ |
| nb-hyz | 唐越窑青瓷荷叶盏托 | 宁波博物院 | ai/ai | ai / ai | ✓ / ✓ |
| nb-htb | 唐越窑划花卉海棠杯 | 宁波博物院 | ai/ai | ai / ai | ✓ / ✓ |
| ah-czd | 战国铸客大鼎（楚大鼎） | 安徽博物院 | ai/ai | ai / ai | ✓ / ✓ |
| ah-wgj | 春秋吴王光鉴 | 安徽博物院 | ai/ai | ai / ai | ✓ / ✓ |
| ah-yqz | 北宋景德镇窑影青注子温碗 | 安徽博物院 | ai/ai | ai / ai | ✓ / ✓ |
| fj-kql | 五代孔雀蓝釉陶瓶 | 福建博物院 | ai/ai | ai / ai | ✓ / ✓ |
| fj-jyz | 宋建窑黑釉兔毫盏 | 福建博物院 | ai/ai | ai / ai | ✓ / ✓ |
| fj-dhgy | 明德化窑何朝宗款观音立像 | 福建博物院 | ai/ai | ai / ai | ✓ / ✓ |
| qz-hzc | 南宋泉州湾后渚港沉船 | 泉州海外交通史博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| qz-mbs | 元伊斯兰教阿拉伯文墓碑 | 泉州海外交通史博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| qz-jc | 宋磁灶窑绿釉军持 | 泉州海外交通史博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| jx-qth | 商代伏鸟双尾青铜虎 | 江西省博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| jx-smsr | 商代双面神人青铜头像 | 江西省博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| jx-glc | 元青花釉里红楼阁式谷仓 | 江西省博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| jdz-qhmb | 元青花缠枝牡丹纹梅瓶 | 景德镇中国陶瓷博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| jdz-blz | 清乾隆粉彩百鹿图尊 | 景德镇中国陶瓷博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| jdz-cslh | 沉思罗汉像（“无语佛”） | 景德镇中国陶瓷博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| sd-acy | 商代亚醜钺 | 山东博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| sd-lgdy | 战国鲁国大玉璧 | 山东博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| sd-hts | 大汶口红陶兽形壶 | 山东博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| sd-szb | 银雀山汉墓《孙子兵法》《孙膑兵法》竹简 | 山东博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| kz-sg | 清“商周十供”青铜礼器 | 孔子博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| kz-myc | 明衍圣公朝服衣冠 | 孔子博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| kz-kzsj | 明版《孔子圣迹图》 | 孔子博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| qzx-lxsf | 北齐贴金彩绘佛造像 | 青州市博物馆 | ai/ai | - / - | ✓ / ✓ |
| qzx-yzb | 东汉“宜子孙”玉璧 | 青州市博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| hn-wzt | 唐武则天金简 | 河南博物院 | ai/ai | - / - | ✓ / ✓ |
| ly-byb | 曹魏白玉杯 | 洛阳博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| ly-hym | 唐三彩黑釉马 | 洛阳博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| ly-sbx | 东汉石辟邪 | 洛阳博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| kf-tmj | 北宋《开封府题名记》碑 | 开封市博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| kf-dsb | 北宋大晟编钟 | 开封市博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| yx-sxd | 商代司母辛鼎 | 殷墟博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| yx-yz | 商代亚长牛尊 | 殷墟博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| yx-jg | 刻辞卜骨（甲骨） | 殷墟博物馆 | ai/ai | - / - | ✓ / ✓ |
| hub-zhy | 战国曾侯乙编钟 | 湖北省博物馆 | ai/ai | - / - | ✓ / ✓ |
| hub-ywj | 春秋越王勾践剑 | 湖北省博物馆 | ai/ai | - / - | ✓ / ✓ |
| hub-zp | 战国曾侯乙尊盘 | 湖北省博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| hub-qj | 睡虎地秦简《秦律十八种》 | 湖北省博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| hub-sat | 元青花四爱图梅瓶 | 湖北省博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| jz-hnjg | 战国漆木虎座鸟架鼓 | 荆州博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| jz-lfh | 战国龙凤虎纹绣罗 | 荆州博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| hun-dhd | 商代大禾人面纹方鼎 | 湖南博物院 | ai/ai | ai / ai | ✓ / ✓ |
| hun-mfl | 商代皿方罍 | 湖南博物院 | ai/ai | ai / ai | ✓ / ✓ |
| cs-zml | 三国长沙走马楼吴简 | 长沙简牍博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| cs-dhj | 东汉五一广场简牍 | 长沙简牍博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| gd-qjy | 清端石千金猴王砚 | 广东省博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| gd-dsk | 清金漆木雕大神龛 | 广东省博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| gd-mlt | 南宋陈容《墨龙图》轴 | 广东省博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| ny-sly | 西汉丝缕玉衣 | 南越王博物院 | ai/ai | ai / ai | ✓ / ✓ |
| ny-wdx | 西汉“文帝行玺”金印 | 南越王博物院 | ai/ai | ai / ai | ✓ / ✓ |
| ny-jyb | 西汉角形玉杯 | 南越王博物院 | ai/ai | ai / ai | ✓ / ✓ |
| ny-yh | 西汉凸瓣纹银盒 | 南越王博物院 | ai/ai | ai / ai | ✓ / ✓ |
| ny-cpyb | 西汉铜印花板模 | 南越王博物院 | ai/ai | ai / ai | ✓ / ✓ |
| ny-hujie | 西汉错金铭文铜虎节 | 南越王博物院 | ai/ai | ai / ai | ✓ / ✓ |
| ny-gaozu | 西汉铜承盘高足玉杯 | 南越王博物院 | ai/ai | ai / ai | ✓ / ✓ |
| ny-xiangyazhi | 西汉金釦象牙卮 | 南越王博物院 | ai/ai | ai / ai | ✓ / ✓ |
| gx-xlt | 西汉翔鹭纹铜鼓 | 广西壮族自治区博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| gx-yfd | 西汉羽纹铜凤灯 | 广西壮族自治区博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| gx-qht | 西汉漆绘提梁铜筒 | 广西壮族自治区博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| hain-hgj | 南宋华光礁I号沉船出水青白瓷 | 海南省博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| hain-lj | 清黎族龙被（织锦） | 海南省博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| hain-hhl | 明黄花梨圈椅 | 海南省博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| cq-nxz | 战国青铜鸟形尊 | 重庆中国三峡博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| cq-hty | 明唐寅临《韩熙载夜宴图》卷 | 重庆中国三峡博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| dz-zlj | 南宋北山转轮经藏窟造像 | 大足石刻博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| dz-mnt | 南宋宝顶山牧牛图 | 大足石刻博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| sc-xsel | 西周象首耳兽面纹铜罍 | 四川博物院 | ai/ai | ai / ai | ✓ / ✓ |
| sc-ssj | 五代后蜀残石经 | 四川博物院 | ai/ai | ai / ai | ✓ / ✓ |
| sc-hxz | 东汉制盐画像砖 | 四川博物院 | ai/ai | ai / ai | ✓ / ✓ |
| sxd-jz | 商代金杖 | 三星堆博物馆 | ai/ai | - / - | ✓ / ✓ |
| js-tysn | 商周太阳神鸟金饰 | 成都金沙遗址博物馆 | ai/ai | - / - | ✓ / ✓ |
| js-hjm | 商周黄金面具 | 成都金沙遗址博物馆 | ai/ai | - / - | ✓ / ✓ |
| js-sjc | 新石器时代十节玉琮 | 成都金沙遗址博物馆 | ai/ai | - / - | ✓ / ✓ |
| gz-tcm | 东汉铜车马 | 贵州省博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| gz-myg | 清苗族银冠 | 贵州省博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| gz-yjg | 明播州杨氏土司金凤冠 | 贵州省博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| yn-nha | 战国牛虎铜案 | 云南省博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| xz-stg | 新石器时代双体陶罐 | 西藏博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| xz-ljf | 明永乐鎏金铜佛造像 | 西藏博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| xz-byj | 吐蕃贝叶经 | 西藏博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| sxl-xmb | 唐镶金兽首玛瑙杯 | 陕西历史博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| sxl-wmh | 唐鎏金舞马衔杯纹银壶 | 陕西历史博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| sxl-lt | 唐三彩骆驼载乐俑 | 陕西历史博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| sxl-ptxn | 葡萄花鸟纹银香囊 | 陕西历史博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| qs-by | 秦兵马俑军阵（将军俑） | 秦始皇帝陵博物院 | ai/ai | ai / ai | ✓ / ✓ |
| qs-tcm | 秦陵铜车马 | 秦始皇帝陵博物院 | ai/ai | ai / ai | ✓ / ✓ |
| qs-gyz | 秦跪射俑 | 秦始皇帝陵博物院 | ai/ai | ai / ai | ✓ / ✓ |
| xa-scm | 唐三彩腾空马 | 西安博物院 | ai/ai | ai / ai | ✓ / ✓ |
| xa-dqz | 隋董钦造鎏金铜弥陀佛像 | 西安博物院 | ai/ai | ai / ai | ✓ / ✓ |
| xa-snt | 唐仕女俑 | 西安博物院 | ai/ai | ai / ai | ✓ / ✓ |
| bj-hz | 西周何尊 | 宝鸡青铜器博物院 | ai/ai | ai / ai | ✓ / ✓ |
| bj-lp | 西周逨盘 | 宝鸡青铜器博物院 | ai/ai | ai / ai | ✓ / ✓ |
| bj-hg | 西周㝬簋（胡簋） | 宝鸡青铜器博物院 | ai/ai | ai / ai | ✓ / ✓ |
| gs-tbm | 东汉铜奔马（马踏飞燕） | 甘肃省博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| gs-rts | 仰韶人头形器口彩陶瓶 | 甘肃省博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| gs-yxt | 魏晋驿使图画像砖 | 甘肃省博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| dh-jsl | 北魏第257窟《九色鹿本生》壁画 | 敦煌研究院（莫高窟） | ai/ai | ai / ai | ✓ / ✓ |
| dh-swk | 唐第45窟彩塑群像 | 敦煌研究院（莫高窟） | ai/ai | ai / ai | ✓ / ✓ |
| dh-ft | 唐飞天壁画 | 敦煌研究院（莫高窟） | ai/ai | ai / ai | ✓ / ✓ |
| qh-wdw | 马家窑文化舞蹈纹彩陶盆 | 青海省博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| qh-tk | 清堆绣唐卡 | 青海省博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| nx-ljt | 西夏鎏金铜牛 | 宁夏博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| nx-jxb | 西夏文佛经《吉祥遍至口和本续》 | 宁夏博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| nx-hxw | 唐胡旋舞石刻墓门 | 宁夏博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| xj-wxc | 东汉“五星出东方利中国”锦护臂 | 新疆维吾尔自治区博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| xj-fxnv | 唐《伏羲女娲图》绢画 | 新疆维吾尔自治区博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| xj-thy | 唐彩绘天王踏鬼木俑 | 新疆维吾尔自治区博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| hk-lsf | 《洛神赋图》卷（北宋摹本） | 香港故宫文化博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| hk-hrz | 北宋定窑白釉孩儿枕 | 香港故宫文化博物馆 | ai/ai | - / - | ✓ / ✓ |
| mo-klk | 明克拉克瓷青花盘 | 澳门博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| mo-wxh | 清外销通草水彩画 | 澳门博物馆 | ai/ai | ai / ai | ✓ / ✓ |
| tp-cyb | 清翠玉白菜 | 台北故宫博物院 | ai/ai | ai / ai | ✓ / ✓ |
| tp-rxs | 清肉形石 | 台北故宫博物院 | ai/ai | ai / ai | ✓ / ✓ |
| tp-mgd | 西周毛公鼎 | 台北故宫博物院 | ai/ai | ai / ai | ✓ / ✓ |
| tp-rsp | 北宋汝窑天青无纹水仙盆 | 台北故宫博物院 | ai/ai | ai / ai | ✓ / ✓ |
| tp-kxs | 晋王羲之《快雪时晴帖》 | 台北故宫博物院 | ai/ai | ai / ai | ✓ / ✓ |

## 五、特别说明

1. `hb-cxd` 长信宫灯：来源页明确"未经允许不得复制或镜像"，因此**详情来源图（`/artifact-sources/official/hb-cxd.png`）被构建脚本排除、线上取不到（请求该路径返回 SPA 兜底 HTML）**；AI 卡片（`/artifacts-v2/p2-source/hb-cxd.png`）正常。若要让详情页也有图，需要：要么取得授权，要么把详情也指向 AI 图。
2. 老结构 130 件的 `credit` 均为"AI 生成示意"，**没有记录 AI 生成时的参考图**（无 `provenance.references`）；新结构里由来源图生成的 AI 卡片则记有参考图。
3. 本次为**只读体检**：未修改任何图片或数据；核验脚本在 `.tmp/`（gitignored），明细 JSON 见 `.tmp/image-live-check.json`。

## 六、复现方式

```powershell
node .tmp\audit-images2.mjs        # 静态分组（读 images.json）
node .tmp\check-images-live.mjs    # 线上逐件实访（206 件）
```
