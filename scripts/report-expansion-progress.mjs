import { readFile, writeFile, stat } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const read = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const museums = await read('src/data/museum-index.json');
const tranche=process.argv[2]??'01';
if(!/^\d{2}$/.test(tranche))throw Error('Expected two-digit tranche');
const admission = await read(`assets/expansion/admission-tranche-${tranche}.json`);
const html = await readFile(new URL('dist/index.html', root), 'utf8');
const queue = [...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map(match => new URL(match[1], new URL('dist/', root)));
const seen = new Set(); const chunks = [];
while (queue.length) {
  const url = queue.shift();
  if (seen.has(url.href)) continue;
  seen.add(url.href);
  const code = await readFile(url, 'utf8');
  chunks.push({ name: url.pathname.split('/').pop(), bytes: (await stat(url)).size });
  for (const match of code.matchAll(/(?:from|import)\s*["'](\.[^"']+\.js)["']/g)) queue.push(new URL(match[1], url));
}
const tap = await readFile(new URL('docs/audits/expansion-600-tests.tap', root), 'utf8');
const testCount = Number(tap.match(/^# tests (\d+)$/m)?.[1]);
const passed = Number(tap.match(/^# pass (\d+)$/m)?.[1]);
const failures = Number(tap.match(/^# fail (\d+)$/m)?.[1]);
if (!testCount || passed !== testCount || failures !== 0) throw new Error('No complete passing unit-test receipt');
const report = {
  generatedAt: new Date().toISOString(), localOnly: true, target: 600,
  artifacts: museums.reduce((sum, museum) => sum + museum.artifacts.length, 0), museums: museums.length,
  admittedThisTranche: admission.admitted.length, existingPreserved: tranche==='05'?343:tranche==='04'?298:tranche==='03'?253:223,
  aiIllustrations: admission.admitted.filter(record => record.imageKind === 'ai').length,
  newlyVerifiedReusablePhotographs: 0,
  officialCatalogueRecords: (await read('assets/expansion/candidate-register.json')).candidates.length,
  candidateWarning: '按URL去重的目录记录，不代表实物去重与授权核验完成；不计入应用藏品数量。',
  initialJavaScript: { chunks, bytes: chunks.reduce((sum, chunk) => sum + chunk.bytes, 0), budget: 328000 },
  unitTests: { total: testCount, passed, failures },
  acceptance: {
    additions: await read(`docs/audits/expansion-600-browser/${tranche==='01'?'local':`tranche-${tranche}`}/results.json`),
    interaction: await read('docs/audits/round3-closeout-browser/results.json'),
    map: await read('docs/audits/map-browser/local/results.json'),
    imageScheduling: await read('docs/audits/image-scheduling-browser/local/results.json'),
  },
  risks: ['600目标尚未完成，候选不计入已入库数量。', 'AI图的历史细部继续待核；没有新确认的开放许可原物照片。', '候选有同名、同物异页与成组记录，需逐件实物去重。', '真机、Safari未验；手机验收为390px无头模拟。', '扩大到600之前仍需按实测压缩轻索引，不能提高328KB入口预算。', '蓝地牡丹织金缎馆方年代字段和正文不一致，明清分组中明确待核。', ...(tranche==='03'?['条纹石拍官网出土地大梅沙/咸头岭冲突保留；国宝金匮1921年出土保留传闻限定。','本批扩充现有成都、深圳城市館，未新开馆舍入口；下批应拓展其他城市和门类。']:[])],
};
if (tranche === '04') report.risks.push('汉代麻纸官方题名、正文药名及尺寸冲突保留；素纱裙与短袖夹衣题名和正文材质冲突保留。', '成组简册、地图、具杯盒和成双服饰按组计数；不从AI图推导文字、织物组织、封泥匣材质或出土状态。', '第四批仅在用户确认后启动；第三批长篇故事交接给DeepSeek，当前为摘要与直接参考资料。');
if (report.initialJavaScript.bytes > report.initialJavaScript.budget) throw new Error('Initial bundle budget exceeded');
if(tranche==='05')report.risks.push('朱漆发插/茶筅与虎子用途争议保留；鲁诗归属按馆方研究解释表述；澄泥砚后刻题款次序、真伪未核。','常州公开API响应须官网客户端查询参数；读者链接使用实际移动详情路由，接口与哈希另留证据表。','第五批尚未启动；本批长篇文字交给DeepSeek，当前为摘要与官方参考资料。');
await writeFile(new URL(`docs/audits/${['04','05'].includes(tranche)?'2026-10-05':'2026-10-04'}-expansion-600-${tranche==='01'?'progress':`tranche-${tranche}-progress`}.json`, root), JSON.stringify(report, null, 2) + '\n');
const fields = ['id', 'name', 'museumId', 'institution', 'sourceUrl', 'checkedAt', 'recordIdentifier', 'supports', 'evidenceSha256', 'imageKind', 'photoAuthorization', 'originalSha256', 'cardSha256', 'detailSha256', 'processingManifest'];
const quote = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
await writeFile(new URL(`assets/expansion/admission-tranche-${tranche}.csv`, root), '\uFEFF' + [fields.join(','), ...admission.admitted.map(record => fields.map(field => quote(record[field])).join(','))].join('\n'));
console.log(JSON.stringify({ artifacts: report.artifacts, museums: report.museums, admitted: report.admittedThisTranche, initialBytes: report.initialJavaScript.bytes, unitTests: report.unitTests, browserChecks: Object.values(report.acceptance).map(result => result.passed) }, null, 2));
