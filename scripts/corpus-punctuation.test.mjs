// 语料标点卫生：中文文本里不得出现直引号、半角省略点、汉字间的半角标点、贴汉字的半角括号。
// 这条测试把第十轮确立的编辑规范钉死，防止以后新增故事时回退。
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const dataUrl = new URL('../src/data/', import.meta.url);
const files = readdirSync(dataUrl).filter(name => /^stories(?:-batch\d+)?\.json$/.test(name));
const HAS_CJK = /[\u4e00-\u9fff]/;
const CJK = '[\\u3000-\\u303f\\u4e00-\\u9fff\\uff00-\\uffef]';
// 逐条规范：期望值 0
const rules = [
  { name: '直双引号（应使用 “ ”）', regex: /"/g },
  { name: '直单引号（应使用 ‘ ’）', regex: /'/g },
  { name: '半角省略点（应使用 ……）', regex: /\.{3,}/g },
  { name: '汉字之间的半角逗号', regex: new RegExp(`${CJK},${CJK}`, 'g') },
  { name: '汉字之间的半角句号', regex: new RegExp(`${CJK}\\.${CJK}`, 'g') },
  { name: '汉字之间的半角冒号', regex: new RegExp(`${CJK}:${CJK}`, 'g') },
  { name: '汉字之间的半角分号', regex: new RegExp(`${CJK};${CJK}`, 'g') },
  { name: '贴汉字的半角括号（应使用 （ ））', regex: new RegExp(`${CJK}[()]|[()]${CJK}`, 'g') },
  { name: '贴汉字的半角感叹号/问号（应使用 ！？）', regex: new RegExp(`${CJK}[!?]`, 'g') },
];

const collectStrings = (value, out) => {
  if (typeof value === 'string') { out.push(value); return out; }
  if (Array.isArray(value)) { value.forEach(item => collectStrings(item, out)); return out; }
  if (value && typeof value === 'object') { Object.values(value).forEach(item => collectStrings(item, out)); return out; }
  return out;
};

test('故事语料不含中文标点规范问题', () => {
  const violations = [];
  let scanned = 0;
  for (const name of files) {
    const batch = JSON.parse(readFileSync(new URL(name, dataUrl), 'utf8'));
    for (const text of collectStrings(batch, [])) {
      if (!HAS_CJK.test(text)) continue;
      scanned += 1;
      for (const rule of rules) {
        const matches = text.match(rule.regex);
        if (matches) violations.push(`${name}｜${rule.name}｜${matches.length} 处｜${text.slice(0, 40)}`);
      }
    }
  }
  assert.ok(scanned > 3000, `扫描到的中文串太少（${scanned}），语料可能没被读到`);
  assert.deepEqual(violations, [], `发现标点规范问题：\n${violations.join('\n')}`);
});
