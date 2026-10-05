import { getCachedCardEntry } from './image-card-loader';
import type { ResolvedCardImage } from './image-types';

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

export function getArtifactCardEntry(id: string) {
  return getCachedCardEntry(id);
}

export function resolveArtifactCardImage(id: string): ResolvedCardImage | null {
  const image = getArtifactCardEntry(id)?.image;
  return image ? { ...image, role: 'card' } : null;
}

export function isArtifactImageOnHold(id: string): boolean {
  return getArtifactCardEntry(id)?.hold ?? false;
}
