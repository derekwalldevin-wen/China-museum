import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const register = JSON.parse(await readFile(path.join(root, 'docs/audits/2026-09-23-image-verification-register.json'), 'utf8'));
const images = JSON.parse(await readFile(path.join(root, 'src/data/images.json'), 'utf8'));
const checkedAt = '2026-09-23';

// Search results are admitted only when the URL itself identifies the exact item or its
// official collection record. These citations establish identity, not image reuse rights.
const authorityEvidence = {
  'ah-czd': ['https://www.shouxian.gov.cn/zwzx/jrsz/8139363.html', '寿县政府页面明确称“铸客大鼎/楚大鼎”为安徽博物院镇馆之宝，并给出出土、尺寸、铭文等器物特征。'],
  'gg-gzdc': ['https://www.dpm.org.cn/collection/ceramic/226759.html', '故宫藏品页以文物号故00154493标识“各种釉彩大瓶”，列出乾隆年代、尺寸及正反面/款识图。'],
  'sb-bjl': ['https://www.capitalmuseum.org.cn/collection/d49fbc66d3094c1ab54b5d533954c2c3', '首都博物馆藏品页标题为“伯矩鬲”，记录1974年琉璃河251号墓出土、铭文与器物尺寸。'],
  'sb-jd': ['https://capitalmuseum.org.cn/collection/96e22dcba9ca4c52943ad07d2611bf96', '首都博物馆藏品页标题为“堇鼎”，记录253号墓出土、尺寸及铭文关联。'],
  'gs-yxt': ['https://www.dpm.org.cn/topic/zhongguo_compatible.html', '故宫专题页明确列出“魏晋驿使图画像砖，甘肃省博物馆藏”，并描述持棨传、驿马驰行等图像特征。'],
  'gs-rts': ['https://www.dpm.org.cn/topic/zhongguo_lifework.html', '故宫专题页明确列出甘肃省博物馆藏“人头形器口彩陶瓶”，并给出尺寸、材质与纹饰说明。'],
  'hub-zhy': ['https://www.hbww.org.cn/zgzb/p/4695.html', '湖北省博物馆镇馆之宝藏品页标题为“曾侯乙编钟”，记载曾侯乙墓出土、65件编钟及铭文特征。'],
  'dz-jp': ['https://wenwu.hebei.gov.cn/system/2023/11/23/030264836.shtml', '河北省文物局页面指向定州博物馆，明确描述馆藏白釉刻花龙首大净瓶的器形、尺寸与考古背景；页面名称略异，需馆方目录号进一步锁定。'],
  'ny-sly': ['https://www.nywmuseum.org.cn/Collection/Details/dcjp?nid=56', '南越王博物院典藏页标题“丝缕玉衣”，载明西汉南越国、南越文王墓出土、全长173厘米及玉片构成。'],
  'gd-mlt': ['https://www.gdmuseum.org.cn/cn/col48/15818', '广东省博物馆页面明确说明南宋陈容《墨龙图》轴及其绢本构成、题识和画面特征。'],
  'nj-zlqx': ['https://vr.njmuseum.org.cn/', '南京博物院数字文物页面列有“竹林七贤与荣启期模印砖画”；未在该入口检得考古编号或单件目录字段。'],
  'yn-dwy': ['https://www.ynrd.gov.cn/html/2021/bainiandangshi_1111/15713.html', '云南人大网页面称“滇王之印”现收藏于中国国家博物馆，与项目当前“云南省博物馆”归属冲突；需人工复核馆藏归属，未改业务数据。'],
};
const authorityEvidenceStatus = {
  'ah-czd': 'match-supported', 'gg-gzdc': 'match-supported', 'sb-bjl': 'match-supported',
  'sb-jd': 'match-supported', 'gs-yxt': 'match-supported', 'gs-rts': 'match-supported',
  'hub-zhy': 'match-supported', 'ny-sly': 'match-supported', 'gd-mlt': 'match-supported',
  'dz-jp': 'item-name-or-catalog-id-needs-resolution', 'nj-zlqx': 'item-name-found-catalog-id-needs-confirmation',
  'yn-dwy': 'museum-assignment-conflict',
};

const hashLocal = async (assetPath) => {
  if (!assetPath) return '';
  try {
    const bytes = await readFile(path.join(root, 'public', assetPath.replace(/^\//, '')));
    return createHash('sha256').update(bytes).digest('hex');
  } catch {
    return '';
  }
};
const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
const records = [];
for (const row of register.records.filter((entry) => ['D-UNTRACED', 'C-SOURCE-PENDING'].includes(entry.evidenceGrade))) {
  if (row.evidenceGrade === 'D-UNTRACED') {
    const evidence = authorityEvidence[row.id];
    records.push({
      id: row.id, name: row.name, museum: row.museum, grade: row.evidenceGrade,
      searchedAt: checkedAt, query: `"${row.name}" "${row.museum}" 官方 馆藏`,
      authorityEvidenceStatus: authorityEvidenceStatus[row.id] ?? 'no-validated-authority-page',
      authorityUrl: evidence?.[0] ?? '', matchEvidence: evidence?.[1] ?? '本轮已按文物名+馆名逐件检索；未确认可直接引用的权威单件目录页。该空缺不是藏品不存在的证据。',
      imageSourceUrl: '', sourceLicense: '', authorizationStatus: 'not-assessed-ai-illustration',
      localAssetPath: row.detailPath, localAssetSha256: row.detailLocal.sha256,
      originalSha256: '', processingChain: '', replacementDecision: 'retain-ai-or-pending',
    });
  } else {
    const image = images[row.id] ?? {};
    const provenance = image.variants?.detail?.provenance ?? {};
    records.push({
      id: row.id, name: row.name, museum: row.museum, grade: row.evidenceGrade,
      searchedAt: checkedAt, query: `核对来源文件页、许可说明及本地详情资源：${row.detailSourceUrl || '无来源页'}`,
      authorityEvidenceStatus: '',
      authorityUrl: row.authorityUrl ?? '', matchEvidence: row.sourceNote || '当前表内尚无可复核的逐件匹配描述。',
      imageSourceUrl: row.detailSourceUrl, sourceLicense: row.license,
      authorizationStatus: row.authorizationStatus || provenance.authorizationStatus || 'pending',
      localAssetPath: row.detailPath, localAssetSha256: await hashLocal(row.detailPath),
      originalSha256: provenance.originalSha256 ?? '', processingChain: Array.isArray(provenance.processingChain) && provenance.processingChain.length ? JSON.stringify(provenance.processingChain) : '',
      recordedAssetSha256: provenance.assetSha256 ?? '',
      recordedHashMatchesLocal: (provenance.assetSha256 ?? '') === await hashLocal(row.detailPath),
      modificationNote: provenance.modifications ?? '',
      originalFileDownloadedAndHashedThisRound: false,
      licenseEvidenceClosedThisRound: false,
      chainClosure: 'open-missing-original-file-digest-and-source-to-derivative-proof',
      replacementDecision: 'retain-current-pending',
    });
  }
}

const columns = ['id','name','museum','grade','searchedAt','query','authorityUrl','authorityEvidenceStatus','matchEvidence','imageSourceUrl','sourceLicense','authorizationStatus','localAssetPath','localAssetSha256','recordedAssetSha256','recordedHashMatchesLocal','originalSha256','processingChain','modificationNote','originalFileDownloadedAndHashedThisRound','licenseEvidenceClosedThisRound','chainClosure','replacementDecision'];
const csv = [columns.map(quote).join(','), ...records.map((row) => columns.map((column) => quote(row[column])).join(','))].join('\n') + '\n';
const outDir = path.join(root, 'docs/audits');
await writeFile(path.join(outDir, '2026-09-23-round5-item-evidence.csv'), csv, 'utf8');
await writeFile(path.join(outDir, '2026-09-23-round5-item-evidence.json'), `${JSON.stringify({ checkedAt, records: records.length, counts: {
  D: records.filter((row) => row.grade === 'D-UNTRACED').length,
  C: records.filter((row) => row.grade === 'C-SOURCE-PENDING').length,
  DWithDirectAuthorityPage: records.filter((row) => row.grade === 'D-UNTRACED' && row.authorityUrl).length,
  DMatchSupported: records.filter((row) => row.authorityEvidenceStatus === 'match-supported').length,
  DIdentityNeedsResolution: records.filter((row) => row.authorityEvidenceStatus.includes('needs-')).length,
  DAssignmentConflict: records.filter((row) => row.authorityEvidenceStatus === 'museum-assignment-conflict').length,
  CWithLocalSha256: records.filter((row) => row.grade === 'C-SOURCE-PENDING' && row.localAssetSha256).length,
  CRecordedHashMatchesLocal: records.filter((row) => row.grade === 'C-SOURCE-PENDING' && row.recordedHashMatchesLocal).length,
  CWithOriginalSha256: records.filter((row) => row.grade === 'C-SOURCE-PENDING' && row.originalSha256).length,
  CWithProcessingChain: records.filter((row) => row.grade === 'C-SOURCE-PENDING' && row.processingChain).length,
  COriginalFilesDownloadedAndHashedThisRound: records.filter((row) => row.grade === 'C-SOURCE-PENDING' && row.originalFileDownloadedAndHashedThisRound).length,
  CLicenseEvidenceClosedThisRound: records.filter((row) => row.grade === 'C-SOURCE-PENDING' && row.licenseEvidenceClosedThisRound).length,
  replacements: records.filter((row) => row.replacementDecision === 'replace').length,
}, records }, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ records: records.length, directAuthorityPages: records.filter((row) => row.grade === 'D-UNTRACED' && row.authorityUrl).length }));
