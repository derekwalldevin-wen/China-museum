// Prose lint with a ratchet: hard-banned "AI voice" patterns must never grow, and every file listed
// in REWRITTEN must stay completely clean. Lower CEILINGS as batches are rewritten.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import { BANNED, scoreFile, storyFileNames } from './prose-report.mjs';

// Files already rewritten to the new voice: they must contain zero banned markers.
const REWRITTEN = ['stories-batch51.json', 'stories-batch53.json', 'stories-batch56.json', 'stories-batch64.json', 'stories-batch65.json', 'stories-batch66.json', 'stories-batch67.json', 'stories-batch68.json', 'stories-batch69.json', 'stories-batch70.json'];

// Global ceilings: only ever lowered. Snapshot taken before the rewrite pass began.
const CEILINGS = {
  '不是…而是…': 39,
  '不能…当作/说成': 18,
  '本页/本站/本文': 277,
  '编辑口气': 16,
  '模板过渡句': 20,
  '比较的是…不主张': 63,
  '考据腔': 5,
  '方括号标签': 591,
  '说教距离': 107,
};

const totals = new Map(BANNED.map(([label]) => [label, 0]));
for (const name of storyFileNames()) {
  const text = readFileSync(`src/data/${name}`, 'utf8');
  for (const [label, hits] of scoreFile(text)) totals.set(label, totals.get(label) + hits);
}

test('the site copy never regresses into the old AI voice', () => {
  for (const [label, ceiling] of Object.entries(CEILINGS)) {
    const hits = totals.get(label) ?? 0;
    assert.ok(hits <= ceiling, `${label}: ${hits} markers exceed the ratchet ceiling ${ceiling}`);
  }
});

test('rewritten story files carry no banned markers at all', () => {
  for (const name of REWRITTEN) {
    const text = readFileSync(`src/data/${name}`, 'utf8');
    const offenders = scoreFile(text).filter(([, hits]) => hits > 0);
    assert.deepEqual(offenders, [], `${name} still contains ${JSON.stringify(offenders)}`);
  }
});

test('rewritten stories avoid the meta-editorial register entirely', () => {
  for (const name of REWRITTEN) {
    const data = JSON.parse(readFileSync(`src/data/${name}`, 'utf8'));
    for (const story of data.stories) {
      const text = story.sections.map(section => section.text).join('\n');
      assert.doesNotMatch(text, /本页|本站|本文|读者/, `${story.id} speaks about the page instead of the object`);
      // Openings must lead with the object, not with the label or the editing process.
      assert.doesNotMatch(story.sections[0].text.slice(0, 24), /^(这块|这张|本件展签|展签上只有)/, `${story.id} opens with label meta-commentary`);
    }
  }
});

test('related links in rewritten stories read like a human comparison', () => {
  const ids = new Set();
  for (const name of REWRITTEN) {
    const data = JSON.parse(readFileSync(`src/data/${name}`, 'utf8'));
    for (const story of data.stories) {
      for (const link of story.related) {
        ids.add(link.id);
        assert.ok(link.reason.length >= 24, `${story.id} → ${link.id}: reason too thin`);
        assert.doesNotMatch(link.reason, /比较的是|不主张|不是对|不能把/, `${story.id} → ${link.id}: disclaimer register`);
      }
    }
  }
  assert.ok(ids.size > 0);
});

test('museums.ts and the app shell keep the same voice rules', () => {
  for (const file of ['src/data/museums.ts', 'src/App.tsx']) {
    const text = readFileSync(file, 'utf8');
    for (const [label, rx] of BANNED) {
      if (label === '方括号标签') continue;
      const hits = (text.match(new RegExp(rx.source, 'g')) ?? []).length;
      const allow = file === 'src/data/museums.ts' ? 12 : 2;
      assert.ok(hits <= allow, `${file}: ${label} appears ${hits} times (allow ${allow})`);
    }
  }
});
