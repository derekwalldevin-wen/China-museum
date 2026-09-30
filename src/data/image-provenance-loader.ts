import type { ArtifactImageInfo, DisplayArtifactImage } from './image-types';

interface MuseumImagePayload {
  records: Record<string, ArtifactImageInfo>;
  delivery: Record<string, (DisplayArtifactImage & { fallback?: DisplayArtifactImage }) | null>;
}

export interface LoadedArtifactImageInfo {
  info: ArtifactImageInfo;
  delivery: (DisplayArtifactImage & { fallback?: DisplayArtifactImage }) | null;
}

const payloadCache = new Map<string, Promise<MuseumImagePayload>>();
const museumIdPattern = /^[a-z0-9-]+$/;

export function getMuseumImagePayloadUrl(museumId: string): string {
  if (!museumIdPattern.test(museumId)) throw new Error(`Invalid museum id: ${museumId}`);
  return new URL(`data/image-provenance/${museumId}.json`, document.baseURI).href;
}

export function loadMuseumImagePayload(museumId: string): Promise<MuseumImagePayload> {
  const cached = payloadCache.get(museumId);
  if (cached) return cached;
  const request = fetch(getMuseumImagePayloadUrl(museumId), { headers: { Accept: 'application/json' } })
    .then(async response => {
      if (!response.ok) throw new Error(`Image metadata request failed: ${response.status}`);
      const payload = await response.json() as unknown;
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)
        || !('records' in payload) || !('delivery' in payload)) throw new Error('Invalid image metadata payload');
      return payload as MuseumImagePayload;
    });
  payloadCache.set(museumId, request);
  request.catch(() => payloadCache.delete(museumId));
  return request;
}

export async function loadArtifactImageInfo(museumId: string, artifactId: string): Promise<LoadedArtifactImageInfo> {
  const payload = await loadMuseumImagePayload(museumId);
  const info = payload.records[artifactId];
  if (!info) throw new Error(`Missing image metadata for ${museumId}/${artifactId}`);
  return { info, delivery: payload.delivery[artifactId] ?? null };
}
