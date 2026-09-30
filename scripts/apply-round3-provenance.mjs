import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { museums } from '../src/data/museums.ts';

// Mechanical migration of reviewed evidence. Never infer source/license from a filename.
const root = new URL('../', import.meta.url);
const imagePath = new URL('src/data/images.json', root);
const images = JSON.parse(await readFile(imagePath, 'utf8'));
const evidence = JSON.parse(await readFile(new URL('assets/provenance/round3-evidence.json', root), 'utf8'));
const date = evidence.reviewedAt;
const official = {
  'hb-cxd': { sourceUrl: 'https://lthb.hebeimedia.cn/c/2022-07-20/563282.html', institution: '河北博物院 / 河北新闻网旅图河北', pageStatus: 'read', authorizationStatus: 'restricted', evidenceNote: '页面明确未经允许不得复制或镜像；未取得额外授权，停止展示此来源图，详情仅保留标识清楚的 AI 示意。AI 参考图权利仍待核。' },
  'sh-sqf': { sourceUrl: 'https://www.shanghaimuseum.net/mu/frontend/pg/m/article/id/CI00000346', institution: '上海博物馆', pageStatus: 'read', evidenceNote: '官方藏品页可读并标注版权；未见本图开放许可，不能把官网公开展示视为授权。' },
  'hk-jgb': { sourceUrl: 'https://www.hkpm.org.hk/sc/visit/audio-guide/g3-clay-to-treasure', institution: '香港故宫文化博物馆 / 故宫博物院', pageStatus: 'read', evidenceNote: '官方页面对应明永乐青花龙穿花纹扁瓶，标注 © 故宫博物院；未见开放许可，授权待核。' },
};
const rows = [];
for (const museum of museums) for (const artifact of museum.artifacts) {
  const mapping = images[artifact.id];
  const detail = mapping.variants?.detail;
  if (artifact.shape !== 'scroll' && detail?.kind !== 'source') continue;
  if (mapping.sourceReview?.reviewedAt > date || detail?.provenance?.authorizationStatus === 'verified') {
    throw new Error(`Newer or finalized review exists for ${artifact.id}; do not replay round 3 over it.`);
  }
  const item = evidence.entries[artifact.id] ?? official[artifact.id];
  assert.ok(item, `Missing individual research record: ${artifact.id}`);
  const src = detail?.src ?? mapping.src;
  const sha = createHash('sha256').update(await readFile(new URL(`public${src}`, root))).digest('hex');
  if (detail?.provenance?.assetSha256) assert.equal(detail.provenance.assetSha256, sha, `Asset changed; review evidence before rebinding ${artifact.id}`);
  const authorizationStatus = item.authorizationStatus ?? 'pending';
  if (detail?.kind === 'source') {
    const provenance = {
      type: 'source', authorizationStatus,
      assetMatchStatus: item.assetMatchStatus === 'mismatch' ? 'mismatch' : 'pending',
      assetSha256: sha,
      evidenceNote: item.evidenceNote,
      modifications: '历史缩略图；原始裁切、压缩与下载链待复核。本次未改动图像像素。',
    };
    for (const key of ['sourceUrl', 'sourceTitle', 'author', 'institution', 'license', 'licenseUrl']) {
      if (item[key]) provenance[key] = item[key];
    }
    if (item.pageStatus === 'read') Object.assign(provenance, { verifiedAt: date, linkCheckedAt: date });
    const fullResolution = evidence.downloads.find(candidate => candidate.id === artifact.id);
    if (fullResolution) provenance.fullResolutionSourceUrl = fullResolution.sourceUrl;
    detail.provenance = provenance;
    if (item.assetMatchStatus === 'mismatch') detail.review = { ...detail.review, historical: 'rejected', reviewedAt: date, reviewedBy: 'Codex provenance round 3', note: item.evidenceNote };
  }
  mapping.sourceReview = { reviewedAt: date, note: item.evidenceNote };
  if (item.authorityUrl && item.pageStatus === 'read') mapping.sourceReview.authorityUrl = item.authorityUrl;
  if (item.hold) mapping.imageHold = { reason: item.evidenceNote, reviewedAt: date };
  rows.push({
    id: artifact.id, name: artifact.name, museum: museum.name, province: museum.province,
    scroll: artifact.shape === 'scroll', detailKind: detail?.kind ?? (mapping.ai ? 'ai' : 'source'),
    src, assetSha256: sha, ...item, authorizationStatus,
    verifiedAt: item.pageStatus === 'read' ? date : null,
    linkCheckedAt: item.pageStatus === 'read' ? date : null,
    lastAttemptAt: date,
    assetMatchStatus: item.assetMatchStatus ?? 'pending',
  });
}
assert.equal(rows.length, 58);
const summary = {
  artifacts: 191, targets: rows.length, scrollRecords: rows.filter(r => r.scroll).length,
  existingSourceDetails: rows.filter(r => r.detailKind === 'source').length,
  sourcePagesRead: rows.filter(r => r.detailKind === 'source' && r.pageStatus === 'read').length,
  sourcePagesUnavailable: rows.filter(r => r.detailKind === 'source' && r.pageStatus !== 'read').length,
  perFileLicenseDeclarations: rows.filter(r => r.detailKind === 'source' && r.license).length,
  aiRecordsWithReadAuthorityReference: rows.filter(r => r.detailKind === 'ai' && r.pageStatus === 'read').length,
  sourceAssignmentMismatches: rows.filter(r => r.assetMatchStatus === 'mismatch').length,
  imageHoldRecords: rows.filter(r => r.hold).length,
  authorizationVerified: rows.filter(r => r.authorizationStatus === 'verified').length,
  authorizationPending: rows.filter(r => r.authorizationStatus === 'pending').length,
  authorizationRestricted: rows.filter(r => r.authorizationStatus === 'restricted').length,
  actualNewImageReplacements: 0,
  highResolutionCandidates: evidence.downloads.length,
};
await writeFile(imagePath, JSON.stringify(images, null, 2) + '\n');
await writeFile(new URL('docs/audits/round3-register.json', root), JSON.stringify({ reviewedAt: date, definitions: evidence.definitions, summary, rows, downloads: evidence.downloads }, null, 2) + '\n');
const esc = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
const keys = ['id', 'name', 'museum', 'scroll', 'detailKind', 'pageStatus', 'sourceUrl', 'authorityUrl', 'candidateSourceUrl', 'author', 'institution', 'license', 'licenseUrl', 'verifiedAt', 'linkCheckedAt', 'assetMatchStatus', 'authorizationStatus', 'hold', 'assetSha256', 'evidenceNote'];
await writeFile(new URL('docs/audits/round3-register.csv', root), '\uFEFF' + [keys.join(','), ...rows.map(row => keys.map(key => esc(row[key])).join(','))].join('\n') + '\n');
console.log(JSON.stringify(summary, null, 2));
