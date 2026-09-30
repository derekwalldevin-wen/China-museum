import fs from 'node:fs';

const exp = JSON.parse(fs.readFileSync('scripts/story-expansions.json', 'utf8'));
let src = fs.readFileSync('src/data/museums.ts', 'utf8');
let replaced = 0;
const missed = [];
for (const [id, story] of Object.entries(exp)) {
  const marker = `id: '${id}',`;
  const idx = src.indexOf(marker);
  if (idx === -1) { missed.push(id); continue; }
  const lineEnd = src.indexOf('\n', idx);
  const line = src.slice(idx, lineEnd);
  const sKey = "story: '";
  const sIdx = line.indexOf(sKey);
  if (sIdx === -1) { missed.push(id); continue; }
  const newLine = line.slice(0, sIdx + sKey.length) + story + "' },";
  src = src.slice(0, idx) + newLine + src.slice(lineEnd);
  replaced++;
}
fs.writeFileSync('src/data/museums.ts', src);
console.log('replaced:', replaced, 'missed:', missed);
