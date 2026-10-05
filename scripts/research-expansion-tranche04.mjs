import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const clean=h=>h.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const mode=process.argv[2];
if(mode==='fetch'){
 const urls=process.argv.slice(3);
 for(const url of urls){try{
  const key=createHash('sha256').update(url).digest('hex').slice(0,20);
  const response=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error(response.status);
  const bytes=Buffer.from(await response.arrayBuffer());const html=bytes.toString();
  await mkdir(new URL('assets/expansion/evidence/',root),{recursive:true});
  await writeFile(new URL(`assets/expansion/evidence/${key}.html`,root),bytes);
  await writeFile(new URL(`assets/expansion/evidence/${key}.json`,root),JSON.stringify({url,finalUrl:response.url,checkedAt:new Date().toISOString(),sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,contentType:response.headers.get('content-type')},null,2));
  console.log(JSON.stringify({url,key,text:clean(html).slice(-13000),links:[...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map(m=>({url:new URL(m[1],url).href,text:clean(m[2])})).filter(x=>x.text&&/Collection|info_|collection|藏品|展品/.test(x.url+x.text)).slice(0,100)}));
 }catch(e){console.log(JSON.stringify({url,error:e.message}));}}
}else if(mode==='details'){
 for(const site of ['gs','silk','cs']){const ids=site==='gs'?[49,48,47,46,42,40,38,36,35,34,33,26,23,21,20,16,14,12,9,6]:site==='silk'?[3282,3281,3280,3279,3284,3283,3274,3275,3272,3103,3106,3101,3100,3099,3109,3097,3102,3111,1900,1832]:[255,250,249,247,253];for(const id of ids){const url=site==='gs'?`https://web.jiandumuseum.cn/gwebapi/exhibit/detail?p=w&exhibit_id=${id}`:site==='silk'?`https://www.chinasilkmuseum.com/zggd/info_21.aspx?itemid=${id}`:`https://www.chinajiandu.cn/Collection/Details/yym?nid=${id}`;const key=createHash('sha256').update(url).digest('hex').slice(0,20);const h=await readFile(new URL(`assets/expansion/evidence/${key}.html`,root),'utf8');if(site==='gs'){const d=JSON.parse(h).data;console.log(site,id,d.exhibit_name,d.year,d.bcate_name,d.find_place,d.info,clean(d.content));}else{const s=clean(h);console.log(site,id,site==='silk'?s.slice(s.indexOf('其他',s.indexOf('En 预约'))+2,s.indexOf(' 概况 动态 活动 展览 藏品 文创 科研基地')):s.slice(s.indexOf('留言板')+3,s.indexOf('关注微博')));}}}
}else if(mode==='list'){
 const value=JSON.parse(await readFile(new URL('assets/expansion/evidence/9983172a453172990a9b.html',root),'utf8'));console.log(value.data.list.map(x=>`${x.exhibit_id}\t${x.exhibit_name}\t${x.intro}`).join('\n'));
}else if(mode==='api'){
 for(const url of process.argv.slice(3)){const key=createHash('sha256').update(url).digest('hex').slice(0,20);const h=await readFile(new URL(`assets/expansion/evidence/${key}.html`,root),'utf8');console.log(url);console.log(h.match(/path:"\/collectionIndex".{0,350}/g));console.log(h.match(/.{0,120}gwebapi.{0,200}/g));if(url.includes('detail-'))console.log(h);}
}else if(mode==='inspect'){
 for(const url of process.argv.slice(3)){const key=createHash('sha256').update(url).digest('hex').slice(0,20);const h=await readFile(new URL(`assets/expansion/evidence/${key}.html`,root),'utf8');console.log(url);console.log([...h.matchAll(/["'`]([^"'`\n]{2,180})["'`]/g)].map(m=>m[1]).filter(s=>/\/api|baseURL|collection|Collection|relic|Relic|detail|Detail|\.js$|https:/.test(s)).join('\n'));}
}else if(mode==='read'){
 for(const url of process.argv.slice(3)){const key=createHash('sha256').update(url).digest('hex').slice(0,20);console.log(url+'\n'+clean(await readFile(new URL(`assets/expansion/evidence/${key}.html`,root),'utf8')));}
}else throw Error('fetch/read URLs');
