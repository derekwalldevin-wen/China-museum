import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

const dataDir = new URL('../src/data/', import.meta.url);
const payloadDir = new URL('../src/data/story-payloads/', import.meta.url);
const report = JSON.parse(await readFile(new URL('../docs/audits/story-data-generation.json', import.meta.url)));
const catalogBytes = await readFile(new URL('../src/data/story-catalog.json', import.meta.url));
const catalog = JSON.parse(catalogBytes);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const stories = new Map();
const sources = new Map();
const trails = [];
const sourceFiles = (await readdir(dataDir)).filter(file => /^stories(?:-batch\d+)?\.json$/.test(file));
sourceFiles.sort((a, b) => (a === 'stories.json' ? 0 : Number(a.match(/batch(\d+)/)[1])) - (b === 'stories.json' ? 0 : Number(b.match(/batch(\d+)/)[1])));
for (const file of sourceFiles) {
  const bytes = await readFile(new URL(file, dataDir));
  assert.deepEqual(report.inputs.find(input => input.path === `src/data/${file}`), { path:`src/data/${file}`, bytes:bytes.length, sha256:sha256(bytes) });
  const batch = JSON.parse(bytes);
  for (const story of batch.stories) stories.set(story.id, story);
  for (const source of batch.sources) sources.set(source.id, source);
  trails.push(...batch.trails);
}

test('derived catalog contains every story hook and trail without story bodies or provenance', () => {
  assert.equal(catalog.stories.length, stories.size);
  assert.equal(catalog.trails.length, trails.length);
  assert.deepEqual(catalog.stories, [...stories.values()].map(({ id, hook }) => ({ id, hook })));
  assert.deepEqual(catalog.trails, trails);
  assert.equal(catalogBytes.length, report.catalog.bytes);
  assert.equal(sha256(catalogBytes), report.catalog.sha256);
  // The catalog holds only id + hook, so it grows with the collection (~109 B per
  // story). Scale the ceiling with the story count instead of pinning a fixed number,
  // while the deepEqual above and the prose check below still forbid embedded bodies.
  assert.ok(catalogBytes.length <= 3_000 + stories.size * 110, `catalog ${catalogBytes.length} B for ${stories.size} stories`);
  assert.doesNotMatch(catalogBytes.toString(), /《平复帖》开头关心“彦先”的疾病|authorizationStatus|processingManifest/);
});

test('every story payload round-trips the final authoritative story and exactly its cited sources', async () => {
  const names = (await readdir(payloadDir)).filter(file => file.endsWith('.json')).sort();
  assert.deepEqual(names, [...stories.keys()].map(id => `${id}.json`).sort());
  assert.equal(report.payloads.count, stories.size);
  let total = 0;
  for (const [id, story] of stories) {
    const bytes = await readFile(new URL(`${id}.json`, payloadDir));
    const payload = JSON.parse(bytes);
    const refs = [...new Set([...story.summaryRefs, ...story.sections.flatMap(section => section.refs), ...story.details.flatMap(detail => detail.refs), ...story.reflection.refs])];
    assert.deepEqual(payload.story, story, id);
    assert.deepEqual(payload.sources, Object.fromEntries(refs.map(ref => [ref, sources.get(ref)])), id);
    assert.deepEqual(report.payloads.files.find(file => file.id === id), { id, path:`src/data/story-payloads/${id}.json`, bytes:bytes.length, sha256:sha256(bytes), sources:refs.length });
    total += bytes.length;
  }
  assert.equal(total, report.payloads.totalBytes);
});
