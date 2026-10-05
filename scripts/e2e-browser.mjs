import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import responsiveManifest from '../assets/responsive-images/manifest.json' with { type: 'json' };
import museumIndex from '../src/data/museum-index.json' with { type: 'json' };
import imageRegistry from '../src/data/images.json' with { type: 'json' };

const songCount = museumIndex.flatMap(museum => museum.artifacts).filter(artifact => artifact.era === '宋辽金元').length;

const endpoint = process.env.HUAXIA_CDP_ENDPOINT ?? 'http://127.0.0.1:9223';
const baseUrl = process.env.HUAXIA_E2E_URL ?? 'https://huaxia-museum-atlas.pages.dev/';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class CdpPage {
  constructor(webSocketUrl) {
    this.socket = new WebSocket(webSocketUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.networkFailures = [];
  }

  async open() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(`${pending.method}: ${message.error.message}`));
        else pending.resolve(message.result);
      } else if (message.method === 'Network.loadingFailed' && !message.params.canceled) {
        this.networkFailures.push(message.params.errorText || `blocked:${message.params.blockedReason ?? 'unknown'}`);
      }
    });
    await Promise.all([
      this.send('Page.enable'),
      this.send('Runtime.enable'),
      this.send('Network.enable'),
    ]);
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { method, resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  }

  async waitFor(expression, label, timeout = 10000) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      if (await this.evaluate(expression)) return;
      await sleep(100);
    }
    throw new Error(`Timed out waiting for ${label}`);
  }

  async navigate(url) {
    await this.send('Page.navigate', { url });
    await this.waitFor(
      `document.readyState === 'complete' && !!document.querySelector('#root > *')`,
      `page load: ${url}`,
      60000,
    );
    await this.dismissOpening();
  }

  async reload() {
    await this.send('Page.reload', { ignoreCache: true });
    await this.waitFor(
      `document.readyState === 'complete' && !!document.querySelector('#root > *')`,
      'page reload',
      60000,
    );
    await this.dismissOpening();
  }

  async dismissOpening() {
    if (!await this.evaluate(`!!document.querySelector('.ink-intro-skip')`)) return;
    await this.evaluate(`document.querySelector('.ink-intro-skip')?.click()`);
    await this.waitFor(`!document.querySelector('[data-ink-intro]')`, 'opening dismissal');
  }

  async setViewport(width, height, mobile) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: mobile ? 2 : 1,
      mobile,
      screenWidth: width,
      screenHeight: height,
    });
    await this.send('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: mobile ? 5 : 1 });
  }

  close() {
    this.socket.close();
  }
}

async function createPage() {
  let version;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      version = await fetch(`${endpoint}/json/version`).then((response) => response.json());
      break;
    } catch {
      await sleep(100);
    }
  }
  assert.ok(version, 'Edge debugging endpoint did not become ready');
  const target = await fetch(`${endpoint}/json/new?about:blank`, { method: 'PUT' }).then((response) => response.json());
  const page = new CdpPage(target.webSocketDebuggerUrl);
  await page.open();
  return page;
}

function clickButton(text) {
  return `(() => {
    const button = [...document.querySelectorAll('button')].find((item) => item.textContent.trim() === ${JSON.stringify(text)});
    if (!button) return false;
    button.click();
    return true;
  })()`;
}

function setSelect(selector, value) {
  return `(() => {
    const select = document.querySelector(${JSON.stringify(selector)});
    if (!select) return false;
    select.value = ${JSON.stringify(value)};
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`;
}

const page = await createPage();
const report = [];

try {
  await page.setViewport(1440, 960, false);
  await page.navigate(baseUrl);
  await page.waitFor(`!![...document.querySelectorAll('button')].find((item) => item.textContent.trim() === '宋辽金元')`, 'desktop era controls');
  assert.equal(await page.evaluate(clickButton('宋辽金元')), true);
  await page.waitFor(`new URLSearchParams(location.search).get('era') === '宋辽金元'`, 'era URL state');
  await page.waitFor(`document.querySelector('#collection-results-title')?.textContent.trim() === '宋辽金元文物' && document.querySelectorAll('.atlas-collection-results article').length === ${songCount}`, 'deferred desktop collection results');
  let state = await page.evaluate(`({
    title: document.querySelector('#collection-results-title')?.textContent.trim(),
    status: document.querySelector('.atlas-collection-results [role="status"]')?.textContent.trim(),
    cards: document.querySelectorAll('.atlas-collection-results article').length,
  })`);
  assert.equal(state.title, '宋辽金元文物');
  assert.equal(state.cards, songCount);
  assert.match(state.status, new RegExp(`全国已收录 ${songCount} 件`));
  report.push(`桌面：朝代筛选与全国 ${songCount} 件结果`);

  assert.equal(await page.evaluate(setSelect('select[aria-label="选择类别"]', '书画')), true);
  await page.waitFor(`new URLSearchParams(location.search).get('category') === '书画'`, 'category URL state');
  assert.equal(await page.evaluate(setSelect('#collection-province', '北京市')), true);
  await page.waitFor(`new URLSearchParams(location.search).get('region') === '北京市'`, 'region URL state');
  state = await page.evaluate(`({
    cards: document.querySelectorAll('.atlas-collection-results article').length,
    allBeijing: [...document.querySelectorAll('.atlas-collection-results article')].every((item) => item.textContent.includes('北京市')),
    category: document.querySelector('select[aria-label="选择类别"]')?.value,
    region: document.querySelector('#collection-province')?.value,
  })`);
  assert.ok(state.cards > 0);
  assert.equal(state.allBeijing, true);
  assert.equal(state.category, '书画');
  assert.equal(state.region, '北京市');
  report.push('桌面：朝代、类别、省份组合筛选');

  await page.evaluate(`history.back()`);
  await page.waitFor(`!new URLSearchParams(location.search).has('region')`, 'history back removes region');
  await page.evaluate(`history.back()`);
  await page.waitFor(`!new URLSearchParams(location.search).has('category')`, 'history back removes category');
  await page.evaluate(`history.forward()`);
  await page.waitFor(`new URLSearchParams(location.search).get('category') === '书画'`, 'history forward restores category');
  await page.evaluate(`history.forward()`);
  await page.waitFor(`new URLSearchParams(location.search).get('region') === '北京市'`, 'history forward restores region');
  report.push('桌面：浏览器前进后退恢复组合条件');

  await page.reload();
  await page.waitFor(`document.querySelector('#collection-province')?.value === '北京市'`, 'reload restores filters');
  state = await page.evaluate(`({
    era: document.querySelector('button[aria-pressed="true"]')?.textContent.trim(),
    category: document.querySelector('select[aria-label="选择类别"]')?.value,
    region: document.querySelector('#collection-province')?.value,
  })`);
  assert.deepEqual(state, { era: '宋辽金元', category: '书画', region: '北京市' });
  report.push('桌面：刷新恢复组合条件');

  const sharedUrl = new URL(baseUrl);
  sharedUrl.searchParams.set('era', '宋辽金元');
  sharedUrl.searchParams.set('category', '书画');
  sharedUrl.searchParams.set('region', '北京市');
  await page.navigate(sharedUrl.href);
  await page.waitFor(`document.querySelector('#collection-province')?.value === '北京市'`, 'shared URL restores filters');
  report.push('桌面：分享链接直达');

  const eraOnlyUrl = new URL(baseUrl);
  eraOnlyUrl.searchParams.set('era', '宋辽金元');
  await page.navigate(eraOnlyUrl.href);
  await page.waitFor(`document.querySelectorAll('.atlas-collection-results article').length === ${songCount}`, 'scroll result list');
  const scrollBefore = await page.evaluate(`(() => {
    const viewport = document.querySelector('.atlas-collection-results > div:last-child');
    viewport.scrollTop = Math.min(720, viewport.scrollHeight - viewport.clientHeight);
    viewport.dispatchEvent(new Event('scroll'));
    return viewport.scrollTop;
  })()`);
  assert.ok(scrollBefore > 100, `result list did not scroll: ${scrollBefore}`);
  assert.equal(await page.evaluate(`(() => {
    const button = document.querySelectorAll('.atlas-collection-results article button')[12];
    if (!button) return false;
    button.click();
    return true;
  })()`), true);
  await page.waitFor(`!!document.querySelector('button[aria-label="关闭文物详情"]')`, 'artifact detail opens');
  state = await page.evaluate(`({
    era: new URLSearchParams(location.search).get('era'),
    museum: new URLSearchParams(location.search).get('museum'),
    artifact: new URLSearchParams(location.search).get('artifact'),
  })`);
  assert.equal(state.era, '宋辽金元');
  assert.ok(state.museum && state.artifact);
  assert.equal(await page.evaluate(`(() => { document.querySelector('button[aria-label="关闭文物详情"]').click(); return true; })()`), true);
  await page.waitFor(`!new URLSearchParams(location.search).has('artifact') && !document.querySelector('button[aria-label="关闭文物详情"]')`, 'return from detail');
  await page.waitFor(`Math.abs((document.querySelector('.atlas-collection-results > div:last-child')?.scrollTop ?? -1) - ${scrollBefore}) <= 2`, 'desktop scroll restoration');
  const scrollAfter = await page.evaluate(`document.querySelector('.atlas-collection-results > div:last-child')?.scrollTop ?? -1`);
  assert.ok(Math.abs(scrollAfter - scrollBefore) <= 2, `scroll position changed from ${scrollBefore} to ${scrollAfter}`);
  report.push('桌面：详情返回保留筛选及列表位置');

  const sourceArtifactUrl = new URL(baseUrl);
  sourceArtifactUrl.searchParams.set('province', '上海市');
  sourceArtifactUrl.searchParams.set('museum', 'shanghai');
  sourceArtifactUrl.searchParams.set('artifact', 'sh-sqf');
  await page.navigate(sourceArtifactUrl.href);
  await page.waitFor(`document.querySelector('[role="dialog"]')?.textContent.includes('来源图 · 非 AI 复原')`, 'source artifact disclosure');
  state = await page.evaluate(`(() => {
    const dialog = document.querySelector('[role="dialog"]');
    const sourceLink = [...dialog.querySelectorAll('a')].find((item) => item.textContent.includes('查看来源页'));
    return {
      text: dialog.textContent,
      sourceHref: sourceLink?.href,
      sourceTarget: sourceLink?.target,
    };
  })()`);
  assert.match(state.text, /来源图 · 非 AI 复原/);
  assert.match(state.text, /授权状态：待核验，不作为开放授权声明/);
  assert.equal(state.sourceHref, 'https://www.shanghaimuseum.net/mu/frontend/pg/m/article/id/CI00000346');
  assert.equal(state.sourceTarget, '_blank');
  report.push('桌面：来源图、来源链接与授权待核披露');

  const aiArtifactUrl = new URL(baseUrl);
  aiArtifactUrl.searchParams.set('province', '北京市');
  aiArtifactUrl.searchParams.set('museum', 'gugong');
  aiArtifactUrl.searchParams.set('artifact', 'gg-gzdc');
  await page.navigate(aiArtifactUrl.href);
  await page.waitFor(`document.querySelector('[role="dialog"]')?.textContent.includes('AI 复原示意 · 非文物实拍')`, 'AI artifact disclosure');
  state = await page.evaluate(`document.querySelector('[role="dialog"]')?.textContent ?? ''`);
  assert.match(state, /AI 复原示意 · 非文物实拍/);
  report.push('桌面：AI 复原图非实拍披露');

  await page.setViewport(390, 844, true);
  await page.navigate(sharedUrl.href);
  await page.waitFor(`document.querySelector('#collection-province')?.value === '北京市'`, 'mobile shared URL');
  state = await page.evaluate(`({
    width: innerWidth,
    overflow: document.documentElement.scrollWidth - innerWidth,
    era: document.querySelector('select[aria-label="选择朝代"]')?.value,
    category: document.querySelector('select[aria-label="选择类别"]')?.value,
    region: document.querySelector('#collection-province')?.value,
    provinceTarget: document.querySelector('#collection-province')?.getBoundingClientRect().height,
    eraTarget: document.querySelector('select[aria-label="选择朝代"]')?.getBoundingClientRect().height,
    categoryTarget: document.querySelector('select[aria-label="选择类别"]')?.getBoundingClientRect().height,
    panelTop: document.querySelector('.atlas-collection-results')?.getBoundingClientRect().top,
    headerBottom: document.querySelector('.atlas-topbar')?.getBoundingClientRect().bottom,
  })`);
  assert.equal(state.width, 390);
  assert.ok(state.overflow <= 1, `mobile horizontal overflow: ${state.overflow}px`);
  assert.deepEqual({ era: state.era, category: state.category, region: state.region }, { era: '宋辽金元', category: '书画', region: '北京市' });
  assert.ok(state.provinceTarget >= 44, `mobile region target is ${state.provinceTarget}px high`);
  assert.ok(state.eraTarget >= 44, `mobile era target is ${state.eraTarget}px high`);
  assert.ok(state.categoryTarget >= 44, `mobile category target is ${state.categoryTarget}px high`);
  assert.ok(state.panelTop >= state.headerBottom - 1, `mobile result panel overlaps header: ${state.panelTop} < ${state.headerBottom}`);
  report.push('手机：390×844 分享链接、组合条件、触控尺寸与无横向溢出');

  await page.reload();
  await page.waitFor(`document.querySelector('#collection-province')?.value === '北京市'`, 'mobile reload restores filters');
  report.push('手机：刷新恢复组合条件');

  assert.equal(await page.evaluate(setSelect('select[aria-label="选择朝代"]', '先秦')), true);
  await page.waitFor(`new URLSearchParams(location.search).get('era') === '先秦'`, 'mobile era change');
  await page.evaluate(`history.back()`);
  await page.waitFor(`new URLSearchParams(location.search).get('era') === '宋辽金元'`, 'mobile history back');
  await page.evaluate(`history.forward()`);
  await page.waitFor(`new URLSearchParams(location.search).get('era') === '先秦'`, 'mobile history forward');
  report.push('手机：筛选变更与浏览器前进后退');

  await page.navigate(eraOnlyUrl.href);
  await page.waitFor(`document.querySelectorAll('.atlas-collection-results article').length === ${songCount}`, 'mobile result list');
  const mobileScrollBefore = await page.evaluate(`(() => {
    const viewport = document.querySelector('.atlas-collection-results > div:last-child');
    viewport.scrollTop = Math.min(900, viewport.scrollHeight - viewport.clientHeight);
    viewport.dispatchEvent(new Event('scroll'));
    return viewport.scrollTop;
  })()`);
  assert.ok(mobileScrollBefore > 100, `mobile result list did not scroll: ${mobileScrollBefore}`);
  assert.equal(await page.evaluate(`(() => {
    const button = document.querySelectorAll('.atlas-collection-results article button')[12];
    if (!button) return false;
    button.click();
    return true;
  })()`), true);
  await page.waitFor(`!!document.querySelector('button[aria-label="关闭文物详情"]')`, 'mobile artifact detail opens');
  assert.equal(await page.evaluate(`(() => { document.querySelector('button[aria-label="关闭文物详情"]').click(); return true; })()`), true);
  await page.waitFor(`!new URLSearchParams(location.search).has('artifact') && !document.querySelector('button[aria-label="关闭文物详情"]')`, 'mobile return from detail');
  await page.waitFor(`Math.abs((document.querySelector('.atlas-collection-results > div:last-child')?.scrollTop ?? -1) - ${mobileScrollBefore}) <= 2`, 'mobile scroll restoration');
  const mobileScrollAfter = await page.evaluate(`document.querySelector('.atlas-collection-results > div:last-child')?.scrollTop ?? -1`);
  assert.ok(Math.abs(mobileScrollAfter - mobileScrollBefore) <= 2, `mobile scroll position changed from ${mobileScrollBefore} to ${mobileScrollAfter}`);
  report.push('手机：详情返回保留筛选及列表位置');

  await page.navigate(sourceArtifactUrl.href);
  await page.waitFor(`document.querySelector('[role="dialog"]')?.textContent.includes('来源图 · 非 AI 复原')`, 'mobile source artifact disclosure');
  state = await page.evaluate(`(() => {
    const dialog = document.querySelector('[role="dialog"]');
    const sourceLink = [...dialog.querySelectorAll('a')].find((item) => item.textContent.includes('查看来源页'));
    return {
      text: dialog.textContent,
      overflow: dialog.scrollWidth - dialog.clientWidth,
      sourceTargetHeight: sourceLink?.getBoundingClientRect().height ?? 0,
    };
  })()`);
  assert.match(state.text, /来源图 · 非 AI 复原/);
  assert.match(state.text, /授权状态：待核验，不作为开放授权声明/);
  assert.ok(state.overflow <= 1, `mobile detail horizontal overflow: ${state.overflow}px`);
  assert.ok(state.sourceTargetHeight >= 44, `mobile source link target is ${state.sourceTargetHeight}px high`);
  report.push('手机：来源与授权披露、触控入口及无横向溢出');

  const artifactUrl = (province, museum, artifact) => {
    const url = new URL(baseUrl);
    url.search = new URLSearchParams({ province, museum, artifact }).toString();
    return url.href;
  };
  const screenshotDir = new URL(process.env.HUAXIA_E2E_OUTPUT ?? '../docs/audits/round3-closeout-browser/', import.meta.url);
  await mkdir(screenshotDir, { recursive: true });
  for (const mobile of [false, true]) {
    const device = mobile ? '手机' : '桌面';
    await page.setViewport(mobile ? 390 : 1440, mobile ? 844 : 960, mobile);
    for (const id of ['gg-qmsh', 'gg-qljs']) {
      await page.navigate(artifactUrl('北京市', 'gugong', id));
      await page.waitFor(`document.querySelector('[role="region"][aria-label$="长卷阅卷台"]')?.dataset.scrollReaderReady === 'true' && document.querySelector('[role="region"][aria-label$="长卷阅卷台"]')?.scrollWidth > 1000`, `${device} ${id} decoded scroll ready`, 60000);
      const rect = await page.evaluate(`(() => {
        const v = document.querySelector('[role="region"][aria-label$="长卷阅卷台"]');
        v.scrollIntoView({block:'center'}); v.focus();
        const r = v.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      })()`);
      if (mobile) {
        const start = rect.x + rect.width * 0.8;
        const y = rect.y + rect.height * 0.45;
        await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: start, y }] });
        for (let i = 1; i <= 8; i++) {
          await page.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start - i * 20, y }] });
          await sleep(30);
        }
        await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else {
        await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
        await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
      }
      await page.waitFor(`document.querySelector('[role="region"][aria-label$="长卷阅卷台"]').scrollLeft > 50`, `${device} scroll movement`);
      const disclosure = await page.evaluate(`(() => {
        const d = document.querySelector('[role="dialog"]');
        const a = [...d.querySelectorAll('a')].find(a => a.textContent.includes('来源页许可'));
        return {text:d.textContent, license:a?.href, height:a?.getBoundingClientRect().height, overflow:d.scrollWidth-d.clientWidth};
      })()`);
      const verifiedScroll = imageRegistry[id].variants.detail.provenance.authorizationStatus === 'verified';
      assert.match(disclosure.text, verifiedScroll ? /来源与授权已核/ : /当前文件授权待核/);
      assert.match(disclosure.text, verifiedScroll ? /授权状态：Public domain/ : /授权状态：待核验/);
      if (id === 'gg-qmsh') {
        assert.doesNotMatch(disclosure.text, /当前为低清历史缩图|查看高清全卷候选（尚未接入本站）/);
        assert.match(disclosure.text, /用户提供|16000×770/);
        assert.match(disclosure.text, /不含完整题跋/);
        assert.match(disclosure.text, /查看原文件哈希与图像处理记录/);
        assert.equal(disclosure.license, undefined);
        assert.equal(await page.evaluate(`document.querySelector('[aria-label$="长卷阅卷台"] img')?.currentSrc.includes('/artifact-scroll-tiles/gg-qmsh/')`), true);
        assert.equal(await page.evaluate(`!!document.querySelector('a[href="/data/image-processing/gg-qmsh-user-2026-09-16.json"]')`), true);
        await page.evaluate(`(() => { const v=document.querySelector('[aria-label$="长卷阅卷台"]'); v.scrollLeft=(v.scrollWidth-v.clientWidth)*0.5; })()`);
      } else {
        assert.match(disclosure.text, /16000×640/);
        assert.doesNotMatch(disclosure.text, /当前为低清历史缩图/);
        assert.equal(disclosure.license, imageRegistry[id].variants.detail.provenance.licenseUrl);
        assert.ok(disclosure.height >= 44);
      }
      assert.ok(disclosure.overflow <= 1);
      const shot = await page.send('Page.captureScreenshot', { format: 'png' });
      await writeFile(new URL(`${mobile ? 'mobile' : 'desktop'}-${id}.png`, screenshotDir), Buffer.from(shot.data, 'base64'));
      report.push(`${device}：${id} ${mobile ? '原生触摸横滑' : '键盘阅卷'}、${id === 'gg-qmsh' ? '用户高清分段处理记录与待核披露' : '已核原件许可与处理记录'}`);
    }
    await page.navigate(artifactUrl('北京市', 'gugong', 'gg-jgyg'));
    await page.waitFor(`document.querySelector('[role="dialog"]')?.textContent.includes('AI 复原示意 · 非文物实拍')`, `${device} quarantined source replaced by labeled AI illustration`);
    assert.equal(await page.evaluate(`!!document.querySelector('[role="dialog"] img[src*="/artifacts/gg-jgyg.jpg"], [role="dialog"] img[src*="/artifacts-v2/p2-source/gg-jgyg.png"]')`), false);
    report.push(`${device}：错配来源图隔离，独立 AI 示意图明确披露且不回退旧图`);

    await page.navigate(artifactUrl('河北省', 'hebwy', 'hb-cxd'));
    await page.waitFor(`document.querySelector('[role="dialog"]')?.textContent.includes('AI 复原示意 · 非文物实拍')`, `${device} restricted source excluded`);
    assert.equal(await page.evaluate(`!!document.querySelector('[role="dialog"] img[src*="artifact-sources/official/hb-cxd"]')`), false);
    report.push(`${device}：明确受限来源停止展示，AI 披露保持真实`);
    await page.navigate(artifactUrl('浙江省', 'zhejiang', 'zj-yzj'));
    await page.waitFor(`(() => { const image = document.querySelector('[role="dialog"] img[data-original-src$="zj-yzj-detail-cc0.jpg"]'); return image?.naturalWidth > 0 && image.currentSrc.includes('/artifact-responsive/'); })()`, `${device} verified source image`);
    const verified = await page.evaluate(`(() => {
      const d = document.querySelector('[role="dialog"]');
      const license = [...d.querySelectorAll('a')].find(a => a.textContent.includes('来源页许可'));
      return { text:d.textContent, license:license?.href, height:license?.getBoundingClientRect().height, overflow:d.scrollWidth-d.clientWidth };
    })()`);
    assert.match(verified.text, /授权状态：CC0 1.0/);
    assert.match(verified.text, /原件与展示图证据已核/);
    assert.match(verified.text, /Gary Todd/);
    assert.doesNotMatch(verified.text, /AI 复原示意 · 非文物实拍|暂缓展示原图|当前文件授权待核/);
    assert.equal(verified.license, 'https://creativecommons.org/publicdomain/zero/1.0/');
    assert.ok(verified.height >= 44 && verified.overflow <= 1);
    const verifiedShot = await page.send('Page.captureScreenshot', { format:'png' });
    await writeFile(new URL(`${mobile ? 'mobile' : 'desktop'}-zj-yzj.png`, screenshotDir), Buffer.from(verifiedShot.data,'base64'));
    await page.evaluate(`document.querySelector('button[aria-label="关闭文物详情"]').click()`);
    await page.waitFor(`!!document.querySelector('[data-original-src$="zj-yzj-card-cc0.jpg"]')`, `${device} source card placeholder`);
    await page.evaluate(`document.querySelector('[data-original-src$="zj-yzj-card-cc0.jpg"]').scrollIntoView({block:'center'})`);
    await page.waitFor(`!!document.querySelector('img[src$="zj-yzj-card-cc0.jpg"]')?.naturalWidth`, `${device} verified source card`);
    report.push(`${device}：浙江剑同源双图、CC0署名、许可链接、解除隔离与真实图片标识`);
  }
  // Deliberately fail an AI primary: the visible legacy source must replace its disclosure too.
  const gzdcDelivery = responsiveManifest.artifacts['gg-gzdc'].roles.detail;
  const primaryFailures = [...gzdcDelivery.primary.candidates.map(candidate => `*${candidate.src}`), `*${gzdcDelivery.primary.originalSrc}`];
  const fallbackFailures = [...gzdcDelivery.fallback.candidates.map(candidate => `*${candidate.src}`), `*${gzdcDelivery.fallback.originalSrc}`];
  await page.setViewport(1440, 960, false);
  await page.send('Network.setCacheDisabled', { cacheDisabled: true });
  await page.send('Network.setBlockedURLs', { urls: primaryFailures });
  const failuresBefore = page.networkFailures.length;
  await page.navigate(aiArtifactUrl.href);
  await page.waitFor(`!!document.querySelector('[role="dialog"] img[src$="/artifacts/gg-gzdc.jpg"]')?.naturalWidth`, 'legacy source fallback', 60000);
  const fallbackText = await page.evaluate(`document.querySelector('[role="dialog"]').textContent`);
  assert.match(fallbackText, /来源图 · 非 AI 复原/);
  assert.doesNotMatch(fallbackText, /AI 复原示意 · 非文物实拍/);
  report.push('故障注入：AI 主图失败，来源回退图及披露同步切换');
  await page.send('Network.setBlockedURLs', { urls: [...primaryFailures, ...fallbackFailures] });
  await page.navigate(aiArtifactUrl.href);
  await page.waitFor(`document.querySelector('[role="dialog"]')?.textContent.includes('影像状态：当前仅提供示意线刻')`, 'all images failed disclosure', 60000);
  assert.equal(await page.evaluate(`!!document.querySelector('[role="dialog"] img')`), false);
  report.push('故障注入：主备图均失败，不残留实拍或 AI 图授权披露');
  const expectedFailures = page.networkFailures.splice(failuresBefore);
  assert.ok(expectedFailures.every(f => /ERR_BLOCKED_BY_CLIENT|^blocked:inspector$/.test(f)), `unexpected injected failures: ${expectedFailures}`);
  await page.send('Network.setBlockedURLs', { urls: [] });

  const relevantFailures = page.networkFailures.filter((failure) => !/ERR_ABORTED/.test(failure));
  assert.deepEqual(relevantFailures, [], `network failures: ${relevantFailures.join(', ')}`);
  console.log(JSON.stringify({ passed: report.length, checks: report }, null, 2));
  await writeFile(new URL('results.json', screenshotDir), JSON.stringify({ baseUrl, testedAt: new Date().toISOString(), passed: report.length, checks: report }, null, 2) + '\n');
} finally {
  page.close();
}
