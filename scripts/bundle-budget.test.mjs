import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
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
const storyGeneration = JSON.parse(readFileSync(new URL('../docs/audits/story-data-generation.json', import.meta.url), 'utf8'));
const payloadChunks = generation.payloads.files.map(({ id }) => one(new RegExp(`^${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-[\\w-]+\\.js$`)));
const mainText = readFileSync(new URL(main, assetsUrl), 'utf8');
const storyText = readFileSync(new URL(story, assetsUrl), 'utf8');
const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const allJavaScript = files.filter(file => file.endsWith('.js')).map(file => readFileSync(new URL(file, assetsUrl), 'utf8')).join('\n');

test('initial JavaScript stays below the production budget', () => {
  // The current Vite 7 build is 325,305 bytes; retain a tight ceiling without hiding a 0.1% toolchain variation.
  assert.ok(statSync(new URL(main, assetsUrl)).size <= 326_000, `${main} exceeds 326kB`);
  assert.match(html, new RegExp(`/assets/${main.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
});

test('full museum descriptions and search prose stay out of the first screen', () => {
  assert.equal(payloadChunks.length, 59);
  assert.ok(payloadChunks.reduce((sum, file) => sum + statSync(new URL(file, assetsUrl)).size, 0) <= 105_000);
  // Collection expansion grows only this deferred search JSON, not the initial JS.
  assert.ok(statSync(new URL(artifactSearch, assetsUrl)).size <= 52_000);
  assert.doesNotMatch(mainText, /张择端《清明上河图》是北宋/);
  assert.doesNotMatch(mainText, /authorizationStatus/);
  assert.doesNotMatch(html, /artifact-search|gugong-|guobo-/);
});

test('responsive card delivery stays deferred and complete provenance stays in 59 static payloads', () => {
  // Five more artifacts add safe delivery URLs only to this deferred card list.
  assert.ok(imageGeneration.cardManifest.bytes <= 164_000, `card manifest is ${imageGeneration.cardManifest.bytes} B`);
  const provenanceDirectory = new URL('../dist/data/image-provenance/', import.meta.url);
  const provenanceFiles = readdirSync(provenanceDirectory).filter(file => file.endsWith('.json')).sort();
  assert.equal(provenanceFiles.length, 59);
  assert.deepEqual(provenanceFiles, imageGeneration.provenancePayloads.files.map(item => `${item.id}.json`).sort());
  // Full AI evidence remains in per-museum payloads, not the first-screen JavaScript.
  assert.ok(provenanceFiles.reduce((sum, file) => sum + statSync(new URL(file, provenanceDirectory)).size, 0) <= 325_000);
  const responsive = one(/^ResponsiveArtifactImage-[\w-]+\.js$/);
  // The eleven added cards contribute their responsive URLs to this deferred gallery chunk.
  assert.ok(statSync(new URL(responsive, assetsUrl)).size <= 122_000, `${responsive} exceeds 122kB`);
  assert.doesNotMatch(mainText, /artifact-responsive/);
  assert.doesNotMatch(allJavaScript, /1c5c2e0ec384ffd154af4325f8dbe2c6e4935227aa20ea8504bfad46e5b720ee/);
  assert.doesNotMatch(allJavaScript, /摄影者原始发布文件与Commons公布SHA-1完全一致/);
  assert.doesNotMatch(html, /image-provenance|images\.json/);
});

test('full story prose is deferred but lightweight routing stays initial', () => {
  assert.doesNotMatch(mainText, /《平复帖》开头关心“彦先”的疾病/);
  assert.doesNotMatch(storyText, /《平复帖》开头关心“彦先”的疾病/);
  // The guide chunk carries the lightweight per-story catalog (id + hook, ~110 B per
  // story), so its ceiling scales with the collection instead of being a fixed number.
  // Measured marginal cost is ~175 B per story; 220 B leaves headroom for a batch while
  // staying far below the ~4.5 kB per story that full prose would add.
  const guideBudget = 22_000 + storyGeneration.payloads.count * 220;
  assert.ok(statSync(new URL(story, assetsUrl)).size <= guideBudget, `${story} should only carry the reader and story catalog (budget ${guideBudget})`);
  const pft = one(/^gg-pft-[\w-]+\.js$/);
  assert.match(readFileSync(new URL(pft, assetsUrl), 'utf8'), /《平复帖》开头关心“彦先”的疾病/);
  assert.equal(storyGeneration.payloads.count, 179);
  for (const { id } of storyGeneration.payloads.files) one(new RegExp(`^${id}-[\\w-]+\\.js$`));
  assert.match(mainText, /gg-qmsh/);
});

test('map and non-first-screen surfaces remain separate chunks', () => {
  for (const pattern of [/^ProvincePanel-.*\.js$/, /^RegionDirectory-.*\.js$/, /^CollectionResults-.*\.js$/, /^MuseumDetail-.*\.js$/, /^ArtifactCard-.*\.js$/, /^ResponsiveArtifactImage-.*\.js$/]) one(pattern);
  assert.ok(statSync(new URL(map, assetsUrl)).size <= 15_000);
  assert.ok(statSync(new URL(standardMap, assetsUrl)).size <= 140_000);
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
  const art = one(/^ResponsiveArtifactImage-.*\.js$/);
  const text = readFileSync(new URL(art, assetsUrl), 'utf8');
  assert.ok(statSync(new URL(art, assetsUrl)).size <= 122_000, `${art} exceeds the deferred rendering budget`);
  assert.doesNotMatch(text, /authorizationStatus|processingManifest|assetSha256/);
});

test('deferred surfaces provide stable loading and reload recovery copy', () => {
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  assert.match(app, /保留当前位置，重新载入/);
  assert.match(app, /重新铺开舆图/);
  assert.match(app, /故事地址与原来的筛选、详情位置都已保留/);
  assert.match(app, /window\.location\.reload\(\)/);
});
