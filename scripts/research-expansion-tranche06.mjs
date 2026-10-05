import {readFile,writeFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),dir=new URL('assets/expansion/evidence/',root);
const hash=x=>createHash('sha256').update(x).digest('hex');
const clean=h=>h.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&bull;/g,'·').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
async function fetchPage(url){const key=hash(url).slice(0,20);try{await access(new URL(key+'.json',dir));return {key,html:await readFile(new URL(key+'.html',dir),'utf8')};}catch{}
 const r=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error(url+' '+r.status);const b=Buffer.from(await r.arrayBuffer());await writeFile(new URL(key+'.html',dir),b);await writeFile(new URL(key+'.json',dir),JSON.stringify({url,finalUrl:r.url,checkedAt:new Date().toISOString(),sha256:hash(b),bytes:b.length,contentType:r.headers.get('content-type')},null,2)+'\n');return {key,html:b.toString()};}
if(process.argv[2]==='collect'){
 const urls=new Set();for(const u of ['https://www.njmuseumadmin.com/Antique/index',...Array.from({length:7},(_,i)=>`https://www.njmuseumadmin.com/Antique/lists/p/${i+1}`)]){const {html}=await fetchPage(u);for(const m of html.matchAll(/href=["'](\/Antique\/show\/id\/\d+)/g))urls.add('https://www.njmuseumadmin.com'+m[1]);}
 const records=[];for(const url of urls){try{const {key,html}=await fetchPage(url),text=clean(html);records.push({url,key,text});console.log(text.slice(text.indexOf('【年代】')-45));}catch(e){console.error(e.message);}}
 await writeFile(new URL('assets/expansion/research-tranche-06.json',root),JSON.stringify({candidateOnly:true,records},null,2)+'\n');console.log({candidates:records.length});
}else{const data=JSON.parse(await readFile(new URL('assets/expansion/research-tranche-06.json',root),'utf8'));for(const r of data.records.slice(Number(process.argv[2]??0),Number(process.argv[3]??999)))console.log(r.url+'\n'+r.text.slice(r.text.indexOf('【年代】')-45)+'\n');}
