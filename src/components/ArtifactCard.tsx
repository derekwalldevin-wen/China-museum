import { useEffect, useRef, useState } from 'react';
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  UIEvent as ReactUIEvent,
  WheelEvent as ReactWheelEvent,
} from 'react';
import type { Artifact, ArtifactIndex } from '../data/types';
import type { AiProvenance, ArtifactImageInfo, ArtifactImageVariant, DisplayArtifactImage, SourceProvenance } from '../data/images';
import { getArtifactImageLabel, isArtifactImageOnHold, resolveArtifactCardImage, resolveArtifactImageInfo } from '../data/images';
import { useArtifactImageInfo } from '../hooks/useArtifactImageInfo';
import { useResolvedArtifactImage } from '../hooks/useResolvedArtifactImage';
import ArtifactArt from './ArtifactArt';
import ResponsiveArtifactImage from './ResponsiveArtifactImage';
import qingmingTiles from '../data/qingming-tiles.json';

// ============================================================
// 统一卡牌外壳：勘测档案卡 + 博物馆展签
// 真图优先，缺失时回退到统一画风 SVG 线刻
// ============================================================

interface Props {
  artifact: Artifact | ArtifactIndex;
  index?: number;
  onClick?: () => void;
  showStory?: boolean;
  deferImage?: boolean;
  onImageIntent?: () => void;
}

export default function ArtifactCard({ artifact, index, onClick, showStory = true, deferImage = false, onImageIntent }: Props) {
  const intentTimerRef = useRef<number | null>(null);
  const resolved = resolveArtifactCardImage(artifact.id);
  const hold = isArtifactImageOnHold(artifact.id);
  const { activeImage, failed, usingLegacyFallback, onError } = useResolvedArtifactImage(resolved);
  const usePhoto = activeImage && !failed;
  const fit = activeImage?.fit ?? (artifact.shape === 'scroll' ? 'contain' : 'cover');
  const imageFit = fit === 'contain' ? 'object-contain p-4 md:p-6' : 'object-cover';

  return (
    <button
      data-artifact-card={artifact.id}
      onClick={onClick}
      onFocus={onImageIntent}
      onPointerDown={() => {
        if (intentTimerRef.current !== null) window.clearTimeout(intentTimerRef.current);
        onImageIntent?.();
      }}
      onTouchStart={onImageIntent}
      onPointerEnter={(event) => {
        if (!onImageIntent || event.pointerType === 'touch') return;
        intentTimerRef.current = window.setTimeout(onImageIntent, 120);
      }}
      onPointerLeave={() => {
        if (intentTimerRef.current !== null) window.clearTimeout(intentTimerRef.current);
        intentTimerRef.current = null;
      }}
      onPointerCancel={() => {
        if (intentTimerRef.current !== null) window.clearTimeout(intentTimerRef.current);
        intentTimerRef.current = null;
      }}
      className="group relative w-full text-left border border-[#efe6cf]/15 bg-[#12100b] hover:border-[#d43a28]/80 transition-colors duration-300">
      {/* 四角勘测标记 */}
      <CornerMarks />

      {/* 图像区：展柜聚光 */}
      <div className="relative aspect-[4/5] overflow-hidden m-2 mb-0 bg-[#0e0d0a]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_15%,#3a352a_0%,#1c1a13_45%,#0e0d0a_100%)]" />
        {usePhoto ? (
          <ResponsiveArtifactImage
            image={activeImage}
            sizes="(max-width: 767px) calc(50vw - 1.75rem), (max-width: 1279px) calc(33vw - 2rem), 280px"
            deferUntilNearViewport={deferImage}
            alt={artifact.name}
            loading={deferImage ? 'eager' : 'lazy'}
            decoding="async"
            onError={onError}
            className={`relative w-full h-full ${imageFit} opacity-95 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-500`}
          />
        ) : (
          hold ? <ImageOnHold /> : <ArtifactArt shape={artifact.shape} className="relative w-full h-full group-hover:scale-[1.03] transition-transform duration-500" />
        )}
        {usePhoto && activeImage.kind === 'ai' && (
          <div className="absolute left-2 top-2 font-mono text-[9px] text-[#efe6cf]/80 bg-[#0d0c09]/75 border border-[#efe6cf]/20 px-1.5 py-0.5 z-10">
            AI 复原示意
          </div>
        )}
        {usePhoto && usingLegacyFallback && (
          <div className="absolute right-2 top-2 font-mono text-[9px] text-[#efe6cf]/65 bg-[#0d0c09]/75 border border-[#efe6cf]/15 px-1.5 py-0.5 z-10">
            备用图
          </div>
        )}
        {/* 朱砂印章 */}
        <div className="absolute right-2 bottom-2 h-7 w-7 bg-[#d43a28] flex items-center justify-center shadow-lg">
          <span className="font-serif text-[14px] font-bold text-[#0e0d0a]">{artifact.category[0]}</span>
        </div>
      </div>

      {/* 展签 */}
      <div className="relative px-3.5 pt-3 pb-3.5 border-t border-[#efe6cf]/10 mx-2 mt-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-mono text-[9px] tracking-widest text-[#d43a28]">
            {index !== undefined ? `NO.${String(index + 1).padStart(2, '0')}` : 'RELIC'}
          </span>
          <span className="font-mono text-[9px] text-[#efe6cf]/40">{artifact.dynasty} · {artifact.category}</span>
        </div>
        <h3 className="mt-1.5 font-serif text-[17px] leading-snug text-[#efe6cf] group-hover:text-white transition-colors">
          {artifact.name}
        </h3>
        {artifact.holdingInstitution && <p className="mt-1 text-[10px] leading-relaxed text-[#e7d5ab]/80">馆藏：{artifact.holdingInstitution}<span className="block text-[#efe6cf]/50">{artifact.exhibitionNote}</span></p>}
        {showStory && 'story' in artifact && (
          <p className="mt-2 text-[12px] leading-relaxed text-[#efe6cf]/55 line-clamp-3">{artifact.story}</p>
        )}
        {!usePhoto && (
          <div className="mt-1.5 font-mono text-[9px] text-[#efe6cf]/30">{hold ? '图像核验中 · 暂缓展示' : '示意线刻 · 真品图待补'}</div>
        )}
      </div>
    </button>
  );
}

function CornerMarks() {
  const c = 'absolute w-2.5 h-2.5 border-[#efe6cf]/40 group-hover:border-[#d43a28] transition-colors z-10';
  return (<>
    <span className={`${c} left-0 top-0 border-l border-t`} />
    <span className={`${c} right-0 top-0 border-r border-t`} />
    <span className={`${c} left-0 bottom-0 border-l border-b`} />
    <span className={`${c} right-0 bottom-0 border-r border-b`} />
  </>);
}

function ImageOnHold() {
  return <div className="relative flex h-full min-h-48 w-full items-center justify-center px-6 text-center font-serif text-sm tracking-widest text-[#efe6cf]/50">图像核验中 · 暂缓展示</div>;
}

/** 展开视图及其披露使用同一加载状态，避免回退图与标签不一致。 */
export function ArtifactFigure({ museumId, artifact, className = '', preserveFrame = false }: { museumId: string; artifact: Artifact | ArtifactIndex; className?: string; preserveFrame?: boolean }) {
  const load = useArtifactImageInfo(museumId, artifact.id);
  if (load.status !== 'ready') {
    return <ArtifactFigurePending artifact={artifact} className={className} preserveFrame={preserveFrame} failed={load.status === 'failed'} retry={load.retry} />;
  }
  return <ResolvedArtifactFigure artifact={artifact} info={load.info} delivery={load.delivery} className={className} preserveFrame={preserveFrame} />;
}

function applyResponsiveDelivery(
  resolved: ReturnType<typeof resolveArtifactImageInfo>,
  delivery: (DisplayArtifactImage & { fallback?: DisplayArtifactImage }) | null,
) {
  if (!resolved || !delivery || delivery.src !== resolved.src) return resolved;
  return {
    ...resolved,
    responsive: delivery.responsive,
    fallback: resolved.fallback && delivery.fallback?.src === resolved.fallback.src
      ? { ...resolved.fallback, responsive: delivery.fallback.responsive }
      : resolved.fallback,
  };
}

function ResolvedArtifactFigure({ artifact, info, delivery, className, preserveFrame }: { artifact: Artifact | ArtifactIndex; info: ArtifactImageInfo; delivery: (DisplayArtifactImage & { fallback?: DisplayArtifactImage }) | null; className: string; preserveFrame: boolean }) {
  const resolved = applyResponsiveDelivery(resolveArtifactImageInfo(info, 'detail'), delivery);
  const hold = Boolean(info.imageHold);
  const { activeImage, failed, onError } = useResolvedArtifactImage(resolved);
  const usePhoto = activeImage && !failed;
  const fit = preserveFrame ? 'contain' : activeImage?.fit ?? 'contain';
  const label = usePhoto ? getArtifactImageLabel(activeImage) : '示意线刻 · 真品图待补';
  const imageKey = activeImage?.src ?? `${artifact.id}:fallback`;
  const [decoded, setDecoded] = useState<{ key: string; ready: boolean }>({ key: imageKey, ready: false });
  const imageReady = decoded.key === imageKey && decoded.ready;

  if (artifact.shape === 'scroll' && usePhoto && activeImage.kind !== 'ai') {
    return (<>
      <ArtifactScrollReader
        key={activeImage.src}
        image={activeImage}
        alt={artifact.name}
        label={label}
        category={artifact.category[0]}
        className={className}
        onError={onError}
      />
      <ArtifactImageDisclosure info={info} image={activeImage} />
    </>);
  }

  return (<>
    <div className={`relative overflow-hidden bg-[#0e0d0a] ${className}`} data-detail-image-state={usePhoto ? (imageReady ? 'ready' : 'decoding') : 'fallback'} aria-busy={Boolean(usePhoto && !imageReady)}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_15%,#3a352a_0%,#1c1a13_45%,#0e0d0a_100%)]" />
      {usePhoto ? (
        <ResponsiveArtifactImage image={activeImage} sizes="(max-width: 767px) 100vw, min(80vw, 1120px)" alt={artifact.name} decoding="async" loading="eager" revealAfterDecode onReady={() => setDecoded({ key: imageKey, ready: true })} onError={onError}
          className={`relative w-full h-full ${fit === 'cover' ? 'object-cover' : 'object-contain'}`} />
      ) : (
        hold ? <ImageOnHold /> : <ArtifactArt shape={artifact.shape} className="relative w-full h-full" />
      )}
      {usePhoto && !imageReady && <div className="pointer-events-none absolute inset-0 grid place-items-center bg-[#0e0d0a]/25 font-mono text-[10px] tracking-wider text-[#efe6cf]/45">正在显影…</div>}
      <div className="absolute right-3 bottom-3 h-9 w-9 bg-[#d43a28] flex items-center justify-center shadow-lg">
        <span className="font-serif text-lg font-bold text-[#0e0d0a]">{artifact.category[0]}</span>
      </div>
      <div className="absolute left-3 bottom-3 font-mono text-[9px] text-[#efe6cf]/50 bg-[#0d0c09]/70 px-1.5 py-0.5">
        {hold ? '图像核验中' : label}
      </div>
    </div>
    <ArtifactImageDisclosure info={info} image={usePhoto ? activeImage : null} />
  </>);
}

function ArtifactFigurePending({ artifact, className, preserveFrame, failed, retry }: { artifact: Artifact | ArtifactIndex; className: string; preserveFrame: boolean; failed: boolean; retry: () => void }) {
  const resolved = resolveArtifactCardImage(artifact.id);
  const hold = isArtifactImageOnHold(artifact.id);
  const { activeImage, failed: previewFailed, onError } = useResolvedArtifactImage(resolved);
  const usePhoto = activeImage && !previewFailed;
  const fit = preserveFrame ? 'contain' : activeImage?.fit ?? 'contain';
  const scrollFrame = artifact.shape === 'scroll' ? 'h-[clamp(220px,34vw,360px)]' : '';

  return (<>
    <div className={`relative overflow-hidden bg-[#0e0d0a] ${scrollFrame} ${className}`} aria-busy={!failed}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_15%,#3a352a_0%,#1c1a13_45%,#0e0d0a_100%)]" />
      {usePhoto ? (
        <ResponsiveArtifactImage image={activeImage} sizes="(max-width: 767px) 100vw, min(80vw, 1120px)" alt={artifact.name} decoding="async" onError={onError}
          className={`relative h-full w-full ${fit === 'cover' ? 'object-cover' : 'object-contain'}`} />
      ) : (
        hold ? <ImageOnHold /> : <ArtifactArt shape={artifact.shape} className="relative h-full w-full" />
      )}
      {usePhoto && activeImage.kind === 'ai' && <div className="absolute left-3 top-3 bg-[#0d0c09]/80 px-2 py-1 font-mono text-[9px] text-[#efe6cf]/75">AI 复原示意</div>}
      <div className="absolute bottom-3 left-3 bg-[#0d0c09]/80 px-2 py-1 font-mono text-[9px] text-[#efe6cf]/55">
        {failed ? '完整影像说明载入失败' : '正在核读影像说明…'}
      </div>
    </div>
    <div className={`mt-3 border px-3 py-2.5 font-mono text-[10px] leading-relaxed ${failed ? 'border-[#d43a28]/35 bg-[#d43a28]/7 text-[#efe6cf]/65' : 'border-[#efe6cf]/15 bg-[#efe6cf]/[0.025] text-[#efe6cf]/50'}`} role={failed ? 'alert' : 'status'}>
      {failed ? <>
        <div>完整来源、授权与处理记录暂未载入；当前只显示安全卡片预览，不据此补写任何来源结论。</div>
        <button type="button" onClick={retry} className="mt-2 min-h-11 border border-[#d43a28] px-3 py-2 text-[#d43a28]">重试影像资料</button>
      </> : '正在按当前博物馆载入完整来源、授权、审核与处理记录。'}
    </div>
  </>);
}

/** 详情页影像披露：明确区分 AI 示意图、来源图及其授权核验状态。 */
export function ArtifactImageDisclosure({ info, image }: { info: ArtifactImageInfo; image: ArtifactImageVariant | null }) {
  if (!image) {
    return (
      <div className="mt-3 border border-[#d43a28]/30 bg-[#d43a28]/5 px-3 py-2 font-mono text-[10px] leading-relaxed text-[#efe6cf]/55">
        {info?.imageHold ? `影像状态：图像核验中。${info.imageHold.reason} 暂缓展示原图与依赖该参考的 AI 图，文物条目保留。` : '影像状态：当前仅提供示意线刻，真品图待补。'}
        {info?.imageHold && info.sourceReview && <div className="mt-2">后续核验：{info.sourceReview.note}</div>}
        {info?.imageHold && info.sourceReview?.authorityUrl && <a href={info.sourceReview.authorityUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-[#d43a28] underline">查看替换参考资料（尚未接入） ↗</a>}
        {info?.illustrationOnly && info.sourceReview && <div className="mt-2">文字核读：{info.sourceReview.note}</div>}
        {info?.illustrationOnly && info.sourceReview?.authorityUrl && <a href={info.sourceReview.authorityUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-[#d43a28] underline">查看馆方资料（非图片授权） ↗</a>}
      </div>
    );
  }

  if (image.kind === 'ai') {
    const provenance = image.provenance?.type === 'ai' ? image.provenance as AiProvenance : undefined;
    const generator = provenance?.generator && !/unknown|待核|待补/i.test(provenance.generator)
      ? provenance.generator
      : null;
    return (
      <div className="mt-3 border border-[#d43a28]/35 bg-[#d43a28]/7 px-3 py-2.5 font-mono text-[10px] leading-relaxed text-[#efe6cf]/60">
        <div className="font-semibold tracking-wider text-[#d43a28]">AI 复原示意 · 非文物实拍</div>
        <div className="mt-1">仅辅助认识大致形态，细节可能与原物不同；不用于认读铭文、清点人物或鉴定纹饰。</div>
        <div className="mt-1">{image.credit}</div>
        {generator && <div className="mt-1 text-[#efe6cf]/40">生成记录：{generator}</div>}
        {info?.sourceReview && <div className="mt-1 text-[#d7a84a]">核验备注：{info.sourceReview.note}</div>}
        {info?.sourceReview?.authorityUrl && <a href={info.sourceReview.authorityUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-[#d43a28] underline">查看馆藏资料（非图片授权） ↗</a>}
      </div>
    );
  }

  const provenance = image.provenance?.type === 'source' ? image.provenance as SourceProvenance : undefined;
  const sourceUrl = provenance?.sourceUrl;
  const license = provenance?.license;
  const authorizationStatus = provenance?.authorizationStatus ?? 'unknown';
  const authorizationLabel = authorizationStatus === 'verified' && license
    ? license
    : authorizationStatus === 'restricted'
      ? '受限使用，请以来源页条款为准'
      : '待核验，不作为开放授权声明';
  return (
    <div className="mt-3 border border-[#efe6cf]/15 bg-[#efe6cf]/[0.025] px-3 py-2.5 font-mono text-[10px] leading-relaxed text-[#efe6cf]/60">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold tracking-wider text-[#efe6cf]/75">来源图 · 非 AI 复原</span>
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center border border-[#efe6cf]/20 px-2 py-1.5 text-[#d43a28] hover:border-[#d43a28] focus-visible:border-[#d43a28] focus-visible:outline-none"
          >查看来源页 ↗</a>
        )}
      </div>
      <div className="mt-1">{image.credit}</div>
      {provenance?.sourceTitle && <div className="mt-1">影像标题：{provenance.sourceTitle}</div>}
      {provenance?.author && <div className="mt-1">作者 / 图像提供者：{provenance.author}</div>}
      {provenance?.institution && <div className="mt-1">来源页所述机构：{provenance.institution}</div>}
      <div className={`mt-1 ${authorizationStatus === 'verified' ? 'text-[#efe6cf]/45' : 'text-[#d7a84a]'}`}>
        授权状态：{authorizationLabel}
      </div>
      {license && provenance?.licenseUrl && <a href={provenance.licenseUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-[#d43a28] underline">来源页许可：{license}{authorizationStatus === 'verified' ? '（原件与展示图证据已核）' : '（不等于当前文件授权确认）'} ↗</a>}
      {provenance?.modifications && <div className="mt-1">图像处理：{provenance.modifications}</div>}
      {provenance?.evidenceNote && <div className="mt-1">核验备注：{provenance.evidenceNote}</div>}
      {provenance?.processingManifest?.startsWith('/data/image-processing/') && <a href={provenance.processingManifest} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-[#d43a28] underline">查看原文件哈希与图像处理记录 ↗</a>}
      {info?.sourceReview?.authorityUrl && <a href={info.sourceReview.authorityUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-[#d43a28] underline">查看馆方藏品资料（非图片授权） ↗</a>}
      {provenance?.linkCheckedAt && <div className="mt-1 text-[#efe6cf]/40">来源页核读：{provenance.linkCheckedAt}</div>}
      {provenance?.fullResolutionSourceUrl && <a href={provenance.fullResolutionSourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-[#d43a28] underline">查看高清全卷候选（尚未接入本站） ↗</a>}
    </div>
  );
}

interface ArtifactScrollReaderProps {
  image: ArtifactImageVariant;
  alt: string;
  label: string;
  category: string;
  className?: string;
  onError: () => void;
}

/** 横向长卷阅卷台：保留原图比例，并提供鼠标、触控、滚轮和键盘浏览。 */
function ArtifactScrollReader({
  image,
  alt,
  label,
  category,
  className = '',
  onError,
}: ArtifactScrollReaderProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; left: number } | null>(null);
  const [isLongScroll, setIsLongScroll] = useState(image.src === qingmingTiles.source);
  const [lowResolution, setLowResolution] = useState(false);
  const [progress, setProgress] = useState(0);
  const [imageReady, setImageReady] = useState(false);
  const tiled = image.src === qingmingTiles.source;
  const [requestedTiles, setRequestedTiles] = useState<Set<number>>(() => new Set([0]));
  const [jpegTiles, setJpegTiles] = useState<Set<number>>(() => new Set());
  const [fullSourceFallback, setFullSourceFallback] = useState(false);

  const requestVisibleTiles = (element: HTMLDivElement) => {
    if (!tiled) return;
    // Give the first sharp segment the available weak-network bandwidth.
    // A deliberate pan may still request its destination before it decodes.
    if (!imageReady && element.scrollLeft === 0) return;
    const tileWidth = element.clientHeight * qingmingTiles.tiles[0].width / qingmingTiles.height;
    if (tileWidth <= 0) return;
    const start = Math.max(0, Math.floor(element.scrollLeft / tileWidth) - 1);
    const end = Math.min(qingmingTiles.tiles.length - 1, Math.floor((element.scrollLeft + element.clientWidth) / tileWidth) + 1);
    setRequestedTiles(previous => {
      if (Array.from({ length: end - start + 1 }, (_, offset) => start + offset).every(index => previous.has(index))) return previous;
      const next = new Set(previous);
      for (let index = start; index <= end; index++) next.add(index);
      return next;
    });
  };

  useEffect(() => {
    if (!tiled) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    const refresh = () => requestVisibleTiles(viewport);
    refresh();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(refresh);
    observer.observe(viewport);
    return () => observer.disconnect();
  // The tile manifest and image identity are stable for this keyed reader.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiled, imageReady]);

  const updateProgress = (element: HTMLDivElement) => {
    const range = element.scrollWidth - element.clientWidth;
    setProgress(range > 0 ? element.scrollLeft / range : 0);
  };

  const panBy = (distance: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    viewport.scrollBy({ left: distance, behavior: reducedMotion ? 'auto' : 'smooth' });
  };

  const onScroll = (event: ReactUIEvent<HTMLDivElement>) => {
    updateProgress(event.currentTarget);
    requestVisibleTiles(event.currentTarget);
  };

  const onWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (!isLongScroll || event.ctrlKey) return;
    const movement = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (movement === 0) return;
    event.preventDefault();
    event.currentTarget.scrollLeft += movement;
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!isLongScroll) return;
    const viewport = event.currentTarget;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      event.stopPropagation();
      panBy((event.key === 'ArrowLeft' ? -1 : 1) * viewport.clientWidth * 0.72);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      event.stopPropagation();
      viewport.scrollTo({
        left: event.key === 'Home' ? 0 : viewport.scrollWidth,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      });
    }
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isLongScroll || event.pointerType === 'touch') return;
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      left: event.currentTarget.scrollLeft,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.currentTarget.scrollLeft = drag.left - (event.clientX - drag.x);
  };

  const endPointerDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <figure className={`relative overflow-hidden border border-[#efe6cf]/15 bg-[#090806] ${className}`}>
      <div className="flex items-center justify-between border-b border-[#efe6cf]/12 bg-[#12100b] px-3 py-2 md:px-4">
        <div>
          <div className="font-mono text-[9px] tracking-[0.22em] text-[#d43a28]">SCROLL READING DESK</div>
          <div className="mt-0.5 font-serif text-[12px] text-[#efe6cf]/65">长卷阅览 · 顺卷徐行</div>
        </div>
          <div className={`flex items-center gap-1.5 ${isLongScroll ? '' : 'invisible'}`} aria-hidden={!isLongScroll}>
            <button
              type="button"
              aria-label="向前阅卷"
              disabled={!isLongScroll}
              onClick={() => panBy(-(viewportRef.current?.clientWidth ?? 320) * 0.72)}
              className="h-11 min-w-11 border border-[#efe6cf]/20 px-2 font-mono text-xs text-[#efe6cf]/65 transition-colors hover:border-[#d43a28] hover:text-[#d43a28] focus-visible:border-[#d43a28] focus-visible:outline-none"
            >←</button>
            <button
              type="button"
              aria-label="向后阅卷"
              disabled={!isLongScroll}
              onClick={() => panBy((viewportRef.current?.clientWidth ?? 320) * 0.72)}
              className="h-11 min-w-11 border border-[#efe6cf]/20 px-2 font-mono text-xs text-[#efe6cf]/65 transition-colors hover:border-[#d43a28] hover:text-[#d43a28] focus-visible:border-[#d43a28] focus-visible:outline-none"
            >→</button>
          </div>
      </div>

      <p className="flex h-20 items-center border-b border-[#efe6cf]/10 px-3 py-2 text-xs text-[#d7a84a] md:h-10">{lowResolution ? '当前为低清历史缩图，放大不增加细节；高清全卷尚未接入。' : '图像仅辅助阅读；来源、清晰度与授权请见下方说明。'}</p>
      <div
        ref={viewportRef}
        role="region"
        aria-label={`${alt}长卷阅卷台`}
        aria-describedby={isLongScroll ? 'scroll-reader-hint' : undefined}
        data-scroll-reader-ready={imageReady ? 'true' : 'false'}
        aria-busy={!imageReady}
        tabIndex={isLongScroll ? 0 : -1}
        onScroll={onScroll}
        onWheel={onWheel}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointerDrag}
        onPointerCancel={endPointerDrag}
        className={`relative h-[clamp(220px,34vw,360px)] overflow-x-auto overflow-y-hidden overscroll-x-contain bg-[radial-gradient(ellipse_at_50%_20%,#302c21_0%,#17140e_52%,#090806_100%)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[-3px] focus-visible:outline-[#d43a28] ${isLongScroll ? 'cursor-grab active:cursor-grabbing' : ''}`}
        style={{ touchAction: isLongScroll ? 'pan-x' : 'pan-y' }}
      >
        {tiled && !fullSourceFallback ? (
          <div className="relative flex h-full w-max select-none bg-no-repeat" style={{ backgroundImage: `url(${qingmingTiles.overview.src})`, backgroundSize: '100% 100%' }} data-scroll-tile-track="gg-qmsh">
            {qingmingTiles.tiles.map(tile => (
              <div key={tile.index} className="relative h-full shrink-0" style={{ aspectRatio: `${tile.width} / ${tile.height}` }} data-scroll-tile={tile.index}>
                {requestedTiles.has(tile.index) && (
                  <img
                    src={jpegTiles.has(tile.index) ? tile.jpeg.src : tile.webp.src}
                    alt={tile.index === 0 ? alt : ''}
                    aria-hidden={tile.index !== 0}
                    draggable={false}
                    decoding="async"
                    fetchPriority={tile.index === 0 ? 'high' : 'low'}
                    className="block h-full w-full object-fill"
                    onLoad={(event) => {
                      if (tile.index !== 0) return;
                      void event.currentTarget.decode().catch(() => undefined).then(() => setImageReady(true));
                    }}
                    onError={() => {
                      if (jpegTiles.has(tile.index)) { setFullSourceFallback(true); setImageReady(false); return; }
                      setJpegTiles(previous => new Set(previous).add(tile.index));
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        ) : <ResponsiveArtifactImage
          image={image}
          sizes="100vw"
          alt={alt}
          draggable={false}
          decoding="async"
          loading="eager"
          revealAfterDecode
          onError={onError}
          onReady={(element) => {
            const long = element.naturalWidth / Math.max(1, element.naturalHeight) >= 2.4;
            const sourcePixelHeight = Math.max(0, ...(image.responsive?.candidates.map(candidate => candidate.height) ?? [])) || element.naturalHeight;
            setIsLongScroll(long);
            setLowResolution(long && sourcePixelHeight < 300);
            setImageReady(true);
            requestAnimationFrame(() => {
              if (viewportRef.current) updateProgress(viewportRef.current);
            });
          }}
          className={`relative select-none ${isLongScroll ? 'h-full w-auto max-w-none object-contain' : 'h-full w-full object-contain p-3 md:p-5'}`}
        />}
        {!imageReady && <div className="pointer-events-none absolute inset-0 grid place-items-center font-mono text-[10px] tracking-wider text-[#efe6cf]/45">正在展卷…</div>}
        <div className="pointer-events-none sticky bottom-3 left-3 z-10 inline-block bg-[#0d0c09]/80 px-2 py-1 font-mono text-[9px] text-[#efe6cf]/55 backdrop-blur-sm">
          {label}
        </div>
        <div className="pointer-events-none sticky bottom-3 left-[calc(100%-3rem)] z-10 ml-auto mr-3 flex h-9 w-9 -translate-y-7 items-center justify-center bg-[#d43a28] shadow-lg">
          <span className="font-serif text-lg font-bold text-[#0e0d0a]">{category}</span>
        </div>
      </div>

        <figcaption id="scroll-reader-hint" className="border-t border-[#efe6cf]/10 bg-[#100e0a] px-3 py-2 md:px-4">
          <div className="h-px bg-[#efe6cf]/12">
            <div
              className="h-px bg-[#d43a28] transition-[width] duration-150"
              style={{ width: `${Math.max(4, progress * 100)}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 font-mono text-[9px] tracking-wider text-[#efe6cf]/35">
            <span>{isLongScroll ? '按住拖动 · 触摸横滑 · 滚轮阅卷' : '图像展示 · 长幅载入后可横向阅卷'}</span>
            <span className="tabular-nums">{Math.round(progress * 100)}%</span>
          </div>
        </figcaption>
    </figure>
  );
}
