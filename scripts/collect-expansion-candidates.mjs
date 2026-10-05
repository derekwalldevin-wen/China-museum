import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const directory = new URL('../assets/expansion/evidence/', import.meta.url);
await mkdir(directory, { recursive: true });
const clean = value => value.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
const rows = new Map();
const failures = [];
async function retrieve(url) {
  const key = createHash('sha256').update(url).digest('hex').slice(0, 20);
  try {
    const metadata = JSON.parse(await readFile(new URL(`${key}.json`, directory), 'utf8'));
    const html = await readFile(new URL(`${key}.html`, directory), 'utf8');
    if (createHash('sha256').update(html).digest('hex') !== metadata.sha256) throw new Error('Cache hash mismatch');
    return { html, metadata, key };
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const response = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'HuaxiaMuseumAtlas/1.0 (collection research)' } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const metadata = { url, finalUrl: response.url, checkedAt: new Date().toISOString(), sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length, contentType: response.headers.get('content-type') };
  await writeFile(new URL(`${key}.html`, directory), bytes);
  await writeFile(new URL(`${key}.json`, directory), JSON.stringify(metadata, null, 2));
  return { html: bytes.toString('utf8'), metadata, key };
}
function add(row) { if (!rows.has(row.sourceUrl)) rows.set(row.sourceUrl, row); }
// These are catalogue leads, not yet object/rights admissions. Detail pages must be read separately.
for (let page = 0; page < 40; page++) {
  const url = `https://www.chnmuseum.cn/zp/zpml/${page ? `index_${page}.shtml` : ''}`;
  try {
    const { html, metadata, key } = await retrieve(url);
    const list = html.slice(html.indexOf('<div class="clum_img_list">'));
    for (const match of list.matchAll(/<li>\s*<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/li>/g)) {
      const body = match[2];
      const paragraphs = [...body.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map(value => clean(value[1]));
      if (paragraphs.length < 2 || !/t\d+_\d+\.shtml/.test(match[1])) continue;
      const name = clean(body.match(/<img[^>]+alt="([^"]+)"/)?.[1] ?? paragraphs[1]);
      add({ officialName: name, institution: '中国国家博物馆', museumId: 'guobo', dynasty: paragraphs[0], sourceUrl: new URL(match[1], url).href, catalogueUrl: url, checkedAt: metadata.checkedAt, catalogueSha256: metadata.sha256, catalogueEvidence: `${key}.html`, status: 'candidate-detail-unread', photoAuthorization: 'unknown', identification: '独立官网详情记录；同名藏品仍需核对编号或出土地点，不同URL不等于不同实物' });
    }
    console.log(`National catalogue ${page}: ${rows.size} unique leads`);
  } catch (error) { failures.push({ url, error: error.message }); }
}
const shenzhenUrl = 'https://shenzhenmuseum.com/webCollection/list1?lmType=L0303&pageNo=1&pageSize=160&platform=0&isAll=1';
try {
  const { html, metadata, key } = await retrieve(shenzhenUrl);
  const payload = JSON.parse(html);
  for (const item of payload.entitys ?? []) {
    if (!item.resId || !item.showName) continue;
    add({ officialName: item.showName, institution: '深圳博物馆', museumId: 'shenzhen-city', sourceUrl: `https://shenzhenmuseum.com/webCollection/collectionDetail?lmType=L0303&resId=${item.resId}`, catalogueUrl: shenzhenUrl, checkedAt: metadata.checkedAt, catalogueSha256: metadata.sha256, catalogueEvidence: `${key}.html`, identifier: item.resId, status: 'candidate-detail-unread', photoAuthorization: 'unknown', identification: '官方藏品记录resId，未视为实物馆藏编号' });
  }
} catch (error) { failures.push({ url: shenzhenUrl, error: error.message }); }
const output = new URL('../assets/expansion/candidate-register.json', import.meta.url);
await writeFile(output, JSON.stringify({ generatedAt: new Date().toISOString(), note: '目录候选不是核验通过的入库记录；图片许可未确认。', candidates: [...rows.values()], failures }, null, 2));
const columns = ['officialName', 'institution', 'museumId', 'dynasty', 'sourceUrl', 'catalogueUrl', 'checkedAt', 'catalogueSha256', 'catalogueEvidence', 'identifier', 'status', 'photoAuthorization', 'identification'];
const quote = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
await writeFile(new URL('../assets/expansion/candidate-register.csv', import.meta.url), '\uFEFF' + [columns.join(','), ...[...rows.values()].map(row => columns.map(field => quote(row[field])).join(','))].join('\n'));
console.log(JSON.stringify({ candidates: rows.size, failures }, null, 2));
