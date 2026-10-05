import {readFile} from 'node:fs/promises';
import {museums} from '../src/data/museums.ts';
const base=new URL('../assets/expansion/evidence/',import.meta.url);
for(const key of process.argv.slice(2)) {
 const h=await readFile(new URL(key+'.html',base),'utf8');
 const clean=s=>s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ').trim();
 console.log(key,clean(h).slice(0,14000));
 console.log('FIELDS', [...h.matchAll(/var content\d*='([^']*)'/g)].map(x=>x[1]));
 console.log('CATALOGUE', [...h.matchAll(/<li>[\s\S]*?<\/li>/g)].filter(x=>/alt=/.test(x[0])).map(x=>[x[0].match(/alt="([^"]*)"/)?.[1],x[0].match(/href="([^"]*)"/)?.[1]]));
 console.log([...h.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>[\s\S]*?<\/a>/g)].filter(x=>/裙|袄|鞋|缂丝|漆|简|牍|锦|纱/.test(clean(x[0]))).map(x=>[clean(x[0]),x[1]]));
}
if(process.argv.includes('--museums'))console.log(museums.map(m=>({id:m.id,name:m.name,objects:m.artifacts.map(a=>a.name)})));
