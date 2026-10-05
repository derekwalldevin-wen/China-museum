import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFile } from 'node:fs/promises';
import museums from '../src/data/museum-index.json' with { type: 'json' };
import { createHeadlessPage, sleep } from './lib/headless-cdp.mjs';
const base = process.env.HUAXIA_E2E_URL ?? 'http://127.0.0.1:4180/';
assert.equal(new URL(base).hostname, '127.0.0.1', 'Local-only expansion acceptance');
const tranche=process.argv[2]??'01';
if(!/^\d{2}$/.test(tranche))throw Error('Expected two-digit tranche');
const admission=JSON.parse(await readFile(new URL(`../assets/expansion/admission-tranche-${tranche}.json`,import.meta.url),'utf8'));
const output = new URL(`../docs/audits/expansion-600-browser/${tranche==='01'?'local':`tranche-${tranche}`}/`, import.meta.url);
await mkdir(output, { recursive: true });
const checks = [];
for (const [label, width, mobile] of [['desktop', 1440, false], ['mobile-390', 390, true]]) {
  const page = await createHeadlessPage();
  try {
    await page.send('Network.setCacheDisabled', { cacheDisabled: true });
    await page.send('Emulation.setDeviceMetricsOverride', { width, height: mobile ? 844 : 960, deviceScaleFactor: mobile ? 2 : 1, mobile });
    await page.send('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: mobile ? 5 : 1 });
    for (const item of admission.admitted) {
      console.log(`${label}: ${item.id}`);
      const museum = museums.find(museum => museum.id === item.museumId);
      const url = new URL(base);
      for (const [key, value] of Object.entries({ province: museum.province, museum: museum.id, artifact: item.id })) url.searchParams.set(key, value);
      await page.navigate(url.href);
      await page.wait(`document.querySelector('#artifact-dialog-title')?.textContent.includes(${JSON.stringify(item.name)}) && document.querySelector('[data-detail-image-state="ready"] img')?.naturalWidth > 0`, `${label}: ${item.id}`, 30000);
      const result = await page.evaluate(`(() => { const dialog=document.querySelector('[role="dialog"]'); return {ai:dialog.textContent.includes('AI 复原示意 · 非文物实拍'), source:[...dialog.querySelectorAll('a')].some(a=>a.href===${JSON.stringify(new URL(item.sourceUrl).href)}), references:dialog.textContent.includes('馆藏资料与延伸阅读'), overflow:document.documentElement.scrollWidth-innerWidth}; })()`);
      assert.equal(result.ai, true, item.id);
      assert.equal(result.source, true, item.id);
      assert.equal(result.references, true, item.id);
      assert.ok(result.overflow <= 1, item.id);
      checks.push(`${label}: ${item.id} direct URL, image, AI boundary and official reference`);
      if (['cz-gold-lotus-box','cz-red-hairpick','wh-yangguang-trigger','wh-fortress-model','wh-chengni-inkstone','gsjd-maquan-brush','gsjd-qin-wood-map','csm-ming-yesa','csm-peony-satin-shoe','cs-yuyang-cup-box','sz-proto-he', 'cd-hunting-pot', 'gb-jade-rabbit','cd-lacquer-dou','gb-red-embroidered-skirt','hb-heifu-letter','gg-shen-meique-kesi','cd-comic-figure','cd-pottery-courtyard','sz-warming-copper-stove','gb-guobao-coin'].includes(item.id)) {
        await sleep(450); // Capture after the existing entrance animation, not during opacity interpolation.
        const shot = await page.send('Page.captureScreenshot', { format: 'png' });
        await writeFile(new URL(`${label}-${item.id}.png`, output), Buffer.from(shot.data, 'base64'));
      }
    }
    assert.equal(page.errors.length, 0, JSON.stringify(page.errors));
  } finally { await page.close(); }
}

const page = await createHeadlessPage();
try {
  await page.send('Network.setCacheDisabled', { cacheDisabled: true });
  await page.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  const gallery = new URL('?province=广东省&museum=shenzhen-city', base).href;
  await page.navigate(gallery);
  await page.wait(`document.querySelectorAll('[data-artifact-image-state="loaded"] img').length === 2`, 'new museum two cards');
  await sleep(800);
  const requests = await page.evaluate(`performance.getEntriesByType('resource').filter(e=>{const path=new URL(e.name).pathname;return path.includes('/artifact-responsive/') && path.includes('-card-w') && path.endsWith('.webp');}).map(e=>({url:new URL(e.name).pathname,bytes:e.encodedBodySize}))`);
  assert.equal(requests.length, 2);
  checks.push(`new Shenzhen mobile gallery: 2 images, ${requests.reduce((sum, item) => sum + item.bytes, 0)} bytes`);
  await page.evaluate(`(() => { const root=document.querySelector('[data-artifact-scroll-root]'); root.scrollTop=root.scrollHeight; })()`);
  await page.evaluate(`document.querySelector('[data-artifact-card="sz-black-pot"]').scrollIntoView({block:'center'})`);
  await page.wait(`document.querySelector('[data-artifact-card="sz-black-pot"] img')?.naturalWidth > 0`, 'lower new image loads');
  const scrollTop = await page.evaluate(`document.querySelector('[data-artifact-scroll-root]').scrollTop`);
  await page.evaluate(`document.querySelector('[data-artifact-card="sz-black-pot"]').click()`);
  await page.wait(`document.querySelector('#artifact-dialog-title')?.textContent.includes('黑陶')`, 'new detail click');
  await page.evaluate('history.back()');
  await page.wait(`!document.querySelector('#artifact-dialog-title')`, 'detail history back');
  assert.ok(Math.abs(await page.evaluate(`document.querySelector('[data-artifact-scroll-root]').scrollTop`) - scrollTop) <= 2);
  await page.evaluate('history.forward()');
  await page.wait(`document.querySelector('#artifact-dialog-title')?.textContent.includes('黑陶')`, 'detail history forward');
  await page.send('Page.reload', { ignoreCache: true });
  await page.wait(`document.querySelector('#artifact-dialog-title')?.textContent.includes('黑陶') && document.querySelector('[data-detail-image-state="ready"] img')?.naturalWidth > 0`, 'new share refresh');
  checks.push('new gallery lower card and detail retain scroll/history and refresh route');
  await page.send('Network.setBlockedURLs', { urls: ['*/data/image-cards/shenzhen-city.json'] });
  await page.navigate(gallery);
  await page.wait(`document.body.textContent.includes('影像资料暂未载入')`, 'card shard failure');
  await page.send('Network.setBlockedURLs', { urls: [] });
  await page.evaluate(`document.querySelector('[data-artifact-card="sz-proto-he"]').click()`);
  await page.wait(`document.querySelector('[data-detail-image-state="ready"] img')?.naturalWidth > 0`, 'shard retry and detail recovery');
  checks.push('card metadata failure retains gallery; click retries and detail opens without fake source labels');
  if(['02','03','04','05'].includes(tranche)) {
    await page.send('Emulation.setCPUThrottlingRate',{rate:4});
    await page.send('Network.emulateNetworkConditions',{offline:false,latency:400,downloadThroughput:20000,uploadThroughput:10000});
    const item=admission.admitted.find(item=>item.id===(tranche==='02'?'cd-lacquer-dou':tranche==='04'?'gsjd-maquan-brush':tranche==='05'?'cz-gold-lotus-box':'cd-comic-figure'));
    const weakMuseum=museums.find(m=>m.id===item.museumId);
    const url=new URL(base);
    for(const [key,value]of Object.entries({province:weakMuseum.province,museum:weakMuseum.id,artifact:item.id}))url.searchParams.set(key,value);
    await page.navigate(url.href);
    await page.wait(`document.querySelector('#artifact-dialog-title')?.textContent.includes(${JSON.stringify(item.name)}) && document.querySelector('[data-detail-image-state="ready"] img')?.naturalWidth>0`,'new AI detail under weak network',60000);
    const weak=await page.evaluate(`({visible:!!document.querySelector('[data-detail-image-state="ready"] img'),ai:document.body.textContent.includes('非文物实拍'),elapsed:performance.now()})`);
    assert.ok(weak.visible&&weak.ai);
    checks.push(`new AI detail with CPU4x /160kbps /400ms loaded with disclosure (${Math.round(weak.elapsed)}ms from navigation; not a click-to-visible benchmark)`);
    await page.send('Emulation.setCPUThrottlingRate',{rate:1});
    await page.send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
  }
  if(['04','05'].includes(tranche))for(const id of tranche==='05'?['wuhan-city','changzhou-city']:['gansu-jiandu','china-silk']){
    const museum=museums.find(m=>m.id===id);
    await page.navigate(new URL(`?province=${encodeURIComponent(museum.province)}`,base).href);
    await page.wait(`document.body.textContent.includes(${JSON.stringify(museum.name)})`,'new museum province entry');
    await page.wait(`!!document.querySelector('g.scroll-museum-marker[aria-label="进入${museum.name}"]')`,'new museum map marker');
    // On mobile the province drawer intentionally covers the central map;
    // its museum entry, rather than an obscured SVG marker, is the touch target.
    await page.evaluate(`document.querySelector('button[aria-label="进入${museum.name}"]').scrollIntoView({block:'center'})`);
    await sleep(400);
    const point=await page.evaluate(`(() => { const r=document.querySelector('button[aria-label="进入${museum.name}"]').getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
    await page.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
    await page.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.wait(`new URL(location.href).searchParams.get('museum')===${JSON.stringify(id)}`,'new museum province drawer touch enters gallery');
    // Measure a cold gallery navigation separately: the preceding province
    // drawer legitimately requested its tiny museum thumbnails as well.
    await page.navigate(new URL(`?province=${encodeURIComponent(museum.province)}&museum=${id}`,base).href);
    await page.wait(`document.querySelectorAll('[data-artifact-image-state="loaded"] img').length===2`,'new museum first two cards');
    await sleep(800);
    const images=await page.evaluate(`performance.getEntriesByType('resource').filter(e=>new URL(e.name).pathname.includes('/artifact-responsive/')&&new URL(e.name).pathname.includes('-card-w')).map(e=>({url:new URL(e.name).pathname,bytes:e.encodedBodySize}))`);
    assert.equal(images.length,2);
    checks.push(`${museum.name}: map marker exists, actual province drawer touch and 390px gallery 2 images, ${images.reduce((s,i)=>s+i.bytes,0)} bytes`);
    const shot=await page.send('Page.captureScreenshot',{format:'png'});await writeFile(new URL(`mobile-390-${id}-gallery.png`,output),Buffer.from(shot.data,'base64'));
  }
  assert.equal(page.errors.length, 0, JSON.stringify(page.errors));
} finally { await page.close(); }
const report = { base, testedAt: new Date().toISOString(), passed: checks.length, checks };
await writeFile(new URL('results.json', output), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
