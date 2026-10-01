import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import images from '../src/data/images.json' with { type:'json' };
import cardManifest from '../src/data/image-card-manifest.json' with { type:'json' };
import museumIndex from '../src/data/museum-index.json' with { type:'json' };
import generation from '../docs/audits/image-data-generation.json' with { type:'json' };
import { resolveArtifactImageInfo } from '../src/data/image-types.ts';

const artifactLocations = new Map(museumIndex.flatMap(museum => museum.artifacts.map(artifact => [artifact.id, { museum, artifact }])));
const forbiddenCardFields = ['credit', 'provenance', 'review', 'sourceReview', 'retiredAssets', 'sourceUrl', 'licenseUrl', 'authorizationStatus', 'assetSha256', 'evidenceNote', 'processingManifest'];

function displayOnly(image) {
  if (!image) return null;
  const result = { src:image.src, kind:image.kind };
  if (image.fit) result.fit = image.fit;
  if (image.fallback) {
    result.fallback = { src:image.fallback.src, kind:image.fallback.kind };
    if (image.fallback.fit) result.fallback.fit = image.fallback.fit;
  }
  return result;
}

function stripResponsive(image) {
  if (!image) return null;
  const { responsive: _responsive, fallback, ...rest } = image;
  return { ...rest, ...(fallback ? { fallback: stripResponsive(fallback) } : {}) };
}

test('generated image data is bound to the untouched authority registry', async () => {
  const source = await readFile(new URL('../src/data/images.json', import.meta.url));
  assert.equal(createHash('sha256').update(source).digest('hex'), generation.source.sha256);
  assert.equal(generation.source.records, 223);
  assert.equal(Object.keys(images).length, artifactLocations.size);
});

test('safe card manifest preserves image selection and new illustration-only records', () => {
  assert.deepEqual(Object.keys(cardManifest), Object.keys(images));
  for (const [id, info] of Object.entries(images)) {
    assert.deepEqual({ ...cardManifest[id], image: stripResponsive(cardManifest[id].image) }, {
      image: displayOnly(resolveArtifactImageInfo(info, 'card')),
      hold: Boolean(info.imageHold),
    }, id);
  }
});

test('safe card manifest contains no provenance, review, authorization or processing fields', () => {
  const text = JSON.stringify(cardManifest);
  for (const field of forbiddenCardFields) assert.doesNotMatch(text, new RegExp(`"${field}"`), field);
  assert.equal(Object.values(cardManifest).filter(entry => entry.hold).length, 0);
  assert.ok(Object.values(cardManifest).some(entry => entry.image?.kind === 'ai'));
  assert.ok(Object.values(cardManifest).some(entry => entry.image?.kind === 'source'));
});

test('59 museum provenance payloads round-trip every full record exactly with no stale file', async () => {
  const directory = new URL('../public/data/image-provenance/', import.meta.url);
  const files = (await readdir(directory)).filter(name => name.endsWith('.json')).sort();
  assert.deepEqual(files, museumIndex.map(museum => `${museum.id}.json`).sort());
  const rebuilt = {};
  for (const museum of museumIndex) {
    const payload = JSON.parse(await readFile(new URL(`${museum.id}.json`, directory), 'utf8'));
    assert.deepEqual(Object.keys(payload.records), museum.artifacts.map(artifact => artifact.id), museum.id);
    for (const artifact of museum.artifacts) {
      assert.deepEqual(payload.records[artifact.id], images[artifact.id], artifact.id);
      rebuilt[artifact.id] = payload.records[artifact.id];
    }
  }
  assert.deepEqual(rebuilt, images);
});

test('all 23 scrolls preserve card/detail resolution and the Qingming dual-image boundary', async () => {
  const scrolls = [...artifactLocations.entries()].filter(([, value]) => value.artifact.shape === 'scroll');
  assert.equal(scrolls.length, 23);
  for (const [id, { museum }] of scrolls) {
    const payload = JSON.parse(await readFile(new URL(`../public/data/image-provenance/${museum.id}.json`, import.meta.url), 'utf8'));
    assert.deepEqual(resolveArtifactImageInfo(payload.records[id], 'card'), resolveArtifactImageInfo(images[id], 'card'), `${id}:card`);
    assert.deepEqual(resolveArtifactImageInfo(payload.records[id], 'detail'), resolveArtifactImageInfo(images[id], 'detail'), `${id}:detail`);
  }
  const qingmingCard = resolveArtifactImageInfo(images['gg-qmsh'], 'card');
  const qingmingDetail = resolveArtifactImageInfo(images['gg-qmsh'], 'detail');
  assert.equal(qingmingCard.kind, 'source');
  assert.equal(qingmingDetail.kind, 'source');
  assert.notEqual(qingmingCard.src, qingmingDetail.src);
  assert.equal(qingmingDetail.provenance.authorizationStatus, 'pending');
});

test('AI, held, restricted and verified authorization boundaries remain unchanged', async () => {
  const payloads = {};
  for (const museum of museumIndex) Object.assign(payloads, JSON.parse(await readFile(new URL(`../public/data/image-provenance/${museum.id}.json`, import.meta.url), 'utf8')).records);
  const variants = Object.values(payloads).flatMap(info => Object.values(info.variants ?? {}));
  assert.equal(Object.values(payloads).filter(info => info.imageHold).length, 0);
  assert.equal(variants.filter(variant => variant?.provenance?.authorizationStatus === 'restricted').length, 1);
  // 12 -> 14 on 2026-09-30: gg-qljs moved from an AI card plus a pending detail to two
  // verified public-domain source variants (Wikimedia Commons PD scan).
  assert.equal(variants.filter(variant => variant?.provenance?.authorizationStatus === 'verified').length, 14);
  assert.equal(resolveArtifactImageInfo(payloads['gg-jgyg'], 'detail').kind, 'ai');
  assert.equal(resolveArtifactImageInfo(payloads['zj-yzj'], 'detail').provenance.authorizationStatus, 'verified');
  assert.equal(resolveArtifactImageInfo(payloads['gg-qljs'], 'card').kind, 'source');
});

test('user Qingming derivatives preserve four original hashes and do not inherit the old Commons license', async () => {
  const record = images['gg-qmsh'];
  const manifest = JSON.parse(await readFile(new URL('../public/data/image-processing/gg-qmsh-user-2026-09-16.json', import.meta.url), 'utf8'));
  assert.equal(manifest.sources.length, 4);
  assert.equal(new Set(manifest.sources.map(source => source.sha256)).size, 4);
  assert.equal(manifest.detail.width, 16000);
  assert.ok(manifest.detail.height >= 720);
  assert.equal(manifest.detailParts.reduce((total, part) => total + part.outputWidth, 0), 16000);
  assert.equal(manifest.card.sourceSha256, manifest.sources[1].sha256);
  for (const role of ['card', 'detail']) {
    const variant = record.variants[role];
    const output = manifest[role];
    assert.equal(variant.src, output.src);
    assert.equal(variant.kind, 'source');
    assert.equal(variant.provenance.authorizationStatus, 'pending');
    assert.equal(variant.provenance.license, undefined);
    assert.equal(variant.provenance.sourceUrl, undefined);
    assert.equal(output.upscaled, false);
    assert.equal(output.aiGenerated, false);
    const data = await readFile(new URL(`../public${output.src}`, import.meta.url));
    assert.equal(createHash('sha256').update(data).digest('hex'), variant.provenance.assetSha256);
  }
  assert.ok(record.retiredAssets.some(asset => asset.src === '/artifacts-v2/p1/gg-qmsh.png'));
});
