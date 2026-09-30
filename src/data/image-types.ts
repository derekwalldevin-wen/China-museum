export type ArtifactImageKind = 'source' | 'ai';
export type ArtifactImageRole = 'card' | 'detail';
export type ArtifactImageFit = 'cover' | 'contain';
export type ReviewState = 'pending' | 'approved' | 'rejected';
export type AuthorizationStatus = 'pending' | 'verified' | 'restricted' | 'unknown';

export interface SourceReference {
  type: 'source-page' | 'local-archive' | 'museum-record';
  value: string;
  credit?: string;
}

export interface SourceProvenance {
  type: 'source';
  sourceUrl?: string;
  author?: string;
  institution?: string;
  license?: string;
  licenseUrl?: string;
  verifiedAt?: string;
  linkCheckedAt?: string;
  authorizationStatus?: AuthorizationStatus;
  assetMatchStatus?: 'pending' | 'verified' | 'mismatch';
  sourceTitle?: string;
  evidenceNote?: string;
  assetSha256?: string;
  modifications?: string;
  fullResolutionSourceUrl?: string;
  originalSourceUrl?: string;
  originalSha1?: string;
  originalSha256?: string;
  processingManifest?: string;
}

export interface ResponsiveImageCandidate {
  src: string;
  width: number;
  height: number;
}

export interface ResponsiveImageDelivery {
  format: 'image/webp';
  candidates: ResponsiveImageCandidate[];
}

export interface AiProvenance {
  type: 'ai';
  generator: string;
  promptVersion: string;
  promptManifest: string;
  generatedAt: string;
  references: SourceReference[];
}

export interface ArtifactImageReview {
  visual: ReviewState;
  historical: ReviewState;
  reviewedAt?: string;
  reviewedBy?: string;
  note?: string;
}

export interface DisplayArtifactImage {
  src: string;
  kind: ArtifactImageKind;
  fit?: ArtifactImageFit;
  responsive?: ResponsiveImageDelivery;
}

export interface ArtifactImageVariant extends DisplayArtifactImage {
  credit: string;
  provenance?: SourceProvenance | AiProvenance;
  review?: ArtifactImageReview;
}

export interface ArtifactImageInfo {
  /** Legacy production image. Retained as a fallback and migration source. */
  src: string;
  credit: string;
  /** Legacy compatibility flag. New records should use variant.kind. */
  ai?: boolean;
  variants?: Partial<Record<ArtifactImageRole, ArtifactImageVariant>>;
  imageHold?: { reason: string; reviewedAt: string };
  /** A verified text record with no reusable object photograph. */
  illustrationOnly?: boolean;
  sourceReview?: { reviewedAt: string; authorityUrl?: string; note: string };
  retiredAssets?: { src: string; reason: string; retiredAt: string }[];
}

export type ResolvedImage<T extends DisplayArtifactImage = DisplayArtifactImage> = T & {
  role: ArtifactImageRole;
  fallback?: T;
};

export type ResolvedArtifactImage = ResolvedImage<ArtifactImageVariant>;
export type ResolvedCardImage = ResolvedImage<DisplayArtifactImage>;

/** Resolve a role-specific image while retaining the legacy source as a safe fallback. */
export function resolveArtifactImageInfo(info: ArtifactImageInfo | null, role: ArtifactImageRole): ResolvedArtifactImage | null {
  if (!info || info.imageHold || info.illustrationOnly) return null;

  const matchingVariant = Object.values(info.variants ?? {}).find((variant) => variant.src === info.src);
  const legacy: ArtifactImageVariant = {
    src: info.src,
    kind: info.ai ? 'ai' : 'source',
    credit: info.credit,
    provenance: matchingVariant?.provenance,
    review: matchingVariant?.review,
  };
  const allowed = (variant: ArtifactImageVariant) => variant.review?.historical !== 'rejected'
    && !info.retiredAssets?.some((asset) => asset.src === variant.src)
    && variant.review?.visual !== 'rejected'
    && !(variant.provenance?.type === 'source' && variant.provenance.authorizationStatus === 'restricted');
  const requested = info.variants?.[role] ?? legacy;
  const selected = [requested, info.variants?.card, legacy].find((variant) => variant && allowed(variant));
  if (!selected) return null;
  return {
    ...selected,
    role,
    fallback: selected.src !== legacy.src && allowed(legacy) ? legacy : undefined,
  };
}

export function getArtifactImageLabel(image: ArtifactImageVariant): string {
  if (image.kind === 'ai') return 'AI 复原示意图 · 据参考资料生成，非真品影像';
  const provenance = image.provenance?.type === 'source' ? image.provenance : undefined;
  const owner = provenance?.institution || provenance?.author;
  const license = provenance?.license;
  const details = [owner, license].filter(Boolean).join(' · ');
  const status = provenance?.authorizationStatus === 'verified' ? '来源与授权已核' : '当前文件授权待核';
  return details ? `图源 ${details} · ${status}` : `图源待补充核验 · ${image.credit}`;
}
