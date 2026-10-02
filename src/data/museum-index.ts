import compactIndexJson from './museum-index.compact.json';
import type { ArtifactIndex, MuseumIndex } from './types';

// 浏览器只下载紧凑形式：[[馆 id, 馆名, 省, 市, 经度, 纬度, [[文物 id, 名, 朝代, 时代, 类别, 形制, 收藏机构?, 展出说明?], …]], …]
// 可读版 src/data/museum-index.json 仍照常落盘，供脚本与测试使用（两者由 scripts/generate-museum-data.mjs 一并生成）。
interface CompactIndex {
  v: number;
  museums: [string, string, string, string, number, number, (string | null)[][]][];
}

const compact = compactIndexJson as unknown as CompactIndex;

function decodeArtifact(row: (string | null)[]): ArtifactIndex {
  const artifact = {
    id: row[0] as string,
    name: row[1] as string,
    dynasty: row[2] as string,
    era: row[3] as string,
    category: row[4] as string,
    shape: row[5] as string,
  } as ArtifactIndex;
  if (row.length > 6) {
    if (row[6] != null) artifact.holdingInstitution = row[6];
    if (row[7] != null) artifact.exhibitionNote = row[7];
  }
  return artifact;
}

export const museumIndex: MuseumIndex[] = compact.museums.map(([id, name, province, city, longitude, latitude, artifacts]) => ({
  id,
  name,
  province,
  city,
  coord: [longitude, latitude],
  artifacts: artifacts.map(decodeArtifact),
}));

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
