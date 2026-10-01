import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { MuseumIndex } from '../data/types';
import { artifactAttribution } from '../data/artifact-attribution';
import { loadArtifactSearchCorpus } from '../data/museum-loader';
import { searchMuseumIndex } from '../data/search';
import type { ArtifactSearchResult, MuseumSearchResult } from '../data/search';

interface Props {
  museums: MuseumIndex[];
  onPickMuseum: (museum: MuseumIndex) => void;
  onPickArtifact: (museum: MuseumIndex, artifactId: string) => void;
}
type SearchResult = MuseumSearchResult | ArtifactSearchResult;

export default function SearchBar({ museums, onPickMuseum, onPickArtifact }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const deferredQuery = useDeferredValue(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const [storyCorpus, setStoryCorpus] = useState<Record<string, string> | null>(null);
  const [storyCorpusError, setStoryCorpusError] = useState(false);
  const [storyCorpusAttempt, setStoryCorpusAttempt] = useState(0);
  // 博物馆简介不随首屏加载：第一次输入时才取，取得后用于给简介字段加权。
  const [museumIntroIndex, setMuseumIntroIndex] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    if (!deferredQuery.trim() || storyCorpus || storyCorpusError) return;
    let active = true;
    loadArtifactSearchCorpus().then(corpus => {
      if (active) setStoryCorpus(corpus);
    }).catch(() => {
      if (active) setStoryCorpusError(true);
    });
    return () => { active = false; };
  }, [deferredQuery, storyCorpus, storyCorpusAttempt, storyCorpusError]);

  useEffect(() => {
    if (!deferredQuery.trim() || museumIntroIndex) return;
    let active = true;
    import('../data/museum-intros').then(module => {
      if (active) setMuseumIntroIndex(module.museumIntros);
    }).catch(() => { /* 取不到简介时仍有名称、省份与城市参与检索 */ });
    return () => { active = false; };
  }, [deferredQuery, museumIntroIndex]);

  const results = useMemo(
    () => searchMuseumIndex(museums, deferredQuery, storyCorpus, museumIntroIndex ?? {}),
    [deferredQuery, museums, storyCorpus, museumIntroIndex],
  );

  const flatResults: SearchResult[] = results
    ? [...results.museums, ...results.artifacts]
    : [];
  const safeActiveIndex = activeIndex >= 0 && activeIndex < flatResults.length ? activeIndex : -1;
  const panelOpen = open && results !== null;

  useEffect(() => {
    if (panelOpen && safeActiveIndex >= 0) {
      document.getElementById(`${listboxId}-option-${safeActiveIndex}`)?.scrollIntoView({ block: 'nearest' });
    }
  }, [listboxId, panelOpen, safeActiveIndex]);

  const chooseResult = (result: SearchResult) => {
    setQuery('');
    setOpen(false);
    setActiveIndex(-1);
    if (result.kind === 'museum') onPickMuseum(result.museum);
    else onPickArtifact(result.museum, result.artifact.id);
  };

  return (
    <div ref={containerRef} className="atlas-search relative w-full max-w-md">
      <div className="atlas-search-field flex h-9 items-center border-b border-[#d8cfb7]/18 bg-transparent px-3 transition-colors focus-within:border-[#b49a63]/70 focus-within:bg-[#b49a63]/[.025]">
        <span aria-hidden="true" className="mr-2 font-mono text-xs text-[#b49a63]">⌕</span>
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={(event) => {
            const next = event.relatedTarget;
            if (next instanceof Node && containerRef.current?.contains(next)) return;
            setOpen(false);
            setActiveIndex(-1);
          }}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing || event.keyCode === 229) return;
            if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              setOpen(false);
              setActiveIndex(-1);
              event.currentTarget.blur();
              return;
            }
            if (!flatResults.length) return;
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((current) => current < 0 ? 0 : (current + 1) % flatResults.length);
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((current) => current <= 0 ? flatResults.length - 1 : current - 1);
            } else if (event.key === 'Enter' && safeActiveIndex >= 0) {
              event.preventDefault();
              chooseResult(flatResults[safeActiveIndex]);
            }
          }}
          role="combobox"
          aria-label="搜索博物馆或文物"
          aria-autocomplete="list"
          aria-expanded={panelOpen}
          aria-controls={listboxId}
          aria-activedescendant={panelOpen && safeActiveIndex >= 0 ? `${listboxId}-option-${safeActiveIndex}` : undefined}
          autoComplete="off"
          placeholder="检索馆藏、文物、朝代或类别…"
          className="min-w-0 flex-1 bg-transparent text-sm text-[#d8cfb7] outline-none placeholder:text-[#d8cfb7]/28"
        />
        {query && (
          <button
            type="button"
            aria-label="清空搜索"
            onClick={() => {
              setQuery('');
              setActiveIndex(-1);
              inputRef.current?.focus();
            }}
            className="grid h-9 w-9 shrink-0 place-items-center text-xs text-[#efe6cf]/50 transition-colors active:text-[#d43a28] hover:text-[#d43a28]"
          >✕</button>
        )}
      </div>

      {panelOpen && results && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="搜索结果"
          onPointerDown={(event) => {
            if (event.pointerType === 'mouse') event.preventDefault();
          }}
          className="atlas-search-results absolute left-0 right-0 top-10 z-50 max-h-[calc(100dvh-10.5rem)] overflow-y-auto overscroll-contain border border-[#efe6cf]/25 bg-[#0d0c09] shadow-[0_20px_50px_rgba(0,0,0,.5)] backdrop-blur-md md:max-h-96"
        >
          {flatResults.length === 0 && (
            <div className="px-4 py-5">
              <div className="font-serif text-sm text-[#efe6cf]">未找到“{query.trim()}”</div>
              <div className="mt-1 text-xs leading-relaxed text-[#efe6cf]/45">试试省份、朝代、类别，或缩短关键词。</div>
            </div>
          )}

          {!storyCorpus && !storyCorpusError && deferredQuery.trim() && (
            <div role="status" className="border-b border-[#efe6cf]/10 px-3 py-2 font-mono text-[9px] text-[#efe6cf]/38">正在补载全文检索…</div>
          )}
          {storyCorpusError && deferredQuery.trim() && (
            <div role="alert" className="flex items-center justify-between gap-3 border-b border-[#efe6cf]/10 px-3 py-2 text-[10px] text-[#efe6cf]/45">
              <span>全文检索暂未载入，名称与分类仍可用</span>
              <button type="button" className="min-h-11 shrink-0 text-[#d43a28]" onClick={() => { setStoryCorpusError(false); setStoryCorpusAttempt(value => value + 1); }}>重试全文检索</button>
            </div>
          )}

          {results.museums.length > 0 && (
            <section aria-labelledby={`${listboxId}-museums`}>
              <div id={`${listboxId}-museums`} className="sticky top-0 z-10 flex items-center justify-between border-b border-[#efe6cf]/10 bg-[#15120d] px-3 py-1.5 font-mono text-[9px] tracking-[0.18em] text-[#efe6cf]/45">
                <span>博物馆</span><span>{results.museumTotal} 个命中</span>
              </div>
              {results.museums.map((result, index) => {
                const active = safeActiveIndex === index;
                return (
                  <button
                    id={`${listboxId}-option-${index}`}
                    key={result.museum.id}
                    type="button"
                    role="option"
                    tabIndex={-1}
                    aria-selected={active}
                    onPointerEnter={() => setActiveIndex(index)}
                    onClick={() => chooseResult(result)}
                    className={`flex min-h-14 w-full items-center gap-3 border-b border-[#efe6cf]/10 px-3 py-2.5 text-left transition-colors ${active ? 'bg-[#d43a28]/16' : 'hover:bg-[#efe6cf]/5'}`}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center bg-[#b83524] font-brush text-base text-[#f5eeda]">馆</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-serif text-sm text-[#efe6cf]">{result.museum.name}</span>
                      <span className="mt-0.5 block truncate font-mono text-[10px] text-[#efe6cf]/42">{result.museum.province} · {result.museum.city} · {result.museum.artifacts.length} 件</span>
                    </span>
                    <span aria-hidden="true" className="text-[#d43a28]">→</span>
                  </button>
                );
              })}
            </section>
          )}

          {results.artifacts.length > 0 && (
            <section aria-labelledby={`${listboxId}-artifacts`}>
              <div id={`${listboxId}-artifacts`} className="sticky top-0 z-10 flex items-center justify-between border-b border-[#efe6cf]/10 bg-[#15120d] px-3 py-1.5 font-mono text-[9px] tracking-[0.18em] text-[#efe6cf]/45">
                <span>代表文物</span><span>{results.artifactTotal} 个命中</span>
              </div>
              {results.artifacts.map((result, artifactIndex) => {
                const index = results.museums.length + artifactIndex;
                const active = safeActiveIndex === index;
                return (
                  <button
                    id={`${listboxId}-option-${index}`}
                    key={result.artifact.id}
                    type="button"
                    role="option"
                    tabIndex={-1}
                    aria-selected={active}
                    onPointerEnter={() => setActiveIndex(index)}
                    onClick={() => chooseResult(result)}
                    className={`flex min-h-14 w-full items-center gap-3 border-b border-[#efe6cf]/10 px-3 py-2.5 text-left transition-colors ${active ? 'bg-[#d43a28]/16' : 'hover:bg-[#efe6cf]/5'}`}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center border border-[#d43a28]/55 font-serif text-[9px] text-[#d43a28]">{result.artifact.category.slice(0, 1)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-serif text-sm text-[#efe6cf]">
                        {result.artifact.name}
                        <span className="ml-2 font-mono text-[9px] text-[#d43a28]">{result.artifact.dynasty}</span>
                      </span>
                      <span className="mt-0.5 block truncate font-mono text-[10px] text-[#efe6cf]/42">{result.artifact.category} · {artifactAttribution(result.artifact, result.museum).holdingLabel}</span>
                    </span>
                    <span aria-hidden="true" className="text-[#d43a28]">→</span>
                  </button>
                );
              })}
            </section>
          )}

          {flatResults.length > 0 && (
            <div className="hidden items-center justify-between border-t border-[#efe6cf]/10 px-3 py-2 font-mono text-[9px] text-[#efe6cf]/30 md:flex">
              <span>↑ ↓ 浏览 · ENTER 进入</span><span>ESC 关闭</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
