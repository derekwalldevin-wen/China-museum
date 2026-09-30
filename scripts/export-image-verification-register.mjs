import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imageMap = JSON.parse(await readFile(path.join(root, 'src/data/images.json'), 'utf8'));
const source = await readFile(path.join(root, 'src/data/museums.ts'), 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { museums } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);

const quote = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
const localInfo = async (src) => {
  if (!src) return { path: '', bytes: '', sha256: '' };
  const relative = src.replace(/^\//, '');
  const filename = path.join(root, 'public', relative);
  try {
    const bytes = await readFile(filename);
    return {
      path: src,
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    };
  } catch {
    return { path: src, bytes: 'missing', sha256: '' };
  }
};

const all = museums.flatMap((museum) => museum.artifacts.map((artifact) => {
  const record = imageMap[artifact.id] ?? {};
  const card = record.variants?.card;
  const detail = record.variants?.detail;
  const cardKind = card?.kind ?? (record.ai ? 'ai-legacy' : 'source-legacy');
  const detailKind = detail?.kind ?? (record.ai ? 'ai-legacy' : 'source-legacy');
  return { artifact, museum, record, card, detail, cardKind, detailKind };
}));

const unresolved = [];
for (const row of all) {
  const cp = row.card?.provenance ?? {};
  const dp = row.detail?.provenance ?? {};
  const detailAuthorizationStatus = dp.authorizationStatus ?? row.record.sourceReview?.authorizationStatus ?? '';
  const sourceNeedsReview = row.detailKind === 'source'
    && detailAuthorizationStatus !== 'verified';
  const isUnresolved = row.cardKind !== 'source' || sourceNeedsReview;
  if (!isUnresolved) continue;

  const authorityUrl = row.record.sourceReview?.authorityUrl
    ?? cp.references?.find((ref) => ref.type === 'museum-record')?.value
    ?? dp.references?.find((ref) => ref.type === 'museum-record')?.value
    ?? '';
  const hasRestrictedDetail = detailAuthorizationStatus === 'restricted';
  const evidenceGrade = hasRestrictedDetail
    ? 'E-RESTRICTED'
    : sourceNeedsReview ? 'C-SOURCE-PENDING'
    : row.cardKind.includes('legacy') ? 'D-UNTRACED'
      : row.cardKind === 'ai' ? (authorityUrl ? 'B-OBJECT-REF' : 'D-UNTRACED')
        : 'A-VERIFIED';

  unresolved.push({
    id: row.artifact.id,
    name: row.artifact.name,
    museum: row.museum.name,
    province: row.museum.province,
    dynasty: row.artifact.dynasty,
    category: row.artifact.category,
    cardKind: row.cardKind,
    detailKind: row.detailKind,
    evidenceGrade,
    cardPath: row.card?.src ?? row.record.src ?? '',
    detailPath: row.detail?.src ?? row.record.detailSrc ?? row.record.src ?? '',
    authorityUrl,
    detailSourceUrl: dp.sourceUrl ?? row.record.sourceReview?.sourceUrl ?? '',
    sourceTitle: dp.sourceTitle ?? '',
    author: dp.author ?? '',
    institution: dp.institution ?? row.record.sourceReview?.institution ?? '',
    license: dp.license ?? '',
    licenseUrl: dp.licenseUrl ?? '',
    authorizationStatus: detailAuthorizationStatus,
    assetMatchStatus: dp.assetMatchStatus ?? '',
    verifiedAt: dp.verifiedAt ?? '',
    linkCheckedAt: dp.linkCheckedAt ?? '',
    cardPromptVersion: cp.promptVersion ?? '',
    cardGeneratedAt: cp.generatedAt ?? '',
    sourceNote: row.record.sourceReview?.note ?? dp.evidenceNote ?? '',
    cardLocal: await localInfo(row.card?.src ?? row.record.src),
    detailLocal: await localInfo(row.detail?.src ?? row.record.detailSrc ?? row.record.src),
  });
}

unresolved.sort((a, b) => a.province.localeCompare(b.province, 'zh-CN') || a.name.localeCompare(b.name, 'zh-CN'));
const columns = [
  'id', 'name', 'museum', 'province', 'dynasty', 'category', 'cardKind', 'detailKind', 'evidenceGrade',
  'cardPath', 'detailPath', 'authorityUrl', 'detailSourceUrl', 'sourceTitle', 'author', 'institution',
  'license', 'licenseUrl', 'authorizationStatus', 'assetMatchStatus', 'verifiedAt', 'linkCheckedAt',
  'cardPromptVersion', 'cardGeneratedAt', 'sourceNote', 'cardBytes', 'cardSha256', 'detailBytes', 'detailSha256',
];
const lines = [columns.map(quote).join(',')];
for (const row of unresolved) {
  const values = [
    row.id, row.name, row.museum, row.province, row.dynasty, row.category, row.cardKind, row.detailKind,
    row.evidenceGrade, row.cardPath, row.detailPath, row.authorityUrl, row.detailSourceUrl, row.sourceTitle,
    row.author, row.institution, row.license, row.licenseUrl, row.authorizationStatus, row.assetMatchStatus,
    row.verifiedAt, row.linkCheckedAt, row.cardPromptVersion, row.cardGeneratedAt, row.sourceNote,
    row.cardLocal.bytes, row.cardLocal.sha256, row.detailLocal.bytes, row.detailLocal.sha256,
  ];
  lines.push(values.map(quote).join(','));
}

const out = path.join(root, 'docs/audits/2026-09-23-image-verification-register.csv');
await writeFile(out, `${lines.join('\n')}\n`, 'utf8');
const counts = Object.fromEntries([...new Set(unresolved.map((row) => row.evidenceGrade))]
  .map((grade) => [grade, unresolved.filter((row) => row.evidenceGrade === grade).length]));
const jsonOut = path.join(root, 'docs/audits/2026-09-23-image-verification-register.json');
await writeFile(jsonOut, `${JSON.stringify({ generatedAt: new Date().toISOString(), unresolvedRecords: unresolved.length, counts, records: unresolved }, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ unresolvedRecords: unresolved.length, counts, csv: path.relative(root, out), json: path.relative(root, jsonOut) }));
