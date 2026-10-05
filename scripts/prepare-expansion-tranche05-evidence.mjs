import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),date='2026-10-05';
const clean=s=>s.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&bull;/g,'·').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
// Individually curated after reading official catalogue and detail responses.
// Tuple: catalogue position/ID, stable slug, category, shape, summary, visual constraint, uncertainty.
const wh=[
 [3,'stone-spade','杂项','misc','潘柳村遗址出土的屈家岭文化石耜，长38.5厘米，用于翻土。它属于石制农具；官网放入jade目录，不等于材质为玉。','Long flat grey stone spade blade, rounded rectangular outline, worn working edge.','本件具体发现年月与制作者未载。'],
 [6,'drum-pot','陶瓷','vase','1988年盘龙城杨家湾发掘出土。灰陶壶呈鼓形，两侧有两周乳钉装饰，高24.4厘米；乐器形状不能证明它曾作为鼓敲击。','Grey pottery vessel with vertical round drum-like body, small short neck and mouth on top, circular raised studs on both sides.','实际使用痕迹与用途未核。'],
 [7,'pottery-yan','陶瓷','ding','盘龙城遗址出土的商代陶甗，高44.5厘米。甑与鬲上下相连，体现蒸煮器的结构；本件发掘年份未在记录中说明。','Grey earthenware cooking steamer, wide open upper bowl joined to lower three hollow legs, unglazed.','不补造具体炊食菜单与蒸汽实验。'],
 [18,'pottery-dui','陶瓷','ding','新洲辛冲出土的战国黑陶敦，通高29厘米。盖与身同形，合成球状，盖取下可倒置使用；盖钮和足由S形构件组成。','Black pottery spherical lidded food vessel, paired hemispheres, three curved S-shaped feet and matching knobs.','出土年份、墓号与物主未知。'],
 [26,'pigsty-latrine','陶瓷','misc','1986年新洲红山嘴东汉墓出土的陶圈厕，是厕所与猪圈结合的随葬建筑模型，高23厘米。它提供生活设施的图像线索，并非实用厕所原件。','Brown earthenware miniature enclosed square pigsty and raised small latrine building, simple archaeological model, no modern bathroom fittings.','不能从模型推导当时所有家庭的卫生水平。'],
 [28,'mother-candlestick','陶瓷','figurine','汉代红陶烛台塑成妇人抱子形，高髻呈插烛筒形。馆方记通体铅釉、呈银色；青釉题名与现存银色观感应区分。','Worn red pottery figure of crouching mother holding child, tall tubular hair bun acting as candle socket, subdued silvery glaze remnants.','原釉与埋藏变化不由AI定色；发现过程未载。'],
 [29,'dabu-coin','青铜器','misc','新洲肖家洼汉墓出土的“大布黄千”铜币，长5.7厘米。馆方正文归王莽时期，时代字段作西汉；这里保留新莽限定，不把王莽制度一概写作西汉。','Single patinated bronze spade-shaped coin, round perforation in narrow upper head, broad two-foot lower body, no readable inscription.','馆方字段西汉与王莽时期应区别；不虚构出土年月。'],
 [30,'measuring-ding','青铜器','ding','汉代“菅邑家”鼎通高17厘米，口沿铭文记容量一斗、重十斤四两。馆方解释它为度量衡器，让鼎的用途超出祭祀和炊煮。','Small aged bronze tripod ding with two upright handles, rounded bowl and three slender legs, inscription not rendered.','古单位不擅自换算为唯一现代数值。'],
 [31,'people-mirror','青铜器','misc','1972年于湖北省更生仓库拣选所得的汉镜，直径18厘米。镜铭出现“中国人民”，这是文字证据，不能据此直接等同现代国家和公民概念。','Circular patinated bronze mirror back, central knob and five raised bosses among approximate animal relief, no readable words.','取得方式为拣选，不写成考古出土；词义时代边界保留。'],
 [33,'yangguang-trigger','青铜器','misc','东汉鎏金弩机臂长11厘米。馆方据刻铭定为延光三年（124年）制造；它是弩的机械部件，不是完整木弩。','Small antique bronze crossbow trigger mechanism with gold traces, interlocking angular parts, upright trigger lever, no stock or bow.','工匠身份、完整安装关系与后续流转未载。'],
 [34,'lushi-mirror','青铜器','misc','东汉神兽镜直径14.7厘米，缘有隶书铭文。馆方引罗福颐将其与《诗经·卫风·硕人》比较并解释为鲁诗遗文；这是学者释读，不是AI认字结论。','Circular aged bronze mirror back with central knob and rows of approximate mythic beasts, indistinct perimeter marks, no legible script.','鲁诗归属按馆方所引研究解释表述，未补原论文。'],
 [37,'fortress-model','陶瓷','misc','黄陂滠口三国吴墓出土的青瓷坞堡模型，高30、长62、宽48厘米。外围有围墙、角楼，院内有谷仓与厢房；作为随葬模型，不是遗址建筑实测图。','Celadon ceramic miniature fortified compound, rectangular enclosing walls, corner watchtowers, gate, small granary and side rooms.','与执盾俑同地区不等于同墓；建筑细部AI概括。'],
 [38,'shield-figure','陶瓷','figurine','1986年黄陂滠口三国墓M68出土的青瓷执盾俑，高28.9厘米。俑作跪姿、着铠甲，持兽面长方盾；伴出生活与军事模型提供墓葬组合线索。','Kneeling celadon ceramic armored warrior, helmet, long rectangular beast-face shield with raised central ridge, simple weapon held close.','不能从模型服饰确认实际军衔或个人姓名。'],
 [39,'zhaozhuo-trigger','青铜器','misc','洪山区石咀砖室墓出土的三国铜弩机，长20厘米。馆方据多位使用者的刻铭讨论孙吴领兵制度；制度含义是研究解释，不能据铭文编造三人的经历。','Elongated patinated bronze crossbow trigger mechanism, angular socket and lever parts, not a complete crossbow, no legible marks.','完整墓号、出土年月与使用次序未载。'],
 [40,'tiger-vessel','陶瓷','vase','西晋青瓷虎子长28.5厘米，塑成伏地仰头的虎，口张成圆孔，尾上卷成提梁。馆方并列水器与便壶两说，用途仍保留争议。','Celadon tiger-shaped hollow vessel lying low on four bent paws, raised open round mouth, tail curving into overhead handle.','不得把便壶用途写成定论。'],
 [41,'well-model','陶瓷','misc','武昌中山路墓葬出土的西晋青瓷井模型，高17.2厘米。四柱支撑攒尖屋顶，井沿有人提桶；这是生活场景的随葬模型，不是真井。','Small celadon ceramic well model, four slender columns supporting pyramidal roof, round well opening and tiny bucket-holding figure.','发现年份与对应家庭未知。'],
 [43,'many-foot-inkstone','陶瓷','misc','南北朝多足青瓷砚直径22.5厘米。研墨中心不施釉且微隆起，边缘施釉，下围多只兽足；馆方将其与后来的辟雍砚作形制比较。','Low circular celadon inkstone with unglazed dark central grinding surface, glazed rim, ring of small animal feet.','相似形制不建立本件与后器的直接传承。'],
 [44,'snake-seal','金银器','misc','西晋蛇钮金印长宽高均为2.2厘米，重85.5克，铭文为“晋蛮夷归义侯”。馆方解释为朝廷颁给部落首领的印信；具体受印人未在记录中指名。','Small square warm gold seal with compact curved snake-shaped knob, viewed from above and side, no exposed readable seal face.','古代称谓需置于时代语境，不推断今人族属。'],
 [47,'chicken-ewer','陶瓷','vase','武昌岳家嘴出土的隋代青瓷龙柄鸡首壶，高12.5厘米。鸡首作流，龙首衔口沿作柄，动物形象融入器物结构。','Small thick-bodied celadon ewer with chicken-head spout, dragon-shaped handle whose head meets the round lip.','未载出土年份，不虚构具体墓主。'],
 [61,'chengni-inkstone','陶瓷','misc','宋代抄手澄泥砚长18.5厘米，为陶质砚。馆方列陆游、高凤翰、黄易、金农等题款；这些人物跨越时代，不能写成宋代同时制作的177字。','Plain dark brown fired-clay rectangular inkstone, hand-hold hollow underside, recessed ink pool and flat grinding surface, no readable calligraphy.','后刻题款次序、真伪与入藏过程未核。']
];
const cz=[
 [369,'gold-lotus-box','漆器','misc','1978年村前蒋塘南宋墓出土的朱漆奁，高21.3厘米。六出莲瓣筒形分盖、盘、中、底四层，银扣包边，戗金装饰仕女人物与花卉。','Six-lobed cinnabar lacquer cylindrical cosmetic box, four stacked sections, silver rim bands, approximate fine gold flowers and indistinct figures.','不补造仕女身份；铭款不由AI复刻。'],
 [44,'trumpet-lacquer','漆器','misc','1976年圩墩遗址出土的马家浜文化喇叭形漆器，高6厘米。器内空，外有黑色涂料及烧灼痕迹；具体用途未在记录中说明。','Small hollow dark brown black-coated trumpet-shaped wooden archaeological artifact, flaring bottom, narrow top, worn scorched patches.','不沿用最早之类缺乏范围限定的绝对排名。'],
 [417,'carved-cup','漆器','vase','明代竹根雕花漆杯，高8厘米，外壁浮雕松树，内外原髹漆但大部脱落。顺竹根自然形状雕刻，不能画成完好的鲜红漆杯。','Irregular natural bamboo-root cup, aged brown, shallow pine relief, heavily worn sparse dark lacquer remnants.','发现、入藏经过未载。'],
 [418,'wood-cane','杂项','misc','1976年卜弋元墓出土的木手杖，长126.5厘米。把手与杖身榫卯相接，通体雕成竹节状；外观像竹，材质记作木。','Long aged wooden walking cane carved into bamboo segments, distinct joined handle, warm dark brown, single object diagonally placed.','不可因竹节造型误写竹材。'],
 [416,'wood-spoon','杂项','misc','1976年卜弋元墓出土的楠木勺，长22厘米。勺柄微弧、勺头扁弧，平常饮食工具的用料与加工也能成为研究线索。','Single aged nanmu wooden spoon with slightly arched narrow handle and flat oval shallow bowl.','具体食物与物主未知。'],
 [415,'wood-chopstick','杂项','misc','1976年卜弋元墓出土的楠木筷，长27.2厘米，圆柱形、一端稍粗。本条依官网单项记录，不擅自补成成双筷子。','One cylindrical dark aged wooden chopstick, slightly thicker at one end, no decorative pattern.','记录未明确原套数量，不拆分或补配成对。'],
 [414,'yuan-black-bowl','漆器','vase','1981年礼河元墓出土的黑漆碗，高5厘米。木胎直口、浅腹微折、平底，外壁朱书含“湖州”作坊信息；原铭文与图像示意分开。','Shallow black lacquer wooden bowl, straight lip, subtly angled sides and wide flat base, no legible red inscription.','铭款所指匠人详细生平未知。'],
 [413,'phagspa-bowl','漆器','vase','1976年卜弋元墓出土的八思巴文漆碗，高8.4厘米。木胎敛口、弧腹、圈足，暗黄色漆配黑边，圈足内朱书一字；同名另一件未重复纳入。','Muted dark ochre lacquer wooden bowl, slightly inward lip, curved belly and ring foot, black rim and base edging, no words.','只计官网id413这一具体碗，不合并id412尺寸。'],
 [410,'bamboo-comb','杂项','misc','1976年村前蒋塘南宋墓出土的竹篦，长8.4厘米。两面细齿夹在竹篦梁之间，用棉线捆绑；两端档子现仅存一端。','Small flat double-sided bamboo fine-tooth comb, paired bamboo crossbars tied with fine thread, one end cap missing.','不将缺失档子补绘为完好。'],
 [409,'pearl-comb','杂项','misc','1976年村前蒋塘南宋墓出土的黄杨木梳，长9.2厘米。梳作半月形，背沿镶一排细小珍珠，把日用工具与装饰结合起来。','Small semicircular boxwood comb, fine dense teeth, single row of tiny pearls along curved back.','物主与使用场合未知。'],
 [408,'wood-roller','杂项','misc','1978年村前蒋塘南宋墓出土的木卷轴，长29厘米。圆柱木轴两端镶白色玉构件，玉端有沁痕；本件是卷轴构件，不是附画全卷。','Single cylindrical aged wooden scroll roller with pale white jade end caps and slight brown staining, no paper or painting.','原配书画内容未知。'],
 [382,'lacquer-brush','漆器','misc','1978年村前蒋塘南宋墓出土的黑漆竹毛刷，长14.8厘米。竹柄浅刻花卉，猪鬃束排三列八行；馆方依据伴出梳妆器解释其洁具用途。','Small rectangular black-lacquered bamboo grooming brush, shallow flower carving, short dark bristle tufts arranged in rows.','用途属伴出组合解释，不把原主人身份写定。'],
 [380,'wood-chair','杂项','misc','1978年村前蒋塘南宋墓出土的木椅，高30.4厘米，白坯无漆。椅背较直，椅下横枨分层；作为随葬明器，不是成人尺寸座椅。','Small unpainted pale-brown wooden funerary miniature chair, tall straight back, projecting top rail, staggered lower stretchers.','比例模型不推导实际使用者身高。'],
 [379,'wood-table','杂项','misc','1978年村前蒋塘南宋墓出土的木桌，高22厘米。无漆长方桌用榫与横枨连接，桌面留置器痕；馆方据此解释为随葬供桌。','Small unpainted rectangular wooden funerary table, four cylindrical legs, simple stretchers, faint circular object traces on top.','供桌用途为馆方解释，不能编造祭品清单。'],
 [378,'lacquer-teacup','漆器','vase','1982年村前庄桥头南宋墓出土的漆托盏，高4.5厘米。小碗、圆托盘和圈足相连，通髹深褐漆，可比较茶器的扶托结构。','Dark brown lacquer small inward-rim teacup fixed in round saucer and ring foot, compact single combined vessel.','不写成另件id374的葵花托。'],
 [377,'petal-dish','漆器','misc','1983年丽华新村工地出土的南宋花瓣漆盘，口径23.5厘米。盘壁二十八瓣，内黑外赭，底有朱书作坊铭款；图不承担瓣数和铭文核对。','Flat-bottomed lacquer dish with finely scalloped many-petal rim, black interior and reddish brown exterior, no readable marks.','未核具体墓号；AI瓣数不作史料。'],
 [375,'black-washer','漆器','vase','1974年成章南宋墓出土的黑漆洗，口径27.2厘米。木胎敞口、突出唇边、浅腹和宽假圈足，用朴素形制观察生活器物。','Broad shallow black lacquer wooden basin with projecting lip, gently bulging sides and wide low false ring foot.','具体用途与使用痕迹未核，不因洗字等同砚洗。'],
 [373,'mirror-case','漆器','misc','1978年村前蒋塘南宋墓出土的剔犀执镜盒，长27.3厘米。盒随执镜轮廓，出土时内置双鱼镜，雕云纹，断面可见朱黄黑层漆；本条只计镜盒。','Black carved lacquer handled-mirror case, circular head joined to long handle, swirling cloud relief and subtly exposed red-yellow-black layered edges.','镜与盒不拆充本批数量，原镜纹饰不补绘。'],
 [372,'red-rect-box','漆器','misc','1978年村前蒋塘南宋墓出土的朱漆长方盒，高11.6厘米。内有浅盘，内黑外朱、戗金人物花卉；馆方把盖面故事与阮修挂钱杖头的典故联系。','Rectangular cinnabar lacquer lidded box, black inner tray, approximate fine gold flowers and indistinct landscape figure, no words.','典故对应属图像解释，不说就是阮修写实肖像。'],
 [371,'willow-box','漆器','misc','1978年村前蒋塘南宋墓出土的黑地戗金漆盒，高11厘米。盖饰柳塘小景，器壁四季花纹，纹间小孔填朱漆磨光；馆方明列多种装饰工艺。','Black rectangular lacquer lidded box with thin approximate gold willow-and-pond motif, small red filled dots, black shallow interior tray.','细纹AI不用于辨识原工艺微痕。'],
 [367,'silk-brush','杂项','misc','1978年村前蒋塘南宋墓出土的毛笔，通长26.5厘米。芦杆作管与套，笔头用细丝捻成，接管处丝带包裹；不能一概写成兽毛笔。','Long slender aged reed writing brush with reed protective cap beside it, short twisted silk-fiber tip and plain thread binding.','细丝材质据馆方记录，不从AI认定动物毛。'],
 [365,'red-hairpick','漆器','misc','1978年村前蒋塘南宋墓出土的朱漆发插，长11.7厘米。木胎弧面长条，下列八齿；馆方同时记有茶筅解释，用途尚无定论。','Narrow curved cinnabar lacquer wooden strip with eight long flat teeth at one end, abstract pierced top decoration, no hair or teacup context.','发插与茶筅两说保留，不用摆拍确定用途。'],
 [360,'changzhou-bowl','漆器','vase','1984年清潭体育场工地出土的宋代黑漆碗，高10厘米，口沿十瓣，深腹宽圈足。朱书含“常州”及“甲戌”款，展示器物和地方作坊的联系。','Deep black lacquer wooden bowl with ten-lobed floral lip and broad ring foot, no readable inscription.','甲戌不能不加证据换算为唯一公元年。'],
 [239,'wood-paddle','杂项','misc','1985年圩墩遗址出土的马家浜文化木桨，通长74厘米。整块原木削成桨杆与桨叶，叶有缺损，把手三角形中空；刻线用途仅疑作系绳。','Short weathered wooden paddle with flattened broken blade, rounded shaft, triangular hollow handle and two shallow incised lines.','不修补残叶；系绳用途为推测。'],
 [238,'wood-scull','杂项','misc','1981年圩墩遗址出土的马家浜文化木橹，长120厘米。原木砍削、尾端渐薄，结合部有对应凹坑；结构可与后世舟具比较，不证明连续传承。','Long rough-hewn aged wooden sculling oar, broad flattened blade tapering to thin tail, thicker shaft junction with opposed rectangular notches.','天下第一橹为传播称誉，不作排他学术排名。']
];
const whList=JSON.parse(await readFile(new URL('assets/expansion/evidence/d0e439ea41d6f06d4d19.html',root))).data.records;
const items=[];
for(const [site,rows]of [['wh',wh],['cz',cz]])for(const [number,slug,category,shape,summary,visualBrief,risk]of rows){
 const identifier=site==='wh'?whList[number].exhibitId:String(number);
 const evidenceUrl=site==='wh'?`http://www.whmuseum.com.cn/japi/sw-cms-cloud/api/queryExhibitById/${identifier}`:`https://www.czmuseum.cn/api/supreme/achieve_supreme_detail?id=${identifier}&cid=&terminal=1`;
 const key=createHash('sha256').update(evidenceUrl).digest('hex').slice(0,20);
 const bytes=await readFile(new URL(`assets/expansion/evidence/${key}.html`,root)),meta=JSON.parse(await readFile(new URL(`assets/expansion/evidence/${key}.json`,root)));
 const d=JSON.parse(bytes).data,body=clean(d.description||d.resume||'');
 if(meta.url!==evidenceUrl||meta.sha256!==createHash('sha256').update(bytes).digest('hex'))throw Error('Evidence mismatch');
 const name=d.exhibitName||d.title;
 const dynasty=site==='wh'?(number===29?'新莽':d.ageDetail||d.age):body.split('（')[0].trim();
 const era=/新石器|商|西周|战国|春秋/.test(dynasty)?'先秦':/汉|新莽/.test(dynasty)?'秦汉':/三国|晋|南北朝/.test(dynasty)?'魏晋南北朝':/隋|唐/.test(dynasty)?'隋唐五代':/宋|元/.test(dynasty)?'宋辽金元':'明清';
 const sourceUrl=site==='wh'?`http://www.whmuseum.com.cn/collection/${d.exhibitType}/${identifier}`:`https://www.czmuseum.cn/mobile/#/feaDetail?id=${identifier}&cid=12`;
 const id=site+'-'+slug;
 items.push({museumId:site==='wh'?'wuhan-city':'changzhou-city',institution:site==='wh'?'武汉博物馆':'常州博物馆',sourceUrl,evidenceUrl,evidenceKey:key,recordIdentifier:site==='wh'?`exhibitId=${identifier}`:`id=${identifier}`,inventoryNumber:null,recordUrl:sourceUrl,supports:'官方逐件名称、年代、形制、尺寸及摘要明列事实；'+risk+' 不构成照片再利用许可。',artifact:{id,name,dynasty,era,category,shape,story:summary,keywords:[name,category,site==='wh'?'江城生活与技术':'漆木与日常',...(/镜/.test(name)?['铜镜']:[]),...(/弩|耜|鼎/.test(name)?['科技器物']:[])]},writingNotes:{making:'只采用下列馆方摘录中明列的材质、结构和工艺；未载温度、工具、材料检测与工匠姓名不补造。',discovery:'摘要和事实登记明列的地点、年月可用；未载墓号、发现者、流转经过继续未知。',research:risk+' 本件保护修复记录未核。',officialExcerpt:body,comparison:{artifactId:site==='wh'?(shape==='misc'?'wh-many-foot-inkstone':'wh-pottery-yan'):'cz-gold-lotus-box',reason:site==='wh'?'比较日用、书写或机械器物如何借结构完成用途；研究解释与器物事实分别写，不因同馆或相似形制推断同墓、同作坊或直接传承。':'比较髹漆、木作与日用收纳的结构；同地出土不自动代表同墓或同匠，题款、用途争议不由AI图判定。'}},visualBrief,evidenceLevel:'official-record-read',photoAuthorization:'unknown'});
}
for(const i of items)if(i.writingNotes.comparison.artifactId===i.artifact.id)i.writingNotes.comparison.artifactId=i.museumId==='wuhan-city'?'wh-chengni-inkstone':'cz-mirror-case';
const pairs=[
 [['wh-stone-spade','cz-wood-paddle'],'比较削磨石料和砍削木料怎样形成工作边缘；不同材料、用途与文化阶段不等同技术直接传播。'],
 [['wh-drum-pot','wh-pottery-dui'],'比较陶器轮廓怎样借鉴另一种器形：鼓状外形与可翻转盖身；像鼓不等于曾经敲击。'],
 [['wh-pottery-yan','wh-measuring-ding'],'比较蒸煮结构和铭记容量的结构，器形与用途分别取证，不把所有鼎甗都当同一种炊器。'],
 [['wh-pigsty-latrine','wh-well-model'],'比较随葬建筑模型如何表达养殖与取水；模型不是实际家庭的完整复原图。'],
 [['wh-mother-candlestick','wh-shield-figure'],'比较人体塑形如何分别承载烛台与随葬军士形象，不把陶俑视为人物肖像。'],
 [['wh-dabu-coin','wh-snake-seal'],'比较钱币和印信上的文字怎样分别标示币值与授封；时代与使用者不同，不据此编造共用关系。'],
 [['wh-people-mirror','wh-lushi-mirror'],'比较镜铭如何提供词语与经典文本线索；文字相近不等于现代含义或研究归属已经唯一确定。'],
 [['wh-yangguang-trigger','wh-zhaozhuo-trigger'],'比较弩机刻铭的制造纪年与使用者信息，机械相似不证明同工坊或同军队。'],
 [['wh-fortress-model','wh-shield-figure'],'比较坞堡空间模型和执盾俑怎样表达防御场景；两件来自同地区，不把它们拼成已证实的同墓组合。'],
 [['wh-tiger-vessel','wh-chicken-ewer'],'比较动物怎样融入开口、流与提梁结构；虎子的争议用途与鸡首壶的形制分开讨论。'],
 [['wh-many-foot-inkstone','wh-chengni-inkstone'],'比较不施釉的研磨面、多足与抄手结构；相似用途不暗示具体器物间直接传承，题款另按时代核查。'],
 [['cz-gold-lotus-box','cz-willow-box'],'比较朱漆、黑地、戗金与填色如何组织收纳器的视觉；同墓地区不自动等同同匠。'],
 [['cz-trumpet-lacquer','cz-carved-cup'],'比较黑色表层与竹根雕刻髹漆；时代和胎材不同，不依相似颜色判断具体用途。'],
 [['cz-wood-cane','cz-wood-scull'],'比较长木器的榫接、砍削和工作端结构；手杖与橹不能因轮廓相似互换用途。'],
 [['cz-wood-spoon','cz-wood-chopstick'],'比较楠木饮食用具的勺头、握持端和杆身；同墓出土不证明实际同餐使用。'],
 [['cz-yuan-black-bowl','cz-phagspa-bowl'],'比较碗的口、腹、底与不同文字铭款；保留各自具体尺寸，不把同类物合成一件。'],
 [['cz-bamboo-comb','cz-pearl-comb'],'比较细齿篦的夹绑结构与半月梳的镶珠装饰；缺失档子不补造成完器。'],
 [['cz-wood-roller','cz-silk-brush'],'比较书画装具与书写工具的木、玉、芦杆和丝线组合；不编造原配书画。'],
 [['cz-lacquer-brush','cz-red-hairpick'],'比较竹鬃刷与齿状朱漆器的结构；后者发插/茶筅争议继续保留，不用场景插图裁定。'],
 [['cz-wood-chair','cz-wood-table'],'比较随葬小家具的枨与榫连接；它们是按比例模型，不据此推导成人身高。'],
 [['cz-lacquer-teacup','cz-petal-dish'],'比较托盏扶托结构和多瓣盘的边缘设计；两件并非同一套餐具的已证实组合。'],
 [['cz-black-washer','cz-changzhou-bowl'],'比较浅腹洗与深腹碗的口、底和漆层；铭款年号不据干支单独确定公元年。'],
 [['cz-mirror-case','cz-red-rect-box'],'比较随镜造型与长方收纳盒，区别雕漆分层、戗金线条和图像典故，不暗示同一制作工坊。'],
 [['cz-wood-paddle','cz-wood-scull'],'比较桨叶、橹尾与握持部分；保持残损与刻线用途疑问，不把后世形似写作已证连续传承。']
];
for(const [ids,reason]of pairs)for(const id of ids){const item=items.find(i=>i.artifact.id===id);if(item)item.writingNotes.comparison={artifactId:ids.find(other=>other!==id),reason};}
for(const item of items)if(item.artifact.shape==='figurine'){item.artifact.shape='figure';item.artifact.category='陶俑';}
const museums=[{id:'wuhan-city',name:'武汉博物馆',province:'湖北省',city:'武汉',coord:[114.25098,30.61381],artifacts:[]},{id:'changzhou-city',name:'常州博物馆',province:'江苏省',city:'常州',coord:[119.96696,31.81105],artifacts:[]}];
const museumEvidence=[{id:'wuhan-city',address:'湖北省武汉市江汉区青年路373号',addressUrl:'https://wlj.wuhan.gov.cn/zfxxgk/fdzdgknr/jgjj/zsdw/202008/t20200827_1437246.shtml',coordinateUrl:'https://mapcarta.com/W369445342',coordinateNote:'公开OSM馆舍点位，用于全国地图定位，不承诺每件实时在展。',checkedAt:date},{id:'changzhou-city',address:'江苏省常州市龙城大道1288号',addressUrl:'https://www.czmuseum.cn/mobile/',coordinateUrl:'https://mapcarta.com/W554739824',coordinateNote:'公开OSM常州博物馆点位，不混用相邻规划馆或GCJ02入口。',checkedAt:date}];
if(items.length!==45||new Set(items.map(x=>x.artifact.id)).size!==45)throw Error('45 unique objects required');
const baseline=JSON.parse(await readFile(new URL('assets/expansion/baseline-343.json',root)));for(const i of items)if(baseline.museums.some(m=>m.artifacts.some(a=>a.id===i.artifact.id)))throw Error('Existing ID');
await writeFile(new URL('assets/expansion/reviewed-tranche-05.json',root),JSON.stringify({version:1,reviewedAt:date,note:'第四批45件：武汉20、常州25；事实来自逐件官方详情响应，读者链接为官方实际前端详情。照片许可未知；新图为独立AI概括示意。',museums,museumEvidence,items},null,2)+'\n');
const fields=['id','name','institution','dynasty','category','recordIdentifier','sourceUrl','evidenceUrl','evidenceKey','checkedAt','evidenceSha256','photoAuthorization','supports'];
const evidenceRows=[];
for(const item of items){const meta=JSON.parse(await readFile(new URL(`assets/expansion/evidence/${item.evidenceKey}.json`,root)));evidenceRows.push({...item.artifact,...item,id:item.artifact.id,name:item.artifact.name,checkedAt:meta.checkedAt,evidenceSha256:meta.sha256});}
const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';
await writeFile(new URL('assets/expansion/evidence-register-tranche-05.csv',root),'\uFEFF'+[fields.join(','),...evidenceRows.map(r=>fields.map(f=>quote(r[f])).join(','))].join('\n')+'\n');
await writeFile(new URL('assets/expansion/deferred-tranche-05.json',root),JSON.stringify({checkedAt:date,notAdmitted:true,items:[{institution:'常州博物馆',recordIdentifier:'id=412',reason:'与413同名但不同尺寸；本批只选413，避免同名混读。'},{institution:'常州博物馆',recordIdentifier:'自然史标本、现代剪纸及群组器物',reason:'不把自然标本当文物，不为凑数拆分组；现代作者图像权限未闭合。'},{institution:'武汉博物馆',recordIdentifier:'蚁鼻钱钱范、环形权、四神砖及生肖俑成组记录',reason:'本批不拆组计数；暂选独立记录较清晰的器物。'}]},null,2)+'\n');
console.log(JSON.stringify({reviewed:items.length,museums:museums.map(m=>m.name),categories:items.reduce((a,i)=>(a[i.artifact.category]=(a[i.artifact.category]||0)+1,a),{})}));
