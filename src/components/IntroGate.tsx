import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import { hasKnownLowBattery, readInitialIntroMode, rememberIntroSeen, type IntroMode } from '../data/intro-policy';

interface DynamicIntroProps {
  onReady: () => void;
  onComplete: () => void;
  onFailure: () => void;
  onPhase: (phase: string) => void;
}

interface Props {
  contentReady: boolean;
  businessActive: boolean;
  onActiveChange: (active: boolean) => void;
}

const PREPARE_DEADLINE_MS = 500;
const WALL_CLOCK_LIMIT_MS = 3300;

export default function IntroGate({ contentReady, businessActive, onActiveChange }: Props) {
  const [initialMode] = useState<IntroMode>(readInitialIntroMode);
  const [visible, setVisible] = useState(initialMode !== 'bypass');
  const [mode, setMode] = useState<'static' | 'preparing' | 'dynamic'>(() => initialMode === 'dynamic' ? 'preparing' : 'static');
  const [phase, setPhase] = useState('paper');
  const [DynamicIntro, setDynamicIntro] = useState<ComponentType<DynamicIntroProps> | null>(null);
  const finishedRef = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const finish = useCallback((reason: string) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (rootRef.current) rootRef.current.dataset.introExit = reason;
    setVisible(false);
    onActiveChange(false);
    try { performance.mark(`huaxia:intro:exit:${reason}`); } catch { /* Diagnostics are optional. */ }
  }, [onActiveChange]);

  const handleDynamicReady = useCallback(() => {
    setMode('dynamic');
  }, []);
  const handleDynamicFailure = useCallback(() => {
    setDynamicIntro(null);
    setMode('static');
    setPhase('static');
  }, []);

  useEffect(() => {
    if (!visible) return;
    onActiveChange(true);
    rememberIntroSeen();
    try { performance.mark(`huaxia:intro:${initialMode}:shown`); } catch { /* Diagnostics are optional. */ }
    const testWindow = window as Window & { __HUAXIA_INTRO_TEST__?: { holdStatic?: boolean } };
    const limit = testWindow.__HUAXIA_INTRO_TEST__?.holdStatic
      ? undefined
      : window.setTimeout(() => finish('wall-clock-limit'), WALL_CLOCK_LIMIT_MS);
    return () => { if (limit !== undefined) window.clearTimeout(limit); };
  }, [finish, initialMode, onActiveChange, visible]);

  useEffect(() => {
    if (!visible || initialMode !== 'dynamic') return;
    let active = true;
    let loaded = false;
    const startedAt = performance.now();
    const testWindow = window as Window & { __HUAXIA_INTRO_TEST__?: { ignoreDeadline?: boolean; prepareDelayMs?: number } };
    const testOptions = testWindow.__HUAXIA_INTRO_TEST__;
    const deadlineMs = testOptions?.ignoreDeadline ? 5000 : PREPARE_DEADLINE_MS;
    const deadline = window.setTimeout(() => {
      if (!active || loaded) return;
      try { performance.mark('huaxia:intro:prepare-timeout'); } catch { /* Diagnostics are optional. */ }
      setMode('static');
      setPhase('static');
    }, deadlineMs);

    void (async () => {
      if (testOptions?.prepareDelayMs) {
        await new Promise(resolve => window.setTimeout(resolve, testOptions.prepareDelayMs));
        if (!active) return;
      }
      const lowBattery = await hasKnownLowBattery();
      if (!active) return;
      if (lowBattery) {
        window.clearTimeout(deadline);
        setMode('static');
        setPhase('static');
        return;
      }
      try {
        const module = await import('./InkScrollIntro');
        if (!active || performance.now() - startedAt > deadlineMs) return;
        loaded = true;
        window.clearTimeout(deadline);
        setDynamicIntro(() => module.default);
      } catch {
        if (active) {
          window.clearTimeout(deadline);
          setMode('static');
          setPhase('static');
        }
      }
    })();
    return () => { active = false; window.clearTimeout(deadline); };
  }, [initialMode, visible]);

  useEffect(() => {
    if (!visible || mode !== 'static' || !contentReady) return;
    const testWindow = window as Window & { __HUAXIA_INTRO_TEST__?: { holdStatic?: boolean } };
    if (testWindow.__HUAXIA_INTRO_TEST__?.holdStatic) return;
    finish('static-content-ready');
  }, [contentReady, finish, mode, visible]);

  useEffect(() => {
    if (visible && businessActive) finish('business-navigation');
  }, [businessActive, finish, visible]);

  useEffect(() => {
    if (!visible) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onReducedMotion = () => { if (reducedMotion.matches) finish('reduced-motion'); };
    const onVisibility = () => { if (document.visibilityState === 'hidden') finish('hidden'); };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') finish('escape'); };
    reducedMotion.addEventListener('change', onReducedMotion);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('keydown', onKey);
    return () => {
      reducedMotion.removeEventListener('change', onReducedMotion);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('keydown', onKey);
    };
  }, [finish, visible]);

  if (!visible) return null;
  return (
    <div ref={rootRef} className={`ink-intro ink-intro-${mode}`} data-ink-intro data-intro-mode={mode} data-intro-phase={phase}
      role="region" aria-label="华夏博物志开场">
      <div className="ink-intro-paper" aria-hidden="true">
        <div className="ink-intro-paper-surface">
        </div>
        {DynamicIntro && <DynamicIntro onReady={handleDynamicReady}
          onComplete={() => finish('complete')} onFailure={handleDynamicFailure} onPhase={setPhase} />}
      </div>
      <div className="ink-intro-copy">
        <div className="ink-intro-kicker">A JOURNEY THROUGH MOUNTAINS &amp; TREASURES</div>
        <h1>山河入画</h1>
        <p>循迹寻珍 · 读懂器物里的华夏</p>
      </div>
      <div className="ink-intro-seal" aria-hidden="true"><span>循</span><span>珍</span></div>
      <button type="button" className="ink-intro-skip" onClick={() => finish('skip')}>跳过开场</button>
      <div className="ink-intro-progress" aria-hidden="true"><i /></div>
    </div>
  );
}
