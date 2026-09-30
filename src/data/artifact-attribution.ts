import type { Artifact, ArtifactIndex, Museum, MuseumIndex } from './types';

type NamedMuseum = Pick<Museum | MuseumIndex, 'name'>;
type LocatedArtifact = Artifact | ArtifactIndex;

/** An exhibition/discovery entry does not necessarily own the object. */
export function artifactAttribution(artifact: LocatedArtifact, museum: NamedMuseum) {
  return {
    holdingInstitution: artifact.holdingInstitution ?? museum.name,
    holdingLabel: artifact.holdingInstitution
      ? `馆藏：${artifact.holdingInstitution}`
      : `藏于 ${museum.name}`,
    exhibitionNote: artifact.exhibitionNote ?? null,
  };
}
