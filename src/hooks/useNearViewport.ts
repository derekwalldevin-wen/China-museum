import { useEffect, useRef, useState } from 'react';

export const ARTIFACT_IMAGE_ROOT_MARGIN = '160px 0px';

/** Keeps layout mounted while delaying network-bearing image markup until it is near its scroll viewport. */
export function useNearViewport(enabled: boolean) {
  const targetRef = useRef<HTMLSpanElement>(null);
  const [nearViewport, setNearViewport] = useState(
    () => !enabled || typeof IntersectionObserver === 'undefined',
  );

  useEffect(() => {
    if (!enabled || nearViewport) return;
    const target = targetRef.current;
    if (!target || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const root = target.closest<HTMLElement>('[data-artifact-scroll-root]');
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      setNearViewport(true);
      observer.disconnect();
    }, { root, rootMargin: ARTIFACT_IMAGE_ROOT_MARGIN, threshold: 0 });
    observer.observe(target);
    return () => observer.disconnect();
  }, [enabled, nearViewport]);

  return { targetRef, shouldLoad: !enabled || nearViewport };
}
