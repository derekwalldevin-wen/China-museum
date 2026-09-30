import assert from 'node:assert/strict';
import test from 'node:test';
import register from '../docs/audits/2026-09-23-image-verification-register.json' with { type: 'json' };
import audit from '../docs/audits/artifact-asset-audit.json' with { type: 'json' };

test('round-four register enumerates every unresolved artifact once with evidence grades', () => {
  assert.equal(register.unresolvedRecords, 195);
  assert.deepEqual(register.counts, {
    'B-OBJECT-REF': 11,
    'C-SOURCE-PENDING': 35,
    'D-UNTRACED': 148,
    'E-RESTRICTED': 1,
  });
  assert.equal(new Set(register.records.map((row) => row.id)).size, 195);
  assert.ok(register.records.every((row) => row.cardKind !== 'source' || row.authorizationStatus !== 'verified'));
  assert.ok(register.records.every((row) => row.cardLocal.bytes !== 'missing' && row.detailLocal.bytes !== 'missing'));
  assert.deepEqual(
    Object.fromEntries(Object.entries(audit.summary.images).filter(([key]) => [
      'missingMappings', 'missingFiles', 'missingDetailFiles', 'undecodable', 'lineArtFallbackRequired',
    ].includes(key))),
    { missingMappings: 0, missingFiles: 0, missingDetailFiles: 0, undecodable: 0, lineArtFallbackRequired: 0 },
  );
});

test('the six verified source-photo objects are excluded from unresolved register', () => {
  const verifiedIds = ['gb-gyts', 'gb-yygd', 'gb-cxct', 'sh-zzjp', 'hn-ywtj', 'zj-yzj'];
  for (const id of verifiedIds) assert.ok(!register.records.some((row) => row.id === id), id);
});
