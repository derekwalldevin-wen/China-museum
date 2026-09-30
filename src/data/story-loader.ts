import catalog from './story-catalog.json';
import type { ArtifactStory, EvidenceSource, StoryTrail } from './stories';

export interface StoryPayload { story: ArtifactStory; sources: Record<string, EvidenceSource> }
const modules = import.meta.glob<{ default: StoryPayload }>('./story-payloads/*.json');
const pending = new Map<string, Promise<StoryPayload>>();
export const storyCatalog = catalog as { version:number; stories:{ id:string; hook:string }[]; trails:StoryTrail[] };
export const trailIndex = Object.fromEntries(storyCatalog.trails.map(trail => [trail.id, trail])) as Record<string, StoryTrail | undefined>;
export const defaultTrail = (storyId: string) => storyCatalog.trails.find(trail => trail.ids.includes(storyId));

export function loadStoryPayload(storyId: string): Promise<StoryPayload> {
  const path = `./story-payloads/${storyId}.json`;
  const loader = modules[path];
  if (!loader) return Promise.reject(new Error(`Missing story payload: ${storyId}`));
  const cached = pending.get(storyId);
  if (cached) return cached;
  const promise = loader().then(module => {
    const payload = module.default;
    if (payload.story.id !== storyId) throw new Error(`Story payload mismatch: ${storyId}`);
    return payload;
  }).catch(error => {
    pending.delete(storyId);
    throw error;
  });
  pending.set(storyId, promise);
  return promise;
}
