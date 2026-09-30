import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MAX_PHOTOS_PER_RECORD,
  VISITOR_LABEL,
  VISITOR_PROVINCES,
  VISITOR_SCHEMA,
  buildExportPackage,
  formatBytes,
  newId,
  readExportPackage,
  summarize,
  validateVisitorRecord,
  type LocalRecord,
  type PhotoBlobs,
  type PublishedRecord,
  type VisitorPhotoMeta,
  type VisitorRecord,
} from './core';
import { describeRejection, ingestImageFile } from './image';
import { clearLocalRecords, deleteLocalRecord, estimateUsage, listLocalRecords, saveLocalRecord } from './storage';
import publishedData from '../data/visitor-records.json';
import './visitor.css';

const published = publishedData as unknown as { version: number; reviewedAt?: string | null; records: PublishedRecord[] };

interface FormState {
  museumName: string;
  province: string;
  city: string;
  visitedAt: string;
  note: string;
}

const emptyForm: FormState = { museumName: '', province: '北京市', city: '', visitedAt: '', note: '' };

interface DraftPhoto { meta: VisitorPhotoMeta; blobs: PhotoBlobs; previewUrl: string }

export default function VisitorRecordsApp() {
  const [records, setRecords] = useState<LocalRecord[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  const [ownWork, setOwnWork] = useState(false);
  const [allowPublic, setAllowPublic] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string>('');
  const [busy, setBusy] = useState<string>('');
  const [usage, setUsage] = useState<{ usage: number; quota: number } | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const fileInput = useRef<HTMLInputElement>(null);
  const importInput = useRef<HTMLInputElement>(null);

  const totals = useMemo(() => summarize(records), [records]);

  const refresh = useCallback(async () => {
    try {
      const rows = await listLocalRecords();
      setRecords(rows);
      const urls: Record<string, string> = {};
      for (const entry of rows) {
        for (const meta of entry.record.photos) {
          const blobs = entry.photos[meta.id];
          if (blobs) urls[meta.id] = URL.createObjectURL(blobs.thumb);
        }
      }
      setPreviewUrls(previous => {
        for (const [key, url] of Object.entries(previous)) if (!urls[key]) URL.revokeObjectURL(url);
        return urls;
      });
      setUsage(await estimateUsage());
    } catch (error) {
      setErrors([error instanceof Error ? error.message : String(error)]);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => () => { for (const url of Object.values(previewUrls)) URL.revokeObjectURL(url); }, [previewUrls]);

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const room = MAX_PHOTOS_PER_RECORD - photos.length;
    if (room <= 0) { setErrors([`每条记录最多 ${MAX_PHOTOS_PER_RECORD} 张照片`]); return; }
    const list = [...files].slice(0, room);
    const accepted: DraftPhoto[] = [];
    const rejected: string[] = [];
    for (const [index, file] of list.entries()) {
      const rejection = describeRejection(file);
      if (rejection) { rejected.push(rejection); continue; }
      setBusy(`正在处理照片 ${index + 1}/${list.length}…`);
      try {
        const ingested = await ingestImageFile(file);
        accepted.push({ ...ingested, previewUrl: URL.createObjectURL(ingested.blobs.thumb) });
      } catch (error) {
        rejected.push(error instanceof Error ? error.message : String(error));
      }
    }
    setBusy('');
    setPhotos(previous => [...previous, ...accepted]);
    setErrors(rejected);
    if (fileInput.current) fileInput.current.value = '';
  }

  async function save() {
    setErrors([]);
    setNotice('');
    const now = new Date().toISOString();
    const record: VisitorRecord = {
      schema: VISITOR_SCHEMA,
      id: newId(),
      createdAt: now,
      updatedAt: now,
      museumName: form.museumName.trim(),
      province: form.province,
      city: form.city.trim(),
      visitedAt: form.visitedAt || undefined,
      note: form.note.trim() || undefined,
      photos: photos.map(entry => entry.meta),
      consent: { ownWork: ownWork as true, allowPublicAfterReview: allowPublic as true, agreedAt: now },
    };
    const found = validateVisitorRecord(record);
    if (found.length) { setErrors(found); return; }
    try {
      await saveLocalRecord(record, Object.fromEntries(photos.map(entry => [entry.meta.id, entry.blobs])));
      for (const entry of photos) URL.revokeObjectURL(entry.previewUrl);
      setForm(emptyForm);
      setPhotos([]);
      setOwnWork(false);
      setAllowPublic(false);
      setNotice('已保存到本机浏览器。它不会自动上传，导出后你才能交给站长审核。');
      await refresh();
    } catch (error) {
      setErrors([error instanceof Error ? error.message : String(error)]);
    }
  }

  async function exportAll() {
    if (!records.length) { setNotice('还没有可导出的记录。'); return; }
    setBusy('正在打包…');
    try {
      const pack = await buildExportPackage(records);
      const url = URL.createObjectURL(new Blob([pack.bytes as unknown as BlobPart], { type: 'application/zip' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = pack.name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setNotice(`已导出 ${pack.recordCount} 条记录、${pack.photoCount} 张照片（${formatBytes(pack.bytes.length)}）。`);
    } catch (error) {
      setErrors([error instanceof Error ? error.message : String(error)]);
    } finally { setBusy(''); }
  }

  async function importPackage(file: File | undefined) {
    if (!file) return;
    setBusy('正在读取记录包…');
    setErrors([]);
    try {
      const result = await readExportPackage(new Uint8Array(await file.arrayBuffer()));
      // Read the store rather than component state: a delete or another import may have
      // landed since the last render.
      const existing = new Set((await listLocalRecords()).map(entry => entry.record.id));
      let added = 0;
      for (const entry of result.records) {
        if (existing.has(entry.record.id)) continue;
        await saveLocalRecord(entry.record, entry.photos);
        added += 1;
      }
      setNotice(`导入完成：新增 ${added} 条，跳过重复 ${result.records.length - added} 条${result.skipped.length ? `，无效 ${result.skipped.length} 条` : ''}${result.warnings.length ? `，提示 ${result.warnings.length} 条` : ''}。`);
      if (result.skipped.length) setErrors(result.skipped.slice(0, 5));
      await refresh();
    } catch (error) {
      setErrors([error instanceof Error ? error.message : String(error)]);
    } finally {
      setBusy('');
      if (importInput.current) importInput.current.value = '';
    }
  }

  return (
    <div className="vr-shell">
      <header className="vr-header">
        <a className="vr-back" href="../">← 返回手卷舆图</a>
        <h1>访客实地记录</h1>
        <p className="vr-lead">
          你去过的博物馆、你拍下的照片，都可以记在这里。当前版本<strong>不做上传</strong>：内容只保存在你自己的浏览器里，
          导出后交给站长审核，通过后才会出现在下方“已发布”栏目。
        </p>
        <p className="vr-note">
          访客记录是<strong>线索</strong>，不是馆方著录：展示时一律标注「{VISITOR_LABEL}」。若与馆方资料冲突，以馆方为准。
        </p>
      </header>

      <main>
        <section className="vr-card" aria-labelledby="vr-new">
          <h2 id="vr-new">1 · 新增一条记录</h2>
          <div className="vr-grid">
            <label>博物馆名称 <span aria-hidden="true">*</span>
              <input value={form.museumName} maxLength={60} placeholder="例：荆州博物馆" onChange={event => setForm({ ...form, museumName: event.target.value })} />
            </label>
            <label>省份 / 自治区 / 特别行政区 <span aria-hidden="true">*</span>
              <select value={form.province} onChange={event => setForm({ ...form, province: event.target.value })}>
                {VISITOR_PROVINCES.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>
            <label>城市 <span aria-hidden="true">*</span>
              <input value={form.city} maxLength={30} placeholder="例：荆州" onChange={event => setForm({ ...form, city: event.target.value })} />
            </label>
            <label>参观时间（可只填年月）
              <input type="month" value={form.visitedAt} onChange={event => setForm({ ...form, visitedAt: event.target.value })} />
            </label>
          </div>
          <label className="vr-block">文字说明（可选，500 字以内）
            <textarea value={form.note} maxLength={500} rows={4} placeholder="拍了什么、当时在哪个展厅、有什么想补充的……" onChange={event => setForm({ ...form, note: event.target.value })} />
          </label>

          <div className="vr-block">
            <div className="vr-row">
              <span>照片（最多 {MAX_PHOTOS_PER_RECORD} 张，自动压缩并去除 EXIF/GPS）</span>
              <input ref={fileInput} type="file" accept="image/*" multiple onChange={event => void addFiles(event.target.files)} />
            </div>
            {photos.length > 0 && (
              <ul className="vr-thumbs">
                {photos.map(entry => (
                  <li key={entry.meta.id}>
                    <img src={entry.previewUrl} alt={entry.meta.sourceName} />
                    <span>{entry.meta.width}×{entry.meta.height} · {formatBytes(entry.meta.bytes)}</span>
                    <button type="button" onClick={() => setPhotos(previous => { const target = previous.find(item => item.meta.id === entry.meta.id); if (target) URL.revokeObjectURL(target.previewUrl); return previous.filter(item => item.meta.id !== entry.meta.id); })}>移除</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <fieldset className="vr-consent">
            <legend>发布前请确认</legend>
            <label><input type="checkbox" checked={ownWork} onChange={event => setOwnWork(event.target.checked)} /> 这些照片是我本人拍摄，我拥有版权，且拍摄时馆方允许拍摄</label>
            <label><input type="checkbox" checked={allowPublic} onChange={event => setAllowPublic(event.target.checked)} /> 我同意经站长审核后在本站公开展示（署名以投稿人署名为准）</label>
          </fieldset>

          <div className="vr-actions">
            <button type="button" className="vr-primary" disabled={Boolean(busy)} onClick={() => void save()}>保存到本机</button>
            <span className="vr-hint">保存后仍可导出、也可随时删除。</span>
          </div>
        </section>

        <section className="vr-card" aria-labelledby="vr-mine">
          <h2 id="vr-mine">2 · 我的记录（只在本机）</h2>
          <p className="vr-meta">
            共 {totals.records} 条 · {totals.photos} 张照片 · 原图合计 {formatBytes(totals.bytes)}
            {usage && <> · 本站占用 {formatBytes(usage.usage)} / 可用 {formatBytes(usage.quota)}</>}
          </p>
          <div className="vr-actions">
            <button type="button" onClick={() => void exportAll()} disabled={Boolean(busy) || !records.length}>导出记录包（ZIP）</button>
            <label className="vr-file">导入记录包
              <input ref={importInput} type="file" accept="application/zip,.zip" onChange={event => void importPackage(event.target.files?.[0])} />
            </label>
            <button type="button" disabled={Boolean(busy) || !records.length} onClick={() => { void (async () => { await clearLocalRecords(); setNotice('已清空本机记录。'); await refresh(); })(); }}>清空全部</button>
          </div>
          {records.length === 0
            ? <p className="vr-empty">还没有记录。上面填一条试试——照片不会离开这台设备。</p>
            : (
              <ul className="vr-list">
                {records.map(entry => (
                  <li key={entry.record.id}>
                    <div className="vr-list-head">
                      <strong>{entry.record.museumName}</strong>
                      <span>{entry.record.province} · {entry.record.city}{entry.record.visitedAt ? ` · ${entry.record.visitedAt}` : ''}</span>
                      <button type="button" onClick={() => { void (async () => { await deleteLocalRecord(entry.record.id); await refresh(); })(); }}>删除</button>
                    </div>
                    {entry.record.note && <p>{entry.record.note}</p>}
                    <ul className="vr-thumbs small">
                      {entry.record.photos.map(meta => (
                        <li key={meta.id}>
                          {previewUrls[meta.id] ? <img src={previewUrls[meta.id]} alt={meta.sourceName} /> : <span className="vr-missing">缩略图缺失</span>}
                          <span>{formatBytes(meta.bytes)}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
        </section>

        <section className="vr-card" aria-labelledby="vr-published" data-visitor-published>
          <h2 id="vr-published">3 · 已发布的访客记录</h2>
          <p className="vr-meta">审核通过后由站长收录；每条都标注「{VISITOR_LABEL}」。</p>
          {published.records.length === 0
            ? <p className="vr-empty">目前还没有已发布的访客记录。你导出的记录包可以交给站长，审核通过后会出现在这里。</p>
            : (
              <ul className="vr-published">
                {published.records.map(record => (
                  <li key={record.id}>
                    <div className="vr-tag">{VISITOR_LABEL}</div>
                    <strong>{record.museumName}</strong>
                    <span className="vr-meta">{record.province} · {record.city}{record.visitedAt ? ` · ${record.visitedAt}` : ''} · 投稿人 {record.contributor} · 审核于 {record.reviewedAt.slice(0, 10)}</span>
                    {record.note && <p>{record.note}</p>}
                    <ul className="vr-thumbs small">
                      {record.photos.map(photo => (
                        <li key={photo.src}>
                          <img src={photo.src} alt={photo.caption ?? `${record.museumName} 访客照片`} loading="lazy" />
                        </li>
                      ))}
                    </ul>
                    <p className="vr-review">审核备注：{record.reviewerNote}</p>
                  </li>
                ))}
              </ul>
            )}
        </section>
      </main>

      {busy && <div className="vr-toast" role="status">{busy}</div>}
      {notice && <div className="vr-toast ok" role="status">{notice}</div>}
      {errors.length > 0 && (
        <div className="vr-toast error" role="alert">
          <ul>{errors.map(message => <li key={message}>{message}</li>)}</ul>
        </div>
      )}

      <footer className="vr-footer">
        <p>本页把记录存在你的浏览器（IndexedDB）里：不登录、不上传、不追踪。清空浏览器数据会一并删除，请及时导出。</p>
        <p>照片在进入本页时已由浏览器重新编码，EXIF 中的拍摄地点与设备信息不会保留。</p>
      </footer>
    </div>
  );
}
