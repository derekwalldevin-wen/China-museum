import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const outputDir = path.join(root, 'docs', 'audits');
const auditDate = new Date().toISOString().slice(0, 10);

const paths = {
  museums: path.join(root, 'src', 'data', 'museums.ts'),
  provinces: path.join(root, 'src', 'data', 'provinces.ts'),
  imageMap: path.join(root, 'src', 'data', 'images.json'),
  productionDirs: [
    path.join(root, 'public', 'artifacts'),
    path.join(root, 'public', 'artifacts-v2'),
    path.join(root, 'public', 'artifact-sources'),
  ],
  candidates: path.join(root, 'assets', 'artifacts-v2-candidates'),
};

const validEras = new Set(['先秦', '秦汉', '魏晋南北朝', '隋唐五代', '宋辽金元', '明清', '近现代']);
const validCategories = new Set(['青铜器', '陶瓷', '书画', '玉器', '金银器', '漆器', '织绣', '石刻', '简牍', '陶俑', '杂项']);
const validShapes = new Set([
  'ding', 'zun', 'bell', 'sword', 'axe', 'vase', 'bowl', 'pot', 'scroll', 'jade', 'buddha',
  'figure', 'mask', 'tree', 'drum', 'lamp', 'cup', 'seal', 'stele', 'textile', 'gold', 'bone',
  'horse', 'chariot', 'lacquer', 'misc',
]);

async function loadTypedData(sourcePath, exportName) {
  const source = await readFile(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: sourcePath,
  }).outputText;
  const url = `data:text/javascript;base64,${Buffer.from(output).toString('base64')}`;
  const loaded = await import(url);
  return loaded[exportName];
}

async function walkFiles(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const nested = await Promise.all(entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      return entry.isDirectory() ? walkFiles(fullPath) : [fullPath];
    }));
    return nested.flat();
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

function getImageDimensions(buffer) {
  if (buffer.length >= 24 && buffer.subarray(1, 4).toString('ascii') === 'PNG') {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), format: 'png' };
  }
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;

  const sofMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let offset = 2;
  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (buffer[offset] === 0xff) offset += 1;
    const marker = buffer[offset];
    offset += 1;
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01) continue;
    if (offset + 1 >= buffer.length) break;
    const length = buffer.readUInt16BE(offset);
    if (length < 2 || offset + length > buffer.length) break;
    if (sofMarkers.has(marker)) {
      return {
        width: buffer.readUInt16BE(offset + 5),
        height: buffer.readUInt16BE(offset + 3),
        format: 'jpeg',
      };
    }
    offset += length;
  }
  return null;
}

async function inspectImage(filePath) {
  const [buffer, fileStat] = await Promise.all([readFile(filePath), stat(filePath)]);
  const dimensions = getImageDimensions(buffer);
  return {
    path: path.relative(root, filePath).replaceAll('\\', '/'),
    bytes: fileStat.size,
    width: dimensions?.width ?? null,
    height: dimensions?.height ?? null,
    format: dimensions?.format ?? null,
    sha256: createHash('sha256').update(buffer).digest('hex'),
  };
}

function duplicateValues(items, selector) {
  const counts = new Map();
  for (const item of items) {
    const value = selector(item);
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([value]) => value));
}

function csvCell(value) {
  const text = value == null ? '' : Array.isArray(value) ? value.join('；') : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function round(value, digits = 2) {
  if (value == null || Number.isNaN(value)) return null;
  return Number(value.toFixed(digits));
}

function legacyVariant(mapping) {
  if (!mapping) return null;
  return {
    src: mapping.src,
    credit: mapping.credit,
    kind: mapping.ai === true ? 'ai' : 'source',
    fit: undefined,
    provenance: undefined,
    review: undefined,
  };
}

function roleVariant(mapping, role) {
  return mapping?.variants?.[role] ?? legacyVariant(mapping);
}

function variantFieldCoverage(variants, kind) {
  const selected = variants.filter((variant) => variant?.kind === kind);
  const count = (predicate) => selected.filter(predicate).length;
  if (kind === 'source') {
    return {
      total: selected.length,
      sourceUrl: count((variant) => hasMeaningfulValue(variant.provenance?.sourceUrl)),
      institutionOrAuthor: count((variant) => hasMeaningfulValue(variant.provenance?.institution) || hasMeaningfulValue(variant.provenance?.author)),
      license: count((variant) => hasMeaningfulValue(variant.provenance?.license)),
      licenseUrl: count((variant) => hasMeaningfulValue(variant.provenance?.licenseUrl)),
      verifiedAt: count((variant) => hasMeaningfulValue(variant.provenance?.verifiedAt)),
      linkCheckedAt: count((variant) => hasMeaningfulValue(variant.provenance?.linkCheckedAt)),
      authorizationPending: count((variant) => variant.provenance?.authorizationStatus === 'pending'),
      authorizationVerified: count((variant) => variant.provenance?.authorizationStatus === 'verified'),
      authorizationRestricted: count((variant) => variant.provenance?.authorizationStatus === 'restricted'),
    };
  }
  return {
    total: selected.length,
    generator: count((variant) => hasMeaningfulValue(variant.provenance?.generator)),
    promptVersion: count((variant) => hasMeaningfulValue(variant.provenance?.promptVersion)),
    promptManifest: count((variant) => hasMeaningfulValue(variant.provenance?.promptManifest)),
    generatedAt: count((variant) => hasMeaningfulValue(variant.provenance?.generatedAt)),
    references: count((variant) => Array.isArray(variant.provenance?.references) && variant.provenance.references.length > 0),
  };
}

function hasMeaningfulValue(value) {
  const text = String(value ?? '').trim();
  return Boolean(text) && !/unknown|待核|待补/i.test(text);
}

function variantMetadataIssues(variant, role) {
  if (!variant) return [`${role}:缺少变体`];
  const issues = [];
  const prefix = `${role}:`;
  if (!variant.credit?.trim()) issues.push(`${prefix}credit为空`);
  if (!variant.provenance) {
    issues.push(`${prefix}缺少结构化provenance`);
  } else if (variant.kind === 'ai') {
    if (variant.provenance.type !== 'ai') issues.push(`${prefix}provenance类型与AI不一致`);
    if (!hasMeaningfulValue(variant.provenance.generator)) issues.push(`${prefix}缺少已核生成模型/服务`);
    if (!hasMeaningfulValue(variant.provenance.promptVersion)) issues.push(`${prefix}缺少提示词/版本`);
    if (!hasMeaningfulValue(variant.provenance.promptManifest)) issues.push(`${prefix}缺少提示词清单`);
    if (!hasMeaningfulValue(variant.provenance.generatedAt)) issues.push(`${prefix}缺少已核生成日期`);
    if (!Array.isArray(variant.provenance.references) || variant.provenance.references.length === 0) {
      issues.push(`${prefix}缺少史料依据记录`);
    }
  } else {
    if (variant.provenance.type !== 'source') issues.push(`${prefix}provenance类型与来源图不一致`);
    if (!variant.provenance.sourceUrl) issues.push(`${prefix}缺少来源页URL`);
    if (!variant.provenance.institution && !variant.provenance.author) issues.push(`${prefix}缺少作者/机构`);
    if (!variant.provenance.license) issues.push(`${prefix}缺少许可类型`);
    if (!variant.provenance.licenseUrl) issues.push(`${prefix}缺少许可URL`);
    if (!variant.provenance.verifiedAt) issues.push(`${prefix}缺少核验日期`);
    if (variant.provenance.authorizationStatus !== 'verified') issues.push(`${prefix}授权尚未确认`);
    if (variant.provenance.assetMatchStatus !== 'verified') issues.push(`${prefix}当前文件来源绑定未确认`);
  }
  if (!variant.review) {
    issues.push(`${prefix}缺少视觉/史实审核记录`);
  } else {
    if (!variant.review.visual) issues.push(`${prefix}缺少视觉审核状态`);
    if (!variant.review.historical) issues.push(`${prefix}缺少史实审核状态`);
    if (!variant.review.reviewedAt) issues.push(`${prefix}缺少审核日期`);
    if (!variant.review.reviewedBy) issues.push(`${prefix}缺少审核人`);
  }
  return issues;
}

const [museums, provinces, museumIntros, imageMap] = await Promise.all([
  loadTypedData(paths.museums, 'museums'),
  loadTypedData(paths.provinces, 'provinces'),
  loadTypedData(path.join(root, 'src', 'data', 'museum-intros.ts'), 'museumIntros'),
  readFile(paths.imageMap, 'utf8').then(JSON.parse),
]);

const artifacts = museums.flatMap((museum) => museum.artifacts.map((artifact) => ({
  ...artifact,
  museumId: museum.id,
  museumName: museum.name,
  province: museum.province,
  city: museum.city,
})));
const artifactById = new Map(artifacts.map((artifact) => [artifact.id, artifact]));
const provinceNames = new Set(provinces.map((province) => province.name));

const museumIdDuplicates = duplicateValues(museums, (museum) => museum.id);
const artifactIdDuplicates = duplicateValues(artifacts, (artifact) => artifact.id);
const artifactNameDuplicates = duplicateValues(artifacts, (artifact) => artifact.name);

const productionFiles = (await Promise.all(paths.productionDirs.map(walkFiles)))
  .flat()
  .filter((file) => /\.(jpe?g|png|webp)$/i.test(file));
const candidateFiles = (await walkFiles(paths.candidates)).filter((file) => /\.(jpe?g|png|webp)$/i.test(file));
const productionInspections = await Promise.all(productionFiles.map(inspectImage));
const candidateInspections = await Promise.all(candidateFiles.map(inspectImage));

const productionByRelativeSrc = new Map(productionInspections.map((item) => [`/${item.path.replace(/^public\//, '')}`, item]));
const productionIds = new Set(productionFiles.map((file) => path.basename(file, path.extname(file))));
const mappedIds = new Set(Object.keys(imageMap));

const candidates = candidateInspections.map((item) => {
  const filename = path.basename(item.path, path.extname(item.path));
  const artifactId = filename.replace(/-v\d+$/i, '');
  return {
    ...item,
    filename,
    artifactId,
    artifactExists: artifactById.has(artifactId),
    currentlyRegistered: [
      imageMap[artifactId]?.src,
      imageMap[artifactId]?.variants?.card?.src,
      imageMap[artifactId]?.variants?.detail?.src,
    ].includes(`/${item.path.replace(/^assets\//, '')}`),
  };
});
const candidateIds = new Set(candidates.filter((item) => item.artifactExists).map((item) => item.artifactId));

const hashGroups = new Map();
for (const image of productionInspections) {
  const group = hashGroups.get(image.sha256) ?? [];
  group.push(image.path);
  hashGroups.set(image.sha256, group);
}
const duplicateHashes = new Map([...hashGroups.entries()].filter(([, group]) => group.length > 1));

const rows = artifacts.map((artifact) => {
  const mapping = imageMap[artifact.id] ?? null;
  const cardVariant = roleVariant(mapping, 'card');
  const detailVariant = roleVariant(mapping, 'detail');
  const image = cardVariant ? productionByRelativeSrc.get(cardVariant.src) ?? null : null;
  const detailImage = detailVariant ? productionByRelativeSrc.get(detailVariant.src) ?? null : null;
  const legacyImage = mapping?.src ? productionByRelativeSrc.get(mapping.src) ?? null : null;
  const ratio = image?.width && image?.height ? image.width / image.height : null;
  const detailRatio = detailImage?.width && detailImage?.height ? detailImage.width / detailImage.height : null;
  const shortestSide = image?.width && image?.height ? Math.min(image.width, image.height) : null;
  const displayRetained = ratio ? Math.min(ratio / 0.8, 0.8 / ratio) : null;
  const duplicateGroup = image ? duplicateHashes.get(image.sha256) ?? [] : [];
  const dataIssues = [];
  const imageIssues = [];
  const sourceIssues = [];

  for (const field of ['id', 'name', 'dynasty', 'era', 'category', 'shape', 'story']) {
    if (!String(artifact[field] ?? '').trim()) dataIssues.push(`缺少字段:${field}`);
  }
  if (artifactIdDuplicates.has(artifact.id)) dataIssues.push('文物ID重复');
  if (artifactNameDuplicates.has(artifact.name)) dataIssues.push('文物名称重复');
  if (!validEras.has(artifact.era)) dataIssues.push('时代分组无效');
  if (!validCategories.has(artifact.category)) dataIssues.push('类别无效');
  if (!validShapes.has(artifact.shape)) dataIssues.push('图形键无效');
  if (artifact.story.length < 80) dataIssues.push(`故事偏短:${artifact.story.length}字`);
  if (artifact.story.length > 150) dataIssues.push(`故事偏长:${artifact.story.length}字`);

  if (!mapping) imageIssues.push('缺少图片映射');
  if (mapping && !image) imageIssues.push('card映射文件不存在或不在生产目录');
  if (mapping && !detailImage) imageIssues.push('detail映射文件不存在或不在生产目录');
  if (mapping?.variants?.card?.kind === 'ai' && ![`/artifacts-v2/p1/${artifact.id}.png`, `/artifacts-v2/p2-source/${artifact.id}.png`].includes(mapping.variants.card.src)) {
    imageIssues.push('V2 card路径需核对批次命名约定');
  }
  if (mapping?.imageHold) imageIssues.push(`图片暂缓展示:${mapping.imageHold.reason}`);
  if (!mapping?.variants && mapping && mapping.src !== `/artifacts/${artifact.id}.jpg`) {
    imageIssues.push('旧映射路径不符合ID命名约定');
  }
  if (image && (!image.width || !image.height)) imageIssues.push('card图片无法解析尺寸');
  if (detailImage && (!detailImage.width || !detailImage.height)) imageIssues.push('detail图片无法解析尺寸');
  if (image && image.bytes < 30 * 1024) imageIssues.push('文件小于30KB');
  if (shortestSide != null && shortestSide < 600) imageIssues.push(`短边低于600px:${shortestSide}`);
  else if (shortestSide != null && shortestSide < 900) imageIssues.push(`短边低于900px:${shortestSide}`);
  if (artifact.shape === 'scroll' && ratio != null && ratio > 3) imageIssues.push(`长卷卡片可读面积偏低:${round(0.8 / ratio * 100, 1)}%`);
  if (artifact.shape !== 'scroll' && cardVariant?.fit !== 'contain' && displayRetained != null && displayRetained < 0.55) {
    imageIssues.push(`卡片object-cover预计仅保留${round(displayRetained * 100, 1)}%画面`);
  }
  if (duplicateGroup.length > 1) imageIssues.push(`文件内容完全重复:${duplicateGroup.length}份`);

  if (mapping) {
    sourceIssues.push(...variantMetadataIssues(cardVariant, 'card'));
    sourceIssues.push(...variantMetadataIssues(detailVariant, 'detail'));
  }

  const severe = imageIssues.some((issue) => /缺少|不存在|无法解析/.test(issue)) || dataIssues.some((issue) => /ID重复|无效|缺少字段/.test(issue));
  const high = Boolean(mapping?.imageHold) || imageIssues.some((issue) => /600px|30KB|可读面积|object-cover|完全重复/.test(issue));
  const medium = imageIssues.some((issue) => /900px/.test(issue)) || dataIssues.length > 0;
  const priority = severe ? 'P0' : high ? 'P1' : medium ? 'P2' : 'P3';
  let recommendedAction = '纳入统一AI重置，保留当前图至新图验收';
  if (severe) recommendedAction = '立即修复数据/映射并优先重置图片';
  else if (mapping?.imageHold) recommendedAction = '维持图片隔离，先寻找实体匹配与授权证据，不沿用争议参考生成新图';
  else if (mapping?.variants) recommendedAction = '已登记V2：继续视觉、史实与来源许可核验，不代表授权通过';
  else if (candidateIds.has(artifact.id)) recommendedAction = '已有AI候选图：先做史实与风格验收，再决定替换';
  else if (high) recommendedAction = '列入第一批AI重置并检查卡片构图';
  else if (medium) recommendedAction = '列入第二批AI重置并同步修订数据';

  return {
    priority,
    artifactId: artifact.id,
    artifactName: artifact.name,
    museumId: artifact.museumId,
    museumName: artifact.museumName,
    province: artifact.province,
    dynasty: artifact.dynasty,
    era: artifact.era,
    category: artifact.category,
    shape: artifact.shape,
    storyChars: artifact.story.length,
    mapped: Boolean(mapping),
    v2Migrated: Boolean(mapping?.variants),
    imageHold: mapping?.imageHold ?? null,
    imageExists: Boolean(image),
    detailImageExists: Boolean(detailImage),
    imageSrc: cardVariant?.src ?? '',
    cardKind: cardVariant?.kind ?? '',
    cardFit: cardVariant?.fit ?? '',
    detailSrc: detailVariant?.src ?? '',
    detailKind: detailVariant?.kind ?? '',
    detailFit: detailVariant?.fit ?? '',
    sameCardDetailAsset: Boolean(cardVariant?.src && cardVariant.src === detailVariant?.src),
    cardDetailKindPair: cardVariant && detailVariant ? `${cardVariant.kind}-${detailVariant.kind}` : '',
    cardNeedsLineArtFallback: !image && !(cardVariant?.src !== mapping?.src && legacyImage),
    detailNeedsLineArtFallback: !detailImage && !(detailVariant?.src !== mapping?.src && legacyImage),
    cardVisualReview: cardVariant?.review?.visual ?? '',
    cardHistoricalReview: cardVariant?.review?.historical ?? '',
    detailVisualReview: detailVariant?.review?.visual ?? '',
    detailHistoricalReview: detailVariant?.review?.historical ?? '',
    width: image?.width ?? null,
    height: image?.height ?? null,
    aspectRatio: round(ratio, 3),
    detailWidth: detailImage?.width ?? null,
    detailHeight: detailImage?.height ?? null,
    detailAspectRatio: round(detailRatio, 3),
    scrollDetailMode: artifact.shape === 'scroll' ? (detailRatio != null && detailRatio >= 2.4 ? 'panorama' : 'static') : '',
    bytes: image?.bytes ?? null,
    sha256: image?.sha256 ?? '',
    credit: cardVariant?.credit ?? '',
    aiFlag: cardVariant?.kind === 'ai',
    aiCandidateCount: candidates.filter((item) => item.artifactId === artifact.id).length,
    dataIssues,
    imageIssues,
    sourceIssues,
    recommendedAction,
  };
});

const museumIssues = museums.flatMap((museum) => {
  const issues = [];
  for (const field of ['id', 'name', 'province', 'city']) {
    if (!String(museum[field] ?? '').trim()) issues.push(`缺少字段:${field}`);
  }
  // 简介单独存放在懒加载模块 museum-intros.ts，这里按 id 核对是否齐备。
  if (!String(museumIntros[museum.id] ?? '').trim()) issues.push('缺少字段:intro');
  if (museumIdDuplicates.has(museum.id)) issues.push('博物馆ID重复');
  if (!provinceNames.has(museum.province)) issues.push('省份未在provinces.ts登记');
  if (!Array.isArray(museum.coord) || museum.coord.length !== 2 || museum.coord.some((value) => !Number.isFinite(value))) {
    issues.push('坐标无效');
  }
  if (!museum.artifacts.length) issues.push('无文物记录');
  return issues.length ? [{ museumId: museum.id, museumName: museum.name, issues }] : [];
});

const orphanMappings = [...mappedIds].filter((id) => !artifactById.has(id));
const registeredSources = new Set(Object.values(imageMap).flatMap((mapping) => [
  mapping.src,
  ...Object.values(mapping.variants ?? {}).map((variant) => variant?.src),
  ...(mapping.retiredAssets ?? []).map((asset) => asset.src),
]).filter(Boolean));
const orphanProductionFiles = productionInspections
  .filter((item) => !registeredSources.has(`/${item.path.replace(/^public\//, '')}`)
    && !artifactById.has(path.basename(item.path, path.extname(item.path))))
  .map((item) => item.path);
const artifactsWithoutFilename = artifacts.filter((artifact) => !productionIds.has(artifact.id)).map((artifact) => artifact.id);
const priorityCounts = Object.fromEntries(['P0', 'P1', 'P2', 'P3'].map((priority) => [priority, rows.filter((row) => row.priority === priority).length]));
const uniqueCandidateArtifactIds = [...candidateIds].sort();
const resolvedVariants = rows.flatMap((row) => [roleVariant(imageMap[row.artifactId], 'card'), roleVariant(imageMap[row.artifactId], 'detail')]).filter(Boolean);
const structuredVariants = Object.values(imageMap).flatMap((mapping) => Object.values(mapping.variants ?? {})).filter(Boolean);
const aiCoverage = variantFieldCoverage(resolvedVariants, 'ai');
const sourceCoverage = variantFieldCoverage(resolvedVariants, 'source');
const aiVariants = resolvedVariants.filter((variant) => variant.kind === 'ai');
const sourceVariants = resolvedVariants.filter((variant) => variant.kind === 'source');

const summary = {
  generatedAt: new Date().toISOString(),
  auditDate,
  scope: {
    museums: museums.length,
    provincesInMetadata: provinces.length,
    artifacts: artifacts.length,
    productionImageMappings: Object.keys(imageMap).length,
    productionImageFiles: productionFiles.length,
    candidateImageFiles: candidates.length,
    candidateArtifactIds: uniqueCandidateArtifactIds.length,
  },
  integrity: {
    museumIssues: museumIssues.length,
    duplicateMuseumIds: [...museumIdDuplicates],
    duplicateArtifactIds: [...artifactIdDuplicates],
    duplicateArtifactNames: [...artifactNameDuplicates],
    orphanMappings,
    orphanProductionFiles,
    artifactsWithoutFilename,
    rowsWithDataIssues: rows.filter((row) => row.dataIssues.length).length,
  },
  images: {
    countingPolicy: '下列原有角色数量统计登记数据，不等于当前可展示数量；暂缓展示见 imageHoldRecords。',
    imageHoldRecords: rows.filter((row) => row.imageHold).length,
    visiblePrimaryCardImages: rows.filter((row) => !row.imageHold).length,
    sourceDetailsSuppressedByRestriction: sourceVariants.filter((variant) => variant.provenance?.authorizationStatus === 'restricted').length,
    v2MigratedRecords: rows.filter((row) => row.v2Migrated).length,
    legacyRecords: rows.filter((row) => !row.v2Migrated).length,
    structuredRoleImages: structuredVariants.length,
    legacyRoleImages: resolvedVariants.length - structuredVariants.length,
    aiCardRecords: rows.filter((row) => row.cardKind === 'ai').length,
    aiDetailRecords: rows.filter((row) => row.detailKind === 'ai').length,
    sourceCardRecords: rows.filter((row) => row.cardKind === 'source').length,
    mixedCardDetailKinds: rows.filter((row) => row.cardKind && row.detailKind && row.cardKind !== row.detailKind).length,
    sameCardDetailAssets: rows.filter((row) => row.sameCardDetailAsset).length,
    differentCardDetailAssets: rows.filter((row) => !row.sameCardDetailAsset).length,
    sourceDetailRecords: rows.filter((row) => row.detailKind === 'source').length,
    scrollRecords: rows.filter((row) => row.shape === 'scroll').length,
    scrollDualImageRecords: rows.filter((row) => row.shape === 'scroll' && !row.sameCardDetailAsset).length,
    scrollPanoramaDetails: rows.filter((row) => row.shape === 'scroll' && row.scrollDetailMode === 'panorama').length,
    scrollStaticDetails: rows.filter((row) => row.shape === 'scroll' && row.scrollDetailMode === 'static').length,
    cardVisualApproved: rows.filter((row) => row.cardVisualReview === 'approved').length,
    cardVisualUnreviewed: rows.filter((row) => !row.cardVisualReview).length,
    detailVisualApproved: rows.filter((row) => row.detailVisualReview === 'approved').length,
    detailVisualUnreviewed: rows.filter((row) => !row.detailVisualReview).length,
    cardHistoricalApproved: rows.filter((row) => row.cardHistoricalReview === 'approved').length,
    cardHistoricalPending: rows.filter((row) => row.cardHistoricalReview === 'pending').length,
    cardHistoricalUnreviewed: rows.filter((row) => !row.cardHistoricalReview).length,
    detailHistoricalApproved: rows.filter((row) => row.detailHistoricalReview === 'approved').length,
    detailHistoricalPending: rows.filter((row) => row.detailHistoricalReview === 'pending').length,
    detailHistoricalUnreviewed: rows.filter((row) => !row.detailHistoricalReview).length,
    visualRejected: rows.filter((row) => row.cardVisualReview === 'rejected' || row.detailVisualReview === 'rejected').length,
    historicalRejected: rows.filter((row) => row.cardHistoricalReview === 'rejected' || row.detailHistoricalReview === 'rejected').length,
    missingMappings: rows.filter((row) => !row.mapped).length,
    missingFiles: rows.filter((row) => row.mapped && !row.imageExists).length,
    missingDetailFiles: rows.filter((row) => row.mapped && !row.detailImageExists).length,
    undecodable: rows.filter((row) => row.imageIssues.some((issue) => issue.includes('无法解析'))).length,
    under30KB: rows.filter((row) => row.imageIssues.some((issue) => issue.includes('30KB'))).length,
    shortestSideUnder600: rows.filter((row) => row.imageIssues.some((issue) => issue.includes('低于600px'))).length,
    shortestSide600To899: rows.filter((row) => row.imageIssues.some((issue) => issue.includes('低于900px'))).length,
    detailShortestSideUnder300: rows.filter((row) => row.detailWidth && row.detailHeight && Math.min(row.detailWidth, row.detailHeight) < 300).length,
    detailShortestSide300To599: rows.filter((row) => row.detailWidth && row.detailHeight && Math.min(row.detailWidth, row.detailHeight) >= 300 && Math.min(row.detailWidth, row.detailHeight) < 600).length,
    displayCompositionRisks: rows.filter((row) => row.imageIssues.some((issue) => /可读面积|object-cover/.test(issue))).length,
    lineArtFallbackRequired: rows.filter((row) => row.cardNeedsLineArtFallback || row.detailNeedsLineArtFallback).length,
    exactDuplicateGroups: duplicateHashes.size,
    exactDuplicateFiles: [...duplicateHashes.values()].reduce((sum, group) => sum + group.length, 0),
    aiRoleImages: aiCoverage.total,
    sourceRoleImages: sourceCoverage.total,
    priorityCounts,
    totalProductionBytes: productionInspections.reduce((sum, image) => sum + image.bytes, 0),
  },
  provenance: {
    completeStructuredRecords: rows.filter((row) => row.sourceIssues.length === 0).length,
    incompleteStructuredRecords: rows.filter((row) => row.sourceIssues.length > 0).length,
    completeAiRoleImages: aiVariants.filter((variant) => variantMetadataIssues(variant, 'role').length === 0).length,
    incompleteAiRoleImages: aiVariants.filter((variant) => variantMetadataIssues(variant, 'role').length > 0).length,
    completeSourceRoleImages: sourceVariants.filter((variant) => variantMetadataIssues(variant, 'role').length === 0).length,
    incompleteSourceRoleImages: sourceVariants.filter((variant) => variantMetadataIssues(variant, 'role').length > 0).length,
    aiVariantFieldCoverage: aiCoverage,
    sourceVariantFieldCoverage: sourceCoverage,
    sourceRecordsWithExplicitLicense: sourceCoverage.license,
    sourceRecordsAuthorizationPending: sourceCoverage.authorizationPending,
    sourceRecordsAuthorizationVerified: sourceCoverage.authorizationVerified,
    note: '仅核验仓库内字段完整性，未对外部授权页面做法律或在线复核。',
  },
};

const csvColumns = [
  ['优先级', 'priority'], ['文物ID', 'artifactId'], ['文物名称', 'artifactName'], ['博物馆ID', 'museumId'],
  ['博物馆', 'museumName'], ['省份', 'province'], ['朝代', 'dynasty'], ['时代', 'era'], ['类别', 'category'],
  ['形态', 'shape'], ['故事字数', 'storyChars'], ['已映射', 'mapped'], ['V2已迁移', 'v2Migrated'],
  ['卡片文件存在', 'imageExists'], ['详情文件存在', 'detailImageExists'],
  ['卡片路径', 'imageSrc'], ['卡片类型', 'cardKind'], ['卡片适配', 'cardFit'],
  ['详情路径', 'detailSrc'], ['详情类型', 'detailKind'], ['详情适配', 'detailFit'],
  ['卡片详情同图', 'sameCardDetailAsset'], ['卡片详情类型组合', 'cardDetailKindPair'],
  ['卡片需线刻回退', 'cardNeedsLineArtFallback'], ['详情需线刻回退', 'detailNeedsLineArtFallback'],
  ['卡片视觉审核', 'cardVisualReview'], ['卡片史实审核', 'cardHistoricalReview'],
  ['详情视觉审核', 'detailVisualReview'], ['详情史实审核', 'detailHistoricalReview'],
  ['宽', 'width'], ['高', 'height'], ['宽高比', 'aspectRatio'],
  ['详情宽', 'detailWidth'], ['详情高', 'detailHeight'], ['详情宽高比', 'detailAspectRatio'], ['长卷详情模式', 'scrollDetailMode'], ['字节数', 'bytes'],
  ['SHA256', 'sha256'], ['credit', 'credit'], ['生产AI标记', 'aiFlag'], ['AI候选数量', 'aiCandidateCount'],
  ['数据问题', 'dataIssues'], ['图片问题', 'imageIssues'], ['来源元数据问题', 'sourceIssues'], ['建议动作', 'recommendedAction'],
];
const csv = [
  csvColumns.map(([label]) => csvCell(label)).join(','),
  ...rows.sort((a, b) => a.priority.localeCompare(b.priority) || a.artifactId.localeCompare(b.artifactId))
    .map((row) => csvColumns.map(([, key]) => csvCell(row[key])).join(',')),
].join('\r\n');

const machineSummary = `# 文物数据与图片资产自动审计摘要\n\n` +
  `> 生成时间：${summary.generatedAt}\n\n` +
  `- 博物馆：${summary.scope.museums}\n` +
  `- 文物：${summary.scope.artifacts}\n` +
  `- 生产图片映射 / 文件：${summary.scope.productionImageMappings} / ${summary.scope.productionImageFiles}\n` +
  `- V2 已迁移：${summary.images.v2MigratedRecords} 件；card/detail 混合来源：${summary.images.mixedCardDetailKinds} 件\n` +
  `- 卡片 / 详情使用同一文件：${summary.images.sameCardDetailAssets} / ${summary.images.differentCardDetailAssets} 件\n` +
  `- 长卷：${summary.images.scrollRecords} 件；双图片 ${summary.images.scrollDualImageRecords} 件；可横向阅卷 ${summary.images.scrollPanoramaDetails} 件\n` +
  `- 卡片视觉已通过 / 史实待核：${summary.images.cardVisualApproved} / ${summary.images.cardHistoricalPending}\n` +
  `- 详情史实已通过 / 待核 / 未记录：${summary.images.detailHistoricalApproved} / ${summary.images.detailHistoricalPending} / ${summary.images.detailHistoricalUnreviewed}\n` +
  `- AI 候选图：${summary.scope.candidateImageFiles} 张，覆盖 ${summary.scope.candidateArtifactIds} 件文物\n` +
  `- 缺映射 / 缺卡片 / 缺详情 / 无法解码：${summary.images.missingMappings} / ${summary.images.missingFiles} / ${summary.images.missingDetailFiles} / ${summary.images.undecodable}\n` +
  `- 需要线刻回退：${summary.images.lineArtFallbackRequired}\n` +
  `- 短边 <600px / 600–899px：${summary.images.shortestSideUnder600} / ${summary.images.shortestSide600To899}\n` +
  `- 详情图短边 <300px / 300–599px：${summary.images.detailShortestSideUnder300} / ${summary.images.detailShortestSide300To599}\n` +
  `- 展示构图风险：${summary.images.displayCompositionRisks}\n` +
  `- 完全重复文件组：${summary.images.exactDuplicateGroups}\n` +
  `- 数据有问题的文物：${summary.integrity.rowsWithDataIssues}\n` +
  `- 具备完整结构化来源元数据：${summary.provenance.completeStructuredRecords} / ${summary.scope.artifacts}\n` +
  `- 来源详情图具备来源页 / 明确许可：${summary.provenance.sourceVariantFieldCoverage.sourceUrl} / ${summary.provenance.sourceRecordsWithExplicitLicense}\n` +
  `- 优先级：P0 ${priorityCounts.P0}、P1 ${priorityCounts.P1}、P2 ${priorityCounts.P2}、P3 ${priorityCounts.P3}\n\n` +
  `说明：该摘要由脚本按固定规则生成；最终判断请见同目录的人工审计报告。\n`;

await mkdir(outputDir, { recursive: true });
await Promise.all([
  writeFile(path.join(outputDir, 'artifact-asset-audit.json'), `${JSON.stringify({ summary, museumIssues, candidates, duplicateGroups: Object.fromEntries(duplicateHashes), rows }, null, 2)}\n`, 'utf8'),
  writeFile(path.join(outputDir, 'artifact-asset-inventory.csv'), `\ufeff${csv}`, 'utf8'),
  writeFile(path.join(outputDir, 'artifact-asset-auto-summary.md'), machineSummary, 'utf8'),
]);

console.log(JSON.stringify(summary, null, 2));
