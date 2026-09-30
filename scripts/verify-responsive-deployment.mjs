import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import cardManifest from '../src/data/image-card-manifest.json' with { type: 'json' };
import responsiveManifest from '../assets/responsive-images/manifest.json' with { type: 'json' };
import { createHeadlessPage } from './lib/headless-cdp.mjs';

const productionUrl = process.env.HUAXIA_PRODUCTION_URL ?? 'https://huaxia-museum-atlas.pages.dev/';
const deploymentUrl = process.env.HUAXIA_DEPLOYMENT_URL;
assert.ok(deploymentUrl, 'HUAXIA_DEPLOYMENT_URL is required');
const sha256 = value => createHash('sha256').update(value).digest('hex');
const localIndex = await readFile(new URL('../dist/index.html', import.meta.url));
const html = localIndex.toString('utf8');
const shellAssets = [...html.matchAll(/(?:src|href)="(?:\.\/|\/)(assets\/[^"]+)"/g)].map(match => `/${match[1]}`);
const lazyImageChunks = (await readdir(new URL('../dist/assets/', import.meta.url)))
  .filter(name => /^(?:ResponsiveArtifactImage|ArtifactCard|MuseumDetail|ScrollMapScene|InkScrollIntro)-.*\.js$/.test(name))
  .map(name => `/assets/${name}`);
const cards = ['gg-qmsh', 'gg-qljs', 'gg-pft', 'gg-gzdc'].map(id => {
  const candidates = cardManifest[id].image.responsive.candidates;
  return candidates.find(candidate => candidate.width === 400)?.src ?? candidates.at(-1).src;
});
const scroll = responsiveManifest.artifacts['gg-qmsh'].roles.detail.primary.candidates.at(-1).src;
const paths = [...new Set(['/index.html', ...shellAssets, ...lazyImageChunks, ...cards, scroll, '/data/image-provenance/gugong.json',
  '/data/image-processing/gg-qmsh-user-2026-09-16.json', '/artifact-sources/user-qingming/gg-qmsh-reading.jpg',
  '/artifact-sources/user-qingming/gg-qmsh-hongqiao-card.jpg', '/art/shanhe-handscroll-desktop.jpg', '/art/shanhe-handscroll-mobile.jpg'])];

async function verify(baseUrl) {
  const results = [];
  const browser = process.env.HUAXIA_VERIFY_BROWSER === '1' ? await createHeadlessPage() : null;
  try {
  if (browser) await browser.navigate(baseUrl);
  for (const path of paths) {
    const local = await readFile(new URL(`../dist${path}`, import.meta.url));
    let remote;
    if (browser) {
      remote = await browser.evaluate(`(async () => {
        const response = await fetch(${JSON.stringify(path)}, {cache:'no-store', signal:AbortSignal.timeout(45000)});
        const bytes = await response.arrayBuffer();
        const digest = await crypto.subtle.digest('SHA-256', bytes);
        return {status:response.status, bytes:bytes.byteLength, sha256:[...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,'0')).join(''), cacheControl:response.headers.get('cache-control')};
      })()`);
    } else {
      const response = await fetch(new URL(path, baseUrl), { cache: 'no-store', signal: AbortSignal.timeout(45000) });
      const bytes = Buffer.from(await response.arrayBuffer());
      remote = { status:response.status, bytes:bytes.length, sha256:sha256(bytes), cacheControl:response.headers.get('cache-control') };
    }
    assert.equal(remote.status, 200, `${baseUrl}${path}`);
    assert.equal(remote.sha256, sha256(local), `${baseUrl}${path}`);
    const cacheControl = remote.cacheControl;
    if (path.startsWith('/artifact-responsive/')) assert.match(cacheControl ?? '', /max-age=31536000.*immutable/);
    results.push({ path, bytes: remote.bytes, sha256: remote.sha256, cacheControl });
    console.log(`verified ${new URL(baseUrl).hostname} ${path}`);
  }
  return results;
  } finally { await browser?.close(); }
}

const report = {
  verifiedAt: new Date().toISOString(),
  productionUrl,
  deploymentUrl,
  paths: paths.length,
  production: await verify(productionUrl),
  deployment: await verify(deploymentUrl),
};
const output = new URL('../docs/audits/responsive-images-browser/deployment.json', import.meta.url);
await mkdir(new URL('.', output), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ productionUrl, deploymentUrl, verifiedPathsPerHost: paths.length }, null, 2));
