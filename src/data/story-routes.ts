export interface GuideRoute { trailId: string | null; storyId: string | null }

interface StoryTeaser { id: string }
interface TrailRoute { id: string; ids: string[] }

// Ids allowed for ?story=. Kept as one space-separated string rather than an array
// literal: with this many ids the quotes and commas alone cost several hundred bytes
// of the first-screen bundle, which has a hard budget.
const storyTeasers: StoryTeaser[] = `hb-cxd gx-yfd gg-jgyg hub-zhy gb-jgs sxl-lt gg-pft gg-qmsh gg-qljs jl-efj gg-gzdc dz-jp nj-mb hain-hgj gb-hsyl hb-jly dz-yzp gb-jlfw sx-qh hain-lj gg-jgb gg-ryzl gb-gyts gb-yygd gb-cxct sb-jd sb-bjl gb-hmwd gb-syz sh-dkd sx-nz sh-sqf hn-fhxz hn-ywtj hun-mfl zj-fcst hn-jhg hn-wzt hn-lhfh sh-syt hub-ywj hub-zp sxd-qs js-tysn hub-qj hun-tbh hun-ssd sxd-dlr sd-szb cs-zml qs-by bj-hz gs-tbm xj-wxc bj-lp tp-mgd sh-zzjp sxl-xmb sxl-wmh sxl-hzx ny-wdx ny-jyb ny-yh ny-cpyb ny-hujie ny-gaozu ny-xiangyazhi ny-sly js-sjc js-hjm sxd-jz sxd-zym sh-ltry sz-lhw sz-bz sz-jx tp-cyb tp-rxs tp-rsp tp-kxs hub-sat qz-hzc sb-qhbf tb-xjhl tb-tbd lb-gf hb-sjfa dz-lgd nj-js zj-sncy dz-qsg dh-jsl sx-hmms dh-swk sxl-yjb sxl-ptxn nb-wgj nb-yrjd nb-hyz nb-htb dz-zlj dz-mnt qs-tcm qs-gyz ah-yqz sd-hts yn-dwy yn-nha zj-yzj zj-aywt qh-wdw nj-zlqx qh-gyq gs-rts sxd-hjm gs-yxt nx-ljt tb-yhc hun-dhd fj-jyz nm-jgs fj-kql sd-acy yz-mb qzx-zyj kf-tmj xa-scm xa-dqz qzx-yzb cs-dhj ah-czd yn-jcn dt-ytz jz-lfh bj-hg ly-byb hlj-tzl lb-zfsg fj-dhgy ah-wgj lb-yzl sd-lgdy gx-xlt gd-mlt yz-zbq nj-frs gz-yjg xz-stg qzx-lxsf jx-smsr jx-qth ly-hym nx-hxw gz-tcm jz-yzj sc-hxz sc-ssj kz-kzsj kf-dsb hk-lsf jl-wjg nx-jxb gd-qjy hk-hrz kz-sg kz-myc gd-dsk ly-sbx jx-glc dt-lbl hlj-gys cq-wyq dh-ft sc-xsel gz-myg hk-jgb yx-yz yx-sxd yx-jg mo-klk jz-hnjg kf-khc cq-nxz cq-hty jdz-cslh sy-ljy yz-tj xj-fxnv qz-mbs jl-ljm jdz-blz`.split(' ').map(id => ({ id }));

const trailRoutes: TrailRoute[] = [
  { id:'light', ids:['hb-cxd','gx-yfd','gg-jgyg'] },
  { id:'music', ids:['hub-zhy','gb-jgs','sxl-lt'] },
  { id:'ink', ids:['gg-pft','gg-qmsh','gg-qljs','jl-efj'] },
  { id:'kiln', ids:['gg-gzdc','dz-jp','nj-mb','hain-hgj'] },
  { id:'jade', ids:['gb-hsyl','hb-jly','dz-yzp'] },
  { id:'craft', ids:['gb-jlfw','sx-qh','hain-lj'] },
];

export const storyTeaserIndex = Object.fromEntries(storyTeasers.map(story => [story.id, story])) as Record<string, StoryTeaser | undefined>;
const trailRouteIndex = Object.fromEntries(trailRoutes.map(trail => [trail.id, trail])) as Record<string, TrailRoute | undefined>;
export const defaultTrailId = (storyId: string) => trailRoutes.find(trail => trail.ids.includes(storyId))?.id ?? null;

/** Story navigation never rewrites the underlying map/museum/collection filters. */
export function readGuideRoute(search: string): GuideRoute | null {
  const params = new URLSearchParams(search);
  const requestedStory = params.get('story');
  const storyId = requestedStory && storyTeaserIndex[requestedStory] ? requestedStory : null;
  const requestedTrail = params.get('trail');
  const trail = requestedTrail ? trailRouteIndex[requestedTrail] : undefined;
  if (storyId) return {
    storyId,
    trailId: trail?.ids.includes(storyId) ? trail.id : defaultTrailId(storyId),
  };
  if (params.get('guide') === '1' || trail) return { trailId: trail?.id ?? null, storyId: null };
  return null;
}

export function writeGuideRoute(params: URLSearchParams, route: GuideRoute | null) {
  for (const key of ['guide', 'trail', 'story']) params.delete(key);
  if (route) {
    params.set('guide', '1');
    if (route.trailId) params.set('trail', route.trailId);
    if (route.storyId) params.set('story', route.storyId);
  }
  return params;
}

export function guideUrl(route: GuideRoute | null) {
  const params = writeGuideRoute(new URLSearchParams(window.location.search), route);
  const query = params.toString();
  return `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
}
