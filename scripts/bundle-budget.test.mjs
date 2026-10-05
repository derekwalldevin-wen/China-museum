import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';
import { gzipSync } from 'node:zlib';

const assetsUrl = new URL('../dist/assets/', import.meta.url);
const files = readdirSync(assetsUrl);
const one = (pattern) => {
  const matches = files.filter(file => pattern.test(file));
  assert.equal(matches.length, 1, `${pattern} matched ${matches.join(', ')}`);
  return matches[0];
};
const main = one(/^index-[\w-]+\.js$/);
const story = one(/^StoryExperience-[\w-]+\.js$/);
const map = one(/^ScrollMapScene-[\w-]+\.js$/);
const standardMap = one(/^china-provinces\.standard-[\w-]+\.js$/);
const compactMap = one(/^china-provinces\.compact-[\w-]+\.js$/);
const inkIntro = one(/^InkScrollIntro-[\w-]+\.js$/);
const artifactSearch = one(/^artifact-search-[\w-]+\.json$/);
const generation = JSON.parse(readFileSync(new URL('../docs/audits/museum-data-generation.json', import.meta.url), 'utf8'));
const imageGeneration = JSON.parse(readFileSync(new URL('../docs/audits/image-data-generation.json', import.meta.url), 'utf8'));
const rendering = one(/^(?:ResponsiveArtifactImage|useArtifactCardEntry)-[\w-]+\.js$/);
const storyGeneration = JSON.parse(readFileSync(new URL('../docs/audits/story-data-generation.json', import.meta.url), 'utf8'));
// Vite's default hash is eight characters. An unbounded suffix also matched
// gansu-jiandu when looking for gansu, counting two different museums as one.
const payloadChunks = generation.payloads.files.map(({ id }) => one(new RegExp(`^${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-[\\w-]{8}\\.js$`)));
const mainText = readFileSync(new URL(main, assetsUrl), 'utf8');
const storyText = readFileSync(new URL(story, assetsUrl), 'utf8');
const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const allJavaScript = files.filter(file => file.endsWith('.js')).map(file => readFileSync(new URL(file, assetsUrl), 'utf8')).join('\n');

/**
 * The atlas is now one of two pages, so Vite hoists shared dependencies (React et al.)
 * into a common chunk. The budget only means something if it counts everything the
 * atlas page loads statically, not just the entry file.
 */
function staticGraph(pageHtml) {
  const seen = new Set();
  const queue = [...pageHtml.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map(match => new URL(match[1], new URL('../dist/', import.meta.url)));
  while (queue.length) {
    const url = queue.shift();
    if (seen.has(url.pathname) || !existsSync(url)) continue;
    seen.add(url.pathname);
    const code = readFileSync(url, 'utf8');
    for (const match of code.matchAll(/(?:from|import)\s*["'](\.[^"']+\.js)["']/g)) queue.push(new URL(match[1], url));
  }
  return [...seen].map(pathname => pathname.split(/[\\/]/).pop());
}
const initialChunks = staticGraph(html);
const initialBytes = initialChunks.reduce((sum, file) => sum + statSync(new URL(file, assetsUrl)).size, 0);
const initialText = initialChunks.map(file => readFileSync(new URL(file, assetsUrl), 'utf8')).join('\n');

test('initial JavaScript stays below the production budget', () => {
  // Counts the entry plus every chunk it imports statically (2026-09-30 two-page build:
  // index + shared client chunk). The ceiling itself is unchanged.
  assert.ok(initialBytes <= 328_000, `${initialChunks.join(' + ')} exceed 328kB (${initialBytes} bytes)`);
  assert.match(html, new RegExp(`/assets/${main.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
});

test('full museum descriptions and search prose stay out of the first screen', () => {
  assert.equal(payloadChunks.length, generation.source.museums);
  // The original per-object allowance is unchanged. New direct bibliographic
  // records are separately metered, deferred with their museum, never initial JS.
  // Do not let full evidence/writing packs enter these captions.
  const batches=['03','04','05'].map(tranche=>JSON.parse(readFileSync(new URL(`../assets/expansion/admission-tranche-${tranche}.json`,import.meta.url),'utf8')));
  const batchIds=new Set(batches.flatMap(batch=>batch.admitted.map(item=>item.id)));
  let referenceBytes=0;
  for(const {path} of generation.payloads.files){
    const payload=JSON.parse(readFileSync(new URL(`../${path}`,import.meta.url),'utf8'));
    for(const artifact of payload.artifacts.filter(item=>batchIds.has(item.id))){
      const bytes=Buffer.byteLength(JSON.stringify(artifact.references??[]));
      assert.ok(bytes<=620,`Reference caption too large: ${artifact.id}`);
      referenceBytes+=bytes;
    }
  }
  assert.ok(payloadChunks.reduce((sum, file) => sum + statSync(new URL(file, assetsUrl)).size, 0) <= generation.source.artifacts * 500 + referenceBytes);
  // Collection expansion grows only this deferred search JSON, not the initial JS.
  assert.ok(statSync(new URL(artifactSearch, assetsUrl)).size <= generation.source.artifacts * 260, 'Lazy search data must remain a compact corpus, not full reference documents');
  assert.doesNotMatch(initialText, /张择端《清明上河图》是北宋/);
  assert.doesNotMatch(initialText, /authorizationStatus/);
  assert.doesNotMatch(html, /artifact-search|gugong-|guobo-/);
  // The visitor-record tool must never join the atlas first screen.
  assert.doesNotMatch(initialText, /huaxia-visitor-records/);
});

test('responsive card delivery stays deferred and complete provenance stays in 59 static payloads', () => {
  // The 223-record legacy allowance remains unchanged. Expansion records have
  // independent card/detail JPEGs, longer immutable URLs and JPEG fallbacks.
  // This is an OFFLINE registry; browsers load only a museum shard, never it all.
  const expandedRecords = Math.max(0, generation.source.artifacts - 223);
  assert.ok(imageGeneration.cardManifest.bytes <= Math.min(223,generation.source.artifacts)*850 + expandedRecords*1600, `offline card manifest is ${imageGeneration.cardManifest.bytes} B`);
  const provenanceDirectory = new URL('../dist/data/image-provenance/', import.meta.url);
  const provenanceFiles = readdirSync(provenanceDirectory).filter(file => file.endsWith('.json')).sort();
  assert.equal(provenanceFiles.length, generation.source.museums);
  assert.deepEqual(provenanceFiles, imageGeneration.provenancePayloads.files.map(item => `${item.id}.json`).sort());
  // Full AI evidence remains in per-museum payloads, not the first-screen JavaScript.
  assert.ok(provenanceFiles.reduce((sum, file) => sum + statSync(new URL(file, provenanceDirectory)).size, 0) <= Math.min(223,generation.source.artifacts)*1800 + expandedRecords*3200);
  const responsive = rendering;
  // 2026-10-01: two field-photographed Hubei artifacts (and hub-zhy switching to a real photo)
  // added their responsive delivery URLs to this deferred gallery chunk; the ceiling moved
  // The ceiling tracks the atlas size: 122 kB at 206 artifacts, 126 kB at 208, 134 kB at 214.
  assert.ok(statSync(new URL(responsive, assetsUrl)).size <= 142_000, `${responsive} exceeds 134kB`);
  assert.doesNotMatch(mainText, /artifact-responsive/);
  assert.doesNotMatch(allJavaScript, /1c5c2e0ec384ffd154af4325f8dbe2c6e4935227aa20ea8504bfad46e5b720ee/);
  assert.doesNotMatch(allJavaScript, /摄影者原始发布文件与Commons公布SHA-1完全一致/);
  assert.doesNotMatch(html, /image-provenance|images\.json/);
});

test('full story prose is deferred but lightweight routing stays initial', () => {
  assert.doesNotMatch(mainText, /《平复帖》是西晋陆机的草隶书手札/);
  assert.doesNotMatch(storyText, /《平复帖》是西晋陆机的草隶书手札/);
  // The guide chunk carries the lightweight per-story catalog (id + hook, ~110 B per
  // story), so its ceiling scales with the collection instead of being a fixed number.
  // Measured marginal cost is ~175 B per story; 220 B leaves headroom for a batch while
  // staying far below the ~4.5 kB per story that full prose would add.
  const guideBudget = 22_000 + storyGeneration.payloads.count * 220;
  assert.ok(statSync(new URL(story, assetsUrl)).size <= guideBudget, `${story} should only carry the reader and story catalog (budget ${guideBudget})`);
  const pft = one(/^gg-pft-[\w-]+\.js$/);
  assert.match(readFileSync(new URL(pft, assetsUrl), 'utf8'), /《平复帖》是西晋陆机的草隶书手札/);
  // Story payload count pin: 218 before the writing pass, then 263 (tranche 04), 343 (the tranche
  // 01-03 backfill plus five index-only entries) and 388 once tranche 05 landed. Every artifact in
  // the atlas now has a story; the guide chunk budget above scales with the count, so prose stays deferred.
  assert.equal(storyGeneration.payloads.count, 388);
  for (const { id } of storyGeneration.payloads.files) one(new RegExp(`^${id}-[\\w-]+\\.js$`));
  assert.match(mainText, /gg-qmsh/);
});

test('map and non-first-screen surfaces remain separate chunks', () => {
  for (const pattern of [/^ProvincePanel-.*\.js$/, /^RegionDirectory-.*\.js$/, /^CollectionResults-.*\.js$/, /^MuseumDetail-.*\.js$/, /^ArtifactCard-.*\.js$/]) one(pattern);
  assert.ok(!initialChunks.includes(rendering));
  assert.ok(statSync(new URL(map, assetsUrl)).size <= 15_000);
  assert.ok(statSync(new URL(standardMap, assetsUrl)).size <= 142_000);
  assert.ok(statSync(new URL(compactMap, assetsUrl)).size <= 90_000);
  assert.doesNotMatch(html, /ScrollMapScene|StoryExperience|ProvincePanel|MuseumDetail|RegionDirectory|CollectionResults/);
});

test('the narrative web-motion opening stays deferred and lightweight', () => {
  const introText = readFileSync(new URL(inkIntro, assetsUrl));
  assert.ok(gzipSync(introText).length <= 180_000, `${inkIntro} exceeds the 180kB gzip dynamic ceiling`);
  assert.doesNotMatch(html, /InkScrollIntro|three/i);
  assert.doesNotMatch(mainText, /data-intro-motion|gl_PointSize|WebGLRenderer|ShaderMaterial/);
  assert.match(introText.toString(), /gl_PointSize/);
});

test('shared artifact rendering chunk carries delivery URLs but no complete provenance registry', () => {
  const art = rendering;
  const text = readFileSync(new URL(art, assetsUrl), 'utf8');
  assert.ok(statSync(new URL(art, assetsUrl)).size <= 142_000, `${art} exceeds the deferred rendering budget`);
  assert.doesNotMatch(text, /authorizationStatus|processingManifest|assetSha256/);
});

test('deferred surfaces provide stable loading and reload recovery copy', () => {
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  assert.match(app, /保留当前位置，重新载入/);
  assert.match(app, /重新铺开舆图/);
  assert.match(app, /故事地址与原来的筛选、详情位置都已保留/);
  assert.match(app, /window\.location\.reload\(\)/);
});
