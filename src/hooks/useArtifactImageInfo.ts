import { useCallback, useEffect, useState } from 'react';
import { loadArtifactImageInfo } from '../data/image-provenance-loader';
import type { LoadedArtifactImageInfo } from '../data/image-provenance-loader';

type LoadState =
  | { key: string; status: 'loading' }
  | ({ key: string; status: 'ready' } & LoadedArtifactImageInfo)
  | { key: string; status: 'failed' };

export function useArtifactImageInfo(museumId: string, artifactId: string) {
  const [attempt, setAttempt] = useState(0);
  const key = `${museumId}:${artifactId}:${attempt}`;
  const [load, setLoad] = useState<LoadState>({ key, status: 'loading' });
  const current: LoadState = load.key === key ? load : { key, status: 'loading' };

  useEffect(() => {
    let active = true;
    loadArtifactImageInfo(museumId, artifactId).then(
      value => { if (active) setLoad({ key, status: 'ready', ...value }); },
      () => { if (active) setLoad({ key, status: 'failed' }); },
    );
    return () => { active = false; };
  }, [artifactId, key, museumId]);

  const retry = useCallback(() => setAttempt(value => value + 1), []);
  return { ...current, retry };
}
