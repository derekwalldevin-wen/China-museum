import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import type { Museum, ProvinceMeta } from '../data/types';
import {
  project, unproject, terrainHeight,
  WORLD_W, WORLD_D, MAX_HEIGHT,
} from '../three/geo';
import { getChinaGeo } from '../three/provinceGeo';

interface Props {
  provinces: ProvinceMeta[];
  museums: Museum[];
  selectedProvince: string | null;
  onSelectProvince: (name: string) => void;
  onSelectMuseum: (m: Museum) => void;
  onHoverCoord: (lng: number, lat: number, inside: boolean) => void;
  onReady?: (quality: QualityTier) => void;
  onUnavailable?: () => void;
  paused?: boolean;
}

type QualityTier = 'high' | 'standard' | 'low';

interface QualityProfile {
  terrainSegments: [number, number];
  seaSegments: [number, number];
  maxPixelRatio: number;
  antialias: boolean;
  targetFps: number;
  cloudCount: number;
  postProcessing: boolean;
  ambientMotion: boolean;
  autoRotate: boolean;
}

const QUALITY_PROFILES: Record<QualityTier, QualityProfile> = {
  high: {
    terrainSegments: [420, 250], seaSegments: [80, 52], maxPixelRatio: 1.75,
    antialias: true, targetFps: 30, cloudCount: 0, postProcessing: true,
    ambientMotion: true, autoRotate: false,
  },
  standard: {
    terrainSegments: [260, 160], seaSegments: [48, 32], maxPixelRatio: 1.25,
    antialias: false, targetFps: 24, cloudCount: 0, postProcessing: false,
    ambientMotion: true, autoRotate: false,
  },
  low: {
    terrainSegments: [160, 100], seaSegments: [24, 16], maxPixelRatio: 1,
    antialias: false, targetFps: 15, cloudCount: 0, postProcessing: false,
    ambientMotion: false, autoRotate: false,
  },
};

function detectQualityTier(): QualityTier {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const constrainedNetwork = nav.connection?.saveData
    || ['slow-2g', '2g', '3g'].includes(nav.connection?.effectiveType ?? '');
  const constrainedHardware = (nav.deviceMemory !== undefined && nav.deviceMemory <= 4)
    || (nav.hardwareConcurrency !== undefined && nav.hardwareConcurrency <= 4);

  if (reducedMotion || constrainedNetwork || constrainedHardware) return 'low';
  if (coarse || small) return 'standard';
  return 'high';
}

const OVERVIEW_POS = new THREE.Vector3(-5, 134, 62);
const OVERVIEW_TARGET = new THREE.Vector3(0, 0.8, 3);
const MICRO_RELIEF_MAX = 3.8;

// 东方夜航舆图：矿物青平原 → 赭金丘陵 → 暖灰高原 → 宣纸雪线
const RAMP: [number, string][] = [
  [0.0, '#2e4139'],
  [0.14, '#3d5145'],
  [0.3, '#52604a'],
  [0.48, '#686348'],
  [0.66, '#7e6b4b'],
  [0.8, '#8c7650'],
  [0.9, '#98815a'],
  [1.0, '#a48c65'],
];
function rampColor(t: number): THREE.Color {
  const c = new THREE.Color();
  for (let i = 1; i < RAMP.length; i++) {
    if (t <= RAMP[i][0] || i === RAMP.length - 1) {
      const [t0, c0] = RAMP[i - 1];
      const [t1, c1] = RAMP[i];
      const k = THREE.MathUtils.clamp((t - t0) / (t1 - t0), 0, 1);
      return c.set(c0).lerp(new THREE.Color(c1), k);
    }
  }
  return c.set(RAMP[0][1]);
}

const SE_GREEN = new THREE.Color('#52685a');
const NW_TAN = new THREE.Color('#776549');
function regionTint(col: THREE.Color, lng: number, lat: number, t: number): THREE.Color {
  const lowland = THREE.MathUtils.clamp(1 - t * 2.2, 0, 1);
  if (lng > 108 && lat < 32) col.lerp(SE_GREEN, 0.3 * lowland);
  if (lng < 97 && lat > 34) col.lerp(NW_TAN, 0.28 * lowland);
  return col;
}

const HIGHLIGHT = new THREE.Color('#a93424');
const CONTOUR_GOLD = new THREE.Color('#b49a63');

// 港澳地理中心只相距约 0.6°，在沙盘总览中会落入同一点击区域。
// 屏幕偏移只作用于标记，不改动真实地形与相机目标；引线负责保留地理指向。
const PROVINCE_MARKER_OFFSETS: Record<string, { x: number; y: number }> = {
  '香港特别行政区': { x: 24, y: -12 },
  '澳门特别行政区': { x: -24, y: 10 },
};

// 异域地貌水墨色带：深墨远山，刻意压低对比以衬托中国沙盘
const INK: [number, string][] = [
  [0.0, '#151d1b'],
  [0.45, '#202b29'],
  [0.8, '#2e3c39'],
  [1.0, '#40504b'],
];
function inkColor(t: number): THREE.Color {
  const c = new THREE.Color();
  for (let i = 1; i < INK.length; i++) {
    if (t <= INK[i][0] || i === INK.length - 1) {
      const [t0, c0] = INK[i - 1];
      const [t1, c1] = INK[i];
      const k = THREE.MathUtils.clamp((t - t0) / (t1 - t0), 0, 1);
      return c.set(c0).lerp(new THREE.Color(c1), k);
    }
  }
  return c.set(INK[0][1]);
}
const SEAFLOOR = new THREE.Color('#080f0f');

/** 国界与海岸处必须真正落地，避免高海拔边疆形成数据断崖。 */
function terrainFeather(feather: number): number {
  // 蒙版边界处的模糊值约为 0.5；先重映射为真正的 0，再平滑抬升。
  return Math.pow(THREE.MathUtils.smoothstep(feather, 0.48, 0.98), 1.3);
}

/** 把真实感高程压缩为纸上浅浮雕：保留山河次序，不保留戏剧化峰谷。 */
function microReliefHeight(lng: number, lat: number, feather: number): number {
  const normalized = THREE.MathUtils.clamp(terrainHeight(lng, lat) / MAX_HEIGHT, 0, 1);
  return Math.pow(normalized, 0.74) * MICRO_RELIEF_MAX * terrainFeather(feather);
}

/** 地球曲面：离图心越远越缓缓下沉（单位：世界坐标） */
function globeSag(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const s = Math.max(0, r - 50);
  return (s * s) / 160;
}

/** 地图矩形边缘雾化系数：边缘 0 → 向内 7 单位处 1 */
function edgeFade(x: number, z: number): number {
  const d = Math.min(70 - Math.abs(x), 44 - Math.abs(z));
  return THREE.MathUtils.smoothstep(d, 0, 7);
}

// ── 程序化海洋 shader ────────────────────────────────────
const OCEAN_VERT = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorld;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    // 地球曲面：与地形同一公式，远处海平线向下弯曲
    float r = length(wp.xz);
    float s = max(0.0, r - 50.0);
    wp.y -= s * s / 160.0;
    wp.y += sin(wp.x * 0.18 + uTime * 0.34) * 0.055
          + sin(wp.z * 0.24 - uTime * 0.27) * 0.045;
    vWorld = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;
const OCEAN_FRAG = /* glsl */ `
  uniform float uTime;
  uniform sampler2D uShore;
  varying vec3 vWorld;
  void main() {
    vec2 uv = vec2((vWorld.x + 70.0) / 140.0, 1.0 - (vWorld.z + 44.0) / 88.0);
    float shore = 0.0;
    if (uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) {
      shore = texture2D(uShore, uv).r;
    }
    // 墨海分色：远洋墨黑 → 近岸矿物青，避免科幻蓝光。
    vec3 deep = vec3(0.006, 0.009, 0.008);
    vec3 mid  = vec3(0.016, 0.026, 0.021);
    float shoreInk = smoothstep(0.36, 0.58, shore);
    vec3 col = mix(deep, mid, shoreInk * 0.35);
    // 两层缓慢墨纹，只保留掠过纸面的微光。
    float w1 = sin(vWorld.x * 0.19 + uTime * 0.28) * sin(vWorld.z * 0.23 - uTime * 0.22);
    float w2 = sin((vWorld.x - vWorld.z) * 0.09 + uTime * 0.16);
    col += vec3(0.003, 0.005, 0.004) * (w1 * 0.5 + 0.5) * (0.3 + 0.7 * shoreInk);
    col += vec3(0.002, 0.004, 0.003) * (w2 * 0.5 + 0.5);
    // 岸线月白光带（非常克制的呼吸感）
    float foamBand = smoothstep(0.40, 0.50, shore) * (1.0 - smoothstep(0.52, 0.66, shore));
    float foamAnim = 0.72 + 0.28 * sin(uTime * 0.65 + vWorld.x * 0.72 + vWorld.z * 0.42);
    col += vec3(0.10, 0.10, 0.075) * foamBand * foamAnim * 0.012;
    // 不绘制规则碎钻点阵，让墨海保持安静的大片负空间。
    // 掠射角天光
    vec3 V = normalize(cameraPosition - vWorld);
    float fres = pow(1.0 - clamp(V.y, 0.0, 1.0), 2.0);
    col += vec3(0.003, 0.005, 0.004) * fres;
    // 手动雾：远处海洋溶入墨夜空间
    float fdist = distance(vWorld, cameraPosition);
    col = mix(col, vec3(0.008, 0.010, 0.009), smoothstep(145.0, 360.0, fdist));
    gl_FragColor = vec4(col, 1.0);
  }
`;

// ── 终调 shader：暖墨分级 + 暗角 + 纸张细颗粒 ────────────
const GRADE_SHADER = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec2 uRes;
    varying vec2 vUv;
    void main() {
      vec2 d = vUv - 0.5;
      float r2 = dot(d, d);
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      // 阴影轻偏矿物青，高光轻偏宣纸暖色。
      float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(col * vec3(0.91, 1.0, 0.95), col * vec3(1.04, 1.0, 0.91), smoothstep(0.14, 0.72, luma));
      // 暗角
      float vig = 1.0 - smoothstep(0.32, 0.95, r2 * 1.6);
      col *= mix(0.68, 1.0, vig);
      // 胶片颗粒
      float g = fract(sin(dot(vUv * uRes + mod(uTime * 60.0, 1000.0), vec2(12.9898, 78.233))) * 43758.5453);
      col += (g - 0.5) * 0.018;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

// 江河控制点（风格化示意，非精确水道）
const RIVERS: Record<string, [number, number][]> = {
  '黄河': [[96.0, 34.9], [99.0, 35.9], [101.5, 36.1], [103.8, 36.0], [104.9, 37.2], [106.8, 39.0], [108.8, 40.1], [110.8, 40.3], [111.9, 39.3], [112.3, 38.2], [111.6, 36.8], [110.9, 35.4], [110.2, 34.6], [111.5, 34.8], [113.6, 34.9], [115.6, 35.6], [117.0, 36.7], [118.4, 37.3], [119.0, 37.7]],
  '长江': [[91.0, 33.2], [94.5, 33.4], [97.2, 33.1], [99.8, 31.6], [99.2, 28.6], [100.4, 26.6], [102.2, 26.0], [104.6, 28.9], [106.2, 29.4], [107.8, 30.0], [109.8, 30.8], [111.4, 30.7], [113.9, 30.6], [115.9, 29.8], [117.8, 30.6], [119.8, 31.8], [121.8, 31.9]],
};

function makePaperTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 200 + Math.random() * 55;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(18, 12);
  return tex;
}

function makeCloudTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const ctx = c.getContext('2d')!;
  for (let i = 0; i < 22; i++) {
    const x = 40 + Math.random() * 176;
    const y = 40 + Math.random() * 48;
    const r = 18 + Math.random() * 34;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(239,230,207,0.16)');
    g.addColorStop(1, 'rgba(239,230,207,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 128);
  }
  return new THREE.CanvasTexture(c);
}

export default function TerrainScene(props: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef(new Map<string, HTMLElement>());
  const propsRef = useRef(props);

  useEffect(() => {
    propsRef.current = props;
  }, [props]);

  const flightRef = useRef<{
    fromPos: THREE.Vector3; toPos: THREE.Vector3;
    fromTg: THREE.Vector3; toTg: THREE.Vector3;
    t: number; dur: number;
  } | null>(null);

  const apiRef = useRef<{
    flyTo: (pos: THREE.Vector3, tg: THREE.Vector3) => void;
    recolor: (province: string | null) => void;
    highlightBorders: (province: string | null) => void;
  } | null>(null);

  // 竖屏（手机）时把总览相机沿视线方向拉远，保证国土完整入画
  const overviewPos = () => {
    const el = mountRef.current;
    const aspect = el ? el.clientWidth / Math.max(1, el.clientHeight) : 1.6;
    const k = aspect < 1 ? Math.min(1.9, 1.12 / aspect) : 1;
    return OVERVIEW_POS.clone().multiplyScalar(k);
  };

  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    api.recolor(props.selectedProvince);
    api.highlightBorders(props.selectedProvince);
    if (!props.selectedProvince) {
      api.flyTo(overviewPos(), OVERVIEW_TARGET.clone());
      return;
    }
    const p = props.provinces.find((x) => x.name === props.selectedProvince);
    if (!p) return;
    const geo = getChinaGeo();
    const [x, z] = project(p.center[0], p.center[1]);
    const y = microReliefHeight(p.center[0], p.center[1], geo.feather(p.center[0], p.center[1]))
      - globeSag(x, z);
    // 竖屏时面板在底部，把观察目标向南偏移，让省份显示在画面偏上
    const el = mountRef.current;
    const portrait = el ? el.clientWidth < el.clientHeight : false;
    const dz = portrait ? 13 : 0;
    const tg = new THREE.Vector3(x, y + 1.5, z + dz);
    api.flyTo(new THREE.Vector3(x + 6, y + (portrait ? 58 : 52), z + 30 + dz), tg);
  }, [props.selectedProvince, props.provinces]);

  useEffect(() => {
    let teardown: (() => void) | undefined;

    const initialize = async () => {
    const mount = mountRef.current!;
    const markerRefs = chipRefs.current;
    const geo = getChinaGeo();

    // ── 画质分级：设备能力、节流偏好与输入方式共同决定 ────────
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const tier = detectQualityTier();
    const profile = QUALITY_PROFILES[tier];
    // 微地形版本只保留中国轮廓与墨色负空间，不再下载周边世界地貌。
    let needsRender = true;
    let disposed = false;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: profile.antialias,
        powerPreference: tier === 'high' ? 'high-performance' : 'low-power',
      });
    } catch {
      propsRef.current.onUnavailable?.();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, profile.maxPixelRatio));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.domElement.style.touchAction = 'none';
    mount.appendChild(renderer.domElement);
    // 上下文丢失时保留页面与导航状态，交给目录作为可靠降级路径。
    const onContextLost = (e: Event) => {
      e.preventDefault();
      propsRef.current.onUnavailable?.();
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#080a09');
    scene.fog = new THREE.Fog('#080a09', 145, 355);

    const camera = new THREE.PerspectiveCamera(42, mount.clientWidth / mount.clientHeight, 0.1, 1200);
    camera.position.copy(overviewPos());

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(OVERVIEW_TARGET);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 14;
    controls.maxDistance = 260;
    controls.maxPolarAngle = Math.PI * 0.46;
    controls.minPolarAngle = Math.PI * 0.1;
    controls.rotateSpeed = coarse ? 0.55 : 0.8;
    controls.zoomSpeed = coarse ? 0.7 : 1;
    controls.panSpeed = coarse ? 0.65 : 1;

    // 用户停止操作 9 秒后才启用缓慢自转；任何新操作或相机飞行都会立即停止自转。
    let lastInteract = performance.now();
    const noteInteraction = () => {
      lastInteract = performance.now();
      controls.autoRotate = false;
      needsRender = true;
    };
    controls.addEventListener('start', noteInteraction);
    controls.addEventListener('end', noteInteraction);

    // ── 灯光：展厅沙盘打光 ─────────────────────────────────
    scene.add(new THREE.HemisphereLight('#d8cfb7', '#151a16', 1.16));
    scene.add(new THREE.AmbientLight('#302b20', 0.38));
    const sun = new THREE.DirectionalLight('#e3cfaa', 0.74);
    sun.position.set(46, 112, 62);
    scene.add(sun);
    const fill = new THREE.DirectionalLight('#78918b', 0.26);
    fill.position.set(-58, 76, 54);
    scene.add(fill);
    const rim = new THREE.DirectionalLight('#b49a63', 0.14);
    rim.position.set(-68, 52, -36);
    scene.add(rim);

    // ── 高度辅助：中国微地形 + 墨海地球曲面 ───────────────
    const heightAt = (lng: number, lat: number): number => {
      const [x, z] = project(lng, lat);
      let h = 0;
      const idx = geo.sample(lng, lat);
      if (idx > 0) {
        const f = geo.feather(lng, lat);
        h = microReliefHeight(lng, lat, f);
      }
      return h - globeSag(x, z);
    };

    // ── 地形（平滑手绘 + 宣纸颗粒） ────────────────────────
    const [SEG_X, SEG_Z] = profile.terrainSegments;
    const tGeo = new THREE.PlaneGeometry(WORLD_W, WORLD_D, SEG_X, SEG_Z);
    tGeo.rotateX(-Math.PI / 2);
    const posAttr = tGeo.attributes.position as THREE.BufferAttribute;
    const vCount = posAttr.count;
    const colors = new Float32Array(vCount * 3);
    const provIdx = new Uint8Array(vCount);
    const baseColors = new Float32Array(vCount * 3);
    for (let i = 0; i < vCount; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const [lng, lat] = unproject(x, z);
      const idx = geo.sample(lng, lat);
      provIdx[i] = idx;
      const h = heightAt(lng, lat);
      posAttr.setY(i, h);
      let col: THREE.Color;
      if (idx > 0) {
        // 中国：八级矿物层染 + 极细金色等高线。
        const relief = Math.max(0, h + globeSag(x, z));
        const t = THREE.MathUtils.clamp(relief / MICRO_RELIEF_MAX, 0, 1);
        const layer = Math.floor(t * 8) / 8;
        const layeredT = THREE.MathUtils.lerp(t, layer, 0.12);
        col = regionTint(rampColor(layeredT), lng, lat, t);
        const phase = (t * 8) % 1;
        const contourDistance = Math.min(phase, 1 - phase);
        if (t > 0.13 && contourDistance < 0.045) {
          col.lerp(CONTOUR_GOLD, (1 - contourDistance / 0.045) * 0.17);
        }
      } else if (h > 0) {
        // 异域陆地：青灰水墨远山，图缘处颜色同步雾化为海床色
        col = inkColor(THREE.MathUtils.clamp(h / 5.2, 0, 1));
        const ef = edgeFade(x, z);
        if (ef < 1) col.lerp(SEAFLOOR, 1 - ef);
      } else {
        // 海床（藏于海面之下，供岸线过渡）
        col = SEAFLOOR.clone();
      }
      baseColors[i * 3] = col.r; baseColors[i * 3 + 1] = col.g; baseColors[i * 3 + 2] = col.b;
      colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b;
    }
    tGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    tGeo.computeVertexNormals();
    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: false,
      roughness: 0.96,
      metalness: 0,
      emissive: '#0b0a06',
      emissiveIntensity: 0.12,
      bumpMap: makePaperTexture(),
      bumpScale: 0.18,
    });
    terrainMat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying float vAtlasHeight;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAtlasHeight = transformed.y;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vAtlasHeight;')
        .replace('#include <color_fragment>', /* glsl */ `
          #include <color_fragment>
          float atlasHeight = max(vAtlasHeight, 0.0);
          float atlasPhase = fract(atlasHeight * 1.52);
          float atlasDistance = min(atlasPhase, 1.0 - atlasPhase);
          float atlasContour = 1.0 - smoothstep(0.012, 0.032, atlasDistance);
          atlasContour *= smoothstep(0.45, 1.15, atlasHeight);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.706, 0.604, 0.388), atlasContour * 0.085);
        `);
    };
    terrainMat.customProgramCacheKey = () => 'micro-relief-layered-contours-v1';
    const terrain = new THREE.Mesh(tGeo, terrainMat);
    scene.add(terrain);

    // ── 程序化海洋（波浪 + 岸线渐变 + 微光） ───────────────
    const shoreTex = new THREE.CanvasTexture(geo.shoreCanvas);
    const oceanMat = new THREE.ShaderMaterial({
      vertexShader: OCEAN_VERT,
      fragmentShader: OCEAN_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uShore: { value: shoreTex },
      },
    });
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(WORLD_W * 6, WORLD_D * 6, profile.seaSegments[0], profile.seaSegments[1]),
      oceanMat);
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = 0.3;
    scene.add(sea);

    // ── 省份边界（月白墨线） ───────────────────────────────
    const borderMats = new Map<string, THREE.LineBasicMaterial>();
    const bordersGroup = new THREE.Group();
    for (const p of geo.provinces) {
      if (!p.name) continue;
      const mat = new THREE.LineBasicMaterial({
        color: '#d8cfb7', transparent: true, opacity: 0.15 });
      const segPts: THREE.Vector3[] = [];
      for (const ring of p.rings) {
        const sampled: THREE.Vector3[] = [];
        for (let i = 0; i < ring.length; i += 2) {
          const [lng, lat] = ring[i];
          const [x, z] = project(lng, lat);
          sampled.push(new THREE.Vector3(x, heightAt(lng, lat) + 0.1, z));
        }
        for (let i = 0; i < sampled.length; i++) {
          segPts.push(sampled[i], sampled[(i + 1) % sampled.length]);
        }
      }
      bordersGroup.add(new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(segPts), mat));
      borderMats.set(p.name, mat);
    }
    scene.add(bordersGroup);

    // ── 江河墨带 ───────────────────────────────────────────
    const riverMat = new THREE.LineBasicMaterial({
      color: '#b49a63', transparent: true, opacity: 0.52 });
    for (const pts of Object.values(RIVERS)) {
      const dense: THREE.Vector3[] = [];
      const push = (lng: number, lat: number) => {
        if (geo.sample(lng, lat) === 0) return;
        const [x, z] = project(lng, lat);
        dense.push(new THREE.Vector3(x, heightAt(lng, lat) + 0.09, z));
      };
      for (let i = 0; i + 1 < pts.length; i++) {
        const [a, b] = [pts[i], pts[i + 1]];
        const steps = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.25));
        for (let s = 0; s <= steps; s++) {
          push(a[0] + ((b[0] - a[0]) * s) / steps, a[1] + ((b[1] - a[1]) * s) / steps);
        }
      }
      // 断开跨水域的段
      let run: THREE.Vector3[] = [];
      const runs: THREE.Vector3[][] = [];
      for (const p of dense) {
        const [lng, lat] = unproject(p.x, p.z);
        if (geo.sample(lng, lat) > 0) { run.push(p); }
        else if (run.length > 1) { runs.push(run); run = []; } else { run = []; }
      }
      if (run.length > 1) runs.push(run);
      for (const r of runs) {
        scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(r), riverMat));
      }
    }

    // ── 经纬网（更淡） ─────────────────────────────────────
    const gridMat = new THREE.LineBasicMaterial({ color: '#d8cfb7', transparent: true, opacity: 0.018 });
    const gridGroup = new THREE.Group();
    const gridLine = (pts: THREE.Vector3[]) =>
      gridGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([...pts]), gridMat));
    for (let lng = 76; lng <= 136; lng += 4) {
      const pts: THREE.Vector3[] = [];
      for (let lat = 17; lat <= 55; lat += 0.4) {
        if (geo.sample(lng, lat) === 0) { if (pts.length > 1) gridLine(pts); pts.length = 0; continue; }
        const [x, z] = project(lng, lat);
        pts.push(new THREE.Vector3(x, heightAt(lng, lat) + 0.06, z));
      }
      if (pts.length > 1) gridLine(pts);
    }
    for (let lat = 18; lat <= 54; lat += 4) {
      const pts: THREE.Vector3[] = [];
      for (let lng = 72; lng <= 136; lng += 0.4) {
        if (geo.sample(lng, lat) === 0) { if (pts.length > 1) gridLine(pts); pts.length = 0; continue; }
        const [x, z] = project(lng, lat);
        pts.push(new THREE.Vector3(x, heightAt(lng, lat) + 0.06, z));
      }
      if (pts.length > 1) gridLine(pts);
    }
    scene.add(gridGroup);

    // ── 流云 ───────────────────────────────────────────────
    const cloudTex = makeCloudTexture();
    const clouds: THREE.Sprite[] = [];
    const cloudSeeds: [number, number, number][] = [
      [-38, 22, 6], [-48, 26, -10], [-28, 24, 16], [-18, 26, -20], [30, 20, -6], [52, 18, 14],
    ];
    const activeCloudSeeds = cloudSeeds.slice(0, profile.cloudCount);
    for (const [cx, cy, cz] of activeCloudSeeds) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: cloudTex, transparent: true, opacity: tier === 'high' ? 0.18 : 0.1, depthWrite: false,
      }));
      sp.position.set(cx, cy, cz);
      sp.scale.set(26 + Math.random() * 16, 10 + Math.random() * 6, 1);
      scene.add(sp);
      clouds.push(sp);
    }

    // ── 省份高亮 ───────────────────────────────────────────
    const colorAttr = tGeo.attributes.color as THREE.BufferAttribute;
    const tmp = new THREE.Color();
    function recolor(province: string | null) {
      const selIdx = province
        ? geo.provinces.findIndex((p) => p.name === province) + 1
        : 0;
      for (let i = 0; i < vCount; i++) {
        let r = baseColors[i * 3], g = baseColors[i * 3 + 1], b = baseColors[i * 3 + 2];
        if (selIdx && provIdx[i] === selIdx) {
          tmp.setRGB(r, g, b).lerp(HIGHLIGHT, 0.32);
          r = tmp.r; g = tmp.g; b = tmp.b;
        } else if (selIdx && provIdx[i] > 0) {
          r *= 0.66; g *= 0.66; b *= 0.66;
        }
        colorAttr.setXYZ(i, r, g, b);
      }
      colorAttr.needsUpdate = true;
    }
    function highlightBorders(province: string | null) {
      borderMats.forEach((mat, name) => {
        if (province && name === province) {
          mat.opacity = 1;
          mat.color.set('#c14b37');
        } else {
          mat.opacity = province ? 0.08 : 0.15;
          mat.color.set('#d8cfb7');
        }
      });
    }

    // ── 交互 ───────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const activePointers = new Set<number>();
    let tapCandidate: {
      pointerId: number;
      x: number;
      y: number;
      startedAt: number;
      cancelled: boolean;
    } | null = null;
    let hoverRaf = 0;

    function pickTerrainAt(clientX: number, clientY: number): THREE.Intersection | null {
      const r = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - r.left) / r.width) * 2 - 1;
      pointer.y = -((clientY - r.top) / r.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObject(terrain)[0] ?? null;
    }

    const onPointerDown = (e: PointerEvent) => {
      activePointers.add(e.pointerId);
      noteInteraction();
      if (activePointers.size === 1) {
        tapCandidate = {
          pointerId: e.pointerId,
          x: e.clientX,
          y: e.clientY,
          startedAt: performance.now(),
          cancelled: false,
        };
      } else if (tapCandidate) {
        tapCandidate.cancelled = true;
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      if (tapCandidate?.pointerId === e.pointerId) {
        const tolerance = e.pointerType === 'touch' ? 14 : 6;
        if (Math.hypot(e.clientX - tapCandidate.x, e.clientY - tapCandidate.y) > tolerance) {
          tapCandidate.cancelled = true;
        }
      }
      // 触摸没有悬停语义；跳过射线检测与 React 坐标更新。
      if (e.pointerType === 'touch' || hoverRaf) return;
      const x = e.clientX;
      const y = e.clientY;
      hoverRaf = requestAnimationFrame(() => {
        hoverRaf = 0;
        const hit = pickTerrainAt(x, y);
        if (!hit) return;
        const [lng, lat] = unproject(hit.point.x, hit.point.z);
        propsRef.current.onHoverCoord(lng, lat, geo.sample(lng, lat) > 0);
      });
    };
    const onPointerUp = (e: PointerEvent) => {
      activePointers.delete(e.pointerId);
      const candidate = tapCandidate;
      if (!candidate || candidate.pointerId !== e.pointerId) return;
      tapCandidate = null;
      const moved = Math.hypot(e.clientX - candidate.x, e.clientY - candidate.y);
      const tolerance = e.pointerType === 'touch' ? 14 : 6;
      if (candidate.cancelled || activePointers.size > 0 || moved > tolerance
        || performance.now() - candidate.startedAt > 650) return;
      const hit = pickTerrainAt(e.clientX, e.clientY);
      if (!hit) return;
      const [lng, lat] = unproject(hit.point.x, hit.point.z);
      const idx = geo.sample(lng, lat);
      if (idx === 0) return;
      const name = geo.provinces[idx - 1]?.name;
      if (name) propsRef.current.onSelectProvince(name);
    };
    const onPointerCancel = (e: PointerEvent) => {
      activePointers.delete(e.pointerId);
      if (tapCandidate?.pointerId === e.pointerId) tapCandidate = null;
    };
    const onPointerLeave = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') propsRef.current.onHoverCoord(0, 0, false);
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointercancel', onPointerCancel);
    renderer.domElement.addEventListener('pointerleave', onPointerLeave);

    // ── 后期管线：基础首帧先可用，高画质随后异步增强 ─────────
    let composer: {
      render: () => void;
      setSize: (width: number, height: number) => void;
      dispose: () => void;
    } | null = null;
    let gradePass: ShaderPass | null = null;

    if (profile.postProcessing) {
      void Promise.all([
        import('three/examples/jsm/postprocessing/EffectComposer.js'),
        import('three/examples/jsm/postprocessing/RenderPass.js'),
        import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
        import('three/examples/jsm/postprocessing/ShaderPass.js'),
        import('three/examples/jsm/postprocessing/OutputPass.js'),
      ]).then(([effectModule, renderModule, bloomModule, shaderModule, outputModule]) => {
        if (disposed) return;
        const nextComposer = new effectModule.EffectComposer(renderer);
        nextComposer.setPixelRatio(renderer.getPixelRatio());
        nextComposer.setSize(mount.clientWidth, mount.clientHeight);
        nextComposer.addPass(new renderModule.RenderPass(scene, camera));
        nextComposer.addPass(new bloomModule.UnrealBloomPass(
          new THREE.Vector2(mount.clientWidth / 2, mount.clientHeight / 2),
          0.18, 0.34, 0.9));
        nextComposer.addPass(new outputModule.OutputPass());
        const nextGradePass = new shaderModule.ShaderPass(GRADE_SHADER);
        nextGradePass.uniforms.uRes.value.set(
          mount.clientWidth * renderer.getPixelRatio(),
          mount.clientHeight * renderer.getPixelRatio());
        nextComposer.addPass(nextGradePass);
        composer = nextComposer;
        gradePass = nextGradePass;
        needsRender = true;
      }).catch(() => {
        // 后期增强失败时继续使用基础 renderer，不影响地图可操作性。
      });
    }

    // ── 相机飞行 ───────────────────────────────────────────
    apiRef.current = {
      recolor, highlightBorders,
      flyTo(pos: THREE.Vector3, tg: THREE.Vector3) {
        noteInteraction();
        flightRef.current = {
          fromPos: camera.position.clone(), toPos: pos,
          fromTg: controls.target.clone(), toTg: tg,
          t: 0, dur: 1.7,
        };
      },
    };

    // ── 标记投影 ───────────────────────────────────────────
    const projVec = new THREE.Vector3();
    function updateMarkers() {
      markerRefs.forEach((el, key) => {
        const [kind, id] = key.split('|');
        let lngLat: [number, number] | null = null;
        if (kind === 'p') {
          const p = propsRef.current.provinces.find((x) => x.name === id);
          if (p) lngLat = p.center;
        } else {
          const m = propsRef.current.museums.find((x) => x.id === id);
          if (m) lngLat = m.coord;
        }
        if (!lngLat) { el.style.display = 'none'; return; }
        const [x, z] = project(lngLat[0], lngLat[1]);
        const y = heightAt(lngLat[0], lngLat[1]);
        projVec.set(x, y + (kind === 'p' ? 2.2 : 1.4), z).project(camera);
        if (projVec.z > 1) { el.style.display = 'none'; return; }
        const offset = kind === 'p' ? PROVINCE_MARKER_OFFSETS[id] : undefined;
        const sx = (projVec.x * 0.5 + 0.5) * mount.clientWidth + (offset?.x ?? 0);
        const sy = (-projVec.y * 0.5 + 0.5) * mount.clientHeight + (offset?.y ?? 0);
        el.style.display = '';
        el.style.transform = `translate(-50%, -100%) translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)`;
      });
    }

    // ── 渲染循环：按设备限帧，节能档静止时完全休眠 ─────────
    let raf = 0;
    let readySent = false;
    const startedAt = performance.now();
    let lastRenderAt = startedAt - (1000 / profile.targetFps);
    const frameInterval = 1000 / profile.targetFps;
    function tick(now = performance.now()) {
      raf = requestAnimationFrame(tick);
      // 博物馆全屏详情或后台标签页中保留场景状态，但暂停昂贵的合成渲染。
      if ((propsRef.current.paused || document.hidden) && readySent) return;
      const elapsedSinceRender = now - lastRenderAt;
      if (!needsRender && elapsedSinceRender < frameInterval) return;
      const dt = Math.min(elapsedSinceRender / 1000, 0.05);
      const elapsed = (now - startedAt) / 1000;
      if (profile.ambientMotion) {
        // 极轻的掠光让微地形被感知，不制造舞台式明暗起伏。
        sun.intensity = 0.72 + Math.sin(elapsed * 0.16) * 0.035;
      }
      const fl = flightRef.current;
      if (fl) {
        fl.t += dt / fl.dur;
        const k = fl.t >= 1 ? 1 : fl.t < 0.5
          ? 4 * fl.t * fl.t * fl.t
          : 1 - Math.pow(-2 * fl.t + 2, 3) / 2;
        camera.position.lerpVectors(fl.fromPos, fl.toPos, k);
        controls.target.lerpVectors(fl.fromTg, fl.toTg, k);
        if (fl.t >= 1) flightRef.current = null;
      } else if (profile.autoRotate && now - lastInteract > 9000) {
        controls.autoRotate = true; // 待机缓旋
      }
      const controlsChanged = controls.update();
      const ambientActive = profile.ambientMotion && tier !== 'low';
      const shouldRender = needsRender || !!fl || controlsChanged || controls.autoRotate
        || activePointers.size > 0 || ambientActive || !readySent;
      if (!shouldRender) return;
      if (!needsRender && elapsedSinceRender < frameInterval) return;
      lastRenderAt = now;
      // 海洋波浪时间
      oceanMat.uniforms.uTime.value = elapsed;
      // 流云漂移
      for (const c of clouds) {
        c.position.x += dt * 0.55;
        if (c.position.x > 90) c.position.x = -90;
      }
      updateMarkers();
      if (gradePass) gradePass.uniforms.uTime.value = elapsed;
      if (composer) composer.render();
      else renderer.render(scene, camera);
      needsRender = false;
      if (!readySent) { readySent = true; propsRef.current.onReady?.(tier); }
    }
    tick();

    const ro = new ResizeObserver(() => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      // 竖屏放宽视场角，避免国土两侧被裁切
      camera.fov = camera.aspect < 1 ? 56 : 42;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      composer?.setSize(mount.clientWidth, mount.clientHeight);
      gradePass?.uniforms.uRes.value.set(
        mount.clientWidth * renderer.getPixelRatio(),
        mount.clientHeight * renderer.getPixelRatio());
      needsRender = true;
    });
    ro.observe(mount);

    teardown = () => {
      disposed = true;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(hoverRaf);
      ro.disconnect();
      controls.removeEventListener('start', noteInteraction);
      controls.removeEventListener('end', noteInteraction);
      controls.dispose();
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointercancel', onPointerCancel);
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      composer?.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      markerRefs.clear();
    };
    };

    void initialize().catch(() => propsRef.current.onUnavailable?.());
    return () => {
      teardown?.();
    };
  }, []);

  const museumCountByProvince = new Map<string, number>();
  for (const m of props.museums) {
    museumCountByProvince.set(m.province, (museumCountByProvince.get(m.province) ?? 0) + 1);
  }

  return (
    <div
      className={`absolute inset-0 ${props.paused ? 'pointer-events-none' : ''}`}
      aria-hidden={props.paused ? true : undefined}
      inert={props.paused ? true : undefined}
    >
      <div ref={mountRef} className="absolute inset-0" />
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {props.provinces.map((p) => {
          const count = museumCountByProvince.get(p.name) ?? 0;
          const active = props.selectedProvince === p.name;
          const hidden = !!props.selectedProvince && !active;
          const markerOffset = PROVINCE_MARKER_OFFSETS[p.name];
          const connectorAngle = markerOffset
            ? Math.atan2(-markerOffset.y, -markerOffset.x) * 180 / Math.PI
            : 0;
          return (
            <button
              type="button"
              aria-label={`${p.name}，收录 ${count} 家博物馆`}
              data-province-marker={p.name}
              key={`p|${p.name}`}
              ref={(el) => { if (el) chipRefs.current.set(`p|${p.name}`, el); else chipRefs.current.delete(`p|${p.name}`); }}
              className={`atlas-province-marker absolute left-0 top-0 pointer-events-auto cursor-pointer select-none bg-transparent p-0 ${active ? 'is-active' : ''} ${hidden ? 'is-hidden' : ''} ${markerOffset ? 'has-offset' : ''}`}
              onClick={() => props.onSelectProvince(p.name)}
            >
              {markerOffset && (
                <span
                  aria-hidden="true"
                  className="atlas-marker-connector pointer-events-none absolute bottom-0 left-1/2 h-px origin-left"
                  style={{
                    width: Math.hypot(markerOffset.x, markerOffset.y),
                    transform: `rotate(${connectorAngle}deg)`,
                  }}
                />
              )}
              <div className="atlas-marker-stack">
                <span aria-hidden="true" className="atlas-marker-orbit" />
                <span className="atlas-marker-seal">
                  <span className="atlas-marker-short">{p.short}</span>
                </span>
                <span className="atlas-marker-stem" />
                <span className="atlas-marker-count">{String(count).padStart(2, '0')}</span>
              </div>
            </button>
          );
        })}
        {props.selectedProvince &&
          props.museums.filter((m) => m.province === props.selectedProvince).map((m) => (
            <button
              type="button"
              aria-label={`进入${m.name}`}
              key={`m|${m.id}`}
              ref={(el) => { if (el) chipRefs.current.set(`m|${m.id}`, el); else chipRefs.current.delete(`m|${m.id}`); }}
              className="atlas-museum-marker absolute left-0 top-0 pointer-events-auto cursor-pointer select-none bg-transparent p-3 group"
              onClick={() => props.onSelectMuseum(m)}
            >
              <div className="flex flex-col items-center">
                <div className="atlas-museum-beacon" />
                <div className="atlas-museum-label">
                  {m.name}
                </div>
              </div>
            </button>
          ))}
      </div>
    </div>
  );
}
