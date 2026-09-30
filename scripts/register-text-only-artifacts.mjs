import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const images = JSON.parse(await readFile(new URL('src/data/images.json', root), 'utf8'));
const museums = JSON.parse(await readFile(new URL('src/data/museum-index.json', root), 'utf8'));
const shapeById = new Map(museums.flatMap(museum => museum.artifacts.map(artifact => [artifact.id, artifact.shape])));
const textOnly = Object.entries(images).filter(([, info]) => info.illustrationOnly);

for (const [id, info] of textOnly) {
  if (!shapeById.has(id)) throw new Error(`Text-only artifact is absent from museum index: ${id}`);
  if (info.src || info.variants || info.imageHold || !info.sourceReview?.authorityUrl) {
    throw new Error(`Text-only artifact has ambiguous image evidence: ${id}`);
  }
}

for (const filename of ['plan.json', 'manifest.json']) {
  const url = new URL(`assets/responsive-images/${filename}`, root);
  const original = await readFile(url, 'utf8');
  const data = JSON.parse(original);
  for (const [id] of textOnly) {
    const expected = { hold: false, shape: shapeById.get(id), roles: {} };
    if (data.artifacts[id] && JSON.stringify(data.artifacts[id]) !== JSON.stringify(expected)) {
      throw new Error(`Existing responsive evidence must not be replaced: ${id}`);
    }
    data.artifacts[id] = expected;
  }
  if (filename === 'manifest.json') {
    data.summary.artifactRecords = Object.keys(images).length;
    data.summary.illustrationOnlyArtifacts = textOnly.length;
  }
  const next = `${JSON.stringify(data, null, 2)}\n`;
  if (next !== original) await writeFile(url, next);
}

console.log(`Registered ${textOnly.length} text-only artifacts without creating image derivatives.`);
