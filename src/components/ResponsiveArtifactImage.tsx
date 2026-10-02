import { useState } from 'react';
import type { ImgHTMLAttributes, SyntheticEvent } from 'react';
import type { DisplayArtifactImage } from '../data/images';
import { useNearViewport } from '../hooks/useNearViewport';

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet'> & {
  image: DisplayArtifactImage;
  sizes: string;
  deferUntilNearViewport?: boolean;
  revealAfterDecode?: boolean;
  onReady?: (image: HTMLImageElement) => void;
};

/** Browser-native format selection with a same-image JPEG/PNG retry before semantic fallback. */
export default function ResponsiveArtifactImage({ image, sizes, deferUntilNearViewport = false, revealAfterDecode = false, onReady, onError, onLoad, className, ...props }: Props) {
  const { targetRef, shouldLoad } = useNearViewport(deferUntilNearViewport);
  const candidates = image.responsive?.candidates ?? [];
  const key = `${image.src}|${candidates.map(candidate => `${candidate.src}:${candidate.width}`).join(',')}`;
  const [bypass, setBypass] = useState<{ key: string; active: boolean }>({ key, active: false });
  const [decoded, setDecoded] = useState<{ key: string; ready: boolean }>({ key, ready: false });
  const bypassResponsive = bypass.key === key && bypass.active;
  const decodedReady = decoded.key === key && decoded.ready;
  const srcSet = candidates.map(candidate => `${candidate.src} ${candidate.width}w`).join(', ');

  const handleError = (event: SyntheticEvent<HTMLImageElement>) => {
    if (srcSet && !bypassResponsive) {
      setBypass({ key, active: true });
      return;
    }
    onError?.(event);
  };

  const handleLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    onLoad?.(event);
    if (!revealAfterDecode && !onReady) return;
    const element = event.currentTarget;
    Promise.resolve(typeof element.decode === 'function' ? element.decode() : undefined)
      .catch(() => undefined)
      .then(() => {
        setDecoded({ key, ready: true });
        onReady?.(element);
      });
  };

  if (!shouldLoad) {
    return (
      <span
        ref={targetRef}
        aria-hidden="true"
        className="relative block h-full w-full"
        data-artifact-image-state="deferred"
        data-original-src={image.src}
      />
    );
  }

  return (
    <picture className="contents" data-artifact-image-state="loaded" data-responsive-image={srcSet ? 'webp' : 'original'}>
      {srcSet && !bypassResponsive && <source type="image/webp" srcSet={srcSet} sizes={sizes} />}
      <img
        {...props}
        src={image.src}
        sizes={sizes}
        onError={handleError}
        onLoad={handleLoad}
        fetchPriority={props.fetchPriority ?? (revealAfterDecode ? 'high' : undefined)}
        className={`${className ?? ''} ${revealAfterDecode ? `transition-opacity duration-500 ease-out ${decodedReady ? 'opacity-100' : 'opacity-0'}` : ''}`}
        data-original-src={image.src}
        data-responsive-bypassed={bypassResponsive || undefined}
        data-artifact-image-ready={decodedReady ? 'true' : undefined}
      />
    </picture>
  );
}
