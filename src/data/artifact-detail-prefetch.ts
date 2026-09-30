import { loadArtifactImageInfo } from './image-provenance-loader';
import qingmingTiles from './qingming-tiles.json';

const warmedImages = new Set<string>();

function preloadDetailImage(image: Awaited<ReturnType<typeof loadArtifactImageInfo>>['delivery']) {
  if (!image || typeof document === 'undefined') return;
  // The reading desk displays independently cropped pixels; never warm its 3 MB monolith.
  if (image.src === qingmingTiles.source) {
    const first = qingmingTiles.tiles[0].webp.src;
    if (warmedImages.has(first)) return;
    warmedImages.add(first);
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = first;
    link.setAttribute('fetchpriority', 'high');
    link.dataset.artifactDetailPreload = first;
    document.head.append(link);
    return;
  }
  const candidates = image.responsive?.candidates ?? [];
  const srcSet = candidates.map(candidate => `${candidate.src} ${candidate.width}w`).join(', ');
  const key = `${image.src}|${srcSet}`;
  if (warmedImages.has(key)) return;
  warmedImages.add(key);

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = image.src;
  link.setAttribute('fetchpriority', 'high');
  if (srcSet) {
    link.setAttribute('imagesrcset', srcSet);
    link.setAttribute('imagesizes', '(max-width: 767px) 100vw, min(80vw, 1120px)');
  }
  link.dataset.artifactDetailPreload = key;
  document.head.append(link);
}

/** Reuses the audited museum payload cache, then lets the browser choose the exact detail candidate. */
export function warmArtifactDetailImage(museumId: string, artifactId: string): Promise<void> {
  return loadArtifactImageInfo(museumId, artifactId).then(({ delivery }) => preloadDetailImage(delivery));
}
