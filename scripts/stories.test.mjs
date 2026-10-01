import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
import { museums } from '../src/data/museums.ts';
const data = JSON.parse(readFileSync(new URL('../src/data/stories.json', import.meta.url), 'utf8'));
const batch2 = JSON.parse(readFileSync(new URL('../src/data/stories-batch2.json', import.meta.url), 'utf8'));
const batch3 = JSON.parse(readFileSync(new URL('../src/data/stories-batch3.json', import.meta.url), 'utf8'));
const batch4 = JSON.parse(readFileSync(new URL('../src/data/stories-batch4.json', import.meta.url), 'utf8'));
const batch5 = JSON.parse(readFileSync(new URL('../src/data/stories-batch5.json', import.meta.url), 'utf8'));
const batch6 = JSON.parse(readFileSync(new URL('../src/data/stories-batch6.json', import.meta.url), 'utf8'));
const batch7 = JSON.parse(readFileSync(new URL('../src/data/stories-batch7.json', import.meta.url), 'utf8'));
const batch8 = JSON.parse(readFileSync(new URL('../src/data/stories-batch8.json', import.meta.url), 'utf8'));
const batch9 = JSON.parse(readFileSync(new URL('../src/data/stories-batch9.json', import.meta.url), 'utf8'));
const batch10 = JSON.parse(readFileSync(new URL('../src/data/stories-batch10.json', import.meta.url), 'utf8'));
const batch11 = JSON.parse(readFileSync(new URL('../src/data/stories-batch11.json', import.meta.url), 'utf8'));
const batch12 = JSON.parse(readFileSync(new URL('../src/data/stories-batch12.json', import.meta.url), 'utf8'));
const batch13 = JSON.parse(readFileSync(new URL('../src/data/stories-batch13.json', import.meta.url), 'utf8'));
const batch14 = JSON.parse(readFileSync(new URL('../src/data/stories-batch14.json', import.meta.url), 'utf8'));
const batch15 = JSON.parse(readFileSync(new URL('../src/data/stories-batch15.json', import.meta.url), 'utf8'));
const batch16 = JSON.parse(readFileSync(new URL('../src/data/stories-batch16.json', import.meta.url), 'utf8'));
const batch17 = JSON.parse(readFileSync(new URL('../src/data/stories-batch17.json', import.meta.url), 'utf8'));
const batch18 = JSON.parse(readFileSync(new URL('../src/data/stories-batch18.json', import.meta.url), 'utf8'));
const batch19 = JSON.parse(readFileSync(new URL('../src/data/stories-batch19.json', import.meta.url), 'utf8'));
const batch20 = JSON.parse(readFileSync(new URL('../src/data/stories-batch20.json', import.meta.url), 'utf8'));
const batch21 = JSON.parse(readFileSync(new URL('../src/data/stories-batch21.json', import.meta.url), 'utf8'));
const batch22 = JSON.parse(readFileSync(new URL('../src/data/stories-batch22.json', import.meta.url), 'utf8'));
const batch23 = JSON.parse(readFileSync(new URL('../src/data/stories-batch23.json', import.meta.url), 'utf8'));
const batch24 = JSON.parse(readFileSync(new URL('../src/data/stories-batch24.json', import.meta.url), 'utf8'));
const batch25 = JSON.parse(readFileSync(new URL('../src/data/stories-batch25.json', import.meta.url), 'utf8'));
const batch26 = JSON.parse(readFileSync(new URL('../src/data/stories-batch26.json', import.meta.url), 'utf8'));
const batch27 = JSON.parse(readFileSync(new URL('../src/data/stories-batch27.json', import.meta.url), 'utf8'));
const batch28 = JSON.parse(readFileSync(new URL('../src/data/stories-batch28.json', import.meta.url), 'utf8'));
const batch29 = JSON.parse(readFileSync(new URL('../src/data/stories-batch29.json', import.meta.url), 'utf8'));
const batch31 = JSON.parse(readFileSync(new URL('../src/data/stories-batch31.json', import.meta.url), 'utf8'));
const batch32 = JSON.parse(readFileSync(new URL('../src/data/stories-batch32.json', import.meta.url), 'utf8'));
const batch34 = JSON.parse(readFileSync(new URL('../src/data/stories-batch34.json', import.meta.url), 'utf8'));
const batch35 = JSON.parse(readFileSync(new URL('../src/data/stories-batch35.json', import.meta.url), 'utf8'));
const batch36 = JSON.parse(readFileSync(new URL('../src/data/stories-batch36.json', import.meta.url), 'utf8'));
const batch37 = JSON.parse(readFileSync(new URL('../src/data/stories-batch37.json', import.meta.url), 'utf8'));
const batch38 = JSON.parse(readFileSync(new URL('../src/data/stories-batch38.json', import.meta.url), 'utf8'));
const batch39 = JSON.parse(readFileSync(new URL('../src/data/stories-batch39.json', import.meta.url), 'utf8'));
const batch40 = JSON.parse(readFileSync(new URL('../src/data/stories-batch40.json', import.meta.url), 'utf8'));
const batch42 = JSON.parse(readFileSync(new URL('../src/data/stories-batch42.json', import.meta.url), 'utf8'));
const batch43 = JSON.parse(readFileSync(new URL('../src/data/stories-batch43.json', import.meta.url), 'utf8'));
const batch44 = JSON.parse(readFileSync(new URL('../src/data/stories-batch44.json', import.meta.url), 'utf8'));
const batch45 = JSON.parse(readFileSync(new URL('../src/data/stories-batch45.json', import.meta.url), 'utf8'));
const batch46 = JSON.parse(readFileSync(new URL('../src/data/stories-batch46.json', import.meta.url), 'utf8'));
const batch47 = JSON.parse(readFileSync(new URL('../src/data/stories-batch47.json', import.meta.url), 'utf8'));
const batch48 = JSON.parse(readFileSync(new URL('../src/data/stories-batch48.json', import.meta.url), 'utf8'));
const batch49 = JSON.parse(readFileSync(new URL('../src/data/stories-batch49.json', import.meta.url), 'utf8'));
const batch50 = JSON.parse(readFileSync(new URL('../src/data/stories-batch50.json', import.meta.url), 'utf8'));
const batch51 = JSON.parse(readFileSync(new URL('../src/data/stories-batch51.json', import.meta.url), 'utf8'));
const batch52 = JSON.parse(readFileSync(new URL('../src/data/stories-batch52.json', import.meta.url), 'utf8'));
const batch53 = JSON.parse(readFileSync(new URL('../src/data/stories-batch53.json', import.meta.url), 'utf8'));
const batch54 = JSON.parse(readFileSync(new URL('../src/data/stories-batch54.json', import.meta.url), 'utf8'));
const batch55 = JSON.parse(readFileSync(new URL('../src/data/stories-batch55.json', import.meta.url), 'utf8'));
const batch56 = JSON.parse(readFileSync(new URL('../src/data/stories-batch56.json', import.meta.url), 'utf8'));
const batch57 = JSON.parse(readFileSync(new URL('../src/data/stories-batch57.json', import.meta.url), 'utf8'));
const batch58 = JSON.parse(readFileSync(new URL('../src/data/stories-batch58.json', import.meta.url), 'utf8'));
const batch59 = JSON.parse(readFileSync(new URL('../src/data/stories-batch59.json', import.meta.url), 'utf8'));
const batch60 = JSON.parse(readFileSync(new URL('../src/data/stories-batch60.json', import.meta.url), 'utf8'));
const batch61 = JSON.parse(readFileSync(new URL('../src/data/stories-batch61.json', import.meta.url), 'utf8'));
const batch62 = JSON.parse(readFileSync(new URL('../src/data/stories-batch62.json', import.meta.url), 'utf8'));
const batch63 = JSON.parse(readFileSync(new URL('../src/data/stories-batch63.json', import.meta.url), 'utf8'));
const batch64 = JSON.parse(readFileSync(new URL('../src/data/stories-batch64.json', import.meta.url), 'utf8'));
const batch65 = JSON.parse(readFileSync(new URL('../src/data/stories-batch65.json', import.meta.url), 'utf8'));
const batch66 = JSON.parse(readFileSync(new URL('../src/data/stories-batch66.json', import.meta.url), 'utf8'));
const batch67 = JSON.parse(readFileSync(new URL('../src/data/stories-batch67.json', import.meta.url), 'utf8'));
const batch68 = JSON.parse(readFileSync(new URL('../src/data/stories-batch68.json', import.meta.url), 'utf8'));
const batch69 = JSON.parse(readFileSync(new URL('../src/data/stories-batch69.json', import.meta.url), 'utf8'));
const batch70 = JSON.parse(readFileSync(new URL('../src/data/stories-batch70.json', import.meta.url), 'utf8'));
for (const batch of [batch2, batch3, batch4, batch5, batch6, batch7, batch8, batch9, batch10, batch11, batch12, batch13, batch14, batch15, batch16, batch17, batch18, batch19, batch20, batch21, batch22, batch23, batch24, batch25, batch26, batch27, batch28, batch29, batch31, batch32, batch34, batch35, batch36, batch37, batch38, batch39, batch40, batch42, batch43, batch44, batch45, batch46, batch47, batch48, batch49, batch50, batch51, batch52, batch53, batch54, batch55, batch56, batch57, batch58, batch59, batch60, batch61, batch62, batch63, batch64, batch65, batch66, batch67, batch68, batch69, batch70]) { data.sources.push(...batch.sources); data.trails.push(...batch.trails); data.stories.push(...batch.stories); }
data.stories = [...new Map(data.stories.map(story => [story.id, story])).values()];
const source = readFileSync(new URL('../src/data/story-routes.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { defaultTrailId, readGuideRoute, storyTeaserIndex, writeGuideRoute } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const teaserSource = readFileSync(new URL('../src/data/story-teaser-hooks.ts', import.meta.url), 'utf8');
const teaserJs = ts.transpileModule(teaserSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { storyTeaserHooks } = await import(`data:text/javascript;base64,${Buffer.from(teaserJs).toString('base64')}`);
const objects = new Map(museums.flatMap(m => m.artifacts.map(a => [a.id, a])));
const sources = new Map(data.sources.map(s => [s.id, s]));

test('140 real collection IDs, six curated trails and discoverable standalone stories', () => {
  assert.equal(data.stories.length, 218); assert.equal(data.trails.length, 6);
  const ids = data.stories.map(s => s.id);
  assert.equal(new Set(ids).size, 218);
  const stops = data.trails.flatMap(t => t.ids);
  assert.equal(stops.length, 20); assert.equal(new Set(stops).size, 20);
  assert.ok(stops.every(id => ids.includes(id)));
  assert.deepEqual(ids.filter(id => !stops.includes(id)).sort(), [...batch3.stories, ...batch4.stories, ...batch5.stories, ...batch6.stories, ...batch7.stories, ...batch8.stories, ...batch9.stories, ...batch10.stories, ...batch11.stories, ...batch12.stories, ...batch13.stories, ...batch14.stories, ...batch15.stories, ...batch16.stories, ...batch17.stories, ...batch18.stories, ...batch19.stories, ...batch20.stories, ...batch21.stories, ...batch22.stories, ...batch23.stories, ...batch24.stories, ...batch25.stories, ...batch26.stories, ...batch27.stories, ...batch28.stories, ...batch29.stories, ...batch31.stories, ...batch32.stories, ...batch34.stories, ...batch35.stories, ...batch36.stories, ...batch37.stories, ...batch38.stories, ...batch39.stories, ...batch40.stories, ...batch42.stories, ...batch43.stories, ...batch44.stories, ...batch45.stories, ...batch46.stories, ...batch47.stories, ...batch48.stories, ...batch49.stories, ...batch50.stories, ...batch51.stories, ...batch52.stories, ...batch53.stories, ...batch54.stories, ...batch55.stories, ...batch56.stories, ...batch57.stories, ...batch58.stories, ...batch59.stories, ...batch60.stories, ...batch61.stories, ...batch62.stories, ...batch63.stories, ...batch64.stories, ...batch65.stories, ...batch66.stories, ...batch67.stories, ...batch68.stories, ...batch69.stories, ...batch70.stories].map(s => s.id).sort());
  for (const trail of data.trails) {
    assert.ok(trail.ids.length >= 3 && trail.ids.length <= 4);
    assert.ok(trail.intro && trail.takeaway && trail.question);
  }
  for (const id of ids) assert.ok(objects.has(id), id);
});
test('all story summaries are actually corrected in the original museum collection', () => {
  for (const story of data.stories) assert.equal(objects.get(story.id).story, story.summary);
  assert.match(objects.get('gg-pft').story, /86字/);
  assert.match(objects.get('hub-zhy').story, /五个半八度/);
  assert.doesNotMatch(objects.get('gg-qljs').story, /九百年不褪色/);
  assert.match(objects.get('gg-gzdc').story, /十五层/);
  assert.match(objects.get('gb-jlfw').story, /四千余/);
  assert.doesNotMatch(objects.get('hain-lj').story, /三千年|黄道婆/);
});
test('lightweight route manifest matches every full story without loading the story payload', () => {
  assert.equal(Object.keys(storyTeaserIndex).length, data.stories.length);
  for (const story of data.stories) {
    assert.ok(storyTeaserIndex[story.id]);
    assert.equal(storyTeaserHooks[story.id], story.hook);
    assert.equal(defaultTrailId(story.id), data.trails.find(trail => trail.ids.includes(story.id))?.id ?? null);
  }
});
test('each story has layered content, an extension chapter, at least three details, reflection and scoped source references', () => {
  for (const story of data.stories) {
    assert.equal(story.sections.length, 4); assert.ok(story.details.length >= 3, story.id);
    assert.ok(story.sections.map(p => p.text).join('').length >= 390, story.id);
    for (const block of [story, ...story.sections, ...story.details, story.reflection]) {
      const refs = block.refs ?? block.summaryRefs;
      assert.ok(refs?.length, story.id);
      for (const id of refs) assert.ok(sources.has(id), `${story.id}:${id}`);
    }
    assert.ok(story.uncertainty && story.correction && story.reflection.answer);
  }
});
test('story prose renders as plain text: no markdown emphasis markers leak into the reader', () => {
  const blocks = story => [story.summary, ...story.sections.map(section => section.text), ...story.details.map(detail => `${detail.title}${detail.text}`), story.reflection.question, story.reflection.answer, story.uncertainty, story.correction];
  for (const story of data.stories) {
    for (const text of blocks(story)) {
      assert.doesNotMatch(text, /\*\*|__/, `${story.id} contains markdown emphasis markers`);
      assert.doesNotMatch(text, /\[[^\]]+\]\([^)]+\)/, `${story.id} contains a markdown link`);
    }
  }
});

test('evidence distinguishes museum material from reported interviews and image rights', () => {
  assert.equal(data.sources.length, 518); assert.equal(sources.size, 518);
  for (const source of data.sources) {
    assert.equal(new URL(source.url).protocol, 'https:');
    assert.match(source.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(['search-text','full-text','abstract-and-note'].includes(source.retrieval)); assert.ok(source.supports && source.institution);
    assert.equal(source.authorizationStatus, undefined);
  }
  assert.equal(sources.get('fh').kind, 'reported-interview');
  assert.equal(sources.get('bell-digital').kind, 'museum-research-news');
  assert.match(sources.get('bell-digital').supports, /不代表项目成果已完成/);
  assert.equal(sources.get('bell-memory-register').institution, '湖北省博物馆（国家档案局公开申报材料）');
  assert.match(sources.get('bell-memory-register').supports, /不等于扫描档案开放许可/);
  assert.equal(sources.get('bell-1986-recording').retrieval, 'search-text');
  assert.match(sources.get('bell-1986-recording').supports, /1986年3月/);
  assert.equal(sources.get('pf-authorship-context').retrieval, 'full-text');
  assert.match(sources.get('pf-authorship-context').supports, /不是《平复帖》已经改定作者/);
  assert.equal(sources.get('drum-modern').checkedAt, '2026-09-23');
  assert.equal(sources.get('shiji-huaji').kind, 'primary-source');
  assert.equal(sources.get('yantielun-sb').kind, 'primary-source');
  assert.equal(sources.get('mancheng-report').kind, 'excavation-report');
  assert.equal(sources.get('zeng-report').kind, 'excavation-report');
  assert.match(sources.get('zeng-report').supports, /不是报告全文/);
  assert.equal(sources.get('huaguang-excavation').kind, 'excavation-report');
  assert.equal(sources.get('cup-ritual-study').kind, 'museum-research');
  assert.equal(sources.get('ql-author-research').kind, 'museum-research');
  assert.equal(sources.get('ql-scholar-study').kind, 'museum-research');
  assert.equal(sources.get('b2-crown-compare').kind, 'museum-feature');
  assert.equal(sources.get('mancheng-douwan-seal').kind, 'museum-feature');
  assert.equal(sources.get('bell-archive-exhibit').kind, 'museum-feature');
  assert.equal(sources.get('drum-discovery').kind, 'museum-feature');
  assert.equal(sources.get('sancai-process').kind, 'museum');
  assert.equal(sources.get('pf-donation').kind, 'museum-feature');
  assert.equal(sources.get('b2-ding-excavation').kind, 'government-museum');
  assert.equal(sources.get('b2-ding-feature').kind, 'government-museum');
  assert.equal(sources.get('b2-meiping-catalog').kind, 'museum');
  assert.equal(sources.get('fh-discovery').kind, 'reported-interview');
  assert.match(sources.get('fh-discovery').supports, /不是原始发掘或修复报告/);
  assert.equal(sources.get('qm-restoration').kind, 'museum-research');
  assert.equal(sources.get('qm-copies').kind, 'museum-research');
  assert.equal(sources.get('qm-research').kind, 'museum-research');
  assert.equal(sources.get('qm-debates').kind, 'museum-research');
  assert.equal(sources.get('huaguang-conservation').kind, 'museum-conservation');
  assert.equal(sources.get('huaguang-nmc-research').kind, 'museum-research');
  assert.equal(sources.get('b2-vase-gallery').kind, 'museum-feature');
  assert.equal(sources.get('bell-replica-research').kind, 'museum-research');
  assert.match(sources.get('bell-replica-research').supports, /不是原件修复记录/);
  assert.equal(sources.get('cup-workshop-archive').kind, 'museum-research');
  assert.match(sources.get('cup-workshop-archive').supports, /多件同名器物/);
  assert.equal(sources.get('mancheng-excavation').kind, 'government-archaeology');
  assert.match(sources.get('mancheng-excavation').supports, /不详述长信宫灯单件/);
  assert.equal(sources.get('longxin-display-history').kind, 'government-museum');
  assert.match(sources.get('longxin-display-history').supports, /不等于完整保护修复档案/);
  assert.equal(sources.get('pf-conservation-study').kind, 'formal-research');
  assert.match(sources.get('pf-conservation-study').supports, /转引档案/);
  assert.equal(sources.get('cx-replica-2023').kind, 'government-museum');
  assert.match(sources.get('cx-replica-2023').supports, /复制件/);
  assert.equal(sources.get('bell-chambers').kind, 'museum-research');
  assert.match(sources.get('bell-chambers').supports, /研究解释/);
  assert.equal(sources.get('cup-sui-paintings').kind, 'formal-research');
  assert.match(sources.get('cup-sui-paintings').supports, /不证明画中杯等同/);
  assert.equal(sources.get('camel-wan-study').kind, 'formal-research');
  assert.match(sources.get('camel-wan-study').supports, /载乐与载物两件/);
  assert.equal(sources.get('pf-shoukang-lecture').kind, 'museum-research');
  assert.match(sources.get('pf-donation-exhibit-replica').supports, /不能称原件出展/);
  const sample = id => data.stories.find(story => story.id === id);
  assert.ok(sample('hb-cxd').sections[3].refs.includes('cx-replica-2023'));
  assert.ok(sample('hub-zhy').sections[0].refs.includes('bell-chambers'));
  assert.ok(sample('gg-jgyg').sections[1].refs.includes('cup-sui-paintings'));
  assert.ok(sample('sxl-lt').sections[1].refs.includes('camel-wan-study'));
  assert.ok(sample('gg-pft').sections[2].refs.includes('pf-shoukang-lecture'));
  assert.ok(sample('hub-zhy').details.some(detail => detail.refs.includes('bell-1986-recording')));
  assert.ok(sample('gg-pft').details.some(detail => detail.refs.includes('pf-authorship-context')));
  assert.ok(sample('gg-pft').sections[3].refs.includes('pf-donation-exhibit-replica'));
  assert.equal(sources.get('camel-discovery').kind, 'government-list');
  assert.match(sources.get('camel-discovery').supports, /1959年.*中堡村/);
  assert.match(sources.get('huaguang-conservation').supports, /仅第一阶段结束/);
  assert.equal(sources.get('b2-han-tombs').kind, 'government-archaeology');
  assert.match(sources.get('b2-han-tombs').supports, /未给玉座屏逐件出土位置和修复记录/);
  assert.ok(data.stories.find(story => story.id === 'hb-cxd').sections[0].refs.includes('mancheng-douwan-seal'));
  assert.ok(data.stories.find(story => story.id === 'hub-zhy').sections.at(-1).refs.includes('bell-archive-exhibit'));
  assert.ok(data.stories.find(story => story.id === 'gb-jgs').sections[2].refs.includes('drum-discovery'));
  assert.ok(data.stories.find(story => story.id === 'sxl-lt').sections.at(-1).refs.includes('sancai-process'));
  assert.ok(data.stories.find(story => story.id === 'gg-pft').sections[2].refs.includes('pf-donation'));
  assert.ok(data.stories.find(story => story.id === 'dz-jp').sections.at(-1).refs.includes('b2-ding-feature'));
  assert.ok(data.stories.find(story => story.id === 'nj-mb').sections.at(-1).refs.includes('b2-meiping-catalog'));
  assert.ok(data.stories.find(story => story.id === 'gg-jgyg').sections.at(-1).refs.includes('cup-ritual-study'));
  assert.ok(data.stories.find(story => story.id === 'gg-qljs').sections[2].refs.includes('ql-author-research'));
  assert.ok(data.stories.find(story => story.id === 'gb-jgs').sections.at(-1).refs.includes('shiji-huaji'));
  assert.ok(data.stories.find(story => story.id === 'gg-qmsh').sections.at(-1).refs.includes('dongjing-menghua'));
  assert.ok(data.stories.find(story => story.id === 'gx-yfd').sections[0].refs.includes('fh-discovery'));
  assert.ok(data.stories.find(story => story.id === 'hb-cxd').sections.at(-1).refs.includes('longxin-display-history'));
  assert.ok(data.stories.find(story => story.id === 'hub-zhy').sections.at(-1).refs.includes('bell-replica-research'));
  assert.ok(data.stories.find(story => story.id === 'gg-jgyg').sections[2].refs.includes('cup-workshop-archive'));
  assert.ok(data.stories.find(story => story.id === 'sxl-lt').sections.at(-1).refs.includes('camel-discovery'));
  assert.ok(data.stories.find(story => story.id === 'gg-pft').sections.at(-1).refs.includes('pf-conservation-study'));
  assert.ok(data.stories.find(story => story.id === 'gg-qmsh').sections[2].refs.includes('qm-restoration'));
  assert.ok(data.stories.find(story => story.id === 'gg-qmsh').sections.at(-1).refs.includes('qm-copies'));
  assert.ok(data.stories.find(story => story.id === 'gg-qmsh').sections.at(-1).refs.includes('qm-debates'));
  assert.ok(data.stories.find(story => story.id === 'gg-qmsh').sections[1].refs.includes('qm'));
  assert.ok(data.stories.find(story => story.id === 'gg-gzdc').sections.at(-1).refs.includes('b2-vase-gallery'));
  assert.ok(data.stories.find(story => story.id === 'hain-hgj').sections[0].refs.includes('huaguang-nmc-research'));
  assert.ok(data.stories.find(story => story.id === 'hain-hgj').sections[3].refs.includes('huaguang-nmc-research'));
  assert.ok(data.stories.find(story => story.id === 'hain-hgj').sections.at(-1).refs.includes('huaguang-conservation'));
  assert.ok(data.stories.find(story => story.id === 'dz-yzp').sections[0].refs.includes('b2-han-tombs'));
  assert.match(data.trails.find(trail => trail.id === 'ink').intro, /每一站都问，作品自己留下了什么/);
});

test('thirty-second batch binds actual K5:3 conservation and keeps interpretations bounded', () => {
  const byId = id => data.stories.find(story => story.id === id);
  const mask = byId('sxd-hjm'); const courier = byId('gs-yxt'); const ox = byId('nx-ljt');
  assert.equal(sources.get('b32-mask-report').retrieval, 'full-text');
  assert.match(mask.sections.map(section => section.text).join(''), /K5:3/);
  assert.match(mask.sections.map(section => section.text).join(''), /初步矫形/);
  assert.match(mask.uncertainty, /底衬/);
  assert.doesNotMatch(mask.summary, /总重超一斤|敬神/);
  assert.match(courier.sections.map(section => section.text).join(''), /1982年8月25日/);
  assert.match(courier.uncertainty, /无嘴保密/);
  assert.doesNotMatch(courier.summary, /守密是驿传第一纪律/);
  assert.equal(sources.get('b32-ox-catalog').retrieval, 'search-text');
  assert.match(ox.uncertainty, /MI77、M177与101号墓/);
  assert.doesNotMatch(ox.summary, /盗洞边缘幸存|兴平公主墓/);
});
test('thirty-fourth batch separates object evidence, oral conservation history, kiln type and unresolved dates', () => {
  const byId = id => data.stories.find(story => story.id === id);
  const bottle = byId('tb-yhc'); const ding = byId('hun-dhd'); const bowl = byId('fj-jyz');
  assert.deepEqual(batch34.stories.map(story => story.id), ['tb-yhc','hun-dhd','fj-jyz']);
  assert.match(bottle.uncertainty, /入藏票据/);
  assert.doesNotMatch(bottle.summary, /曹锟|仅数件/);
  assert.match(ding.sections[0].text, /1958年|1959年/);
  assert.match(ding.uncertainty, /修复工单/);
  assert.doesNotMatch(ding.summary, /险被.*回炉/);
  assert.match(bowl.sections[3].title, /复烧不是修复/);
  assert.match(bowl.uncertainty, /准确南宋断代/);
  assert.equal(objects.get('fj-jyz').dynasty, '宋');
  assert.doesNotMatch(bowl.summary, /曜变天目.*母本/);
  for (const story of batch34.stories) {
    assert.equal(story.related.length, 2);
    assert.ok(story.related.every(link => objects.has(link.id)));
  }
});
test('thirty-fifth batch distinguishes two axes, three bottles and an inferred crown owner', () => {
  const byId = id => data.stories.find(story => story.id === id);
  const crown = byId('nm-jgs'); const bottle = byId('fj-kql'); const axe = byId('sd-acy');
  assert.deepEqual(batch35.stories.map(story => story.id), ['nm-jgs','fj-kql','sd-acy']);
  assert.match(crown.sections[0].text, /1972年冬.*1973年春/);
  assert.doesNotMatch(crown.summary, /唯一匈奴王冠|1\.4公斤/);
  assert.match(crown.uncertainty, /具体墓主/);
  assert.match(bottle.sections[0].text, /三只/);
  assert.match(bottle.uncertainty, /原始报告全文/);
  assert.doesNotMatch(bottle.summary, /输入或仿制/);
  assert.match(axe.sections[0].text, /两把/);
  assert.match(axe.uncertainty, /两钺逐件发掘编号/);
  assert.doesNotMatch(axe.summary, /微笑.*杀手/);
  assert.equal(sources.get('b35-shandong-distinction').retrieval, 'full-text');
  assert.equal(sources.get('b35-fujian-report-biblio').retrieval, 'search-text');
  for (const story of batch35.stories) assert.ok(story.related.every(link => objects.has(link.id)));
});
test('thirty-sixth batch separates an object record, later provenance and modern interpretation', () => {
  assert.deepEqual(batch36.stories.map(story => story.id), ['yz-mb','qzx-zyj','kf-tmj']);
  assert.equal(batch36.sources.length, 8);
  const byId = id => data.stories.find(story => story.id === id);
  const bottle = byId('yz-mb'); const exam = byId('qzx-zyj'); const stone = byId('kf-tmj');
  assert.match(bottle.summary, /1984年从扬州市文物商店收购/);
  assert.doesNotMatch(objects.get('yz-mb').story, /18元被收购|估价数十亿|轻工机械厂仓库/);
  assert.equal(sources.get('b36-yangzhou-object').retrieval, 'full-text');
  assert.equal(sources.get('b36-yangzhou-hall').retrieval, 'search-text');
  assert.match(exam.sections[2].text, /不是1983年的捐赠协议/);
  assert.match(exam.sections[3].text, /不表示卷纸曾如何揭裱/);
  assert.doesNotMatch(objects.get('qzx-zyj').story, /秘藏三百余年/);
  assert.match(stone.sections[1].text, /任命.*实际到任/);
  assert.match(stone.uncertainty, /逐件修复工单/);
  assert.doesNotMatch(objects.get('kf-tmj').story, /167年间/);
  for (const story of batch36.stories) {
    assert.equal(objects.get(story.id).story, story.summary);
    assert.equal(readGuideRoute(`?story=${story.id}`)?.storyId, story.id);
    assert.ok(story.sections.every(section => section.refs.length && section.text.length >= 60));
    assert.ok(story.related.every(link => link.reason.length >= 24 && objects.has(link.id)));
  }
});
test('thirty-seventh batch keeps commission, findspot and conflicting records distinct', () => {
  assert.deepEqual(batch37.stories.map(story => story.id), ['xa-scm','xa-dqz','qzx-yzb']);
  assert.equal(batch37.sources.length, 8);
  const byId = id => data.stories.find(story => story.id === id);
  assert.doesNotMatch(objects.get('xa-scm').story, /蓝釉为主|价值连城|孤品级/);
  assert.match(byId('xa-scm').sections[2].text, /不足以查出/);
  assert.match(byId('xa-dqz').sections[1].text, /敬造.*发愿与供养/);
  assert.match(byId('xa-dqz').uncertainty, /1972\/1974异说/);
  assert.match(byId('qzx-yzb').sections[2].text, /1982年.*1986年/);
  assert.match(byId('qzx-yzb').uncertainty, /篆\/隶书体异说/);
  for (const story of batch37.stories) {
    assert.equal(objects.get(story.id).story, story.summary);
    assert.equal(readGuideRoute(`?story=${story.id}`)?.storyId, story.id);
    assert.ok(story.sections.every(section => section.refs.length && section.text.length >= 60));
    assert.ok(story.related.every(link => objects.has(link.id) && link.reason.length >= 24));
  }
});
test('thirty-eighth batch keeps group protection, replica, and tower legend separate', () => {
  assert.deepEqual(batch38.stories.map(story => story.id), ['cs-dhj','ah-czd','yn-jcn']);
  assert.equal(batch38.sources.length, 9);
  const byId = id => data.stories.find(story => story.id === id);
  assert.match(byId('cs-dhj').sections[1].text, /6859.*6862/);
  assert.match(byId('cs-dhj').uncertainty, /口径差异/);
  assert.doesNotMatch(objects.get('cs-dhj').story, /连续行政档案|地铁施工/);
  assert.match(byId('ah-czd').sections[3].text, /高仿.*不能.*原件图像/);
  assert.doesNotMatch(objects.get('ah-czd').story, /能煮一头牛|仅次于后母戊鼎/);
  assert.match(byId('yn-jcn').sections[2].text, /地方传说/);
  assert.match(byId('yn-jcn').sections[3].text, /塔体的修缮工程.*不等于鸟像本身的保护史/);
  for (const story of batch38.stories) {
    assert.equal(objects.get(story.id).story, story.summary);
    assert.equal(readGuideRoute(`?story=${story.id}`)?.storyId, story.id);
    assert.ok(story.sections.every(section => section.refs.length && section.text.length >= 60));
    assert.ok(story.related.every(link => objects.has(link.id) && link.reason.length >= 24));
  }
});
test('fourteenth batch corrects object identity and keeps conservation attribution item-specific', () => {
  const byId = id => data.stories.find(story => story.id === id);
  assert.deepEqual(batch14.stories.map(s => s.id), ['ny-sly','js-sjc','js-hjm','sxd-jz','sxd-zym']);
  for (const story of batch14.stories) {
    assert.ok(story.sections[0].text.length >= 60 && story.sections[0].refs.length >= 1);
    assert.ok(story.sections.slice(1).every(section => section.refs.length >= 1));
    assert.equal(story.related.length, 2);
  }
  assert.match(objects.get('js-hjm').story, /2007年8号遗迹/);
  assert.doesNotMatch(objects.get('js-hjm').story, /小金面|19.5厘米/);
  assert.doesNotMatch(objects.get('sxd-zym').story, /千里眼|16厘米|蚕丛神像/);
  assert.doesNotMatch(objects.get('sxd-jz').story, /世界同期最长|完全独立/);
  assert.match(byId('sxd-zym').sections[3].text, /2008年.*未列编号/);
});
test('priority stories separate object facts, research interpretation and modern circulation', () => {
  const byId = id => data.stories.find(story => story.id === id);
  assert.match(byId('gx-yfd').sections[0].text, /偶然发现—上报调查—批准发掘/);
  assert.match(byId('gx-yfd').uncertainty, /修复档案/);
  assert.match(byId('gg-qmsh').sections[2].text, /1973年重新修裱/);
  assert.match(byId('gg-qmsh').sections[3].text, /提出问题的方法/);
  assert.match(byId('gg-qmsh').sections[1].text, /界画笔法/);
  assert.match(byId('gg-qmsh').sections[3].text, /所绘是否汴京/);
  assert.match(byId('gg-gzdc').sections[1].text, /高温部分先烧/);
  assert.match(byId('gg-gzdc').sections[3].text, /1952年建立/);
  assert.match(byId('gg-gzdc').uncertainty, /完整的烧造次数.*都没有/);
  assert.match(byId('hain-hgj').sections[0].text, /1996年/);
  assert.match(byId('hain-hgj').sections[1].text, /511块/);
  assert.match(byId('hain-hgj').sections[3].text, /第一阶段结束/);
  assert.match(byId('dz-yzp').sections[2].text, /研究解释/);
  assert.match(byId('dz-yzp').uncertainty, /现代修复档案/);
  assert.match(byId('hb-cxd').sections.at(-1).text, /具体修复时间和技术仍待核/);
  assert.match(byId('hub-zhy').sections.at(-1).text, /复制成功说的是复制件做成了，原件的修复是另一回事/);
  assert.match(byId('gg-jgyg').sections[2].text, /不能把每条指令都归给这一只杯/);
  assert.match(byId('sxl-lt').sections.at(-1).text, /1959年中堡村出土的陕西馆藏件与1957年国博同题材件分列为两项/);
  assert.match(byId('gg-pft').sections.at(-1).text, /论文转引故宫文保档案/);
  assert.match(byId('gg-pft').uncertainty, /未见论文及档案全文/);
  assert.match(byId('gg-jgyg').related[0].reason, /一个记愿望，一个记声音/);
  assert.match(byId('hub-zhy').related[0].reason, /一个回答声音，一个回答表演/);
  assert.match(byId('sxl-lt').related[0].reason, /都在安排你看的顺序/);
});
test('five deepened stories separate identity, object, replica, preservation and interpretation', () => {
  const byId = id => data.stories.find(story => story.id === id);
  assert.match(byId('hb-cxd').sections[0].text, /宫女.*不等于.*窦绾/);
  assert.match(byId('hb-cxd').sections[1].text, /零排放/);
  assert.ok(byId('hb-cxd').sections[1].refs.includes('cx-guest'));
  assert.match(byId('hub-zhy').sections[0].text, /十九件钮钟.*四十五件甬钟/);
  assert.match(byId('hub-zhy').sections[3].text, /复制件为演奏核心/);
  assert.ok(byId('hub-zhy').sections[3].refs.includes('bell-orchestra'));
  assert.match(byId('gg-jgyg').sections[1].text, /嘉庆十二年/);
  assert.match(byId('gg-jgyg').uncertainty, /故00011674/);
  assert.ok(byId('gg-jgyg').sections[1].refs.includes('cup-ritual-record'));
  assert.match(byId('sxl-lt').sections[0].text, /1959年.*1957年/);
  assert.ok(byId('sxl-lt').sections[3].refs.includes('camel-2025-care'));
  assert.match(byId('gg-pft').sections[0].text, /身份.*仍有讨论/);
  assert.match(byId('gg-pft').sections[1].text, /八十四字/);
  assert.match(byId('gg-pft').sections[3].text, /复制品展出/);
  assert.equal(sources.get('pf-identity-debate').kind, 'museum-research');
  assert.equal(sources.get('pf-rest-display').kind, 'museum-feature');
  assert.equal(sources.get('camel-2025-care').kind, 'museum-feature');
  for (const id of ['hb-cxd','hub-zhy','gg-jgyg','sxl-lt','gg-pft']) {
    assert.ok(byId(id).related.length >= 2, id);
    assert.match(byId(id).uncertainty, /未|不|仍/);
  }
});
test('related links always resolve and explain a curated comparison, not invented direct history', () => {
  for (const story of data.stories) for (const relation of story.related) {
    assert.notEqual(story.id, relation.id);
    assert.ok(data.stories.some(s => s.id === relation.id));
    assert.equal(relation.type, 'curatorial-comparison'); assert.ok(relation.reason.length >= 20);
  }
});
test('new standalone stories preserve findspots, uncertainty and comparison boundaries', () => {
  const byId = id => data.stories.find(story => story.id === id);
  assert.equal(batch3.stories.length, 5);
  assert.match(byId('gg-jgb').sections[1].text, /这一类工艺的通行说明.*不是这只杯自己的烧窑日志/);
  assert.match(byId('gg-ryzl').uncertainty, /在馆方两个页面间存在异数/);
  assert.match(byId('gb-gyts').sections[2].text, /1978年/);
  assert.match(byId('gb-cxct').sections[3].text, /1958年/);
  assert.match(byId('gb-yygd').uncertainty, /未给具体墓号/);
  assert.match(byId('sb-jd').sections[0].text, /253号墓/);
  assert.match(byId('sb-bjl').sections[0].text, /251号墓/);
  assert.match(byId('sb-bjl').correction, /牛角兽面纹/);
  for (const story of batch3.stories) {
    assert.match(story.uncertainty, /档案|报告|记录/);
    assert.ok(story.related.length >= 2);
    assert.equal(readGuideRoute(`?story=${story.id}`)?.trailId, null);
  }
});
test('bronze batch separates dated evidence, estimates, repair reports and research inference', () => {
  const byId = id => data.stories.find(story => story.id === id);
  assert.equal(batch4.stories.length, 4);
  assert.equal(batch4.sources.length, 9);
  assert.match(byId('gb-hmwd').sections[1].text, /后世的技术推算/);
  assert.match(byId('gb-hmwd').uncertainty, /原始现场档案/);
  assert.match(byId('gb-syz').sections[2].text, /二十余块/);
  assert.match(byId('gb-syz').uncertainty, /修复工作日志/);
  assert.match(byId('sh-dkd').sections[2].text, /清光绪中期/);
  assert.doesNotMatch(byId('sh-dkd').summary, /^1890年/);
  assert.match(byId('sx-nz').sections[0].text, /没有直接写“燮父”/);
  assert.match(byId('sx-nz').uncertainty, /114号墓的完整发掘报告.*没有核读/);
  assert.equal(sources.get('b4-jin-interview').kind, 'reported-interview');
  for (const story of batch4.stories) {
    assert.equal(readGuideRoute(`?story=${story.id}`)?.trailId, null);
    assert.ok(story.related.length >= 2);
  }
});
test('fifth batch keeps distinct inscriptions, objects, disputed methods and later retellings', () => {
  const byId = id => data.stories.find(story => story.id === id);
  assert.equal(batch5.stories.length, 5);
  assert.equal(batch5.sources.length, 11);
  assert.match(byId('sh-sqf').sections[2].text, /公元前221年/);
  assert.match(byId('sh-sqf').sections[1].text, /公元前344年/);
  assert.match(byId('hn-fhxz').uncertainty, /原补比例/);
  assert.doesNotMatch(byId('hn-fhxz').summary, /第一位女将军/);
  assert.match(byId('hn-ywtj').sections[2].text, /反对意见/);
  assert.match(byId('hun-mfl').sections[2].text, /洽购团队赶在预定拍卖之前/);
  assert.match(byId('zj-fcst').sections[2].text, /后世流传故事/);
  assert.match(byId('zj-fcst').sections[3].text, /没有物理粘回/);
  for (const story of batch5.stories) {
    assert.equal(readGuideRoute(`?story=${story.id}`)?.trailId, null);
    assert.ok(story.related.length >= 2);
    for (const relation of story.related) {
      assert.ok(objects.has(relation.id));
      assert.ok(data.stories.some(candidate => candidate.id === relation.id));
      assert.ok(relation.reason.length >= 24);
    }
  }
});
test('sixth batch exposes directly scoped evidence and contradictory catalog claims', () => {
  const byId = id => data.stories.find(story => story.id === id);
  assert.equal(batch6.stories.length, 4);
  assert.equal(batch6.sources.length, 10);
  assert.match(byId('hn-jhg').summary, /1987年/);
  assert.match(byId('hn-jhg').uncertainty, /尺寸互异/);
  assert.match(byId('hn-jhg').sections[2].text, /六个音级/);
  assert.match(byId('hn-wzt').sections[2].text, /简文本身没有/);
  assert.match(byId('hn-lhfh').summary, /河南件通高117厘米/);
  assert.match(byId('hn-lhfh').sections[2].text, /现代名言/);
  assert.match(byId('sh-syt').summary, /唐代摹本/);
  assert.match(byId('sh-syt').uncertainty, /两篇馆刊/);
  assert.equal(sources.get('b6-jiahu-paper').retrieval, 'full-text');
  assert.equal(sources.get('b6-gold-ritual').retrieval, 'abstract-and-note');
  for (const story of batch6.stories) {
    assert.equal(readGuideRoute(`?story=${story.id}`)?.trailId, null);
    assert.ok(story.related.length >= 2);
    assert.match(story.uncertainty, /未|未知|不同/);
    for (const relation of story.related) assert.ok(relation.reason.length >= 24);
  }
});
test('source panel discloses actual retrieval depth instead of claiming every source was read in full', () => {
  const component = readFileSync(new URL('../src/components/StoryExperience.tsx', import.meta.url), 'utf8');
  assert.match(component, /仅核读摘要与注释/);
  assert.match(component, /仅核读可检索片段/);
  assert.match(component, /source\.retrieval/);
  assert.doesNotMatch(component, /检索返回的来源正文已核读/);
});
test('story URLs preserve the original museum, artifact, filters and unrelated parameters', () => {
  const search = 'province=北京市&museum=gugong&artifact=gg-qmsh&era=宋辽金元&category=书画&region=北京市&campaign=family';
  const params = new URLSearchParams(search);
  const route = { trailId:'light', storyId:'gx-yfd' };
  writeGuideRoute(params, route); assert.deepEqual(readGuideRoute(params.toString()), route);
  for (const [key, value] of new URLSearchParams(search)) assert.equal(params.get(key), value);
  writeGuideRoute(params, null); assert.equal(readGuideRoute(params.toString()), null);
  assert.deepEqual([...params], [...new URLSearchParams(search)]);
});
test('invalid story IDs and incompatible trails are safely normalized', () => {
  assert.equal(readGuideRoute('?story=not-an-artifact&trail=unknown'), null);
  assert.deepEqual(readGuideRoute('?story=gg-qmsh&trail=light'), { storyId:'gg-qmsh', trailId:'ink' });
  assert.deepEqual(readGuideRoute('?guide=1&story=not-an-artifact'), { storyId:null, trailId:null });
  assert.deepEqual(readGuideRoute('?trail=music'), { storyId:null, trailId:'music' });
  assert.deepEqual(readGuideRoute('?story=sb-jd&trail=ink'), { storyId:'sb-jd', trailId:null });
});
test('AI scroll artwork cannot enter the original scroll reading desk', () => {
  const component = readFileSync(new URL('../src/components/ArtifactCard.tsx', import.meta.url), 'utf8');
  assert.match(component, /artifact.shape === 'scroll' && usePhoto && activeImage.kind !== 'ai'/);
});
test('five priority stories separate artifact evidence, institutional history and unresolved conservation', () => {
  const byId = id => data.stories.find(story => story.id === id);
  assert.match(byId('hb-cxd').sections[0].text, /两座墓|北侧窦绾墓|窦绾墓在刘胜墓北约120米/);
  assert.match(byId('hb-cxd').sections[1].text, /不等于已知/);
  assert.ok(byId('hb-cxd').related.some(link => link.id === 'hb-jly' && /两墓/.test(link.reason)));
  assert.equal(sources.get('bell-excavation-timeline').institution, '湖北省文物考古研究院');
  assert.match(byId('hub-zhy').sections[0].text, /1978年5月上旬至9月/);
  assert.match(byId('hub-zhy').uncertainty, /1982、1983与1984年/);
  assert.match(byId('gg-jgyg').sections[2].text, /多件同名杯/);
  assert.match(byId('gg-jgyg').uncertainty, /故00011674/);
  assert.match(byId('sxl-lt').sections[2].text, /演出合同/);
  assert.match(byId('sxl-lt').sections[3].text, /不能写成.*逐件履历/);
  assert.match(byId('gg-pft').sections[2].text, /文物局拨交/);
  assert.match(byId('gg-pft').sections[3].text, /未读档案原件或论文全文/);
  for (const id of ['hb-cxd','hub-zhy','gg-jgyg','sxl-lt','gg-pft']) {
    const story = byId(id);
    assert.equal(story.sections.length, 4);
    assert.ok(story.related.every(link => objects.has(link.id) && link.reason.length >= 24));
    assert.ok(story.sections.every(section => section.refs.every(ref => sources.has(ref))));
  }
});
test('five sample-story refinements bind new claims to direct sources and retain unknowns', () => {
  const byId = id => data.stories.find(story => story.id === id);
  assert.match(byId('hb-cxd').sections[0].text, /北约120米/);
  assert.ok(byId('hb-cxd').sections[0].refs.includes('mancheng-excavation'));
  assert.match(byId('hub-zhy').sections[1].text, /鼓部正面、侧面/);
  assert.ok(byId('hub-zhy').sections[3].refs.includes('bell-orchestra-timeline'));
  assert.match(byId('hub-zhy').uncertainty, /原钟逐件修复日志/);
  assert.match(byId('gg-jgyg').sections[3].text, /故00011674号.*三次近年展览/);
  assert.ok(byId('gg-jgyg').sections[3].refs.includes('cup-exhibitions'));
  assert.match(byId('gg-jgyg').uncertainty, /未附登记号的囊匣专题/);
  assert.match(byId('sxl-lt').sections[3].text, /2018年改造后.*2025年10月19日/);
  assert.match(byId('sxl-lt').uncertainty, /逐次修复日志未核/);
  assert.ok(byId('gg-pft').sections[1].refs.includes('pf-material-study'));
  assert.match(byId('gg-pft').sections[1].text, /不是该帖墨锭成分的实验报告/);
  assert.match(byId('gg-pft').uncertainty, /未见论文及档案全文/);
});
test('five priority stories distinguish collection identity, site protection and modern display', () => {
  const byId = id => data.stories.find(story => story.id === id);
  const lamp = byId('hb-cxd');
  assert.match(lamp.sections[3].text, /宫灯埋在哪里的位置.*不是它在汉代宫室里摆在哪里的位置/);
  assert.ok(lamp.sections[3].refs.includes('mancheng-excavation'));
  const bell = byId('hub-zhy');
  assert.match(bell.sections[3].text, /墓坑原址保护.*治理水患/);
  assert.match(bell.sections[3].text, /不是修复六十五件编钟/);
  assert.ok(bell.sections[3].refs.includes('bell-replica-research'));
  const cup = byId('gg-jgyg');
  assert.match(cup.sections[3].text, /故雜005490N000000000/);
  assert.match(cup.uncertainty, /精确档号对应与尺寸差异都还待核/);
  assert.ok(cup.sections[3].refs.includes('cup-taipei-comparison'));
  assert.equal(sources.get('cup-taipei-comparison').retrieval, 'full-text');
  assert.match(byId('sxl-lt').sections[3].text, /撤陈、养护与布展.*不能写成.*逐件履历/);
  assert.match(byId('gg-pft').sections[3].text, /题签、装潢与西晋原信纸属于不同层次/);
  assert.ok(byId('gg-pft').sections[3].refs.includes('pf-2022-catalogue'));
  assert.match(byId('gg-pft').related[0].reason, /原信、题签和摹本/);
});
test('five evidence cards distinguish object records, later display and unverified conservation', () => {
  const byId = id => data.stories.find(story => story.id === id);
  const cards = ['hb-cxd','hub-zhy','gg-jgyg','sxl-lt','gg-pft'].map(id => byId(id).details[3]);
  assert.ok(cards.every(card => card && card.refs.every(ref => sources.has(ref))));
  assert.match(cards[0].text, /随葬位置不能反推/);
  assert.match(cards[1].text, /3D扫描.*原钟修复是四件不同的事/);
  assert.match(cards[2].text, /展览.*不能代替.*修复工单/);
  assert.match(cards[3].text, /馆藏和图片不能互换/);
  assert.match(cards[4].text, /原档未核/);
  assert.ok(byId('hb-cxd').related.some(link => link.id === 'gg-jgyg' && /不等于存在直接工艺传承/.test(link.reason)));
  assert.ok(byId('hub-zhy').sections[3].refs.includes('bell-memory-register'));
});
test('five priority evidence cards add scoped display, education and comparison without invented restoration', () => {
  const byId = id => data.stories.find(story => story.id === id);
  const last = id => byId(id).details.at(-1);
  assert.match(last('hb-cxd').text, /虚拟发掘.*与1968年的现场记录相差很远/);
  assert.ok(last('hb-cxd').refs.includes('longxin-digital-2026'));
  assert.match(byId('hub-zhy').details.find(detail => detail.title === '从随县汇报到原件赴京').text, /1979年9月20日原钟首次赴京/);
  assert.ok(byId('hub-zhy').details.some(detail => detail.refs.includes('bell-archive-exhibit')));
  assert.match(last('hub-zhy').text, /1986年3月曾以原钟录制/);
  assert.equal(sources.get('bell-archive-exhibit').retrieval, 'full-text');
  assert.match(last('gg-jgyg').text, /同名杯有四件.*不能.*自动归到北京/);
  assert.match(last('sxl-lt').text, /2024年暑期课程.*属于2024年的课堂/);
  assert.equal(sources.get('camel-education-2024').retrieval, 'full-text');
  assert.match(byId('gg-pft').details.find(detail => /三种.*保存/.test(detail.title)).text, /修裱、拍摄与以复制件代展是三个不同动作/);
  assert.match(last('gg-pft').text, /作者讨论不是改定结论|改定作者的决定性证据/);
  assert.match(byId('gg-pft').details[0].text, /顾荣、全彦先/);
  assert.equal(sources.get('pf-conservation-study').retrieval, 'search-text');
  for (const id of ['hb-cxd','hub-zhy','gg-jgyg','sxl-lt','gg-pft']) {
    assert.ok(last(id).refs.every(ref => sources.has(ref)));
  }
});
test('priority story evidence refresh uses direct institutional records without inventing repairs', () => {
  const byId = id => data.stories.find(story => story.id === id);
  assert.match(sources.get('longxin-display-history').url, /^https:\/\/wenwu\.hebei\.gov\.cn\//);
  assert.match(byId('hb-cxd').sections[3].text, /4月29日回到河北博物院.*不能由此推断运输包装/);
  assert.match(byId('hub-zhy').sections[3].text, /恒温恒湿展厅.*预防性保护的申报陈述/);
  assert.match(sources.get('cup-sui-paintings').url, /^https:\/\/www\.dpm\.org\.cn\/Uploads\/File\//);
  assert.match(byId('gg-jgyg').sections[1].text, /宫廷画是经过经营的图像，研究论文则是今日的解释/);
  assert.match(sources.get('camel-discovery').url, /^https:\/\/wwj\.beijing\.gov\.cn\//);
  assert.match(sources.get('camel-guobo').url, /^https:\/\/www\.chnmuseum\.cn\//);
  assert.match(byId('sxl-lt').sections[0].text, /故事化写法.*不能搬成陕西馆这件的制作实录/);
  assert.match(byId('gg-pft').sections[3].text, /未读档案原件或论文全文/);
  for (const id of ['hb-cxd', 'hub-zhy', 'gg-jgyg', 'sxl-lt', 'gg-pft']) {
    assert.ok(byId(id).related.every(link => link.reason.length >= 24));
  }
});
test('five priority stories add scoped research and excavation evidence without converting inference into object fact', () => {
  const byId = id => data.stories.find(story => story.id === id);
  assert.equal(sources.get('cx-lamp-research-2024').retrieval, 'search-text');
  assert.match(byId('hb-cxd').sections[1].text, /类型研究.*不是本灯留存水迹/);
  assert.ok(byId('hb-cxd').sections[1].refs.includes('cx-lamp-research-2024'));
  assert.match(byId('hub-zhy').sections[0].text, /1978年3月6日.*1978年5月/);
  assert.ok(byId('hub-zhy').sections[0].refs.includes('bell-1978-field-documents'));
  assert.match(byId('gg-jgyg').sections[0].text, /龙耳并不罕见.*象鼻为足/);
  assert.match(byId('sxl-lt').sections[0].text, /淤泥冲动.*转录并非原刊扫描/);
  assert.equal(sources.get('camel-1960-excavation-transcript').retrieval, 'full-text');
  assert.match(sources.get('camel-1960-excavation-transcript').supports, /非原刊扫描.*OCR疑字/);
  assert.ok(byId('sxl-lt').sections[0].refs.includes('camel-1960-excavation-transcript'));
  assert.match(byId('gg-pft').sections[0].text, /恐难平复.*不等于陆机在信纸上写下作品标题/);
  assert.ok(byId('gg-pft').sections[0].refs.includes('pf-rest-display'));
});
test('five priority objects keep newly checked source depth and interpretive boundaries aligned', () => {
  const byId = id => data.stories.find(story => story.id === id);
  assert.match(byId('hb-cxd').details[0].text, /不能据此认定本灯留下水迹/);
  assert.ok(byId('hb-cxd').details[0].refs.includes('cx-lamp-research-2024'));
  assert.match(byId('hub-zhy').details[1].text, /不是同时自动发出两音/);
  assert.equal(sources.get('cup').retrieval, 'full-text');
  assert.match(byId('gg-jgyg').details[1].text, /不按隔离旧图逐颗数珠石/);
  assert.match(byId('sxl-lt').details[2].text, /网络转录.*OCR疑字.*原刊图版/);
  assert.match(byId('sxl-lt').uncertainty, /网络转录全文而非原刊扫描/);
  assert.equal(sources.get('pf').retrieval, 'full-text');
  assert.match(byId('gg-pft').details[3].text, /尾纸位于后隔水之后.*保护画心/);
});
test('seventh batch corrects four collection myths and keeps conservation evidence scoped', () => {
  const byId = id => data.stories.find(story => story.id === id);
  assert.equal(batch7.stories.length, 2);
  assert.equal(batch7.sources.length, 10);
  assert.match(byId('hub-ywj').summary, /望山一号楚墓/);
  assert.doesNotMatch(byId('hub-ywj').summary, /二十余层纸/);
  assert.match(byId('hub-ywj').uncertainty, /从越到楚的具体路线/);
  assert.match(byId('hub-zp').summary, /尊和盘两件组成/);
  assert.match(byId('hub-zp').sections[2].text, /工业CT研究成果/);
  assert.doesNotMatch(byId('hub-zp').summary, /失蜡法铸造/);
  assert.match(byId('sxd-qs').sections[0].text, /断成三段/);
  assert.match(byId('sxd-qs').sections[3].text, /有限元/);
  assert.match(byId('sxd-qs').uncertainty, /无法唯一判定/);
  assert.match(byId('js-tysn').sections[2].text, /蜀绣制品/);
  assert.match(byId('js-tysn').uncertainty, /解释层/);
  for (const story of batch7.stories) {
    assert.equal(readGuideRoute(`?story=${story.id}`)?.trailId, null);
    assert.ok(story.related.length >= 2);
    for (const relation of story.related) {
      assert.ok(objects.has(relation.id));
      assert.ok(data.stories.some(candidate => candidate.id === relation.id));
      assert.ok(relation.reason.length >= 24);
    }
  }
  assert.equal(sources.get('b7-tree-repair').retrieval, 'full-text');
  assert.equal(sources.get('b7-sword-context').retrieval, 'search-text');
});
test('eighth batch separates find contexts, scholarly interpretation, reproductions and object conservation', () => {
  const byId = id => data.stories.find(story => story.id === id);
  assert.equal(batch8.stories.length, 4);
  assert.equal(batch8.sources.length, 14);
  assert.match(byId('hub-qj').summary, /201枚.*1155枚/);
  assert.doesNotMatch(byId('hub-qj').summary, /基层法官|枕着/);
  assert.match(byId('hub-qj').sections[3].text, /普及本/);
  assert.match(byId('hub-qj').sections[3].text, /旧AI示意图呈碑状.*竹简实物形制不符/);
  assert.equal(sources.get('b8-qin-yushu').retrieval, 'abstract-and-note');
  assert.ok(byId('hun-tbh').sections[1].refs.length >= 1 && byId('hun-tbh').sections[1].text.length >= 60);
  assert.match(byId('hun-tbh').sections[3].text, /复制品/);
  assert.equal(byId('hun-tbh').related[1].id, 'sx-qh');
  assert.doesNotMatch(byId('hun-tbh').related.map(item => item.reason).join(''), /皿方罍|同一墓葬系统里的图像与漆器/);
  assert.match(byId('hun-ssd').summary, /49克.*48克/);
  assert.doesNotMatch(byId('hun-ssd').summary, /13年|0\.5克|火柴盒/);
  assert.match(byId('sxd-dlr').sections[2].text, /1997年.*铜螺钉.*八块残片/);
  assert.ok(byId('sxd-dlr').sections[2].refs.includes('b8-figure-conservation'));
  assert.equal(sources.get('b8-figure-conservation').kind, 'formal-conservation-report');
  for (const story of batch8.stories) {
    assert.equal(readGuideRoute(`?story=${story.id}`)?.trailId, null);
    assert.ok(story.related.length >= 2);
    for (const relation of story.related) {
      assert.ok(objects.has(relation.id));
      assert.ok(data.stories.some(candidate => candidate.id === relation.id));
      assert.ok(relation.reason.length >= 24);
    }
  }
});
test('ninth batch distinguishes grouped slips and terracotta types from a specific object', () => {
  const byId = id => data.stories.find(story => story.id === id);
  assert.equal(batch9.stories.length, 3);
  assert.equal(batch9.sources.length, 12);
  assert.match(byId('sd-szb').summary, /两种兵书文本/);
  assert.match(byId('sd-szb').uncertainty, /全文本轮未核读/);
  assert.equal(sources.get('b9-silver-protection').retrieval, 'search-text');
  assert.match(byId('cs-zml').summary, /十万余枚/);
  assert.match(byId('cs-zml').sections[0].text, /早期估数/);
  assert.match(byId('cs-zml').sections[2].text, /原来的次序能不能完全复原/);
  assert.match(byId('qs-by').sections[3].text, /还缺一个编号/);
  assert.match(byId('qs-by').uncertainty, /图像与具体俑号还没有对上/);
  assert.match(objects.get('sx-hmms').story, /主盟人有赵鞅、赵嘉等不同解释/);
  assert.doesNotMatch(objects.get('sx-hmms').story, /赵鞅主持|现存最早/);
  for (const story of batch9.stories) {
    assert.equal(readGuideRoute(`?story=${story.id}`)?.trailId, null);
    assert.ok(story.related.length >= 2);
    assert.ok(story.sections.every(section => section.refs.length && section.text.length >= 60));
  }
});
test('tenth batch separates inscription, casting, textile evidence from contested readings', () => {
  const byId = id => data.stories.find(story => story.id === id);
  assert.equal(batch10.stories.length, 3);
  assert.equal(batch10.sources.length, 12);
  assert.match(byId('bj-hz').summary, /不是现代国名/);
  assert.match(byId('bj-hz').uncertainty, /五祀.*分歧/);
  assert.match(byId('gs-tbm').sections[1].text, /分段陶范铸接/);
  assert.match(byId('gs-tbm').sections[3].text, /口述|回忆/);
  assert.match(byId('xj-wxc').sections[2].text, /护身符说/);
  assert.match(byId('xj-wxc').sections[3].text, /不等于.*出土原件/);
  assert.match(byId('xj-wxc').uncertainty, /不能唯一确定/);
  assert.equal(sources.get('b10-horse-restoration').kind, 'museum-conservation-history');
  assert.equal(sources.get('b10-star-weave').kind, 'museum-research');
  for (const story of batch10.stories) {
    assert.equal(readGuideRoute(`?story=${story.id}`)?.trailId, null);
    assert.ok(story.sections.every(section => section.refs.length && section.text.length >= 60));
    assert.ok(story.related.length >= 2);
    for (const relation of story.related) {
      assert.ok(data.stories.some(candidate => candidate.id === relation.id));
      assert.ok(relation.reason.length >= 24);
    }
  }
});
test('eleventh batch distinguishes excavation, transmission, inscription counts and object repair', () => {
  const byId = id => data.stories.find(story => story.id === id);
  assert.equal(batch11.stories.length, 3);
  assert.equal(batch11.sources.length, 11);
  assert.match(byId('bj-lp').summary, /文王至宣王十二王/);
  assert.doesNotMatch(byId('bj-lp').summary, /文王到厉王|完全证明/);
  assert.match(byId('bj-lp').sections[3].text, /没有公开本件.*工单/);
  assert.match(byId('tp-mgd').summary, /499与500/);
  assert.match(byId('tp-mgd').sections[1].text, /相传.*现场日记/);
  assert.match(byId('tp-mgd').sections[3].text, /拓.*原来.*青铜鼎.*不同材质/);
  assert.equal(sources.get('b11-mao-count').retrieval, 'search-text');
  assert.equal(sources.get('b11-mao-object').retrieval, 'full-text');
  assert.match(byId('sh-zzjp').uncertainty, /准确出土地/);
  assert.match(byId('sh-zzjp').sections[3].text, /没有说子仲姜盘本件接受了哪次CT/);
  for (const story of batch11.stories) {
    assert.equal(readGuideRoute(`?story=${story.id}`)?.trailId, null);
    assert.ok(story.sections.every(section => section.refs.length && section.text.length >= 60));
    assert.ok(story.related.length >= 2);
    for (const relation of story.related) {
      assert.ok(data.stories.some(candidate => candidate.id === relation.id));
      assert.ok(relation.reason.length >= 24);
    }
  }
});
test('twelfth batch keeps seal identity and vessel-use interpretations separate from objects', () => {
  const byId = id => data.stories.find(story => story.id === id);
  assert.equal(batch12.stories.length, 5);
  assert.equal(batch12.sources.length, 8);
  assert.match(byId('sxl-xmb').sections[2].text, /产地仍有学术争议/);
  assert.match(byId('sxl-wmh').sections[2].text, /诗不是这只壶的出入簿/);
  assert.match(byId('sxl-hzx').summary, /推测很可能/);
  assert.match(byId('ny-wdx').sections[1].text, /印台部位含金量98%/);
  assert.match(byId('ny-jyb').correction, /一饮而尽/);
  for (const story of batch12.stories) {
    assert.equal(readGuideRoute(`?story=${story.id}`)?.trailId, null);
    assert.ok(story.sections.every(section => section.refs.length && section.text.length >= 60));
    assert.ok(story.related.length >= 2);
    for (const relation of story.related) {
      assert.ok(data.stories.some(candidate => candidate.id === relation.id));
      assert.ok(relation.reason.length >= 24);
    }
  }
  assert.doesNotMatch(objects.get('sxl-hzx').story, /认定为吕雉/);
  assert.match(objects.get('ny-jyb').story, /“必须一饮而尽”不应写成事实/);
  assert.doesNotMatch(objects.get('sxl-wmh').story, /被杀/);
});
test('fifteenth batch corrects tower dates and distinguishes direct object records from interpretation and display care', () => {
  const byId = id => data.stories.find(story => story.id === id);
  assert.equal(batch15.stories.length, 4);
  assert.equal(batch15.sources.length, 5);
  assert.match(byId('sz-lhw').summary, /1956年开始维修.*1957年5月25日/);
  assert.doesNotMatch(byId('sz-lhw').summary, /1956年.*发现/);
  assert.match(byId('sz-lhw').sections[0].text, /晚年回忆|后来回忆/);
  assert.match(byId('sz-lhw').uncertainty, /供养者/);
  assert.match(byId('sz-bz').sections[3].text, /转述馆方/);
  assert.match(byId('sz-jx').correction, /庭院礼佛/);
  assert.match(byId('sh-ltry').sections[3].text, /预防性/);
  assert.equal(sources.get('b15-baozhuang-display').kind, 'reported-interview');
  for (const story of batch15.stories) {
    assert.equal(readGuideRoute(`?story=${story.id}`)?.trailId, null);
    assert.ok(story.sections.every(section => section.refs.length && section.text.length >= 60));
    assert.ok(story.related.length >= 2);
    for (const relation of story.related) {
      assert.ok(data.stories.some(candidate => candidate.id === relation.id));
      assert.ok(relation.reason.length >= 24);
    }
  }
});
test('sixteenth batch separates object facts, copies, twin bottles and uncertain ship claims', () => {
  const byId = id => data.stories.find(story => story.id === id);
  assert.equal(batch16.stories.length, 6);
  assert.equal(batch16.sources.length, 9);
  assert.match(byId('tp-cyb').uncertainty, /瑾妃嫁妆/);
  assert.doesNotMatch(objects.get('tp-cyb').story, /原是瑾妃/);
  assert.match(byId('tp-rxs').summary, /碧石而非.*玛瑙/);
  assert.match(byId('tp-rsp').correction, /猫食盆/);
  assert.match(byId('tp-kxs').summary, /唐摹善本/);
  assert.match(byId('hub-sat').sections[2].text, /1986年.*2006年/);
  assert.match(byId('qz-hzc').correction, /满载而归/);
  assert.equal(sources.get('b16-ship').kind, 'museum-hosted-overview');
  assert.match(sources.get('b16-ship').supports, /非原始发掘报告/);
  for (const story of batch16.stories) {
    assert.equal(readGuideRoute(`?story=${story.id}`)?.trailId, null);
    assert.ok(story.sections.every(section => section.refs.length && section.text.length >= 60));
    assert.ok(story.related.length >= 2);
    for (const relation of story.related) {
      assert.ok(data.stories.some(candidate => candidate.id === relation.id));
      assert.ok(relation.reason.length >= 24);
    }
  }
});
test('seventeenth batch retains institutional disagreements and separates CT from physical restoration', () => {
  const byId = id => data.stories.find(story => story.id === id);
  assert.equal(batch17.stories.length, 4);
  assert.equal(batch17.sources.length, 10);
  assert.match(byId('gg-ryzl').summary, /口径不同/);
  assert.equal(sources.get('b17-ru-exhibit').retrieval, 'search-text');
  assert.match(byId('gg-jgb').summary, /尚缺将该研究图版与本编号直接对应/);
  assert.match(byId('gg-jgb').uncertainty, /故00145644/);
  assert.equal(objects.get('gg-jgb').dynasty, '明成化');
  assert.match(byId('hub-ywj').uncertainty, /从越到楚/);
  assert.match(byId('hub-zp').summary, /不等于修补了原件/);
  assert.equal(sources.get('b17-pan-research').kind, 'reported-research');
  for (const story of batch17.stories) {
    assert.equal(readGuideRoute(`?story=${story.id}`)?.trailId, null);
    assert.ok(story.sections.every(section => section.refs.length && section.text.length >= 60));
    assert.ok(story.related.length >= 2);
    for (const relation of story.related) {
      assert.ok(data.stories.some(candidate => candidate.id === relation.id));
      assert.ok(relation.reason.length >= 24);
    }
  }
});
test('eighteenth batch adds three evidence-scoped stories without inventing recovery or conservation files', () => {
  const byId = id => data.stories.find(story => story.id === id);
  assert.equal(batch18.stories.length, 3);
  assert.equal(batch18.sources.length, 8);
  assert.equal(sources.get('b18-phoenix-exhibit').retrieval, 'full-text');
  assert.equal(sources.get('b18-snow-object').retrieval, 'search-text');
  assert.equal(sources.get('b18-ding-study').retrieval, 'search-text');
  assert.match(byId('sb-qhbf').summary, /不能证明.*传播路线/);
  assert.match(byId('tb-xjhl').sections[3].text, /1981年/);
  assert.match(byId('tb-tbd').summary, /道光、咸丰两说/);
  assert.match(byId('tb-tbd').uncertainty, /逐次保护工单/);
  for (const story of batch18.stories) {
    assert.equal(readGuideRoute(`?story=${story.id}`)?.trailId, null);
    assert.equal(objects.get(story.id).story, story.summary);
    assert.ok(story.sections.every(section => section.refs.length && section.text.length >= 60));
    assert.ok(story.related.length >= 2);
    for (const relation of story.related) {
      assert.ok(data.stories.some(candidate => candidate.id === relation.id));
      assert.ok(relation.reason.length >= 24);
    }
  }
});
test('nineteenth batch scopes five new collection stories to direct evidence and cautious comparisons', () => {
  assert.equal(batch19.stories.length, 5);
  assert.equal(batch19.sources.length, 12);
  assert.equal(sources.get('b19-table-study').retrieval, 'search-text');
  assert.equal(sources.get('b19-gold-annual').kind, 'museum-hosted-report');
  assert.match(sources.get('b19-gold-annual').supports, /非原始发掘报告/);
  const byId = id => data.stories.find(story => story.id === id);
  assert.match(byId('lb-gf').uncertainty, /宋摹的具体临摹者/);
  assert.match(byId('hb-sjfa').uncertainty, /案面的原貌/);
  assert.match(byId('dz-lgd').uncertainty, /生前的用处/);
  assert.match(byId('nj-js').uncertainty, /实际用途/);
  assert.match(byId('zj-sncy').uncertainty, /出土层位/);
  assert.doesNotMatch(objects.get('lb-gf').story, /宋徽宗摹本/);
  assert.doesNotMatch(objects.get('dz-lgd').story, /集礼制、丧葬与升仙思想/);
  assert.doesNotMatch(objects.get('nj-js').story, /镇库|镇席|豹形/);
  assert.doesNotMatch(objects.get('zj-sncy').story, /凤鸟|证明稻作文明/);
  for (const [from, to] of [['hb-cxd','dz-lgd'],['hub-zhy','hb-sjfa'],['gg-jgyg','nj-js'],['sxl-lt','lb-gf'],['gg-pft','lb-gf']]) {
    assert.ok(byId(from).related.some(link => link.id === to && link.reason.length >= 24));
  }
  for (const story of batch19.stories) {
    assert.equal(readGuideRoute(`?story=${story.id}`)?.trailId, null);
    assert.equal(objects.get(story.id).story, story.summary);
    assert.ok(story.sections.every(section => section.refs.length && section.text.length >= 60));
    assert.ok(story.related.length >= 2);
    for (const relation of story.related) {
      assert.ok(data.stories.some(candidate => candidate.id === relation.id));
      assert.ok(relation.reason.length >= 24);
      assert.ok(relation.reason.length >= 24);
    }
  }
});

test('twentieth batch distinguishes conservation records, cave catalogues and Houma interpretations', () => {
  const byId = id => data.stories.find(story => story.id === id);
  assert.equal(sources.get('b20-dazu-project').retrieval, 'full-text');
  assert.equal(sources.get('b20-deer-report-news').kind, 'museum-research-news');
  assert.equal(sources.get('b20-houma-classify').kind, 'university-research-news');
  assert.match(byId('dz-qsg').sections[1].text, /2008年7月至2011年1月.*2011年4月至2015年6月/);
  assert.match(byId('dh-jsl').sections[1].text, /两边.*中间/);
  assert.match(byId('sx-hmms').sections[2].text, /赵鞅.*赵嘉/);
  assert.match(byId('sx-hmms').uncertainty, /逐件保护工单/);
  assert.doesNotMatch(objects.get('dz-qsg').story, /百万张金箔|1007只手/);
  assert.doesNotMatch(objects.get('dh-jsl').story, /1981年|九色光华/);
  for (const story of batch20.stories) {
    assert.equal(readGuideRoute(`?story=${story.id}`)?.trailId, null);
    assert.equal(objects.get(story.id).story, story.summary);
    assert.ok(story.related.length >= 2);
    for (const relation of story.related) {
      assert.ok(data.stories.some(candidate => candidate.id === relation.id));
      assert.ok(relation.reason.length >= 24);
      assert.ok(relation.reason.length >= 24);
    }
  }
});

test('twenty-first batch separates object records, modern reconstructions and unknown conservation history', () => {
  const byId = id => data.stories.find(story => story.id === id);
  assert.equal(sources.get('b21-dh45-cave').institution, '敦煌研究院');
  assert.equal(sources.get('b21-gold-a').kind, 'museum-catalogue');
  assert.equal(sources.get('b21-sachet-outreach').kind, 'museum-outreach');
  assert.match(byId('dh-swk').sections[1].text, /原有九身.*七身/);
  assert.match(byId('sxl-yjb').sections[1].text, /9975.*9977/);
  assert.match(byId('sxl-ptxn').sections[1].text, /二次创作.*测绘/);
  assert.doesNotMatch(objects.get('sxl-yjb').story, /是唐代皇家金器的标准器|粟特金银器的影子/);
  for (const story of batch21.stories) {
    assert.equal(readGuideRoute(`?story=${story.id}`)?.trailId, null);
    assert.equal(objects.get(story.id).story, story.summary);
    assert.ok(story.sections.every(section => section.refs.length && section.text.length >= 60));
    assert.ok(story.related.length >= 2);
    for (const relation of story.related) {
      assert.ok(data.stories.some(candidate => candidate.id === relation.id), relation.id);
      assert.ok(relation.reason.length >= 24);
      assert.ok(relation.reason.length >= 24);
    }
  }
});

test('twenty-second batch preserves Ningbo identity, interpretive disputes and cautious comparisons', () => {
  const byId = id => data.stories.find(story => story.id === id);
  assert.equal(sources.get('b22-nb-basic').retrieval, 'full-text');
  assert.equal(sources.get('b22-nb-folk').retrieval, 'search-text');
  assert.match(byId('nb-yrjd').sections[2].text, /战国.*春秋/);
  assert.match(byId('nb-yrjd').sections[1].text, /羽冠.*风帆/);
  assert.match(byId('nb-hyz').sections[0].text, /像半开的荷花.*荷叶/);
  assert.match(byId('nb-htb').sections[1].text, /码头.*不是.*运输单/);
  assert.match(byId('nb-wgj').sections[1].text, /逐日逐人的计工簿/);
  assert.doesNotMatch(objects.get('nb-yrjd').story, /最早的图像证据|断发文身/);
  assert.doesNotMatch(objects.get('nb-hyz').story, /盏如卷边荷叶|茶圣/);
  for (const story of batch22.stories) {
    assert.equal(readGuideRoute(`?story=${story.id}`)?.trailId, null);
    assert.equal(objects.get(story.id).story, story.summary);
    assert.equal(story.sections.length, 4);
    assert.ok(story.sections.every(section => section.refs.length && section.text.length >= 60));
    assert.ok(story.details.length >= 3);
    assert.ok(story.related.length >= 2);
    for (const relation of story.related) {
      assert.ok(data.stories.some(candidate => candidate.id === relation.id), relation.id);
      assert.ok(relation.reason.length >= 24);
      assert.ok(relation.reason.length >= 24);
    }
  }
});

test('twenty-third batch separates Dazu carving, interpretation, monitoring and treatment', () => {
  const byId = id => data.stories.find(story => story.id === id);
  assert.equal(sources.get('b23-dz-monitor').retrieval, 'full-text');
  assert.equal(sources.get('b23-dz-north-thesis').retrieval, 'abstract-and-note');
  assert.match(byId('dz-zlj').sections[0].text, /整座开在山岩里.*不像随葬品那样埋在土中/);
  assert.match(byId('dz-zlj').sections[3].text, /1982—1983.*集水竖井/);
  assert.match(byId('dz-mnt').sections[3].text, /生物病害.*风险跟踪/);
  assert.doesNotMatch(objects.get('dz-zlj').story, /最后丰碑|二十余尊/);
  assert.doesNotMatch(objects.get('dz-mnt').story, /30米|双忘|十牛图/);
  for (const story of batch23.stories) {
    assert.equal(readGuideRoute(`?story=${story.id}`)?.trailId, null);
    assert.equal(objects.get(story.id).story, story.summary);
    assert.equal(story.sections.length, 4);
    assert.ok(story.sections.every(section => section.refs.length && section.text.length >= 60));
    assert.ok(story.details.length >= 3);
    assert.ok(story.related.length >= 2);
    for (const relation of story.related) {
      assert.ok(data.stories.some(candidate => candidate.id === relation.id), relation.id);
      assert.ok(relation.reason.length >= 24);
      assert.ok(relation.reason.length >= 24);
    }
  }
});

test('twenty-fourth batch separates two Qin carriages and kneeling-archer type records', () => {
  const byId = id => data.stories.find(story => story.id === id);
  assert.match(byId('qs-tcm').uncertainty, /1980.*1978/);
  assert.match(byId('qs-tcm').sections[1].text, /3500余个零件.*两乘合起来的数字/);
  assert.match(byId('qs-tcm').sections[3].text, /一号车.*X光探伤/);
  assert.match(byId('qs-gyz').sections[2].text, /1998年.*8件.*群体/);
  assert.match(byId('qs-gyz').uncertainty, /单件修复记录/);
  assert.doesNotMatch(objects.get('qs-gyz').story, /唯一未经人工修复|旅游形象大使/);
  for (const story of batch24.stories) {
    assert.equal(readGuideRoute(`?story=${story.id}`)?.trailId, null);
    assert.equal(objects.get(story.id).story, story.summary);
    assert.equal(story.sections.length, 4);
    assert.ok(story.sections.every(section => section.refs.length && section.text.length >= 60));
    assert.ok(story.details.length >= 3);
    assert.ok(story.related.length >= 2);
    for (const relation of story.related) {
      assert.ok(data.stories.some(candidate => candidate.id === relation.id), relation.id);
      assert.ok(relation.reason.length >= 24);
      assert.ok(relation.reason.length >= 24);
    }
  }
});

test('twenty-fifth batch separates object records, functional hypotheses and contemporary reuse', () => {
  const byId = id => data.stories.find(story => story.id === id);
  assert.equal(sources.get('b25-ah-class').retrieval, 'search-text');
  assert.equal(sources.get('b25-sd-gazetteer').retrieval, 'full-text');
  assert.match(byId('ah-yqz').sections[2].text, /1963年宿松/);
  assert.match(byId('ah-yqz').sections[3].text, /邮票.*答不上来/);
  assert.match(byId('sd-hts').sections[0].text, /21\.6.*21\.8/);
  assert.match(byId('sd-hts').sections[2].text, /这个解释从器形和材料出发.*残留物检测/);
  assert.match(byId('sd-hts').sections[3].text, /当代再创作/);
  assert.doesNotMatch(objects.get('ah-yqz').story, /点茶|青如天/);
  assert.doesNotMatch(objects.get('sd-hts').story, /萌宠|最高水平/);
  for (const story of batch25.stories) {
    assert.equal(readGuideRoute(`?story=${story.id}`)?.trailId, null);
    assert.equal(objects.get(story.id).story, story.summary);
    assert.equal(story.sections.length, 4);
    assert.ok(story.sections.every(section => section.refs.length && section.text.length >= 60));
    assert.ok(story.details.length >= 3);
    assert.ok(story.related.length >= 2);
    for (const relation of story.related) {
      assert.ok(data.stories.some(candidate => candidate.id === relation.id), relation.id);
      assert.ok(relation.reason.length >= 24);
      assert.ok(relation.reason.length >= 24);
    }
  }
});

test('twenty-sixth batch corrects Dian seal ownership and preserves the two inscription interpretations', () => {
  const story = data.stories.find(item => item.id === 'yn-dwy');
  assert.ok(story);
  assert.equal(museums.find(museum => museum.artifacts.some(item => item.id === 'yn-dwy'))?.id, 'guobo');
  assert.equal(objects.get('yn-dwy').story, story.summary);
  assert.equal(readGuideRoute('?story=yn-dwy')?.trailId, null);
  assert.equal(sources.get('b26-seal-catalog').institution, '中国国家博物馆');
  assert.equal(sources.get('b26-seal-shiji').retrieval, 'search-text');
  assert.match(story.sections[0].text, /1956年.*6号墓.*不是当年的逐日现场记录/);
  assert.match(story.sections[2].text, /仓促凿成.*随葬仿造/);
  assert.match(story.sections[3].text, /保护史暂记为未知/);
  assert.doesNotMatch(objects.get('yn-dwy').story, /完全吻合|定谳/);
  assert.equal(story.sections.length, 4);
  assert.ok(story.sections.every(section => section.refs.length && section.text.length >= 60));
  assert.ok(story.related.every(link => link.reason.length >= 24 && objects.has(link.id)));
});

test('twenty-seventh batch grounds the bronze cow-tiger table in its own tomb and bounded repair evidence', () => {
  const story = data.stories.find(item => item.id === 'yn-nha');
  assert.ok(story);
  assert.equal(objects.get('yn-nha').story, story.summary);
  assert.equal(readGuideRoute('?story=yn-nha')?.storyId, 'yn-nha');
  assert.equal(sources.get('b27-cow-museum-material').retrieval, 'full-text');
  assert.equal(sources.get('b27-cow-excavation-recollection').retrieval, 'search-text');
  assert.match(story.sections[0].text, /李家山24号墓/);
  assert.match(story.sections[1].text, /分体铸造后再铸接/);
  assert.match(story.sections[3].text, /王赴朝.*看不出他是哪一年接手/);
  assert.match(story.uncertainty, /修复日期与工单均未取得/);
  assert.doesNotMatch(objects.get('yn-nha').story, /母爱主题|拽住平衡/);
  assert.ok(story.related.every(link => link.reason.length >= 24 && objects.has(link.id)));
});

test('twenty-eighth batch keeps the collected Yue sword and two Leifeng Pagoda towers distinct', () => {
  const sword = data.stories.find(item => item.id === 'zj-yzj');
  const tower = data.stories.find(item => item.id === 'zj-aywt');
  assert.ok(sword && tower);
  for (const story of [sword,tower]) {
    assert.equal(objects.get(story.id).story, story.summary);
    assert.equal(readGuideRoute(`?story=${story.id}`)?.storyId, story.id);
    assert.equal(story.sections.length, 4);
    assert.ok(story.sections.every(section => section.refs.length));
    assert.ok(story.related.every(link => link.reason.length >= 24 && objects.has(link.id)));
  }
  assert.equal(sources.get('b28-sword-education').retrieval, 'full-text');
  assert.equal(sources.get('b28-sword-exhibit').retrieval, 'search-text');
  assert.match(sword.uncertainty, /出土地与墓葬编号未知/);
  assert.match(sword.uncertainty, /春秋.*战国/);
  assert.doesNotMatch(sword.summary, /不锈不钝|错金|拍场/);
  assert.equal(sources.get('b28-tower-excavation-abstract').retrieval, 'abstract-and-note');
  assert.match(tower.sections[3].text, /天宫.*地宫/);
  assert.match(tower.uncertainty, /逐件清理与检测记录均未取得/);
  assert.doesNotMatch(tower.summary, /通体鎏金|形制范本/);
});

test('twenty-ninth batch distinguishes the two dance basins and bounds brick-painting interpretations', () => {
  const dance = data.stories.find(item => item.id === 'qh-wdw');
  const brick = data.stories.find(item => item.id === 'nj-zlqx');
  assert.ok(dance && brick);
  assert.equal(museums.find(museum => museum.artifacts.some(item => item.id === 'qh-wdw'))?.id, 'qinghai');
  for (const story of [dance,brick]) {
    assert.equal(objects.get(story.id).story, story.summary);
    assert.equal(readGuideRoute(`?story=${story.id}`)?.storyId, story.id);
    assert.equal(story.sections.length, 4);
    assert.ok(story.sections.every(section => section.refs.length && section.text.length >= 60));
    assert.ok(story.related.every(link => link.reason.length >= 24 && objects.has(link.id)));
  }
  assert.match(dance.summary, /11人和13人.*三组各5人/);
  assert.doesNotMatch(dance.summary, /各11人|祭祀与节庆/);
  assert.match(dance.uncertainty, /墓号.*异文/);
  assert.match(dance.sections[3].text, /清洗、粘接、补配、保存温湿度和运输检测档案都没有取得/);
  assert.equal(sources.get('b29-zongri-formal').retrieval, 'abstract-and-note');
  assert.match(brick.summary, /两壁各由近300块/);
  assert.match(brick.sections[2].text, /宋、齐、梁、陈/);
  assert.match(brick.sections[3].text, /2022年并没有重新修复原砖/);
  assert.match(brick.uncertainty, /原始发掘报告的全文/);
  assert.equal(sources.get('b29-brick-access').retrieval, 'search-text');
});

test('thirty-ninth batch separates batch conservation from object repair and replica from original silk', () => {
  assert.deepEqual(batch39.stories.map(story => story.id), ['dt-ytz', 'jz-lfh']);
  assert.equal(batch39.sources.length, 5);
  for (const story of batch39.stories) {
    assert.equal(objects.get(story.id).story, story.summary);
    assert.equal(readGuideRoute(`?story=${story.id}`)?.storyId, story.id);
    assert.equal(story.sections.length, 4);
    assert.ok(story.sections.every(section => section.refs.length && section.text.length >= 60));
    assert.ok(story.related.every(link => link.reason.length >= 24 && objects.has(link.id)));
  }
  assert.match(objects.get('dt-ytz').story, /不是每件俑/);
  assert.doesNotMatch(objects.get('dt-ytz').story, /四百余件|标准群像/);
  assert.match(objects.get('jz-lfh').story, /复制复原件不等于原衣/);
  assert.equal(sources.get('b39-silk-project').retrieval, 'search-text');
  assert.equal(sources.get('b39-silk-study').retrieval, 'abstract-and-note');
});

test('fortieth batch corrects ownership, a tomb date and an uncertain dragon discovery year', () => {
  const byId = id => data.stories.find(story => story.id === id);
  assert.deepEqual(batch40.stories.map(story => story.id), ['bj-hg', 'ly-byb', 'hlj-tzl']);
  assert.equal(batch40.sources.length, 10);
  for (const story of batch40.stories) {
    assert.equal(objects.get(story.id).story, story.summary);
    assert.equal(readGuideRoute(`?story=${story.id}`)?.storyId, story.id);
    assert.equal(story.sections.length, 4);
    assert.ok(story.sections.every(section => section.refs.length && section.text.length >= 60));
    assert.ok(story.related.every(link => link.reason.length >= 24 && objects.has(link.id)));
  }
  assert.match(byId('bj-hg').summary, /扶风县博物馆收藏/);
  assert.match(byId('ly-byb').summary, /铁帷帐构/);
  assert.match(byId('hlj-tzl').summary, /金上京.*金中都/);
  assert.match(byId('hlj-tzl').summary, /1956年.*1965年/);
  assert.equal(sources.get('b40-dragon-gazetteer').retrieval, 'search-text');
  assert.equal(sources.get('b40-cup-tomb').retrieval, 'full-text');
});

test('forty-second batch separates the painting, remount discovery and screen hypothesis', () => {
  assert.deepEqual(batch42.stories.map(story => story.id), ['lb-zfsg']);
  assert.equal(batch42.sources.length, 4);
  const story = batch42.stories[0];
  assert.equal(objects.get(story.id).story, story.summary);
  assert.equal(objects.get(story.id).name, '传周昉《簪花仕女图》卷');
  assert.equal(readGuideRoute('?story=lb-zfsg')?.storyId, story.id);
  assert.ok(story.sections.every(section => section.refs.length && section.text.length >= 60));
  assert.ok(story.related.every(link => link.reason.length >= 24 && objects.has(link.id)));
  assert.match(story.sections[2].text, /1972年.*拼接.*推测/);
  assert.match(story.sections[3].text, /晚唐.*摘要/);
  assert.match(story.uncertainty, /逐项修复工单/);
  assert.doesNotMatch(story.summary, /周昉亲笔|原为屏风已证实/);
  assert.equal(sources.get('b42-date-paper').retrieval, 'abstract-and-note');
  assert.equal(sources.get('b42-liaoning-register').retrieval, 'search-text');
});

test('forty-third batch distinguishes marked Guanyin attribution and the Wu Wang Guang vessel from unsupported uses', () => {
  assert.deepEqual(batch43.stories.map(story => story.id), ['fj-dhgy', 'ah-wgj']);
  assert.equal(batch43.sources.length, 7);
  for (const story of batch43.stories) {
    assert.equal(objects.get(story.id).story, story.summary);
    assert.equal(readGuideRoute(`?story=${story.id}`)?.storyId, story.id);
    assert.equal(story.sections.length, 4);
    assert.ok(story.sections.every(section => section.refs.length && section.text.length >= 60));
    assert.ok(story.related.every(link => link.reason.length >= 24 && objects.has(link.id)));
  }
  assert.match(objects.get('fj-dhgy').name, /何朝宗款/);
  assert.match(batch43.stories[0].uncertainty, /逐件/);
  assert.match(batch43.stories[0].summary, /不等于已证何朝宗亲手制作/);
  assert.doesNotMatch(batch43.stories[1].summary, /青铜冰箱|抗楚盟约/);
  assert.equal(sources.get('b43-anhui-object').retrieval, 'search-text');
  assert.equal(sources.get('b43-dehua-formal-study').retrieval, 'full-text');
});

test('forty-fourth batch separates a collected jade, a tomb-recorded jade disc and a drum by evidence type', () => {
  assert.deepEqual(batch44.stories.map(story => story.id), ['lb-yzl', 'sd-lgdy', 'gx-xlt']);
  assert.equal(batch44.sources.length, 7);
  for (const story of batch44.stories) {
    assert.equal(objects.get(story.id).story, story.summary);
    assert.equal(readGuideRoute(`?story=${story.id}`)?.storyId, story.id);
    assert.equal(story.sections.length, 4);
    assert.ok(story.sections.every(section => section.refs.length && section.text.length >= 60));
    assert.ok(story.related.every(link => link.reason.length >= 24 && objects.has(link.id)));
  }
  // A collected piece must never borrow the excavation record of the Niulianghe jades.
  assert.match(batch44.stories[0].summary, /采集自朝阳市建平县/);
  assert.doesNotMatch(batch44.stories[0].summary, /牛河梁/);
  assert.match(batch44.stories[0].uncertainty, /征集／采集品/);
  // The jade disc keeps its measured figures and drops the asserted ritual use.
  assert.match(batch44.stories[1].summary, /外径32.8厘米、孔径11.6厘米、厚0.6厘米/);
  assert.doesNotMatch(batch44.stories[1].summary, /祭祀重器|玉璧王/);
  assert.match(batch44.stories[1].summary, /都是依文献和出土位置提出的解释/);
  // The drum keeps its tomb, its instrument set, and marks the voyage reading as inference.
  assert.match(batch44.stories[2].summary, /罗泊湾一号墓/);
  assert.doesNotMatch(batch44.stories[2].summary, /鼓声一起|群山响应/);
  assert.match(batch44.stories[2].uncertainty, /铸造年代/);
  assert.match(batch44.stories[2].sections[2].text, /研究推论/);
  assert.equal(sources.get('b44-sdm-object').kind, 'museum');
  assert.equal(sources.get('b44-ln-flag-jade').kind, 'reported-museum-interview');
  assert.equal(sources.get('b44-gx-bronze-drum-type').retrieval, 'search-text');
  for (const source of batch44.sources) {
    assert.equal(new URL(source.url).protocol, 'https:');
    assert.ok(['search-text', 'full-text', 'abstract-and-note'].includes(source.retrieval));
  }
});

test('forty-fifth batch separates object-internal evidence from media framing', () => {
  assert.deepEqual(batch45.stories.map(story => story.id), ['gd-mlt', 'yz-zbq', 'nj-frs']);
  assert.equal(batch45.sources.length, 6);
  for (const story of batch45.stories) {
    assert.equal(objects.get(story.id).story, story.summary);
    assert.equal(readGuideRoute(`?story=${story.id}`)?.storyId, story.id);
    assert.equal(story.sections.length, 4);
    assert.ok(story.sections.every(section => section.refs.length && section.text.length >= 60));
    assert.ok(story.related.every(link => link.reason.length >= 24 && objects.has(link.id)));
  }
  // An undated scroll keeps its handover record and must not claim a creation year.
  assert.match(batch45.stories[0].summary, /无年款/);
  assert.match(batch45.stories[0].summary, /1958年由广东省文管会移交/);
  assert.doesNotMatch(batch45.stories[0].summary, /开山之作/);
  assert.match(batch45.stories[0].details.map(detail => detail.text).join(''), /木丝/);
  // The Zheng Xie scroll keeps the museum-supplied record and drops the folklore.
  assert.match(batch45.stories[1].summary, /高178、宽102厘米/);
  assert.doesNotMatch(batch45.stories[1].summary, /扬州八怪之首|难得糊涂|三绝/);
  assert.match(batch45.stories[1].sections[2].text, /当是/);
  // The furnace keeps the lending museum's attribution and drops the "proves" claim.
  assert.match(batch45.stories[2].summary, /南京博物院藏/);
  assert.doesNotMatch(batch45.stories[2].summary, /证明了|少女气色/);
  assert.equal(sources.get('b45-gd-object').kind, 'museum');
  assert.equal(sources.get('b45-dpm-zhengxie').kind, 'museum');
  assert.match(sources.get('b45-wx-loan').supports, /拟人化修辞/);
  for (const source of batch45.sources) {
    assert.equal(new URL(source.url).protocol, 'https:');
    assert.ok(['search-text', 'full-text', 'abstract-and-note'].includes(source.retrieval));
  }
});

test('forty-sixth batch separates a two-object tomb find, a Kanruo pot and a category name', () => {
  assert.deepEqual(batch46.stories.map(story => story.id), ['gz-yjg', 'xz-stg', 'qzx-lxsf']);
  assert.equal(batch46.sources.length, 7);
  for (const story of batch46.stories) {
    assert.equal(objects.get(story.id).story, story.summary);
    assert.equal(readGuideRoute(`?story=${story.id}`)?.storyId, story.id);
    assert.equal(story.sections.length, 4);
    assert.ok(story.sections.every(section => section.refs.length && section.text.length >= 60));
    assert.ok(story.related.every(link => link.reason.length >= 24 && objects.has(link.id)));
  }
  // Two crowns, not one, and the owner stays a two-way dispute.
  assert.match(batch46.stories[0].summary, /藏两件金凤冠/);
  assert.match(batch46.stories[0].summary, /五翟金冠/);
  assert.match(batch46.stories[0].summary, /杨纲夫人与杨相妻妾两说/);
  assert.doesNotMatch(batch46.stories[0].summary, /这顶金冠|繁华与终结/);
  // The Kanruo pot keeps measured figures and drops the "origin point"/emblem claims.
  assert.match(batch46.stories[1].summary, /夹细砂黄陶，高19厘米/);
  assert.doesNotMatch(batch46.stories[1].summary, /艺术的原点|馆徽|最早的新石器文化/);
  // The Qingzhou entry must not borrow the 1996 hoard's excavation context.
  assert.match(batch46.stories[2].summary, /1987年龙兴寺遗址出土/);
  assert.match(batch46.stories[2].summary, /非1996年窖藏/);
  assert.doesNotMatch(batch46.stories[2].summary, /400余尊|青州微笑/);
  assert.equal(sources.get('b46-gz-lecture').kind, 'museum-research');
  assert.equal(sources.get('b46-qz-foli').kind, 'museum');
  assert.match(sources.get('b46-gz-lecture').supports, /仅代表我个人的看法/);
  for (const source of batch46.sources) {
    assert.equal(new URL(source.url).protocol, 'https:');
    assert.ok(['search-text', 'full-text', 'abstract-and-note'].includes(source.retrieval));
  }
});

test('forty-seventh batch binds the Jiangxi tomb pair and corrects the horse findspot', () => {
  assert.deepEqual(batch47.stories.map(story => story.id), ['jx-smsr', 'jx-qth', 'ly-hym']);
  assert.equal(batch47.sources.length, 6);
  for (const story of batch47.stories) {
    assert.equal(objects.get(story.id).story, story.summary);
    assert.equal(readGuideRoute(`?story=${story.id}`)?.storyId, story.id);
    assert.equal(story.sections.length, 4);
    assert.ok(story.sections.every(section => section.refs.length && section.text.length >= 60));
    assert.ok(story.related.every(link => link.reason.length >= 24 && objects.has(link.id)));
  }
  // The mask keeps the museum's measurements and marks the haft/plume reading as an interpretation.
  assert.match(batch47.stories[0].summary, /通高53、銎长8.5、角高20.6、管径6厘米/);
  assert.doesNotMatch(batch47.stories[0].summary, /祭祀法器|三星堆|谱系/);
  assert.match(batch47.stories[0].sections[2].text, /功能解释/);
  // The tiger uses the museum's 475 figure and drops the unsourced slogan and "totem".
  assert.match(batch47.stories[1].summary, /青铜器475件/);
  assert.doesNotMatch(batch47.stories[1].summary, /480余件|商文化不过长江|图腾/);
  // The horse findspot is the Anye tomb at Longmen, not Guanlin.
  assert.match(batch47.stories[2].summary, /1981年洛阳龙门安菩墓出土/);
  assert.doesNotMatch(batch47.stories[2].summary, /关林|黑釉三彩马仅此两件/);
  assert.equal(sources.get('b47-jx-report').kind, 'excavation-report');
  assert.equal(sources.get('b47-ly-horse-interview').kind, 'reported-museum-interview');
  assert.match(sources.get('b47-jx-report').supports, /非纸质报告原件/);
  for (const source of batch47.sources) {
    assert.equal(new URL(source.url).protocol, 'https:');
    assert.ok(['search-text', 'full-text', 'abstract-and-note'].includes(source.retrieval));
  }
});

test('forty-eighth batch records the dance door, the crushed chariot and the Yue sword', () => {
  assert.deepEqual(batch48.stories.map(story => story.id), ['nx-hxw', 'gz-tcm', 'jz-yzj']);
  assert.equal(batch48.sources.length, 5);
  for (const story of batch48.stories) {
    assert.equal(objects.get(story.id).story, story.summary);
    assert.equal(readGuideRoute(`?story=${story.id}`)?.storyId, story.id);
    assert.equal(story.sections.length, 4);
    assert.ok(story.sections.every(section => section.refs.length && section.text.length >= 60));
    assert.ok(story.related.every(link => link.reason.length >= 24 && objects.has(link.id)));
  }
  // The dance door keeps the measured door leaves and the Ketuo grave site.
  assert.match(batch48.stories[0].summary, /盐池县苏步井乡窨子梁唐墓/);
  assert.match(batch48.stories[0].summary, /高89、宽43、厚5厘米/);
  // The chariot keeps the findspot and both thickness readings, and must not over-claim.
  assert.match(batch48.stories[1].summary, /兴义万屯8号汉墓/);
  assert.doesNotMatch(batch48.stories[1].summary, /夜郎故道|一体浇铸/);
  assert.match(batch48.stories[1].sections[3].text, /相差十倍/);
  // The Yue sword keeps the measured length and the two competing explanations.
  assert.match(batch48.stories[2].summary, /通长56.2、身宽4.3厘米/);
  assert.doesNotMatch(batch48.stories[2].summary, /复合金属|传奇序列/);
  assert.match(batch48.stories[2].sections[2].text, /都是解释，不是定论/);
  assert.equal(sources.get('b48-gz-gywb').kind, 'archaeologist-recollection');
  assert.equal(sources.get('b48-jz-thepaper').kind, 'museum-research');
  assert.match(sources.get('b48-gz-gywb').supports, /0\.1毫米厚铜箔/);
  for (const source of batch48.sources) {
    assert.equal(new URL(source.url).protocol, 'https:');
    assert.ok(['search-text', 'full-text', 'abstract-and-note'].includes(source.retrieval));
  }
});

test('forty-ninth batch keeps the salt-brick fuel dispute and the painted Shengjitu', () => {
  assert.deepEqual(batch49.stories.map(story => story.id), ['sc-hxz', 'sc-ssj', 'kz-kzsj']);
  assert.equal(batch49.sources.length, 3);
  for (const story of batch49.stories) {
    assert.equal(objects.get(story.id).story, story.summary);
    assert.equal(readGuideRoute(`?story=${story.id}`)?.storyId, story.id);
    assert.equal(story.sections.length, 4);
    assert.ok(story.sections.every(section => section.refs.length && section.text.length >= 60));
    assert.ok(story.related.every(link => link.reason.length >= 24 && objects.has(link.id)));
    // Related links must point at artifacts that already have a story, or navigation dead-ends.
    for (const link of story.related) assert.ok(batch49.stories.concat([]).length > 0 && objects.has(link.id), link.id);
    for (const link of story.related) assert.ok(data.stories.some(entry => entry.id === link.id), `${story.id} -> ${link.id} must have a story`);
  }
  // The salt brick must present the fuel question as an open dispute, not as a gas proof.
  assert.match(batch49.stories[0].summary, /两说并存/);
  assert.match(batch49.stories[0].summary, /高34.5、长45厘米/);
  assert.doesNotMatch(batch49.stories[0].summary, /天然气煮盐图像|猎鹿/);
  assert.match(batch49.stories[0].sections[2].text, /尚不能看清楚煮盐燃料究竟是柴火还是天然气/);
  // The stone classics keep the measured history and drop the unsourced "宋补清毁".
  assert.match(batch49.stories[1].summary, /广政元年/);
  assert.doesNotMatch(batch49.stories[1].summary, /宋补清毁|雕版印刷兴起前夜/);
  // The Shengjitu is a painted album, not a woodblock print.
  assert.match(batch49.stories[2].summary, /共36幅/);
  assert.doesNotMatch(batch49.stories[2].summary, /刀法工稳|版刻/);
  assert.match(batch49.stories[2].sections[0].text, /彩绘/);
  assert.equal(sources.get('b49-sc-shijing').kind, 'museum-feature');
  for (const source of batch49.sources) {
    assert.equal(new URL(source.url).protocol, 'https:');
    assert.ok(['search-text', 'full-text', 'abstract-and-note'].includes(source.retrieval));
  }
});

test('fiftieth batch separates a standard-pitch bell, a loaned scroll and an exhibition listing', () => {
  assert.deepEqual(batch50.stories.map(story => story.id), ['kf-dsb', 'hk-lsf', 'jl-wjg']);
  assert.equal(batch50.sources.length, 3);
  for (const story of batch50.stories) {
    assert.equal(objects.get(story.id).story, story.summary);
    assert.equal(readGuideRoute(`?story=${story.id}`)?.storyId, story.id);
    assert.equal(story.sections.length, 4);
    assert.ok(story.sections.every(section => section.refs.length && section.text.length >= 60));
    assert.ok(story.related.every(link => link.reason.length >= 24 && objects.has(link.id)));
    for (const link of story.related) assert.ok(data.stories.some(entry => entry.id === link.id), `${story.id} -> ${link.id} must have a story`);
  }
  // The bell keeps the measured figures and drops the unsourced quantity claim.
  assert.match(batch50.stories[0].summary, /通高27.5、宽18厘米/);
  assert.doesNotMatch(batch50.stories[0].summary, /三十余枚|靖康之乱后流散四海/);
  assert.match(batch50.stories[0].details.map(entry => entry.text).join(''), /传世极少|极少传世|传世数量/);
  // The Luoshen scroll must read as a Palace Museum holding shown in Hong Kong.
  assert.match(batch50.stories[1].summary, /故宫博物院藏品/);
  assert.match(batch50.stories[1].summary, /借展不等于/);
  assert.doesNotMatch(batch50.stories[1].summary, /传为顾恺之原作|万众瞩目/);
  // The Wenji scroll keeps only what an exhibition listing can support.
  assert.match(batch50.stories[2].summary, /29×129厘米/);
  assert.doesNotMatch(batch50.stories[2].summary, /不着一树一石|真迹/);
  assert.equal(sources.get('b50-kf-dasheng').kind, 'government-museum');
  assert.equal(sources.get('b50-jl-wenji').kind, 'museum-exhibition');
  assert.match(sources.get('b50-jl-wenji').supports, /不含画面描述/);
  for (const source of batch50.sources) {
    assert.equal(new URL(source.url).protocol, 'https:');
    assert.ok(['search-text', 'full-text', 'abstract-and-note'].includes(source.retrieval));
  }
});

test('fifty-first batch keeps the movable-type evidence, a five-field record and a returned loan', () => {
  assert.deepEqual(batch51.stories.map(story => story.id), ['nx-jxb', 'gd-qjy', 'hk-hrz']);
  assert.equal(batch51.sources.length, 3);
  for (const story of batch51.stories) {
    assert.equal(objects.get(story.id).story, story.summary);
    assert.equal(readGuideRoute(`?story=${story.id}`)?.storyId, story.id);
    assert.equal(story.sections.length, 4);
    assert.ok(story.sections.every(section => section.refs.length && section.text.length >= 60));
    assert.ok(story.related.every(link => link.reason.length >= 24 && objects.has(link.id)));
    // Related links must resolve to artifacts that already have a story, or the reader dead-ends.
    for (const link of story.related) assert.ok(data.stories.some(entry => entry.id === link.id), `${story.id} -> ${link.id} must have a story`);
  }
  // The sutra story keeps the typographic evidence and drops the unsourced pagoda name.
  assert.match(batch51.stories[0].summary, /1991年清理宁夏一座损毁的西夏佛塔/);
  assert.doesNotMatch(batch51.stories[0].summary, /拜寺沟/);
  assert.match(batch51.stories[0].sections[1].text, /隔行竹片印痕/);
  assert.match(batch51.stories[0].sections[3].text, /中国国家版本馆/);
  // The inkstone story states plainly that the museum page is a five-field record.
  assert.match(batch51.stories[1].summary, /长25\.5、宽17\.6、厚2\.7厘米/);
  assert.doesNotMatch(batch51.stories[1].summary, /鱼脑冻|火捺|大西洞|三大名砚/);
  assert.match(batch51.stories[1].sections[1].text, /没有/);
  // The pillow is a Palace Museum holding on a three-month loan.
  assert.match(batch51.stories[2].summary, /故宫博物院藏品/);
  assert.match(batch51.stories[2].summary, /三个月后交还/);
  assert.doesNotMatch(batch51.stories[2].summary, /宜男|绣球/);
  assert.equal(sources.get('b51-gd-qianjin').kind, 'museum');
  assert.match(sources.get('b51-hk-haier').supports, /展出三个月后便会交还/);
  for (const source of batch51.sources) {
    assert.equal(new URL(source.url).protocol, 'https:');
    assert.ok(['search-text', 'full-text', 'abstract-and-note'].includes(source.retrieval));
  }
});

test('fifty-second batch names the ten offerings, the court dress rank and the restored shrine', () => {
  assert.deepEqual(batch52.stories.map(story => story.id), ['kz-sg', 'kz-myc', 'gd-dsk']);
  assert.equal(batch52.sources.length, 4);
  for (const story of batch52.stories) {
    assert.equal(objects.get(story.id).story, story.summary);
    assert.equal(readGuideRoute(`?story=${story.id}`)?.storyId, story.id);
    assert.equal(story.sections.length, 4);
    assert.ok(story.sections.every(section => section.refs.length && section.text.length >= 60));
    assert.ok(story.related.every(link => link.reason.length >= 24 && objects.has(link.id)));
    for (const link of story.related) assert.ok(data.stories.some(entry => entry.id === link.id), `${story.id} -> ${link.id} must have a story`);
  }
  // The ten offerings: the name itself comes from a later re-dating of three pieces.
  assert.match(batch52.stories[0].summary, /册卣、木鼎、亚尊三件为商代所造/);
  assert.doesNotMatch(batch52.stories[0].summary, /紫檀座|乾隆御赏/);
  assert.match(batch52.stories[0].sections[2].text, /商周十供/);
  assert.match(batch52.stories[0].details.map(d => d.text).join(''), /一百五十五两/);
  // The court dress keeps the six measurements and drops the python robe.
  assert.match(batch52.stories[1].summary, /身长127、通袖长242/);
  assert.doesNotMatch(batch52.stories[1].summary, /蟒袍|标准器/);
  assert.match(batch52.stories[1].sections[1].text, /与一品同/);
  // The shrine must state its 2009 partial reconstruction.
  assert.match(batch52.stories[2].summary, /2009年补配缺失部件后复原/);
  assert.doesNotMatch(batch52.stories[2].summary, /均可开合/);
  assert.match(batch52.stories[2].sections[2].text, /配制缺失的部件/);
  assert.equal(sources.get('b52-kz-shigong-archive').kind, 'museum-research');
  assert.equal(sources.get('b52-gd-shenkan').kind, 'museum');
  for (const source of batch52.sources) {
    assert.equal(new URL(source.url).protocol, 'https:');
    assert.ok(['search-text', 'full-text', 'abstract-and-note'].includes(source.retrieval));
  }
});

test('fifty-third batch grades a stone beast, a dated granary and a dictionary entry', () => {
  assert.deepEqual(batch53.stories.map(story => story.id), ['ly-sbx', 'jx-glc', 'dt-lbl']);
  assert.equal(batch53.sources.length, 4);
  for (const story of batch53.stories) {
    assert.equal(objects.get(story.id).story, story.summary);
    assert.equal(readGuideRoute(`?story=${story.id}`)?.storyId, story.id);
    assert.equal(story.sections.length, 4);
    assert.ok(story.sections.every(section => section.refs.length && section.text.length >= 60));
    assert.ok(story.related.every(link => link.reason.length >= 24 && objects.has(link.id)));
    for (const link of story.related) assert.ok(data.stories.some(entry => entry.id === link.id), `${story.id} -> ${link.id} must have a story`);
  }
  // The stone beast keeps the museum's findspot and drops the unsourced carvings.
  assert.match(batch53.stories[0].summary, /孟津油坊村/);
  assert.doesNotMatch(batch53.stories[0].summary, /油磨坊村|怒目张口|城市图腾/);
  assert.match(batch53.stories[0].sections[2].text, /唯一一次离开洛阳/);
  // The granary keeps its date, surname and four glazes; the kiln-temperature claim is gone.
  assert.match(batch53.stories[1].summary, /后至元四年（1338年）/);
  assert.doesNotMatch(batch53.stories[1].summary, /温度一高一低|两进/);
  assert.match(batch53.stories[1].sections[1].text, /凌氏/);
  // The glass bowl flags that the dictionary says light green while the site says blue.
  assert.match(batch53.stories[2].summary, /淡绿色/);
  assert.doesNotMatch(batch53.stories[2].summary, /钠钙|北魏蓝/);
  assert.match(batch53.stories[2].sections[1].text, /两种说法目前并录/);
  assert.equal(sources.get('b53-dt-cidian').kind, 'academic-reference');
  assert.match(sources.get('b53-dt-cidian').supports, /三次文献|辞典条目/);
  for (const source of batch53.sources) {
    assert.equal(new URL(source.url).protocol, 'https:');
    assert.ok(['search-text', 'full-text', 'abstract-and-note'].includes(source.retrieval));
  }
});

test('fifty-fourth batch handles an in-situ mural, a restored que and a chipped stone spear', () => {
  assert.deepEqual(batch54.stories.map(story => story.id), ['hlj-gys', 'cq-wyq', 'dh-ft']);
  assert.equal(batch54.sources.length, 3);
  for (const story of batch54.stories) {
    assert.equal(objects.get(story.id).story, story.summary);
    assert.equal(readGuideRoute(`?story=${story.id}`)?.storyId, story.id);
    assert.equal(story.sections.length, 4);
    assert.ok(story.sections.every(section => section.refs.length && section.text.length >= 60));
    assert.ok(story.related.every(link => link.reason.length >= 24 && objects.has(link.id)));
    for (const link of story.related) assert.ok(data.stories.some(entry => entry.id === link.id), `${story.id} -> ${link.id} must have a story`);
  }
  // The spear keeps the museum's measurements and drops the poetry.
  assert.match(batch54.stories[0].summary, /通长25、宽5\.8厘米/);
  assert.doesNotMatch(batch54.stories[0].summary, /薄如蝉翼|石器工业/);
  assert.match(batch54.stories[0].sections[2].text, /刮削器/);
  // The que keeps the measured heights, weight and the two superlatives.
  assert.match(batch54.stories[1].summary, /主阙通高5\.4米、子阙高2\.6米/);
  assert.doesNotMatch(batch54.stories[1].summary, /铺首衔环|狩猎/);
  assert.match(batch54.stories[1].sections[2].text, /神道/);
  // The mural entry must state that it is a category entry, not a movable object.
  assert.match(batch54.stories[2].summary, /类别式条目/);
  assert.doesNotMatch(batch54.stories[2].summary, /四千五百余身|乾闼婆/);
  assert.match(batch54.stories[2].sections[0].text, /不能装箱外借/);
  assert.match(batch54.stories[2].sections[3].text, /1924\s*年被美国人华尔纳盗走/);
  assert.equal(sources.get('b54-dh-320').kind, 'museum');
  for (const source of batch54.sources) {
    assert.equal(new URL(source.url).protocol, 'https:');
    assert.ok(['search-text', 'full-text', 'abstract-and-note'].includes(source.retrieval));
  }
});

test('fifty-fifth batch separates two caches, a headdress name and a loaned flask', () => {
  assert.deepEqual(batch55.stories.map(story => story.id), ['sc-xsel', 'gz-myg', 'hk-jgb']);
  assert.equal(batch55.sources.length, 3);
  for (const story of batch55.stories) {
    assert.equal(objects.get(story.id).story, story.summary);
    assert.equal(readGuideRoute(`?story=${story.id}`)?.storyId, story.id);
    assert.equal(story.sections.length, 4);
    assert.ok(story.sections.every(section => section.refs.length && section.text.length >= 60));
    assert.ok(story.related.every(link => link.reason.length >= 24 && objects.has(link.id)));
    for (const link of story.related) assert.ok(data.stories.some(entry => entry.id === link.id), `${story.id} -> ${link.id} must have a story`);
  }
  // The lei must be dated to the 1980 cache, not the 1959 one.
  assert.match(batch55.stories[0].summary, /1980年彭州竹瓦街窖藏第二次发现/);
  assert.doesNotMatch(batch55.stories[0].summary, /1959年彭县竹瓦街窖藏出土/);
  assert.match(batch55.stories[0].sections[0].text, /两批/);
  // The headdress story must flag that the museum does not use the word "银冠".
  assert.match(batch55.stories[1].summary, /条目名“银冠”与馆方称法尚待对应/);
  assert.doesNotMatch(batch55.stories[1].summary, /史诗|迁徙路线/);
  assert.match(batch55.stories[1].sections[0].text, /没有出现“银冠”这个称法/);
  // The flask is a Palace Museum loan, item 3004 in gallery 3.
  assert.match(batch55.stories[2].summary, /故宫博物院藏品/);
  assert.match(batch55.stories[2].summary, /编号3004/);
  assert.doesNotMatch(batch55.stories[2].summary, /伊斯兰金属器/);
  assert.match(batch55.stories[2].sections[0].text, /扁壺/);
  assert.equal(sources.get('b55-hk-flask').kind, 'museum');
  for (const source of batch55.sources) {
    assert.equal(new URL(source.url).protocol, 'https:');
    assert.ok(['search-text', 'full-text', 'abstract-and-note'].includes(source.retrieval));
  }
});

test('fifty-sixth batch keeps the buffalo, the smoked ding and one specific oracle bone', () => {
  assert.deepEqual(batch56.stories.map(story => story.id), ['yx-yz', 'yx-sxd', 'yx-jg']);
  assert.equal(batch56.sources.length, 2);
  for (const story of batch56.stories) {
    assert.equal(objects.get(story.id).story, story.summary);
    assert.equal(readGuideRoute(`?story=${story.id}`)?.storyId, story.id);
    assert.equal(story.sections.length, 4);
    assert.ok(story.sections.every(section => section.refs.length && section.text.length >= 60));
    assert.ok(story.related.every(link => link.reason.length >= 24 && objects.has(link.id)));
    for (const link of story.related) assert.ok(data.stories.some(entry => entry.id === link.id), `${story.id} -> ${link.id} must have a story`);
  }
  // The buffalo keeps the measured size, weight and the "唯一" wording.
  assert.match(batch56.stories[0].summary, /通高22\.5、长40厘米、重7\.1千克/);
  assert.match(batch56.stories[0].sections[0].text, /殷墟发现的唯一一件牛形青铜尊/);
  // The ding keeps the find year, the two-piece note and the soot traces.
  assert.match(batch56.stories[1].summary, /1976年安阳殷墟妇好墓出土/);
  assert.match(batch56.stories[1].summary, /烟炱痕迹/);
  assert.doesNotMatch(batch56.stories[1].summary, /后母戊鼎|双人画像/);
  // The oracle bone is anchored to one specific piece, not the whole corpus.
  assert.match(batch56.stories[2].summary, /小屯南地2172号甲骨/);
  assert.match(batch56.stories[2].summary, /93个单字、11条卜辞/);
  assert.doesNotMatch(batch56.stories[2].summary, /汉字的直系祖先|推进千年/);
  assert.match(batch56.stories[2].sections[0].text, /编号2172/);
  assert.equal(sources.get('b56-yx-niuzun').kind, 'reported-museum-interview');
  for (const source of batch56.sources) {
    assert.equal(new URL(source.url).protocol, 'https:');
    assert.ok(['search-text', 'full-text', 'abstract-and-note'].includes(source.retrieval));
  }
});

test('batch 57 records the Macau Museum, Jingzhou and Kaifeng objects with per-item evidence', () => {
  assert.deepEqual(batch57.stories.map(story => story.id), ['mo-klk', 'jz-hnjg', 'kf-khc']);
  assert.equal(batch57.sources.length, 3);
  // Macau Museum collection page: dimensions, label number and the "carrack" etymology.
  assert.match(batch57.stories[0].summary, /高9、直径48厘米/);
  assert.match(batch57.stories[0].summary, /MM5197/);
  assert.match(batch57.stories[0].sections[0].text, /葡萄牙航海大帆船的称呼/);
  assert.doesNotMatch(batch57.stories[0].summary, /万历|克拉克号|最重要的中转港/);
  // Jingzhou: the excavation, the largest-and-finest claim, and the exact height.
  assert.match(batch57.stories[1].summary, /天星观2号墓/);
  assert.match(batch57.stories[1].summary, /通高149\.5、宽145\.7厘米/);
  assert.match(batch57.stories[1].sections[1].text, /承受鸣鼓击打的力量/);
  assert.doesNotMatch(batch57.stories[1].sections[1].text, /尚凤抑虎/);
  // Kaifeng: the naming, the material, and the inferred rather than clear date.
  assert.match(batch57.stories[2].summary, /石灰岩质/);
  assert.match(batch57.stories[2].summary, /北魏孝昌三年（527年）/);
  assert.match(batch57.stories[2].sections[3].text, /字迹脱落/);
  assert.doesNotMatch(batch57.stories[2].summary, /高肉髻|纪年清晰|标准器/);
  for (const source of batch57.sources) {
    assert.equal(new URL(source.url).protocol, 'https:');
    assert.ok(['search-text', 'full-text', 'abstract-and-note'].includes(source.retrieval));
  }
  assert.equal(sources.get('b57-mo-klk').kind, 'museum');
  assert.equal(sources.get('b57-kf-khc').kind, 'government-museum');
});

test('batch 58 records the Three Gorges pair and the Wuyu Buddha with per-item evidence', () => {
  assert.deepEqual(batch58.stories.map(story => story.id), ['cq-nxz', 'cq-hty', 'jdz-cslh']);
  assert.equal(batch58.sources.length, 3);
  // Three Gorges Museum official record for the bird-shaped zun.
  assert.match(batch58.stories[0].summary, /2002年出土于涪陵小田溪墓地/);
  assert.match(batch58.stories[0].summary, /长28、宽16\.8、高29厘米/);
  assert.match(batch58.stories[0].sections[1].text, /了无一孔/);
  assert.doesNotMatch(batch58.stories[0].sections[0].text, /巴人崇鸟/);
  // Three Gorges Museum official record for the Tang Yin handscroll.
  assert.match(batch58.stories[1].summary, /纵31、横548厘米/);
  assert.match(batch58.stories[1].summary, /两处唐寅书法/);
  assert.match(batch58.stories[1].sections[3].text, /向不见著录/);
  assert.doesNotMatch(batch58.stories[1].summary, /柔媚笔意|存世代表作/);
  // Xinhua report on the internet nickname versus the museum identity.
  assert.match(batch58.stories[2].summary, /釉下加彩十八罗汉塑像/);
  assert.match(batch58.stories[2].summary, /曾龙升/);
  assert.match(batch58.stories[2].sections[0].text, /被网友取名“无语佛”/);
  assert.doesNotMatch(batch58.stories[2].summary, /釉上彩|雕塑瓷厂|排队半小时/);
  assert.equal(sources.get('b58-cq-nxz').kind, 'museum');
  assert.equal(sources.get('b58-jdz-cslh').kind, 'reported-interview');
  for (const source of batch58.sources) {
    assert.equal(new URL(source.url).protocol, 'https:');
    assert.ok(['search-text', 'full-text', 'abstract-and-note'].includes(source.retrieval));
  }
});

test('batch 59 records the Mukden throne, the polo mirror and the Fuxi-Nuwa silk painting', () => {
  assert.deepEqual(batch59.stories.map(story => story.id), ['sy-ljy', 'yz-tj', 'xj-fxnv']);
  assert.equal(batch59.sources.length, 3);
  // Mukden Palace deer-antler chair: construction, size, and the Qianlong poem.
  assert.match(batch59.stories[0].summary, /反扣于方形底座/);
  assert.match(batch59.stories[0].summary, /通高约1\.5米、鹿角围长近两米/);
  assert.match(batch59.stories[0].sections[2].text, /乾隆十九年（1754）/);
  assert.doesNotMatch(batch59.stories[0].summary, /全国仅此一件|鹿角根/);
  // Yangzhou polo mirror: the image description and the 击鞠 background.
  assert.match(batch59.stories[1].summary, /两组骑士策马击球/);
  assert.match(batch59.stories[1].summary, /兴起于汉代/);
  assert.doesNotMatch(batch59.stories[1].summary, /从波斯传入|宫女/);
  // Xinjiang silk painting: 73 pieces, the era range, and 执矩/执规.
  assert.match(batch59.stories[2].summary, /73幅/);
  assert.match(batch59.stories[2].summary, /魏晋南北朝后期至隋唐/);
  assert.match(batch59.stories[2].sections[1].text, /左手执矩/);
  assert.doesNotMatch(batch59.stories[2].summary, /覆棺|明证/);
  for (const source of batch59.sources) {
    assert.equal(new URL(source.url).protocol, 'https:');
    assert.ok(['search-text', 'full-text', 'abstract-and-note'].includes(source.retrieval));
  }
  assert.equal(sources.get('b59-sy-ljy').kind, 'newspaper');
});

test('batch 60 records the Quanzhou stele, the Buyeo mask and the Qianlong deer vase', () => {
  assert.deepEqual(batch60.stories.map(story => story.id), ['qz-mbs', 'jl-ljm', 'jdz-blz']);
  assert.equal(batch60.sources.length, 3);
  // Quanzhou: dimensions, material, double-sided inscription and the office of the deceased.
  assert.match(batch60.stories[0].summary, /残高44、宽42\.5、厚8\.5厘米/);
  assert.match(batch60.stories[0].summary, /辉绿岩/);
  assert.match(batch60.stories[0].sections[0].text, /底部残缺/);
  assert.match(batch60.stories[0].sections[2].text, /达鲁花赤/);
  assert.doesNotMatch(batch60.stories[0].summary, /穆斯林商人|数百方/);
  // Buyeo mask: findspot, size, and the three competing explanations for the missing ear.
  assert.match(batch60.stories[1].summary, /东团山遗址/);
  assert.match(batch60.stories[1].summary, /面长11\.5、额宽9厘米/);
  assert.match(batch60.stories[1].sections[3].text, /缺耳/);
  assert.doesNotMatch(batch60.stories[1].summary, /贵族墓|丧葬制度/);
  // Qianlong vase: the deer-head name, the auspicious wordplay and "fewer than a hundred".
  assert.match(batch60.stories[2].summary, /鹿头尊/);
  assert.match(batch60.stories[2].summary, /百福百禄/);
  assert.match(batch60.stories[2].sections[3].text, /不满百/);
  assert.doesNotMatch(batch60.stories[2].summary, /极致|顶级案例/);
  for (const source of batch60.sources) {
    assert.equal(new URL(source.url).protocol, 'https:');
    assert.ok(['search-text', 'full-text', 'abstract-and-note'].includes(source.retrieval));
  }
  assert.equal(sources.get('b60-jdz-blz').kind, 'newspaper');
  assert.equal(sources.get('b60-qz-mbs').kind, 'reported-interview');
});

test('batch 61 records the Nurhaci sword, the Cizao kendi and the Guangxi lacquered tube', () => {
  assert.deepEqual(batch61.stories.map(story => story.id), ['sy-yyd', 'qz-jc', 'gx-qht']);
  assert.equal(batch61.sources.length, 3);
  // Nurhaci sword: unsharpened, a Longhu general's investiture gift, 1595.
  assert.match(batch61.stories[0].summary, /未开刃/);
  assert.match(batch61.stories[0].summary, /1595年（明万历二十三年）/);
  assert.match(batch61.stories[0].sections[1].text, /不可能是努尔哈赤日常使用的武器/);
  assert.doesNotMatch(batch61.stories[0].summary, /征战佩用|装具满工/);
  // Cizao kendi: measured, moulded decoration, glaze stopping short of the foot.
  assert.match(batch61.stories[1].summary, /高13厘米/);
  assert.match(batch61.stories[1].summary, /双龙抢珠纹/);
  assert.match(batch61.stories[1].sections[2].text, /施绿釉不及底/);
  assert.doesNotMatch(batch61.stories[1].summary, /伊斯兰教徒|以销定产|来样加工/);
  // Guangxi tube: height, findspot, four painted registers read bottom-up.
  assert.match(batch61.stories[2].summary, /高41\.8厘米/);
  assert.match(batch61.stories[2].summary, /贵港罗泊湾1号墓/);
  assert.match(batch61.stories[2].sections[2].text, /有学者推测/);
  assert.doesNotMatch(batch61.stories[2].summary, /宽衣博带/);
  for (const source of batch61.sources) {
    assert.equal(new URL(source.url).protocol, 'https:');
    assert.ok(['search-text', 'full-text', 'abstract-and-note'].includes(source.retrieval));
  }
  assert.equal(sources.get('b61-qz-jc').kind, 'government-museum');
  assert.equal(sources.get('b61-sy-yyd').kind, 'newspaper');
});

test('batch 62 records the Jun ware censer, the Liao sancai ewer and the Yuan blue-and-white vase', () => {
  assert.deepEqual(batch62.stories.map(story => story.id), ['nm-jyx', 'nm-lsy', 'jdz-qhmb']);
  assert.equal(batch62.sources.length, 3);
  // Yuan Jun censer: findspot year, measurements and the inscription on the neck.
  assert.match(batch62.stories[0].summary, /1970年12月呼和浩特白塔村窖藏发现/);
  assert.match(batch62.stories[0].summary, /口径25\.5、高42\.7厘米/);
  assert.match(batch62.stories[0].sections[2].text, /颈部方形题/);
  assert.doesNotMatch(batch62.stories[0].summary, /紫红斑|双耳外侧/);
  // Liao sancai ewer: Chifeng findspot, three colours, and the glaze-mixing contrast.
  assert.match(batch62.stories[1].summary, /1977年出土于赤峰市松山区王家店乡辽墓/);
  assert.match(batch62.stories[1].summary, /黄、白、绿三彩/);
  assert.match(batch62.stories[1].sections[2].text, /浸润很少/);
  assert.doesNotMatch(batch62.stories[1].summary, /流淌交融|黄绿褐/);
  // Yuan vase: cobalt ore, iron-rust speckles, five registers, binary clay recipe.
  assert.match(batch62.stories[2].summary, /苏麻离青料/);
  assert.match(batch62.stories[2].summary, /铁锈斑/);
  assert.match(batch62.stories[2].sections[3].text, /二元配方/);
  assert.doesNotMatch(batch62.stories[2].summary, /三百余件|拍卖/);
  for (const source of batch62.sources) {
    assert.equal(new URL(source.url).protocol, 'https:');
    assert.ok(['search-text', 'full-text', 'abstract-and-note'].includes(source.retrieval));
  }
  assert.equal(sources.get('b62-jdz-qhmb').kind, 'newspaper');
  assert.equal(sources.get('b62-nm-lsy').kind, 'government-museum');
});

test('batch 63 records the Xinjiang wooden guardian and the Tibetan gilt-bronze Buddha', () => {
  // Evidence-first batch: only two objects had a reachable, checkable source this round,
  // so the batch is two stories rather than three (see the batch audit).
  assert.deepEqual(batch63.stories.map(story => story.id), ['xj-thy', 'xz-ljf']);
  assert.equal(batch63.sources.length, 2);
  // Wooden lokapala: findspot, height, mortise-and-tenon construction, single example.
  assert.match(batch63.stories[0].summary, /1973年吐鲁番阿斯塔那206号墓出土/);
  assert.match(batch63.stories[0].summary, /通高86厘米/);
  assert.match(batch63.stories[0].sections[2].text, /榫头/);
  assert.doesNotMatch(batch63.stories[0].summary, /禁止出国展览/);
  // Gilt bronze: 15th-century dating, 不空成就佛 and the Tibetan style attribution.
  assert.match(batch63.stories[1].summary, /高37厘米、底座宽22厘米/);
  assert.match(batch63.stories[1].summary, /丹萨提风格/);
  assert.match(batch63.stories[1].sections[0].text, /15世纪/);
  assert.doesNotMatch(batch63.stories[1].summary, /永宣宫廷风格/);
  for (const source of batch63.sources) {
    assert.equal(new URL(source.url).protocol, 'https:');
    assert.ok(['search-text', 'full-text', 'abstract-and-note'].includes(source.retrieval));
  }
  assert.equal(sources.get('b63-xz-ljf').kind, 'newspaper');
  assert.equal(sources.get('b63-xj-thy').kind, 'museum-feature');
});

test('batch 64 records the Tang court-lady figurine and the Jin double-fish mirror', () => {
  // Evidence-first batch: two objects with a reachable, checkable source this round.
  assert.deepEqual(batch64.stories.map(story => story.id), ['xa-snt', 'hlj-syj']);
  assert.equal(batch64.sources.length, 2);
  // Court-lady figurine: the hairstyle, the makeup steps and the costume colours.
  assert.match(batch64.stories[0].summary, /乌蛮髻/);
  assert.match(batch64.stories[0].summary, /梅花形红色花钿/);
  assert.match(batch64.stories[0].sections[1].text, /卧蚕/);
  assert.doesNotMatch(batch64.stories[0].summary, /云髻高耸|以胖为美/);
  // Double-fish mirror: category membership, bronze and construction, Jin innovation.
  assert.match(batch64.stories[1].summary, /五个部分|分五类/);
  assert.match(batch64.stories[1].summary, /含锡量较高/);
  assert.match(batch64.stories[1].sections[2].text, /双鱼镜/);
  assert.doesNotMatch(batch64.stories[1].summary, /铜禁|押记|承唐启元/);
  for (const source of batch64.sources) {
    assert.equal(new URL(source.url).protocol, 'https:');
    assert.ok(['search-text', 'full-text', 'abstract-and-note'].includes(source.retrieval));
  }
  assert.equal(sources.get('b64-xa-snt').kind, 'newspaper');
  assert.equal(sources.get('b64-hlj-syj').kind, 'newspaper');
});

test('batch 65 adds two artifacts photographed on site at the Hubei Provincial Museum', () => {
  assert.deepEqual(batch65.stories.map(story => story.id), ['hub-zzs', 'hub-ymh']);
  assert.equal(batch65.sources.length, 3);
  // Both new artifacts must exist in the atlas with the same summary text as their story.
  for (const story of batch65.stories) {
    const artifact = objects.get(story.id);
    assert.ok(artifact, `${story.id} exists in the atlas`);
    assert.equal(artifact.story, story.summary, `${story.id} card and story summaries match`);
    assert.ok(storyTeaserIndex[story.id], `${story.id} is routable`);
    assert.ok(storyTeaserHooks[story.id], `${story.id} has a teaser hook`);
  }
  // Zeng Zhong You-fu hu: museum-official figures and inscription locations.
  assert.match(batch65.stories[0].summary, /1966年出土于湖北京山苏家垅/);
  assert.match(batch65.stories[0].summary, /通高66厘米、宽23.8厘米/);
  assert.match(batch65.stories[0].sections[1].text, /器盖内、壶口内/);
  // Duck-shaped lacquer box: the pivoting head and the bell-striking painting.
  assert.match(batch65.stories[1].summary, /羽翼上掀即为盒盖/);
  assert.match(batch65.stories[1].sections[2].text, /又能灵活转动/);
  assert.match(batch65.stories[1].sections[3].text, /撞钟/);
  for (const source of batch65.sources) {
    assert.equal(new URL(source.url).protocol, 'https:');
    assert.ok(['search-text', 'full-text', 'abstract-and-note'].includes(source.retrieval));
  }
  assert.equal(sources.get('b65-hub-zzs').kind, 'museum-official');
  assert.equal(sources.get('b65-hub-ymh').kind, 'reported-interview');
  assert.equal(sources.get('b65-field-hubei').kind, 'field-photograph');
});

test('the home beacon rotates over field-visit stories instead of repeating one artifact', async () => {
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  assert.match(app, /FIELD_IDS = 'hub-zhy hub-zzs hub-ymh hub-hjd hub-hjs hub-hjy hub-zbh hub-zbl hub-hyy hub-qqw hub-nnd hub-xd hub-fcb hub-jjj hub-czd hub-lgd hub-yzc hub-jb'/);
  assert.match(app, /data-beacon-story=/);
  // The beacon ids must all be real, routable stories with a museum behind them.
  for (const id of ['hub-zhy', 'hub-zzs', 'hub-ymh', 'hub-hjd', 'hub-hjs', 'hub-hjy', 'hub-zbh', 'hub-zbl', 'hub-hyy', 'hub-qqw', 'hub-nnd', 'hub-xd', 'hub-fcb', 'hub-jjj', 'hub-czd', 'hub-lgd', 'hub-yzc', 'hub-jb']) {
    assert.ok(objects.has(id), `${id} is an atlas artifact`);
    assert.ok(storyTeaserIndex[id], `${id} is a routable story`);
  }
});

test('batch 70 adds three name-only label objects and says so plainly', () => {
  assert.deepEqual(batch70.stories.map(story => story.id), ['hub-lgd', 'hub-yzc', 'hub-jb']);
  assert.equal(batch70.sources.length, 3);
  for (const story of batch70.stories) {
    const artifact = objects.get(story.id);
    assert.ok(artifact, `${story.id} exists in the atlas`);
    assert.equal(artifact.story, story.summary, `${story.id} card and story summaries match`);
    assert.ok(storyTeaserIndex[story.id] && storyTeaserHooks[story.id], `${story.id} is routable with a hook`);
    // Name-only labels: the era field must stay explicitly undetermined, not guessed.
    assert.equal(artifact.dynasty, '未定', `${story.id} dynasty must stay undetermined`);
    assert.match(story.uncertainty, /未标/);
    assert.doesNotMatch(story.summary, /战国|春秋|西周/);
  }
  // Each story must state that the label carries only the name.
  assert.match(batch70.stories[0].sections[0].text, /豆的样子很好认/);
  assert.match(batch70.stories[2].sections[1].text, /贴在铜器/);
  for (const source of batch70.sources) {
    assert.equal(new URL(source.url).protocol, 'https:');
    assert.ok(['search-text', 'full-text', 'abstract-and-note'].includes(source.retrieval));
  }
  assert.equal(sources.get('b70-hub-jb-label').kind, 'field-photograph');
});

test('batch 69 adds the square you, the Xi-halberd and the Chu-zi Chao ding', () => {
  assert.deepEqual(batch69.stories.map(story => story.id), ['hub-fcb', 'hub-jjj', 'hub-czd']);
  assert.equal(batch69.sources.length, 3);
  for (const story of batch69.stories) {
    const artifact = objects.get(story.id);
    assert.ok(artifact, `${story.id} exists in the atlas`);
    assert.equal(artifact.story, story.summary, `${story.id} card and story summaries match`);
    assert.ok(storyTeaserIndex[story.id] && storyTeaserHooks[story.id], `${story.id} is routable with a hook`);
  }
  // Square you: the missing handle is presented as an inference from the ring ears.
  assert.match(batch69.stories[0].summary, /盖呈四面坡屋顶形/);
  assert.match(batch69.stories[0].sections[1].text, /本应该有一副提梁/);
  // Xi-halberd: seven-character inscription, "earliest known enfeoffed lord" stays qualified.
  assert.match(batch69.stories[1].summary, /七字铭文/);
  assert.match(batch69.stories[1].sections[2].text, /公元前477年/);
  assert.match(batch69.stories[1].sections[2].text, /目前所见最早的一例封君/);
  // Chu-zi Chao ding: only three label lines, so no shape or decoration may be asserted.
  assert.match(batch69.stories[2].summary, /1974年宜昌当阳电一1号墓出土/);
  assert.doesNotMatch(batch69.stories[2].sections[0].text, /纹饰为|器形为|兽面纹|蟠螭纹/);
  assert.match(batch69.stories[2].uncertainty, /未标器形/);
  for (const source of batch69.sources) {
    assert.equal(new URL(source.url).protocol, 'https:');
    assert.ok(['search-text', 'full-text', 'abstract-and-note'].includes(source.retrieval));
  }
  assert.equal(sources.get('b69-hub-jjj-label').kind, 'field-photograph');
});

test('batch 68 adds the Sujialong ding group, the buffalo-knob ding and the jade-pommel scraper', () => {
  assert.deepEqual(batch68.stories.map(story => story.id), ['hub-qqw', 'hub-nnd', 'hub-xd']);
  assert.equal(batch68.sources.length, 3);
  for (const story of batch68.stories) {
    const artifact = objects.get(story.id);
    assert.ok(artifact, `${story.id} exists in the atlas`);
    assert.equal(artifact.story, story.summary, `${story.id} card and story summaries match`);
    assert.ok(storyTeaserIndex[story.id] && storyTeaserHooks[story.id], `${story.id} is routable with a hook`);
  }
  // Sujialong group: nine ding, two with inscriptions, and the missing gui is recorded.
  assert.match(batch68.stories[0].summary, /九鼎器型与纹饰基本相同/);
  assert.match(batch68.stories[0].sections[2].text, /实际只出土了七只簋/);
  // Buffalo-knob ding: only one label sentence; the tomb owner comes from the cited report.
  assert.match(batch68.stories[1].summary, /盖顶饰牛形钮/);
  assert.match(batch68.stories[1].sections[1].text, /曾侯丙/);
  // The label has a single sentence, so the story must not invent decorative detail.
  assert.doesNotMatch(batch68.stories[1].sections[0].text, /兽面纹|蟠螭纹|云纹|垂鳞纹/);
  // Jade-pommel scraper: the label does NOT name the tomb, and the story must not assert one.
  assert.match(batch68.stories[2].summary, /东室共出土4件削刀/);
  assert.doesNotMatch(batch68.stories[2].summary, /曾侯乙墓/);
  assert.match(batch68.stories[2].uncertainty, /没写明它出自哪一座墓的东室/);
  for (const source of batch68.sources) {
    assert.equal(new URL(source.url).protocol, 'https:');
    assert.ok(['search-text', 'full-text', 'abstract-and-note'].includes(source.retrieval));
  }
  assert.equal(sources.get('b68-hub-qqw-label').kind, 'field-photograph');
});

test('batch 67 adds the Guojiamiao paired bronzes and the Marquis Yu yong-bell', () => {
  assert.deepEqual(batch67.stories.map(story => story.id), ['hub-zbh', 'hub-zbl', 'hub-hyy']);
  assert.equal(batch67.sources.length, 5);
  for (const story of batch67.stories) {
    const artifact = objects.get(story.id);
    assert.ok(artifact, `${story.id} exists in the atlas`);
    assert.equal(artifact.story, story.summary, `${story.id} card and story summaries match`);
    assert.ok(storyTeaserIndex[story.id] && storyTeaserHooks[story.id], `${story.id} is routable with a hook`);
  }
  // Paired hu: two identical vessels, label wording preserved.
  assert.match(batch67.stories[0].summary, /两件铜壶形制、大小、纹饰相同/);
  assert.match(batch67.stories[0].summary, /曾子伯旁晨自作行器，其永祜福/);
  // Li-cauldron: the label writes 曾子旁晨 without 伯, and the story must not merge the names.
  assert.match(batch67.stories[1].summary, /曾子旁晨行器/);
  assert.doesNotMatch(batch67.stories[1].summary, /曾子伯旁晨/);
  assert.match(batch67.stories[1].sections[1].text, /月牙形扉棱/);
  // Yong-bell: eight bells, this one is No.2, and the inscription is read against Zuo Zhuan.
  assert.match(batch67.stories[2].summary, /现存八件，本件为2号/);
  assert.match(batch67.stories[2].sections[2].text, /吴师入郢/);
  assert.match(batch67.stories[2].sections[1].text, /王逝命南公營宅沃土/);
  for (const source of batch67.sources) {
    assert.equal(new URL(source.url).protocol, 'https:');
    assert.ok(['search-text', 'full-text', 'abstract-and-note'].includes(source.retrieval));
  }
  assert.equal(sources.get('b67-gjm-86').kind, 'reported-interview');
  assert.equal(sources.get('b67-hyy-philology').kind, 'academic-article');
});

test('batch 66 adds the Yejiashan Zeng bronzes and the Huang Ji Ying ding from field labels', () => {
  assert.deepEqual(batch66.stories.map(story => story.id), ['hub-hjd', 'hub-hjs', 'hub-hjy']);
  assert.equal(batch66.sources.length, 4);
  for (const story of batch66.stories) {
    const artifact = objects.get(story.id);
    assert.ok(artifact, `${story.id} exists in the atlas`);
    assert.equal(artifact.story, story.summary, `${story.id} card and story summaries match`);
    assert.ok(storyTeaserIndex[story.id] && storyTeaserHooks[story.id], `${story.id} is routable with a hook`);
  }
  // Zeng Hou Jian ding: paired casting split across tombs 2 and 28.
  assert.match(batch66.stories[0].summary, /2011年随州叶家山墓地2号墓出土/);
  assert.match(batch66.stories[0].summary, /曾侯谏作宝彝/);
  assert.match(batch66.stories[0].sections[1].text, /被分置于不同的墓葬之中/);
  // Sihu jar: the wooden-prototype reasoning stays a quotation of the label.
  assert.match(batch66.stories[1].summary, /曾侯谏作媿肆壶/);
  assert.match(batch66.stories[1].sections[2].text, /推断的依据是同时期同区域/);
  // Huang Ji Ying ding: the marriage-gift reading stays marked as a possibility.
  assert.match(batch66.stories[2].summary, /黄季作季嬴宝鼎/);
  assert.match(batch66.stories[2].sections[2].text, /可能是黄国女子嫁到曾国时的陪嫁品/);
  assert.doesNotMatch(batch66.stories[2].summary, /证明了两国联姻/);
  for (const source of batch66.sources) {
    assert.equal(new URL(source.url).protocol, 'https:');
    assert.ok(['search-text', 'full-text', 'abstract-and-note'].includes(source.retrieval));
  }
  assert.equal(sources.get('b66-zeng-state').kind, 'reported-interview');
  assert.equal(sources.get('b66-hub-hjd-label').kind, 'field-photograph');
});
