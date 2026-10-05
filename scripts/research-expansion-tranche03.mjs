import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const clean=h=>h.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ').trim();
if(process.argv[2]==='select') {
 const candidates=JSON.parse(await readFile(new URL('assets/expansion/candidate-register.json',root),'utf8')).candidates;
 const cd=[['cd-comic-figure','陶俳优俑','lianghan',48],['cd-stone-bear','石熊','lianghan',47],['cd-chenghan-figure','成汉陶俑','lianghan',44],['cd-pottery-courtyard','陶庭院','tangsong',52],['cd-qiong-kiln-censer','邛窑黄绿釉高足瓷炉','tangsong',51],['cd-bronze-chess','青铜象棋子','tangsong',50],['cd-ding-child-pillow','定窑白瓷孩儿枕','tangsong',49],['cd-gold-hairpin','寿字金挑心','mq',60],['cd-agate-snuff-bottle','玛瑙鼻烟壶','mq',59],['cd-peacock-bowl','孔雀蓝釉瓷碗','mq',58],['cd-ge-ewer','哥釉瓷执壶','mq',57],['cd-bat-vase','粉彩云蝠纹瓷赏瓶','mq',56],['cd-dragon-belt-hook','苍龙教子玉带钩','mq',55],['cd-attendant-figure','彩釉陶侍从俑','mq',54],['cd-beast-lei','西周兽头双耳铜罍','xianqin',40]].map(([id,name,section,n])=>({id,name,museumId:'chengdu-city',sourceUrl:`https://www.cdmuseum.com/${section}/201901/${n}.html`}));
 const sz=[['sz-pottery-well','灰陶井'],['sz-double-box','青白瓷印花子母盒'],['sz-incense-burner','青白瓷镂孔香薰'],['sz-marble-bowl','绞胎盂'],['sz-marble-pillow','巩义芝田窑绿釉绞胎枕'],['sz-pottery-dog','褐釉陶狗'],['sz-ewer-basin','青白瓷注子、注碗'],['sz-oil-lamp','青釉灯盏'],['sz-inlaid-table','清红木嵌螺钿松鼠葡萄纹小几'],['sz-six-ear-basin','青釉六耳盂'],['sz-stone-paddle','条纹石拍'],['sz-tin-gourd-ewer','清同治款葫芦锡壶'],['sz-carved-brushpot','清雕人物纹木笔筒'],['sz-warming-copper-stove','清“喜”字八宝纹温水铜炉'],['sz-grooved-stone','刻槽石器'],['sz-perforated-shovel','穿孔石铲'],['sz-crystal-point','水晶石尖状器'],['sz-stone-adze','石锛'],['sz-paper-cut-bowl','吉州窑黑釉剪纸贴花盏'],['sz-yue-box','越窑青釉划花盒']];
 const gb=[['gb-birch-milk-tube','桦皮奶筒'],['gb-dade-coin','大德通宝折三铜钱'],['gb-guobao-coin','“国宝金匮直万”铜钱'],['gb-wuzhu-mould','五铢钱铜范'],['gb-small-banliang','小半两铜钱'],['gb-kaiyuan-coin','开元通宝钱'],['gb-peacock-inkstone','雕孔雀端砚'],['gb-bamboo-ghost-tube','竹雕五鬼闹判花筒'],['gb-jade-crab-inkstone','玉荷花螃蟹纹砚'],['gb-jade-bamboo-brushpot','玉竹节纹笔筒']];
 const select=(rows,museumId)=>rows.map(([id,name])=>{const found=candidates.filter(c=>c.museumId===museumId&&c.officialName===name);if(found.length!==1)throw Error(name+' '+found.length);return {id,name,museumId,sourceUrl:found[0].sourceUrl};});
 const initial=[...cd,...select(sz,'shenzhen-city'),...select(gb,'guobo')];
 const held=new Set(['sz-six-ear-basin','gb-peacock-inkstone','gb-bamboo-ghost-tube','gb-kaiyuan-coin']);
 await writeFile(new URL('assets/expansion/deferred-tranche-03.json',root),JSON.stringify({countedAsAdmissions:false,items:initial.filter(i=>held.has(i.id)).map(i=>({...i,reason:'直接逐件记录未明确本件断代，先保留待核；不凭其他同类器物年代补填。'}))},null,2)+'\n');
 const items=[...initial.filter(i=>!held.has(i.id)),...select([['sz-white-dragon-ewer','白瓷龙柄壶'],['sz-tricolor-flat-flask','三彩结带纹穿带扁壶'],['sz-celadon-ewer','青瓷瓜棱执壶'],['sz-changsha-ewer','长沙窑青釉褐斑贴花椰枣纹注子']],'shenzhen-city')];
 await writeFile(new URL('assets/expansion/research-tranche-03.json',root),JSON.stringify(items,null,2)+'\n');console.log(items.length);
} else if(process.argv[2]==='catalogue') {
 for(const key of ['219974f37dbc4c3ef974','f6e89ddd829375e70bea','4e0f0868b88c65c9a344','a28d5eeb9d127073ca54']){
  const h=await readFile(new URL(`assets/expansion/evidence/${key}.html`,root),'utf8');
  for(const m of h.matchAll(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/g)) if(/201901/.test(m[1]))console.log(m[1],clean(m[2]));
 }
} else if(process.argv[2]==='read'){
 const list=JSON.parse(await readFile(new URL('assets/expansion/research-tranche-03.json',root),'utf8'));
 for(const item of list){
  const key=createHash('sha256').update(item.sourceUrl).digest('hex').slice(0,20);
  const h=await readFile(new URL(`assets/expansion/evidence/${key}.html`,root),'utf8');
  let t=clean(h);
  if(item.museumId==='shenzhen-city') t=clean(h.slice(h.indexOf('<h2 class="collection-title">'),h.indexOf('<div class="videoMask">')));
  else if(item.museumId==='chengdu-city') t=t.slice(t.indexOf('返回列表'),t.indexOf('宣传栏位置'));
  else t=t.slice(t.indexOf('当前位置')>=0?t.indexOf('当前位置'):t.indexOf('首页 >'),t.indexOf('相关藏品')>0?t.indexOf('相关藏品'):t.length);
  console.log(JSON.stringify({id:item.id,name:item.name,url:item.sourceUrl,key,text:t,fields:[...h.matchAll(/var content\d*='([^']*)'/g)].map(m=>clean(m[1]))}));
 }
} else {
 const list=JSON.parse(await readFile(new URL('assets/expansion/research-tranche-03.json',root),'utf8'));
 for(const item of list){
  const response=await fetch(item.sourceUrl,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error(item.name+' HTTP '+response.status);
  const b=Buffer.from(await response.arrayBuffer());const key=createHash('sha256').update(item.sourceUrl).digest('hex').slice(0,20);
  await writeFile(new URL(`assets/expansion/evidence/${key}.html`,root),b);
  await writeFile(new URL(`assets/expansion/evidence/${key}.json`,root),JSON.stringify({url:item.sourceUrl,finalUrl:response.url,checkedAt:new Date().toISOString(),sha256:createHash('sha256').update(b).digest('hex'),bytes:b.length,contentType:response.headers.get('content-type')},null,2));
  console.log(item.name,key);
 }
}
