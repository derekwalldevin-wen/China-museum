// Human-read official records; this register is NOT an admission manifest.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = new URL('../', import.meta.url);
const records = JSON.parse(await readFile(new URL('assets/expansion/research-tranche-06.json', root), 'utf8')).records;
// official detail id, internal stable id, museum, summary, visual constraints
const rows = [
 [117,'jnz-yellow-dragon-robe','jnz','道光时期的明黄色妆花缎夹蟒袍，衣长132厘米、两袖通长243厘米。馆方记录彩云、金龙及马蹄袖；具体穿用者未载。','Yellow brocade robe with wide sleeves and horse-hoof cuffs; approximate cloud and dragon roundels, no named wearer.'],
 [133,'jnz-crane-robe','jnz','清代缎绣团鹤吉服袍，衣长132厘米。红色衣地配团鹤和黑色边饰；纹样可用于讨论身份表达，但不能据此指定穿用者。','Red silk robe with black borders, eight approximate crane medallions, no people.'],
 [132,'jnz-blue-kesi-robe','jnz','清代蓝地缂丝金龙蟒袍，衣长150厘米。缂丝属于织造而非在成品布上刺绣；本件工匠与穿用者尚无直接资料。','Blue tapestry silk robe, gold dragon motifs, black cuffs, no embroidery stitches invented.'],
 [124,'jnz-navy-dragon-jacket','jnz','咸丰时期石青缎绣四团彩云金龙夹龙褂，衣长117厘米。深色地上用金线表现团龙；官网页面未记录具体穿用者。','Dark navy open-front straight-cuff silk jacket, four gold dragon roundels; approximate motifs only.'],
 [122,'jnz-red-woman-robe','jnz','光绪时期大红缎平金绣八团云龙夹女蟒，衣长107厘米。平金绣、团纹和女蟒服式均见于馆方记录；不能把服式等同某位人物的遗物。','Red silk female ceremonial robe with flat cuffs and eight approximate gold dragon medallions.'],
 [118,'jnz-purple-brocade-robe','jnz','光绪时期紫云龙杂宝妆花绸单蟒袍，衣长138厘米。馆方说明其为轻薄夏服，采用片金妆花；不是把纹样印在布上的印花衣。','Purple lightweight brocade robe with gold cloud and dragon patterns, not printed cotton, no invented text.'],
 [121,'jnz-yellow-velvet-coat','jnz','清代杏黄织金妆花绒缠枝莲夹服，衣长125厘米。馆方明确记载江宁织造生产，莲纹织金与绒地结合；工匠和穿用者未载。','Apricot yellow velvet coat with woven gold scrolling lotus motifs, restrained pile texture, no dragons.'],
 [134,'lc-ox-cart-group','lc','象山东晋王氏家族墓葬出土的陶牛车及俑群，车长73厘米。车辆、陶牛和侍俑合为一条藏品；表现的出行场景不等于某次真实旅程。','Grey pottery ox pulling a flat-roofed rectangular cart with a small representative attendant group; not an exact count.'],
 [30,'lc-soul-jar-buildings','lc','江宁上坊吴墓出土的青瓷魂瓶，高41.8厘米。上部堆塑人物、飞鸟和楼阙，下部相对简洁；明器用途有馆方说明，具体人物身份未知。','Celadon funerary jar with clustered miniature buildings, birds and anonymous figures above a simple rounded vessel.'],
 [29,'lc-chicken-head-ewer','lc','雨花台区华为工地东晋墓出土的青瓷鸡首壶，高30厘米。带盖、桥形方系，鸡首与高柄相对；本件具体使用过程未载。','Covered celadon ewer with chicken-head short spout, tall opposite handle and small bridge loops.'],
 [28,'lc-cicada-gold-ornament','lc','仙鹤观出土的东晋蝉纹金珰，边长5.5厘米。金片镂空及小金珠表现蝉纹，眼部镶嵌已失；示意图不能补回缺失宝石。','Small square openwork gold cicada ornament with tiny granulation; empty missing eye inlays, no restored gemstones.'],
 [15,'lc-guanzhong-gold-seal','lc','直渎山出土的东晋关中侯印，印面边长2.4厘米，带龟钮。名称来自官印文字；仅凭印章不能确认某位持有者。','Small square gold seal with turtle knob; seal face hidden, absolutely no readable invented characters.'],
 [14,'lc-human-face-tile','lc','大行宫出土的六朝人面纹瓦当，直径14厘米。灰陶圆形瓦当以人面浮雕为中心；屋宇位置和人物身份尚未核实。','Round grey pottery roof-end tile with a restrained stylized human-face relief, no architectural scene.'],
 [13,'lc-lotus-vase-pair','lc','1972年灵山南朝墓出土的一对青瓷莲花尊，高85厘米。莲瓣、修长颈部与高大器身形成层次；成对器物合计一条，不拆分计数。','A pair of tall celadon lotus-relief vessels with flaring necks and hat-like lids, one group composition.'],
 [8,'lc-winged-figure-jar','lc','1983年长岗村出土的三国吴青瓷釉下彩羽人纹盘口壶，高32.1厘米。绘彩与贴塑结合；馆方对其早期釉下彩意义的评价应作为研究解释阅读。','Yellow-green celadon pan-mouth jar with restrained brown underglaze winged-figure approximations and bird knob; no exact glyphs.'],
 [160,'lc-liang-buddha','lc','德基工地出土的南朝梁铜造佛像，高11.3厘米，馆方定年为527年。佛与胁侍构成小型造像，部分下缘残损；不补造缺失部分。','Small bronze Buddhist triad relief with small upper figures, visibly damaged lower edge; do not restore missing areas.'],
 [153,'lc-sheep-insertion-vessel','lc','草场门甘露元年墓出土的三国吴青瓷羊形插器，高25厘米。伏羊头部有孔、腹部饰翼；可供插置何物，现有记录没有给出可核实结论。','Recumbent celadon sheep-shaped vessel with a hole on its head and stylized wing relief on belly; insert nothing.'],
 [152,'lc-celadon-huzi','lc','五塘村出土的三国吴青瓷虎子，高18厘米。器身横卧、口部上举并带提梁；形制事实与具体用途应分开，不直接把它写成尿壶。','Horizontal cocoon-shaped celadon vessel on four small feet, upward opening and arched handle, no liquid or usage scene.'],
 [34,'lc-musician-figurine-group','lc','2005年上坊吴墓出土的青瓷伎乐俑群，包含不同演奏姿态。俑群合计一条，示意仅概括乐舞场景，不作为人数、乐器细节的考据图。','Small representative celadon musician figurine group including drummer and seated string player, not an exact archaeological arrangement.'],
 [40,'njc-bronze-yi','njc','板桥九四二四工地出土的西周铜匜，长38.5厘米。瓢形器身、宽短流、凤尾状鋬和三蹄足共同形成注水结构；具体使用者未知。','Patinated bronze ladle-shaped pouring vessel, wide short spout, phoenix-tail handle, three hoof-shaped feet.'],
 [44,'njc-weifuren-li-group','njc','征集入藏的春秋卫夫人铜鬲，两件合计一条。袋足与腹部构成炊器形制；名称依据铭文，征集记录不能改写为本地出土。','Pair of small patinated bronze tripod cooking vessels with rounded bag-shaped legs; no readable inscriptions.'],
 [39,'njc-bronze-nao','njc','龙王荡出土的商代兽面纹青铜铙，高68厘米。中空长甬和兽面纹见于馆方记录；其构造与后世悬挂编钟不同，不借图假定一套编钟。','Large patinated bronze nao bell with long hollow stem below broad bell body and restrained beast-mask relief; no rack.'],
 [9,'njc-xiaohe-meiping','njc','沐英墓出土的元青花萧何月下追韩信图梅瓶，高44.1厘米。瓷器年代为元，墓葬为明；历史故事图像不是汉代现场记录。','Yuan-style blue-and-white small-mouth meiping with approximate narrative figures, not exact original brushwork, no readable text.'],
 [65,'njc-ashoka-pagoda','njc','长干寺地宫出土的北宋七宝阿育王塔，高120厘米。馆方记载檀香木胎、银饰鎏金及宝石装饰；不是整座由实心黄金铸造。','Tall square Buddhist miniature pagoda, sandalwood core clad in gilded silver with small colorful stone accents; approximate structure.'],
 [41,'njc-glazed-building-parts','njc','大报恩寺窑岗琉璃窑址出土的明代琉璃构件，馆方记录黄绿褐釉色。这里的琉璃是釉陶建筑构件，不能画成透明玻璃。','Opaque architectural glazed ceramic component in yellow green and brown, thick ceramic body; no transparent glass.'],
 [45,'njc-gem-lotus-gold-box','njc','1474年沐斌梅氏墓出土的嵌宝石莲纹金盒，边长8.5厘米。金质方盒结合莲纹和宝石；墓葬归属不能代替制作工匠信息。','Small square gold box with lotus relief and restrained red blue turquoise stone inlays, shallow lid.'],
 [67,'njc-bull-head-pot','njc','营盘山遗址出土的新石器时代牛首陶罐，高10厘米。灰陶器身加塑牛首并设三足；史前工匠姓名与具体发现过程未载。','Small smooth grey pottery jar with applied buffalo-face ornament and three flat feet, simple unpainted surface.'],
 [10,'njc-amber-lotus-cup','njc','1627年沐叡墓出土的渔翁戏荷琥珀杯，长12.8厘米。荷叶形成杯身，渔翁等题材融入器形；不能把雕刻人物认作墓主人肖像。','Reddish translucent amber lotus-leaf cup with small anonymous fisherman-shaped handle and cormorant motif, approximate relief.'],
 [49,'njc-silver-gold-coffin','njc','长干寺地宫出土的银椁金棺，由外银椁与内金棺组成，合计一条。它反映宗教供奉制度；供奉对象的传统说法不等于现代科学鉴定。','Nested miniature reliquary outer silver coffin and inner small gold coffin shown together, no contents or bones.'],
 [38,'njc-double-chi-jade-cup','njc','沐叡墓出土的明代双螭耳玉杯，高4.5厘米。两侧螭形耳兼具持握与装饰作用，玉色有红沁；没有依据复原其具体饮用场景。','Small creamy white jade cup with reddish staining and two chi-dragon handles, no gems or gold additions.'],
 [71,'njc-changsha-butterfly-ewer','njc','秦淮河西水关出土的唐代长沙窑青釉褐彩花蝶瓷执壶，高23.2厘米。瓜棱器身、短流和褐彩花蝶共同呈现日常器用与绘饰。','Yellow-green glazed ribbed pottery ewer with short octagonal spout, handle and restrained brown flower-butterfly painting.'],
 [150,'njc-neifu-meiping','njc','1463年怀忠墓出土的明代景德镇内府瓷梅瓶，高33.2厘米。白釉器身有内府文字；AI图不伪造可认读铭文，具体制作批次未载。','Plain white glazed small-mouth meiping, rounded shoulder, no readable inscription and no invented floral ornament.'],
 [60,'njc-muqian-gold-plaque','njc','沐叡墓出土的黔宁王遗记金牌，直径13厘米。名称与文字内容有关，金牌保存家族记忆线索；铭文解读应回到原件资料，不能看AI图认字。','Round gold plaque with leaf-shaped border and suspension holes; no readable invented inscription.'],
 [82,'njc-brown-incense-pair','njc','陶吴娘娘山东晋墓出土的褐釉瓷香熏，两件合计一条，高11.6厘米。球形镂孔罩、支柱和托盘组合；未核实所燃香料。','Pair of dark brown glazed spherical incense burners with triangular openwork holes, narrow stem and wide saucer base.'],
 [58,'njc-zengziyi-fu','njc','程桥墓出土的春秋曾子義行铜簠，长28.2厘米。长方形有盖、两耳及圈足用于构成食器；铭文不能由示意图代读。','Rectangular lidded bronze food vessel with two side handles and low rectangular foot, restrained patina, no readable text.'],
 [55,'njc-lotus-silver-burner','njc','长干寺地宫出土的北宋鎏金莲花宝子银香炉，长35.2厘米。银质鎏金、莲花与枝叶结合成组合器；不是纯金香炉。','Gilded silver branch-shaped incense utensil with lotus burner, leaf base and bud containers, one integrated object.'],
 [61,'njc-crystal-leaf-cup','njc','长干寺地宫出土的北宋蕉叶纹水晶杯，长18.7厘米。水晶杯身结合鎏金银口沿；水晶与人工玻璃不是同一种材料。','Transparent elongated leaf-shaped crystal cup with handle and thin gilded-silver rim, no invented engraving.'],
 [52,'njc-gilded-silver-boxes','njc','长干寺地宫出土的北宋鎏金银函，包括大小两函，合计一条。大函顶部呈梯形，小函平顶；供奉层次可比较，不能推定所有内容物身份。','Two square gilded silver reliquary boxes, large box with trapezoidal roof lid and small flat-lid box, no contents.'],
 [50,'njc-buddha-gold-box','njc','1424年沐昂邢氏墓出土的佛像纹金盒，边长8.3厘米。方形金盒以佛像浮雕装饰；个人信仰和用途细节尚无本件直接资料。','Shallow square gold box with central approximate Buddhist figure relief on lid, no lettering or modern ornament.'],
 [136,'njc-wu-dashu-pan','njc','程桥墓出土的春秋工吴大叔铜盘，直径43.2厘米。圈足盘内的铭文与龙纹见于馆方说明；名字与身份解读必须注明依据。','Wide shallow patinated bronze pan on ring foot with three restrained dragon-pattern sections; no readable inscription.'],
 [135,'njc-ding-duck-bowl','njc','黄叶岭张同夫妇墓出土的宋代定窑白釉鸳荷瓷碗，口径16.5厘米，口沿釦银。鸳鸯、荷花与鱼纹构成碗内印花；不混同尺寸不同的另一条馆方记录。','White glazed bowl with thin silver rim and softly impressed approximate paired ducks, lotus and fish inside; no blue paint.'],
 [48,'njc-jade-egret-gold-base','njc','炸药厂工地出土的明代镶金座荷鹭玉饰，高7.3厘米。透雕玉饰与金质莲花座相结合；具体佩用位置未核，不将它直接画成冠饰。','Openwork creamy jade lotus and egret ornament mounted on a small gold lotus base with four clamps.'],
 [74,'njc-linked-jade-buckle','njc','溧水元墓出土的蟠螭玉带扣，长7.6厘米。两部分以活环连接并饰螭纹；活环的制作体现结构设计，具体工匠与操作工具未知。','Two connected pale jade belt-buckle halves with interlocking live rings and restrained chi-dragon relief.'],
 [68,'njc-liangqi-bell-group','njc','征集入藏的西周梁其铜钟。馆方说明原系列八件、本馆收藏其中五件，本条只计馆藏组一条，不把八件全算作本馆收录。','Representative group of bronze stemmed bells, no rack, no readable inscription; not claiming full original series.'],
 [137,'njc-diamond-bronze-sword','njc','程桥墓出土的春秋菱格纹铜剑，长52.5厘米。剑身菱格纹与圆形剑首清晰可述；剑格原镶嵌已失，不补画宝石。','Bronze sword with dark diamond pattern on blade, two raised handle rings and round pommel; missing guard inlays remain empty.'],
];
if (rows.length !== 45 || new Set(rows.map(r => r[0])).size !== 45) throw new Error('Expected 45 unique physical records');
const museums = {jnz:'江宁织造博物馆',lc:'六朝博物馆',njc:'南京市博物馆'};
const items=[];
for(const [officialId,id,museum,summary,visualBrief] of rows){
 const record=records.find(r=>r.url.endsWith(`/id/${officialId}`));
 if(!record)throw new Error(`Missing official record ${officialId}`);
 const metadata=JSON.parse(await readFile(new URL(`assets/expansion/evidence/${record.key}.json`,root),'utf8'));
 const bytes=await readFile(new URL(`assets/expansion/evidence/${record.key}.html`,root));
 if(metadata.url!==record.url || metadata.sha256!==createHash('sha256').update(bytes).digest('hex'))throw new Error(`Broken evidence ${id}`);
 if(!record.text.includes(`藏于${museums[museum]}`))throw new Error(`Ownership not explicit ${id}`);
 const title=record.text.split('-南京市博物总馆')[0];
 const name=title.replace(/^[^•]+•/,'');
 const dynasty=record.text.match(/【年代】：(.*?) 【类别】/)?.[1];
 const officialCategory=record.text.match(/【类别】：(.*?) 【(?:尺寸|等级)】/)?.[1];
 const dimensions=record.text.match(/【尺寸】：(\S+)/)?.[1];
 if(!name||!dynasty||!officialCategory)throw new Error(`Incomplete record ${id}`);
 items.push({id,name,museumId:{jnz:'jiangning-weaving',lc:'six-dynasties',njc:'nanjing-city'}[museum],institution:museums[museum],dynasty,officialCategory,dimensions,recordIdentifier:`Antique/show/id/${officialId}`,sourceUrl:record.url,evidenceKey:record.key,evidenceSha256:metadata.sha256,checkedAt:metadata.checkedAt,summary,visualBrief,evidenceLevel:'official-record-read',admissionStatus:'candidate-not-admitted',photoAuthorization:'unknown',imageStatus:'pending-independent-illustration',writingNotes:{facts:'本条摘要与官方逐件记录支持的名称、年代、形制、尺寸、收藏归属和发现地点可引用。',making:'仅采用逐件记录明确的材料、装饰与结构；未载工具、工匠、窑温和材料检测不补造。',discovery:'出土与征集分别叙述；墓葬年代不等同制作年代，具体发现经过未载则未知。',research:'将馆方评价与实物事实区分；本件正式论文与保护记录尚未核读。',comparison:'以材料、结构或用途比较；不据外形相似暗示工艺传播或直接传承。',imageBoundary:'未确认照片许可。拟用独立AI概括示意，不用于核对纹饰、铭文或补齐损坏。'}});
}
const register={version:1,tranche:'06',candidateOnly:true,checkedAt:'2026-10-05',existingArtifacts:388,targetAfterAdmission:433,note:'45件完成官方记录核读与摘要；尚未入库，不增加应用收录数。组器只计一条。没有照片授权确认。',museumCounts:Object.fromEntries(Object.values(museums).map(m=>[m,items.filter(i=>i.institution===m).length])),excluded:[{officialId:31,reason:'只写展于六朝博物馆，收藏归属未闭合'},{officialId:154,reason:'与159尺寸及器身描述重合，需厘清具体藏品'},{officialId:138,reason:'与135出土语境近似而尺寸不同，避免疑似重复'},{officialId:147,reason:'馆方尺寸异常，未猜测修正'},{officialId:53,reason:'尺寸疑似复制金盒记录，暂不采用'},{officialId:36,reason:'与既有南京博物院梅瓶需要更充分的具体身份去重'},{officialId:84,reason:'材质字段与正文不一致'},{officialId:85,reason:'标题与正文人名不一致'},{officialId:86,reason:'标题与正文文书归属不一致'}],items};
await writeFile(new URL('assets/expansion/candidates-tranche-06.json',root),JSON.stringify(register,null,2)+'\n');
await mkdir(new URL('docs/handoff/expansion-600/',root),{recursive:true});
await writeFile(new URL('docs/handoff/expansion-600/tranche-06-candidate-writing-pack.json',root),JSON.stringify(register,null,2)+'\n');
const cell=v=>'"'+String(v??'').replaceAll('"','""')+'"';
const csv=[['id','name','institution','dynasty','recordIdentifier','sourceUrl','checkedAt','evidenceSha256','admissionStatus','photoAuthorization'],...items.map(i=>[i.id,i.name,i.institution,i.dynasty,i.recordIdentifier,i.sourceUrl,i.checkedAt,i.evidenceSha256,i.admissionStatus,i.photoAuthorization])].map(r=>r.map(cell).join(',')).join('\n');
await writeFile(new URL('assets/expansion/tranche-06-candidate-evidence.csv',root),'\uFEFF'+csv+'\n');
console.log(JSON.stringify({candidates:items.length,admitted:0,museums:register.museumCounts,verifiedEvidenceHashes:items.length}));
