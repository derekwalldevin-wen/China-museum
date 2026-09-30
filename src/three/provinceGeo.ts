// 基于真实省级 GeoJSON 的地理蒙版与边界线数据
// 数据来源：阿里云 DataV areas_v3（公开数据集），已按 3 位小数精简

import chinaJson from '../data/china-provinces.json';
import { LNG_MIN, LNG_MAX, LAT_MIN, LAT_MAX } from './geo';

export interface ProvinceGeo {
  name: string;
  rings: [number, number][][];
}

interface RawFeature {
  properties: { name: string };
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] };
}

const W = 1024;
const H = Math.round((W * (LAT_MAX - LAT_MIN)) / (LNG_MAX - LNG_MIN)); // ≈624

export interface ChinaGeo {
  provinces: ProvinceGeo[];
  /** 经纬度 → 省份序号（1 起），0 表示境外/海上 */
  sample: (lng: number, lat: number) => number;
  /** 边缘羽化系数 0..1，用于地形在国界处平滑落地 */
  feather: (lng: number, lat: number) => number;
  /** 中国陆地柔化画布，供标准/节能档直接生成近岸海色 */
  shoreCanvas: HTMLCanvasElement;
}

let cache: ChinaGeo | null = null;

export function getChinaGeo(): ChinaGeo {
  if (cache) return cache;

  const features = (chinaJson as { features: RawFeature[] }).features;
  const provinces: ProvinceGeo[] = features.map((f) => {
    const rings: [number, number][][] = [];
    if (f.geometry.type === 'Polygon') {
      for (const ring of f.geometry.coordinates as number[][][]) {
        rings.push(ring.map((c) => [c[0], c[1]] as [number, number]));
      }
    } else {
      for (const poly of f.geometry.coordinates as number[][][][]) {
        for (const ring of poly) rings.push(ring.map((c) => [c[0], c[1]] as [number, number]));
      }
    }
    return { name: f.properties.name, rings };
  });

  const toPx = (lng: number, lat: number): [number, number] => [
    ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * W,
    ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * H,
  ];
  const paint = (ctx: CanvasRenderingContext2D, colorOf: (i: number) => string) => {
    provinces.forEach((p, i) => {
      ctx.fillStyle = colorOf(i);
      for (const ring of p.rings) {
        ctx.beginPath();
        ring.forEach(([lng, lat], j) => {
          const [x, y] = toPx(lng, lat);
          if (j === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fill();
      }
    });
  };

  // ── 蒙版画布：每省一个索引色（R 通道 = 序号+1） ──
  const mask = document.createElement('canvas');
  mask.width = W; mask.height = H;
  const mctx = mask.getContext('2d', { willReadFrequently: true })!;
  mctx.fillStyle = '#000'; mctx.fillRect(0, 0, W, H);
  paint(mctx, (i) => `rgb(${i + 1},0,0)`);
  const maskData = mctx.getImageData(0, 0, W, H).data;

  // ── 羽化画布：整片国土纯白，模糊后取 R 通道做覆盖度 ──
  const white = document.createElement('canvas');
  white.width = W; white.height = H;
  const wctx = white.getContext('2d')!;
  wctx.fillStyle = '#000'; wctx.fillRect(0, 0, W, H);
  paint(wctx, () => '#fff');

  // 岸线只需窄羽化；地形需要更宽的缓坡，否则青藏高原会在国界处形成数据断崖。
  const soft = document.createElement('canvas');
  soft.width = W; soft.height = H;
  const sctx = soft.getContext('2d', { willReadFrequently: true })!;
  sctx.filter = 'blur(7px)';
  sctx.drawImage(white, 0, 0);

  const terrainSoft = document.createElement('canvas');
  terrainSoft.width = W; terrainSoft.height = H;
  const tsctx = terrainSoft.getContext('2d', { willReadFrequently: true })!;
  tsctx.filter = 'blur(24px)';
  tsctx.drawImage(white, 0, 0);
  const terrainSoftData = tsctx.getImageData(0, 0, W, H).data;
  const softR = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) softR[i] = terrainSoftData[i * 4] / 255;

  const toIdx = (lng: number, lat: number): number => {
    const x = Math.round(((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * (W - 1));
    const y = Math.round(((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * (H - 1));
    if (x < 0 || x >= W || y < 0 || y >= H) return -1;
    return y * W + x;
  };

  cache = {
    provinces,
    sample: (lng, lat) => {
      const i = toIdx(lng, lat);
      return i < 0 ? 0 : maskData[i * 4];
    },
    feather: (lng, lat) => {
      const i = toIdx(lng, lat);
      return i < 0 ? 0 : softR[i];
    },
    shoreCanvas: soft,
  };
  return cache;
}
