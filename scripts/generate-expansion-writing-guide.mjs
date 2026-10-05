import { readFile, writeFile } from 'node:fs/promises';
const root=new URL('../',import.meta.url),tranche=process.argv[2]??'04';
if(!/^\d{2}$/.test(tranche))throw Error('Expected two-digit tranche');
const pack=JSON.parse(await readFile(new URL(`docs/handoff/expansion-600/tranche-${tranche}-writing-pack.json`,root),'utf8'));
const admission=JSON.parse(await readFile(new URL(`assets/expansion/admission-tranche-${tranche}.json`,root),'utf8'));
if(pack.items.length!==admission.admitted.length||admission.pending.length)throw Error('Incomplete admission');
const lines=[`# 阶段${tranche}逐件写作指引：${pack.items.length}件`, '', '本表只列已入库文物，长篇故事待DeepSeek扩写。官方文字支持事实，不构成照片授权；全部配图为AI概括示意，细部继续待核。不要从图片取证。', '', '原始证据快照、来源摘录及SHA-256见同目录JSON资料包和assets/expansion登记表。本表是人工核读后摘要与写作边界，不冒称已阅读完整考古报告或修复档案。',''];
for(const [index,item]of pack.items.entries()){
 if(item.evidenceUrl)lines.push(`核验快照接口（访问可能需官网公开客户端参数）：${item.evidenceUrl}。原始响应位于 assets/expansion/evidence/${item.evidenceKey}.html；下方为可点击官方详情。`,'');
 lines.push(`## ${index+1}. ${item.artifact.name} · ${item.artifact.id}`,'',`收藏：${item.institution}；年代：${item.artifact.dynasty}；类别：${item.artifact.category}。核读：${item.checkedAt}；记录标识：${item.recordIdentifier}（不是自动认定的馆藏编号）。`,'',`[直接官方资料](${item.sourceUrl})${item.recordUrl!==item.sourceUrl?` · [官方展品页面](${item.recordUrl})`:''}`,'',`事实摘要：${item.artifact.story}`,'',`支持范围：${item.supports}`,'',`制作：${item.writingNotes.making}`,'',`发现：${item.writingNotes.discovery}`,'',`研究与未知：${item.writingNotes.research}`,'',`可比较对象：${item.writingNotes.comparison.artifactId}。理由：${item.writingNotes.comparison.reason}`,'');
}
await writeFile(new URL(`docs/handoff/expansion-600/tranche-${tranche}-writing-guide.md`,root),lines.join('\n')+'\n');
console.log(JSON.stringify({items:pack.items.length,guide:`tranche-${tranche}-writing-guide.md`}));
