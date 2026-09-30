import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';

const sourceUrl = new URL('../src/data/china-provinces.json', import.meta.url);
const tiers = [
  { name:'standard', tolerance:0.55, maxAreaError:0.018 },
  { name:'compact', tolerance:1.05, maxAreaError:0.04 },
];
const sourceText = await readFile(sourceUrl, 'utf8');
const source = JSON.parse(sourceText);

const project = ([lng, lat]) => [((lng - 72) / 64) * 894, ((55 - lat) / 39) * 526];
const equal = (a, b) => a[0] === b[0] && a[1] === b[1];
const distanceToSegmentSquared = (point, start, end) => {
  const dx = end[0] - start[0], dy = end[1] - start[1];
  if (dx === 0 && dy === 0) return (point[0] - start[0]) ** 2 + (point[1] - start[1]) ** 2;
  const t = Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy)));
  return (point[0] - (start[0] + t * dx)) ** 2 + (point[1] - (start[1] + t * dy)) ** 2;
};

function rdp(points, tolerance) {
  if (points.length <= 2) return points;
  const projected = points.map(project);
  let best = -1, index = -1;
  for (let i = 1; i < points.length - 1; i += 1) {
    const distance = distanceToSegmentSquared(projected[i], projected[0], projected.at(-1));
    if (distance > best) { best = distance; index = i; }
  }
  if (best <= tolerance * tolerance) return [points[0], points.at(-1)];
  const left = rdp(points.slice(0, index + 1), tolerance);
  const right = rdp(points.slice(index), tolerance);
  return [...left.slice(0, -1), ...right];
}

function ringArea(ring) {
  let total = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    const [x1, y1] = project(ring[i]), [x2, y2] = project(ring[i + 1]);
    total += x1 * y2 - x2 * y1;
  }
  return Math.abs(total / 2);
}

function cleanRing(ring) {
  const closed = ring.length > 1 && equal(ring[0], ring.at(-1));
  const body = (closed ? ring.slice(0, -1) : ring).filter((point, index, values) => index === 0 || !equal(point, values[index - 1]));
  while (body.length > 1 && equal(body[0], body.at(-1))) body.pop();
  return body;
}

function simplifyClosedRing(ring, tolerance, maxAreaError) {
  const points = cleanRing(ring);
  if (points.length < 3) return ring;
  if (points.length <= 6) return [...points, points[0]];
  const projected = points.map(project);
  const extrema = new Set([0]);
  for (const coordinate of [0, 1]) {
    let min = 0, max = 0;
    for (let i = 1; i < projected.length; i += 1) {
      if (projected[i][coordinate] < projected[min][coordinate]) min = i;
      if (projected[i][coordinate] > projected[max][coordinate]) max = i;
    }
    extrema.add(min); extrema.add(max);
  }
  const anchors = [...extrema].sort((a, b) => a - b);
  const attempt = (activeTolerance) => {
    const result = [];
    for (let i = 0; i < anchors.length; i += 1) {
      const start = anchors[i], end = anchors[(i + 1) % anchors.length];
      const segment = start < end
        ? points.slice(start, end + 1)
        : [...points.slice(start), ...points.slice(0, end + 1)];
      result.push(...rdp(segment, activeTolerance).slice(0, -1));
    }
    const rounded = result.map(([lng, lat]) => [Number(lng.toFixed(4)), Number(lat.toFixed(4))]);
    return [...rounded, rounded[0]];
  };
  const original = [...points, points[0]];
  const originalArea = ringArea(original);
  let activeTolerance = tolerance;
  for (let attemptIndex = 0; attemptIndex < 5; attemptIndex += 1) {
    const simplified = attempt(activeTolerance);
    if (simplified.length < 4) { activeTolerance /= 2; continue; }
    const error = originalArea > 0 ? Math.abs(ringArea(simplified) - originalArea) / originalArea : 0;
    if (error <= maxAreaError) return simplified;
    activeTolerance /= 2;
  }
  return original;
}

function simplifyGeometry(geometry, tier) {
  const simplifyPolygon = polygon => polygon.map(ring => simplifyClosedRing(ring, tier.tolerance, tier.maxAreaError));
  return {
    ...geometry,
    coordinates: geometry.type === 'Polygon'
      ? simplifyPolygon(geometry.coordinates)
      : geometry.coordinates.map(simplifyPolygon),
  };
}

function stats(collection) {
  let points = 0, rings = 0, polygons = 0;
  const byProvince = {};
  for (const feature of collection.features) {
    const groups = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    const count = groups.reduce((sum, polygon) => sum + polygon.reduce((ringSum, ring) => ringSum + ring.length, 0), 0);
    points += count; polygons += groups.length; rings += groups.reduce((sum, polygon) => sum + polygon.length, 0);
    if (feature.properties.name) byProvince[feature.properties.name] = count;
  }
  return { features:collection.features.length, points, rings, polygons, byProvince };
}

const report = {
  generatedAt:new Date().toISOString(),
  source:{ path:'src/data/china-provinces.json', bytes:(await stat(sourceUrl)).size, sha256:createHash('sha256').update(sourceText).digest('hex'), ...stats(source) },
  tiers:{},
};
for (const tier of tiers) {
  const collection = { ...source, metadata:{ derivedFrom:'china-provinces.json', method:'projected-rdp-with-extrema-and-area-guard', tolerancePx:tier.tolerance, maxRingAreaError:tier.maxAreaError }, features:source.features.map(feature => ({ ...feature, geometry:simplifyGeometry(feature.geometry, tier) })) };
  const text = JSON.stringify(collection);
  const output = new URL(`../src/data/china-provinces.${tier.name}.json`, import.meta.url);
  await writeFile(output, text + '\n');
  report.tiers[tier.name] = { path:`src/data/china-provinces.${tier.name}.json`, bytes:Buffer.byteLength(text + '\n'), sha256:createHash('sha256').update(text + '\n').digest('hex'), tolerancePx:tier.tolerance, maxRingAreaError:tier.maxAreaError, ...stats(collection) };
}
await mkdir(new URL('../docs/audits/', import.meta.url), { recursive:true });
await writeFile(new URL('../docs/audits/map-geometry-generation.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ source:{ bytes:report.source.bytes, points:report.source.points }, tiers:Object.fromEntries(Object.entries(report.tiers).map(([name, tier]) => [name, { bytes:tier.bytes, points:tier.points, reduction:Number((1 - tier.points / report.source.points).toFixed(4)) }])) }, null, 2));
