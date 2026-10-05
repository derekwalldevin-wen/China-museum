import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),key=url=>createHash('sha256').update(url).digest('hex').slice(0,20);
const mode=process.argv[2],specific=mode==='needle'?process.argv[3]:null;
for(const url of process.argv.slice(mode==='needle'?4:3)){
 const h=await readFile(new URL(`assets/expansion/evidence/${key(url)}.html`,root),'utf8');
 console.log(url);
 if(mode==='js'||mode==='needle')for(const needle of specific?[specific]:['baseURL','/api','pictureList','achieve_exhibit_detail','exhibit_list','getDetail','藏品','馆藏','collection','/collection']){let pos=0,count=0;while((pos=h.indexOf(needle,pos))>=0&&count++<8){console.log(h.slice(Math.max(0,pos-230),pos+500));pos+=needle.length;}}
 else if(mode==='html')console.log([...h.matchAll(/(?:src|href)=["']?([^"'\s>]+)/g)].map(m=>m[1]).filter(x=>/\.js|collection|藏品/.test(x)).join('\n'));
 else if(mode==='json'){const d=JSON.parse(h);console.log(JSON.stringify(d).slice(0,18000));}
 else throw Error('js/html/json');
}
