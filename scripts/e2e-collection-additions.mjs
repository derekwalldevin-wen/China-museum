import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHeadlessPage } from './lib/headless-cdp.mjs';
import museums from '../src/data/museum-index.json' with { type: 'json' };
import images from '../src/data/images.json' with { type: 'json' };

const base = process.env.HUAXIA_E2E_URL ?? 'http://127.0.0.1:4173/';
const ids = ['gg-jgb', 'gg-ryzl', 'gb-gyts', 'gb-yygd', 'gb-cxct', 'sh-zzjp', 'sh-ltry', 'nb-htb', 'hn-ywtj', 'sxl-ptxn',
  'gg-jgyg', 'hlj-syj', 'nb-wgj', 'jdz-qhmb', 'sxl-lt', 'mo-klk'];
const entries = new Map(museums.flatMap(museum => museum.artifacts.map(artifact => [artifact.id, { museum, artifact }])));
const output = new URL('../docs/audits/collection-image-review-browser/local/', import.meta.url);
await mkdir(output, { recursive: true });

for (const [name, width, mobile] of [['desktop', 1440, false], ['mobile-390', 390, true]]) {
  const page = await createHeadlessPage();
  try {
    await page.send('Emulation.setDeviceMetricsOverride', { width, height: mobile ? 844 : 900, deviceScaleFactor: mobile ? 2 : 1, mobile });
    await page.send('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: mobile ? 5 : 1 });
    for (const id of ids) {
      console.log(`${name}: checking ${id}`);
      const { museum, artifact } = entries.get(id);
      const url = new URL(base);
      url.searchParams.set('province', museum.province);
      url.searchParams.set('museum', museum.id);
      url.searchParams.set('artifact', id);
      await page.navigate(url.href);
      const hasImage = Boolean(images[id].src);
      const isAi = Boolean(images[id].ai);
      await page.wait(`!!(document.querySelector('#artifact-dialog-title')?.textContent.includes(${JSON.stringify(artifact.name)}) && document.querySelector('[data-detail-image-state="${hasImage ? 'ready' : 'fallback'}"]'))`, `${name}: ${id}`);
      const state = await page.evaluate(`(() => {
        const dialog=document.querySelector('[role="dialog"]');
        const links=[...dialog.querySelectorAll('a')];
        const link=links.find(a=>(a.textContent.includes('馆方') || a.textContent.includes('馆藏')) && a.textContent.includes('非图片授权'));
        const img=dialog.querySelector('[data-detail-image-state] img');
        return { title:document.querySelector('#artifact-dialog-title').textContent, disclosure:dialog.textContent.includes('真品图待补'), sourceLabel:dialog.textContent.includes('来源图 · 非 AI 复原'), aiLabel:dialog.textContent.includes('AI 复原示意 · 非文物实拍'), link:link?.href, objectImage:!!img, ready:!!(img?.complete && img.naturalWidth), fit:img && getComputedStyle(img).objectFit, hrefs:links.map(a=>a.href), overflow:document.documentElement.scrollWidth-innerWidth };
      })()`);
      assert.equal(state.link, images[id].sourceReview.authorityUrl, `${name}: ${id}: source`);
      assert.equal(state.disclosure, !hasImage, `${name}: ${id}: disclosure`);
      assert.equal(state.objectImage, hasImage, `${name}: ${id}: image`);
      if (hasImage) {
        const p = images[id].variants.detail.provenance;
        assert.equal(state.ready, true, id);
        assert.equal(state.sourceLabel, !isAi, id);
        assert.equal(state.aiLabel, isAi, id);
        assert.equal(state.fit, 'contain', id);
        if (isAi) {
          assert.ok(state.hrefs.includes(images[id].sourceReview.authorityUrl), `${id}: museum record`);
        } else {
          for (const href of [p.sourceUrl, p.licenseUrl, new URL(p.processingManifest, base).href]) assert.ok(state.hrefs.includes(href), `${id}: ${href}`);
        }
      }
      assert.ok(state.overflow <= 1, `${name}: ${id}: overflow ${state.overflow}`);
      if (['gg-jgb', 'gb-gyts', 'gb-yygd', 'gb-cxct', 'sh-zzjp', 'hn-ywtj', 'gg-jgyg', 'sxl-lt', 'mo-klk'].includes(id)) {
        const shot = await page.send('Page.captureScreenshot', { format: 'png' });
        await writeFile(new URL(`${name}-${id}.png`, output), Buffer.from(shot.data, 'base64'));
      }
    }
    assert.equal(page.errors.length, 0, `${name}: console errors`);
    assert.equal(page.failures.length, 0, `${name}: network failures`);
    console.log(`${name}: all ${ids.length} new detail routes, source links, illustration labels and viewport checks passed`);
  } finally {
    await page.close();
  }
}
