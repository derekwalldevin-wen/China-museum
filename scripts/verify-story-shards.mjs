import assert from 'node:assert/strict';
import { readFile, readdir, writeFile } from 'node:fs/promises';

const shardCount = Number(process.env.HUAXIA_STORY_SHARD_COUNT ?? 6);
assert.ok(Number.isInteger(shardCount) && shardCount > 0);
const sourceDir = new URL('../src/data/', import.meta.url);
const sourceFiles = (await readdir(sourceDir)).filter(file => /^stories(?:-batch\d+)?\.json$/.test(file));
sourceFiles.sort((a, b) => {
  const index = file => file === 'stories.json' ? 1 : Number(file.match(/batch(\d+)/)?.[1]);
  return index(a) - index(b);
});
const byId = new Map();
for (const file of sourceFiles) {
  const data = JSON.parse(await readFile(new URL(file, sourceDir), 'utf8'));
  for (const story of data.stories) byId.set(story.id, story);
}
const expected = [...byId.keys()].sort();
const output = new URL(`../docs/audits/story-browser/shards-${shardCount}/`, import.meta.url);
const seen = new Set();
const summaries = [];
let base;
for (let shardIndex = 0; shardIndex < shardCount; shardIndex++) {
  const result = JSON.parse(await readFile(new URL(`shard-${shardIndex}.json`, output), 'utf8'));
  assert.equal(result.shardIndex, shardIndex);
  assert.equal(result.shardCount, shardCount);
  assert.equal(result.catalogSize, expected.length);
  assert.equal(result.completed, true);
  assert.deepEqual(result.failures, []);
  assert.deepEqual(result.ids, expected.filter((_, index) => index % shardCount === shardIndex));
  assert.equal(result.checks.length, result.ids.length * 2);
  if (base === undefined) base = result.base;
  assert.equal(result.base, base);
  for (const check of result.checks) {
    assert.equal(check.passed, true);
    const key = `${check.id}:${check.device}`;
    assert.ok(result.ids.includes(check.id));
    assert.ok(['desktop', 'mobile'].includes(check.device));
    assert.ok(!seen.has(key), `duplicate ${key}`);
    seen.add(key);
  }
  summaries.push({ shardIndex, artifacts: result.ids.length, checks: result.checks.length });
}
for (const id of expected) for (const device of ['desktop', 'mobile']) assert.ok(seen.has(`${id}:${device}`), `missing ${id}:${device}`);
assert.equal(seen.size, expected.length * 2);
const summary = { base, catalogSize: expected.length, viewportChecks: seen.size, shardCount, summaries, verifiedAt: new Date().toISOString() };
await writeFile(new URL('summary.json', output), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
