import { useCallback, useEffect, useState } from 'react';
import './visitor.css';

/**
 * Moderation desk. Not linked from the public pages (robots: noindex) and gated by the
 * ADMIN_TOKEN Pages secret; photos are fetched with the token in a header, never in a URL.
 */
interface PendingRecord {
  id: string;
  createdAt: string;
  museumName: string;
  province: string;
  city: string;
  visitedAt: string | null;
  note: string | null;
  contributor: string;
  status: string;
  reviewNote: string | null;
  photos: { id: string; url: string; sha256: string; bytes: number }[];
}
interface PendingPhoto { id: string; url: string; bytes: number }

const TOKEN_KEY = 'huaxia-visitor-admin-token';

export default function ReviewApp() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) ?? '');
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [records, setRecords] = useState<PendingRecord[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadPhotos = useCallback(async (items: PendingRecord[], currentToken: string) => {
    const created: Record<string, string> = {};
    for (const record of items) {
      for (const photo of record.photos as PendingPhoto[]) {
        try {
          const response = await fetch(photo.url, { headers: { 'x-admin-token': currentToken } });
          if (response.ok) created[photo.id] = URL.createObjectURL(await response.blob());
        } catch { /* ignore a single failed thumbnail */ }
      }
    }
    setPhotos(previous => { for (const url of Object.values(previous)) URL.revokeObjectURL(url); return created; });
  }, []);

  const load = useCallback(async (currentToken: string, wanted: string) => {
    if (!currentToken) { setError('请先填写审核令牌'); return; }
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/visitor/review', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-admin-token': currentToken, 'x-review-status': wanted },
        body: JSON.stringify({ action: 'list' }),
      });
      if (response.status === 401) { setError('令牌不正确'); setRecords([]); return; }
      const payload = await response.json() as { records?: PendingRecord[]; error?: string };
      if (!response.ok) { setError(payload.error ?? '读取失败'); return; }
      const items = payload.records ?? [];
      setRecords(items);
      sessionStorage.setItem(TOKEN_KEY, currentToken);
      setMessage(`读取到 ${items.length} 条${wanted === 'pending' ? '待审' : wanted === 'approved' ? '已通过' : '已驳回'}记录`);
      await loadPhotos(items, currentToken);
    } catch (caught) {
      setError(`读取失败：${caught instanceof Error ? caught.message : String(caught)}`);
    } finally { setLoading(false); }
  }, [loadPhotos]);

  useEffect(() => { if (token) void load(token, status); /* first visit with a stored token */ }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function decide(id: string, action: 'approve' | 'reject') {
    const note = notes[id] ?? '';
    if (action === 'reject' && !note.trim()) { setError('驳回必须填写理由'); return; }
    setError('');
    try {
      const response = await fetch('/api/visitor/review', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ action, id, note: note.trim() || '审核通过' }),
      });
      const payload = await response.json() as { status?: string; error?: string };
      if (!response.ok) { setError(payload.error ?? '操作失败'); return; }
      setMessage(`已${action === 'approve' ? '通过' : '驳回'}：${id.slice(0, 8)}`);
      await load(token, status);
    } catch (caught) {
      setError(`操作失败：${caught instanceof Error ? caught.message : String(caught)}`);
    }
  }

  return (
    <div className="vr-shell">
      <header className="vr-header">
        <a className="vr-back" href="../">← 返回访客记录页</a>
        <h1>访客投稿审核</h1>
        <p className="vr-lead">
          这里只做人工审核：通过后记录会出现在访客页的“已发布”栏目，并一律标注「访客投稿 · 未经馆方核验」。
          请先确认照片为本人拍摄、拍摄时馆方允许，且画面中人物已获同意。
        </p>
      </header>

      <main>
        <section className="vr-card">
          <h2>1 · 审核令牌</h2>
          <div className="vr-grid">
            <label>ADMIN_TOKEN
              <input type="password" value={token} placeholder="由 wrangler pages secret put ADMIN_TOKEN 设置" onChange={event => setToken(event.target.value)} />
            </label>
            <label>查看状态
              <select value={status} onChange={event => { const next = event.target.value as typeof status; setStatus(next); void load(token, next); }}>
                <option value="pending">待审核</option>
                <option value="approved">已通过</option>
                <option value="rejected">已驳回</option>
              </select>
            </label>
          </div>
          <div className="vr-actions">
            <button type="button" className="vr-primary" disabled={loading} onClick={() => void load(token, status)}>读取列表</button>
            <button type="button" onClick={() => { sessionStorage.removeItem(TOKEN_KEY); setToken(''); setRecords([]); setMessage(''); }}>清除本机令牌</button>
            <span className="vr-hint">令牌只存在本机 sessionStorage，不写入仓库。</span>
          </div>
        </section>

        <section className="vr-card">
          <h2>2 · 待处理（{records.length}）</h2>
          {records.length === 0 && <p className="vr-empty">没有记录。填入令牌后点“读取列表”。</p>}
          <ul className="vr-list">
            {records.map(record => (
              <li key={record.id}>
                <div className="vr-list-head">
                  <strong>{record.museumName}</strong>
                  <span>{record.province} · {record.city}{record.visitedAt ? ` · ${record.visitedAt}` : ''} · 投稿人 {record.contributor} · {record.createdAt.slice(0, 16).replace('T', ' ')}</span>
                </div>
                {record.note && <p>{record.note}</p>}
                <ul className="vr-thumbs">
                  {record.photos.map(photo => (
                    <li key={photo.id}>
                      {photos[photo.id] ? <img src={photos[photo.id]} alt={`${record.museumName} 投稿照片`} /> : <span className="vr-missing">加载中…</span>}
                      <span>{Math.round(photo.bytes / 1024)} KB</span>
                    </li>
                  ))}
                </ul>
                <p className="vr-meta">照片校验值：{record.photos.map(photo => photo.sha256.slice(0, 12)).join('、')}</p>
                <label className="vr-block">审核备注（驳回时必填）
                  <textarea rows={2} value={notes[record.id] ?? ''} onChange={event => setNotes({ ...notes, [record.id]: event.target.value })} placeholder="例：已核对本人拍摄声明与馆方拍摄许可；画面无人物。" />
                </label>
                <div className="vr-actions">
                  <button type="button" className="vr-primary" onClick={() => void decide(record.id, 'approve')}>通过并发布</button>
                  <button type="button" onClick={() => void decide(record.id, 'reject')}>驳回</button>
                  <span className="vr-meta">编号 {record.id.slice(0, 8)}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>

      {message && <div className="vr-toast ok" role="status">{message}</div>}
      {error && <div className="vr-toast error" role="alert">{error}</div>}

      <footer className="vr-footer">
        <p>令牌与审核操作都不会写入前端包：页面只通过请求头发送令牌，照片也用请求头鉴权后转成本机 blob 显示。</p>
      </footer>
    </div>
  );
}
