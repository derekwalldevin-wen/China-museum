import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { ArtifactFigure } from './ArtifactCard';
import { museumIndex as museums } from '../data/museum-index';
import { defaultTrail, loadStoryPayload, storyCatalog, trailIndex } from '../data/story-loader';
import type { StoryPayload } from '../data/story-loader';
import { guideUrl } from '../data/story-routes';
import { artifactAttribution } from '../data/artifact-attribution';
import type { GuideRoute } from '../data/story-routes';
import type { ArtifactIndex, MuseumIndex } from '../data/types';
import './story-experience.css';

const locations = Object.fromEntries(museums.flatMap(museum => museum.artifacts.map(artifact => [artifact.id, { museum, artifact }])));
const trails = storyCatalog.trails;
const standaloneStories = storyCatalog.stories.filter(story => !defaultTrail(story.id));
const catalogLocation = (museum: MuseumIndex, artifact: ArtifactIndex) =>
  `${museum.province} · ${artifact.holdingInstitution ?? museum.name}`;
const sourceTypeLabels: Record<string, string> = {
  'primary-source': '原典·史料', 'excavation-report': '考古报告/书目',
  'museum-research': '研究解释', 'museum-research-news': '研究计划',
  'contemporary-interpretation': '当代再创作', 'museum': '馆藏说明',
  'museum-feature': '博物馆专题', 'government-museum': '馆方专题', 'government-list': '官方名录',
  'museum-association': '展览资料', 'reported-interview': '采访报道',
  'museum-conservation': '文物保护', 'government-archaeology': '考古机构',
  'formal-research': '正式研究', 'formal-research-feature': '研究专题',
  'formal-research-reprint': '研究文章转载', 'museum-conservation-research': '文保研究',
  'museum-conservation-history': '文物保护史', 'archaeologist-recollection': '考古亲历回忆',
  'museum-exhibition': '展览目录', 'reported-museum-interview': '馆方采访报道',
  'museum-retrospective': '馆刊回忆', 'museum-reported-interview': '馆员访谈'
};
const retrievalLabels: Record<string, string> = {
  'full-text': '已核读全文', 'search-text': '仅核读可检索片段',
  'abstract-and-note': '仅核读摘要与注释'
};
interface ReadingState { top: number; expanded: string[]; anchor?: { relatedId: string; y: number } }
function readPosition(key: string): ReadingState {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) ?? 'null');
    return { top: Number.isFinite(value?.top) ? Math.max(0, value.top) : 0,
      expanded: Array.isArray(value?.expanded) ? value.expanded.filter((s: unknown) => typeof s === 'string') : [],
      anchor: typeof value?.anchor?.relatedId === 'string' && Number.isFinite(value?.anchor?.y)
        ? { relatedId: value.anchor.relatedId, y: value.anchor.y } : undefined };
  } catch { return { top: 0, expanded: [] }; }
}
function EvidenceLinks({ refs, sourceIndex }: { refs: string[]; sourceIndex: StoryPayload['sources'] }) {
  return <span className="story-evidence-links">{refs.map(id => {
    const source = sourceIndex[id];
    return source ? <a key={id} href={source.url} target="_blank" rel="noreferrer" aria-label={`${sourceTypeLabels[source.kind] ?? '延伸资料'}：${source.title}`}><span>{sourceTypeLabels[source.kind] ?? '延伸资料'}</span> · {source.institution.split('（')[0]} ↗</a> : null;
  })}</span>;
}

interface Props { route: GuideRoute; onRoute: (route: GuideRoute) => void; onExit: () => void; onBack: () => void }
export default function StoryExperience({ route, onRoute, onExit, onBack }: Props) {
  const [payloadState, setPayloadState] = useState<{ id:string; payload?:StoryPayload; error?:string } | null>(null);
  useEffect(() => {
    if (!route.storyId) return;
    const storyId = route.storyId;
    let active = true;
    void loadStoryPayload(storyId).then(payload => {
      if (active) setPayloadState({ id:storyId, payload });
    }).catch(error => {
      if (active) setPayloadState({ id:storyId, error:String(error) });
    });
    return () => { active = false; };
  }, [route.storyId]);
  const currentPayload = route.storyId && payloadState?.id === route.storyId ? payloadState : null;
  const story = currentPayload?.payload?.story;
  const sourceIndex = currentPayload?.payload?.sources ?? {};
  const trail = route.trailId ? trailIndex[route.trailId] : undefined;
  const location = story ? locations[story.id] : undefined;
  const locationAttribution = location ? artifactAttribution(location.artifact, location.museum) : null;
  const storageKey = `atlas-story-v1:${route.storyId ?? `directory:${trail?.id ?? 'all'}`}`;
  const [initial] = useState(() => readPosition(storageKey));
  const [expanded, setExpanded] = useState(initial.expanded);
  const viewport = useRef<HTMLDivElement>(null);
  const exitButton = useRef<HTMLButtonElement>(null);
  const restoring = useRef(true);
  const pendingRestore = useRef<ReadingState | null>(initial);
  const restoreFrame = useRef<number | null>(null);
  const latest = useRef<ReadingState>(initial);
  useLayoutEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => { window.history.scrollRestoration = previous; };
  }, []);
  const save = (anchorElement?: HTMLElement) => {
    if (restoring.current) return;
    const relatedId = anchorElement?.getAttribute('data-related');
    const anchor = relatedId && viewport.current
      ? { relatedId, y: anchorElement!.getBoundingClientRect().top - viewport.current.getBoundingClientRect().top }
      : latest.current.anchor;
    latest.current = { top: viewport.current?.scrollTop ?? 0, expanded, anchor };
    try { sessionStorage.setItem(storageKey, JSON.stringify(latest.current)); } catch { /* private mode still supports reading */ }
  };
  useLayoutEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    exitButton.current?.focus({ preventScroll: true });
    // App keys this component by story and trail, so each route mounts with
    // its own storage key and initial expanded/reading state.
    return () => {
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, []);
  useLayoutEffect(() => {
    const pending = pendingRestore.current;
    if (route.storyId && !story) return;
    if (!pending || pending.expanded.length !== expanded.length || pending.expanded.some((key, index) => key !== expanded[index])) return;
    if (viewport.current) viewport.current.scrollTop = pending.top;
    if (pending.top === 0) {
      pendingRestore.current = null;
      restoring.current = false;
      return;
    }
    // A fresh reload can render the story before its figure/font-dependent
    // content reaches the saved height. Setting scrollTop too early is then
    // clamped to the temporary maximum. Observe the one content root until the
    // saved position becomes reachable; cancel immediately on real user input.
    let cancelled = false;
    let observer: ResizeObserver | null = null;
    let fallbackTimer: number | null = null;
    const view = viewport.current;
    const cleanup = () => {
      observer?.disconnect();
      observer = null;
      if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
      fallbackTimer = null;
      view?.removeEventListener('pointerdown', cancelForInput, true);
      view?.removeEventListener('touchstart', cancelForInput, true);
      view?.removeEventListener('wheel', cancelForInput, true);
    };
    const finish = (allowClamped = false) => {
      if (cancelled || pendingRestore.current !== pending || !view) return;
      const related = pending.anchor && [...view.querySelectorAll<HTMLElement>('[data-related]')]
        .find(element => element.dataset.related === pending.anchor?.relatedId);
      if (related && pending.anchor) {
        view.scrollTop += related.getBoundingClientRect().top - view.getBoundingClientRect().top - pending.anchor.y;
      } else view.scrollTop = pending.top;
      const reachable = view.scrollHeight - view.clientHeight >= pending.top - 1;
      // A link anchor remains stable even if an asynchronously decoded image
      // changes the mobile document height after the initial scroll position
      // becomes reachable. Full provenance can add several hundred pixels on
      // a narrow screen after the story itself has rendered; keep observing
      // beyond the first paint, but never indefinitely on a failed request.
      if ((!reachable || related) && !allowClamped) return;
      pendingRestore.current = null;
      restoring.current = false;
      restoreFrame.current = null;
      cleanup();
    };
    function cancelForInput() {
      if (cancelled || pendingRestore.current !== pending) return;
      cancelled = true;
      pendingRestore.current = null;
      restoring.current = false;
      latest.current = { top: view?.scrollTop ?? 0, expanded };
      cleanup();
    }
    view?.addEventListener('pointerdown', cancelForInput, true);
    view?.addEventListener('touchstart', cancelForInput, true);
    view?.addEventListener('wheel', cancelForInput, true);
    if (restoreFrame.current !== null) cancelAnimationFrame(restoreFrame.current);
    restoreFrame.current = requestAnimationFrame(() => {
      if (cancelled || pendingRestore.current !== pending) return;
      finish();
      if (pendingRestore.current !== pending || !view?.firstElementChild) return;
      observer = new ResizeObserver(() => finish());
      observer.observe(view.firstElementChild);
      fallbackTimer = window.setTimeout(() => finish(true), 4000);
    });
    return () => {
      cancelled = true;
      if (restoreFrame.current !== null) cancelAnimationFrame(restoreFrame.current);
      restoreFrame.current = null;
      cleanup();
    };
  }, [storageKey, expanded, route.storyId, story]);
  useEffect(() => {
    const persist = () => {
      try { sessionStorage.setItem(storageKey, JSON.stringify(latest.current)); } catch { /* storage unavailable */ }
    };
    window.addEventListener('pagehide', persist);
    // Route changes already call save() (and scrolling/toggles persist eagerly).
    // Persisting again from the previous key's passive-effect cleanup is unsafe:
    // the destination layout effect may already have replaced latest.current,
    // which would write the next story's position into the story being left.
    return () => { window.removeEventListener('pagehide', persist); };
  }, [storageKey]);
  const toggle = (key: string) => {
    const next = expanded.includes(key) ? expanded.filter(item => item !== key) : [...expanded, key];
    setExpanded(next);
    latest.current = { top: viewport.current?.scrollTop ?? 0, expanded: next };
    try { sessionStorage.setItem(storageKey, JSON.stringify(latest.current)); } catch { /* storage unavailable */ }
  };
  const follow = (event: MouseEvent<HTMLAnchorElement>, next: GuideRoute) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); save(event.currentTarget); onRoute(next);
  };
  const linkTo = (storyId: string) => ({ storyId, trailId: defaultTrail(storyId)?.id ?? null });
  // 左右滑动切换游线前后站。只在明显的水平滑动时触发，且避开可横向滚动的区域
  const swipeStart = useRef<{ x: number; y: number; id: number } | null>(null);
  const stepTo = (nextStep: number) => {
    if (!trail || nextStep < 0 || nextStep >= trail.ids.length || nextStep === currentStep) return;
    save();
    onRoute({ trailId: trail.id, storyId: trail.ids[nextStep] });
  };
  const currentStep = story && trail ? trail.ids.indexOf(story.id) : -1;
  const usedSources = story ? [...new Set([...story.summaryRefs, ...story.sections.flatMap(p => p.refs), ...story.details.flatMap(d => d.refs), ...story.reflection.refs])] : [];

  return <section role="dialog" aria-modal="true" aria-labelledby="story-title" className="story-experience" onKeyDown={event => {
    if (event.key === 'Escape') { event.stopPropagation(); save(); onExit(); }
    if (event.key !== 'Tab') return;
    const elements = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex="0"]')].filter(el => el.getClientRects().length > 0);
    const first = elements[0], last = elements.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }}>
    <header className="story-topbar">
      <button onClick={() => { save(); onBack(); }} aria-label="故事返回上一步">← 返回</button>
      <span className="story-topbar-title">华夏博物志 <span> / 故事导览</span></span>
      <button ref={exitButton} onClick={() => { save(); onExit(); }} aria-label="退出故事导览">回到原处 ✕</button>
    </header>
    <div ref={viewport} data-testid="story-viewport" className="story-viewport" onScroll={() => save()} onWheel={() => { latest.current.anchor = undefined; }}
      onTouchStart={event => {
        latest.current.anchor = undefined;
        const touch = event.touches[0];
        swipeStart.current = touch ? { x: touch.clientX, y: touch.clientY, id: touch.identifier } : null;
      }}
      onTouchEnd={event => {
        const start = swipeStart.current;
        swipeStart.current = null;
        if (!start || !trail) return;
        const touch = event.changedTouches[0];
        if (!touch || touch.identifier !== start.id) return;
        const dx = touch.clientX - start.x;
        const dy = touch.clientY - start.y;
        // 只在明显水平滑动（且起点不在横向滚动区内）时切换，避免抢走纵向阅读与横向看图
        if (Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy) * 2) return;
        if (event.target instanceof Element && event.target.closest('[data-artifact-scroll-root], .artifact-scroll-reader, .artifact-zoom')) return;
        stepTo(dx < 0 ? currentStep + 1 : currentStep - 1);
      }}>
      {/* 跳过导航：键盘用户第一个可聚焦元素，直达正文 */}
      <a className="story-skip" href="#story-main">跳到正文 ↓</a>
      {/* 阅读进度：纯 CSS 滚动驱动（animation-timeline: scroll(nearest)），不支持时静态隐藏 */}
      <div className="story-progress" aria-hidden="true"><i /></div>
      {/* 路由变化的状态播报（读屏） */}
      <p className="sr-only" aria-live="polite">{story ? `${location?.artifact.name ?? ''} · ${story.hook}` : route.storyId ? '正在展开故事' : '故事目录'}</p>
      {route.storyId && (!story || !location) ? <main id="story-main" className="story-directory" role={currentPayload?.error ? 'alert' : 'status'}>
        <div className="story-kicker">{currentPayload?.error ? '故事暂时无法展开' : '正在展开故事'}</div>
        <h1 id="story-title">{currentPayload?.error ? '这一页暂时未能载入。' : '请稍候，正在展卷。'}</h1>
        <p className="story-lead">{currentPayload?.error ? '筛选与阅读位置仍已保存。可以重试，或返回故事目录继续探索。' : '正文和逐段引用资料正在按需读取。'}</p>
        {currentPayload?.error && <button className="story-primary" onClick={() => window.location.reload()}>重试加载故事 →</button>}
      </main> : !story || !location ? <main id="story-main" className="story-directory">
        <div className="story-kicker">以物为引 · 沿故事入卷</div>
        <h1 id="story-title">从一个问题，<br />走进千年生活。</h1>
        <p className="story-lead">不必一次读完所有文物。选一条游线，看看古人怎样生活、表达，又留下了哪些证据。</p>
        <div className="story-trail-grid">
          {(trail ? [trail] : trails).map((item, index) => <article key={item.id} className="story-trail-card" data-trail={item.id}>
            <div className="story-trail-number">第 {['一', '二', '三', '四', '五', '六'][trails.indexOf(item)] ?? index + 1} 卷 <span>{item.ids.length} 件 · 约 {item.minutes} 分钟</span></div>
            <div className="story-seal" aria-hidden="true">{item.seal}</div>
            <h2>{item.title}</h2><p className="story-question">{item.question}</p><p>{item.intro}</p>
            <ol>{item.ids.map((id, step) => <li key={id}><a href={guideUrl({ trailId:item.id, storyId:id })} onClick={event => follow(event, { trailId:item.id, storyId:id })}><span>{String(step + 1).padStart(2, '0')}</span>{locations[id].artifact.name}<small>{catalogLocation(locations[id].museum, locations[id].artifact)}</small></a></li>)}</ol>
            <a className="story-primary" data-start-trail={item.id} href={guideUrl({ trailId:item.id, storyId:item.ids[0] })} onClick={event => follow(event, { trailId:item.id, storyId:item.ids[0] })}>展开这一卷 →</a>
            <p className="story-learning">读完带走：{item.takeaway}</p>
          </article>)}
        </div>
        {!trail && standaloneStories.length > 0 && <section className="story-standalone" aria-labelledby="story-standalone-title">
          <span className="story-kicker">继续发现 · 单件故事</span>
          <h2 id="story-standalone-title">从一件文物继续问</h2>
          <p>这些故事暂不排入固定游线，可从地点、材料或一个问题出发；每篇都能沿有理由的关联跳转继续阅读。</p>
          <ul>{standaloneStories.map(item => <li key={item.id}><a data-standalone-story={item.id} href={guideUrl({ trailId:null, storyId:item.id })} onClick={event => follow(event, { trailId:null, storyId:item.id })}><strong>{locations[item.id].artifact.name}</strong><span>{catalogLocation(locations[item.id].museum, locations[item.id].artifact)}</span><small>{item.hook} →</small></a></li>)}</ul>
        </section>}
        <p className="story-editor-note">游线是策展比较，不代表文物之间存在直接传承。文字与图片分别核验；图像缺失时仍可读故事。</p>
        {trail && <a href={guideUrl({ trailId:null, storyId:null })} onClick={event => follow(event, { trailId:null, storyId:null })}>查看全部六条游线 →</a>}
      </main> : <main id="story-main" className="story-reader" data-story-id={story.id}>
        <nav className="story-breadcrumb" aria-label="故事位置"><a href={guideUrl({ trailId:null, storyId:null })} onClick={event => follow(event, { trailId:null, storyId:null })}>全部故事</a><span>{trail ? ` / ${trail.title} · 第 ${currentStep + 1} / ${trail.ids.length} 站` : ' / 单件故事'}</span></nav>
        <div className="story-kicker">{location.artifact.dynasty} · {location.artifact.category}</div>
        <h1 id="story-title">{story.hook}</h1>
        <p className="story-object-name">{location.artifact.name}</p>
        <p className="story-location">{location.artifact.holdingInstitution ? `${location.museum.province} · ${locationAttribution?.holdingLabel}` : `${location.museum.province} · ${location.museum.city} · ${location.museum.name}`}<span>{locationAttribution?.exhibitionNote ?? "馆藏地不等于当前展出承诺"}</span></p>
        <div className="story-reading-grid">
          <aside className="story-figure">
            <ArtifactFigure museumId={location.museum.id} preserveFrame artifact={location.artifact} className={location.artifact.shape === 'scroll' ? 'w-full' : 'aspect-[4/3] w-full'} />
            <p className="story-image-caution">插图为AI辅助示意，不能替代实物；文字细节来自下方资料。</p>
          </aside>
          <article className="story-paper">
            <section className="story-summary"><span className="story-section-label">三十秒认识</span><p>{story.summary}</p><EvidenceLinks refs={story.summaryRefs} sourceIndex={sourceIndex} /></section>
            {/* 本文结构：四个章节的锚点目录，键盘可直接跳转 */}
            <nav className="story-index" aria-label="本文结构"><span className="story-section-label">本文结构</span>{story.sections.map((section, index) => <a key={section.title} href={`#story-section-${index + 1}`}><span>{String(index + 1).padStart(2, '0')}</span>{section.title}</a>)}</nav>
            <div className="story-chapters">{story.sections.map((section, index) => <section key={section.title} id={`story-section-${index + 1}`}><span className="story-section-label">{String(index + 1).padStart(2, '0')} / {index >= 3 ? '延伸线索' : '故事'}</span><h2>{section.title}</h2><p>{section.text}</p><EvidenceLinks refs={section.refs} sourceIndex={sourceIndex} /></section>)}</div>
            <section className="story-details"><h2>三处细节</h2><p className="story-small">以下依据馆藏与考古资料。</p><ol>{story.details.map(detail => <li key={detail.title}><h3>{detail.title}</h3><p>{detail.text}</p><EvidenceLinks refs={detail.refs} sourceIndex={sourceIndex} /></li>)}</ol></section>
            <section className="story-reflection"><span className="story-section-label">停一停 · 聊两句</span><h2>{story.reflection.question}</h2><p className="story-small">先自己想一想，再点开看看。</p><button aria-expanded={expanded.includes('reflection')} aria-controls="story-reflection-answer" onClick={() => toggle('reflection')}>{expanded.includes('reflection') ? '收起 −' : '一种解释 +'}</button>{expanded.includes('reflection') && <div id="story-reflection-answer"><p>{story.reflection.answer}</p><EvidenceLinks refs={story.reflection.refs} sourceIndex={sourceIndex} /></div>}</section>
            <section className="story-boundary"><h2>考订</h2><p>{story.uncertainty}</p><p className="story-small">编辑整理，非馆方审定。</p></section>
            <section className="story-sources"><button aria-expanded={expanded.includes('sources')} aria-controls="story-source-list" onClick={() => toggle('sources')}>延伸阅读与修订记录 · {usedSources.length} 项 {expanded.includes('sources') ? '−' : '+'}</button>{expanded.includes('sources') && <div id="story-source-list"><p>{story.correction}</p><p className="story-small">来源类型说明：原典呈现古籍文本；考古报告记录发掘材料（若链接仅为书目，会明确标注）；研究解释是学者论证；馆藏说明与博物馆专题是当代机构资料；当代再创作不作为古代事实证据。</p><ol>{usedSources.map(id => { const source = sourceIndex[id]!; return <li key={id}><span className="story-source-kind">{sourceTypeLabels[source.kind] ?? '延伸资料'}</span><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a><p>{source.institution} · 核读 {source.checkedAt} · {retrievalLabels[source.retrieval] ?? '核读范围待核'}</p><p>支持：{source.supports}</p></li>; })}</ol><p className="story-small">编辑整理，非馆方审定。文字引用不代表获得图片许可。</p></div>}</section>
          </article>
        </div>
        <section className="story-connections"><span className="story-kicker">一个故事，打开另一扇门</span><h2>沿着线索继续</h2><p className="story-small">对比看看，彼此未必有直接联系。跳转后地图筛选保留。</p><div>{story.related.map(relation => { const target = locations[relation.id]; return <a key={relation.id} data-related={relation.id} href={guideUrl(linkTo(relation.id))} onClick={event => follow(event, linkTo(relation.id))}><strong>{target.artifact.name} →</strong><span>{catalogLocation(target.museum, target.artifact)} · {target.artifact.dynasty}</span><p>{relation.reason}</p></a>; })}</div></section>
        {trail && <nav className="story-stations" aria-label="主题游线前后站">
          {currentStep > 0 && <a data-story-prev href={guideUrl({ trailId:trail.id, storyId:trail.ids[currentStep - 1] })} onClick={event => follow(event, { trailId:trail.id, storyId:trail.ids[currentStep - 1] })}>← 本卷上一站<span>{locations[trail.ids[currentStep - 1]].artifact.name}</span></a>}
          {currentStep < trail.ids.length - 1 ? <a data-story-next className="story-primary" href={guideUrl({ trailId:trail.id, storyId:trail.ids[currentStep + 1] })} onClick={event => follow(event, { trailId:trail.id, storyId:trail.ids[currentStep + 1] })}>本卷下一站 →<span>{locations[trail.ids[currentStep + 1]].artifact.name}</span></a> : <div className="story-finish"><h2>这一卷，走到了这里。</h2><p>{trail.takeaway}</p><p>试着向同行的人讲清一件文物和一个联系，就带走了自己的收获。</p><a href={guideUrl({ trailId:null, storyId:null })} onClick={event => follow(event, { trailId:null, storyId:null })}>挑选下一卷 →</a></div>}
        </nav>}
      </main>}
    </div>
  </section>;
}
