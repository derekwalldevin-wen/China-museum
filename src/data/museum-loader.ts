import type { Museum } from './types';
import { museumIndexById } from './museum-index';
import artifactSearchUrl from './artifact-search.json?url';

type MuseumModule = { default: Museum };
const modules = import.meta.glob<MuseumModule>('./museum-payloads/*.json');
const cache = new Map<string, Promise<Museum>>();
let searchCorpusRequest: Promise<Record<string, string>> | null = null;

export function loadMuseumPayload(id: string): Promise<Museum> {
  if (!museumIndexById.has(id)) return Promise.reject(new Error(`Unknown museum: ${id}`));
  const existing = cache.get(id);
  if (existing) return existing;
  const loader = modules[`./museum-payloads/${id}.json`];
  if (!loader) return Promise.reject(new Error(`Missing museum payload: ${id}`));
  const request = loader().then(module => {
    if (module.default.id !== id) throw new Error(`Museum payload mismatch: ${id}`);
    return module.default;
  }).catch(error => {
    cache.delete(id);
    throw error;
  });
  cache.set(id, request);
  return request;
}

export function warmMuseumPayload(id: string) {
  void loadMuseumPayload(id).catch(() => { /* The visible museum data layer owns retry. */ });
}

export function loadArtifactSearchCorpus() {
  if (!searchCorpusRequest) {
    searchCorpusRequest = fetch(artifactSearchUrl, { cache:'force-cache' })
      .then(response => {
        if (!response.ok) throw new Error(`Search corpus HTTP ${response.status}`);
        return response.json() as Promise<Record<string, string>>;
      })
      .catch(error => {
        searchCorpusRequest = null;
        throw error;
      });
  }
  return searchCorpusRequest;
}
