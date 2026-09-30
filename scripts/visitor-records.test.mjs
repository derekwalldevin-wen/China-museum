/**
 * Visitor records (phase A): local-only tooling, package round-trip, and the hard
 * separation between visitor submissions and the curated atlas.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { test } from 'node:test';
import { deflateRawSync } from 'node:zlib';
import ts from 'typescript';
import { museums } from '../src/data/museums.ts';
import images from '../src/data/images.json' with { type: 'json' };
import published from '../src/data/visitor-records.json' with { type: 'json' };

const source = readFileSync(new URL('../src/visitor/core.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);

const VISITOR_SOURCE_FILES = [
  '../src/visitor/core.ts',
  '../src/visitor/image.ts',
  '../src/visitor/storage.ts',
  '../src/visitor/VisitorRecordsApp.tsx',
  '../src/visitor/main.tsx',
];

function record(overrides = {}) {
  return {
    schema: core.VISITOR_SCHEMA,
    id: 'rec1',
    createdAt: '2026-09-30T10:00:00.000Z',
    updatedAt: '2026-09-30T10:00:00.000Z',
    museumName: '荆州博物馆',
    province: '湖北省',
    city: '荆州',
    visitedAt: '2026-09',
    note: '看了虎座凤鸟悬鼓。',
    photos: [{
      id: 'p1',
      sourceName: 'IMG_0001.jpg',
      mime: 'image/jpeg',
      bytes: 4,
      width: 1200,
      height: 900,
      sha256: '',
      thumbBytes: 2,
      exifStripped: true,
    }],
    consent: { ownWork: true, allowPublicAfterReview: true, agreedAt: '2026-09-30T10:00:00.000Z' },
    ...overrides,
  };
}

test('visitor records validate required fields, province and consent', async () => {
  const bytes = new TextEncoder().encode('full');
  const sha = await core.sha256Hex(bytes);
  const good = record({ photos: [{ ...record().photos[0], sha256: sha }] });
  assert.deepEqual(core.validateVisitorRecord(good), []);

  assert.match(core.validateVisitorRecord(record({ museumName: '  ' })).join('；'), /博物馆名称/);
  assert.match(core.validateVisitorRecord(record({ province: '火星省' })).join('；'), /省份不在已知列表/);
  assert.match(core.validateVisitorRecord(record({ city: '' })).join('；'), /城市/);
  assert.match(core.validateVisitorRecord(record({ visitedAt: '2026/09' })).join('；'), /YYYY-MM/);
  assert.match(core.validateVisitorRecord(record({ consent: { ownWork: false, allowPublicAfterReview: true, agreedAt: '' } })).join('；'), /本人拍摄/);
  assert.match(core.validateVisitorRecord(record({ consent: { ownWork: true, allowPublicAfterReview: false, agreedAt: '' } })).join('；'), /公开展示/);
  assert.match(core.validateVisitorRecord(record({ photos: [] })).join('；'), /至少上传一张/);
  assert.match(core.validateVisitorRecord(record({ photos: [{ ...record().photos[0], exifStripped: false, sha256: sha }] })).join('；'), /去除 EXIF/);
  assert.match(core.validateVisitorRecord(record({ photos: Array.from({ length: core.MAX_PHOTOS_PER_RECORD + 1 }, () => ({ ...record().photos[0], sha256: sha })) })).join('；'), /最多 12 张/);
  assert.equal(core.VISITOR_PROVINCES.length, 34);
});

test('zip writer produces archives the reader can read back, including deflate entries', async () => {
  const encoder = new TextEncoder();
  const files = [
    { name: 'records.json', bytes: encoder.encode('{"hello":"世界"}') },
    { name: 'photos/rec1/p1.jpg', bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]) },
  ];
  const zip = core.buildZip(files, new Date('2026-09-30T10:00:00Z'));
  assert.equal(new DataView(zip.buffer).getUint32(0, true), 0x04034b50);
  const read = await core.readZip(zip);
  assert.deepEqual(read.map(entry => entry.name), ['records.json', 'photos/rec1/p1.jpg']);
  assert.equal(new TextDecoder().decode(read[0].bytes), '{"hello":"世界"}');
  assert.deepEqual([...read[1].bytes], [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

  // A deflate-compressed archive (as any normal zip tool writes) must also be readable.
  const name = encoder.encode('a.txt');
  const payload = encoder.encode('deflated payload '.repeat(20));
  const deflated = new Uint8Array(deflateRawSync(payload));
  const crc = core.crc32(payload);
  const local = new Uint8Array(30 + name.length);
  const localView = new DataView(local.buffer);
  localView.setUint32(0, 0x04034b50, true);
  localView.setUint16(4, 20, true);
  localView.setUint16(8, 8, true);
  localView.setUint32(14, crc, true);
  localView.setUint32(18, deflated.length, true);
  localView.setUint32(22, payload.length, true);
  localView.setUint16(26, name.length, true);
  local.set(name, 30);
  const central = new Uint8Array(46 + name.length);
  const centralView = new DataView(central.buffer);
  centralView.setUint32(0, 0x02014b50, true);
  centralView.setUint16(4, 20, true);
  centralView.setUint16(6, 20, true);
  centralView.setUint16(10, 8, true);
  centralView.setUint32(16, crc, true);
  centralView.setUint32(20, deflated.length, true);
  centralView.setUint32(24, payload.length, true);
  centralView.setUint16(28, name.length, true);
  central.set(name, 46);
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(8, 1, true);
  eocdView.setUint16(10, 1, true);
  eocdView.setUint32(12, central.length, true);
  eocdView.setUint32(16, local.length + deflated.length, true);
  const archive = new Uint8Array(local.length + deflated.length + central.length + eocd.length);
  archive.set(local, 0);
  archive.set(deflated, local.length);
  archive.set(central, local.length + deflated.length);
  archive.set(eocd, local.length + deflated.length + central.length);
  const deflatedRead = await core.readZip(archive);
  assert.equal(new TextDecoder().decode(deflatedRead[0].bytes), new TextDecoder().decode(payload));

  await assert.rejects(() => core.readZip(new Uint8Array([1, 2, 3, 4])), /不是有效的 ZIP/);
});

test('export package round-trips records and photos, and refuses tampered photos', async () => {
  const fullBytes = new TextEncoder().encode('full-photo-bytes');
  const thumbBytes = new TextEncoder().encode('thumb');
  const sha = await core.sha256Hex(fullBytes);
  const entry = {
    record: record({ photos: [{ ...record().photos[0], bytes: fullBytes.length, sha256: sha, thumbBytes: thumbBytes.length, width: 1200, height: 900 }] }),
    photos: {
      p1: {
        full: new Blob([fullBytes], { type: 'image/jpeg' }),
        thumb: new Blob([thumbBytes], { type: 'image/jpeg' }),
      },
    },
  };
  const pack = await core.buildExportPackage([entry], new Date('2026-09-30T10:00:00Z'));
  assert.match(pack.name, /^华夏博物志-访客记录-2026-09-30\.zip$/);
  assert.equal(pack.recordCount, 1);
  assert.equal(pack.photoCount, 1);

  const back = await core.readExportPackage(pack.bytes);
  assert.equal(back.records.length, 1);
  assert.deepEqual(back.skipped, []);
  assert.deepEqual(back.warnings, []);
  assert.equal(back.records[0].record.museumName, '荆州博物馆');
  assert.equal(back.records[0].record.photos[0].sha256, sha);
  assert.equal(await back.records[0].photos.p1.full.text(), 'full-photo-bytes');

  // Tamper with the photo: the manifest hash no longer matches, so it is dropped.
  const entries = await core.readZip(pack.bytes);
  const manifest = JSON.parse(new TextDecoder().decode(entries.find(item => item.name === 'records.json').bytes));
  manifest.records[0].photos[0].sha256 = 'f'.repeat(64);
  const rebuilt = core.buildZip(entries.map(item => item.name === 'records.json'
    ? { name: item.name, bytes: new TextEncoder().encode(JSON.stringify(manifest)) }
    : item));
  const tampered = await core.readExportPackage(rebuilt);
  assert.equal(tampered.records.length, 0);
  assert.match(tampered.skipped.join('；'), /至少上传一张照片/);
  assert.ok(tampered.warnings.some(message => /sha256 与清单不符/.test(message)));

  // A zip without records.json is rejected with a helpful message.
  await assert.rejects(() => core.readExportPackage(core.buildZip([{ name: 'x.txt', bytes: new Uint8Array([65]) }])), /没有 records.json/);
});

test('summaries and byte formatting stay honest for the UI', () => {
  const entries = [{
    record: record({ photos: [{ ...record().photos[0], bytes: 2048 }, { ...record().photos[0], id: 'p2', bytes: 1024 }] }),
    photos: {},
  }];
  assert.deepEqual(core.summarize(entries), { records: 1, photos: 2, bytes: 3072 });
  assert.equal(core.formatBytes(512), '512 B');
  assert.equal(core.formatBytes(2048), '2.0 KB');
  assert.equal(core.formatBytes(3 * 1024 * 1024), '3.0 MB');
});

test('published visitor records stay schema-valid, labelled and clearly unverified', () => {
  assert.equal(published.version, 1);
  assert.match(published.note, /访客投稿 · 未经馆方核验/);
  assert.equal(core.VISITOR_LABEL, '访客投稿 · 未经馆方核验');
  const museumIds = new Set(museums.flatMap(museum => museum.artifacts.map(artifact => artifact.id)).concat(museums.map(museum => museum.id)));
  assert.ok(Array.isArray(published.records));
  for (const entry of published.records) {
    assert.deepEqual(core.validatePublishedRecord(entry, museumIds), [], entry.id);
    assert.ok(entry.contributor && entry.reviewedAt && entry.reviewerNote);
  }
  // The page must always render the label next to published submissions.
  const app = readFileSync(new URL('../src/visitor/VisitorRecordsApp.tsx', import.meta.url), 'utf8');
  assert.match(app, /VISITOR_LABEL/);
  assert.match(app, /已发布的访客记录/);
});

test('visitor submissions never enter the curated layers', () => {
  const publishedIds = new Set(published.records.map(entry => entry.id));
  // No visitor asset may appear in the curated image registry, and vice versa.
  for (const [id, info] of Object.entries(images)) {
    assert.doesNotMatch(JSON.stringify(info), /visitor-records\//, id);
  }
  const museumsSource = readFileSync(new URL('../src/data/museums.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(museumsSource, /visitor-records\//);
  assert.doesNotMatch(museumsSource, /访客投稿/);
  for (const id of publishedIds) assert.doesNotMatch(museumsSource, new RegExp(id));
  // Published photos may only live under the dedicated public folder.
  for (const entry of published.records) {
    for (const photo of entry.photos) assert.match(photo.src, /^\/visitor-records\//, entry.id);
  }
});

test('the visitor tool stays local: no upload calls, no atlas data imports', () => {
  for (const file of VISITOR_SOURCE_FILES) {
    const code = readFileSync(new URL(file, import.meta.url), 'utf8');
    assert.doesNotMatch(code, /\bfetch\s*\(/, `${file} must not call fetch`);
    assert.doesNotMatch(code, /XMLHttpRequest|sendBeacon|WebSocket/, `${file} must not upload`);
    assert.doesNotMatch(code, /navigator\.geolocation/, `${file} must not read location`);
    assert.doesNotMatch(code, /from '\.\.\/data\/museum-index\.json'/, `${file} must not import atlas data`);
    assert.doesNotMatch(code, /from '\.\.\/data\/images\.json'/, `${file} must not import the curated image registry`);
  }
  // Photos are re-encoded, which is what strips EXIF/GPS before anything is stored.
  const image = readFileSync(new URL('../src/visitor/image.ts', import.meta.url), 'utf8');
  assert.match(image, /exifStripped: true/);
  assert.match(image, /toBlob|convertToBlob/);
});

test('the built site ships the visitor page separately from the atlas bundle', () => {
  const page = new URL('../dist/visitor-records/index.html', import.meta.url);
  assert.ok(existsSync(page), 'visitor page must be built');
  const pageHtml = readFileSync(page, 'utf8');
  const assets = readdirSync(new URL('../dist/assets/', import.meta.url));
  const visitorScripts = [...pageHtml.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map(match => match[1]);
  assert.equal(visitorScripts.length, 1);
  const visitorBundle = visitorScripts[0].split('/').pop();
  assert.match(visitorBundle, /^visitor-[\w-]+\.js$/);
  assert.ok(assets.includes(visitorBundle));

  const atlasHtml = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  const atlasScripts = [...atlasHtml.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map(match => match[1].split('/').pop());
  assert.ok(!atlasScripts.includes(visitorBundle), 'atlas must not load the visitor bundle');
  // The entry point is a plain link rendered by the atlas app, so it lives in its JS.
  const atlasEntryCode = readFileSync(new URL(`../dist/assets/${atlasScripts[0]}`, import.meta.url), 'utf8');
  assert.match(atlasEntryCode, /visitor-records\//, 'atlas footer must link to the visitor page');

  // The visitor bundle must not carry curated atlas payloads.
  const visitorCode = readFileSync(new URL(`../dist/assets/${visitorBundle}`, import.meta.url), 'utf8');
  assert.doesNotMatch(visitorCode, /authorizationStatus|assetSha256|故宫博物院藏/);
  assert.ok(statSync(new URL(`../dist/assets/${visitorBundle}`, import.meta.url)).size <= 60_000);
});
