// Persist a human visually reviewed built-in imagegen output, never generate pixels here.
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const root=new URL('../',import.meta.url);
const [tranche,id,originalFile,prompt]=process.argv.slice(2);
if(!/^\d{2}$/.test(tranche)||!id||!originalFile||!prompt||prompt.length<200)throw Error('Expected tranche id original-file prompt');
const candidates=JSON.parse(await readFile(new URL(`assets/expansion/candidates-tranche-${tranche}.json`,root),'utf8'));
if(!candidates.items.some(i=>i.id===id))throw Error('Not a reviewed candidate');
const manifestUrl=new URL(`assets/expansion/ai-generation-tranche-${tranche}.json`,root);
const manifest=JSON.parse(await readFile(manifestUrl,'utf8'));
if(manifest.items.some(i=>i.id===id))throw Error('Refusing duplicate or replacement');
const hash=b=>createHash('sha256').update(b).digest('hex');
const original=await readFile(resolve(originalFile));
const retained=new URL(`assets/expansion/originals/tranche-${tranche}/${id}.png`,root);
await mkdir(new URL(`assets/expansion/originals/tranche-${tranche}/`,root),{recursive:true});
try{if(hash(await readFile(retained))!==hash(original))throw Error('Refusing to overwrite original');}catch(e){if(e.code!=='ENOENT')throw e;}
await copyFile(resolve(originalFile),retained);
manifest.items.push({id,prompt,originalFile,generatedAt:new Date().toISOString(),visualReview:'approved',historicalReview:'pending',reviewNote:'仅审核文字约束内的概括器形、独立画面与无可读伪造文字；图案、人物、数量及原貌细部不作历史证据。'});
await writeFile(manifestUrl,JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({recorded:id,images:manifest.items.length,originalSha256:hash(original)}));
