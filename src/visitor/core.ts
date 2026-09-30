/**
 * Visitor records: pure logic shared by the browser page and the Node test suite.
 *
 * Phase A scope: everything lives in the visitor's own browser. Nothing here uploads
 * anything, and nothing here may ever feed the curated atlas data (see
 * scripts/visitor-records.test.mjs, which enforces that separation).
 */

export const VISITOR_SCHEMA = 1;
export const VISITOR_LABEL = '访客投稿 · 未经馆方核验';
export const MAX_PHOTOS_PER_RECORD = 12;
export const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
export const MAX_EDGE = 2048;
export const THUMB_EDGE = 480;

/** Province names follow the atlas convention (see src/data/museum-index.json). */
export const VISITOR_PROVINCES = [
  '北京市', '天津市', '上海市', '重庆市',
  '河北省', '山西省', '辽宁省', '吉林省', '黑龙江省', '江苏省', '浙江省', '安徽省',
  '福建省', '江西省', '山东省', '河南省', '湖北省', '湖南省', '广东省', '海南省',
  '四川省', '贵州省', '云南省', '陕西省', '甘肃省', '青海省', '台湾省',
  '内蒙古自治区', '广西壮族自治区', '西藏自治区', '宁夏回族自治区', '新疆维吾尔自治区',
  '香港特别行政区', '澳门特别行政区',
];

export interface VisitorPhotoMeta {
  id: string;
  sourceName: string;
  mime: string;
  bytes: number;
  width: number;
  height: number;
  sha256: string;
  thumbBytes: number;
  /** Always true: photos are re-encoded through a canvas, which drops EXIF/GPS. */
  exifStripped: true;
}

export interface VisitorRecord {
  schema: typeof VISITOR_SCHEMA;
  id: string;
  createdAt: string;
  updatedAt: string;
  museumName: string;
  province: string;
  city: string;
  visitedAt?: string;
  note?: string;
  /** Shown publicly next to an approved submission; optional for purely local records. */
  contributor?: string;
  photos: VisitorPhotoMeta[];
  consent: { ownWork: true; allowPublicAfterReview: true; agreedAt: string };
}

export interface PhotoBlobs { full: Blob; thumb: Blob }
export interface LocalRecord { record: VisitorRecord; photos: Record<string, PhotoBlobs> }

/** A record the maintainer has reviewed and published into the static site. */
export interface PublishedRecord {
  id: string;
  museumId?: string;
  museumName: string;
  province: string;
  city: string;
  visitedAt?: string;
  note?: string;
  contributor: string;
  publishedAt: string;
  reviewedAt: string;
  reviewerNote: string;
  photos: { src: string; width: number; height: number; sha256: string; caption?: string }[];
}

export function newId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

const ISO = /^\d{4}-\d{2}-\d{2}T/;
const MONTH = /^\d{4}-\d{2}$/;
const SHA256 = /^[0-9a-f]{64}$/;

export function validateVisitorRecord(record: VisitorRecord, options: { requirePhoto?: boolean } = {}): string[] {
  const errors: string[] = [];
  if (record.schema !== VISITOR_SCHEMA) errors.push('schema 版本不受支持');
  if (!record.id) errors.push('缺少记录 id');
  if (!record.museumName?.trim()) errors.push('请填写博物馆名称');
  if (record.museumName && record.museumName.trim().length > 60) errors.push('博物馆名称过长');
  if (!record.province?.trim()) errors.push('请选择省份');
  else if (!VISITOR_PROVINCES.includes(record.province)) errors.push(`省份不在已知列表：${record.province}`);
  if (!record.city?.trim()) errors.push('请填写城市');
  if (record.city && record.city.trim().length > 30) errors.push('城市名称过长');
  if (record.visitedAt && !MONTH.test(record.visitedAt)) errors.push('参观时间请用 YYYY-MM 格式');
  if (record.note && record.note.length > 500) errors.push('文字说明请控制在 500 字以内');
  if (record.contributor && record.contributor.length > 40) errors.push('投稿人署名过长');
  if (!ISO.test(record.createdAt ?? '')) errors.push('createdAt 不是 ISO 时间');
  if (!ISO.test(record.updatedAt ?? '')) errors.push('updatedAt 不是 ISO 时间');
  if (record.consent?.ownWork !== true) errors.push('请确认照片为本人拍摄');
  if (record.consent?.allowPublicAfterReview !== true) errors.push('请确认同意审核后公开展示');
  if (!Array.isArray(record.photos)) errors.push('photos 必须是数组');
  else {
    if (record.photos.length > MAX_PHOTOS_PER_RECORD) errors.push(`每条记录最多 ${MAX_PHOTOS_PER_RECORD} 张照片`);
    if (options.requirePhoto !== false && record.photos.length === 0) errors.push('请至少上传一张照片');
    for (const photo of record.photos) {
      if (!photo.id) errors.push('照片缺少 id');
      if (!(photo.bytes > 0)) errors.push('照片字节数为空');
      if (!(photo.width > 0 && photo.height > 0)) errors.push('照片尺寸缺失');
      if (!SHA256.test(photo.sha256 ?? '')) errors.push('照片 sha256 缺失');
      if (photo.exifStripped !== true) errors.push('照片必须经过去除 EXIF 的处理');
    }
  }
  return errors;
}

export function validatePublishedRecord(record: PublishedRecord, museumIds: Set<string>): string[] {
  const errors: string[] = [];
  if (!record.id) errors.push('缺少 id');
  if (!record.museumName?.trim()) errors.push('缺少博物馆名称');
  if (!record.province?.trim()) errors.push('缺少省份');
  if (!record.city?.trim()) errors.push('缺少城市');
  if (!record.contributor?.trim()) errors.push('缺少投稿人署名');
  if (!ISO.test(record.publishedAt ?? '')) errors.push('publishedAt 不是 ISO 时间');
  if (!ISO.test(record.reviewedAt ?? '')) errors.push('reviewedAt 不是 ISO 时间');
  if (!record.reviewerNote?.trim()) errors.push('缺少审核备注');
  if (record.museumId && !museumIds.has(record.museumId)) errors.push(`museumId 不存在：${record.museumId}`);
  if (!Array.isArray(record.photos) || record.photos.length === 0) errors.push('缺少照片');
  else for (const photo of record.photos) {
    if (!photo.src?.startsWith('/visitor-records/')) errors.push(`照片路径必须在 /visitor-records/ 下：${photo.src}`);
    if (!SHA256.test(photo.sha256 ?? '')) errors.push('照片 sha256 缺失');
    if (!(photo.width > 0 && photo.height > 0)) errors.push('照片尺寸缺失');
  }
  return errors;
}

export async function sha256Hex(input: ArrayBuffer | Uint8Array): Promise<string> {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes as unknown as ArrayBuffer);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

let crcTable: Uint32Array | undefined;
function crc32Table(): Uint32Array {
  if (crcTable) return crcTable;
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[index] = value >>> 0;
  }
  crcTable = table;
  return table;
}

export function crc32(bytes: Uint8Array): number {
  const table = crc32Table();
  let crc = 0xffffffff;
  for (const byte of bytes) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/* ── ZIP (stored write, stored + deflate read) ─────────────────────────────── */

interface ZipEntry { name: string; bytes: Uint8Array }

const LOCAL_SIG = 0x04034b50;
const CENTRAL_SIG = 0x02014b50;
const EOCD_SIG = 0x06054b50;

function dosDateTime(date: Date): { time: number; date: number } {
  const time = ((date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)) & 0xffff;
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, date: day & 0xffff };
}

/** Build a ZIP with stored (uncompressed) entries — JPEG payloads do not compress. */
export function buildZip(files: ZipEntry[], now = new Date()): Uint8Array {
  const encoder = new TextEncoder();
  const { time, date } = dosDateTime(now);
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(file.name);
    const crc = crc32(file.bytes);
    const local = new Uint8Array(30 + name.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, LOCAL_SIG, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, time, true);
    localView.setUint16(12, date, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, file.bytes.length, true);
    localView.setUint32(22, file.bytes.length, true);
    localView.setUint16(26, name.length, true);
    localView.setUint16(28, 0, true);
    local.set(name, 30);
    locals.push(local, file.bytes);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, CENTRAL_SIG, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, time, true);
    centralView.setUint16(14, date, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, file.bytes.length, true);
    centralView.setUint32(24, file.bytes.length, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offset, true);
    central.set(name, 46);
    centrals.push(central);

    offset += local.length + file.bytes.length;
  }

  const centralSize = centrals.reduce((total, entry) => total + entry.length, 0);
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, EOCD_SIG, true);
  eocdView.setUint16(4, 0, true);
  eocdView.setUint16(6, 0, true);
  eocdView.setUint16(8, files.length, true);
  eocdView.setUint16(10, files.length, true);
  eocdView.setUint32(12, centralSize, true);
  eocdView.setUint32(16, offset, true);
  eocdView.setUint16(20, 0, true);

  const parts = [...locals, ...centrals, eocd];
  const total = parts.reduce((size, part) => size + part.length, 0);
  const output = new Uint8Array(total);
  let cursor = 0;
  for (const part of parts) { output.set(part, cursor); cursor += part.length; }
  return output;
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') throw new Error('当前环境不支持解压该压缩包');
  const stream = new Blob([bytes as unknown as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Read a ZIP produced by us (stored) or by a normal tool (deflate). */
export async function readZip(bytes: Uint8Array): Promise<ZipEntry[]> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let index = bytes.length - 22; index >= 0 && index > bytes.length - 22 - 65536; index -= 1) {
    if (view.getUint32(index, true) === EOCD_SIG) { eocd = index; break; }
  }
  if (eocd < 0) throw new Error('不是有效的 ZIP 文件');
  const count = view.getUint16(eocd + 10, true);
  let cursor = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();
  const entries: ZipEntry[] = [];

  for (let index = 0; index < count; index += 1) {
    if (view.getUint32(cursor, true) !== CENTRAL_SIG) throw new Error('ZIP 中央目录损坏');
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));

    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const raw = bytes.subarray(dataStart, dataStart + compressedSize);
    entries.push({ name, bytes: method === 0 ? raw.slice() : await inflateRaw(raw) });

    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

/* ── Export package ────────────────────────────────────────────────────────── */

export const EXPORT_README = [
  '华夏博物志 · 访客实地记录（导出包）',
  '',
  '这个压缩包里是你自己填写的博物馆参观记录：',
  '  records.json  —— 文字信息与照片校验值（sha256）',
  '  photos/       —— 你上传的照片（已去掉 EXIF/GPS 信息）',
  '',
  '本站目前不做上传：这份记录只存在于你自己的浏览器里，导出后你可以：',
  '  1) 自己留档；',
  '  2) 交给站长审核，审核通过后才会出现在网站的“访客实地记录”栏目里。',
  '',
  '审核前请自行确认：照片为你本人拍摄、拍摄时馆方允许拍摄、画面中若有人物你已获得同意。',
].join('\n');

export interface ExportPackage { name: string; bytes: Uint8Array; recordCount: number; photoCount: number }

export async function buildExportPackage(records: LocalRecord[], now = new Date()): Promise<ExportPackage> {
  const encoder = new TextEncoder();
  const files: ZipEntry[] = [];
  const exported = {
    schema: VISITOR_SCHEMA,
    exportedAt: now.toISOString(),
    note: '这些记录由访客在本站本地填写，未经馆方核验；审核通过后才会公开展示。',
    records: records.map(entry => ({
      ...entry.record,
      photos: entry.record.photos.map(photo => ({
        ...photo,
        fullPath: `photos/${entry.record.id}/${photo.id}.jpg`,
        thumbPath: `photos/${entry.record.id}/${photo.id}.thumb.jpg`,
      })),
    })),
  };
  files.push({ name: 'records.json', bytes: encoder.encode(`${JSON.stringify(exported, null, 2)}\n`) });
  files.push({ name: 'README.txt', bytes: encoder.encode(`${EXPORT_README}\n`) });

  let photoCount = 0;
  for (const entry of records) {
    for (const photo of entry.record.photos) {
      const blobs = entry.photos[photo.id];
      if (!blobs) continue;
      files.push({ name: `photos/${entry.record.id}/${photo.id}.jpg`, bytes: new Uint8Array(await blobs.full.arrayBuffer()) });
      files.push({ name: `photos/${entry.record.id}/${photo.id}.thumb.jpg`, bytes: new Uint8Array(await blobs.thumb.arrayBuffer()) });
      photoCount += 1;
    }
  }
  const stamp = now.toISOString().slice(0, 10);
  return { name: `华夏博物志-访客记录-${stamp}.zip`, bytes: buildZip(files, now), recordCount: records.length, photoCount };
}

export interface ImportResult { records: LocalRecord[]; skipped: string[]; warnings: string[] }

export async function readExportPackage(bytes: Uint8Array): Promise<ImportResult> {
  const entries = await readZip(bytes);
  const decoder = new TextDecoder();
  const manifest = entries.find(entry => entry.name === 'records.json');
  if (!manifest) throw new Error('压缩包里没有 records.json，可能不是本站导出的记录包');
  const parsed = JSON.parse(decoder.decode(manifest.bytes)) as { records?: unknown };
  if (!Array.isArray(parsed.records)) throw new Error('records.json 结构不正确');

  const byName = new Map(entries.map(entry => [entry.name, entry.bytes]));
  const records: LocalRecord[] = [];
  const skipped: string[] = [];
  const warnings: string[] = [];

  for (const raw of parsed.records as (VisitorRecord & { photos: (VisitorPhotoMeta & { fullPath?: string; thumbPath?: string })[] })[]) {
    const photos: Record<string, PhotoBlobs> = {};
    const metas: VisitorPhotoMeta[] = [];
    for (const photo of raw.photos ?? []) {
      const fullPath = photo.fullPath ?? `photos/${raw.id}/${photo.id}.jpg`;
      const thumbPath = photo.thumbPath ?? `photos/${raw.id}/${photo.id}.thumb.jpg`;
      const full = byName.get(fullPath);
      const thumb = byName.get(thumbPath) ?? full;
      if (!full) { warnings.push(`记录 ${raw.id} 缺少照片文件 ${fullPath}`); continue; }
      const actual = await sha256Hex(full);
      if (actual !== photo.sha256) { warnings.push(`照片 ${photo.id} 的 sha256 与清单不符，已跳过`); continue; }
      const { fullPath: _full, thumbPath: _thumb, ...meta } = photo;
      metas.push(meta);
      photos[photo.id] = { full: new Blob([full as unknown as BlobPart], { type: photo.mime || 'image/jpeg' }), thumb: new Blob([thumb as unknown as BlobPart], { type: photo.mime || 'image/jpeg' }) };
    }
    const record: VisitorRecord = { ...raw, photos: metas };
    const errors = validateVisitorRecord(record);
    if (errors.length) { skipped.push(`${raw.id || '(无 id)'}: ${errors.join('；')}`); continue; }
    records.push({ record, photos });
  }
  return { records, skipped, warnings };
}

export function summarize(records: LocalRecord[]): { records: number; photos: number; bytes: number } {
  let photos = 0;
  let bytes = 0;
  for (const entry of records) {
    photos += entry.record.photos.length;
    for (const meta of entry.record.photos) bytes += meta.bytes;
  }
  return { records: records.length, photos, bytes };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
