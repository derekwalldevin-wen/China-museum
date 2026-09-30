/**
 * Local-only storage for visitor records (IndexedDB). Nothing here touches the network.
 */
import type { LocalRecord, PhotoBlobs, VisitorRecord } from './core';

const DB_NAME = 'huaxia-visitor-records';
const DB_VERSION = 1;
const STORE = 'records';

let dbPromise: Promise<IDBDatabase> | undefined;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('当前浏览器不支持本地存储（IndexedDB）')); return; }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'record.id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('打开本地数据库失败'));
  });
  return dbPromise;
}

function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(db => new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = run(transaction.objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('本地存储操作失败'));
  }));
}

export async function listLocalRecords(): Promise<LocalRecord[]> {
  const rows = await withStore<LocalRecord[]>('readonly', store => store.getAll() as IDBRequest<LocalRecord[]>);
  return rows
    .filter(row => row?.record?.id)
    .sort((left, right) => (right.record.createdAt ?? '').localeCompare(left.record.createdAt ?? ''));
}

export async function saveLocalRecord(record: VisitorRecord, photos: Record<string, PhotoBlobs>): Promise<void> {
  await withStore('readwrite', store => store.put({ record, photos }) as IDBRequest<IDBValidKey>);
}

export async function deleteLocalRecord(id: string): Promise<void> {
  await withStore('readwrite', store => store.delete(id) as IDBRequest<undefined>);
}

export async function clearLocalRecords(): Promise<void> {
  await withStore('readwrite', store => store.clear() as IDBRequest<undefined>);
}

export async function estimateUsage(): Promise<{ usage: number; quota: number } | null> {
  try {
    if (!navigator.storage?.estimate) return null;
    const { usage, quota } = await navigator.storage.estimate();
    if (typeof usage !== 'number' || typeof quota !== 'number') return null;
    return { usage, quota };
  } catch { return null; }
}
