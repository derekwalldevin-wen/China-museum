import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { Artifact, Category, Era, Museum, MuseumIndex } from '../data/types';
import ArtifactCard, { ArtifactFigure } from './ArtifactCard';
import FilterBar from './FilterBar';
import { storyTeaserIndex } from '../data/story-routes';
import { storyTeaserHooks } from '../data/story-teaser-hooks';
import { warmArtifactDetailImage } from '../data/artifact-detail-prefetch';
import { useIdleMuseumImageMetadata } from '../hooks/useIdleMuseumImageMetadata';
import { artifactAttribution } from '../data/artifact-attribution';
import { museumIntros } from '../data/museum-intros';

interface Props {
  suspended?: boolean;
  onReadStory: (id: string) => void;
  museum: Museum;
  museums: MuseumIndex[];     // 全省轻索引（用于上/下一家）
  era: Era | null;
  category: Category | null;
  onEra: (era: Era | null) => void;
  onCategory: (category: Category | null) => void;
  artifactId: string | null;
  onOpenArtifact: (artifactId: string, replace?: boolean) => void;
  onCloseArtifact: () => void;
  onBack: () => void;         // 返回省列表
  onNavigate: (m: MuseumIndex) => void;
}

export default function MuseumDetail({
  museum,
  museums,
  era,
  category,
  onEra,
  onCategory,
  artifactId,
  onOpenArtifact,
  onCloseArtifact,
  onBack,
  onNavigate,
  suspended,
  onReadStory,
}: Props) {
  const filtered = useMemo(
    () => museum.artifacts.filter((a) => (!era || a.era === era) && (!category || a.category === category)),
    [museum, era, category]);

  const openArtifact: Artifact | null = filtered.find((a) => a.id === artifactId)
    ?? museum.artifacts.find((a) => a.id === artifactId) ?? null;
  const isArtifactOpen = openArtifact !== null;
  const dialogRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const detailPositionKey = `atlas-detail-v1:${museum.id}:${openArtifact?.id ?? ''}`;
  useIdleMuseumImageMetadata(museum.id, galleryRef);
  useLayoutEffect(() => {
    try {
      const top = Number(sessionStorage.getItem(detailPositionKey));
      if (dialogRef.current && Number.isFinite(top)) dialogRef.current.scrollTop = Math.max(0, top);
    } catch { /* Reading remains available without storage. */ }
    // After a refresh, the lazy scroll reader may grow while hidden by the
    // guide. Reapply the original position when that overlay is dismissed.
  }, [detailPositionKey, suspended]);

  const siblings = museums.filter((m) => m.province === museum.province);
  const idx = siblings.findIndex((m) => m.id === museum.id);
  const prev = siblings[(idx - 1 + siblings.length) % siblings.length];
  const next = siblings[(idx + 1) % siblings.length];
  const artifactSequence = useMemo(
    () => openArtifact && filtered.some((artifact) => artifact.id === openArtifact.id)
      ? filtered
      : museum.artifacts,
    [filtered, museum.artifacts, openArtifact],
  );
  const openIndex = openArtifact
    ? artifactSequence.findIndex((artifact) => artifact.id === openArtifact.id)
    : -1;
  const previousArtifact = openIndex >= 0
    ? artifactSequence[(openIndex - 1 + artifactSequence.length) % artifactSequence.length]
    : null;
  const nextArtifact = openIndex >= 0
    ? artifactSequence[(openIndex + 1) % artifactSequence.length]
    : null;
  const isScrollArtifact = openArtifact?.shape === 'scroll';

  const stepArtifact = useCallback((dir: 1 | -1) => {
    if (!openArtifact || artifactSequence.length < 2) return;
    const i = artifactSequence.findIndex((artifact) => artifact.id === openArtifact.id);
    onOpenArtifact(artifactSequence[(i + dir + artifactSequence.length) % artifactSequence.length].id, true);
  }, [artifactSequence, onOpenArtifact, openArtifact]);

  useEffect(() => {
    if (!isArtifactOpen || suspended) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const focusFrame = requestAnimationFrame(() => closeRef.current?.focus({ preventScroll: true }));

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onCloseArtifact();
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        stepArtifact(-1);
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        stepArtifact(1);
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter((element) => !element.hasAttribute('hidden'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', onKeyDown);
      previousFocusRef.current?.focus({ preventScroll: true });
    };
  }, [isArtifactOpen, onCloseArtifact, stepArtifact, suspended]);

  return (
    <div className="absolute inset-0 z-40 bg-[#0b0a07] flex flex-col animate-[fadeIn_.3s_ease-out]">
      <div
        className="flex min-h-0 flex-1 flex-col"
        aria-hidden={openArtifact ? true : undefined}
        inert={openArtifact ? true : undefined}
      >
        {/* 顶栏 */}
        <header className="flex items-center gap-3 md:gap-5 border-b border-[#efe6cf]/15 px-4 md:px-6 py-3 md:py-4">
        <button onClick={onBack}
          className="draw-btn shrink-0 border border-[#efe6cf]/30 px-2.5 md:px-3 py-1.5 text-[12px] text-[#efe6cf]/80 hover:text-[#d43a28] transition-colors">
          ← 返回{museum.province}
        </button>
        <div className="hidden sm:grid h-12 w-12 shrink-0 place-items-center bg-[#d43a28] shadow-[0_0_24px_rgba(212,58,40,.35)]">
          <span className="font-brush text-2xl leading-none text-[#efe6cf]">{museum.city[0]}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[9px] tracking-[0.25em] text-[#d43a28] truncate">
            GALLERY / {museum.city} · {museum.coord[0].toFixed(2)}°E {museum.coord[1].toFixed(2)}°N
          </div>
          <h1 className="mt-0.5 font-serif text-lg sm:text-2xl md:text-3xl text-[#efe6cf] truncate">{museum.name}</h1>
        </div>
        <div className="hidden md:flex items-center gap-2 font-mono text-[11px]">
          <button onClick={() => onNavigate(prev)} className="draw-btn border border-[#efe6cf]/25 px-2 py-1 text-[#efe6cf]/60 hover:text-[#d43a28]">← {prev.name}</button>
          <span className="text-[#efe6cf]/30">{idx + 1}/{siblings.length}</span>
          <button onClick={() => onNavigate(next)} className="draw-btn border border-[#efe6cf]/25 px-2 py-1 text-[#efe6cf]/60 hover:text-[#d43a28]">{next.name} →</button>
        </div>
        </header>

        {/* 简介 */}
        <div className="border-b border-[#efe6cf]/10 px-4 md:px-6 py-3 md:py-4">
        <p className="max-w-3xl text-[12px] md:text-[13px] leading-relaxed text-[#efe6cf]/65 max-md:line-clamp-2">{museumIntros[museum.id] ?? ''}</p>
        {/* 手机端同省切换 */}
        <div className="mt-2 flex md:hidden items-center gap-2 font-mono text-[11px]">
          <button onClick={() => onNavigate(prev)} className="border border-[#efe6cf]/25 px-2 py-1 text-[#efe6cf]/60">← 上一馆</button>
          <span className="text-[#efe6cf]/30">{idx + 1}/{siblings.length}</span>
          <button onClick={() => onNavigate(next)} className="border border-[#efe6cf]/25 px-2 py-1 text-[#efe6cf]/60">下一馆 →</button>
        </div>
        </div>

        {/* 馆内筛选：不必退出展厅即可调整 */}
        <div className="border-b border-[#efe6cf]/12 bg-[#100e0a] px-4 py-2.5 md:px-6">
          <div className="flex items-center gap-3">
            <div className="hidden shrink-0 lg:block">
              <div className="font-mono text-[9px] tracking-[0.2em] text-[#d43a28]">COLLECTION FILTER</div>
              <div className="mt-0.5 font-mono text-[10px] tabular-nums text-[#efe6cf]/40">
                显示 {filtered.length} / {museum.artifacts.length}
              </div>
            </div>
            <FilterBar era={era} category={category} onEra={onEra} onCategory={onCategory} />
            {(era || category) && (
              <button
                type="button"
                onClick={() => { onEra(null); onCategory(null); }}
                className="shrink-0 border border-[#d43a28]/60 px-2 py-1.5 font-mono text-[10px] text-[#d43a28] transition-colors hover:bg-[#d43a28] hover:text-[#0d0c09]"
              >清除</button>
            )}
          </div>
        </div>

        {/* 文物区 */}
        <div ref={galleryRef} data-artifact-scroll-root className="flex-1 overflow-y-auto overscroll-contain px-4 md:px-6 py-4 md:py-6">
        {filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-[#efe6cf]/40 text-sm">
            <span>当前筛选条件下暂无文物</span>
            <button
              type="button"
              onClick={() => { onEra(null); onCategory(null); }}
              className="border border-[#d43a28]/60 px-4 py-2 font-mono text-xs text-[#d43a28] hover:bg-[#d43a28] hover:text-[#0d0c09]"
            >清除筛选，查看全部</button>
          </div>
        ) : (
          <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {filtered.map((a, i) => (
              <ArtifactCard
                key={a.id}
                artifact={a}
                index={i}
                showStory={false}
                deferImage
                onImageIntent={() => { void warmArtifactDetailImage(museum.id, a.id); }}
                onClick={() => onOpenArtifact(a.id)}
              />
            ))}
          </div>
        )}
        </div>
      </div>

      {/* 单件文物展开 —— 深夜展厅聚光灯 */}
      {openArtifact && (
        <div className="absolute inset-0 z-50 bg-[#070604]/97 backdrop-blur-sm flex items-center justify-center p-3 md:p-6"
          onClick={onCloseArtifact}>
          <div
            ref={dialogRef}
            onScroll={event => {
              if (suspended) return;
              try { sessionStorage.setItem(detailPositionKey, String(event.currentTarget.scrollTop)); } catch { /* Storage unavailable. */ }
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="artifact-dialog-title"
            tabIndex={-1}
            className={`relative flex flex-col gap-6 md:gap-8 w-full max-h-[92dvh] overflow-y-auto overscroll-contain border border-[#efe6cf]/15 bg-[#0d0c09] p-5 pt-14 md:p-10 ${isScrollArtifact ? 'max-w-6xl' : 'max-w-4xl md:flex-row'}`}
            onClick={(e) => e.stopPropagation()}>
            <button
              ref={closeRef}
              aria-label="关闭文物详情"
              onClick={onCloseArtifact}
              className="absolute right-3 top-3 z-10 h-10 w-10 border border-[#efe6cf]/30 text-[#efe6cf]/70 hover:border-[#d43a28] hover:text-[#d43a28] focus-visible:border-[#d43a28] focus-visible:outline-none md:right-4 md:top-4"
            >✕</button>

            <div className={`w-full shrink-0 ${isScrollArtifact ? '' : 'md:w-[360px]'}`}>
              <ArtifactFigure museumId={museum.id} artifact={openArtifact} className={isScrollArtifact ? 'w-full' : 'aspect-[4/5] w-full'} />
              <div className="mt-3 flex justify-between font-mono text-[10px] text-[#efe6cf]/40">
                <span>NO.{String(openIndex + 1).padStart(2, '0')} / {String(artifactSequence.length).padStart(2, '0')}</span>
                <span>{openArtifact.era}</span>
              </div>
              <div className="mt-2 h-px bg-[#efe6cf]/10">
                <div className="h-px bg-[#d43a28] transition-[width] duration-300" style={{ width: `${((openIndex + 1) / artifactSequence.length) * 100}%` }} />
              </div>
            </div>

            <div className={`min-w-0 ${isScrollArtifact ? 'mx-auto w-full max-w-4xl' : ''}`}>
              <div className="font-mono text-[10px] tracking-widest text-[#d43a28]">
                {openArtifact.era} · {openArtifact.dynasty} · {openArtifact.category}
              </div>
              <h2 id="artifact-dialog-title" className="mt-2 font-serif text-2xl md:text-3xl text-[#efe6cf]">{openArtifact.name}</h2>
              <div className="mt-1 font-mono text-[11px] text-[#efe6cf]/45">{artifactAttribution(openArtifact, museum).holdingLabel}</div>
              {openArtifact.exhibitionNote && <p className="mt-1 text-xs text-[#efe6cf]/55">{openArtifact.exhibitionNote}</p>}
              <div className="my-4 h-px w-16 bg-[#d43a28]" />
              <p className="text-[14px] leading-loose text-[#efe6cf]/75">{openArtifact.story}</p>

              {storyTeaserIndex[openArtifact.id] && <button type="button" data-story-entry onClick={() => onReadStory(openArtifact.id)}
                className="mt-5 w-full border border-[#b49a63]/55 bg-[#b49a63]/10 px-4 py-4 text-left text-[#e7d5ab] min-h-11">
                <span className="block font-serif text-lg">读懂这件文物的故事 →</span>
                <span className="mt-2 block text-xs leading-relaxed">{storyTeaserHooks[openArtifact.id]} · 分层解读 / 三个细节 / 继续探索</span>
              </button>}

              <div className="mt-8 flex gap-3">
                <button onClick={() => stepArtifact(-1)}
                  disabled={artifactSequence.length < 2}
                  aria-label={`上一件：${previousArtifact?.name ?? ''}`}
                  className="draw-btn min-w-0 border border-[#efe6cf]/25 px-3 py-2 text-left text-[12px] text-[#efe6cf]/70 hover:text-[#d43a28] disabled:cursor-not-allowed disabled:opacity-30">
                  <span>← 上一件</span>
                  {artifactSequence.length > 2 && <span className="ml-2 hidden max-w-32 truncate text-[#efe6cf]/35 sm:inline-block">{previousArtifact?.name}</span>}
                </button>
                <button onClick={() => stepArtifact(1)}
                  disabled={artifactSequence.length < 2}
                  aria-label={`下一件：${nextArtifact?.name ?? ''}`}
                  className="draw-btn min-w-0 border border-[#efe6cf]/25 px-3 py-2 text-right text-[12px] text-[#efe6cf]/70 hover:text-[#d43a28] disabled:cursor-not-allowed disabled:opacity-30">
                  {artifactSequence.length > 2 && <span className="mr-2 hidden max-w-32 truncate text-[#efe6cf]/35 sm:inline-block">{nextArtifact?.name}</span>}
                  <span>下一件 →</span>
                </button>
              </div>
              <div className="mt-3 font-mono text-[9px] tracking-wider text-[#efe6cf]/25">
                {isScrollArtifact ? '阅卷台未聚焦时，键盘 ← → 连续看展' : '键盘 ← → 连续看展'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
