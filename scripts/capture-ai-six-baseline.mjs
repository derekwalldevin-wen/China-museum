import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';

const ids = ['gg-jgyg', 'hlj-syj', 'nb-wgj', 'jdz-qhmb', 'sxl-lt', 'mo-klk'];
const directory = new URL('../dist/data/image-provenance/', import.meta.url);
const records = {};
for (const file of await readdir(directory)) {
  if (!file.endsWith('.json')) continue;
  Object.assign(records, JSON.parse(await readFile(new URL(file, directory), 'utf8')).records);
}
if (Object.keys(records).length !== 201 || !ids.every(id => records[id]?.imageHold)) {
  throw new Error('Expected the pre-admission build with six held records');
}
const canonical = value => Array.isArray(value) ? `[${value.map(canonical).join(', ')}]`
  : value && typeof value === 'object' ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}: ${canonical(value[key])}`).join(', ')}}`
  : JSON.stringify(value);
const unaffected = Object.fromEntries(Object.entries(records).filter(([id]) => !ids.includes(id)));
const output = new URL('../assets/provenance/ai-completion-2026-09-23/before-six.json', import.meta.url);
await mkdir(new URL('.', output), { recursive: true });
await writeFile(output, `${JSON.stringify({
  capturedAt: '2026-09-23',
  replacedIds: ids,
  unaffectedRecords: Object.keys(unaffected).length,
  unaffectedRecordsSha256: createHash('sha256').update(canonical(unaffected)).digest('hex'),
  heldRecords: Object.fromEntries(ids.map(id => [id, records[id]])),
}, null, 2)}\n`);
console.log('Captured pre-admission state for six intentionally replaced held records.');
