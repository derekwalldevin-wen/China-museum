import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const wh=JSON.parse(await readFile(new URL('assets/expansion/evidence/d0e439ea41d6f06d4d19.html',root))).data.records;
const selectedWh=[3,6,7,18,26,28,29,30,31,33,34,37,38,39,40,41,43,44,47,61].map(i=>wh[i]);
const czIds=[369,44,417,418,416,415,414,413,410,409,408,382,380,379,378,377,375,373,372,371,367,365,360,239,238];
const js=await readFile(new URL('assets/expansion/evidence/c0f7d93217bff300092a.html',root),'utf8');
const appkey=js.match(/appkey:"([^"]+)"/)[1],salt=js.match(/MD5\(l\+="([^"]+)"/)[1];
const tasks=[...selectedWh.map(r=>({site:'wh',id:r.exhibitId,url:`http://www.whmuseum.com.cn/japi/sw-cms-cloud/api/queryExhibitById/${r.exhibitId}`})),...czIds.map(id=>({site:'cz',id:String(id),url:`https://www.czmuseum.cn/api/supreme/achieve_supreme_detail?id=${id}&cid=&terminal=1`}))];
for(let start=0;start<tasks.length;start+=5)await Promise.all(tasks.slice(start,start+5).map(async t=>{
 const key=createHash('sha256').update(t.url).digest('hex').slice(0,20);
 let request=t.url;
 if(t.site==='cz'){
  const f={appkey,nonce:Math.floor(Math.random()*999999+100000),timestamp:Math.floor(Date.now()/1000),id:t.id,cid:'',terminal:1};
  const sign=createHash('md5').update(Object.keys(f).sort().map(k=>f[k]).join('')+salt).digest('hex').toUpperCase();
  request='https://www.czmuseum.cn/api/supreme/achieve_supreme_detail?'+new URLSearchParams({...f,sign});
 }
 const response=await fetch(request,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error(response.status);
 const bytes=Buffer.from(await response.arrayBuffer()),value=JSON.parse(bytes);
 if(t.site==='wh'?value.code!==200:value.error_code!==0)throw Error(JSON.stringify(value));
 await writeFile(new URL(`assets/expansion/evidence/${key}.html`,root),bytes);
 await writeFile(new URL(`assets/expansion/evidence/${key}.json`,root),JSON.stringify({url:t.url,finalUrl:t.url,checkedAt:new Date().toISOString(),sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,contentType:response.headers.get('content-type'),requestProtocol:t.site==='cz'?'official-public-client-get':'public-get'},null,2));
 const d=value.data;console.log(JSON.stringify({site:t.site,id:t.id,key,name:d.exhibitName||d.title,age:d.ageDetail||d.age,text:(d.description||d.resume||'').replace(/<[^>]*>/g,' '),size:d.size}));
}));
