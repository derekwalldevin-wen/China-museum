import { useEffect, useMemo, useRef } from 'react';
import type { MuseumIndex, ProvinceMeta } from '../data/types';
import { findCollection } from '../data/collection';
import type { CollectionFilter } from '../data/collection';
import ArtifactCard from './ArtifactCard';
import { artifactAttribution } from '../data/artifact-attribution';

interface Props {
  museums: MuseumIndex[];
  provinces: ProvinceMeta[];
  filter: CollectionFilter;
  onFilter: (filter: CollectionFilter) => void;
  onOpen: (museum: MuseumIndex, artifactId: string) => void;
  onClose: () => void;
  hidden: boolean;
}

export default function CollectionResults({ museums, provinces, filter, onFilter, onOpen, onClose, hidden }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const savedScrollTop = useRef(0);
  const nationwide = useMemo(() => findCollection(museums, { ...filter, province: null }), [museums, filter]);
  const results = useMemo(() => filter.province
    ? nationwide.filter(({ museum }) => museum.province === filter.province)
    : nationwide, [nationwide, filter.province]);
  const counts = useMemo(() => {
    const byProvince = new Map<string, number>();
    for (const { museum } of nationwide) byProvince.set(museum.province, (byProvince.get(museum.province) ?? 0) + 1);
    return byProvince;
  }, [nationwide]);
  const museumCount = new Set(results.map(({ museum, artifact }) => artifactAttribution(artifact, museum).holdingInstitution)).size;
  const provinceCount = new Set(results.map(({ museum }) => museum.province)).size;
  const scope = filter.province ?? '全国';

  useEffect(() => {
    savedScrollTop.current = 0;
    viewportRef.current?.scrollTo({ top: 0 });
  }, [filter.category, filter.era, filter.province]);

  useEffect(() => {
    if (hidden) return;
    const frame = requestAnimationFrame(() => viewportRef.current?.scrollTo({ top: savedScrollTop.current }));
    return () => cancelAnimationFrame(frame);
  }, [hidden]);

  return (
    <section hidden={hidden} aria-labelledby="collection-results-title" className="atlas-collection-results">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-[#efe6cf]/15 px-4 py-3 md:px-8 md:py-5">
        <div>
          <p className="font-mono text-[12px] tracking-[.2em] text-[#b49a63]">循时代 · 访珍藏</p>
          <h1 id="collection-results-title" className="mt-1 font-serif text-xl text-[#efe6cf] md:text-3xl">
            {filter.era ?? '历代'}{filter.category ? ` · ${filter.category}` : '文物'}
          </h1>
          <p role="status" className="mt-2 text-xs text-[#efe6cf]/60">
            {scope}已收录 {results.length} 件 · {museumCount} 个馆藏单位 · {provinceCount} 个省级行政区
          </p>
        </div>
        <button type="button" onClick={onClose} className="min-h-11 shrink-0 border border-[#efe6cf]/25 px-3 text-xs text-[#efe6cf]/80 hover:border-[#b49a63]">
          返回地图 ×
        </button>
        <div className="flex w-full flex-wrap items-center gap-2 text-xs">
          <label htmlFor="collection-province" className="text-[#efe6cf]/60">地域范围</label>
          <select id="collection-province" value={filter.province ?? ''}
            onChange={(event) => onFilter({ ...filter, province: event.target.value || null })}
            className="min-h-11 max-w-full border border-[#b49a63]/40 bg-[#12130f] px-3 text-[#efe6cf]">
            <option value="">全国 · {nationwide.length} 件</option>
            {provinces.map((province) => <option key={province.name} value={province.name}>
              {province.name} · {counts.get(province.name) ?? 0} 件
            </option>)}
          </select>
          {filter.era && <button type="button" className="collection-filter-chip" onClick={() => onFilter({ ...filter, era: null })} aria-label={`取消${filter.era}筛选`}>{filter.era} ×</button>}
          {filter.category && <button type="button" className="collection-filter-chip" onClick={() => onFilter({ ...filter, category: null })} aria-label={`取消${filter.category}筛选`}>{filter.category} ×</button>}
          <span className="text-[12px] text-[#efe6cf]/40">点选文物查看详情与收藏地点</span>
        </div>
      </div>
      <div ref={viewportRef} onScroll={(event) => {
        if (!hidden) savedScrollTop.current = event.currentTarget.scrollTop;
      }}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:px-8 md:py-6">
        {results.length ? <div className="mx-auto grid max-w-[1500px] grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-5 md:gap-5">
          {results.map(({ artifact, museum }, index) => <article key={`${museum.id}:${artifact.id}`} className="flex flex-col">
            <ArtifactCard artifact={artifact} index={index} showStory={false} onClick={() => {
              if (viewportRef.current) savedScrollTop.current = viewportRef.current.scrollTop;
              onOpen(museum, artifact.id);
            }} />
            <div className="flex-1 border border-t-0 border-[#efe6cf]/15 bg-[#181710] px-3 py-3">
              <p className="text-[12px] text-[#b49a63]">{museum.province} · {museum.city}</p>
              <p className="mt-1 font-serif text-xs leading-relaxed text-[#efe6cf]/80">{artifactAttribution(artifact, museum).holdingLabel}</p>
              {artifact.exhibitionNote && <p className="mt-1 text-[12px] leading-relaxed text-[#efe6cf]/50">{artifact.exhibitionNote}</p>}
            </div>
          </article>)}
        </div> : <div className="mx-auto max-w-md py-12 text-center">
          <h2 className="font-serif text-xl text-[#efe6cf]">当前条件下暂无收录</h2>
          <p className="mt-3 text-sm leading-relaxed text-[#efe6cf]/55">这是本站已收录馆藏的筛选结果，不代表当地没有此类文物。可以扩大地域范围，或取消类别限制。</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {filter.province && <button type="button" className="collection-filter-chip" onClick={() => onFilter({ ...filter, province: null })}>查看全国 · {nationwide.length} 件</button>}
            {filter.category && <button type="button" className="collection-filter-chip" onClick={() => onFilter({ ...filter, category: null })}>取消类别限制</button>}
            <button type="button" className="collection-filter-chip" onClick={onClose}>清除筛选，返回地图</button>
          </div>
        </div>}
      </div>
    </section>
  );
}
