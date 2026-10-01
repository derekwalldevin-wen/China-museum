import assert from 'node:assert/strict';
import test from 'node:test';
import { museums } from '../src/data/museums.ts';
import images from '../src/data/images.json' with { type: 'json' };
import { resolveArtifactImageInfo } from '../src/data/image-types.ts';
import review from '../assets/provenance/collection-image-review-2026-09-22/decisions.json' with { type: 'json' };
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const added = new Map([
  ['gg-jgb', 'gugong'], ['gg-ryzl', 'gugong'],
  ['gb-gyts', 'guobo'], ['gb-yygd', 'guobo'], ['gb-cxct', 'guobo'],
  ['sh-zzjp', 'shanghai'], ['sh-ltry', 'shanghai'],
  ['nb-htb', 'ningbo'], ['hn-ywtj', 'henan'], ['sxl-ptxn', 'shanxili'],
]);
const locations = new Map(museums.flatMap(museum => museum.artifacts.map(artifact => [artifact.id, { museum, artifact }])));

test('ten new artifacts are uniquely assigned and supported by official text records', () => {
  assert.equal(added.size, 10);
  for (const [id, museumId] of added) {
    const item = locations.get(id);
    assert.ok(item, id);
    assert.equal(item.museum.id, museumId, id);
    assert.ok(item.artifact.name && item.artifact.dynasty && item.artifact.story.length >= 60, id);
    const info = images[id];
    assert.match(info.sourceReview.authorityUrl, /^https:\/\//, id);
    assert.equal(info.sourceReview.reviewedAt, id === 'gg-ryzl' ? '2026-09-23' : '2026-09-22', id);
    const decision = review.decisions.find(item => item.id === id);
    assert.ok(decision, id);
    for (const role of ['card', 'detail']) {
      const image = resolveArtifactImageInfo(info, role);
      if (decision.status === 'approved') {
        assert.equal(image.kind, 'source', id);
        assert.equal(image.fit, 'contain', id);
        assert.equal(image.provenance.authorizationStatus, 'verified', id);
        assert.equal(image.provenance.assetMatchStatus, 'verified', id);
        assert.equal(image.provenance.evidenceNote, decision.reason, id);
      } else {
        assert.equal(image.kind, 'ai', id);
        assert.equal(image.fit, 'contain', id);
        assert.equal(image.provenance.type, 'ai', id);
        assert.equal(image.review.historical, 'pending', id);
        assert.match(image.credit, /AI 复原示意.*非文物实拍/, id);
      }
    }
  }
  assert.equal(review.decisions.filter(item => item.status === 'approved').length, 5);
  assert.equal(Object.values(images).filter(info => info.illustrationOnly).length, 0);
});

test('five unresolved photographs are represented only by traceable AI illustrations', () => {
  const manifest = JSON.parse(readFileSync(new URL('../assets/artifact-image-prompts/pending-five-2026-09-23.json', import.meta.url), 'utf8'));
  assert.equal(manifest.items.length, 5);
  for (const item of manifest.items) {
    const decision = review.decisions.find(row => row.id === item.id);
    assert.equal(decision.status, 'pending', item.id);
    const info = images[item.id];
    assert.equal(info.ai, true, item.id);
    assert.equal(info.sourceReview.authorityUrl, item.authorityUrl, item.id);
    assert.equal(info.variants.card.provenance.promptManifest, 'assets/artifact-image-prompts/pending-five-2026-09-23.json');
    assert.equal(info.variants.detail.provenance.references[0].type, 'museum-record');
    assert.equal(info.variants.detail.provenance.references[0].value, item.authorityUrl);
    const bytes = readFileSync(new URL(`../public${item.output}`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), item.sha256, item.id);
    assert.equal(info.variants.detail.src, item.output);
  }
});

test('five admitted photographs retain original hashes, licensing and non-AI processing chains', () => {
  const archive = new URL('../assets/provenance/collection-image-review-2026-09-22/', import.meta.url);
  for (const decision of review.decisions.filter(item => item.status === 'approved')) {
    const p = images[decision.id].variants.detail.provenance;
    const original = readFileSync(new URL(`originals/${decision.downloadId}.jpg`, archive));
    const api = JSON.parse(readFileSync(new URL(`${decision.downloadId}-api.json`, archive), 'utf8'));
    const published = Object.values(api.query.pages)[0].imageinfo[0];
    assert.equal(createHash('sha1').update(original).digest('hex'), published.sha1);
    assert.equal(p.originalSha1, published.sha1);
    assert.equal(createHash('sha256').update(original).digest('hex'), p.originalSha256);
    assert.equal(p.license, published.extmetadata.LicenseShortName.value);
    assert.ok(p.author && p.licenseUrl && p.sourceTitle);
    const chain = JSON.parse(readFileSync(new URL(`../public${p.processingManifest}`, import.meta.url), 'utf8'));
    assert.equal(chain.original.sha256, p.originalSha256);
    assert.equal(chain.derivativeLicense, p.license);
    assert.equal(chain.display.sha256, p.assetSha256);
    assert.ok(chain.display.width <= chain.original.width);
    for (const output of [chain.display, ...chain.derivatives]) {
      const bytes = readFileSync(new URL(`../public${output.src}`, import.meta.url));
      assert.equal(createHash('sha256').update(bytes).digest('hex'), output.sha256);
      assert.ok(Math.abs(output.height / output.width - chain.original.height / chain.original.width) < 0.005);
    }
    assert.equal(chain.derivatives.length, 8);
    assert.ok(chain.derivatives.every(item => !item.cropped && !item.upscaled && !item.aiGenerated));
  }
});

test('the other 195 image records stay unchanged while six quarantined records are replaced', () => {
  const canonical = value => Array.isArray(value) ? `[${value.map(canonical).join(', ')}]`
    : value && typeof value === 'object' ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}: ${canonical(value[key])}`).join(', ')}}`
    : JSON.stringify(value);
  const hash = value => createHash('sha256').update(canonical(value)).digest('hex');
  const baseline = JSON.parse(readFileSync(new URL('../assets/provenance/ai-completion-2026-09-23/before-six.json', import.meta.url), 'utf8'));
  // This historical snapshot covers the pre-expansion 201 records only.
  const laterAdditions = new Set(['ny-yh', 'ny-cpyb', 'ny-hujie', 'ny-gaozu', 'ny-xiangyazhi']);
  // gg-qljs was deliberately refreshed on 2026-09-30: a public-domain 16000px scroll
  // scan replaced both the 900x36 thumbnail and the AI card. It is excluded from the
  // frozen snapshot rather than rewriting the historical baseline file.
  const refreshedLater = new Set(['gg-qljs']);
  // 2026-10-01: three records changed for the field photographs from the author's Hubei visit —
  // two new artifacts (hub-zzs, hub-ymh) and hub-zhy switched from an AI card to the real photo.
  // They are excluded from this frozen snapshot instead of rewriting the baseline file.
  const fieldVisitLater = new Set(['hub-zhy', 'hub-zzs', 'hub-ymh', 'hub-hjd', 'hub-hjs', 'hub-hjy', 'hub-zbh', 'hub-zbl', 'hub-hyy']);
  const unaffected = Object.fromEntries(Object.entries(images).filter(([id]) => !baseline.replacedIds.includes(id) && !laterAdditions.has(id) && !refreshedLater.has(id) && !fieldVisitLater.has(id)));
  const auditedAuthorityRefresh = unaffected['gg-ryzl'].sourceReview;
  assert.equal(auditedAuthorityRefresh.authorityUrl, 'https://ggzl.dpm.org.cn/pages/exhibit_works/details?id=9404');
  assert.equal(auditedAuthorityRefresh.reviewedAt, '2026-09-23');
  assert.equal(auditedAuthorityRefresh.linkCheckedAt, '2026-09-23');
  assert.match(auditedAuthorityRefresh.note, /不授权页面影像/);
  unaffected['gg-ryzl'] = {
    ...unaffected['gg-ryzl'],
    sourceReview: {
    reviewedAt: '2026-09-22',
    authorityUrl: 'https://www.dpm.org.cn/collection/ceramic/226752.html',
    note: '尚未找到精确匹配且具有明确可复用许可的影像。本轮馆方页面连接超时，不据历史页面或文件名确认图片授权。',
    },
  };
  // 195 baseline records − 1 (gg-qljs refreshed) − 1 (hub-zhy switched to the field photo)
  // = 193. hub-zzs and hub-ymh are brand-new artifacts that never appeared in the baseline,
  // so they are filtered out by fieldVisitLater without changing the historical count.
  assert.equal(Object.keys(unaffected).length, 193);
  // The historical baseline hash covered 194 records. After also excluding hub-zhy (which
  // switched from an AI card to the author's field photograph on 2026-10-01), the 193 records
  // that must remain byte-identical hash to the value below. Any accidental edit to those
  // records still breaks this assertion, which is the point of the frozen snapshot.
  assert.equal(hash(unaffected), 'b8a128c9d309fd934d1462a1ed2330ef8239f9b7dbc31c7c2e09e6a8cef89a92');
  for (const id of baseline.replacedIds) {
    assert.ok(baseline.heldRecords[id].imageHold, id);
    assert.equal(images[id].imageHold, undefined, id);
    assert.equal(images[id].variants.detail.kind, 'ai', id);
    assert.ok(images[id].retiredAssets.some(asset => asset.src === baseline.heldRecords[id].src), id);
  }
});

test('six formerly quarantined records use independent AI prompts and retain rejected assets as retired', () => {
  const manifest = JSON.parse(readFileSync(new URL('../assets/artifact-image-prompts/quarantined-six-2026-09-23.json', import.meta.url), 'utf8'));
  assert.equal(manifest.items.length, 6);
  for (const item of manifest.items) {
    const info = images[item.id];
    assert.equal(info.ai, true, item.id);
    assert.equal(info.sourceReview.authorityUrl, item.authorityUrl, item.id);
    assert.equal(info.variants.detail.provenance.promptVersion, manifest.version, item.id);
    assert.equal(info.variants.detail.review.historical, 'pending', item.id);
    assert.ok(info.retiredAssets.length >= 1, item.id);
    const bytes = readFileSync(new URL(`../public${item.output}`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), item.sha256, item.id);
  }
});
