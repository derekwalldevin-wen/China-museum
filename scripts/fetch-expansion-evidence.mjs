import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
const root = new URL('../assets/expansion/evidence/', import.meta.url);
await mkdir(root, { recursive: true });
for (const input of process.argv.slice(2)) {
  const url = new URL(input);
  if (url.protocol !== 'https:') throw new Error('HTTPS evidence required');
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'HuaxiaMuseumAtlas/1.0 (collection research)', Accept: 'text/html,application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const key = createHash('sha256').update(input).digest('hex').slice(0, 20);
    const text = bytes.toString('utf8');
    await writeFile(new URL(`${key}.html`, root), bytes);
    await writeFile(new URL(`${key}.json`, root), JSON.stringify({ url: input, finalUrl: response.url, checkedAt: new Date().toISOString(), sha256, bytes: bytes.length, contentType: response.headers.get('content-type') }, null, 2));
    console.log(JSON.stringify({ url: input, key, bytes: bytes.length, scripts: text.match(/<script[^>]*src=[^>]+/g)?.slice(-8), images: text.match(/(?:src|data-src)=["'][^"']+\.(?:jpg|jpeg|png)[^"']*["']/gi)?.slice(0, 6) }));
  } catch (error) { console.error(JSON.stringify({ url: input, error: error.message })); process.exitCode = 1; }
}
