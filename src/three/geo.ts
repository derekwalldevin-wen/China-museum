// 地理与地形模块：经纬度→世界坐标投影、风格化高程函数
// 国土/省界裁剪改由 provinceGeo.ts 基于真实 GeoJSON 的栅格蒙版完成

export const LNG_MIN = 72;
export const LNG_MAX = 136;
export const LAT_MIN = 16;
export const LAT_MAX = 55;
export const LNG_C = (LNG_MIN + LNG_MAX) / 2; // 104
export const LAT_C = (LAT_MIN + LAT_MAX) / 2; // 35.5

export const WORLD_W = 140;
export const WORLD_D = 88;

/** 经度纬度 → 世界坐标 (x, z) */
export function project(lng: number, lat: number): [number, number] {
  const x = ((lng - LNG_C) / (LNG_MAX - LNG_MIN)) * WORLD_W;
  const z = ((LAT_C - lat) / (LAT_MAX - LAT_MIN)) * WORLD_D;
  return [x, z];
}

/** 世界坐标 → 经纬度 */
export function unproject(x: number, z: number): [number, number] {
  const lng = LNG_C + (x / WORLD_W) * (LNG_MAX - LNG_MIN);
  const lat = LAT_C - (z / WORLD_D) * (LAT_MAX - LAT_MIN);
  return [lng, lat];
}

/** 平滑 value noise */
function hash(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function smoothNoise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  return (
    hash(xi, yi) * (1 - u) * (1 - v) +
    hash(xi + 1, yi) * u * (1 - v) +
    hash(xi, yi + 1) * (1 - u) * v +
    hash(xi + 1, yi + 1) * u * v
  );
}
function fbm(x: number, y: number, octaves = 4): number {
  let v = 0, amp = 0.55, fx = x, fy = y;
  for (let i = 0; i < octaves; i++) {
    v += smoothNoise(fx, fy) * amp;
    fx *= 2.1; fy *= 2.1; amp *= 0.5;
  }
  return v;
}

/** 高斯隆起 */
function bump(lng: number, lat: number, cLng: number, cLat: number, rLng: number, rLat: number, amp: number): number {
  const dx = (lng - cLng) / rLng;
  const dy = (lat - cLat) / rLat;
  return amp * Math.exp(-(dx * dx + dy * dy));
}

/** 山脊噪声（脊线状起伏） */
function ridge(lng: number, lat: number, scale: number, amp: number): number {
  const n = fbm(lng * scale, lat * scale, 3);
  return (1 - Math.abs(n * 2 - 1)) * amp;
}

/**
 * 风格化高程（不含国土裁剪；裁剪由蒙版处理）。
 * 西部高耸（青藏高原），向东三级阶梯下降，叠加山脉、盆地与丘陵细节。
 */
export function terrainHeight(lng: number, lat: number): number {
  let h = 0;
  // 大格局：西高东低
  h += ((135 - lng) / 62) * 0.9;
  // 青藏高原主体
  h += bump(lng, lat, 88, 33, 14, 5.5, 3.4);
  // 喜马拉雅南缘
  h += bump(lng, lat, 84, 28.5, 10, 2.2, 1.6);
  // 横断山脉（南北向脊线带）
  h += bump(lng, lat, 99, 28, 2.2, 4.5, 1.5);
  // 天山
  h += bump(lng, lat, 86, 42.5, 7, 1.6, 1.3);
  // 阿尔泰
  h += bump(lng, lat, 90, 48.5, 4, 1.4, 1.0);
  // 帕米尔
  h += bump(lng, lat, 75.5, 38, 2.5, 2, 2.2);
  // 昆仑山脊
  h += bump(lng, lat, 84, 36, 8, 1.4, 1.4);
  // 祁连山
  h += bump(lng, lat, 99, 38.5, 3.5, 1.2, 1.0);
  // 塔里木盆地
  h -= bump(lng, lat, 83, 40.5, 7, 2.2, 1.5);
  // 准噶尔盆地
  h -= bump(lng, lat, 86, 45.5, 5, 1.8, 0.9);
  // 柴达木盆地
  h -= bump(lng, lat, 95, 37.5, 4, 1.8, 0.9);
  // 黄土高原
  h += bump(lng, lat, 110, 37, 4.5, 2.5, 0.9);
  // 云贵高原
  h += bump(lng, lat, 103, 26, 4, 2.2, 0.85);
  // 四川盆地
  h -= bump(lng, lat, 106, 30.5, 3.5, 2, 1.0);
  // 秦岭山脊
  h += bump(lng, lat, 108.5, 33.8, 3, 0.9, 0.8);
  // 太行山脊
  h += bump(lng, lat, 113.8, 37.8, 1.8, 1.8, 0.5);
  // 大兴安岭
  h += bump(lng, lat, 122, 48, 2.5, 3, 0.7);
  // 台湾中央山脉 / 海南五指山
  h += bump(lng, lat, 121, 23.8, 0.9, 1.6, 0.9);
  h += bump(lng, lat, 109.8, 18.9, 0.8, 0.7, 0.5);

  // 山地肌理：高海拔区域叠加脊线细节
  const macro = h;
  h += ridge(lng, lat, 0.30, 0.35) * Math.min(1, macro / 2);
  h += ridge(lng, lat, 0.75, 0.16) * Math.min(1, macro / 2.5);
  // 东南丘陵细碎起伏
  if (lng > 108 && lat < 33) {
    h += fbm(lng * 0.35, lat * 0.35) * 0.55;
  }
  // 全局肌理
  h += fbm(lng * 0.22, lat * 0.22) * 0.5;
  h += fbm(lng * 0.9, lat * 0.9, 3) * 0.14;

  return Math.max(0, h);
}

/** 异域地貌高度：低缓的水墨丘陵，低于中国山势以突出主体 */
export function foreignHeight(lng: number, lat: number): number {
  let h = fbm(lng * 0.16, lat * 0.16, 4) * 1.7;
  h += ridge(lng, lat, 0.45, 0.55);
  h += fbm(lng * 0.7, lat * 0.7, 3) * 0.25;
  return h;
}

export const HEIGHT_SCALE = 4.2;
export const MAX_HEIGHT = 5.2;
