import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import museums from '../src/data/museum-index.json' with { type: 'json' };
import cards from '../src/data/image-card-manifest.json' with { type: 'json' };

test('per-museum safe card shards round-trip the authoritative display manifest', async () => {
  const directory = new URL('../public/data/image-cards/', import.meta.url);
  assert.deepEqual((await readdir(directory)).filter(name => name.endsWith('.json')).sort(), museums.map(museum => `${museum.id}.json`).sort());
  const rebuilt = {};
  for (const museum of museums) {
    const payload = JSON.parse(await readFile(new URL(`${museum.id}.json`, directory), 'utf8'));
    assert.equal(payload.museumId, museum.id);
    assert.deepEqual(Object.keys(payload.records), museum.artifacts.map(artifact => artifact.id));
    Object.assign(rebuilt, payload.records);
  }
  assert.deepEqual(rebuilt, cards);
});

test('runtime card resolution never imports the all-museum manifest', async () => {
  const source = await readFile(new URL('../src/data/images.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /image-card-manifest\.json|images\.json/);
  const loader = await readFile(new URL('../src/data/image-card-loader.ts', import.meta.url), 'utf8');
  assert.match(loader, /data\/image-cards/);
  assert.match(loader, /requests.delete\(museumId\)/);
  assert.match(loader, /Incomplete card metadata/);
  assert.match(loader, /Mismatched card metadata/);
});
