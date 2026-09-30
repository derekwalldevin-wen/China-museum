/**
 * Visitor submissions API (phase B): real SQL through node:sqlite, in-memory R2 stand-in.
 * Covers validation, the R2/D1 storage split, the review queue, and the privacy rules.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import ts from 'typescript';

/* ── load src/visitor/server.ts with its ./core import inlined ─────────────── */

const transpile = path => ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;

const coreUrl = `data:text/javascript;base64,${Buffer.from(transpile('../src/visitor/core.ts')).toString('base64')}`;
const core = await import(coreUrl);
const serverJs = transpile('../src/visitor/server.ts').replace(/from\s*['"]\.\/core['"]/g, `from '${coreUrl}'`);
const server = await import(`data:text/javascript;base64,${Buffer.from(serverJs).toString('base64')}`);

/* ── fake bindings ─────────────────────────────────────────────────────────── */

const SCHEMA = readFileSync(new URL('../schema/visitor-records.sql', import.meta.url), 'utf8');

function createD1() {
  const db = new DatabaseSync(':memory:');
  db.exec(SCHEMA);
  const prepare = query => {
    let bound = [];
    const statement = {
      bind(...values) { bound = values; return statement; },
      async first() { return db.prepare(query).get(...bound) ?? null; },
      async all() { return { results: db.prepare(query).all(...bound), success: true }; },
      async run() { db.prepare(query).run(...bound); return { results: [], success: true }; },
    };
    return statement;
  };
  return {
    prepare,
    async batch(statements) { const out = []; for (const statement of statements) out.push(await statement.run()); return out; },
    _raw: db,
  };
}

function createR2() {
  const objects = new Map();
  return {
    objects,
    async put(key, value, options) { objects.set(key, { bytes: new Uint8Array(value), type: options?.httpMetadata?.contentType ?? 'application/octet-stream' }); },
    async get(key) {
      const found = objects.get(key);
      if (!found) return null;
      return { arrayBuffer: async () => found.bytes.buffer.slice(found.bytes.byteOffset, found.bytes.byteOffset + found.bytes.byteLength), httpMetadata: { contentType: found.type } };
    },
    async delete(key) { objects.delete(key); },
  };
}

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);

function photoForm(overrides = {}) {
  const form = new FormData();
  const fields = {
    museumName: '荆州博物馆', province: '湖北省', city: '荆州', visitedAt: '2026-09',
    note: '看到了虎座凤鸟悬鼓。', contributor: '小明', contact: '', consent: 'true',
    ...overrides,
  };
  for (const [key, value] of Object.entries(fields)) if (key !== 'photos') form.set(key, String(value));
  const photos = overrides.photos ?? [JPEG];
  for (const [index, bytes] of photos.entries()) {
    const name = `visit-${index}.jpg`;
    form.append('photos', new File([bytes], name, { type: 'image/jpeg' }));
    form.set(`width:${name}`, '1600');
    form.set(`height:${name}`, '1200');
    form.set(`caption:${name}`, '展厅现场');
  }
  return form;
}

const submitRequest = (form, headers = {}) => new Request('https://example.com/api/visitor/submit', { method: 'POST', body: form, headers });

/* ── tests ─────────────────────────────────────────────────────────────────── */

test('submit validates required fields, photos and consent', async () => {
  const env = { DB: createD1() };
  const empty = new FormData();
  const rejected = await server.handleSubmit(submitRequest(empty), env, '1.1.1.1');
  assert.equal(rejected.status, 400);
  const body = await rejected.json();
  assert.ok(body.errors.some(message => /博物馆名称/.test(message)));
  assert.ok(body.errors.some(message => /至少上传一张照片/.test(message)));
  assert.ok(body.errors.some(message => /本人拍摄/.test(message)));

  assert.equal((await server.handleSubmit(submitRequest(photoForm({ province: '火星省' })), env, '1.1.1.2')).status, 400);
  assert.equal((await server.handleSubmit(submitRequest(photoForm({ consent: 'false' })), env, '1.1.1.3')).status, 400);

  const big = new Uint8Array(server.MAX_UPLOAD_BYTES + 1);
  const bigResponse = await server.handleSubmit(submitRequest(photoForm({ photos: [big] })), env, '1.1.1.4');
  assert.equal(bigResponse.status, 400);
  assert.ok((await bigResponse.json()).errors.some(message => /超过 2 MB/.test(message)));

  const png = new FormData();
  for (const [key, value] of Object.entries({ museumName: 'A', province: '北京市', city: '北京', contributor: 'B', consent: 'true' })) png.set(key, value);
  png.append('photos', new File([JPEG], 'x.gif', { type: 'image/gif' }));
  assert.equal((await server.handleSubmit(submitRequest(png), env, '1.1.1.5')).status, 400);
});

test('a valid submission lands as pending and stores its photo in D1 until R2 exists', async () => {
  const env = { DB: createD1() };
  const response = await server.handleSubmit(submitRequest(photoForm()), env, '2.2.2.2');
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.status, 'pending');
  assert.equal(body.storage, 'd1');
  assert.equal(body.photos, 1);

  const submission = env.DB._raw.prepare('select * from submissions where id = ?1').get(body.id);
  assert.equal(submission.status, 'pending');
  assert.equal(submission.museum_name, '荆州博物馆');
  assert.equal(submission.published_at, null);
  const photo = env.DB._raw.prepare('select * from photos where submission_id = ?1').get(body.id);
  assert.equal(photo.storage, 'd1');
  assert.ok(photo.data instanceof Uint8Array && photo.data.length === JPEG.length, 'blob stored in D1');
  assert.equal(photo.sha256, await core.sha256Hex(JPEG));
  assert.equal(photo.width, 1600);

  // Pending submissions are invisible until reviewed.
  const published = await (await server.handlePublished(env)).json();
  assert.deepEqual(published.records, []);
  assert.equal((await server.handlePhoto(env, photo.id)).status, 404, 'pending photo must not be served');
});

test('with an R2 binding the photo goes to the bucket and is served back', async () => {
  const photos = createR2();
  const env = { DB: createD1(), PHOTOS: photos };
  const created = await (await server.handleSubmit(submitRequest(photoForm()), env, '3.3.3.3')).json();
  assert.equal(created.storage, 'r2');
  assert.equal(photos.objects.size, 1);

  const row = env.DB._raw.prepare('select * from photos where submission_id = ?1').get(created.id);
  assert.equal(row.storage, 'r2');
  assert.equal(row.data, null, 'R2 path must not duplicate bytes into D1');
  assert.ok(row.object_key.startsWith('visitor/'));
  assert.deepEqual([...photos.objects.get(row.object_key).bytes], [...JPEG]);
});

test('the review queue requires the admin token and controls publication', async () => {
  const env = { DB: createD1(), ADMIN_TOKEN: 'secret-token' };
  const created = await (await server.handleSubmit(submitRequest(photoForm()), env, '4.4.4.4')).json();

  const unauthorized = await server.handleReview(new Request('https://example.com/api/visitor/review', { method: 'POST', body: JSON.stringify({ action: 'list' }) }), env);
  assert.equal(unauthorized.status, 401);
  const wrong = await server.handleReview(new Request('https://example.com/api/visitor/review', { method: 'POST', headers: { 'x-admin-token': 'nope' }, body: JSON.stringify({ action: 'list' }) }), env);
  assert.equal(wrong.status, 401);

  const list = await server.handleReview(new Request('https://example.com/api/visitor/review', { method: 'POST', headers: { 'x-admin-token': 'secret-token' }, body: JSON.stringify({ action: 'list' }) }), env);
  const listed = await list.json();
  assert.equal(listed.records.length, 1);
  assert.equal(listed.records[0].id, created.id);
  assert.equal(listed.records[0].photos.length, 1);

  // Rejection must carry a reason.
  const rejectWithoutNote = await server.handleReview(new Request('https://example.com/api/visitor/review', { method: 'POST', headers: { 'x-admin-token': 'secret-token' }, body: JSON.stringify({ action: 'reject', id: created.id }) }), env);
  assert.equal(rejectWithoutNote.status, 400);

  const approve = await server.handleReview(new Request('https://example.com/api/visitor/review', { method: 'POST', headers: { 'x-admin-token': 'secret-token' }, body: JSON.stringify({ action: 'approve', id: created.id, note: '已核对本人拍摄声明' }) }), env);
  assert.equal(approve.status, 200);

  const published = await (await server.handlePublished(env)).json();
  assert.equal(published.records.length, 1);
  assert.equal(published.label, '访客投稿 · 未经馆方核验');
  const record = published.records[0];
  assert.equal(record.museumName, '荆州博物馆');
  assert.equal(record.contributor, '小明');
  assert.equal(record.reviewerNote, '已核对本人拍摄声明');
  assert.match(record.photos[0].src, /^\/api\/visitor\/photo\//);
  assert.equal(record.photos[0].sha256, await core.sha256Hex(JPEG));

  // No private columns may leak into the public payload.
  const serialized = JSON.stringify(published);
  for (const secret of ['contact', 'ip_hash', 'user_agent', 'secret-token']) assert.doesNotMatch(serialized, new RegExp(secret));

  // Approved photos are public; the status endpoint reports the decision.
  const photoRow = env.DB._raw.prepare('select * from photos where submission_id = ?1').get(created.id);
  const served = await server.handlePhoto(env, photoRow.id);
  assert.equal(served.status, 200);
  assert.equal(served.headers.get('content-type'), 'image/jpeg');
  assert.deepEqual([...new Uint8Array(await served.arrayBuffer())], [...JPEG]);

  const status = await (await server.handleStatus(env, created.id)).json();
  assert.equal(status.status, 'approved');
  assert.equal(status.reviewNote, '已核对本人拍摄声明');
});

test('rejection hides the submission again and is reported to the submitter', async () => {
  const env = { DB: createD1(), ADMIN_TOKEN: 'token' };
  const created = await (await server.handleSubmit(submitRequest(photoForm()), env, '5.5.5.5')).json();
  const header = { 'x-admin-token': 'token' };
  await server.handleReview(new Request('https://example.com/api/visitor/review', { method: 'POST', headers: header, body: JSON.stringify({ action: 'approve', id: created.id }) }), env);
  assert.equal((await (await server.handlePublished(env)).json()).records.length, 1);
  await server.handleReview(new Request('https://example.com/api/visitor/review', { method: 'POST', headers: header, body: JSON.stringify({ action: 'reject', id: created.id, note: '照片非本人拍摄' }) }), env);
  assert.equal((await (await server.handlePublished(env)).json()).records.length, 0);
  const status = await (await server.handleStatus(env, created.id)).json();
  assert.equal(status.status, 'rejected');
  assert.equal(status.reviewNote, '照片非本人拍摄');
});

test('an admin token can preview a pending photo; the rate limiter caps submissions per hour', async () => {
  const env = { DB: createD1(), ADMIN_TOKEN: 'token' };
  const created = await (await server.handleSubmit(submitRequest(photoForm()), env, '6.6.6.6')).json();
  const photoRow = env.DB._raw.prepare('select * from photos where submission_id = ?1').get(created.id);
  assert.equal((await server.handlePhoto(env, photoRow.id, false)).status, 404);
  assert.equal((await server.handlePhoto(env, photoRow.id, true)).status, 200);

  let allowedHere = 0;
  let limited = 0;
  for (let index = 0; index < 7; index += 1) {
    const response = await server.handleSubmit(submitRequest(photoForm()), env, '7.7.7.7');
    if (response.status === 201) allowedHere += 1;
    else { assert.equal(response.status, 429); limited += 1; }
  }
  assert.equal(allowedHere, server.RATE_LIMIT_PER_HOUR, 'exactly the configured allowance gets through');
  assert.equal(limited, 2, 'the rest are throttled');
  const otherIp = await server.handleSubmit(submitRequest(photoForm()), env, '8.8.8.8');
  assert.equal(otherIp.status, 201, 'a different address is not affected');
});
