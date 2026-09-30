import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';

const dataDir = new URL('../src/data/', import.meta.url);
const payloadDir = new URL('../src/data/story-payloads/', import.meta.url);
const catalogUrl = new URL('../src/data/story-catalog.json', import.meta.url);
const reportUrl = new URL('../docs/audits/story-data-generation.json', import.meta.url);
const json = value => `${JSON.stringify(value, null, 1)}\n`;
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const files = (await readdir(dataDir)).filter(name => /^stories(?:-batch\d+)?\.json$/.test(name));
files.sort((a, b) => (a === 'stories.json' ? 0 : Number(a.match(/batch(\d+)/)[1])) - (b === 'stories.json' ? 0 : Number(b.match(/batch(\d+)/)[1])));
const stories = new Map();
const sources = new Map();
const trails = new Map();
const inputs = [];
for (const name of files) {
  const bytes = await readFile(new URL(name, dataDir));
  const batch = JSON.parse(bytes);
  inputs.push({ path:`src/data/${name}`, bytes:bytes.length, sha256:sha256(bytes) });
  for (const story of batch.stories) stories.set(story.id, story);
  for (const source of batch.sources) {
    if (sources.has(source.id)) throw new Error(`Duplicate source: ${source.id}`);
    sources.set(source.id, source);
  }
  for (const trail of batch.trails) {
    if (trails.has(trail.id)) throw new Error(`Duplicate trail: ${trail.id}`);
    trails.set(trail.id, trail);
  }
}
const catalog = {
  version: 1,
  stories:[...stories.values()].map(({ id, hook }) => ({ id, hook })),
  trails:[...trails.values()],
};
// The directory is read before any individual story; keep its wire payload compact.
const catalogBytes = Buffer.from(`${JSON.stringify(catalog)}\n`);
await writeFile(catalogUrl, catalogBytes);
await mkdir(payloadDir, { recursive:true });
const payloads = [];
for (const story of stories.values()) {
  if (!/^[a-z0-9-]+$/.test(story.id)) throw new Error(`Invalid story ID: ${story.id}`);
  for (const related of story.related) if (!stories.has(related.id)) throw new Error(`${story.id}: missing related ${related.id}`);
  const refs = [...new Set([...story.summaryRefs, ...story.sections.flatMap(section => section.refs), ...story.details.flatMap(detail => detail.refs), ...story.reflection.refs])];
  const usedSources = Object.fromEntries(refs.map(id => {
    const source = sources.get(id);
    if (!source) throw new Error(`${story.id}: missing source ${id}`);
    return [id, source];
  }));
  const bytes = Buffer.from(json({ story, sources:usedSources }));
  const name = `${story.id}.json`;
  await writeFile(new URL(name, payloadDir), bytes);
  payloads.push({ id:story.id, path:`src/data/story-payloads/${name}`, bytes:bytes.length, sha256:sha256(bytes), sources:refs.length });
}
const validFiles = new Set(payloads.map(payload => `${payload.id}.json`));
for (const entry of await readdir(payloadDir, { withFileTypes:true })) {
  if (entry.isFile() && entry.name.endsWith('.json') && !validFiles.has(entry.name)) await rm(new URL(entry.name, payloadDir));
}
const report = {
  generatedAt:new Date().toISOString(),
  inputs,
  catalog:{ path:'src/data/story-catalog.json', bytes:catalogBytes.length, sha256:sha256(catalogBytes), stories:stories.size, trails:trails.size },
  payloads:{ directory:'src/data/story-payloads', count:payloads.length, totalBytes:payloads.reduce((sum, item) => sum+item.bytes, 0), maxBytes:Math.max(...payloads.map(item => item.bytes)), files:payloads },
};
await writeFile(reportUrl, json(report));
console.log(JSON.stringify({ catalog:report.catalog, payloads:{ count:report.payloads.count, totalBytes:report.payloads.totalBytes, maxBytes:report.payloads.maxBytes } }, null, 2));
