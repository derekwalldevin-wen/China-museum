import cardManifestJson from './image-card-manifest.json';
import type { DisplayArtifactImage, ResolvedCardImage } from './image-types';

export type {
  AiProvenance,
  ArtifactImageFit,
  ArtifactImageInfo,
  ArtifactImageKind,
  ArtifactImageReview,
  ArtifactImageRole,
  ArtifactImageVariant,
  AuthorizationStatus,
  DisplayArtifactImage,
  ResolvedArtifactImage,
  ResolvedCardImage,
  ResolvedImage,
  ResponsiveImageCandidate,
  ResponsiveImageDelivery,
  ReviewState,
  SourceProvenance,
  SourceReference,
} from './image-types';
export { getArtifactImageLabel, resolveArtifactImageInfo } from './image-types';

interface CardManifestEntry {
  image: (DisplayArtifactImage & { fallback?: DisplayArtifactImage }) | null;
  hold: boolean;
}

const cardManifest = cardManifestJson as Record<string, CardManifestEntry>;

export function getArtifactCardEntry(id: string): CardManifestEntry | null {
  return cardManifest[id] ?? null;
}

export function resolveArtifactCardImage(id: string): ResolvedCardImage | null {
  const image = getArtifactCardEntry(id)?.image;
  return image ? { ...image, role: 'card' } : null;
}

export function isArtifactImageOnHold(id: string): boolean {
  return getArtifactCardEntry(id)?.hold ?? false;
}
