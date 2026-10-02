import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import MapCoordinates from './components/MapCoordinates';
import type { MapCoordinatesHandle } from './components/MapCoordinates';
import SearchBar from './components/SearchBar';
import FilterBar from './components/FilterBar';
import { EMPTY_COLLECTION_FILTER, readCollectionFilter, writeCollectionFilter } from './data/collection';
import type { CollectionFilter } from './data/collection';
import MapErrorBoundary from './components/MapErrorBoundary';
import DeferredErrorBoundary from './components/DeferredErrorBoundary';
import IntroGate from './components/IntroGate';
import { artifactTotal, museumIndex as museums } from './data/museum-index';
import { loadMuseumPayload, warmMuseumPayload } from './data/museum-loader';
import { provinces } from './data/provinces';
import type { Category, Era, Museum, MuseumIndex } from './data/types';
import { defaultTrailId, guideUrl, readGuideRoute, writeGuideRoute } from './data/story-routes';
import type { GuideRoute } from './data/story-routes';

const loadScrollMapScene = () => import('./components/ScrollMapScene');
const loadStoryExperience = () => import('./components/StoryExperience');
const loadProvincePanel = () => import('./components/ProvincePanel');
const loadMuseumDetail = () => import('./components/MuseumDetail');
const loadRegionDirectory = () => import('./components/RegionDirectory');
const loadCollectionResults = () => import('./components/CollectionResults');
const ScrollMapScene = lazy(loadScrollMapScene);
const StoryExperience = lazy(loadStoryExperience);
const ProvincePanel = lazy(loadProvincePanel);
const MuseumDetail = lazy(loadMuseumDetail);
const RegionDirectory = lazy(loadRegionDirectory);
const CollectionResults = lazy(loadCollectionResults);
// 静态首页审美确认后，再以同一画面重做连续开场。
const ENABLE_INK_INTRO = true;

// 卷首荐读：只推作者实地到访过、并已写好故事的文物，按日期轮换。
// 目标 id 全在 FIELD_IDS 内且由 stories.test 断言在册，因此不需要兜底分支；
// 标题与说明写成静态 JSX 文案，省下首屏预算。
const FIELD_IDS = 'hub-zhy hub-zzs hub-ymh hub-hjd hub-hjs hub-hjy hub-zbh hub-zbl hub-hyy hub-qqw hub-nnd hub-xd hub-fcb hub-jjj hub-czd hub-lgd hub-yzc hub-jb'.split(' ');
const beaconId = FIELD_IDS[Math.floor(Date.now() / 86_400_000) % FIELD_IDS.length];
const beaconMuseum = museums.find(museum => museum.artifacts.some(item => item.id === beaconId));
const beaconName = beaconMuseum?.artifacts.find(item => item.id === beaconId)?.name ?? '';
const beaconPick = { id: beaconId, eyebrow: `实地荐读 · ${beaconMuseum?.name ?? ''}`, cta: `从《${beaconName}》启程` };

function warm(loader: () => Promise<unknown>) {
  void loader().catch(() => { /* The visible error boundary owns recovery. */ });
}

function DeferredLayer({ title, detail, failed = false, onExit, onRetry, zIndex }: {
  title: string; detail: string; failed?: boolean; onExit?: () => void; onRetry?: () => void; zIndex: number;
}) {
  return <div className="absolute inset-0 grid place-content-center bg-[#0d100e] px-6 text-center text-[#efe6cf]" style={{ zIndex }} role={failed ? 'alert' : 'status'} aria-live="polite">
    <div className="mx-auto grid h-12 w-12 place-items-center border border-[#b49a63]/60 bg-[#a93424]/20 font-brush text-2xl">卷</div>
    <div className="mt-4 font-serif text-xl">{title}</div>
    <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#efe6cf]/55">{detail}</p>
    {!failed && <div className="mx-auto mt-5 h-px w-44 overflow-hidden bg-[#efe6cf]/10"><div className="h-px w-1/3 bg-[#b49a63] animate-[loadSweep_1.6s_ease-in-out_infinite]" /></div>}
    {failed && <div className="mt-5 flex flex-wrap justify-center gap-3">
      <button type="button" onClick={onRetry ?? (() => window.location.reload())} className="min-h-11 border border-[#d43a28] px-4 py-2 text-xs text-[#e7d5ab]">保留当前位置，重新载入</button>
      {onExit && <button type="button" onClick={onExit} className="min-h-11 border border-[#efe6cf]/25 px-4 py-2 text-xs text-[#efe6cf]/65">返回上一层</button>}
    </div>}
  </div>;
}

type MapQuality = 'high' | 'standard' | 'low';
const MAP_QUALITY_LABEL: Record<MapQuality, string> = {
  high: '精细',
  standard: '标准',
  low: '节能',
};

interface NavigationState {
  provinceName: string | null;
  museumId: string | null;
  artifactId: string | null;
}

interface AtlasHistoryState {
  guideDepth?: number;
  guideReturnable?: boolean;
  museumAtlas?: true;
  level?: number;
  parentLevel?: number;
  collectionOrigin?: NavigationState;
}

const EMPTY_NAVIGATION: NavigationState = {
  provinceName: null,
  museumId: null,
  artifactId: null,
};
const PROVINCE_NAMES = new Set(provinces.map((province) => province.name));

function navigationLevel(state: NavigationState) {
  if (state.artifactId) return 3;
  if (state.museumId) return 2;
  if (state.provinceName) return 1;
  return 0;
}

function readNavigation(): NavigationState {
  const params = new URLSearchParams(window.location.search);
  const requestedArtifact = params.get('artifact');
  // Preserve shared links for objects whose earlier museum attribution was corrected.
  const legacySeal = (params.get('museum') === 'yunnan' && requestedArtifact === 'yn-dwy')
    || (params.get('museum') === 'qinghai' && requestedArtifact === 'qh-gyq');
  const requestedMuseum = legacySeal ? 'guobo' : params.get('museum');
  const museum = museums.find((item) => item.id === requestedMuseum) ?? null;
  const requestedProvince = params.get('province');
  const provinceName = museum?.province
    ?? provinces.find((item) => item.name === requestedProvince)?.name
    ?? null;
  const artifactId = museum?.artifacts.some((item) => item.id === requestedArtifact)
    ? requestedArtifact
    : null;

  return {
    provinceName,
    museumId: museum?.id ?? null,
    artifactId,
  };
}

function navigationUrl(state: NavigationState, filter: CollectionFilter) {
  const params = new URLSearchParams();
  writeGuideRoute(params, readGuideRoute(window.location.search));
  if (state.provinceName) params.set('province', state.provinceName);
  if (state.museumId) params.set('museum', state.museumId);
  if (state.artifactId) params.set('artifact', state.artifactId);
  writeCollectionFilter(params, filter);
  const query = params.toString();
  return `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
}

export default function App() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const legacySeal = (params.get('museum') === 'yunnan' && params.get('artifact') === 'yn-dwy')
      || (params.get('museum') === 'qinghai' && params.get('artifact') === 'qh-gyq');
    if (!legacySeal) return;
    params.set('museum', 'guobo');
    params.set('province', '北京市');
    window.history.replaceState(window.history.state, '', `${window.location.pathname}?${params}${window.location.hash}`);
  }, []);
  const [guide, setGuide] = useState<GuideRoute | null>(() => readGuideRoute(window.location.search));
  const navigateGuide = useCallback((next: GuideRoute) => {
    const current = (window.history.state ?? {}) as AtlasHistoryState;
    const currentGuide = readGuideRoute(window.location.search);
    window.history.pushState({ ...current, guideDepth: currentGuide ? (current.guideDepth ?? 0) + 1 : 1,
      guideReturnable: currentGuide ? current.guideReturnable === true : true }, '', guideUrl(next));
    setGuide(next);
  }, []);
  const exitGuide = useCallback(() => {
    const current = (window.history.state ?? {}) as AtlasHistoryState;
    if (current.guideReturnable && Number.isInteger(current.guideDepth) && current.guideDepth! > 0 && current.guideDepth! < window.history.length) {
      window.history.go(-current.guideDepth!);
    } else {
      window.history.replaceState({ ...current, guideDepth: undefined, guideReturnable: undefined }, '', guideUrl(null));
      setGuide(null);
    }
  }, []);
  const backGuide = useCallback(() => {
    const depth = (window.history.state as AtlasHistoryState | null)?.guideDepth ?? 0;
    if (depth > 0) window.history.back();
    else if (readGuideRoute(window.location.search)?.storyId) navigateGuide({ trailId: null, storyId: null });
    else exitGuide();
  }, [exitGuide, navigateGuide]);
  const [navigation, setNavigation] = useState<NavigationState>(() => readNavigation());
  const [era, setEra] = useState<Era | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [collectionFilter, setCollectionFilter] = useState<CollectionFilter>(() => readCollectionFilter(window.location.search, PROVINCE_NAMES));
  const collectionOpen = !!(collectionFilter.era || collectionFilter.category || collectionFilter.province);
  const coordinatesRef = useRef<MapCoordinatesHandle>(null);
  const [ready, setReady] = useState(false);
  const [mapStarted, setMapStarted] = useState(false);
  const [mapUnavailable, setMapUnavailable] = useState(false);
  const [mapQuality, setMapQuality] = useState<MapQuality | null>(null);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [introActive, setIntroActive] = useState(false);
  const [loadedMuseum, setLoadedMuseum] = useState<Museum | null>(null);
  const [failedMuseumId, setFailedMuseumId] = useState<string | null>(null);

  const updateCoordinates = useCallback((lng: number, lat: number, inside: boolean) => {
    coordinatesRef.current?.update(lng, lat, inside);
  }, []);
  const onMapReady = useCallback((quality: MapQuality) => {
    setMapQuality(quality);
    setReady(true);
    try { performance.mark('huaxia:map:ready'); } catch { /* Diagnostics are optional. */ }
  }, []);

  const { provinceName, museumId, artifactId: highlightArtifact } = navigation;

  const province = provinces.find((p) => p.name === provinceName) ?? null;
  const museumMeta = museums.find((m) => m.id === museumId) ?? null;
  const museum = loadedMuseum?.id === museumId ? loadedMuseum : null;
  const museumLoadFailed = !!museumMeta && failedMuseumId === museumMeta.id;

  const commitCollectionFilter = useCallback((next: CollectionFilter) => {
    if (next.era || next.category || next.province) warm(loadCollectionResults);
    window.history.pushState({
      museumAtlas: true,
      level: navigationLevel(navigation),
      parentLevel: navigationLevel(navigation),
    } satisfies AtlasHistoryState, '', navigationUrl(navigation, next));
    setCollectionFilter(next);
  }, [navigation]);
  const closeCollection = useCallback(() => commitCollectionFilter(EMPTY_COLLECTION_FILTER), [commitCollectionFilter]);

  const pushNavigation = useCallback((next: NavigationState, collectionOrigin?: NavigationState) => {
    window.history.pushState({
      museumAtlas: true,
      level: navigationLevel(next),
      parentLevel: navigationLevel(navigation),
      ...(collectionOrigin ? { collectionOrigin } : {}),
    } satisfies AtlasHistoryState, '', navigationUrl(next, collectionFilter));
    setNavigation(next);
  }, [collectionFilter, navigation]);

  const replaceNavigation = useCallback((next: NavigationState) => {
    const current = (window.history.state ?? {}) as AtlasHistoryState;
    const parentLevel = current.parentLevel !== undefined
      && current.parentLevel < navigationLevel(next)
      ? current.parentLevel
      : undefined;
    window.history.replaceState({
      museumAtlas: true,
      level: navigationLevel(next),
      ...(parentLevel !== undefined ? { parentLevel } : {}),
      ...(next.museumId && current.collectionOrigin ? { collectionOrigin: current.collectionOrigin } : {}),
    } satisfies AtlasHistoryState, '', navigationUrl(next, collectionFilter));
    setNavigation(next);
  }, [collectionFilter]);

  const closeTo = useCallback((next: NavigationState) => {
    const targetLevel = navigationLevel(next);
    const current = (window.history.state ?? {}) as AtlasHistoryState;
    if (current.museumAtlas && current.parentLevel === targetLevel) {
      window.history.back();
      return;
    }
    replaceNavigation(next);
  }, [replaceNavigation]);

  const pickProvince = useCallback((name: string) => {
    warm(loadProvincePanel);
    closeCollection();
    // 入省即清空筛选，避免因朝代/类别过滤导致省内看似「没有内容」
    if (navigation.provinceName !== name || navigation.museumId) {
      pushNavigation({ provinceName: name, museumId: null, artifactId: null });
    }
    setEra(null);
    setCategory(null);
  }, [closeCollection, navigation.museumId, navigation.provinceName, pushNavigation]);

  const pickMuseum = useCallback((m: MuseumIndex) => {
    warm(loadMuseumDetail);
    warmMuseumPayload(m.id);
    pushNavigation({ provinceName: m.province, museumId: m.id, artifactId: null });
    setEra(null);
    setCategory(null);
  }, [pushNavigation]);

  const pickArtifact = useCallback((m: MuseumIndex, aid: string) => {
    warm(loadMuseumDetail);
    warmMuseumPayload(m.id);
    pushNavigation({ provinceName: m.province, museumId: m.id, artifactId: aid }, collectionOpen && !museumId ? navigation : undefined);
    setEra(collectionOpen ? collectionFilter.era : null);
    setCategory(collectionOpen ? collectionFilter.category : null);
  }, [collectionFilter.category, collectionFilter.era, collectionOpen, museumId, navigation, pushNavigation]);

  const closeProvince = useCallback(() => closeTo(EMPTY_NAVIGATION), [closeTo]);
  const closeMuseum = useCallback(() => closeTo({
    provinceName,
    museumId: null,
    artifactId: null,
  }), [closeTo, provinceName]);
  const closeArtifact = useCallback(() => {
    const origin = (window.history.state as AtlasHistoryState | null)?.collectionOrigin;
    closeTo(collectionOpen ? origin ?? EMPTY_NAVIGATION : { provinceName, museumId, artifactId: null });
  }, [closeTo, collectionOpen, museumId, provinceName]);

  useEffect(() => {
    if (!museumMeta || museum) return;
    let active = true;
    loadMuseumPayload(museumMeta.id).then(payload => {
      if (!active) return;
      setLoadedMuseum(payload);
      setFailedMuseumId(null);
    }).catch(() => {
      if (active) setFailedMuseumId(museumMeta.id);
    });
    return () => { active = false; };
  }, [museum, museumMeta]);

  useEffect(() => {
    const initial = readNavigation();
    const initialFilter = readCollectionFilter(window.location.search, PROVINCE_NAMES);
    window.history.replaceState({
      ...(window.history.state ?? {}),
      museumAtlas: true,
      level: navigationLevel(initial),
    } satisfies AtlasHistoryState, '', navigationUrl(initial, initialFilter));

    const onPopState = () => {
      setGuide(readGuideRoute(window.location.search));
      setNavigation(readNavigation());
      setCollectionFilter(readCollectionFilter(window.location.search, PROVINCE_NAMES));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (guide) return;
      if (e.key !== 'Escape') return;
      if (directoryOpen) setDirectoryOpen(false);
      else if (highlightArtifact) closeArtifact();
      else if (museumId) closeMuseum();
      else if (collectionOpen) closeCollection();
      else if (provinceName) closeProvince();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeArtifact, closeMuseum, closeProvince, closeCollection, collectionOpen, directoryOpen, guide, highlightArtifact, museumId, provinceName]);

  useEffect(() => {
    // 先让检索和目录完成首屏绘制；直达展厅时暂不铺陈全国卷轴。
    if (mapStarted || museumId || directoryOpen) return;
    const startMap = () => setMapStarted(true);
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (idleWindow.requestIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(startMap, { timeout: 650 });
      return () => idleWindow.cancelIdleCallback?.(idleId);
    }
    const timer = setTimeout(startMap, 120);
    return () => clearTimeout(timer);
  }, [directoryOpen, mapStarted, museumId]);

  return (
    <div className="atlas-shell relative h-dvh w-screen overflow-hidden bg-[#080a09] text-[#d8cfb7] select-none"
      data-intro-active={introActive || undefined}>
      <div
        className="relative h-full w-full"
        aria-hidden={directoryOpen || guide || introActive ? true : undefined}
        inert={directoryOpen || guide || introActive ? true : undefined}
      >
      {mapStarted && !mapUnavailable && (
        <MapErrorBoundary onError={() => setMapUnavailable(true)}>
          <Suspense fallback={null}>
            <ScrollMapScene
              provinces={provinces}
              museums={museums}
              selectedProvince={provinceName}
              onSelectProvince={pickProvince}
              onSelectMuseum={pickMuseum}
              onHoverCoord={updateCoordinates}
              onReady={onMapReady}
              paused={!!museumId || directoryOpen || collectionOpen || !!guide}
            />
          </Suspense>
        </MapErrorBoundary>
      )}

      {/* 手卷外的漆案氛围层：只承担景深和展陈框架，不拦截地图操作。 */}
      {!museumId && (
        <div className="atlas-atmosphere pointer-events-none absolute inset-0 z-[1]" aria-hidden="true">
          <div className="atlas-light-wash" />
          <div className="atlas-map-frame" />
        </div>
      )}

      {/* ── 加载画卷 ── */}
      {!ready && !museumId && !mapUnavailable && (
        <div className="atlas-loading pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 pt-28" role="status" aria-live="polite">
          <div className="atlas-loading-seal h-16 w-16 flex items-center justify-center">
            <span className="font-brush text-4xl text-[#f5eeda] leading-none pt-1">博</span>
          </div>
          <div className="text-center">
            <div className="font-brush text-3xl text-[#e7dfc9] tracking-wider">华夏博物志</div>
            <div className="mt-1 font-mono text-[8px] tracking-[0.42em] text-[#b49a63]/70">THE MUSEUM HANDSCROLL</div>
          </div>
          <div className="relative h-px w-52 overflow-hidden bg-[#d8cfb7]/10">
            <div className="absolute inset-y-0 left-0 w-1/3 bg-[#b49a63] animate-[loadSweep_1.6s_ease-in-out_infinite]" />
          </div>
          <div className="font-mono text-[12px] tracking-[0.3em] text-[#efe6cf]/40">
            {mapStarted ? '正在铺陈舆图…' : '正在取卷研墨…'}
          </div>
          <button
            type="button"
            onClick={() => setDirectoryOpen(true)}
            onPointerEnter={() => warm(loadRegionDirectory)}
            onFocus={() => warm(loadRegionDirectory)}
            className="pointer-events-auto border border-[#efe6cf]/25 px-4 py-2 font-mono text-[12px] tracking-wider text-[#efe6cf]/60 transition-colors active:bg-[#d43a28] active:text-[#0d0c09] hover:border-[#d43a28] hover:text-[#efe6cf]"
          >展卷期间，先看全国目录</button>
        </div>
      )}

      {mapUnavailable && !museumId && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[#0b0a07] px-6 pt-24 text-center" role="alert">
          <div className="font-brush text-2xl text-[#efe6cf]">舆图暂未展开</div>
          <p className="max-w-sm text-sm leading-relaxed text-[#efe6cf]/55">当前设备未能展开卷轴，博物馆目录和全部文物仍可正常浏览。</p>
          <div className="flex flex-wrap justify-center gap-3">
            <button type="button" onClick={() => { warm(loadRegionDirectory); setDirectoryOpen(true); }}
              className="min-h-11 border border-[#d43a28] px-5 py-2.5 font-mono text-xs text-[#d43a28] active:bg-[#d43a28] active:text-[#0d0c09]">打开全国目录</button>
            <button type="button" onClick={() => window.location.reload()}
              className="min-h-11 border border-[#efe6cf]/25 px-5 py-2.5 font-mono text-xs text-[#efe6cf]/65">重新铺开舆图</button>
          </div>
        </div>
      )}

      {/* ── 顶栏：印章 + 题名 + 检索 ── */}
      <header className="atlas-topbar absolute left-0 right-0 top-0 z-20">
        <div className="atlas-command-row flex flex-wrap items-center gap-x-5 gap-y-2 px-4 md:px-6 py-2.5">
          <div className="atlas-brand flex items-center gap-3 shrink-0">
            <div className="atlas-brand-seal h-9 w-9 md:h-10 md:w-10 flex items-center justify-center">
              <span className="font-brush text-xl md:text-2xl text-[#f5eeda] leading-none pt-0.5">博</span>
            </div>
            <div>
              <div className="atlas-brand-title font-brush text-lg md:text-xl leading-tight tracking-wide text-[#e7dfc9]">华夏博物志</div>
              <div className="atlas-brand-subtitle font-mono text-[8px] tracking-[0.32em] text-[#b49a63]/60">山河入画 · 循迹寻珍</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDirectoryOpen(true)}
            onPointerEnter={() => warm(loadRegionDirectory)}
            onFocus={() => warm(loadRegionDirectory)}
            className="draw-btn atlas-directory-button atlas-nav-tab ml-auto shrink-0 px-2.5 py-2 font-mono text-[12px] tracking-wider transition-colors md:ml-0 md:px-3"
          >
            <span className="md:hidden">目录</span>
            <span className="hidden md:inline">九州名录</span>
          </button>
          <button type="button" onClick={() => navigateGuide({ trailId:null, storyId:null })}
            onPointerEnter={() => warm(loadStoryExperience)} onFocus={() => warm(loadStoryExperience)}
            className="draw-btn atlas-nav-tab atlas-story-tab shrink-0 min-h-11 border border-[#b49a63]/50 px-3 text-xs text-[#e3cb9c]" aria-label="打开故事导览">故事游线</button>
          <div className="atlas-search-slot flex flex-1 justify-center max-md:order-3 max-md:basis-full">
            <SearchBar museums={museums} onPickMuseum={pickMuseum} onPickArtifact={pickArtifact} />
          </div>
          <div className="atlas-census hidden lg:block shrink-0 font-mono text-[12px] text-[#efe6cf]/50 text-right leading-relaxed">
            <div><b className="text-[#b49a63]">{museums.length}</b> 馆 / <b className="text-[#b49a63]">{artifactTotal}</b> 件</div>
            <div>一轴山河 · 万物有声</div>
          </div>
        </div>
        <div className="atlas-filter-row rule-double px-4 md:px-6 py-1.5">
          <div className="flex items-center gap-2">
            <select
              aria-label="选择省份"
              value={collectionOpen ? collectionFilter.province ?? '' : provinceName ?? ''}
              onChange={(event) => {
                if (collectionOpen) commitCollectionFilter({ ...collectionFilter, province: event.target.value || null });
                else if (event.target.value) pickProvince(event.target.value);
                else closeProvince();
              }}
              className="atlas-province-select min-h-11 min-w-0 flex-1 md:flex-none md:w-40 bg-[#0d0c09] border border-[#efe6cf]/25 text-[#efe6cf] text-xs px-2 py-1.5 outline-none focus:border-[#d43a28]"
            >
              <option value="">{collectionOpen ? '全国文物' : '选择省份'}</option>
              {provinces.map((item) => (
                <option key={item.name} value={item.name}>{item.name}</option>
              ))}
            </select>
            <FilterBar era={collectionFilter.era} category={collectionFilter.category}
              onEra={(value) => commitCollectionFilter({ ...collectionFilter, era: value })}
              onCategory={(value) => commitCollectionFilter({ ...collectionFilter, category: value })} />
          </div>
        </div>
      </header>

      {/* ── 左侧竖排题记 ── */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none hidden lg:block">
        <div className="v-text font-serif text-[13px] text-[#efe6cf]/30">
          山河作序 · 博物致知
        </div>
      </div>
      {/* ── 右侧竖排年份 ── */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none hidden lg:block">
        <div className="v-text font-mono text-[12px] text-[#efe6cf]/25">
          THE MUSEUM HANDSCROLL · EST. 2026
        </div>
      </div>

      {/* ── 底部标尺 + 坐标 ── */}
      <footer className="atlas-footer absolute left-0 right-0 bottom-0 z-20">
        <div className="ruler h-2.5 opacity-70" />
        <div className="flex items-center justify-between px-5 py-1.5 font-mono text-[12px]">
          <MapCoordinates ref={coordinatesRef} />
          <div className="hidden md:flex items-center gap-4 text-[#efe6cf]/45">
            <span>轻点省份入卷 · 悬停阅览经纬 · 真实省界</span>
            <span className="text-[#d43a28]">■</span>
            <span>手绘长卷 · {mapQuality ? `${MAP_QUALITY_LABEL[mapQuality]}画质` : '自适应画质'}</span>
          </div>
          <div className="ml-auto text-[12px] text-[#efe6cf]/38 md:hidden">
            轻触朱印 · 一步入卷
            {mapQuality && <span className="ml-2 text-[#d43a28]">{MAP_QUALITY_LABEL[mapQuality]}</span>}
          </div>
          {/* ── 右下角署名 + 访客记录入口 ── */}
          <a id="visitor-link" href="./visitor-records/">访客实地记录</a>
          <span id="author">作者：德里克文</span>
        </div>
      </footer>

      {/* ── 故事引路笺 ── */}
      {!provinceName && ready && !collectionOpen && (
        <aside className="atlas-curator-note atlas-story-beacon absolute z-10 md:left-8 md:bottom-16 md:max-w-[300px]" data-beacon-story={beaconPick.id}>
          <div className="atlas-story-eyebrow"><span /> {beaconPick.eyebrow}</div>
          <h2>现场看过它</h2>
          <p>照片来自展厅。</p>
          <button type="button"
            onPointerEnter={() => warm(loadStoryExperience)} onFocus={() => warm(loadStoryExperience)}
            onClick={() => navigateGuide({ trailId: defaultTrailId(beaconPick.id), storyId: beaconPick.id })}>
            <span>{beaconPick.cta}</span><b aria-hidden="true">↗</b>
          </button>
          <div className="atlas-story-hint">也可轻触卷中省界或朱印，按地域寻馆</div>
        </aside>
      )}

      {/* ── 省份侧栏 ── */}
      {province && !museumId && !collectionOpen && (
        <DeferredErrorBoundary resetKey={`province:${province.name}`} fallback={<DeferredLayer failed zIndex={35} title="省卷未能展开" detail="当前位置仍保留。可以重新载入，或返回全国舆图。" onExit={closeProvince} />}>
        <Suspense fallback={<DeferredLayer zIndex={35} title="正在展开省卷" detail="先保留舆图与当前位置，名录载入后会在同一处展开。" />}><ProvincePanel
          province={province}
          museums={museums}
          onPickMuseum={pickMuseum}
          onClose={closeProvince}
        /></Suspense></DeferredErrorBoundary>
      )}

      {collectionOpen && (
        <DeferredErrorBoundary resetKey={`collection:${collectionFilter.era ?? ''}:${collectionFilter.category ?? ''}:${collectionFilter.province ?? ''}`} fallback={<DeferredLayer failed zIndex={35} title="全国文物暂未载入" detail="筛选条件仍保留在地址中，重新载入后可继续。" onExit={closeCollection} />}>
        <Suspense fallback={<DeferredLayer zIndex={35} title="正在检索全国文物" detail="筛选条件已经保存，正在按朝代、类别和省份展开结果。" />}><CollectionResults museums={museums} provinces={provinces} filter={collectionFilter}
          onFilter={commitCollectionFilter} onOpen={pickArtifact} onClose={closeCollection} hidden={!!museumId} /></Suspense></DeferredErrorBoundary>
      )}

      {/* ── 深夜展厅 ── */}
      {museumMeta && !museum && !museumLoadFailed && (
        <DeferredLayer zIndex={55} title="正在取回馆藏资料" detail="只载入当前博物馆的完整文物描述；地址、筛选和阅读位置保持不动。" />
      )}
      {museumMeta && museumLoadFailed && (
        <DeferredLayer failed zIndex={55} title="馆藏资料暂未载入" detail="当前博物馆和文物地址仍保留。网络恢复后重新载入即可回到这里，或返回上一层。" onExit={closeMuseum} />
      )}
      {museum && (
        <DeferredErrorBoundary resetKey={`museum:${museum.id}:${highlightArtifact ?? ''}`} fallback={<DeferredLayer failed zIndex={55} title="展厅暂未载入" detail="馆藏位置和筛选仍在地址中，重新载入后可回到这里。" onExit={closeMuseum} />}>
        <Suspense fallback={<DeferredLayer zIndex={55} title="正在布置展厅" detail="馆藏资料与图像说明按需载入，舆图不会重复下载。" />}><MuseumDetail
          key={museum.id}
          museum={museum}
          museums={museums}
          era={era}
          category={category}
          onEra={setEra}
          onCategory={setCategory}
          artifactId={highlightArtifact}
          suspended={!!guide}
          onReadStory={(id) => { warm(loadStoryExperience); navigateGuide({ trailId: defaultTrailId(id), storyId: id }); }}
          onOpenArtifact={(artifactId, replace = false) => {
            const next = { provinceName: museum.province, museumId: museum.id, artifactId };
            if (replace || highlightArtifact) replaceNavigation(next);
            else pushNavigation(next);
          }}
          onCloseArtifact={closeArtifact}
          onBack={closeMuseum}
          onNavigate={(nextMuseum) => {
            warmMuseumPayload(nextMuseum.id);
            replaceNavigation({ provinceName: nextMuseum.province, museumId: nextMuseum.id, artifactId: null });
          }}
        /></Suspense></DeferredErrorBoundary>
      )}
      </div>

      {ENABLE_INK_INTRO && <IntroGate
          contentReady={ready || mapUnavailable}
          businessActive={Boolean(provinceName || museumId || collectionOpen || guide || directoryOpen)}
          onActiveChange={setIntroActive}
        />}

      {guide && <DeferredErrorBoundary resetKey={`guide:${guide.trailId ?? ''}:${guide.storyId ?? ''}`} fallback={<DeferredLayer failed zIndex={80} title="故事卷暂未载入" detail="故事地址与原来的筛选、详情位置都已保留。" onExit={exitGuide} />}><Suspense fallback={<DeferredLayer zIndex={80} title="故事正在展开" detail="正在取回故事正文与资料索引；原来的地图、筛选和阅读位置保持不动。" />}>
        <StoryExperience key={`${guide.trailId ?? 'all'}:${guide.storyId ?? 'directory'}`} route={guide} onRoute={navigateGuide} onExit={exitGuide} onBack={backGuide} />
      </Suspense></DeferredErrorBoundary>}

      {directoryOpen && (
        <DeferredErrorBoundary resetKey="directory" fallback={<DeferredLayer failed zIndex={65} title="全国目录暂未载入" detail="舆图与筛选仍保持原状，可以重新载入或关闭目录。" onExit={() => setDirectoryOpen(false)} />}>
        <Suspense fallback={<DeferredLayer zIndex={65} title="正在展开全国目录" detail="先铺开稳定的卷面，再按地区写入博物馆名录。" />}><RegionDirectory
          provinces={provinces}
          museums={museums}
          selectedProvince={provinceName}
          onPickProvince={(name) => {
            setDirectoryOpen(false);
            pickProvince(name);
          }}
          onClose={() => setDirectoryOpen(false)}
        /></Suspense></DeferredErrorBoundary>
      )}
    </div>
  );
}
