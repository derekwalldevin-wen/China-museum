import data from './stories.json';
import batch2 from './stories-batch2.json';
import batch3 from './stories-batch3.json';
import batch4 from './stories-batch4.json';
import batch5 from './stories-batch5.json';
import batch6 from './stories-batch6.json';
import batch7 from './stories-batch7.json';
import batch8 from './stories-batch8.json';
import batch9 from './stories-batch9.json';
import batch10 from './stories-batch10.json';
import batch11 from './stories-batch11.json';
import batch12 from './stories-batch12.json';
import batch13 from './stories-batch13.json';
import batch14 from './stories-batch14.json';
import batch15 from './stories-batch15.json';
import batch16 from './stories-batch16.json';
import batch17 from './stories-batch17.json';
import batch18 from './stories-batch18.json';
import batch19 from './stories-batch19.json';
import batch20 from './stories-batch20.json';
import batch21 from './stories-batch21.json';
import batch22 from './stories-batch22.json';
import batch23 from './stories-batch23.json';
import batch24 from './stories-batch24.json';
import batch25 from './stories-batch25.json';
import batch26 from './stories-batch26.json';
import batch27 from './stories-batch27.json';
import batch28 from './stories-batch28.json';
import batch29 from './stories-batch29.json';
import batch31 from './stories-batch31.json';
import batch32 from './stories-batch32.json';
import batch34 from './stories-batch34.json';
import batch35 from './stories-batch35.json';
import batch36 from './stories-batch36.json';
import batch37 from './stories-batch37.json';
import batch38 from './stories-batch38.json';
import batch39 from './stories-batch39.json';
import batch40 from './stories-batch40.json';
import batch42 from './stories-batch42.json';
import batch43 from './stories-batch43.json';
import batch44 from './stories-batch44.json';
import batch45 from './stories-batch45.json';
import batch46 from './stories-batch46.json';
import batch47 from './stories-batch47.json';
import batch48 from './stories-batch48.json';
import batch49 from './stories-batch49.json';
import batch50 from './stories-batch50.json';
import batch51 from './stories-batch51.json';
import batch52 from './stories-batch52.json';
import batch53 from './stories-batch53.json';
import batch54 from './stories-batch54.json';
import batch55 from './stories-batch55.json';
import batch56 from './stories-batch56.json';
import batch57 from './stories-batch57.json';
import batch58 from './stories-batch58.json';
import batch59 from './stories-batch59.json';
import batch60 from './stories-batch60.json';
import batch61 from './stories-batch61.json';
import batch62 from './stories-batch62.json';
import batch63 from './stories-batch63.json';
import batch64 from './stories-batch64.json';
import batch65 from './stories-batch65.json';
import batch66 from './stories-batch66.json';
import batch67 from './stories-batch67.json';
import batch68 from './stories-batch68.json';

export interface EvidenceSource {
  id: string; title: string; institution: string; url: string; checkedAt: string;
  retrieval: string; kind: string; supports: string;
}
export interface StoryBlock { title: string; text: string; refs: string[] }
export interface ArtifactStory {
  id: string; hook: string; summary: string; summaryRefs: string[];
  sections: StoryBlock[]; details: StoryBlock[];
  reflection: { question: string; answer: string; refs: string[] };
  uncertainty: string; correction: string;
  related: { id: string; reason: string; type: string }[];
}
export interface StoryTrail {
  id: string; title: string; seal: string; question: string; intro: string;
  minutes: number; ids: string[]; takeaway: string;
}
const storyDrafts: ArtifactStory[] = [...data.stories, ...batch2.stories, ...batch3.stories, ...batch4.stories, ...batch5.stories, ...batch6.stories, ...batch7.stories, ...batch8.stories, ...batch9.stories, ...batch10.stories, ...batch11.stories, ...batch12.stories, ...batch13.stories, ...batch14.stories, ...batch15.stories, ...batch16.stories, ...batch17.stories, ...batch18.stories, ...batch19.stories, ...batch20.stories, ...batch21.stories, ...batch22.stories, ...batch23.stories, ...batch24.stories, ...batch25.stories, ...batch26.stories, ...batch27.stories, ...batch28.stories, ...batch29.stories, ...batch31.stories, ...batch32.stories, ...batch34.stories, ...batch35.stories, ...batch36.stories, ...batch37.stories, ...batch38.stories, ...batch39.stories, ...batch40.stories, ...batch42.stories, ...batch43.stories, ...batch44.stories, ...batch45.stories, ...batch46.stories, ...batch47.stories, ...batch48.stories, ...batch49.stories, ...batch50.stories, ...batch51.stories, ...batch52.stories, ...batch53.stories, ...batch54.stories, ...batch55.stories, ...batch56.stories, ...batch57.stories, ...batch58.stories, ...batch59.stories, ...batch60.stories, ...batch61.stories, ...batch62.stories, ...batch63.stories, ...batch64.stories, ...batch65.stories, ...batch66.stories, ...batch67.stories, ...batch68.stories];
// Later evidence revisions replace the earlier text without duplicating an artifact in the guide.
export const stories: ArtifactStory[] = [...new Map(storyDrafts.map(story => [story.id, story])).values()];
export const trails: StoryTrail[] = [...data.trails, ...batch2.trails, ...batch3.trails, ...batch4.trails, ...batch5.trails, ...batch6.trails, ...batch7.trails, ...batch8.trails, ...batch9.trails, ...batch10.trails, ...batch11.trails, ...batch12.trails, ...batch13.trails, ...batch14.trails, ...batch15.trails, ...batch16.trails, ...batch17.trails, ...batch18.trails, ...batch19.trails, ...batch20.trails, ...batch21.trails, ...batch22.trails, ...batch23.trails, ...batch24.trails, ...batch25.trails, ...batch26.trails, ...batch27.trails, ...batch28.trails, ...batch29.trails, ...batch31.trails, ...batch32.trails, ...batch34.trails, ...batch35.trails, ...batch36.trails, ...batch37.trails, ...batch38.trails, ...batch39.trails, ...batch40.trails];
export const storySources: EvidenceSource[] = [...data.sources, ...batch2.sources, ...batch3.sources, ...batch4.sources, ...batch5.sources, ...batch6.sources, ...batch7.sources, ...batch8.sources, ...batch9.sources, ...batch10.sources, ...batch11.sources, ...batch12.sources, ...batch13.sources, ...batch14.sources, ...batch15.sources, ...batch16.sources, ...batch17.sources, ...batch18.sources, ...batch19.sources, ...batch20.sources, ...batch21.sources, ...batch22.sources, ...batch23.sources, ...batch24.sources, ...batch25.sources, ...batch26.sources, ...batch27.sources, ...batch28.sources, ...batch29.sources, ...batch31.sources, ...batch32.sources, ...batch34.sources, ...batch35.sources, ...batch36.sources, ...batch37.sources, ...batch38.sources, ...batch39.sources, ...batch40.sources, ...batch42.sources, ...batch43.sources, ...batch44.sources, ...batch45.sources, ...batch46.sources, ...batch47.sources, ...batch48.sources, ...batch49.sources, ...batch50.sources, ...batch51.sources, ...batch52.sources, ...batch53.sources, ...batch54.sources, ...batch55.sources, ...batch56.sources, ...batch57.sources, ...batch58.sources, ...batch59.sources, ...batch60.sources, ...batch61.sources, ...batch62.sources, ...batch63.sources, ...batch64.sources, ...batch65.sources, ...batch66.sources, ...batch67.sources, ...batch68.sources];
export const storyIndex = Object.fromEntries(stories.map(s => [s.id, s])) as Record<string, ArtifactStory | undefined>;
export const trailIndex = Object.fromEntries(trails.map(t => [t.id, t])) as Record<string, StoryTrail | undefined>;
export const sourceIndex = Object.fromEntries(storySources.map(s => [s.id, s])) as Record<string, EvidenceSource | undefined>;
export const defaultTrail = (storyId: string) => trails.find(t => t.ids.includes(storyId));
