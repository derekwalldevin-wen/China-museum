import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import images from '../src/data/images.json' with { type: 'json' };
import museums from '../src/data/museum-index.json' with { type: 'json' };
import cardManifest from '../src/data/image-card-manifest.json' with { type: 'json' };
import manifest from '../assets/responsive-images/manifest.json' with { type: 'json' };
import { resolveArtifactImageInfo } from '../src/data/image-types.ts';

const root = new URL('../', import.meta.url);
const outputBySrc = new Map(manifest.outputs.map(output => [output.src, output]));
const shapeById = new Map(museums.flatMap(museum => museum.artifacts.map(artifact => [artifact.id, artifact.shape])));
const sha256 = value => createHash('sha256').update(value).digest('hex');

test('responsive evidence covers 208 records while held and text-only artifacts stay excluded', () => {
  assert.deepEqual(Object.keys(manifest.artifacts), Object.keys(images));
  assert.equal(manifest.summary.artifactRecords, 208);
  assert.equal(manifest.summary.illustrationOnlyArtifacts ?? 0, 0);
  assert.equal(manifest.summary.eligibleArtifacts, 208);
  assert.equal(manifest.summary.heldArtifacts, 0);
  for (const [id, info] of Object.entries(images)) {
    const artifact = manifest.artifacts[id];
    assert.equal(artifact.hold, Boolean(info.imageHold), id);
    assert.equal(artifact.shape, shapeById.get(id), id);
    assert.equal(Object.keys(artifact.roles).length === 0, Boolean(info.imageHold || info.illustrationOnly), id);
  }
});

test('card and detail deliveries preserve exact role selection, fallback and AI/source kind', async () => {
  for (const [id, info] of Object.entries(images)) {
    for (const role of ['card', 'detail']) {
      const resolved = resolveArtifactImageInfo(info, role);
      const delivery = manifest.artifacts[id].roles[role];
      if (!resolved) {
        assert.equal(delivery, undefined, `${id}:${role}`);
        continue;
      }
      assert.equal(delivery.primary.originalSrc, resolved.src, `${id}:${role}:primary`);
      assert.equal(delivery.primaryKind, resolved.kind, `${id}:${role}:kind`);
      assert.equal(delivery.fallback?.originalSrc, resolved.fallback?.src, `${id}:${role}:fallback`);
      assert.equal(delivery.fallbackKind, resolved.fallback?.kind, `${id}:${role}:fallback-kind`);
      for (const slot of ['primary', 'fallback']) {
        const item = delivery[slot];
        if (!item) continue;
        assert.ok((await readFile(new URL(`../public${item.originalSrc}`, import.meta.url))).length > 0, `${id}:${role}:${slot}:original`);
      }
    }
    const card = cardManifest[id].image;
    const cardEvidence = manifest.artifacts[id].roles.card;
    assert.equal(card?.src ?? null, cardEvidence?.primary.originalSrc ?? null, `${id}:card-runtime`);
    assert.equal(card?.kind ?? null, cardEvidence?.primaryKind ?? null, `${id}:card-kind`);
  }
});

test('all derivatives are proportional, bounded, decodable WebP files with a complete hash chain', async () => {
  const diskFiles = (await readdir(new URL('../public/artifact-responsive/', import.meta.url))).filter(name => name.endsWith('.webp')).sort();
  assert.equal(diskFiles.length, manifest.outputs.length);
  assert.deepEqual(diskFiles, manifest.outputs.map(output => output.src.split('/').pop()).sort());

  const sourceHashCache = new Map();
  for (const output of manifest.outputs) {
    const source = manifest.sources[output.inputSrc];
    assert.ok(source, output.inputSrc);
    assert.equal(output.inputSha256, source.sha256);
    assert.equal(output.format, 'WEBP');
    assert.equal(output.cropped, false);
    assert.equal(output.upscaled, false);
    assert.equal(output.aiGenerated, false);
    assert.ok(output.width <= source.width && output.height <= source.height, output.src);
    assert.ok(Math.abs(output.height - source.height * output.width / source.width) <= 1, output.src);
    if (output.profile === 'card') assert.ok(output.width <= 960, output.src);
    if (output.profile === 'detail') assert.ok(output.width <= 1600, output.src);
    if (output.profile === 'scroll-detail') {
      assert.equal(output.width, source.width, output.src);
      assert.equal(output.height, source.height, output.src);
      assert.doesNotMatch(output.operations.join(' '), /downscale/i, output.src);
    }

    const bytes = await readFile(new URL(`../public${output.src}`, import.meta.url));
    assert.equal(bytes.subarray(0, 4).toString('ascii'), 'RIFF', output.src);
    assert.equal(bytes.subarray(8, 12).toString('ascii'), 'WEBP', output.src);
    assert.equal(sha256(bytes), output.sha256, output.src);
    if (!sourceHashCache.has(output.inputSrc)) {
      const original = await readFile(new URL(`../public${output.inputSrc}`, import.meta.url));
      sourceHashCache.set(output.inputSrc, sha256(original));
    }
    assert.equal(sourceHashCache.get(output.inputSrc), output.inputSha256, output.inputSrc);
  }
});

test('runtime manifests expose only generated candidates and museum payloads retain provenance verbatim', async () => {
  for (const [id, entry] of Object.entries(cardManifest)) {
    const candidates = [entry.image, entry.image?.fallback].filter(Boolean).flatMap(image => image.responsive?.candidates ?? []);
    for (const candidate of candidates) assert.ok(outputBySrc.has(candidate.src), `${id}:${candidate.src}`);
  }
  for (const museum of museums) {
    const payload = JSON.parse(await readFile(new URL(`../public/data/image-provenance/${museum.id}.json`, import.meta.url), 'utf8'));
    for (const artifact of museum.artifacts) {
      assert.deepEqual(payload.records[artifact.id], images[artifact.id], `${artifact.id}:provenance`);
      const resolved = resolveArtifactImageInfo(images[artifact.id], 'detail');
      assert.equal(payload.delivery[artifact.id]?.src ?? null, resolved?.src ?? null, `${artifact.id}:detail-runtime`);
      assert.equal(payload.delivery[artifact.id]?.kind ?? null, resolved?.kind ?? null, `${artifact.id}:detail-kind`);
    }
  }
});
