import { artifactMuseumIndex, museumIndexById } from './museum-index';
import type { DisplayArtifactImage } from './image-types';

export interface CardManifestEntry {
  image: (DisplayArtifactImage & { fallback?: DisplayArtifactImage }) | null;
  hold: boolean;
}
type CardPayload = { museumId: string; records: Record<string, CardManifestEntry> };
const entries = new Map<string, CardManifestEntry>();
const requests = new Map<string, Promise<void>>();
const statuses = new Map<string, 'loading' | 'ready' | 'failed'>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(listener => listener());
export const subscribeCardImages = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
export const getCachedCardEntry = (id: string) => entries.get(id) ?? null;
export const getCardImageStatus = (id: string) => {
  const museum = artifactMuseumIndex.get(id);
  return museum ? statuses.get(museum.id) ?? 'idle' : 'failed';
};

export function loadMuseumCardImages(museumId: string): Promise<void> {
  const museum = museumIndexById.get(museumId);
  if (!museum) return Promise.reject(new Error(`Unknown museum: ${museumId}`));
  const cached = requests.get(museumId);
  if (cached) return cached;
  statuses.set(museumId, 'loading');
  const request = fetch(new URL(`data/image-cards/${museumId}.json`, document.baseURI), { cache: 'no-cache', headers: { Accept: 'application/json' } })
    .then(async response => {
      if (!response.ok) throw new Error(`Card metadata HTTP ${response.status}`);
      const payload = await response.json() as CardPayload;
      if (payload.museumId !== museumId || !payload.records || typeof payload.records !== 'object') throw new Error('Invalid card metadata');
      const expected = new Set(museum.artifacts.map(artifact => artifact.id));
      if (Object.keys(payload.records).length !== expected.size) throw new Error('Incomplete card metadata');
      for (const [id, entry] of Object.entries(payload.records)) {
        if (!expected.has(id) || !entry || typeof entry.hold !== 'boolean' || !('image' in entry)) throw new Error('Mismatched card metadata');
        if (entry.image && (!entry.image.src?.startsWith('/') || !['ai', 'source'].includes(entry.image.kind))) throw new Error('Invalid card image');
      }
      for (const [id, entry] of Object.entries(payload.records)) entries.set(id, entry);
      statuses.set(museumId, 'ready');
    })
    .catch(error => { requests.delete(museumId); statuses.set(museumId, 'failed'); throw error; })
    .finally(notify);
  requests.set(museumId, request);
  notify();
  return request;
}

export function loadArtifactCardImages(id: string) {
  const museum = artifactMuseumIndex.get(id);
  return museum ? loadMuseumCardImages(museum.id) : Promise.reject(new Error(`Unknown artifact: ${id}`));
}
