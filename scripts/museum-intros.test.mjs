import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { museums } from '../src/data/museums.ts';
import { museumIntros } from '../src/data/museum-intros.ts';

// 简介按 id 放在懒加载模块里（不进入首屏包），这里保证两边一一对应。
test('every museum has exactly one blurb in the lazily imported module', () => {
  const ids = museums.map(museum => museum.id);
  assert.equal(new Set(ids).size, ids.length, '博物馆 id 不应重复');
  for (const id of ids) {
    assert.ok(typeof museumIntros[id] === 'string' && museumIntros[id].trim().length >= 10, `${id} 缺少简介`);
  }
  const orphans = Object.keys(museumIntros).filter(id => !ids.includes(id));
  assert.deepEqual(orphans, [], `简介模块里有孤儿条目: ${orphans.join(', ')}`);
});

test('museum blurbs stay out of the eager museum module and out of the first screen', () => {
  const eager = readFileSync(new URL('../src/data/museums.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(eager, /intro:/, '简介不应再写在 museums.ts 里');
  const lazy = readFileSync(new URL('../src/data/museum-intros.ts', import.meta.url), 'utf8');
  assert.ok(lazy.length > 0);
});

test('the home shell resolves blurbs from the lazy module rather than the museum object', () => {
  const searchBar = readFileSync(new URL('../src/components/SearchBar.tsx', import.meta.url), 'utf8');
  assert.match(searchBar, /import\('\.\.\/data\/museum-intros'\)/, '检索应动态载入简介模块');
  for (const file of ['../src/components/ProvincePanel.tsx', '../src/components/MuseumDetail.tsx']) {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    assert.match(source, /museumIntros\[/, `${file} 应从懒加载模块取简介`);
  }
});
