// Prose report: hard-banned marker density per story file and per story. Read-only helper.
import { readFileSync, readdirSync } from 'node:fs';

export const BANNED = [
  ['不是…而是…', /不是[^。！？]{0,25}而是|并非[^。！？]{0,25}而是/g],
  ['不能…当作/说成', /不能把[^。]{0,20}当作|不能让[^。]{0,20}说成|不把[^。]{0,12}当作|不说成/g],
  ['本页/本站/本文', /本页|本站|本文|本条目|本批/g],
  ['编辑口气', /来源边界|分寸|收录理由|写作纪律/g],
  ['模板过渡句', /值得注意的是|需要说明的是|这提醒我们|提醒我们/g],
  ['比较的是…不主张', /比较的是[^。]{0,60}不主张/g],
  ['考据腔', /按原文|照录|不代填|不展开|不替它|不替展签/g],
  ['方括号标签', /【[^】]{2,10}】/g],
  ['说教距离', /读者/g],
];

export const storyFileNames = () => readdirSync('src/data').filter(name => /^stories(-batch\d+)?\.json$/.test(name));

export function scoreFile(text) {
  return BANNED.map(([label, rx]) => [label, (text.match(new RegExp(rx.source, 'g')) ?? []).length]);
}

export function loadStories() {
  const rows = [];
  for (const name of storyFileNames()) {
    const data = JSON.parse(readFileSync(`src/data/${name}`, 'utf8'));
    for (const story of data.stories) {
      const body = JSON.stringify(story);
      let score = 0;
      for (const [, rx] of BANNED) score += (body.match(new RegExp(rx.source, 'g')) ?? []).length;
      rows.push({ id: story.id, file: name, score, chars: body.length });
    }
  }
  return rows;
}

if ((process.argv[1] ?? '').endsWith('prose-report.mjs')) {
  const rows = loadStories();
  const totals = new Map(BANNED.map(([label]) => [label, 0]));
  for (const name of storyFileNames()) {
    const text = readFileSync(`src/data/${name}`, 'utf8');
    for (const [label, hits] of scoreFile(text)) totals.set(label, totals.get(label) + hits);
  }
  console.log(`stories: ${rows.length}\n=== 硬禁用词合计 ===`);
  for (const [label, hits] of [...totals].sort((a, b) => b[1] - a[1])) console.log(`  ${String(hits).padStart(5)}  ${label}`);
  const worst = [...rows].sort((a, b) => b.score - a.score).slice(0, 20);
  console.log('\n=== 最密集的 20 篇 ===');
  for (const row of worst) console.log(`  ${row.id.padEnd(10)} ${row.file.replace('stories-', '').replace('.json', '').padEnd(9)} markers=${String(row.score).padStart(3)}`);
  const clean = rows.filter(row => row.score === 0).length;
  console.log(`\n0 标记的故事：${clean}/${rows.length}`);
}
