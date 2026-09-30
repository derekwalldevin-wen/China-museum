import { readFile, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const readJson = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const writeJson = async (path, value) => writeFile(new URL(path, root), JSON.stringify(value, null, 2) + '\n');
const images = await readJson('src/data/images.json');
const evidence = await readJson('assets/provenance/round3-closeout-evidence.json');
const register = await readJson('docs/audits/round3-register.json');
try { await writeFile(new URL('docs/audits/round3-register-before-closeout.json', root), JSON.stringify(register, null, 2) + '\n', { flag: 'wx' }); } catch (e) { if (e.code !== 'EEXIST') throw e; }
for (const item of evidence.items) {
  const row = register.rows.find(row => row.id === item.id);
  if (item.id === 'zj-yzj') {
    const image = images[item.id].variants.detail;
    Object.assign(row, image.provenance, { src: image.src, hold: false, pageStatus: 'read', closeoutStatus: item.status, history: '原上海馆藏错配已替换，旧记录见round3-register-before-closeout.json' });
  } else {
    images[item.id].sourceReview = { reviewedAt: evidence.reviewedAt, note: item.note, ...(item.referenceRead ? { authorityUrl: item.authorityUrl } : {}) };
    row.closeoutStatus = item.status;
    row.closeoutNote = item.note;
    if (item.authorityUrl || item.candidateUrl) row.replacementReference = item.authorityUrl ?? item.candidateUrl;
  }
}
register.summary.imageHoldRecords = Object.values(images).filter(i => i.imageHold).length;
register.summary.sourceAssignmentMismatches = register.rows.filter(r => r.assetMatchStatus === 'mismatch').length;
register.summary.authorizationVerified = register.rows.filter(r => r.authorizationStatus === 'verified').length;
register.summary.authorizationPending = register.rows.filter(r => r.authorizationStatus === 'pending').length;
register.summary.actualNewImageReplacements = 1;
register.summary.verifiedRoleImages = 2;
register.summary.closeoutNote = '1件文物、1个许可原件、2张卡片/详情展示图；受阻项依用户指示跳过。';
await writeJson('src/data/images.json', images);
await writeJson('docs/audits/round3-register.json', register);
const keys = ['id','name','museum','sourceUrl','author','institution','license','licenseUrl','verifiedAt','linkCheckedAt','authorizationStatus','assetMatchStatus','assetSha256','src','hold','closeoutStatus','evidenceNote'];
const esc = value => `"${String(value ?? '').replaceAll('"','""')}"`;
await writeFile(new URL('docs/audits/round3-register.csv', root), '\uFEFF' + [keys.join(','),...register.rows.map(row => keys.map(key => esc(row[key])).join(','))].join('\n') + '\n');
console.log(JSON.stringify(register.summary, null, 2));
