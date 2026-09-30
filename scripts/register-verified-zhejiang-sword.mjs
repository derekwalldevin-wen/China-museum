import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = async path => readFile(new URL(path, root));
const json = async path => JSON.parse(await read(path));
const hash = (bytes, algorithm = 'sha256') => createHash(algorithm).update(bytes).digest('hex');
const images = await json('src/data/images.json');
const originalPath = 'assets/source-originals/zj-yzj-original.jpg';
const original = await read(originalPath);
const expectedSha1 = '66fa9c9b291a476e615e88d72eb90fddec3c475a';
assert.equal(hash(original, 'sha1'), expectedSha1);
const sourceUrl = 'https://commons.wikimedia.org/wiki/File:Yuyue_People-_Warring_States_Bronze_Sword_of_Zhu_Ji_Yu_Shi,_King_of_the_Yue_%E8%B6%8A%E7%8E%8B%E8%80%85%E6%97%A8%E6%96%BC%E7%9D%97%E5%89%91_%E6%B5%99%E6%B1%9F%E5%8D%9A%E7%89%A9%E9%A6%86.jpg';
const downloadUrl = 'https://live.staticflickr.com/7723/17095340942_16c2e09b60_o.jpg';
const date = '2026-09-15';
const processManifest = 'assets/provenance/zj-yzj-verified-processing.json';
const previous = images['zj-yzj'];
if (previous.variants?.detail?.provenance?.authorizationStatus !== 'verified') {
  await writeFile(new URL('assets/provenance/zj-yzj-quarantined-record.json', root), JSON.stringify(previous, null, 2) + '\n', { flag: 'wx' });
}
const retired = await json('assets/provenance/zj-yzj-quarantined-record.json');
const outputs = [];
const variants = {};
for (const [role, width, height] of [['card', 900, 600], ['detail', 2400, 1600]]) {
  const src = `/artifact-sources/verified/zj-yzj-${role}-cc0.jpg`;
  const bytes = await read(`public${src}`);
  const expected = role === 'card' ? '8d4c83a516743a84ad04df5afa60aa281afe8eff56a346fc4c9bb5705619f2a2' : 'b5dd26e6a32c72d6c082869fb0e7d160822604cce12291697ee5dfba8f158c28';
  assert.equal(hash(bytes), expected, `Unreviewed ${role} output`);
  outputs.push({ role, src, width, height, bytes: bytes.length, sha256: hash(bytes) });
  variants[role] = {
    src, kind: 'source', fit: 'contain', credit: 'Gary Todd 摄影 · 浙江省博物馆藏越王者旨於睗剑 · CC0 1.0',
    provenance: {
      type: 'source', sourceUrl, sourceTitle: 'Yuyue People — Warring States Bronze Sword of Zhu Ji Yu Shi, King of the Yue',
      author: 'Gary Todd', institution: '浙江省博物馆', license: 'CC0 1.0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      verifiedAt: date, linkCheckedAt: date, authorizationStatus: 'verified', assetMatchStatus: 'verified', assetSha256: hash(bytes),
      originalSourceUrl: downloadUrl, originalSha1: expectedSha1, originalSha256: hash(original), processingManifest: processManifest,
      modifications: `从5184×3456原件等比缩放为${width}×${height}，JPEG质量90；未裁切、未补绘、未调色，无AI生成。`,
      evidenceNote: '摄影者原始发布文件与Commons公布SHA-1完全一致；逐文件CC0声明及Flickr许可复核记录已核读，画面与浙江馆藏单剑对应。verified表示本项目证据核验通过，并非馆方背书。',
    },
    review: { visual: 'approved', historical: 'approved', reviewedAt: date, reviewedBy: 'Codex source-chain review', note: '保留完整原始构图；主体单剑与丝质缠缑可见，不沿用上海两剑参考。' },
  };
}
images['zj-yzj'] = {
  src: variants.detail.src, credit: variants.detail.credit, variants,
  retiredAssets: [...new Set([retired.src, ...Object.values(retired.variants).map(v => v.src)])].map(src => ({ src, reason: '上一轮上海馆藏错配及依赖该参考的AI图，不再发布或回退', retiredAt: date })),
  sourceReview: { reviewedAt: date, authorityUrl: sourceUrl, note: '以摄影者CC0原件替换错配图；原件与两种展示图哈希及处理链已归档。' },
};
const chain = {
  id: 'zj-yzj', verifiedAt: date, sourceUrl,
  author: 'Gary Todd', institution: '浙江省博物馆', license: 'CC0 1.0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  licenseEvidence: '文件Licensing段CC0 1.0；FlickreviewR 2于2020-12-02复核原摄影者发布许可。',
  original: { path: originalPath, downloadUrl, downloadedAt: date, bytes: original.length, width: 5184, height: 3456, sha1: expectedSha1, sha256: hash(original) },
  processing: { script: 'scripts/prepare-zhejiang-sword.ps1', engine: 'Windows System.Drawing', operation: 'full-frame proportional resize; bicubic; JPEG quality 90', crop: false, aiGenerated: false, processedAt: date },
  outputs,
};
await writeFile(new URL(processManifest, root), JSON.stringify(chain, null, 2) + '\n');
await writeFile(new URL('src/data/images.json', root), JSON.stringify(images, null, 2) + '\n');
console.log(JSON.stringify({ replacedArtifacts: 1, verifiedOriginals: 1, verifiedRoleImages: 2, outputs }, null, 2));
