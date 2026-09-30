import assert from 'node:assert/strict';
import test from 'node:test';
import { decideIdleProvenanceWarm } from '../src/data/provenance-warm-policy.ts';

test('ordinary networks allow current-museum provenance idle warm', () => {
  assert.deepEqual(decideIdleProvenanceWarm({ effectiveType:'4g', saveData:false }), { allowed:true });
  assert.deepEqual(decideIdleProvenanceWarm({}), { allowed:true });
});

test('Save-Data and 2G signals remain intent-only', () => {
  assert.deepEqual(decideIdleProvenanceWarm({ saveData:true, effectiveType:'4g' }), { allowed:false, reason:'save-data' });
  assert.deepEqual(decideIdleProvenanceWarm({ effectiveType:'2g' }), { allowed:false, reason:'2g' });
  assert.deepEqual(decideIdleProvenanceWarm({ effectiveType:'slow-2g' }), { allowed:false, reason:'2g' });
  assert.deepEqual(decideIdleProvenanceWarm({ effectiveType:'3g' }), { allowed:true });
});

test('only a known low and discharging battery blocks idle warm', () => {
  assert.deepEqual(decideIdleProvenanceWarm({ batteryLevel:0.2, batteryCharging:false }), { allowed:false, reason:'low-battery' });
  assert.deepEqual(decideIdleProvenanceWarm({ batteryLevel:0.1, batteryCharging:true }), { allowed:true });
  assert.deepEqual(decideIdleProvenanceWarm({ batteryLevel:0.8, batteryCharging:false }), { allowed:true });
});
