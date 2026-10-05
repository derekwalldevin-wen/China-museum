import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const sourceUrl = new URL('src/data/images.json', root);
const museumIndexUrl = new URL('src/data/museum-index.json', root);
const cardManifestUrl = new URL('src/data/image-card-manifest.json', root);
const provenanceDir = new URL('public/data/image-provenance/', root);
const cardPayloadDir = new URL('public/data/image-cards/', root);
const reportUrl = new URL('docs/audits/image-data-generation.json', root);
const responsiveManifestUrl = new URL('assets/responsive-images/manifest.json', root);
const json = value => `${JSON.stringify(value, null, 1)}\n`;
const sha256 = value => createHash('sha256').update(value).digest('hex');

function allowed(info, variant) {
  return variant
    && variant.review?.historical !== 'rejected'
    && !info.retiredAssets?.some(asset => asset.src === variant.src)
    && variant.review?.visual !== 'rejected'
    && !(variant.provenance?.type === 'source' && variant.provenance.authorizationStatus === 'restricted');
}

function resolve(info, role) {
  if (!info || info.imageHold || info.illustrationOnly) return null;
  const matchingVariant = Object.values(info.variants ?? {}).find(variant => variant.src === info.src);
  const legacy = {
    src: info.src,
    kind: info.ai ? 'ai' : 'source',
    credit: info.credit,
    provenance: matchingVariant?.provenance,
    review: matchingVariant?.review,
  };
  const requested = info.variants?.[role] ?? legacy;
  const selected = [requested, info.variants?.card, legacy].find(variant => allowed(info, variant));
  if (!selected) return null;
  return {
    ...selected,
    role,
    fallback: selected.src !== legacy.src && allowed(info, legacy) ? legacy : undefined,
  };
}

function runtimeDelivery(delivery) {
  if (!delivery) return undefined;
  return {
    format: delivery.format,
    candidates: delivery.candidates.map(({ src, width, height }) => ({ src, width, height })),
  };
}

function deliveryFor(responsive, id, role, slot, expectedSrc) {
  const delivery = responsive.artifacts?.[id]?.roles?.[role]?.[slot];
  if (!delivery) throw new Error(`Missing responsive delivery: ${id}:${role}:${slot}`);
  if (delivery.originalSrc !== expectedSrc) throw new Error(`Responsive source mismatch: ${id}:${role}:${slot}`);
  return runtimeDelivery(delivery);
}

function displayOnly(image, responsive, id, role) {
  if (!image) return null;
  const result = {
    src: image.src,
    kind: image.kind,
    responsive: deliveryFor(responsive, id, role, 'primary', image.src),
  };
  if (image.fit) result.fit = image.fit;
  if (image.fallback) {
    result.fallback = {
      src: image.fallback.src,
      kind: image.fallback.kind,
      responsive: deliveryFor(responsive, id, role, 'fallback', image.fallback.src),
    };
    if (image.fallback.fit) result.fallback.fit = image.fallback.fit;
  }
  return result;
}

const source = await readFile(sourceUrl);
const images = JSON.parse(source);
const responsiveSource = await readFile(responsiveManifestUrl);
const responsive = JSON.parse(responsiveSource);
const museums = JSON.parse(await readFile(museumIndexUrl, 'utf8'));
const artifactLocations = new Map();
for (const museum of museums) {
  for (const artifact of museum.artifacts) {
    if (artifactLocations.has(artifact.id)) throw new Error(`Duplicate artifact id: ${artifact.id}`);
    artifactLocations.set(artifact.id, museum.id);
  }
}

const sourceIds = Object.keys(images);
if (sourceIds.length !== artifactLocations.size) throw new Error(`Image/artifact count mismatch: ${sourceIds.length}/${artifactLocations.size}`);
for (const id of sourceIds) if (!artifactLocations.has(id)) throw new Error(`Unknown image artifact id: ${id}`);
for (const id of artifactLocations.keys()) if (!images[id]) throw new Error(`Missing image record: ${id}`);

const cardManifest = Object.fromEntries(sourceIds.map(id => [id, {
  image: images[id].imageHold ? null : displayOnly(resolve(images[id], 'card'), responsive, id, 'card'),
  hold: Boolean(images[id].imageHold),
}]));

await mkdir(provenanceDir, { recursive: true });
await mkdir(cardPayloadDir, { recursive: true });
for (const entry of await readdir(cardPayloadDir, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith('.json') && !museums.some(museum => `${museum.id}.json` === entry.name)) await rm(new URL(entry.name, cardPayloadDir));
}
for (const entry of await readdir(provenanceDir, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith('.json')) await rm(new URL(entry.name, provenanceDir));
}
await writeFile(cardManifestUrl, json(cardManifest));

const payloads = [];
for (const museum of museums) {
  const cardRecords = Object.fromEntries(museum.artifacts.map(artifact => [artifact.id, cardManifest[artifact.id]]));
  await writeFile(new URL(`${museum.id}.json`, cardPayloadDir), json({ museumId: museum.id, records: cardRecords }));
  const records = Object.fromEntries(museum.artifacts.map(artifact => [artifact.id, images[artifact.id]]));
  const delivery = Object.fromEntries(museum.artifacts.map(artifact => {
    const resolved = resolve(images[artifact.id], 'detail');
    return [artifact.id, resolved ? displayOnly(resolved, responsive, artifact.id, 'detail') : null];
  }));
  const payload = { records, delivery };
  const contents = Buffer.from(json(payload));
  const path = new URL(`${museum.id}.json`, provenanceDir);
  await writeFile(path, contents);
  payloads.push({
    id: museum.id,
    path: `public/data/image-provenance/${museum.id}.json`,
    bytes: contents.length,
    sha256: sha256(contents),
    records: Object.keys(records).length,
  });
}

const manifest = await readFile(cardManifestUrl);
const report = {
  generatedAt: new Date().toISOString(),
  source: { path: 'src/data/images.json', bytes: source.length, sha256: sha256(source), records: sourceIds.length },
  responsiveSource: { path: 'assets/responsive-images/manifest.json', bytes: responsiveSource.length, sha256: sha256(responsiveSource), outputs: responsive.outputs.length },
  cardManifest: { path: 'src/data/image-card-manifest.json', bytes: manifest.length, sha256: sha256(manifest), records: Object.keys(cardManifest).length },
  provenancePayloads: {
    directory: 'public/data/image-provenance',
    count: payloads.length,
    totalBytes: payloads.reduce((sum, item) => sum + item.bytes, 0),
    files: payloads,
  },
};
await writeFile(reportUrl, json(report));
console.log(JSON.stringify({ source: report.source, cardManifest: report.cardManifest, provenancePayloads: { count: payloads.length, totalBytes: report.provenancePayloads.totalBytes } }, null, 2));
