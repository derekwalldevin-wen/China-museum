import { useCallback, useMemo, useState } from 'react';
import type { DisplayArtifactImage, ResolvedImage } from '../data/images';

type LoadStage = 'primary' | 'fallback' | 'failed';

/** Tries a V2 role image, then its legacy source, before allowing a line-art fallback. */
export function useResolvedArtifactImage<T extends DisplayArtifactImage>(image: ResolvedImage<T> | null) {
  const key = `${image?.src ?? ''}|${image?.fallback?.src ?? ''}`;
  const [load, setLoad] = useState<{ key: string; stage: LoadStage }>({ key, stage: 'primary' });

  const stage = load.key === key ? load.stage : 'primary';
  const activeImage = useMemo(() => {
    if (!image) return null;
    return stage === 'fallback' && image.fallback ? image.fallback : image;
  }, [image, stage]);

  const onError = useCallback(() => {
    setLoad((current) => {
      const currentStage = current.key === key ? current.stage : 'primary';
      if (currentStage === 'primary' && image?.fallback) return { key, stage: 'fallback' };
      return { key, stage: 'failed' };
    });
  }, [image, key]);

  return {
    activeImage,
    failed: stage === 'failed',
    usingLegacyFallback: stage === 'fallback',
    onError,
  };
}
