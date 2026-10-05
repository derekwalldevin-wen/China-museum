import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { getCachedCardEntry, getCardImageStatus, loadArtifactCardImages, subscribeCardImages } from '../data/image-card-loader';

export function useArtifactCardEntry(id: string, enabled = true) {
  const [attempt, setAttempt] = useState(0);
  const entry = useSyncExternalStore(subscribeCardImages, () => getCachedCardEntry(id), () => null);
  const status = useSyncExternalStore(subscribeCardImages, () => getCardImageStatus(id), () => 'idle');
  useEffect(() => {
    if (enabled) void loadArtifactCardImages(id).catch(() => { /* Visible retry keeps the current page. */ });
  }, [id, enabled, attempt]);
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  return { entry, status, retry };
}
