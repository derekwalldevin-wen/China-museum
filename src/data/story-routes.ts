export interface GuideRoute { trailId: string | null; storyId: string | null }

interface TrailRoute { id: string; ids: string[] }

const trailRoutes: TrailRoute[] = [
  { id:'light', ids:['hb-cxd','gx-yfd','gg-jgyg'] },
  { id:'music', ids:['hub-zhy','gb-jgs','sxl-lt'] },
  { id:'ink', ids:['gg-pft','gg-qmsh','gg-qljs','jl-efj'] },
  { id:'kiln', ids:['gg-gzdc','dz-jp','nj-mb','hain-hgj'] },
  { id:'jade', ids:['gb-hsyl','hb-jly','dz-yzp'] },
  { id:'craft', ids:['gb-jlfw','sx-qh','hain-lj'] },
];

const trailRouteIndex = Object.fromEntries(trailRoutes.map(trail => [trail.id, trail])) as Record<string, TrailRoute | undefined>;
export const defaultTrailId = (storyId: string) => trailRoutes.find(trail => trail.ids.includes(storyId))?.id ?? null;

/** Story navigation never rewrites the underlying map/museum/collection filters. */
export function readGuideRoute(search: string): GuideRoute | null {
  const params = new URLSearchParams(search);
  const requestedStory = params.get('story');
  // Shape-validate only: the deferred story catalog decides whether an id exists. Keeping the
  // id list out of this module is what keeps new stories deep-linkable without growing the
  // first-screen bundle (an id-shaped miss renders the reader's "无法载入" state instead).
  const storyId = requestedStory && /^[a-z0-9-]{2,64}$/.test(requestedStory) ? requestedStory : null;
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
