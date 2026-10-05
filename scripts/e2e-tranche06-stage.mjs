import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHeadlessPage} from './lib/headless-cdp.mjs';
const base=process.env.HUAXIA_E2E_URL??'http://127.0.0.1:4180/';
assert.equal(new URL(base).hostname,'127.0.0.1');
const output=new URL('../docs/audits/expansion-600-browser/tranche-06-stage/',import.meta.url);
await mkdir(output,{recursive:true});const checks=[];
for(const [label,width,mobile] of [['desktop',1440,false],['mobile-390',390,true]]){
 const page=await createHeadlessPage();
 try{
  await page.send('Emulation.setDeviceMetricsOverride',{width,height:mobile?844:960,deviceScaleFactor:1,mobile});
  await page.send('Page.navigate',{url:new URL('previews/tranche-06-stage.html',base).href});
  await page.wait(`document.querySelectorAll('article').length===45 && document.querySelector('img')?.naturalWidth>0`,'candidate preview');
  const state=await page.evaluate(`({articles:document.querySelectorAll('article').length,images:document.querySelectorAll('img').length,pending:document.querySelectorAll('.pending').length,overflow:document.documentElement.scrollWidth-innerWidth,disclosure:document.body.textContent.includes('尚未入库')&&document.body.textContent.includes('非文物实拍'),links:[...document.querySelectorAll('article a')].every(a=>a.hostname==='www.njmuseumadmin.com')})`);
  assert.equal(state.articles,45);assert.equal(state.images,7);assert.equal(state.pending,38);assert.ok(state.overflow<=1);assert.equal(state.disclosure,true);assert.equal(state.links,true);
  const shot=await page.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  await writeFile(new URL(`${label}.png`,output),Buffer.from(shot.data,'base64'));
  assert.equal(page.errors.length,0);checks.push({label,...state});
 }finally{await page.close();}
}
await writeFile(new URL('results.json',output),JSON.stringify({localOnly:true,candidatePreviewOnly:true,passed:checks.length,checks},null,2)+'\n');
console.log(JSON.stringify(checks));
