import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decideIntroMode } from '../src/data/intro-policy.ts';

const capable = {
  hasBusinessRoute: false,
  navigationType: 'navigate',
  sessionSeen: false,
  reducedMotion: false,
  saveData: false,
  effectiveType: '4g',
  deviceMemory: 8,
  hardwareConcurrency: 8,
  mobileViewport: false,
  resourceSignalsMissing: false,
};

test('a capable first visit qualifies for the dynamic opening', () => {
  assert.equal(decideIntroMode(capable), 'dynamic');
});

test('business routes, repeat visits and history restores bypass the opening', () => {
  assert.equal(decideIntroMode({ ...capable, hasBusinessRoute: true }), 'bypass');
  assert.equal(decideIntroMode({ ...capable, sessionSeen: true }), 'bypass');
  assert.equal(decideIntroMode({ ...capable, navigationType: 'reload' }), 'bypass');
  assert.equal(decideIntroMode({ ...capable, navigationType: 'back_forward' }), 'bypass');
});

test('accessibility and constrained device signals select the static replacement', () => {
  assert.equal(decideIntroMode({ ...capable, reducedMotion: true }), 'static');
  assert.equal(decideIntroMode({ ...capable, saveData: true }), 'static');
  assert.equal(decideIntroMode({ ...capable, effectiveType: '2g' }), 'static');
  assert.equal(decideIntroMode({ ...capable, deviceMemory: 4 }), 'static');
  assert.equal(decideIntroMode({ ...capable, hardwareConcurrency: 4 }), 'static');
  assert.equal(decideIntroMode({ ...capable, mobileViewport: true, resourceSignalsMissing: true }), 'static');
});
