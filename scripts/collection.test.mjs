import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { findCollection, readCollectionFilter, writeCollectionFilter } from '../src/data/collection.ts';
import { museums } from '../src/data/museums.ts';

const imageMap = JSON.parse(readFileSync(new URL('../src/data/images.json', import.meta.url), 'utf8'));
const allArtifacts = museums.flatMap((museum) => museum.artifacts);
const resolverSource = readFileSync(new URL('../src/data/image-types.ts', import.meta.url), 'utf8');
const resolverCode = ts.transpileModule(resolverSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { resolveArtifactImageInfo, getArtifactImageLabel } = await import(`data:text/javascript;base64,${Buffer.from(resolverCode).toString('base64')}`);
const artifactImages = imageMap;
const resolveArtifactImage = (id, role) => resolveArtifactImageInfo(artifactImages[id] ?? null, role);

function resolveVariant(mapping, role) {
  return mapping.variants?.[role] ?? {
    src: mapping.src,
    credit: mapping.credit,
    kind: mapping.ai === true ? 'ai' : 'source',
  };
}

function productionPath(src) {
  return new URL(`../public${src}`, import.meta.url);
}

test('all era groups cover the collection exactly once and include museum location', () => {
  const eras = ['先秦', '秦汉', '魏晋南北朝', '隋唐五代', '宋辽金元', '明清', '近现代'];
  const all = eras.flatMap((era) => findCollection(museums, { era, category: null, province: null }));
  assert.equal(all.length, museums.reduce((sum, museum) => sum + museum.artifacts.length, 0));
  assert.equal(new Set(all.map(({ museum, artifact }) => `${museum.id}:${artifact.id}`)).size, all.length);
  assert.ok(all.every(({ museum }) => museum.province && museum.name));
});

test('nationwide Song group includes the Beijing handscroll and other provinces', () => {
  const results = findCollection(museums, { era: '宋辽金元', category: null, province: null });
  assert.ok(results.some(({ artifact, museum }) => artifact.id === 'gg-qmsh' && museum.province === '北京市'));
  assert.ok(new Set(results.map(({ museum }) => museum.province)).size > 1);
  assert.ok(results.every(({ artifact }) => artifact.era === '宋辽金元'));
});

test('era, category and province restrictions intersect and can be removed', () => {
  const restricted = findCollection(museums, { era: '宋辽金元', category: '书画', province: '北京市' });
  assert.ok(restricted.some(({ artifact }) => artifact.id === 'gg-qmsh'));
  assert.ok(restricted.every(({ museum, artifact }) => museum.province === '北京市' && artifact.era === '宋辽金元' && artifact.category === '书画'));
  const national = findCollection(museums, { era: '宋辽金元', category: '书画', province: null });
  assert.ok(national.length >= restricted.length);
  const categoryOnly = findCollection(museums, { era: null, category: '书画', province: null });
  assert.ok(categoryOnly.length > national.length);
});

test('an empty region returns zero results without changing the collection', () => {
  const count = museums.reduce((sum, museum) => sum + museum.artifacts.length, 0);
  assert.deepEqual(findCollection(museums, { era: '先秦', category: '青铜器', province: '不存在的省份' }), []);
  assert.equal(findCollection(museums, { era: null, category: null, province: null }).length, count);
});

test('collection filters round-trip through shareable URL parameters', () => {
  const filter = { era: '宋辽金元', category: '书画', province: '北京市' };
  const params = writeCollectionFilter(new URLSearchParams('museum=gugong'), filter);
  assert.equal(params.toString(), 'museum=gugong&era=%E5%AE%8B%E8%BE%BD%E9%87%91%E5%85%83&category=%E4%B9%A6%E7%94%BB&region=%E5%8C%97%E4%BA%AC%E5%B8%82');
  assert.deepEqual(readCollectionFilter(`?${params}`, new Set(['北京市'])), filter);
});

test('invalid shared filter values are ignored safely', () => {
  const filter = readCollectionFilter('?era=不存在&category=书画&region=火星', new Set(['北京市']));
  assert.deepEqual(filter, { era: null, category: '书画', province: null });
});

test('all 208 artifacts have explicit image or illustration-only status', () => {
  assert.ok(allArtifacts.length >= 223 && allArtifacts.length <= 600);
  assert.equal(Object.keys(imageMap).length, allArtifacts.length);
  assert.deepEqual(Object.keys(imageMap).sort(), allArtifacts.map(({ id }) => id).sort());
  for (const artifact of allArtifacts) {
    const mapping = imageMap[artifact.id];
    if (mapping.illustrationOnly) {
      assert.equal(mapping.src, '', artifact.id);
      assert.equal(resolveArtifactImage(artifact.id, 'card'), null, artifact.id);
      assert.equal(resolveArtifactImage(artifact.id, 'detail'), null, artifact.id);
      continue;
    }
    for (const role of ['card', 'detail']) {
      const variant = resolveVariant(mapping, role);
      assert.ok(['ai', 'source'].includes(variant.kind), `${artifact.id}:${role} has invalid kind`);
      assert.ok(variant.credit?.trim(), `${artifact.id}:${role} has no credit`);
      assert.ok(existsSync(productionPath(variant.src)), `${artifact.id}:${role} file is missing: ${variant.src}`);
    }
  }
});

test('AI and source roles remain explicitly distinguishable', () => {
  const roles = allArtifacts.filter(({ id }) => !imageMap[id].illustrationOnly).flatMap(({ id }) => ['card', 'detail'].map((role) => resolveVariant(imageMap[id], role)));
  assert.equal(roles.length, allArtifacts.filter(({ id }) => !imageMap[id].illustrationOnly).length * 2);
  assert.ok(roles.every(({ kind, provenance }) => !provenance || kind === provenance.type));
  for (const variant of roles.filter(({ kind }) => kind === 'source')) {
    const provenance = variant.provenance;
    assert.ok(['pending', 'verified', 'restricted', 'unknown'].includes(provenance?.authorizationStatus), `${variant.src} has no explicit authorization status`);
    if (provenance?.sourceUrl) {
      assert.ok(provenance.institution || provenance.author, `${variant.src} source URL has no owner`);
      assert.ok(provenance.verifiedAt, `${variant.src} source URL has no verification date`);
      assert.ok(provenance.linkCheckedAt, `${variant.src} source URL has no link check date`);
    }
    if (provenance?.license) {
      assert.ok(provenance.licenseUrl, `${variant.src} license has no supporting URL`);
    }
  }
});

test('every scroll artifact has a valid detail asset before entering the scroll reader', () => {
  const scrolls = allArtifacts.filter(({ shape }) => shape === 'scroll');
  assert.equal(scrolls.length, 23);
  for (const artifact of scrolls) {
    const detail = resolveVariant(imageMap[artifact.id], 'detail');
    assert.ok(existsSync(productionPath(detail.src)), `${artifact.id} scroll detail is missing`);
  }
});

test('the Qingming-style long scroll replaced its 900x36 thumbnail with a high-resolution source', () => {
  const responsive = JSON.parse(readFileSync(new URL('../assets/responsive-images/manifest.json', import.meta.url), 'utf8'));
  const detail = resolveVariant(imageMap['gg-qljs'], 'detail');
  const source = responsive.sources[detail.src];
  assert.ok(source, 'gg-qljs detail source must be registered for responsive delivery');
  assert.ok(source.width >= 8000, `gg-qljs detail source should be high resolution, got ${source.width}px`);
  // ArtifactScrollReader warns when a long image's source height is under 300px.
  assert.ok(source.height >= 300, `gg-qljs detail source must clear the low-resolution warning, got ${source.height}px`);
  assert.equal(resolveVariant(imageMap['gg-qljs'], 'card').kind, 'source');
  for (const retired of ['/artifacts/gg-qljs.jpg', '/artifacts-v2/p1/gg-qljs.png']) {
    assert.ok(imageMap['gg-qljs'].retiredAssets.some(asset => asset.src === retired), `${retired} must stay retired`);
  }
});

test('round 3 covers exactly the 58 targets and binds evidence to current file hashes', () => {
  const register = JSON.parse(readFileSync(new URL('../docs/audits/round3-register.json', import.meta.url), 'utf8'));
  const replaced = ['nb-wgj', 'sxl-lt', 'gg-jgyg', 'hlj-syj', 'jdz-qhmb', 'mo-klk'];
  // gg-qljs kept its round-3 register row, but that row now describes a retired source:
  // on 2026-09-30 the 900x36 thumbnail was replaced by a public-domain 16000px scan.
  const supersededLater = ['gg-qljs'];
  const newBatch = JSON.parse(readFileSync(new URL('../assets/provenance/collection-image-review-2026-09-22/decisions.json', import.meta.url), 'utf8')).decisions.map(row => row.id);
  // 2026-10-01: the author's own field photographs (Hubei Provincial Museum) entered the site
  // as source images. They are not part of the round-3 register, so they are excluded here
  // rather than rewriting that historical snapshot.
  const fieldVisitLater = new Set(['hub-zhy', 'hub-zzs', 'hub-ymh', 'hub-hjd', 'hub-hjs', 'hub-hjy', 'hub-zbh', 'hub-zbl', 'hub-hyy', 'hub-qqw', 'hub-nnd', 'hub-xd', 'hub-fcb', 'hub-jjj', 'hub-czd', 'hub-lgd', 'hub-yzc', 'hub-jb']);
  const expected = allArtifacts.filter(a => !newBatch.includes(a.id) && !fieldVisitLater.has(a.id) && (replaced.includes(a.id) || a.shape === 'scroll' || resolveVariant(imageMap[a.id], 'detail').kind === 'source')).map(a => a.id).sort();
  assert.deepEqual(register.rows.map(r => r.id).sort(), expected);
  assert.equal(register.summary.targets, 58);
  for (const row of register.rows) {
    if (replaced.includes(row.id) || supersededLater.includes(row.id)) assert.ok(imageMap[row.id].retiredAssets.some(asset => asset.src === row.src), `${row.id}: register must describe a retired source`);
    else assert.equal(resolveVariant(imageMap[row.id], 'detail').src, row.src, `${row.id}: register must describe the active detail`);
    const hash = createHash('sha256').update(readFileSync(productionPath(row.src))).digest('hex');
    assert.equal(row.assetSha256, hash, row.id);
    if (row.pageStatus !== 'read') {
      assert.equal(row.linkCheckedAt, null, `${row.id}: failed links must not look checked`);
      assert.equal(row.verifiedAt, null);
    }
    if (row.license) assert.ok(row.licenseUrl && row.pageStatus === 'read', row.id);
  }
});

test('formerly mismatched images stay retired while independent AI illustrations have no fallback', () => {
  for (const id of ['nb-wgj', 'sxl-lt', 'gg-jgyg', 'hlj-syj', 'jdz-qhmb', 'mo-klk']) {
    assert.equal(imageMap[id].imageHold, undefined, id);
    assert.ok(imageMap[id].retiredAssets?.length, id);
    assert.equal(resolveArtifactImage(id, 'card').kind, 'ai', id);
    assert.equal(resolveArtifactImage(id, 'detail').kind, 'ai', id);
    assert.equal(resolveArtifactImage(id, 'detail').fallback, undefined, id);
  }
});

test('restricted source cannot reappear as a legacy fallback', () => {
  const resolved = resolveArtifactImage('hb-cxd', 'detail');
  assert.equal(resolved.kind, 'ai');
  assert.equal(resolved.fallback, undefined);
});

test('verified Zhejiang sword uses one CC0 original and two traceable non-AI derivatives', () => {
  const chain = JSON.parse(readFileSync(new URL('../assets/provenance/zj-yzj-verified-processing.json', import.meta.url), 'utf8'));
  const original = readFileSync(new URL(`../${chain.original.path}`, import.meta.url));
  assert.equal(createHash('sha1').update(original).digest('hex'), '66fa9c9b291a476e615e88d72eb90fddec3c475a');
  assert.equal(createHash('sha256').update(original).digest('hex'), chain.original.sha256);
  assert.equal(chain.license, 'CC0 1.0');
  assert.equal(chain.processing.aiGenerated, false);
  assert.equal(chain.processing.crop, false);
  assert.equal(chain.outputs.length, 2);
  assert.equal(imageMap['zj-yzj'].imageHold, undefined);
  for (const output of chain.outputs) {
    const image = resolveArtifactImage('zj-yzj', output.role);
    assert.equal(image.kind, 'source');
    assert.equal(image.provenance.authorizationStatus, 'verified');
    assert.equal(image.provenance.originalSha256, chain.original.sha256);
    assert.equal(image.provenance.assetSha256, output.sha256);
    assert.equal(createHash('sha256').update(readFileSync(productionPath(output.src))).digest('hex'), output.sha256);
    assert.match(getArtifactImageLabel(image), /来源与授权已核/);
    for (const retired of imageMap['zj-yzj'].retiredAssets) {
      assert.notEqual(image.src, retired.src);
      assert.notEqual(image.fallback?.src, retired.src);
    }
  }
});

test('source fallback retains its evidence and authorization is never inferred from license text', () => {
  const resolved = resolveArtifactImage('hun-ssd', 'card');
  assert.equal(resolved.kind, 'ai');
  assert.equal(resolved.fallback.kind, 'source');
  assert.equal(resolved.fallback.provenance.author, 'Huangdan2060');
  assert.equal(resolved.fallback.provenance.authorizationStatus, 'pending');
  assert.match(getArtifactImageLabel(resolved.fallback), /授权待核/);
  const key = '__rejected_test';
  artifactImages[key] = { src: '/bad.jpg', credit: 'test', variants: { detail: { src: '/bad.jpg', credit: 'test', kind: 'source', review: { visual: 'approved', historical: 'rejected' } } } };
  assert.equal(resolveArtifactImage(key, 'detail'), null);
  delete artifactImages[key];
});

test('authorization verified requires positive file binding and full evidence, not a known filename', () => {
  for (const record of Object.values(imageMap)) for (const variant of Object.values(record.variants ?? {})) {
    const p = variant.provenance;
    if (p?.type !== 'source' || p.authorizationStatus !== 'verified') continue;
    assert.equal(p.assetMatchStatus, 'verified');
    for (const field of ['sourceUrl', 'license', 'licenseUrl', 'verifiedAt', 'linkCheckedAt', 'assetSha256']) assert.ok(p[field], field);
    assert.equal(p.assetSha256, createHash('sha256').update(readFileSync(productionPath(variant.src))).digest('hex'));
  }
});
