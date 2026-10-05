import {readFile,writeFile} from 'node:fs/promises';
import {museums} from '../src/data/museums.ts';
const path=new URL('../assets/expansion/baseline-253.json',import.meta.url);
try {await readFile(path);console.log('Existing immutable baseline retained');}
catch(e){if(e.code!=='ENOENT')throw e;
 if(museums.flatMap(m=>m.artifacts).length!==253)throw Error('Snapshot requires pre-admission 253 objects');
 const images=JSON.parse(await readFile(new URL('../src/data/images.json',import.meta.url),'utf8'));
 await writeFile(path,JSON.stringify({checkedAt:new Date().toISOString(),museums,images},null,2)+'\n');console.log('253 object baseline retained');}
