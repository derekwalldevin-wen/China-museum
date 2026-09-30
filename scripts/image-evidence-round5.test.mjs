import assert from 'node:assert/strict';
import test from 'node:test';
import audit from '../docs/audits/2026-09-23-round5-item-evidence.json' with { type: 'json' };
import base from '../docs/audits/2026-09-23-image-verification-register.json' with { type: 'json' };

test('round-five evidence register covers each D and C record exactly once', () => {
  assert.equal(audit.records.length, 183);
  assert.deepEqual(audit.counts, {
    D: 148,
    C: 35,
    DWithDirectAuthorityPage: 12,
    DMatchSupported: 9,
    DIdentityNeedsResolution: 2,
    DAssignmentConflict: 1,
    CWithLocalSha256: 35,
    CRecordedHashMatchesLocal: 35,
    CWithOriginalSha256: 0,
    CWithProcessingChain: 0,
    COriginalFilesDownloadedAndHashedThisRound: 0,
    CLicenseEvidenceClosedThisRound: 0,
    replacements: 0,
  });
  const expected = base.records.filter((row) => ['D-UNTRACED', 'C-SOURCE-PENDING'].includes(row.evidenceGrade));
  assert.deepEqual(new Set(audit.records.map((row) => row.id)), new Set(expected.map((row) => row.id)));
  assert.equal(new Set(audit.records.map((row) => row.id)).size, audit.records.length);
});

test('no candidate is promoted without original hash, processing chain, and verified authorization', () => {
  for (const row of audit.records.filter((entry) => entry.grade === 'C-SOURCE-PENDING')) {
    assert.ok(row.localAssetSha256, row.id);
    assert.equal(row.recordedHashMatchesLocal, true, row.id);
    assert.equal(row.originalSha256, '', row.id);
    assert.equal(row.processingChain, '', row.id);
    assert.equal(row.chainClosure, 'open-missing-original-file-digest-and-source-to-derivative-proof', row.id);
    assert.equal(row.authorizationStatus, 'pending', row.id);
    assert.equal(row.replacementDecision, 'retain-current-pending', row.id);
  }
  assert.ok(audit.records.filter((row) => row.grade === 'D-UNTRACED').every((row) => row.replacementDecision === 'retain-ai-or-pending'));
});

test('direct authority records carry item-specific explanatory evidence, not license claims', () => {
  for (const row of audit.records.filter((entry) => entry.grade === 'D-UNTRACED' && entry.authorityUrl)) {
    assert.match(row.authorityUrl, /^https:\/\//, row.id);
    assert.ok(row.matchEvidence.length > 30, row.id);
    assert.equal(row.sourceLicense, '', row.id);
  }
});
