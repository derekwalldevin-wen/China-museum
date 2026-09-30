import { useEffect, useMemo, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import type { MuseumIndex, ProvinceMeta } from '../data/types';

interface ScrollMapSceneProps {
  provinces: ProvinceMeta[];
  museums: MuseumIndex[];
  selectedProvince: string | null;
  onSelectProvince: (name: string) => void;
  onSelectMuseum: (museum: MuseumIndex) => void;
  onHoverCoord: (lng: number, lat: number, inside: boolean) => void;
  onReady?: (quality: 'high' | 'standard' | 'low') => void;
  paused?: boolean;
}

interface RawFeature {
  properties: { name: string };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

const VIEW_W = 1120;
const VIEW_H = 680;
const LNG_MIN = 72;
const LNG_MAX = 136;
const LAT_MIN = 16;
const LAT_MAX = 55;
const MAP_X = 104;
const MAP_Y = 74;
const MAP_W = 894;
const MAP_H = 526;

const project = ([lng, lat]: [number, number]): [number, number] => [
  MAP_X + ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * MAP_W,
  MAP_Y + ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * MAP_H,
];

function ringsOf(feature: RawFeature): number[][][] {
  if (feature.geometry.type === 'Polygon') return feature.geometry.coordinates as number[][][];
  return (feature.geometry.coordinates as number[][][][]).flat();
}

function featurePath(feature: RawFeature) {
  return ringsOf(feature).map((ring) => ring.map((coord, index) => {
    const [x, y] = project([coord[0], coord[1]]);
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ') + ' Z').join(' ');
}

const LABEL_OFFSETS: Record<string, [number, number]> = {
  北京市: [13, -15], 天津市: [24, 8], 上海市: [23, 4], 重庆市: [18, 8],
  香港特别行政区: [65, -20], 澳门特别行政区: [65, 30],
};

const COMPACT_PROVINCES = new Set([
  '北京市', '天津市', '上海市', '香港特别行政区', '澳门特别行政区',
]);

const LABEL_TOUCH_RADIUS: Record<string, number> = {
  北京市: 20,
  天津市: 20,
  上海市: 20,
  重庆市: 18,
  香港特别行政区: 20,
  澳门特别行政区: 20,
};

const PALETTE = ['#8d9681', '#a5a98f', '#b2a486', '#89978f', '#b7aa92', '#99927b'];

type GeometryTier = 'standard' | 'compact';
type NavigatorWithHints = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean; effectiveType?: string };
};

function preferredGeometryTier(): GeometryTier {
  const hints = navigator as NavigatorWithHints;
  const constrainedNetwork = hints.connection?.saveData === true || ['slow-2g', '2g'].includes(hints.connection?.effectiveType ?? '');
  const constrainedDevice = (hints.deviceMemory ?? 8) <= 4 || navigator.hardwareConcurrency <= 4;
  return constrainedNetwork || constrainedDevice || window.matchMedia('(max-width: 767px)').matches ? 'compact' : 'standard';
}

export default function ScrollMapScene({
  provinces,
  museums,
  selectedProvince,
  onSelectProvince,
  onSelectMuseum,
  onHoverCoord,
  onReady,
  paused = false,
}: ScrollMapSceneProps) {
  const [geometryTier] = useState<GeometryTier>(preferredGeometryTier);
  const [rawFeatures, setRawFeatures] = useState<RawFeature[] | null>(null);
  const [geometryError, setGeometryError] = useState<unknown>(null);
  const [artLoaded, setArtLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    const request = geometryTier === 'compact'
      ? import('../data/china-provinces.compact.json')
      : import('../data/china-provinces.standard.json');
    request.then(module => {
      if (active) setRawFeatures((module.default as { features:RawFeature[] }).features);
    }).catch(error => { if (active) setGeometryError(error); });
    return () => { active = false; };
  }, [geometryTier]);
  const features = useMemo(() => (rawFeatures ?? [])
    .filter((feature) => feature.properties.name)
    .sort((a, b) => Number(COMPACT_PROVINCES.has(a.properties.name)) - Number(COMPACT_PROVINCES.has(b.properties.name)))
    .map((feature) => ({ name: feature.properties.name, path:featurePath(feature) })), [rawFeatures]);
  const museumCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const museum of museums) counts.set(museum.province, (counts.get(museum.province) ?? 0) + 1);
    return counts;
  }, [museums]);
  const provinceByName = useMemo(() => new Map(provinces.map((province) => [province.name, province])), [provinces]);
  const museumsInProvince = useMemo(
    () => selectedProvince ? museums.filter((museum) => museum.province === selectedProvince) : [],
    [museums, selectedProvince],
  );

  useEffect(() => {
    if (features.length === 0) return;
    const frame = requestAnimationFrame(() => onReady?.(geometryTier === 'compact' ? 'low' : 'standard'));
    return () => cancelAnimationFrame(frame);
  }, [features.length, geometryTier, onReady]);

  if (geometryError) throw geometryError;
  if (features.length === 0) return null;

  const activateProvince = (name: string) => {
    if (!paused) onSelectProvince(name);
  };

  const onProvinceKey = (event: KeyboardEvent<SVGGElement>, name: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activateProvince(name);
    }
  };

  const updateCoordinate = (event: PointerEvent<SVGElement>, inside: boolean) => {
    if (paused || event.pointerType === 'touch') return;
    const svg = event.currentTarget.ownerSVGElement ?? event.currentTarget as SVGSVGElement;
    const matrix = svg.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    const lng = LNG_MIN + ((point.x - MAP_X) / MAP_W) * (LNG_MAX - LNG_MIN);
    const lat = LAT_MAX - ((point.y - MAP_Y) / MAP_H) * (LAT_MAX - LAT_MIN);
    onHoverCoord(lng, lat, inside);
  };

  return (
    <main className={`scroll-map-scene${selectedProvince ? ' has-province' : ''}${paused ? ' is-paused' : ''}`} aria-label="华夏博物舆图">
      <div className="scroll-desk-glow" aria-hidden="true" />
      {!selectedProvince && <div className="scroll-mobile-prologue">
        <span>一卷山河 · 万物有声</span>
        <strong>循迹寻珍</strong>
        <p>轻触一枚朱印，走进一省的博物馆</p>
      </div>}
      <section className="scroll-shell" aria-label="可交互的中国博物馆手卷地图">
        <div className="scroll-roller scroll-roller-left" aria-hidden="true"><i /><i /></div>
        <div className="scroll-paper">
          <picture className="scroll-painted-backdrop" aria-hidden="true">
            <source media="(max-width: 600px)" srcSet="/art/shanhe-handscroll-mobile.jpg" />
            <img className={artLoaded ? 'is-loaded' : ''} src="/art/shanhe-handscroll-desktop.jpg" alt="" decoding="async" fetchPriority="low"
              onLoad={() => setArtLoaded(true)} onError={() => setArtLoaded(false)} />
          </picture>
          <svg
            className="scroll-svg"
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            preserveAspectRatio="xMidYMid meet"
            aria-label="按真实省界绘制的中国博物馆地图。轻点省份进入。"
            onPointerMove={(event) => updateCoordinate(event, false)}
            onPointerLeave={() => onHoverCoord(0, 0, false)}
          >
            <defs>
              <filter id="seal-bleed" x="-30%" y="-30%" width="160%" height="160%">
                <feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="2" seed="4" result="noise" />
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.2" />
              </filter>
              <pattern id="survey-grid" width="55" height="55" patternUnits="userSpaceOnUse">
                <path d="M55 0H0V55" fill="none" stroke="#675e49" strokeWidth="0.65" opacity="0.19" />
              </pattern>
              <linearGradient id="mountain-ink" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#35423d" stopOpacity=".58" />
                <stop offset="1" stopColor="#697069" stopOpacity=".05" />
              </linearGradient>
              <linearGradient id="mountain-mineral" x1="0" y1="0" x2="1" y2=".7">
                <stop offset="0" stopColor="#637a75" stopOpacity=".42" />
                <stop offset="1" stopColor="#8e927b" stopOpacity=".06" />
              </linearGradient>
              <radialGradient id="paper-moon">
                <stop offset="0" stopColor="#b99d63" stopOpacity=".28" />
                <stop offset=".72" stopColor="#b99d63" stopOpacity=".08" />
                <stop offset="1" stopColor="#b99d63" stopOpacity="0" />
              </radialGradient>
            </defs>

            <rect x="30" y="28" width="1060" height="624" rx="2" className="scroll-inner-rule" />
            <rect x="47" y="44" width="1026" height="592" className="scroll-grid" fill="url(#survey-grid)" />

            <g className="scroll-landscape" aria-hidden="true">
              <circle className="scroll-paper-moon" cx="886" cy="154" r="108" fill="url(#paper-moon)" />
              <path className="scroll-mountain-far" fill="url(#mountain-mineral)"
                d="M48 367C92 339 128 343 165 304c30-31 52-92 91-99 38-7 47 49 76 44 29-4 49-83 86-92 39-10 58 76 91 72 43-5 62-116 110-125 37-7 55 68 89 68 38 0 69-87 110-83 41 5 51 91 89 102 35 10 73-37 112-20 32 14 48 64 93 84v169H48Z" />
              <path className="scroll-mountain-mid" fill="url(#mountain-ink)"
                d="M48 468c48-7 77-58 122-68 34-7 59 26 87 15 45-18 66-103 113-99 43 3 52 90 91 92 40 2 59-81 101-80 38 1 50 74 84 78 39 4 69-86 113-85 38 1 60 70 92 77 41 9 74-50 116-38 31 9 50 52 105 67v119H48Z" />
              <path className="scroll-ridge-line" d="M67 449c65-34 92-17 137-70 36-42 50-120 88-131 31-9 48 38 70 33 31-8 45-76 82-90m249 151c28-36 45-90 80-92 32-1 48 47 77 43 29-5 45-57 79-64 36-7 58 39 92 46" />
              <path className="scroll-cloud" d="M116 233c31-22 72-22 104 0 21 15 45 17 72 3m-151 18c41-15 88-13 127 5M789 263c30-17 68-17 98 0 22 13 47 15 75 2m-129 19c35-13 76-11 109 4" />
              <g className="scroll-pavilion" transform="translate(958 183)">
                <path d="M-34 8H34M-27 8l9-13h36L27 8M-20 9v31m40-31v31M-27 41h54M-12 9v32M12 9v32" />
                <path d="M-43 7c12 2 17-2 25-12m61 12C31 9 26 5 18-5" />
              </g>
              <g className="scroll-pines" transform="translate(92 492)">
                <path d="M0 62V2m0 7-24 18h21M0 18l27 20H3M0 31l-34 22H0m0-5 29 18M58 71V30m0 4-17 13h15m2-4 20 15H59" />
              </g>
              <path className="scroll-foreground-bank" d="M48 594c86-26 166-13 239 8 70 20 143 22 216 2 72-19 142-16 211 4 82 24 185 24 358-19v47H48Z" />
            </g>

            <g className="scroll-title-block" aria-hidden="true">
              <text x="74" y="104" className="scroll-title-kicker">华 夏 博 物 志</text>
              <text x="74" y="153" className="scroll-title-main">山河入画</text>
              <path d="M74 169H268" />
              <text x="74" y="190" className="scroll-title-note">循一方水土 · 寻一件文明</text>
            </g>

            <g className="scroll-margin-script" aria-hidden="true">
              <text x="1044" y="104">观山河</text><text x="1022" y="104">知古今</text>
              <text x="1044" y="230">以物证史</text><text x="1022" y="230">以图通览</text>
            </g>

            <g className="scroll-provinces">
              {features.map(({ name, path }, index) => {
                const meta = provinceByName.get(name);
                const selected = selectedProvince === name;
                return (
                  <g
                    key={name}
                    role="button"
                    tabIndex={paused || !meta ? -1 : 0}
                    aria-label={`${name}${meta ? `，简称${meta.short}` : ''}，点击查看博物馆`}
                    aria-pressed={selected}
                    className={`scroll-province${selected ? ' is-selected' : ''}`}
                    onClick={() => meta && activateProvince(name)}
                    onKeyDown={(event) => meta && onProvinceKey(event, name)}
                    onPointerMove={(event) => {
                      event.stopPropagation();
                      updateCoordinate(event, true);
                    }}
                  >
                    <path
                      className="scroll-province-shape"
                      d={path}
                      fill={PALETTE[index % PALETTE.length]}
                      fillRule="evenodd"
                    />
                  </g>
                );
              })}
            </g>

            <g className="scroll-labels">
              {provinces.map((province) => {
                const [baseX, baseY] = project(province.center);
                const [dx, dy] = LABEL_OFFSETS[province.name] ?? [0, 0];
                const x = baseX + dx;
                const y = baseY + dy;
                const offset = dx !== 0 || dy !== 0;
                const selected = selectedProvince === province.name;
                const count = museumCounts.get(province.name) ?? 0;
                return (
                  <g
                    key={province.name}
                    role="button"
                    tabIndex={-1}
                    aria-label={`${province.name}，${count}座博物馆`}
                    aria-pressed={selected}
                    className={`scroll-label${selected ? ' is-selected' : ''}${offset ? ' has-leader' : ''}`}
                    transform={`translate(${x} ${y})`}
                    onClick={() => activateProvince(province.name)}
                    onKeyDown={(event) => onProvinceKey(event, province.name)}
                  >
                    {offset && <path className="scroll-label-leader" d={`M0 0L${-dx} ${-dy}`} />}
                    <circle className="scroll-label-hit" r={LABEL_TOUCH_RADIUS[province.name] ?? 10} />
                    <rect x="-11" y="-11" width="22" height="22" rx="1" className="scroll-label-seal" />
                    <text className="scroll-label-short" textAnchor="middle" dominantBaseline="central">{province.short}</text>
                    <text className="scroll-label-count" x="15" y="4">{count || '·'}</text>
                  </g>
                );
              })}
            </g>

            {selectedProvince && (
              <g className="scroll-museums" aria-label={`${selectedProvince}博物馆`}>
                {museumsInProvince.map((museum, index) => {
                  const [x, y] = project(museum.coord);
                  return (
                    <g
                      key={museum.id}
                      role="button"
                      tabIndex={paused ? -1 : 0}
                      aria-label={`进入${museum.name}`}
                      className="scroll-museum-marker"
                      transform={`translate(${x + index * 3} ${y - index * 3})`}
                      onClick={(event) => { event.stopPropagation(); if (!paused) onSelectMuseum(museum); }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          if (!paused) onSelectMuseum(museum);
                        }
                      }}
                    >
                      <circle className="scroll-museum-hit" r="22" />
                      <circle className="scroll-museum-ring" r="8" />
                      <circle className="scroll-museum-dot" r="3.2" />
                      <text x="12" y="-9">{museum.name}</text>
                    </g>
                  );
                })}
              </g>
            )}

            <g className="scroll-legend" aria-hidden="true">
              <text x="78" y="574">凡 省 级 行 政 区 三 十 四</text>
              <text x="78" y="596">藏 馆 {museums.length} · 珍 品 {museums.reduce((sum, museum) => sum + museum.artifacts.length, 0)} · 皆 可 入 卷</text>
              <path d="M78 610H326" />
            </g>
            <g className="scroll-collection-seal" transform="translate(1008 550) rotate(-4)" filter="url(#seal-bleed)" aria-hidden="true">
              <rect width="46" height="46" />
              <text x="23" y="18">博物</text><text x="23" y="35">致知</text>
            </g>
          </svg>
          {artLoaded && <small className="scroll-art-disclosure">山水画面为 AI 创作</small>}
        </div>
        <div className="scroll-roller scroll-roller-right" aria-hidden="true"><i /><i /></div>
      </section>
      <div className="scroll-scene-caption" aria-hidden="true">
        <span>山河有迹</span><i /><span>轻触朱印，循迹寻珍</span>
      </div>
    </main>
  );
}
