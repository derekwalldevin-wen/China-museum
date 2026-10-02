import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { museums } from '../src/data/museums.ts';

const payloadDir = new URL('../src/data/museum-payloads/', import.meta.url);
const sourceUrl = new URL('../src/data/museums.ts', import.meta.url);
const indexUrl = new URL('../src/data/museum-index.json', import.meta.url);
const compactUrl = new URL('../src/data/museum-index.compact.json', import.meta.url);
const searchUrl = new URL('../src/data/artifact-search.json', import.meta.url);
const reportUrl = new URL('../docs/audits/museum-data-generation.json', import.meta.url);
const normalize = value => value.toLocaleLowerCase().replace(/[\s《》〈〉·•（）()，,。.!！?？:：；;]/g, '');
const json = value => `${JSON.stringify(value, null, 1)}\n`;
const sha256 = value => createHash('sha256').update(value).digest('hex');

const ids = new Set();
const artifactIds = new Set();
for (const museum of museums) {
  if (!/^[a-z0-9-]+$/.test(museum.id) || ids.has(museum.id)) throw new Error(`Invalid museum id: ${museum.id}`);
  ids.add(museum.id);
  for (const artifact of museum.artifacts) {
    if (artifactIds.has(artifact.id)) throw new Error(`Duplicate artifact id: ${artifact.id}`);
    artifactIds.add(artifact.id);
  }
}

const index = museums.map(({ artifacts, ...museum }) => ({
  ...museum,
  artifacts: artifacts.map(({ story: _story, ...artifact }) => artifact),
}));
const searchCorpus = Object.fromEntries(museums.flatMap(museum => museum.artifacts.map(artifact => [artifact.id, normalize(artifact.story)])));
// 浏览器只下载紧凑形式：键名换成固定字段顺序，体积约省 39%（可读版仍落盘，供脚本与测试使用）
const compact = {
  v: 1,
  museums: index.map(museum => [
    museum.id,
    museum.name,
    museum.province,
    museum.city,
    museum.coord[0],
    museum.coord[1],
    museum.artifacts.map(artifact => {
      const row = [artifact.id, artifact.name, artifact.dynasty, artifact.era, artifact.category, artifact.shape];
      if (artifact.holdingInstitution !== undefined || artifact.exhibitionNote !== undefined) {
        row.push(artifact.holdingInstitution ?? null, artifact.exhibitionNote ?? null);
      }
      return row;
    }),
  ]),
};
const source = await readFile(sourceUrl);

await mkdir(payloadDir, { recursive: true });
for (const entry of await readdir(payloadDir, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith('.json')) await rm(new URL(entry.name, payloadDir));
}
await writeFile(indexUrl, json(index));
await writeFile(compactUrl, JSON.stringify(compact));
await writeFile(searchUrl, json(searchCorpus));
for (const museum of museums) await writeFile(new URL(`${museum.id}.json`, payloadDir), json(museum));

const indexText = await readFile(indexUrl);
const searchText = await readFile(searchUrl);
const payloads = [];
for (const museum of museums) {
  const path = new URL(`${museum.id}.json`, payloadDir);
  const contents = await readFile(path);
  payloads.push({ id: museum.id, path: `src/data/museum-payloads/${museum.id}.json`, bytes: contents.length, sha256: sha256(contents), artifacts: museum.artifacts.length });
}
const report = {
  generatedAt: new Date().toISOString(),
  source: { path: 'src/data/museums.ts', bytes: (await stat(sourceUrl)).size, sha256: sha256(source), museums: museums.length, artifacts: artifactIds.size },
  index: { path: 'src/data/museum-index.json', bytes: indexText.length, sha256: sha256(indexText) },
  compactIndex: { path: 'src/data/museum-index.compact.json', bytes: (await stat(compactUrl)).size, sha256: sha256(await readFile(compactUrl)) },
  searchCorpus: { path: 'src/data/artifact-search.json', bytes: searchText.length, sha256: sha256(searchText), entries: Object.keys(searchCorpus).length },
  payloads: { directory: 'src/data/museum-payloads', count: payloads.length, totalBytes: payloads.reduce((sum, item) => sum + item.bytes, 0), files: payloads },
};
await writeFile(reportUrl, json(report));
console.log(JSON.stringify({ source: report.source, index: report.index, searchCorpus: report.searchCorpus, payloads: { count: report.payloads.count, totalBytes: report.payloads.totalBytes } }, null, 2));
