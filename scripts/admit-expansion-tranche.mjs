import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const read = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const tranche = process.argv[2] ?? '01';
if (!/^\d{2}$/.test(tranche)) throw new Error('Expected two-digit tranche');
const evidence = await read(`assets/expansion/reviewed-tranche-${tranche}.json`);
const processing = await read(`assets/expansion/processing-tranche-${tranche}.json`);
const processingManifest = `/data/image-processing/expansion-tranche-${tranche}.json`;
const expansion = await read('src/data/collection-expansion.json');
const images = await read('src/data/images.json');
const old = await read('assets/expansion/baseline-223/images.json');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const admitted = [];
const pending = [];
const batchIds = new Set(evidence.items.map(item => item.artifact.id));
if (batchIds.size !== evidence.items.length) throw new Error('Duplicate IDs in curated batch');
const untouchedImages = new Map(Object.entries(images).filter(([id]) => !batchIds.has(id)).map(([id, value]) => [id, JSON.stringify(value)]));
for (const item of evidence.items) {
  const id = item.artifact.id;
  const image = processing.items.find(record => record.id === id);
  if (!image || image.visualReview !== 'approved') { pending.push(id); continue; }
  if (old[id]) throw new Error(`Existing artifact must not be replaced: ${id}`);
  if (images[id] && images[id].variants?.detail?.provenance?.promptManifest !== processingManifest) throw new Error(`Other tranche image must not be replaced: ${id}`);
  const metadata = await read(`assets/expansion/evidence/${item.evidenceKey}.json`);
  const html = await readFile(new URL(`assets/expansion/evidence/${item.evidenceKey}.html`, root));
  if (metadata.url !== (item.evidenceUrl ?? item.sourceUrl) || metadata.sha256 !== sha(html)) throw new Error(`Evidence mismatch: ${id}`);
  if (sha(await readFile(new URL(image.originalFile, root))) !== image.originalSha256) throw new Error(`Original hash mismatch: ${id}`);
  for (const output of Object.values(image.roles)) if (sha(await readFile(new URL(`public${output.src}`, root))) !== output.sha256) throw new Error(`Delivery mismatch: ${id}`);
  // Keep the complete evidence scope in the register/writing pack, without repeating
  // the entire visible summary in the current museum's deferred reference caption.
  const artifact = { ...item.artifact, references: [{ title: `${item.artifact.name} · 官方馆藏记录`, institution: item.institution, url: item.sourceUrl, checkedAt: metadata.checkedAt.slice(0, 10), supports: Number(tranche)>=3 ? '支持摘要明列的本件馆藏事实；未知和冲突仍按摘要限定，不构成图片授权。' : item.supports }] };
  const newMuseum = expansion.museums.find(museum => museum.id === item.museumId) ?? evidence.museums.find(museum => museum.id === item.museumId);
  if (newMuseum) {
    let museum = expansion.museums.find(museum => museum.id === item.museumId);
    if (!museum) { museum = { ...newMuseum, artifacts: [] }; expansion.museums.push(museum); }
    const existingIndex= museum.artifacts.findIndex(record => record.id === id);
    if (existingIndex < 0) museum.artifacts.push(artifact);
    else museum.artifacts[existingIndex]=artifact;
  } else {
    const records = expansion.artifactsByMuseum[item.museumId] ??= [];
    const existingIndex=records.findIndex(record => record.id === id);
    if(existingIndex<0)records.push(artifact);
    else records[existingIndex]=artifact;
  }
  const credit = 'AI概括示意 · 非文物实拍 · 不用于核对铭文、纹饰和原作细节';
  const variants = Object.fromEntries(['card', 'detail'].map(role => [role, {
    src: image.roles[role].src, kind: 'ai', fit: 'contain', credit,
    provenance: { type: 'ai', generator: 'OpenAI built-in imagegen', promptVersion: processing.version, promptManifest: processingManifest, generatedAt: image.generatedAt, references: [{ type: 'museum-record', value: item.sourceUrl, credit: `${item.institution}文字记录；非照片授权` }] },
    review: { visual: 'approved', historical: 'pending', reviewedAt: evidence.reviewedAt, reviewedBy: 'Codex AI illustration QA', note: '仅核总体器形与文字约束；纹饰、釉色和细部不作为原作证据。' },
  }]));
  images[id] = { src: variants.detail.src, ai: true, credit, variants, sourceReview: { reviewedAt: evidence.reviewedAt, authorityUrl: item.sourceUrl, note: '馆方记录用于事实与器形背景，不构成照片许可；此图为AI概括示意。' } };
  admitted.push({ id, museumId: item.museumId, name: artifact.name, institution: item.institution, sourceUrl: item.sourceUrl, checkedAt: metadata.checkedAt, recordIdentifier: item.recordIdentifier, evidenceSha256: metadata.sha256, supports: item.supports, imageKind: 'ai', photoAuthorization: 'unknown', originalSha256: image.originalSha256, cardSha256: image.roles.card.sha256, detailSha256: image.roles.detail.sha256, processingManifest });
}
for (const [id, record] of Object.entries(old)) if (JSON.stringify(record) !== JSON.stringify(images[id])) throw new Error(`Baseline image changed: ${id}`);
for (const [id, serialized] of untouchedImages) if (JSON.stringify(images[id]) !== serialized) throw new Error(`Earlier image changed: ${id}`);
const save = (path, value) => writeFile(new URL(path, root), JSON.stringify(value, null, 2) + '\n');
await save('src/data/collection-expansion.json', expansion);
await save('src/data/images.json', images);
await save(`assets/expansion/admission-tranche-${tranche}.json`, { checkedAt: new Date().toISOString(), admitted, pending });
await mkdir(new URL('docs/handoff/expansion-600/', root), { recursive: true });
await save(`docs/handoff/expansion-600/tranche-${tranche}-writing-pack.json`, { instructions: '未创作长篇故事。每件官方来源只支持明列事实；制作、发现、研究史的空白保留未知。AI图不作史料，关联仅用于比较，不暗示传承。', items: evidence.items.filter(item => admitted.some(record => record.id === item.artifact.id)).map(item => ({ ...item, checkedAt: evidence.reviewedAt, imageKind: 'ai', storyStatus: 'summary-only' })) });
console.log(JSON.stringify({ admitted: admitted.length, pending, target: expansion.target }, null, 2));
