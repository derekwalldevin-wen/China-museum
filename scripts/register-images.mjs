// 把已生成但未登记的 AI 配图写入 images.json，标记 ai:true
import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync('src/data/images.json', 'utf8'));
const src = fs.readFileSync('src/data/museums.ts', 'utf8');
const ids = [...src.matchAll(/^\s*\{ id: '([a-z0-9-]+)', name:/gm)].map((m) => m[1]);

let added = 0, missingFile = [];
for (const id of ids) {
  if (data[id]) continue;
  if (fs.existsSync(`public/artifacts/${id}.jpg`)) {
    data[id] = { src: `/artifacts/${id}.jpg`, credit: 'AI 生成示意', ai: true };
    added++;
  } else missingFile.push(id);
}
fs.writeFileSync('src/data/images.json', JSON.stringify(data, null, 1) + '\n');
console.log('registered:', added, '| artifacts without any image:', missingFile.length, missingFile);
console.log('total entries:', Object.keys(data).length);
