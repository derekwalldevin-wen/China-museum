import assert from 'node:assert/strict';
import { createHeadlessPage } from './lib/headless-cdp.mjs';

const base = process.env.HUAXIA_E2E_URL ?? 'http://127.0.0.1:4173/';
const page = await createHeadlessPage();
const checks = [];
try {
  for (const mobile of [false, true]) {
    const device = mobile ? '390px mobile' : 'desktop';
    await page.send('Emulation.setDeviceMetricsOverride', { width: mobile ? 390 : 1440, height: mobile ? 844 : 960, deviceScaleFactor: mobile ? 2 : 1, mobile });
    await page.send('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: 5 });
    for (const [id, expected] of [
      ['bj-hz', '研究专题'],
      ['gs-tbm', '文物保护史'],
      ['xj-wxc', '考古亲历回忆'],
    ]) {
      const url = new URL(base);
      url.searchParams.set('guide', '1');
      url.searchParams.set('story', id);
      url.searchParams.set('province', '北京市');
      await page.navigate(url.href);
      await page.wait(`document.querySelector('[data-story-id]')?.dataset.storyId === '${id}'`, id);
      assert.equal(await page.evaluate(`new URLSearchParams(location.search).get('province')`), '北京市');
      await page.evaluate(`(() => { const button = document.querySelector('.story-sources > button'); if (button.getAttribute('aria-expanded') !== 'true') button.click(); })()`);
      await page.wait(`!!document.querySelector('#story-source-list')`, `${id} source list`);
      const sourceText = await page.evaluate(`document.querySelector('#story-source-list').textContent`);
      assert.ok(sourceText.includes(expected), `${id} missing ${expected}: ${sourceText.slice(0, 450)}`);
      const result = await page.evaluate(`({ chapters: document.querySelectorAll('.story-chapters > section').length, details: document.querySelectorAll('.story-details li').length, overflow: document.documentElement.scrollWidth - innerWidth })`);
      assert.equal(result.chapters, 4);
      assert.equal(result.details, 3);
      assert.ok(result.overflow <= 1, JSON.stringify(result));
      checks.push(`${device}: ${id} URL、四章三细节、来源类型、无横向溢出`);
    }
  }
  assert.deepEqual(page.errors, []);
  assert.deepEqual(page.failures.filter(error => !/ERR_ABORTED/.test(error)), []);
  console.log(JSON.stringify({ passed: checks.length, checks }, null, 2));
} finally {
  await page.close();
}
