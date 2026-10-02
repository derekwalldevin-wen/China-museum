import { useEffect, useRef, useState } from 'react';
import {
  BufferGeometry,
  Float32BufferAttribute,
  OrthographicCamera,
  Points,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
} from 'three';

interface Props {
  onReady: () => void;
  onComplete: () => void;
  onFailure: () => void;
  onPhase: (phase: string) => void;
}

type IntroTestWindow = Window & {
  __HUAXIA_INTRO_TEST__?: { timeMs?: number };
};

const DURATION_MS = 2800;
const VERTEX_SHADER = `
  attribute float aSeed;
  attribute vec2 aDrift;
  uniform float uProgress;
  uniform float uPixelRatio;
  varying float vAlpha;
  varying float vSeed;
  void main() {
    float gather = smoothstep(0.08, 0.39, uProgress);
    float dissolve = smoothstep(0.57, 0.98, uProgress);
    vec3 point = position;
    point.xy += aDrift * (gather * 0.035 + dissolve * (0.28 + (position.z + 0.7) * 0.24));
    point.z += dissolve * (0.22 + aSeed * 0.26);
    vAlpha = gather * (1.0 - dissolve) * (0.2 + aSeed * 0.3);
    vSeed = aSeed;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(point, 1.0);
    gl_PointSize = (3.0 + 9.0 * aSeed) * uPixelRatio * (1.0 + point.z * 0.22);
  }
`;
const FRAGMENT_SHADER = `
  varying float vAlpha;
  varying float vSeed;
  void main() {
    vec2 point = gl_PointCoord - vec2(0.5);
    float angle = atan(point.y, point.x);
    float edge = length(point) + sin(angle * 5.0 + vSeed * 19.0) * 0.025;
    float opacity = (1.0 - smoothstep(0.16, 0.5, edge)) * vAlpha;
    if (opacity < 0.012) discard;
    vec3 ink = mix(vec3(0.12, 0.18, 0.16), vec3(0.43, 0.30, 0.19), step(0.86, vSeed));
    gl_FragColor = vec4(ink, opacity);
  }
`;

function phaseFor(timeMs: number) {
  if (timeMs < 350) return 'paper';
  if (timeMs < 1100) return 'ink';
  if (timeMs < 1800) return 'artifact';
  if (timeMs < 2100) return 'seal';
  return 'reveal';
}

function noise(seed: number) {
  const value = Math.sin(seed * 127.1 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function makeParticles(aspect: number, count: number) {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const drift = new Float32Array(count * 2);
  for (let index = 0; index < count; index += 1) {
    // A loose ink current follows the landscape rather than covering the title with uniform speckle.
    const along = noise(index + 1);
    const x = (along * 2 - 1) * aspect;
    const crest = -0.3 + Math.sin(along * Math.PI * 2.4) * 0.16;
    const spread = (noise(index + 817) + noise(index + 1297) - 1) * 0.32;
    const y = crest + spread;
    const depth = noise(index + 2411) * 1.4 - 0.7;
    const direction = -0.45 + (noise(index + 4201) - 0.5) * 1.4;
    positions.set([x, y, depth], index * 3);
    seeds[index] = noise(index + 9029);
    drift.set([Math.cos(direction), Math.sin(direction)], index * 2);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new Float32BufferAttribute(seeds, 1));
  geometry.setAttribute('aDrift', new Float32BufferAttribute(drift, 2));
  return geometry;
}

export default function InkScrollIntro({ onReady, onComplete, onFailure, onPhase }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const callbacksRef = useRef({ onReady, onComplete, onFailure, onPhase });
  const [rendererReady, setRendererReady] = useState(false);
  const [paintLoaded, setPaintLoaded] = useState(false);
  useEffect(() => {
    callbacksRef.current = { onReady, onComplete, onFailure, onPhase };
  }, [onComplete, onFailure, onPhase, onReady]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let stopped = false;
    let raf = 0;
    let currentPhase = '';
    let previousFrame = 0;
    let slowFrames = 0;
    let renderer: WebGLRenderer | null = null;
    let geometry: BufferGeometry | null = null;
    let material: ShaderMaterial | null = null;
    let observer: ResizeObserver | null = null;
    let canvas: HTMLCanvasElement | null = null;
    const startedAt = performance.now();
    const testWindow = window as IntroTestWindow;

    const cleanup = () => {
      if (stopped) return;
      stopped = true;
      cancelAnimationFrame(raf);
      observer?.disconnect();
      window.removeEventListener('huaxia:intro-test-time', onTestTime);
      canvas?.removeEventListener('webglcontextlost', onContextLost);
      geometry?.dispose();
      material?.dispose();
      renderer?.dispose();
      renderer?.forceContextLoss();
      canvas?.remove();
      host.style.removeProperty('--intro-progress');
    };
    const onContextLost = (event: Event) => {
      event.preventDefault();
      cleanup();
      callbacksRef.current.onFailure();
    };
    const onTestTime = () => {
      if (!raf && !stopped) raf = requestAnimationFrame(render);
    };

    const render = () => {
      raf = 0;
      if (stopped || !renderer || !material) return;
      const testTime = testWindow.__HUAXIA_INTRO_TEST__?.timeMs;
      const controlledFrame = typeof testTime === 'number';
      const now = performance.now();
      const timeMs = controlledFrame ? testTime : now - startedAt;
      const progress = Math.min(1, Math.max(0, timeMs / DURATION_MS));
      host.style.setProperty('--intro-progress', String(progress));
      material.uniforms.uProgress.value = progress;

      const nextPhase = phaseFor(timeMs);
      if (nextPhase !== currentPhase) {
        currentPhase = nextPhase;
        callbacksRef.current.onPhase(nextPhase);
      }
      if (timeMs >= DURATION_MS) {
        callbacksRef.current.onComplete();
        return;
      }
      if (!controlledFrame && previousFrame) {
        slowFrames = now - previousFrame > 40 ? slowFrames + 1 : 0;
        if (slowFrames >= 10) {
          callbacksRef.current.onFailure();
          return;
        }
      }
      previousFrame = now;
      renderer.render(scene, camera);
      if (!controlledFrame) raf = requestAnimationFrame(render);
    };

    const scene = new Scene();
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 4;

    try {
      canvas = document.createElement('canvas');
      canvas.className = 'ink-intro-particles';
      canvas.setAttribute('aria-hidden', 'true');
      canvas.dataset.webglIntro = 'particles';
      const context = canvas.getContext('webgl2', { alpha: true, antialias: false, powerPreference: 'low-power' });
      if (!context) throw new Error('WebGL2 unavailable');
      renderer = new WebGLRenderer({ canvas, context, alpha: true, antialias: false, powerPreference: 'low-power' });
      renderer.setClearColor(0x000000, 0);
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      const count = window.matchMedia('(max-width: 767px)').matches ? 240 : 520;
      geometry = makeParticles(width / height, count);
      canvas.dataset.particleCount = String(count);
      material = new ShaderMaterial({
        uniforms: { uProgress: { value: 0 }, uPixelRatio: { value: 1 } },
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        transparent: true,
        depthWrite: false,
      });
      scene.add(new Points(geometry, material));
      host.appendChild(canvas);
      canvas.addEventListener('webglcontextlost', onContextLost);

      const resize = () => {
        if (!renderer || !material || stopped) return;
        const nextWidth = Math.max(host.clientWidth, 1);
        const nextHeight = Math.max(host.clientHeight, 1);
        const maxPixels = window.innerWidth < 768 ? 600_000 : 1_500_000;
        const ratio = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(maxPixels / (nextWidth * nextHeight)));
        renderer.setPixelRatio(ratio);
        renderer.setSize(nextWidth, nextHeight, false);
        camera.left = -nextWidth / nextHeight;
        camera.right = nextWidth / nextHeight;
        camera.updateProjectionMatrix();
        material.uniforms.uPixelRatio.value = ratio;
      };
      observer = new ResizeObserver(resize);
      observer.observe(host);
      resize();
      renderer.render(scene, camera);
      setRendererReady(true);
      callbacksRef.current.onReady();
      performance.mark('huaxia:intro:motion-ready');
      window.addEventListener('huaxia:intro-test-time', onTestTime);
      raf = requestAnimationFrame(render);
    } catch {
      cleanup();
      callbacksRef.current.onFailure();
    }
    return cleanup;
  }, []);

  return <div ref={hostRef} className="ink-intro-motion" data-intro-motion aria-hidden="true">
    {rendererReady && <picture className="ink-intro-paint">
      <source media="(max-width: 600px)" srcSet="/art/shanhe-handscroll-mobile.jpg" />
      <img className={paintLoaded ? 'is-loaded' : ''} src="/art/shanhe-handscroll-desktop.jpg" alt="" decoding="async"
        onLoad={() => setPaintLoaded(true)} onError={() => setPaintLoaded(false)} />
    </picture>}
    {paintLoaded && <small className="ink-intro-art-credit">山水画面为 AI 创作</small>}
  </div>;
}
