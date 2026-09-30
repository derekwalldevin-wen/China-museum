/**
 * Visitor submissions — server side (Cloudflare Pages Functions).
 *
 * The whole module only uses Web APIs (Request/Response/FormData/crypto) so the same
 * handlers run in the Workers runtime and in the Node test suite with mock bindings.
 *
 * Storage policy: photos go to R2 when the PHOTOS binding exists; until R2 is enabled on
 * the account they are kept in the D1 `data` blob column. Nothing is public until a
 * human approves it.
 */
import { VISITOR_PROVINCES, sha256Hex } from './core';

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 12 * 1024 * 1024;
export const MAX_PHOTOS = 12;
export const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
export const RATE_LIMIT_PER_HOUR = 5;
export const STATUSES = ['pending', 'approved', 'rejected'] as const;
export type Status = typeof STATUSES[number];

/* ── Minimal binding types (avoids depending on @cloudflare/workers-types) ─── */

export interface D1Result<T> { results: T[]; success: boolean }
export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
  run(): Promise<D1Result<unknown>>;
}
export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1Result<unknown>[]>;
}
export interface R2BucketLike {
  put(key: string, value: ArrayBuffer | Uint8Array, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer>; httpMetadata?: { contentType?: string } } | null>;
  delete(key: string): Promise<void>;
}
export interface VisitorEnv {
  DB: D1Database;
  PHOTOS?: R2BucketLike;
  ADMIN_TOKEN?: string;
  IP_SALT?: string;
}

export interface SubmissionRow {
  id: string;
  created_at: string;
  museum_name: string;
  province: string;
  city: string;
  visited_at: string | null;
  note: string | null;
  contributor: string;
  status: Status;
  review_note: string | null;
  reviewed_at: string | null;
  published_at: string | null;
  photo_count: number;
}
export interface PhotoRow {
  id: string;
  submission_id: string;
  position: number;
  mime: string;
  bytes: number;
  width: number;
  height: number;
  sha256: string;
  storage: 'r2' | 'd1';
  object_key: string | null;
}

/* ── Validation ───────────────────────────────────────────────────────────── */

export interface SubmitFields {
  museumName: string; province: string; city: string; visitedAt: string;
  note: string; contributor: string; contact: string;
}

export function validateSubmitFields(fields: SubmitFields): string[] {
  const errors: string[] = [];
  if (!fields.museumName.trim()) errors.push('请填写博物馆名称');
  if (fields.museumName.trim().length > 60) errors.push('博物馆名称过长');
  if (!VISITOR_PROVINCES.includes(fields.province)) errors.push('省份不在允许列表内');
  if (!fields.city.trim()) errors.push('请填写城市');
  if (fields.city.trim().length > 30) errors.push('城市名称过长');
  if (fields.visitedAt && !/^\d{4}-\d{2}$/.test(fields.visitedAt)) errors.push('参观时间请用 YYYY-MM');
  if (fields.note.length > 500) errors.push('文字说明请控制在 500 字以内');
  if (!fields.contributor.trim()) errors.push('请填写投稿人署名');
  if (fields.contributor.trim().length > 40) errors.push('署名过长');
  if (fields.contact.length > 120) errors.push('联系方式过长');
  return errors;
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

async function hashIp(ip: string, salt: string): Promise<string> {
  return (await sha256Hex(new TextEncoder().encode(`${salt}:${ip}`))).slice(0, 32);
}

/** One row per IP per hour; returns false when the caller is over the limit. */
export async function allowRequest(db: D1Database, ipHash: string): Promise<boolean> {
  const windowStart = new Date(Math.floor(Date.now() / 3600000) * 3600000).toISOString();
  await db.prepare('INSERT OR IGNORE INTO rate_limits (ip_hash, window_start, count) VALUES (?1, ?2, 0)').bind(ipHash, windowStart).run();
  await db.prepare('UPDATE rate_limits SET count = count + 1 WHERE ip_hash = ?1 AND window_start = ?2').bind(ipHash, windowStart).run();
  const row = await db.prepare('SELECT count FROM rate_limits WHERE ip_hash = ?1 AND window_start = ?2').bind(ipHash, windowStart).first<{ count: number }>();
  return (row?.count ?? 0) <= RATE_LIMIT_PER_HOUR;
}

/* ── Photo storage adapter ────────────────────────────────────────────────── */

export async function putPhoto(env: VisitorEnv, id: string, bytes: Uint8Array, mime: string): Promise<{ storage: 'r2' | 'd1'; objectKey: string | null }> {
  const key = `visitor/${id}.jpg`;
  if (env.PHOTOS) {
    await env.PHOTOS.put(key, bytes, { httpMetadata: { contentType: mime } });
    return { storage: 'r2', objectKey: key };
  }
  return { storage: 'd1', objectKey: null };
}

export async function getPhotoBytes(env: VisitorEnv, photo: PhotoRow): Promise<{ bytes: Uint8Array; mime: string } | null> {
  if (photo.storage === 'r2') {
    if (!env.PHOTOS || !photo.object_key) return null;
    const object = await env.PHOTOS.get(photo.object_key);
    if (!object) return null;
    return { bytes: new Uint8Array(await object.arrayBuffer()), mime: object.httpMetadata?.contentType ?? photo.mime };
  }
  const row = await env.DB.prepare('SELECT data FROM photos WHERE id = ?1').bind(photo.id).first<{ data: ArrayBuffer | null }>();
  if (!row?.data) return null;
  return { bytes: new Uint8Array(row.data), mime: photo.mime };
}

/* ── Handlers ─────────────────────────────────────────────────────────────── */

interface SubmitPhotoInput { bytes: Uint8Array; mime: string; width: number; height: number; caption: string }

export async function handleSubmit(request: Request, env: VisitorEnv, ip = '0.0.0.0'): Promise<Response> {
  if (!env.DB) return json({ error: '服务未配置存储' }, 503);
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: '请使用表单方式提交' }, 400);
  }
  const text = (name: string) => String(form.get(name) ?? '');
  const fields: SubmitFields = {
    museumName: text('museumName'),
    province: text('province'),
    city: text('city'),
    visitedAt: text('visitedAt'),
    note: text('note'),
    contributor: text('contributor'),
    contact: text('contact'),
  };
  const errors = validateSubmitFields(fields);
  if (text('consent') !== 'true') errors.push('请确认照片为本人拍摄并同意审核后展示');

  const uploads: SubmitPhotoInput[] = [];
  for (const entry of form.getAll('photos')) {
    if (typeof entry === 'string') continue;
    const file = entry as File;
    if (!ALLOWED_MIME.includes(file.type)) { errors.push(`不支持的图片格式：${file.type || '未知'}`); continue; }
    if (file.size > MAX_UPLOAD_BYTES) { errors.push(`单张照片超过 ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB`); continue; }
    uploads.push({
      bytes: new Uint8Array(await file.arrayBuffer()),
      mime: file.type,
      width: Number(text(`width:${file.name}`)) || 0,
      height: Number(text(`height:${file.name}`)) || 0,
      caption: text(`caption:${file.name}`).slice(0, 120),
    });
  }
  if (uploads.length === 0) errors.push('请至少上传一张照片');
  if (uploads.length > MAX_PHOTOS) errors.push(`最多 ${MAX_PHOTOS} 张照片`);
  const total = uploads.reduce((sum, item) => sum + item.bytes.length, 0);
  if (total > MAX_TOTAL_BYTES) errors.push('照片总大小超出限制');
  if (errors.length) return json({ error: '提交未通过校验', errors }, 400);

  const salt = env.IP_SALT ?? 'huaxia-visitor';
  const ipHash = await hashIp(ip, salt);
  if (!(await allowRequest(env.DB, ipHash))) return json({ error: '提交过于频繁，请稍后再试' }, 429);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const statements = [
    env.DB.prepare(`INSERT INTO submissions (id, created_at, museum_name, province, city, visited_at, note, contributor, contact, status, photo_count, ip_hash, user_agent)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'pending', ?10, ?11, ?12)`)
      .bind(id, now, fields.museumName.trim(), fields.province, fields.city.trim(), fields.visitedAt || null, fields.note.trim() || null,
        fields.contributor.trim(), fields.contact.trim() || null, uploads.length, ipHash, (request.headers.get('user-agent') ?? '').slice(0, 200)),
  ];

  for (const [index, upload] of uploads.entries()) {
    const photoId = crypto.randomUUID();
    const stored = await putPhoto(env, `${id}-${photoId}`, upload.bytes, upload.mime);
    const digest = await sha256Hex(upload.bytes);
    statements.push(env.DB.prepare(`INSERT INTO photos (id, submission_id, position, mime, bytes, width, height, sha256, storage, object_key, data, caption)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`)
      .bind(photoId, id, index, upload.mime, upload.bytes.length, upload.width, upload.height, digest,
        stored.storage, stored.objectKey, stored.storage === 'd1' ? upload.bytes : null, upload.caption || null));
  }
  await env.DB.batch(statements);
  return json({ id, status: 'pending', photos: uploads.length, storage: env.PHOTOS ? 'r2' : 'd1' }, 201);
}

function publicRecord(submission: SubmissionRow, photos: PhotoRow[]) {
  return {
    id: submission.id,
    museumName: submission.museum_name,
    province: submission.province,
    city: submission.city,
    visitedAt: submission.visited_at ?? undefined,
    note: submission.note ?? undefined,
    contributor: submission.contributor,
    publishedAt: submission.published_at ?? submission.created_at,
    reviewedAt: submission.reviewed_at ?? submission.created_at,
    reviewerNote: submission.review_note ?? '',
    photos: photos.map(photo => ({
      src: `/api/visitor/photo/${photo.id}`,
      width: photo.width,
      height: photo.height,
      sha256: photo.sha256,
      caption: undefined as string | undefined,
    })),
  };
}

export async function handlePublished(env: VisitorEnv): Promise<Response> {
  if (!env.DB) return json({ error: '服务未配置存储' }, 503);
  const submissions = await env.DB.prepare(
    `SELECT * FROM submissions WHERE status = 'approved' ORDER BY COALESCE(published_at, created_at) DESC LIMIT 60`,
  ).all<SubmissionRow>();
  const records = [];
  for (const submission of submissions.results) {
    const photos = await env.DB.prepare('SELECT * FROM photos WHERE submission_id = ?1 ORDER BY position').bind(submission.id).all<PhotoRow>();
    records.push(publicRecord(submission, photos.results));
  }
  return new Response(JSON.stringify({ version: 1, label: '访客投稿 · 未经馆方核验', records }), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=30, must-revalidate' },
  });
}

export async function handlePhoto(env: VisitorEnv, photoId: string, admin = false): Promise<Response> {
  if (!env.DB) return json({ error: '服务未配置存储' }, 503);
  const photo = await env.DB.prepare('SELECT * FROM photos WHERE id = ?1').bind(photoId).first<PhotoRow>();
  if (!photo) return json({ error: 'not found' }, 404);
  if (!admin) {
    const submission = await env.DB.prepare('SELECT status FROM submissions WHERE id = ?1').bind(photo.submission_id).first<{ status: Status }>();
    if (submission?.status !== 'approved') return json({ error: 'not found' }, 404);
  }
  const bytes = await getPhotoBytes(env, photo);
  if (!bytes) return json({ error: 'not found' }, 404);
  return new Response(bytes.bytes as unknown as BodyInit, {
    headers: {
      'content-type': bytes.mime,
      'cache-control': admin ? 'no-store' : 'public, max-age=86400, immutable',
      'x-content-type-options': 'nosniff',
    },
  });
}

export async function handleStatus(env: VisitorEnv, id: string): Promise<Response> {
  if (!env.DB) return json({ error: '服务未配置存储' }, 503);
  const submission = await env.DB.prepare('SELECT id, status, review_note, created_at, reviewed_at FROM submissions WHERE id = ?1').bind(id).first<{ id: string; status: Status; review_note: string | null; created_at: string; reviewed_at: string | null }>();
  if (!submission) return json({ error: 'not found' }, 404);
  return json({ id: submission.id, status: submission.status, reviewNote: submission.review_note ?? undefined, createdAt: submission.created_at, reviewedAt: submission.reviewed_at ?? undefined });
}

export interface ReviewRequest { action: 'list' | 'approve' | 'reject'; id?: string; note?: string }

export async function handleReview(request: Request, env: VisitorEnv): Promise<Response> {
  if (!env.DB) return json({ error: '服务未配置存储' }, 503);
  const token = request.headers.get('x-admin-token') ?? '';
  if (!env.ADMIN_TOKEN) return json({ error: '未配置审核令牌' }, 503);
  if (token.length !== env.ADMIN_TOKEN.length || token !== env.ADMIN_TOKEN) return json({ error: '未授权' }, 401);

  let body: ReviewRequest;
  try { body = await request.json() as ReviewRequest; } catch { return json({ error: '需要 JSON 请求体' }, 400); }

  if (body.action === 'list') {
    const status = request.headers.get('x-review-status') ?? 'pending';
    const rows = await env.DB.prepare('SELECT * FROM submissions WHERE status = ?1 ORDER BY created_at DESC LIMIT 100').bind(status).all<SubmissionRow>();
    const records = [];
    for (const submission of rows.results) {
      const photos = await env.DB.prepare('SELECT * FROM photos WHERE submission_id = ?1 ORDER BY position').bind(submission.id).all<PhotoRow>();
      records.push({
        id: submission.id, createdAt: submission.created_at, museumName: submission.museum_name,
        province: submission.province, city: submission.city, visitedAt: submission.visited_at,
        note: submission.note, contributor: submission.contributor, status: submission.status,
        reviewNote: submission.review_note,
        photos: photos.results.map(photo => ({ id: photo.id, url: `/api/visitor/photo/${photo.id}`, sha256: photo.sha256, bytes: photo.bytes })),
      });
    }
    return json({ status, records });
  }

  if (!body.id) return json({ error: '缺少 id' }, 400);
  if (body.action === 'approve') {
    const now = new Date().toISOString();
    await env.DB.prepare(`UPDATE submissions SET status = 'approved', review_note = ?1, reviewed_at = ?2, published_at = ?2 WHERE id = ?3`)
      .bind(body.note ?? '审核通过', now, body.id).run();
    return json({ id: body.id, status: 'approved', reviewedAt: now });
  }
  if (body.action === 'reject') {
    if (!body.note?.trim()) return json({ error: '驳回必须填写理由' }, 400);
    const now = new Date().toISOString();
    await env.DB.prepare(`UPDATE submissions SET status = 'rejected', review_note = ?1, reviewed_at = ?2 WHERE id = ?3`)
      .bind(body.note.trim(), now, body.id).run();
    return json({ id: body.id, status: 'rejected', reviewedAt: now });
  }
  return json({ error: '未知操作' }, 400);
}
