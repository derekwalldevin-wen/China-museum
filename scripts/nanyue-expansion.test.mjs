import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { museums } from '../src/data/museums.ts';
import images from '../src/data/images.json' with { type: 'json' };
import { resolveArtifactImageInfo } from '../src/data/image-types.ts';

const manifestPath = '../assets/artifact-image-prompts/nanyue-five-2026-09-27.json';
const manifest = JSON.parse(readFileSync(new URL(manifestPath, import.meta.url), 'utf8'));
const batch = JSON.parse(readFileSync(new URL('../src/data/stories-batch13.json', import.meta.url), 'utf8'));
const museum = museums.find(item => item.id === 'nanyue');
const byId = new Map(museum.artifacts.map(item => [item.id, item]));

test('five new Nanyue objects have exact official anchors and honest AI disclosures', () => {
  assert.equal(manifest.items.length, 5);
  assert.equal(batch.stories.length, 5);
  assert.equal(batch.sources.length, 6);
  for (const item of manifest.items) {
    const artifact = byId.get(item.id);
    const story = batch.stories.find(value => value.id === item.id);
    const info = images[item.id];
    assert.ok(artifact && story && info, item.id);
    assert.equal(story.summary, artifact.story, item.id);
    assert.equal(info.sourceReview.authorityUrl, item.authorityUrl, item.id);
    assert.equal(info.ai, true, item.id);
    assert.ok(story.sections.every(section => section.refs.length && /【.*】/.test(section.text)), item.id);
    assert.ok(story.related.length >= 2, item.id);
    for (const relation of story.related) {
      assert.ok(relation.reason.length >= 25, item.id);
      assert.match(relation.reason, /比较|对照|不同|不能|不等于/, item.id);
    }
    const bytes = readFileSync(new URL(`../public${item.output}`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), item.sha256, item.id);
    for (const role of ['card', 'detail']) {
      const resolved = resolveArtifactImageInfo(info, role);
      assert.equal(resolved.kind, 'ai', item.id);
      assert.equal(resolved.src, item.output, item.id);
      assert.match(resolved.credit, /AI 复原示意.*非文物实拍/, item.id);
      assert.equal(resolved.provenance.type, 'ai', item.id);
      assert.equal(resolved.provenance.promptManifest, manifestPath.slice(3), item.id);
      assert.equal(resolved.review.historical, 'pending', item.id);
    }
  }
});

test('search-text evidence is marked and material identity is not transferred between objects', () => {
  assert.equal(batch.sources.find(source => source.id === 'b13-gaozu-object').retrieval, 'search-text');
  assert.equal(batch.sources.find(source => source.id === 'b13-xiangyazhi-object').retrieval, 'search-text');
  assert.match(batch.stories.find(story => story.id === 'ny-xiangyazhi').sections[2].text, /不能推出.*同源/);
  assert.match(batch.stories.find(story => story.id === 'ny-hujie').sections[2].text, /两.*解释/);
  assert.match(batch.stories.find(story => story.id === 'ny-cpyb').uncertainty, /完整套印顺序/);
});
