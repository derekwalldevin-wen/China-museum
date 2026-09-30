// Phase B end-to-end: a visitor submits from the page, the photo stays private while
// pending, the moderator approves it, and only then does it become public.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHeadlessPage, sleep } from './lib/headless-cdp.mjs';

const base = process.env.HUAXIA_E2E_URL ?? 'http://127.0.0.1:8788/';
const adminToken = process.env.HUAXIA_ADMIN_TOKEN ?? 'local-dev-admin-token';
const scope = new URL(base).hostname === '127.0.0.1' ? 'local' : 'production';
const output = new URL(`../docs/audits/visitor-records/${scope}/`, import.meta.url);
await mkdir(output, { recursive: true });
const pageUrl = new URL('visitor-records/', base).href;
const page = await createHeadlessPage();
const checks = [];
let stepName = 'start';
const step = name => { stepName = name; console.log(`[step] ${name}`); };
const guard = async (name, run) => { step(name); try { return await run(); } catch (error) { console.error(`[failed at] ${name}: ${error?.message ?? error}`); throw error; } };

const setByLabel = (labelText, value) => `(() => {
  const label = [...document.querySelectorAll('.vr-grid label')].find(node => node.textContent.includes(${JSON.stringify(labelText)}));
  const el = label && label.querySelector('input, select, textarea');
  if (!el) return false;
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : (el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype);
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)});
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return el.value === ${JSON.stringify(value)};
})()`;
const clickByText = (text, scopeSelector = 'button') => `(() => {
  const target = [...document.querySelectorAll(${JSON.stringify(scopeSelector)})].find(node => node.textContent.includes(${JSON.stringify(text)}));
  if (!target) return false;
  target.click();
  return true;
})()`;

async function review(action, extra = {}, token = adminToken) {
  const response = await fetch(new URL('api/visitor/review', base), {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-admin-token': token },
    body: JSON.stringify({ action, ...extra }),
  });
  return { status: response.status, body: await response.json().catch(() => ({})) };
}

try {
  // The API must refuse unauthenticated access.
  const unauthorized = await review('list', {}, '');
  assert.equal(unauthorized.status, 401, 'review endpoint must require the admin token');
  const wrongToken = await review('list', {}, 'not-the-token');
  assert.equal(wrongToken.status, 401, 'a wrong token must be rejected');

  for (const mobile of (process.env.HUAXIA_E2E_DEVICE === 'mobile' ? [true] : [false, true])) {
    const device = mobile ? 'mobile' : 'desktop';
    await page.send('Emulation.setDeviceMetricsOverride', { width: mobile ? 390 : 1440, height: mobile ? 844 : 960, deviceScaleFactor: mobile ? 2 : 1, mobile });
    await page.send('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: 5 });

    await page.navigate(pageUrl);
    await page.wait(`document.querySelector('.vr-shell h1')?.textContent.includes('访客实地记录')`, 'visitor page', 60000);
    await page.evaluate(`(() => { indexedDB.deleteDatabase('huaxia-visitor-records'); localStorage.removeItem('huaxia-visitor-submissions'); return true; })()`);
    await page.navigate(pageUrl);
    await page.wait(`!!document.querySelector('.vr-shell h1')`, 'visitor page reload');
    await sleep(600);

    const stamp = Date.now();
    const museum = `荆州博物馆-${stamp}`;
    await guard('fill form', async () => {
      assert.equal(await page.evaluate(setByLabel('博物馆名称', museum)), true, 'museum input');
      assert.equal(await page.evaluate(setByLabel('省份', '湖北省')), true, 'province select');
      assert.equal(await page.evaluate(setByLabel('城市', '荆州')), true, 'city input');
      assert.equal(await page.evaluate(setByLabel('参观时间', '2026-09')), true, 'month input');
      assert.equal(await page.evaluate(setByLabel('投稿人署名', '测试投稿人')), true, 'contributor input');
      await page.evaluate(`(() => { const el = document.querySelector('.vr-block textarea'); const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set; setter.call(el, '提交给网站审核的端到端测试记录。'); el.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
    });

    await guard('attach photo and consent', async () => {
      await page.evaluate(`(async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1400; canvas.height = 1000;
        const context = canvas.getContext('2d');
        context.fillStyle = '#2c4a3b'; context.fillRect(0, 0, 1400, 1000);
        context.fillStyle = '#d7a84a'; context.fillRect(120, 120, 500, 300);
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85));
        const input = document.querySelector('input[type=file][multiple]');
        const transfer = new DataTransfer();
        transfer.items.add(new File([blob], 'submit.jpg', { type: 'image/jpeg' }));
        input.files = transfer.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()`);
      await page.wait(`document.querySelectorAll('.vr-thumbs img').length > 0`, 'photo thumbnail', 30000);
      await page.evaluate(`(() => { [...document.querySelectorAll('.vr-consent input')].forEach(input => input.click()); return true; })()`);
      assert.equal(await page.evaluate(`[...document.querySelectorAll('.vr-consent input')].every(input => input.checked)`), true);
    });

    await guard('save locally', async () => {
      const saveEnabled = `(() => { const button = [...document.querySelectorAll('button')].find(node => node.textContent.includes('保存到本机')); return !!button && !button.disabled; })()`;
      await page.wait(saveEnabled, 'save button enabled', 20000);
      assert.equal(await page.evaluate(clickByText('保存到本机')), true);
      const listed = `document.querySelector('.vr-list')?.textContent.includes(${JSON.stringify(museum)})`;
      try {
        await page.wait(listed, 'saved record', 20000);
      } catch {
        // One retry: a click can land while React is mid-render right after photo intake.
        await page.evaluate(clickByText('保存到本机'));
        await page.wait(listed, 'saved record after retry', 20000).catch(async error => {
          const diagnostic = await page.evaluate(`({
            toasts: [...document.querySelectorAll('.vr-toast')].map(node => node.textContent.slice(0, 240)),
            hasList: !!document.querySelector('.vr-list'),
            empty: !!document.querySelector('.vr-empty'),
            thumbs: document.querySelectorAll('.vr-thumbs img').length,
            consents: [...document.querySelectorAll('.vr-consent input')].map(input => input.checked),
            saveDisabled: [...document.querySelectorAll('button')].find(node => node.textContent.includes('保存到本机'))?.disabled ?? null,
            museumValue: [...document.querySelectorAll('.vr-grid label')].find(label => label.textContent.includes('博物馆名称'))?.querySelector('input')?.value ?? '',
          })`);
          console.error('[save diagnostics]', JSON.stringify(diagnostic));
          throw error;
        });
      }
    });

    await guard('submit to site', async () => {
      assert.equal(await page.evaluate(clickByText('提交到网站审核')), true, 'submit button present');
      await page.wait(`document.querySelector('.vr-list')?.textContent.includes('已提交 · 等待站长审核') ?? false`, 'pending status', 30000).catch(async error => {
        const diagnostic = await page.evaluate(`({
          toasts: [...document.querySelectorAll('.vr-toast')].map(node => node.textContent.slice(0, 200)),
          list: document.querySelector('.vr-list')?.textContent?.slice(-200) ?? '',
        })`);
        console.error('[submit diagnostics]', JSON.stringify(diagnostic));
        throw error;
      });
    });
    const submissionId = await page.evaluate(`(() => {
      const state = JSON.parse(localStorage.getItem('huaxia-visitor-submissions') ?? '{}');
      const values = Object.values(state);
      return values.length ? values[values.length - 1].id : '';
    })()`);
    assert.match(submissionId, /^[0-9a-f-]{36}$/, 'submission id captured');

    // Pending: invisible publicly, and its photo is not served.
    await guard('pending stays private', async () => {
      const published = await (await fetch(new URL('api/visitor/published', base))).json();
      assert.equal(published.records.some(record => record.id === submissionId), false, 'pending must not be public');
      const list = await review('list');
      const found = list.body.records.find(record => record.id === submissionId);
      assert.ok(found, 'moderator sees the pending record');
      assert.equal(found.contributor, '测试投稿人');
      assert.equal(found.photos.length, 1);
      const photoId = found.photos[0].id;
      const anonymous = await fetch(new URL(`api/visitor/photo/${photoId}`, base));
      assert.equal(anonymous.status, 404, 'pending photo must be private');
      const withToken = await fetch(new URL(`api/visitor/photo/${photoId}`, base), { headers: { 'x-admin-token': adminToken } });
      assert.equal(withToken.status, 200, 'moderator can preview the photo');
      assert.equal(withToken.headers.get('content-type'), 'image/jpeg');
      const bytes = new Uint8Array(await withToken.arrayBuffer());
      assert.ok(bytes.length > 1000, 'photo bytes served');
      checks.push(`${device}: 已提交（编号 ${submissionId.slice(0, 8)}），待审期间公开接口与照片均不可见`);
    });

    await guard('approve', async () => {
      const approved = await review('approve', { id: submissionId, note: '端到端测试：已核对本人拍摄声明' });
      assert.equal(approved.status, 200);
      assert.equal(approved.body.status, 'approved');
    });

    await guard('published after approval', async () => {
      const response = await fetch(new URL('api/visitor/published', base));
      const published = await response.json();
      const record = published.records.find(item => item.id === submissionId);
      assert.ok(record, 'approved record is public');
      assert.equal(published.label, '访客投稿 · 未经馆方核验');
      assert.equal(record.contributor, '测试投稿人');
      assert.equal(record.reviewerNote, '端到端测试：已核对本人拍摄声明');
      const photo = await fetch(new URL(record.photos[0].src, base));
      assert.equal(photo.status, 200, 'approved photo is public');
      assert.equal(photo.headers.get('cache-control')?.includes('max-age'), true);
    });

    await page.navigate(pageUrl);
    await page.wait(`document.querySelector('.vr-published')?.textContent.includes(${JSON.stringify(museum)})`, 'approved record listed on the page', 30000).catch(async error => {
      const diagnostic = await page.evaluate(`({
        publishedText: document.querySelector('[data-visitor-published]')?.textContent?.slice(0, 300) ?? '(missing)',
        apiStatus: await fetch('/api/visitor/published', { cache: 'no-cache' }).then(async response => ({ status: response.status, ids: (await response.json()).records?.map(item => item.id.slice(0, 8)) })).catch(caught => String(caught)),
      })`);
      console.error('[published diagnostics]', JSON.stringify(diagnostic));
      throw error;
    });
    const shown = await page.evaluate(`(() => { const item = [...document.querySelectorAll('.vr-published > li')].find(node => node.textContent.includes(${JSON.stringify(museum)})); return item ? { text: item.textContent, tag: item.querySelector('.vr-tag')?.textContent ?? '' } : null; })()`);
    assert.ok(shown, 'published entry rendered');
    assert.equal(shown.tag, '访客投稿 · 未经馆方核验');
    assert.match(shown.text, /测试投稿人/);
    assert.match(shown.text, /端到端测试：已核对本人拍摄声明/);
    checks.push(`${device}: 审核通过后出现在“已发布”，带“未经馆方核验”标识与审核备注`);

    const geometry = await page.evaluate(`(() => ({ overflow: document.documentElement.scrollWidth - innerWidth }))()`);
    assert.ok(geometry.overflow <= 1, `${device} overflow`);
    const shot = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    await writeFile(new URL(`visitor-submit-${device}.png`, output), Buffer.from(shot.data, 'base64'));
  }

  assert.deepEqual(page.errors, [], 'uncaught browser errors');
  assert.deepEqual(page.failures.filter(entry => !/ERR_ABORTED/.test(entry)), [], 'unexpected network failures');
  await writeFile(new URL('visitor-submit-results.json', output), `${JSON.stringify({ baseUrl: base, testedAt: new Date().toISOString(), passed: checks.length, checks }, null, 2)}\n`);
  console.log(JSON.stringify({ passed: checks.length, checks }, null, 2));
} catch (error) {
  await page.send('Page.captureScreenshot', { format: 'png' }).then(shot => writeFile(new URL('visitor-submit-failure.png', output), Buffer.from(shot.data, 'base64'))).catch(() => {});
  throw error;
} finally { await page.close(); }
