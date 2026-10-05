import {readFile,writeFile} from 'node:fs/promises';
import {museums} from '../src/data/museums.ts';
const path=new URL('../assets/expansion/baseline-298.json',import.meta.url);
try{await readFile(path);console.log('Immutable 298 baseline retained');}
catch(e){if(e.code!=='ENOENT')throw e;
 if(museums.flatMap(m=>m.artifacts).length!==298)throw Error('Requires pre-admission 298 records');
 const images=JSON.parse(await readFile(new URL('../src/data/images.json',import.meta.url),'utf8'));
 await writeFile(path,JSON.stringify({checkedAt:new Date().toISOString(),museums,images},null,2)+'\n');console.log('298 baseline saved');}
