// Visitor records (phase A) end-to-end: create a record with a real image, keep it across
// a reload, export a package, re-import it, and check the mobile layout.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHeadlessPage, sleep } from './lib/headless-cdp.mjs';

const base = process.env.HUAXIA_E2E_URL ?? 'http://127.0.0.1:4173/';
const scope = new URL(base).hostname === '127.0.0.1' ? 'local' : 'production';
const output = new URL(`../docs/audits/visitor-records/${scope}/`, import.meta.url);
await mkdir(output, { recursive: true });
const pageUrl = new URL('visitor-records/', base).href;
const page = await createHeadlessPage();
const checks = [];
let stepName = 'start';
const step = name => { stepName = name; console.log(`[step] ${name}`); };
const guard = async (name, run) => { step(name); try { return await run(); } catch (error) { console.error(`[failed at] ${name}: ${error?.message ?? error}`); throw error; } };

const setValue = (selector, value) => `(() => {
  const el = document.querySelector(${JSON.stringify(selector)});
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : (el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype);
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)});
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
})()`;
const clickByText = (text, scopeSelector = 'button') => `(() => {
  const target = [...document.querySelectorAll(${JSON.stringify(scopeSelector)})].find(node => node.textContent.includes(${JSON.stringify(text)}));
  if (!target) return false;
  target.click();
  return true;
})()`;

async function attachGeneratedPhoto() {
  const attached = await page.evaluate(`(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1600; canvas.height = 1200;
    const context = canvas.getContext('2d');
    const gradient = context.createLinearGradient(0, 0, 1600, 1200);
    gradient.addColorStop(0, '#123c2e'); gradient.addColorStop(1, '#d7a84a');
    context.fillStyle = gradient; context.fillRect(0, 0, 1600, 1200);
    context.fillStyle = '#e7dfc9'; context.fillRect(200, 180, 700, 420);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    const file = new File([blob], 'visitor-test.jpg', { type: 'image/jpeg' });
    const input = document.querySelector('input[type=file][multiple]');
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return { size: blob.size };
  })()`);
  assert.ok(attached.size > 1000, 'generated photo should have bytes');
  await page.wait(`document.querySelectorAll('.vr-thumbs img').length > 0`, 'photo thumbnail', 30000);
  return attached.size;
}

try {
  for (const mobile of (process.env.HUAXIA_E2E_DEVICE === 'mobile' ? [true] : [false, true])) {
    const device = mobile ? 'mobile' : 'desktop';
    await page.send('Emulation.setDeviceMetricsOverride', { width: mobile ? 390 : 1440, height: mobile ? 844 : 960, deviceScaleFactor: mobile ? 2 : 1, mobile });
    await page.send('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: 5 });

    await guard('open page', async () => {
      await page.navigate(pageUrl);
      await page.wait(`document.querySelector('.vr-shell h1')?.textContent.includes('访客实地记录')`, 'visitor page', 60000);
    });
    const intro = await page.evaluate(`document.querySelector('.vr-lead').textContent`);
    assert.match(intro, /不做上传/, 'page must state that nothing is uploaded');
    await guard('label check', async () => {
      assert.match(await page.evaluate(`document.querySelector('[data-visitor-published]')?.textContent ?? ''`), /访客投稿 · 未经馆方核验/, 'label must be shown');
    });

    // Start from a clean slate on each device pass.
    await page.evaluate(`(() => { indexedDB.deleteDatabase('huaxia-visitor-records'); return true; })()`);
    await page.navigate(pageUrl);
    await page.wait(`!!document.querySelector('.vr-shell h1')`, 'visitor page reload');
    await sleep(600);

    await guard('fill form', async () => {
      await page.evaluate(setValue('.vr-grid input', '荆州博物馆'));
      await page.evaluate(setValue('.vr-grid select', '湖北省'));
      await page.evaluate(setValue('.vr-grid input[type=month]', '2026-09'));
      await page.evaluate(`(() => { const el = document.querySelectorAll('.vr-grid input')[1]; const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(el, '荆州'); el.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
      assert.ok(await page.evaluate(`document.querySelectorAll('.vr-grid input')[1].value === '荆州'`), 'city input accepted');
      await page.evaluate(setValue('.vr-block textarea', '在展厅看到了虎座凤鸟悬鼓，照片是手机拍的。'));
    });
    const photoBytes = await guard('attach photo', attachGeneratedPhoto);
    await guard('consents', async () => {
      await page.evaluate(`(() => { [...document.querySelectorAll('.vr-consent input')].forEach(input => input.click()); return true; })()`);
      assert.equal(await page.evaluate(`[...document.querySelectorAll('.vr-consent input')].every(input => input.checked)`), true, 'both consents checked');
    });

    await guard('save', async () => {
      assert.equal(await page.evaluate(clickByText('保存到本机')), true, 'save button present');
      await page.wait(`document.querySelector('.vr-list')?.textContent.includes('荆州博物馆')`, 'saved record listed', 30000);
    });
    const saved = await page.evaluate(`(() => {
      const item = document.querySelector('.vr-list li');
      return { text: item.textContent, thumbs: item.querySelectorAll('.vr-thumbs img').length };
    })()`);
    assert.equal(saved.thumbs, 1, 'record keeps one photo');
    assert.match(saved.text, /湖北省 · 荆州 · 2026-09/);
    checks.push(`${device}: 建档成功（含 ${Math.round(photoBytes / 1024)} KB 源图 → 压缩后 1 张缩略图）`);

    // Persistence across a reload.
    await page.navigate(pageUrl);
    await page.wait(`document.querySelector('.vr-list')?.textContent.includes('荆州博物馆')`, 'record persisted', 30000);
    const totals = await page.evaluate(`document.querySelector('.vr-meta').textContent`);
    assert.match(totals, /共 1 条/, 'record count after reload');
    checks.push(`${device}: 刷新后记录仍在（IndexedDB 持久化）`);

    // Export: capture the generated ZIP in-page instead of relying on a download.
    await page.evaluate(`(() => {
      window.__zip = null;
      const originalCreate = URL.createObjectURL.bind(URL);
      URL.createObjectURL = blob => { if (blob && blob.type === 'application/zip') window.__zipBlob = blob; return originalCreate(blob); };
      const originalClick = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function () { window.__zipName = this.download; return undefined; };
      window.__restoreClicks = () => { HTMLAnchorElement.prototype.click = originalClick; };
      return true;
    })()`);
    assert.equal(await page.evaluate(clickByText('导出记录包')), true, 'export button present');
    await page.wait(`window.__zipBlob instanceof Blob`, 'export package built', 30000);
    const zip = await page.evaluate(`(async () => {
      const bytes = new Uint8Array(await window.__zipBlob.arrayBuffer());
      return { name: window.__zipName, size: bytes.length, signature: [...bytes.slice(0, 2)].map(b => String.fromCharCode(b)).join(''), head: [...bytes.slice(0, 4)] };
    })()`);
    assert.equal(zip.signature, 'PK', 'export must be a zip');
    assert.match(zip.name, /访客记录.*\.zip$/);
    assert.ok(zip.size > 1000, `zip should carry the photo (${zip.size} bytes)`);
    await page.evaluate(`window.__restoreClicks()`);
    checks.push(`${device}: 导出 ZIP ${zip.name}（${Math.round(zip.size / 1024)} KB，PK 头正确）`);

    // Import back after clearing: build a File from the exported bytes and feed the input.
    await page.evaluate(`(async () => {
      const bytes = new Uint8Array(await window.__zipBlob.arrayBuffer());
      window.__zipArray = [...bytes];
    })()`);
    await page.evaluate(clickByText('清空全部'));
    await page.wait(`document.querySelector('.vr-toast')?.textContent.includes('已清空本机记录') ?? false`, 'clear confirmed', 30000);
    await page.wait(`!!document.querySelector('.vr-empty') || document.querySelectorAll('.vr-list li').length === 0`, 'cleared', 30000);
    await page.evaluate(`(() => {
      const bytes = new Uint8Array(window.__zipArray);
      const file = new File([bytes], 'restore.zip', { type: 'application/zip' });
      const input = document.querySelector('.vr-file input[type=file]');
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`);
    await page.wait(`document.querySelector('.vr-list')?.textContent.includes('荆州博物馆')`, 'record restored from package', 30000).catch(async error => {
      const diagnostic = await page.evaluate(`({
        toasts: [...document.querySelectorAll('.vr-toast')].map(node => node.textContent.slice(0, 160)),
        listItems: document.querySelectorAll('.vr-list li').length,
        empty: !!document.querySelector('.vr-empty'),
        zipArray: Array.isArray(window.__zipArray) ? window.__zipArray.length : null,
        zipBytes: window.__zipBlob?.size ?? null,
      })`);
      console.error('[import diagnostics]', JSON.stringify(diagnostic));
      throw error;
    });
    await page.wait(`document.querySelector('.vr-toast')?.textContent.includes('导入完成') ?? false`, 'import summary', 30000);
    assert.match(await page.evaluate(`document.querySelector('.vr-toast')?.textContent ?? ''`), /导入完成：新增 1 条/, 'import summary');
    checks.push(`${device}: 清空后从导出包导入还原成功`);

    const geometry = await page.evaluate(`(() => {
      const small = [...document.querySelectorAll('.vr-shell button, .vr-shell a, .vr-shell .vr-file')].filter(node => node.getClientRects().length && node.getBoundingClientRect().height < 43).map(node => node.textContent.slice(0, 20));
      return { overflow: document.documentElement.scrollWidth - innerWidth, small };
    })()`);
    assert.ok(geometry.overflow <= 1, `${device} horizontal overflow ${geometry.overflow}`);
    assert.deepEqual(geometry.small, [], `${device} touch targets`);
    checks.push(`${device}: 无横向溢出，触控目标均 ≥43px`);

    const shot = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    await writeFile(new URL(`visitor-records-${device}.png`, output), Buffer.from(shot.data, 'base64'));

    // Leave a clean browser profile for the next device pass.
    await page.evaluate(`(() => { indexedDB.deleteDatabase('huaxia-visitor-records'); return true; })()`);
  }

  assert.deepEqual(page.errors, [], 'uncaught browser errors');
  assert.deepEqual(page.failures.filter(entry => !/ERR_ABORTED/.test(entry)), [], 'unexpected network failures');
  await writeFile(new URL('visitor-records-results.json', output), `${JSON.stringify({ baseUrl: base, testedAt: new Date().toISOString(), passed: checks.length, checks }, null, 2)}\n`);
  console.log(JSON.stringify({ passed: checks.length, checks }, null, 2));
} catch (error) {
  await page.send('Page.captureScreenshot', { format: 'png' }).then(shot => writeFile(new URL('visitor-records-failure.png', output), Buffer.from(shot.data, 'base64'))).catch(() => {});
  throw error;
} finally { await page.close(); }
