export type IntroMode = 'bypass' | 'static' | 'dynamic';

export interface IntroSignals {
  hasBusinessRoute: boolean;
  navigationType?: string;
  sessionSeen: boolean;
  reducedMotion: boolean;
  saveData?: boolean;
  effectiveType?: string;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  mobileViewport: boolean;
  resourceSignalsMissing: boolean;
}

interface BatteryLike { charging: boolean; level: number; }
type NavigatorWithHints = Navigator & {
  connection?: { saveData?: boolean; effectiveType?: string };
  deviceMemory?: number;
  getBattery?: () => Promise<BatteryLike>;
};

const INTRO_SESSION_KEY = 'huaxia:intro-seen:v1';

export function decideIntroMode(signals: IntroSignals): IntroMode {
  if (signals.hasBusinessRoute || signals.sessionSeen) return 'bypass';
  if (signals.navigationType && signals.navigationType !== 'navigate') return 'bypass';
  if (signals.reducedMotion || signals.saveData) return 'static';
  if (['slow-2g', '2g', '3g'].includes(signals.effectiveType ?? '')) return 'static';
  if (signals.deviceMemory !== undefined && signals.deviceMemory <= 4) return 'static';
  if (signals.hardwareConcurrency !== undefined && signals.hardwareConcurrency <= 4) return 'static';
  if (signals.mobileViewport && signals.resourceSignalsMissing) return 'static';
  return 'dynamic';
}

export function readInitialIntroMode(): IntroMode {
  const testWindow = window as Window & { __HUAXIA_INTRO_TEST__?: { forceDynamic?: boolean; forceStatic?: boolean } };
  if (testWindow.__HUAXIA_INTRO_TEST__?.forceDynamic) return 'dynamic';
  if (testWindow.__HUAXIA_INTRO_TEST__?.forceStatic) return 'static';
  const nav = navigator as NavigatorWithHints;
  const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  let sessionSeen = false;
  try { sessionSeen = sessionStorage.getItem(INTRO_SESSION_KEY) === '1'; } catch { /* Session storage is optional. */ }
  const hasHardwareSignal = typeof nav.deviceMemory === 'number' || typeof navigator.hardwareConcurrency === 'number';
  const hasConnectionSignal = Boolean(nav.connection);
  return decideIntroMode({
    hasBusinessRoute: Boolean(window.location.search || window.location.hash),
    navigationType: navigationEntry?.type,
    sessionSeen,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    saveData: nav.connection?.saveData,
    effectiveType: nav.connection?.effectiveType,
    deviceMemory: nav.deviceMemory,
    hardwareConcurrency: navigator.hardwareConcurrency,
    mobileViewport: window.matchMedia('(max-width: 767px)').matches,
    resourceSignalsMissing: !hasHardwareSignal && !hasConnectionSignal,
  });
}

export function rememberIntroSeen() {
  try { sessionStorage.setItem(INTRO_SESSION_KEY, '1'); } catch { /* The current mount still prevents a repeat. */ }
}

export async function hasKnownLowBattery(timeoutMs = 140): Promise<boolean> {
  const nav = navigator as NavigatorWithHints;
  if (!nav.getBattery) return false;
  try {
    const battery = await Promise.race([
      nav.getBattery(),
      new Promise<undefined>(resolve => window.setTimeout(() => resolve(undefined), timeoutMs)),
    ]);
    return Boolean(battery && battery.level <= 0.2 && !battery.charging);
  } catch { return false; }
}

export function supportsIntroWebGL2(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2', { alpha:true, powerPreference:'low-power' });
    context?.getExtension('WEBGL_lose_context')?.loseContext();
    return Boolean(context);
  } catch { return false; }
}
