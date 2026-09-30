export type IdleProvenanceWarmBlockReason = 'save-data' | '2g' | 'low-battery';

export interface IdleProvenanceWarmSignals {
  saveData?: boolean;
  effectiveType?: string;
  batteryLevel?: number;
  batteryCharging?: boolean;
}

export interface IdleProvenanceWarmDecision {
  allowed: boolean;
  reason?: IdleProvenanceWarmBlockReason;
}

interface BatteryLike {
  charging: boolean;
  level: number;
}

type NavigatorWithResourceHints = Navigator & {
  connection?: { saveData?: boolean; effectiveType?: string };
  getBattery?: () => Promise<BatteryLike>;
};

export function decideIdleProvenanceWarm(signals: IdleProvenanceWarmSignals): IdleProvenanceWarmDecision {
  if (signals.saveData) return { allowed: false, reason: 'save-data' };
  if (signals.effectiveType === 'slow-2g' || signals.effectiveType === '2g') {
    return { allowed: false, reason: '2g' };
  }
  if (signals.batteryLevel !== undefined && signals.batteryLevel <= 0.2 && signals.batteryCharging === false) {
    return { allowed: false, reason: 'low-battery' };
  }
  return { allowed: true };
}

async function readBattery(nav: NavigatorWithResourceHints): Promise<BatteryLike | undefined> {
  if (!nav.getBattery) return undefined;
  try {
    return await Promise.race([
      nav.getBattery(),
      new Promise<undefined>(resolve => window.setTimeout(() => resolve(undefined), 250)),
    ]);
  } catch {
    return undefined;
  }
}

export async function getIdleProvenanceWarmDecision(): Promise<IdleProvenanceWarmDecision> {
  const nav = navigator as NavigatorWithResourceHints;
  const connectionDecision = decideIdleProvenanceWarm({
    saveData: nav.connection?.saveData,
    effectiveType: nav.connection?.effectiveType,
  });
  if (!connectionDecision.allowed) return connectionDecision;

  const battery = await readBattery(nav);
  return decideIdleProvenanceWarm({
    batteryLevel: battery?.level,
    batteryCharging: battery?.charging,
  });
}
