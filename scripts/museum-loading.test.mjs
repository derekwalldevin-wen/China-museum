import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import { museums } from '../src/data/museums.ts';
import museumIndex from '../src/data/museum-index.json' with { type:'json' };
import searchCorpus from '../src/data/artifact-search.json' with { type:'json' };
import generation from '../docs/audits/museum-data-generation.json' with { type:'json' };
import { CATEGORY_OPTIONS, ERA_OPTIONS, findCollection } from '../src/data/collection.ts';
import { searchMuseumIndex } from '../src/data/search.ts';
import { artifactAttribution } from '../src/data/artifact-attribution.ts';

const normalize = value => value.toLocaleLowerCase().replace(/[\s《》〈〉·•（）()，,。.!！?？:：；;]/g, '');
const ids = results => results ? {
  museums: results.museums.map(item => [item.museum.id, item.score]),
  artifacts: results.artifacts.map(item => [item.artifact.id, item.score]),
  museumTotal: results.museumTotal,
  artifactTotal: results.artifactTotal,
} : null;

function legacySearch(value) {
  const corpus = Object.fromEntries(museums.flatMap(museum => museum.artifacts.map(artifact => [artifact.id, normalize([artifact.story, ...(artifact.keywords ?? []), artifact.inventoryNumber ?? ''].join(' '))])));
  return searchMuseumIndex(museums, value, corpus);
}

test('generated museum data is bound to the untouched authority source', async () => {
  const source = await readFile(new URL('../src/data/museums.ts', import.meta.url));
  assert.equal(createHash('sha256').update(source).digest('hex'), generation.source.sha256);
  assert.equal(generation.source.museums, museums.length);
  assert.equal(generation.source.artifacts, museums.reduce((count, museum) => count + museum.artifacts.length, 0));
});

test('light index preserves order and every non-story field', () => {
  assert.equal(museumIndex.length, museums.length);
  for (let i = 0; i < museums.length; i++) {
    const { artifacts, ...museum } = museums[i];
    assert.deepEqual({ ...museumIndex[i], artifacts:undefined }, { ...museum, artifacts:undefined });
    assert.equal(museumIndex[i].artifacts.length, artifacts.length);
    for (let j = 0; j < artifacts.length; j++) {
      const { story: _story, references: _references, keywords: _keywords, inventoryNumber: _inventoryNumber, ...artifact } = artifacts[j];
      assert.deepEqual(museumIndex[i].artifacts[j], artifact);
      assert.equal('story' in museumIndex[i].artifacts[j], false);
    }
  }
});

test('all 59 full museum payloads round-trip exactly and no stale file remains', async () => {
  const files = (await readdir(new URL('../src/data/museum-payloads/', import.meta.url))).filter(name => name.endsWith('.json')).sort();
  assert.deepEqual(files, museums.map(museum => `${museum.id}.json`).sort());
  for (const museum of museums) {
    const payload = JSON.parse(await readFile(new URL(`../src/data/museum-payloads/${museum.id}.json`, import.meta.url), 'utf8'));
    assert.deepEqual(payload, museum);
  }
});

test('lazy story search corpus preserves every normalized full description', () => {
  assert.equal(Object.keys(searchCorpus).length, museums.reduce((count, museum) => count + museum.artifacts.length, 0));
  for (const museum of museums) for (const artifact of museum.artifacts) {
    assert.equal(searchCorpus[artifact.id], normalize([artifact.story, ...(artifact.keywords ?? []), artifact.inventoryNumber ?? ''].join(' ')), artifact.id);
  }
});

test('all nationwide era, category and province filters match the authority source', () => {
  const provinces = [null, ...new Set(museums.map(museum => museum.province))];
  for (const era of [null, ...ERA_OPTIONS]) for (const category of [null, ...CATEGORY_OPTIONS]) for (const province of provinces) {
    const filter = { era, category, province };
    const expected = findCollection(museums, filter).map(item => `${item.museum.id}:${item.artifact.id}`);
    const actual = findCollection(museumIndex, filter).map(item => `${item.museum.id}:${item.artifact.id}`);
    assert.deepEqual(actual, expected, JSON.stringify(filter));
  }
});

test('light index plus lazy corpus keeps legacy search scores and ordering', () => {
  const storyQueries = museums.flatMap(museum => museum.artifacts.slice(0, 1).map(artifact => normalize(artifact.story).slice(3, 9)));
  const queries = [
    ...museums.slice(0, 12).flatMap(museum => [museum.name, museum.city]),
    ...museums.flatMap(museum => museum.artifacts.slice(0, 2).flatMap(artifact => [artifact.name, artifact.dynasty, artifact.category])),
    ...storyQueries,
  ];
  for (const query of queries) assert.deepEqual(ids(searchMuseumIndex(museumIndex, query, searchCorpus)), ids(legacySearch(query)), query);
});

test('a loaned exhibition entry preserves actual holding institution in full and light data', () => {
  const fullMuseum = museums.find(museum => museum.artifacts.some(artifact => artifact.id === 'bj-hg'));
  const lightMuseum = museumIndex.find(museum => museum.id === fullMuseum.id);
  const fullArtifact = fullMuseum.artifacts.find(artifact => artifact.id === 'bj-hg');
  const lightArtifact = lightMuseum.artifacts.find(artifact => artifact.id === 'bj-hg');
  assert.equal(fullArtifact.holdingInstitution, '扶风县博物馆');
  assert.equal(lightArtifact.holdingInstitution, fullArtifact.holdingInstitution);
  assert.equal(lightArtifact.exhibitionNote, fullArtifact.exhibitionNote);
  assert.equal(artifactAttribution(lightArtifact, lightMuseum).holdingLabel, '馆藏：扶风县博物馆');
  assert.match(artifactAttribution(lightArtifact, lightMuseum).exhibitionNote, /曾展出.*当前展况待核/);
  assert.ok(searchMuseumIndex(museumIndex, '扶风县博物馆')?.artifacts.some(result => result.artifact.id === 'bj-hg'));
  assert.equal(artifactAttribution(museumIndex[0].artifacts[0], museumIndex[0]).holdingLabel, `藏于 ${museumIndex[0].name}`);
});

test('every artifact route resolves to exactly one indexed museum', () => {
  const locations = new Map();
  for (const museum of museumIndex) for (const artifact of museum.artifacts) {
    assert.equal(locations.has(artifact.id), false, artifact.id);
    locations.set(artifact.id, museum.id);
  }
  assert.equal(locations.size, museums.reduce((count, museum) => count + museum.artifacts.length, 0));
  for (const museum of museums) for (const artifact of museum.artifacts) assert.equal(locations.get(artifact.id), museum.id);
});

test('production consumers no longer statically import the full museum authority source', async () => {
  const files = ['../src/App.tsx', '../src/components/StoryExperience.tsx'];
  for (const file of files) {
    const source = await readFile(new URL(file, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /data\/museums/);
  }
});
