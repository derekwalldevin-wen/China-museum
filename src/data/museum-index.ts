import museumIndexJson from './museum-index.json';
import type { MuseumIndex } from './types';

export const museumIndex = museumIndexJson as MuseumIndex[];
export const museumIndexById = new Map(museumIndex.map(museum => [museum.id, museum]));
export const artifactMuseumIndex = new Map(
  museumIndex.flatMap(museum => museum.artifacts.map(artifact => [artifact.id, museum] as const)),
);
export const artifactTotal = museumIndex.reduce((total, museum) => total + museum.artifacts.length, 0);

export function getMuseumIndex(id: string | null) {
  return id ? museumIndexById.get(id) ?? null : null;
}

export function getArtifactMuseumIndex(id: string | null) {
  return id ? artifactMuseumIndex.get(id) ?? null : null;
}
