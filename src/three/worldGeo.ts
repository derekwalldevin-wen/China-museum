// 世界陆界蒙版：区分「中国 / 异域陆地 / 海洋」三个区域
// 数据来源：johan/world.geo.json（Natural Earth 110m 简化国界，公开数据集）
// 与 provinceGeo.ts 同分辨率的栅格蒙版，供地形与海洋 shader 共用

import worldJson from '../data/world-countries.json';
import { getChinaGeo } from './provinceGeo';
import { LNG_MIN, LNG_MAX, LAT_MIN, LAT_MAX } from './geo';

interface RawFeature {
  properties: { name: string };
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] };
}

const W = 1024;
const H = Math.round((W * (LAT_MAX - LAT_MIN)) / (LNG_MAX - LNG_MIN));

export interface WorldGeo {
  /** 经纬度 → 是否异域陆地（世界陆地且不在中国境内） */
  isForeignLand: (lng: number, lat: number) => boolean;
  /** 异域陆地边缘羽化 0..1（用于地形向海面平滑落地） */
  foreignFeather: (lng: number, lat: number) => number;
  /** 世界陆地 proximity 画布（陆地=白，深度模糊），供海洋 shader 做岸线渐变 */
  shoreCanvas: HTMLCanvasElement;
}

let cache: WorldGeo | null = null;

export function getWorldGeo(): WorldGeo {
  if (cache) return cache;

  const features = (worldJson as { features: RawFeature[] }).features;
  const toPx = (lng: number, lat: number): [number, number] => [
    ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * W,
    ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * H,
  ];

  // ── 世界陆地画布 ──
  const land = document.createElement('canvas');
  land.width = W; land.height = H;
  const lctx = land.getContext('2d')!;
  lctx.fillStyle = '#000'; lctx.fillRect(0, 0, W, H);
  lctx.fillStyle = '#fff';
  for (const f of features) {
    const polys = f.geometry.type === 'Polygon'
      ? [f.geometry.coordinates as number[][][]]
      : (f.geometry.coordinates as number[][][][]);
    for (const poly of polys) {
      for (const ring of poly) {
        lctx.beginPath();
        ring.forEach((c, j) => {
          const [x, y] = toPx(c[0], c[1]);
          if (j === 0) lctx.moveTo(x, y);
          else lctx.lineTo(x, y);
        });
        lctx.closePath();
        lctx.fill();
      }
    }
  }

  // ── 采样数据（锐利蒙版） ──
  const sctx = (() => {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d', { willReadFrequently: true })!;
    x.drawImage(land, 0, 0);
    return x;
  })();
  const landData = sctx.getImageData(0, 0, W, H).data;

  // ── 羽化蒙版（异域陆地边缘平滑） ──
  const soft = document.createElement('canvas');
  soft.width = W; soft.height = H;
  const fctx = soft.getContext('2d', { willReadFrequently: true })!;
  fctx.filter = 'blur(6px)';
  fctx.drawImage(land, 0, 0);
  const softData = fctx.getImageData(0, 0, W, H).data;
  const softR = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) softR[i] = softData[i * 4] / 255;

  // ── 岸线 proximity 画布（大半径模糊，供海洋 shader 使用） ──
  const shoreCanvas = document.createElement('canvas');
  shoreCanvas.width = W; shoreCanvas.height = H;
  const shctx = shoreCanvas.getContext('2d')!;
  shctx.filter = 'blur(16px)';
  shctx.drawImage(land, 0, 0);

  const toIdx = (lng: number, lat: number): number => {
    const x = Math.round(((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * (W - 1));
    const y = Math.round(((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * (H - 1));
    if (x < 0 || x >= W || y < 0 || y >= H) return -1;
    return y * W + x;
  };

  const china = getChinaGeo();

  cache = {
    isForeignLand: (lng, lat) => {
      const i = toIdx(lng, lat);
      if (i < 0) return false;
      return landData[i * 4] > 128 && china.sample(lng, lat) === 0;
    },
    foreignFeather: (lng, lat) => {
      const i = toIdx(lng, lat);
      if (i < 0) return 0;
      return softR[i];
    },
    shoreCanvas,
  };
  return cache;
}
