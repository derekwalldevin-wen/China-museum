import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { museums } from '../src/data/museums.ts';
import { museums as baselineMuseums } from '../assets/expansion/baseline-223/museums.ts';
import baselineImages from '../assets/expansion/baseline-223/images.json' with { type: 'json' };
import images from '../src/data/images.json' with { type: 'json' };
import expansion from '../src/data/collection-expansion.json' with { type: 'json' };
import register01 from '../assets/expansion/admission-tranche-01.json' with { type: 'json' };
import register02 from '../assets/expansion/admission-tranche-02.json' with { type: 'json' };
import register03 from '../assets/expansion/admission-tranche-03.json' with { type: 'json' };
import candidates from '../assets/expansion/candidate-register.json' with { type: 'json' };
import processing01 from '../assets/expansion/processing-tranche-01.json' with { type: 'json' };
import processing02 from '../assets/expansion/processing-tranche-02.json' with { type: 'json' };
import processing03 from '../assets/expansion/processing-tranche-03.json' with { type: 'json' };
import pack01 from '../docs/handoff/expansion-600/tranche-01-writing-pack.json' with { type: 'json' };
import pack02 from '../docs/handoff/expansion-600/tranche-02-writing-pack.json' with { type: 'json' };
import pack03 from '../docs/handoff/expansion-600/tranche-03-writing-pack.json' with { type: 'json' };
import baseline253 from '../assets/expansion/baseline-253.json' with { type: 'json' };
import baseline298 from '../assets/expansion/baseline-298.json' with { type: 'json' };
import register04 from '../assets/expansion/admission-tranche-04.json' with { type: 'json' };
import processing04 from '../assets/expansion/processing-tranche-04.json' with { type: 'json' };
import pack04 from '../docs/handoff/expansion-600/tranche-04-writing-pack.json' with { type: 'json' };
import baseline343 from '../assets/expansion/baseline-343.json' with { type: 'json' };
import register05 from '../assets/expansion/admission-tranche-05.json' with { type: 'json' };
import processing05 from '../assets/expansion/processing-tranche-05.json' with { type: 'json' };
import pack05 from '../docs/handoff/expansion-600/tranche-05-writing-pack.json' with { type: 'json' };
import generation from '../docs/audits/museum-data-generation.json' with { type: 'json' };
import museumIndex from '../src/data/museum-index.json' with { type: 'json' };
import searchCorpus from '../src/data/artifact-search.json' with { type: 'json' };
import { searchMuseumIndex } from '../src/data/search.ts';
import { findCollection } from '../src/data/collection.ts';
const root = new URL('../', import.meta.url);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const all = museums.flatMap(museum => museum.artifacts);
const register={admitted:[...register01.admitted,...register02.admitted,...register03.admitted,...register04.admitted,...register05.admitted]};
const processing={items:[...processing01.items,...processing02.items,...processing03.items,...processing04.items,...processing05.items]};
const pack={items:[...pack01.items,...pack02.items,...pack03.items,...pack04.items,...pack05.items]};

test('expansion preserves all 223 existing objects and provenance and counts admissions only', () => {
  assert.equal(baselineMuseums.flatMap(museum => museum.artifacts).length, 223);
  for (const oldMuseum of baselineMuseums) {
    const current = museums.find(museum => museum.id === oldMuseum.id);
    assert.deepEqual({ ...current, artifacts: current.artifacts.slice(0, oldMuseum.artifacts.length) }, oldMuseum);
    for (const artifact of oldMuseum.artifacts) assert.deepEqual(images[artifact.id], baselineImages[artifact.id], artifact.id);
  }
  assert.equal(all.length, 223 + register.admitted.length);
  assert.equal(new Set(all.map(artifact => artifact.id)).size, all.length);
  assert.equal(expansion.target, 600);
  assert.ok(all.length <= expansion.target);
});

test('candidate register has at least 420 distinct official URLs but never masquerades as admissions', () => {
  assert.ok(candidates.candidates.length >= 420);
  assert.equal(new Set(candidates.candidates.map(record => record.sourceUrl)).size, candidates.candidates.length);
  for (const record of candidates.candidates) {
    assert.match(new URL(record.sourceUrl).hostname, /^(www\.)?(chnmuseum\.cn|shenzhenmuseum\.com)$/);
    assert.equal(record.status, 'candidate-detail-unread');
    assert.equal(record.photoAuthorization, 'unknown');
    assert.match(record.catalogueSha256, /^[a-f0-9]{64}$/);
  }
});

test('each admission closes direct evidence and independent AI original/delivery hash chains', async () => {
  const seenOriginals = new Set();
  for (const record of register.admitted) {
    const item = processing.items.find(item => item.id === record.id);
    assert.ok(item.prompt.length > 200);
    assert.equal(item.visualReview, 'approved');
    assert.equal(item.historicalReview, 'pending');
    assert.equal(seenOriginals.has(item.originalSha256), false);
    seenOriginals.add(item.originalSha256);
    assert.equal(sha(await readFile(new URL(item.originalFile, root))), record.originalSha256);
    for (const role of ['card', 'detail']) {
      const info = images[record.id].variants[role];
      assert.equal(info.kind, 'ai');
      assert.equal(info.provenance.type, 'ai');
      assert.equal(info.provenance.references[0].value, record.sourceUrl);
      assert.equal(info.provenance.authorizationStatus, undefined);
      assert.match(info.credit, /非文物实拍/);
      assert.equal(sha(await readFile(new URL(`public${info.src}`, root))), item.roles[role].sha256);
      assert.ok(item.roles[role].width <= item.originalDimensions[0]);
      assert.ok(item.roles[role].height <= item.originalDimensions[1]);
      assert.equal(item.roles[role].upscaled, false);
    }
    const artifact = all.find(artifact => artifact.id === record.id);
    assert.equal(artifact.references[0].url, record.sourceUrl);
    assert.ok(artifact.references[0].supports);
    assert.equal(record.photoAuthorization, 'unknown');
    assert.match(record.evidenceSha256, /^[a-f0-9]{64}$/);
  }
  assert.equal(sha(await readFile(new URL('src/data/collection-expansion.json', root))), generation.expansionSource.sha256);
});

test('DeepSeek pack binds every admitted object and comparison to a real local artifact', () => {
  assert.equal(pack.items.length, register.admitted.length);
  for (const item of pack.items) {
    assert.equal(item.storyStatus, 'summary-only');
    assert.equal(item.imageKind, 'ai');
    assert.ok(all.some(artifact => artifact.id === item.writingNotes.comparison.artifactId));
    for (const field of ['making', 'discovery', 'research']) assert.ok(item.writingNotes[field]);
  }
});

test('first thirty complete through 20 independently evidenced second-tranche objects',async()=>{
  assert.equal(register01.admitted.length,10);
  assert.equal(register02.admitted.length,20);
  assert.deepEqual(register02.pending,[]);
  const categories={};
  const sources=new Set();
  for(const record of register02.admitted){
    const item=pack02.items.find(item=>item.artifact.id===record.id);
    categories[item.artifact.category]=(categories[item.artifact.category]??0)+1;
    assert.ok(!sources.has(record.sourceUrl));sources.add(record.sourceUrl);
    const meta=JSON.parse(await readFile(new URL(`assets/expansion/evidence/${item.evidenceKey}.json`,root),'utf8'));
    const bytes=await readFile(new URL(`assets/expansion/evidence/${item.evidenceKey}.html`,root));
    assert.equal(sha(bytes),record.evidenceSha256);
    assert.equal(meta.url,record.sourceUrl);
    assert.ok(bytes.toString().includes(record.name));
    assert.equal(images[record.id].variants.detail.provenance.promptManifest,'/data/image-processing/expansion-tranche-02.json');
  }
  assert.deepEqual(categories,{'漆器':7,'杂项':4,'织绣':6,'简牍':3});
  const byId=new Map(all.map(a=>[a.id,a]));
  assert.match(byId.get('gb-peony-gold-satin').story,/字段作明.*正文.*清/);
  assert.match(byId.get('hb-heifu-letter').story,/4号墓/);
  assert.match(byId.get('hb-xiaolv-slips').story,/一组.*60枚/);
  assert.equal(byId.get('gg-shen-meique-kesi').inventoryNumber,'故00072691');
  assert.ok(!byId.has('gb-dragon-lacquer-box'));
});

test('second 45 prioritizes 38 city-museum objects and preserves previous 253 exactly',async()=>{
  assert.equal(register03.admitted.length,45);
  assert.deepEqual(register03.pending,[]);
  assert.equal(baseline298.museums.flatMap(m=>m.artifacts).length,298);
  assert.equal(register03.admitted.filter(r=>['chengdu-city','shenzhen-city'].includes(r.museumId)).length,38);
  for(const oldMuseum of baseline253.museums){
    const current=museums.find(m=>m.id===oldMuseum.id);
    assert.deepEqual({...current,artifacts:current.artifacts.slice(0,oldMuseum.artifacts.length)},oldMuseum);
    for(const artifact of oldMuseum.artifacts)assert.deepEqual(images[artifact.id],baseline253.images[artifact.id]);
  }
  const urls=new Set();
  for(const record of register03.admitted){
    const item=pack03.items.find(i=>i.artifact.id===record.id);
    const bytes=await readFile(new URL(`assets/expansion/evidence/${item.evidenceKey}.html`,root));
    const meta=JSON.parse(await readFile(new URL(`assets/expansion/evidence/${item.evidenceKey}.json`,root),'utf8'));
    assert.equal(sha(bytes),record.evidenceSha256);
    assert.equal(meta.url,record.sourceUrl);
    assert.ok(bytes.toString().replaceAll('&ldquo;','“').replaceAll('&rdquo;','”').includes(record.name));
    assert.ok(!urls.has(record.sourceUrl));urls.add(record.sourceUrl);
    assert.equal(images[record.id].variants.detail.provenance.promptManifest,'/data/image-processing/expansion-tranche-03.json');
    assert.equal(images[record.id].variants.detail.review.historical,'pending');
  }
  const byId=new Map(all.map(a=>[a.id,a]));
  assert.match(byId.get('cd-bronze-chess').story,/30枚.*一组/);
  assert.match(byId.get('sz-ewer-basin').story,/一套.*计数/);
  assert.match(byId.get('sz-stone-paddle').story,/大梅沙.*咸头岭.*冲突/);
  assert.match(byId.get('gb-guobao-coin').story,/传1921.*争议/);
  assert.equal(byId.get('gb-jade-bamboo-brushpot').dynasty,'明');
  for(const held of ['sz-six-ear-basin','sz-beast-handle-dou','gb-peacock-inkstone','gb-bamboo-ghost-tube','gb-kaiyuan-coin'])assert.ok(!byId.has(held));
});

test('third 45 preserves 298 objects and all image provenance; grouped objects count once',async()=>{
  assert.equal(register04.admitted.length,45);
  assert.deepEqual(register04.pending,[]);
  assert.equal(baseline343.museums.flatMap(m=>m.artifacts).length,343);
  for(const old of baseline298.museums){const current=museums.find(m=>m.id===old.id);assert.deepEqual({...current,artifacts:current.artifacts.slice(0,old.artifacts.length)},old);for(const a of old.artifacts)assert.deepEqual(images[a.id],baseline298.images[a.id]);}
  assert.equal(register04.admitted.filter(r=>['china-silk','gansu-jiandu'].includes(r.museumId)).length,40);
  for(const record of register04.admitted){const item=pack04.items.find(i=>i.artifact.id===record.id),bytes=await readFile(new URL(`assets/expansion/evidence/${item.evidenceKey}.html`,root));assert.equal(sha(bytes),record.evidenceSha256);assert.ok(bytes.toString().replace(/&ldquo;/g,'“').replace(/&rdquo;/g,'”').replace(/\s+/g,'').includes(record.name.replace(/\s+/g,'')));assert.equal(images[record.id].variants.detail.review.historical,'pending');assert.equal(record.photoAuthorization,'unknown');}
  assert.equal(new Set(processing04.items.map(i=>i.originalSha256)).size,45);
  const byId=new Map(all.map(a=>[a.id,a]));
  assert.match(byId.get('gsjd-medicine-paper').story,/冲突/);
  assert.match(byId.get('gsjd-camel-dispute').story,/没有记载.*计一条/);
  assert.match(byId.get('csm-plain-skirt').story,/纱.*绢/);
  assert.match(byId.get('csm-peony-satin-shoe').story,/一只/);
  assert.match(byId.get('cs-yuyang-cup-box').story,/十个.*一套只计一条/);
  assert.equal(byId.get('csm-blue-waist-pouch').era,'近现代');
  for(const id of ['gansu-jiandu','china-silk']){const m=museums.find(m=>m.id===id);assert.equal(m.artifacts.length,20);assert.ok(m.coord.every(Number.isFinite));}
});

test('third batch is discoverable by exact titles, new museum names and combined filters',()=>{
  for(const record of register04.admitted){const results=searchMuseumIndex(museumIndex,record.name,searchCorpus);assert.equal(results.artifacts[0].artifact.id,record.id,record.name);}
  for(const id of ['gansu-jiandu','china-silk']){const museum=museumIndex.find(m=>m.id===id);assert.equal(searchMuseumIndex(museumIndex,museum.name).museums[0].museum.id,id);}
  const thirdIds=new Set(register04.admitted.map(r=>r.id));
  const silk=findCollection(museumIndex,{era:'明清',category:'织绣',province:'浙江省'}).filter(r=>thirdIds.has(r.artifact.id));
  assert.equal(silk.length,13);
  const hanSlips=findCollection(museumIndex,{era:'秦汉',category:'简牍',province:'甘肃省'}).filter(r=>thirdIds.has(r.artifact.id));
  assert.equal(hanSlips.length,13);
});

test('fourth 45 preserves all 343 records and provenance, closes individual official evidence and independent AI hashes',async()=>{
 assert.equal(register05.admitted.length,45);assert.deepEqual(register05.pending,[]);assert.equal(all.length,388);
 for(const old of baseline343.museums){const current=museums.find(m=>m.id===old.id);assert.deepEqual({...current,artifacts:current.artifacts.slice(0,old.artifacts.length)},old);for(const a of old.artifacts)assert.deepEqual(images[a.id],baseline343.images[a.id]);}
 assert.equal(new Set(processing05.items.map(i=>i.originalSha256)).size,45);
 for(const record of register05.admitted){const item=pack05.items.find(i=>i.artifact.id===record.id),bytes=await readFile(new URL(`assets/expansion/evidence/${item.evidenceKey}.html`,root)),meta=JSON.parse(await readFile(new URL(`assets/expansion/evidence/${item.evidenceKey}.json`,root)));assert.equal(sha(bytes),record.evidenceSha256);assert.equal(meta.url,item.evidenceUrl);assert.ok(bytes.toString().includes(record.name));assert.equal(item.recordUrl,item.sourceUrl);assert.equal(record.photoAuthorization,'unknown');assert.equal(images[record.id].variants.detail.review.historical,'pending');}
 const byId=new Map(all.map(a=>[a.id,a]));
 assert.equal(byId.get('wh-stone-spade').category,'杂项');assert.equal(byId.get('wh-dabu-coin').dynasty,'新莽');
 assert.match(byId.get('cz-red-hairpick').story,/无定论/);assert.match(byId.get('wh-tiger-vessel').story,/争议/);assert.match(byId.get('wh-chengni-inkstone').story,/跨越时代/);assert.match(byId.get('cz-bamboo-comb').story,/仅存一端/);
 for(const [id,count,province]of [['wuhan-city',20,'湖北省'],['changzhou-city',25,'江苏省']]){const m=museums.find(m=>m.id===id);assert.equal(m.artifacts.length,count);assert.equal(m.province,province);assert.ok(m.coord.every(Number.isFinite));}
});

test('fourth batch exact searches, categories and new city entries are discoverable',()=>{
 for(const record of register05.admitted){const results=searchMuseumIndex(museumIndex,record.name,searchCorpus);assert.ok(results.artifacts.some(r=>r.artifact.id===record.id),record.name);}
 for(const id of ['wuhan-city','changzhou-city']){const m=museumIndex.find(m=>m.id===id);assert.equal(searchMuseumIndex(museumIndex,m.name).museums[0].museum.id,id);}
 const ids=new Set(register05.admitted.map(r=>r.id));assert.equal(findCollection(museumIndex,{era:'宋辽金元',category:'漆器',province:'江苏省'}).filter(r=>ids.has(r.artifact.id)).length,12);
});
