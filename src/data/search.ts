import type { ArtifactIndex, MuseumIndex } from './types';

export interface MuseumSearchResult {
  kind: 'museum';
  museum: MuseumIndex;
  score: number;
}

export interface ArtifactSearchResult {
  kind: 'artifact';
  museum: MuseumIndex;
  artifact: ArtifactIndex;
  score: number;
}

export function normalizeSearch(value: string) {
  return value.toLocaleLowerCase().replace(/[\s《》〈〉·•（）()，,。.!！?？:：；;]/g, '');
}

function fieldScore(value: string, query: string, weight: number) {
  const normalized = normalizeSearch(value);
  if (!normalized.includes(query)) return 0;
  if (normalized === query) return weight + 100;
  if (normalized.startsWith(query)) return weight + 60;
  return weight + 20;
}

export function searchMuseumIndex(
  museums: MuseumIndex[],
  value: string,
  storyCorpus?: Record<string, string> | null,
  museumIntros: Record<string, string> = {},
) {
  const query = normalizeSearch(value.trim());
  if (!query) return null;
  const museumResults: MuseumSearchResult[] = museums
    .map(museum => ({
      kind: 'museum' as const,
      museum,
      score: Math.max(
        fieldScore(museum.name, query, 320),
        fieldScore(museum.province, query, 180),
        fieldScore(museum.city, query, 160),
        fieldScore(museumIntros[museum.id] ?? '', query, 20),
      ),
    }))
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score || a.museum.name.localeCompare(b.museum.name, 'zh-CN'));

  const artifactResults: ArtifactSearchResult[] = [];
  for (const museum of museums) for (const artifact of museum.artifacts) {
    const score = Math.max(
      fieldScore(artifact.name, query, 320),
      fieldScore(artifact.category, query, 210),
      fieldScore(artifact.era, query, 190),
      fieldScore(artifact.dynasty, query, 180),
      fieldScore(museum.name, query, 90),
      fieldScore(artifact.holdingInstitution ?? '', query, 120),
      fieldScore(artifact.exhibitionNote ?? '', query, 20),
      fieldScore(storyCorpus?.[artifact.id] ?? '', query, 20),
    );
    if (score > 0) artifactResults.push({ kind: 'artifact', museum, artifact, score });
  }
  artifactResults.sort((a, b) => b.score - a.score || a.artifact.name.localeCompare(b.artifact.name, 'zh-CN'));
  return {
    museums: museumResults.slice(0, 5),
    artifacts: artifactResults.slice(0, 8),
    museumTotal: museumResults.length,
    artifactTotal: artifactResults.length,
  };
}
