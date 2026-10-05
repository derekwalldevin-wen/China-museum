// Prose lint with a ratchet: hard-banned "AI voice" patterns must never grow, and every file listed
// in REWRITTEN must stay completely clean. Lower CEILINGS as batches are rewritten.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import { BANNED, scoreFile, storyFileNames } from './prose-report.mjs';

// Files already rewritten to the new voice: they must contain zero banned markers.
const REWRITTEN = ['stories.json', 'stories-batch2.json', 'stories-batch3.json', 'stories-batch4.json', 'stories-batch5.json', 'stories-batch6.json', 'stories-batch7.json', 'stories-batch8.json', 'stories-batch9.json', 'stories-batch10.json', 'stories-batch11.json', 'stories-batch12.json', 'stories-batch13.json', 'stories-batch14.json', 'stories-batch15.json', 'stories-batch16.json', 'stories-batch17.json', 'stories-batch18.json', 'stories-batch19.json', 'stories-batch20.json', 'stories-batch21.json', 'stories-batch22.json', 'stories-batch23.json', 'stories-batch24.json', 'stories-batch25.json', 'stories-batch26.json', 'stories-batch27.json', 'stories-batch28.json', 'stories-batch29.json', 'stories-batch31.json', 'stories-batch32.json', 'stories-batch34.json', 'stories-batch35.json', 'stories-batch36.json', 'stories-batch37.json', 'stories-batch38.json', 'stories-batch39.json', 'stories-batch40.json', 'stories-batch42.json', 'stories-batch43.json', 'stories-batch44.json', 'stories-batch45.json', 'stories-batch46.json', 'stories-batch47.json', 'stories-batch48.json', 'stories-batch49.json', 'stories-batch50.json', 'stories-batch51.json', 'stories-batch52.json', 'stories-batch53.json', 'stories-batch54.json', 'stories-batch55.json', 'stories-batch56.json', 'stories-batch57.json', 'stories-batch58.json', 'stories-batch59.json', 'stories-batch60.json', 'stories-batch61.json', 'stories-batch62.json', 'stories-batch63.json', 'stories-batch64.json', 'stories-batch65.json', 'stories-batch66.json', 'stories-batch67.json', 'stories-batch68.json', 'stories-batch69.json', 'stories-batch70.json', 'stories-batch71.json', 'stories-batch72.json', 'stories-batch73.json', 'stories-batch74.json', 'stories-batch75.json', 'stories-batch76.json', 'stories-batch77.json', 'stories-batch78.json'];

// Global ceilings: only ever lowered. Snapshot taken before the rewrite pass began.
// Floor reached: every story, museum blurb, trail and shell string is free of these markers. Any
// reappearance now fails the build.
const CEILINGS = {
  '不是…而是…': 0,
  '不能…当作/说成': 0,
  '本页/本站/本文': 0,
  '编辑口气': 0,
  '模板过渡句': 0,
  '比较的是…不主张': 0,
  '考据腔': 0,
  '方括号标签': 0,
  '说教距离': 0,
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
      // Openings must lead with the object, not with the label, the archive or the editing process.
      // "这块石头" is a concrete object opening and is fine; what is banned is starting from the signage,
      // the record card, or this page.
      assert.doesNotMatch(story.sections[0].text.slice(0, 24), /^(本件展签|展签上只有|展签只|藏品卡|档案载|这条藏品|本条|本页|本站|本文|读者)/, `${story.id} opens with label meta-commentary`);
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
      const allow = 0; // museums.ts blurbs, the app shell and the visitor copy were all cleaned this tranche
      assert.ok(hits <= allow, `${file}: ${label} appears ${hits} times (allow ${allow})`);
    }
  }
});
