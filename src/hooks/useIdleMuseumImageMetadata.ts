import { useEffect, type RefObject } from 'react';
import { loadMuseumImagePayload } from '../data/image-provenance-loader';
import { getIdleProvenanceWarmDecision } from '../data/provenance-warm-policy';

type IdleWindow = Window & typeof globalThis & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  cancelIdleCallback?: (handle: number) => void;
};

function mark(name: string) {
  try { performance.mark(name); } catch { /* Diagnostics must never affect reading. */ }
}

function firstCardsAreSettled(root: HTMLElement): boolean {
  const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-artifact-card]')).slice(0, 2);
  if (cards.length < 2) return false;
  return cards.every(card => {
    if (card.querySelector('[data-artifact-image-state="deferred"]')) return false;
    const image = card.querySelector<HTMLImageElement>('img');
    return !image || (image.complete && image.naturalWidth > 0);
  });
}

/**
 * Warms only the current museum's small provenance JSON after the first two cards
 * are visibly ready. Detail images remain exclusively behind explicit user intent.
 */
export function useIdleMuseumImageMetadata(museumId: string, rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const idleWindow = window as IdleWindow;
    let cancelled = false;
    let scheduled = false;
    let idleHandle: number | null = null;
    let fallbackHandle: number | null = null;

    const cancelIdle = () => {
      if (idleHandle !== null) idleWindow.cancelIdleCallback?.(idleHandle);
      if (fallbackHandle !== null) window.clearTimeout(fallbackHandle);
      idleHandle = null;
      fallbackHandle = null;
    };

    const runWarm = () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      mark(`huaxia:provenance:${museumId}:started`);
      void loadMuseumImagePayload(museumId).then(
        () => mark(`huaxia:provenance:${museumId}:ready`),
        () => mark(`huaxia:provenance:${museumId}:failed`),
      );
    };

    const schedule = async () => {
      if (scheduled || cancelled || !firstCardsAreSettled(root)) return;
      scheduled = true;
      const decision = await getIdleProvenanceWarmDecision();
      if (cancelled) return;
      if (!decision.allowed) {
        mark(`huaxia:provenance:${museumId}:blocked:${decision.reason ?? 'unknown'}`);
        return;
      }
      mark(`huaxia:provenance:${museumId}:scheduled`);
      if (idleWindow.requestIdleCallback) {
        idleHandle = idleWindow.requestIdleCallback(runWarm, { timeout: 1500 });
      } else {
        fallbackHandle = window.setTimeout(runWarm, 350);
      }
    };

    const onAssetSettled = () => { void schedule(); };
    root.addEventListener('load', onAssetSettled, true);
    root.addEventListener('error', onAssetSettled, true);
    const observer = new MutationObserver(onAssetSettled);
    observer.observe(root, { childList: true, subtree: true });
    void schedule();

    return () => {
      cancelled = true;
      cancelIdle();
      observer.disconnect();
      root.removeEventListener('load', onAssetSettled, true);
      root.removeEventListener('error', onAssetSettled, true);
    };
  }, [museumId, rootRef]);
}
