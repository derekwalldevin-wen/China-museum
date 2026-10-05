import {readFile,writeFile} from 'node:fs/promises';
import {museums} from '../src/data/museums.ts';
const count=Number(process.argv[2]);
if(!Number.isInteger(count)||count<223)throw Error('Expected baseline count');
const path=new URL(`../assets/expansion/baseline-${count}.json`,import.meta.url);
try{await readFile(path);console.log(`Immutable ${count} baseline retained`);}
catch(e){if(e.code!=='ENOENT')throw e;if(museums.flatMap(m=>m.artifacts).length!==count)throw Error('Baseline count differs');const images=JSON.parse(await readFile(new URL('../src/data/images.json',import.meta.url),'utf8'));await writeFile(path,JSON.stringify({checkedAt:new Date().toISOString(),museums,images},null,2)+'\n');console.log(`${count} baseline saved`);}
