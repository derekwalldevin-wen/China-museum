import { readFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const images = JSON.parse(await readFile(new URL('src/data/images.json', root), 'utf8'));
const directory = new URL('assets/provenance/collection-image-review-2026-09-22/references/', root);
await mkdir(directory, { recursive: true });
for (const id of ['gg-jgb', 'gb-gyts', 'gb-yygd', 'gb-cxct', 'sh-zzjp', 'hn-ywtj']) {
  const url = images[id].sourceReview.authorityUrl;
  const dest = new URL(`${id}.html`, directory);
  try {
    execFileSync('curl.exe', ['--fail', '--silent', '--show-error', '--location', '--connect-timeout', '8', '--max-time', '20', url, '--output', fileURLToPath(dest)], { timeout: 25000 });
    const html = await readFile(dest, 'utf8');
    const base = new URL(html.match(/<base\b[^>]*href=["']([^"']+)/i)?.[1] ?? url, url);
    const urls = [...new Set([...html.matchAll(/(?:src|data-src)=["']([^"']+\.(?:jpg|jpeg|png)(?:\?[^"']*)?)["']/gi)].map(match => new URL(match[1], base).href))];
    console.log(JSON.stringify({ id, images: urls }));
  } catch { console.log(JSON.stringify({ id, status: 'reference-download-failed' })); }
}
