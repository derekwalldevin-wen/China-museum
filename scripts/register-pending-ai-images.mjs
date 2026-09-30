import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const imagePath = new URL('src/data/images.json', root);
const manifestName = process.argv[2] ?? 'pending-five-2026-09-23.json';
if (!/^[\w-]+\.json$/.test(manifestName)) throw new Error('Unsafe prompt manifest name');
const manifestPath = new URL(`assets/artifact-image-prompts/${manifestName}`, root);
const images = JSON.parse(await readFile(imagePath, 'utf8'));
const promptManifest = JSON.parse(await readFile(manifestPath, 'utf8'));

for (const item of promptManifest.items) {
  const current = images[item.id];
  if (!current?.sourceReview) throw new Error(`Missing review boundary for ${item.id}`);
  const bytes = await readFile(new URL(`public${item.output}`, root));
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  item.sha256 = sha256;
  const provenance = {
    type: 'ai',
    generator: 'OpenAI built-in imagegen',
    promptVersion: promptManifest.version,
    promptManifest: `assets/artifact-image-prompts/${manifestName}`,
    generatedAt: promptManifest.generatedAt,
    references: [{
      type: 'museum-record',
      value: item.authorityUrl,
      credit: '馆方文字资料用于限定大致形态；未转载馆方影像',
    }],
  };
  const review = {
    visual: 'approved',
    historical: 'pending',
    reviewedAt: promptManifest.generatedAt,
    reviewedBy: 'Codex visual QA',
    note: '已核对为完整可读的AI示意画面；具体造型、纹饰、色彩与内部结构仍待真品影像核验。',
  };
  const variant = {
    src: item.output,
    kind: 'ai',
    fit: 'contain',
    credit: 'AI 复原示意 · 据馆方文字资料生成，非文物实拍',
    provenance,
    review,
  };
  const retiredAssets = [...new Set([
    ...(current.retiredAssets ?? []).map(asset => asset.src),
    ...(current.imageHold ? [current.src, ...Object.values(current.variants ?? {}).map(variant => variant.src)] : []),
  ].filter(Boolean))].map(src => current.retiredAssets?.find(asset => asset.src === src) ?? ({
    src,
    reason: current.imageHold.reason,
    retiredAt: current.imageHold.reviewedAt,
  }));
  images[item.id] = {
    src: item.output,
    credit: variant.credit,
    ai: true,
    variants: { card: variant, detail: variant },
    sourceReview: {
      reviewedAt: promptManifest.generatedAt,
      authorityUrl: item.authorityUrl,
      note: `${current.sourceReview.note} 当前AI示意图仅据馆方文字生成，具体造型与细节继续待真品影像核验。`,
    },
    ...(retiredAssets.length ? { retiredAssets } : {}),
  };
}

await writeFile(imagePath, `${JSON.stringify(images, null, 2)}\n`);
await writeFile(manifestPath, `${JSON.stringify(promptManifest, null, 2)}\n`);
console.log(`Registered ${promptManifest.items.length} AI illustrations with pending historical review.`);
