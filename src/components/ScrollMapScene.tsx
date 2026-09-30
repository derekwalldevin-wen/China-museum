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
        <span>华夏博物志 · 一卷山河</span>
        <strong>山河入画</strong>
        <p>循迹寻珍 · 轻触朱印入卷</p>
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
            </defs>

            <rect x="30" y="28" width="1060" height="624" rx="2" className="scroll-inner-rule" />
            <rect x="47" y="44" width="1026" height="592" className="scroll-grid" fill="url(#survey-grid)" />

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
