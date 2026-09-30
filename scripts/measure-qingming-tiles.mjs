import { mkdir, writeFile } from 'node:fs/promises';
import tiles from '../src/data/qingming-tiles.json' with { type:'json' };
import { createHeadlessPage } from './lib/headless-cdp.mjs';

const base = process.env.HUAXIA_E2E_URL ?? 'http://127.0.0.1:4173/';
const cases = [
  { label:'previous complete-detail WebP', path:'/artifact-responsive/52420153f1afc0c9-scroll-detail-w16000.webp' },
  { label:'new first high-resolution tile', path:tiles.tiles[0].webp.src },
  { label:'new whole-scroll overview placeholder', path:tiles.overview.src },
];
const results = [];
for (const item of cases) {
  const page = await createHeadlessPage();
  try {
    await page.send('Network.setCacheDisabled', { cacheDisabled:true });
    // Keep the page blank so app bootstrap and decorative assets cannot contend for bandwidth.
    await page.send('Network.emulateNetworkConditions', {
      offline:false, latency:300, downloadThroughput:800*1024/8,
      uploadThroughput:300*1024/8, connectionType:'cellular3g',
    });
    await page.send('Emulation.setCPUThrottlingRate', { rate:4 });
    const url = new URL(item.path, base).href;
    const timing = await page.evaluate(`new Promise((resolve,reject)=>{
      const image=new Image(); const start=performance.now();
      image.onload=()=>image.decode().then(()=>resolve({ms:performance.now()-start,width:image.naturalWidth,height:image.naturalHeight})).catch(reject);
      image.onerror=()=>reject(new Error('image failed: ${url}'));
      image.src=${JSON.stringify(url)};
    })`);
    results.push({ label:item.label, path:item.path, ...timing });
    console.log(`${item.label}: ${Math.round(timing.ms)} ms`);
  } finally { await page.close(); }
}
const output = new URL('../docs/audits/qingming-tiles-local/weak-network-timing.json', import.meta.url);
await mkdir(new URL('.', output), { recursive:true });
await writeFile(output, JSON.stringify({ conditions:'800 kbps down, 300 ms RTT, CPU x4, cache disabled; isolated decoded image response on same local server', results },null,2)+'\n');
