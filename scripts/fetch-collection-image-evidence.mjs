import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const archive = new URL('../assets/provenance/collection-image-review-2026-09-22/', import.meta.url);
const allCandidates = JSON.parse(await readFile(new URL('candidates.json', archive), 'utf8'));
const candidates = allCandidates.filter(item => !process.argv[2] || item.id === process.argv[2]);
await mkdir(new URL('originals/', archive), { recursive: true });
const previous = process.argv[2] ? JSON.parse(await readFile(new URL('downloads.json', archive), 'utf8')).results : [];
const results = previous.filter(item => !candidates.some(candidate => candidate.id === item.id));
for (const item of candidates) {
  const api = new URL('https://commons.wikimedia.org/w/api.php');
  for (const [key, value] of Object.entries({ action: 'query', format: 'json', prop: 'imageinfo', iiprop: 'url|sha1|size|extmetadata', titles: item.title })) api.searchParams.set(key, value);
  const evidencePath = fileURLToPath(new URL(`${item.id}-api.json`, archive));
  try {
    execFileSync('curl.exe', ['--fail', '--silent', '--show-error', '--location', '--connect-timeout', '8', '--max-time', '25', api.href, '--output', evidencePath], { timeout: 30000 });
    const raw = JSON.parse(await readFile(evidencePath, 'utf8'));
    const info = Object.values(raw.query?.pages ?? {})[0]?.imageinfo?.[0];
    if (!info?.url || !info.sha1) throw new Error('Commons API did not return file evidence');
    const filePath = fileURLToPath(new URL(`originals/${item.id}.jpg`, archive));
    execFileSync('curl.exe', ['--fail', '--silent', '--show-error', '--location', '--connect-timeout', '8', '--max-time', '40', info.url, '--output', filePath], { timeout: 45000 });
    const bytes = await readFile(filePath);
    const sha1 = createHash('sha1').update(bytes).digest('hex');
    if (sha1 !== info.sha1 || bytes.length !== info.size) throw new Error('Original bytes do not match Commons SHA-1/size');
    results.push({ ...item, status: 'downloaded-not-yet-approved', sourceUrl: info.descriptionurl, originalUrl: info.url, bytes: bytes.length, sha1, sha256: createHash('sha256').update(bytes).digest('hex'), width: info.width, height: info.height, license: info.extmetadata?.LicenseShortName?.value, licenseUrl: info.extmetadata?.LicenseUrl?.value, author: info.extmetadata?.Artist?.value });
    console.log(`${item.id}: downloaded and SHA-1 matched`);
  } catch (error) {
    results.push({ ...item, status: 'download-failed', error: error.message });
    console.log(`${item.id}: download failed`);
  }
}
await writeFile(new URL('downloads.json', archive), `${JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2)}\n`);
