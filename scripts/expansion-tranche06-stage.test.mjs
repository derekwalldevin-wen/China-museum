import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import register from '../assets/expansion/candidates-tranche-06.json' with {type:'json'};
import processing from '../assets/expansion/processing-tranche-06.json' with {type:'json'};
import baseline from '../assets/expansion/baseline-388.json' with {type:'json'};
import {museums} from '../src/data/museums.ts';
import images from '../src/data/images.json' with {type:'json'};
const root=new URL('../',import.meta.url),sha=b=>createHash('sha256').update(b).digest('hex');
test('fifth-stage candidates are 45 unique records with explicit ownership and checked raw evidence',async()=>{
 assert.equal(register.candidateOnly,true);assert.equal(register.items.length,45);
 assert.equal(new Set(register.items.map(i=>i.id)).size,45);
 assert.equal(new Set(register.items.map(i=>i.sourceUrl)).size,45);
 for(const i of register.items){
  const metadata=JSON.parse(await readFile(new URL(`assets/expansion/evidence/${i.evidenceKey}.json`,root),'utf8'));
  const html=await readFile(new URL(`assets/expansion/evidence/${i.evidenceKey}.html`,root));
  assert.equal(metadata.url,i.sourceUrl);assert.equal(sha(html),i.evidenceSha256);assert.equal(metadata.sha256,i.evidenceSha256);
  assert.ok(i.summary.length>=40);assert.equal(i.photoAuthorization,'unknown');assert.equal(i.admissionStatus,'candidate-not-admitted');
  assert.ok(i.writingNotes.imageBoundary.includes('AI'));assert.ok(i.writingNotes.discovery.includes('未知'));
 }
});
test('fifth-stage does not count candidates or modify any of the existing 388 objects or images',()=>{
 assert.equal(museums.flatMap(m=>m.artifacts).length,388);
 assert.deepEqual(museums,baseline.museums);assert.deepEqual(images,baseline.images);
 const ids=new Set(museums.flatMap(m=>m.artifacts.map(a=>a.id)));
 for(const i of register.items)assert.ok(!ids.has(i.id));
});
test('seven independent AI originals and fourteen delivery files have closed hashes and no upscaling',async()=>{
 assert.equal(processing.items.length,7);assert.equal(new Set(processing.items.map(i=>i.originalSha256)).size,7);
 for(const i of processing.items){
  assert.equal(i.historicalReview,'pending');assert.equal(i.visualReview,'approved');
  assert.equal(sha(await readFile(new URL(i.originalFile,root))),i.originalSha256);
  assert.ok(i.prompt.length>200);
  for(const r of Object.values(i.roles)){
   assert.equal(r.aiGenerated,true);assert.equal(r.upscaled,false);
   assert.equal(sha(await readFile(new URL(`public${r.src}`,root))),r.sha256);
   assert.ok(Math.abs(r.width/r.height-i.originalDimensions[0]/i.originalDimensions[1])<0.005);
  }
 }
});
