import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';
import { museums } from '../src/data/museums.ts';
import { provinces } from '../src/data/provinces.ts';

const load = name => JSON.parse(readFileSync(new URL(`../src/data/${name}`, import.meta.url), 'utf8'));
const raw = load('china-provinces.json');
const standard = load('china-provinces.standard.json');
const compact = load('china-provinces.compact.json');
const report = JSON.parse(readFileSync(new URL('../docs/audits/map-geometry-generation.json', import.meta.url), 'utf8'));
const named = collection => new Map(collection.features.filter(feature => feature.properties.name).map(feature => [feature.properties.name, feature]));
const rawByName = named(raw), standardByName = named(standard), compactByName = named(compact);
const polygons = feature => feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
const rings = feature => polygons(feature).flat();
const equal = (a, b) => a[0] === b[0] && a[1] === b[1];
const ringArea = ring => Math.abs(ring.slice(1).reduce((sum, point, index) => sum + ring[index][0] * point[1] - point[0] * ring[index][1], 0) / 2);
const featureArea = feature => rings(feature).reduce((sum, ring) => sum + ringArea(ring), 0);
const bbox = feature => rings(feature).flat().reduce((value, [x,y]) => [Math.min(value[0],x),Math.min(value[1],y),Math.max(value[2],x),Math.max(value[3],y)], [Infinity,Infinity,-Infinity,-Infinity]);
function pointInRing([x,y], ring) {
  let inside = false;
  for (let i=0, j=ring.length-1; i<ring.length; j=i++) {
    const [xi,yi]=ring[i], [xj,yj]=ring[j];
    if ((yi>y)!==(yj>y) && x < ((xj-xi)*(y-yi))/(yj-yi)+xi) inside=!inside;
  }
  return inside;
}
const contains = (feature, point) => polygons(feature).some(polygon => pointInRing(point, polygon[0]) && !polygon.slice(1).some(ring => pointInRing(point, ring)));

test('original GeoJSON remains byte-for-byte bound to the generation report', () => {
  const text = readFileSync(new URL('../src/data/china-provinces.json', import.meta.url));
  assert.equal(createHash('sha256').update(text).digest('hex'), report.source.sha256);
  assert.equal(text.length, 424582); assert.equal(report.source.points, 25240);
});

test('both offline tiers retain all 34 named regions, geometry types, polygons and rings', () => {
  const names = provinces.map(province => province.name).sort();
  assert.deepEqual([...rawByName.keys()].sort(), names);
  for (const tier of [standardByName, compactByName]) for (const name of names) {
    const before=rawByName.get(name), after=tier.get(name);
    assert.ok(after, name); assert.equal(after.geometry.type, before.geometry.type, name);
    assert.equal(polygons(after).length, polygons(before).length, name);
    assert.equal(rings(after).length, rings(before).length, name);
  }
});

test('simplified rings stay finite, closed and preserve exact geographic extrema', () => {
  for (const tier of [standardByName, compactByName]) for (const [name, feature] of tier) {
    assert.deepEqual(bbox(feature), bbox(rawByName.get(name)), name);
    for (const ring of rings(feature)) {
      assert.ok(ring.length >= 4, `${name}:${ring.length}`);
      assert.ok(equal(ring[0], ring.at(-1)), name);
      assert.ok(ring.flat().every(Number.isFinite), name);
    }
  }
});

test('standard and compact areas stay inside their audited error budgets', () => {
  for (const [tier, limit] of [[standardByName,0.02],[compactByName,0.045]]) for (const [name, feature] of tier) {
    const originalArea=featureArea(rawByName.get(name));
    const error=originalArea ? Math.abs(featureArea(feature)-originalArea)/originalArea : 0;
    assert.ok(error <= limit, `${name}:${error}`);
  }
  assert.ok(statSync(new URL('../src/data/china-provinces.standard.json', import.meta.url)).size < 140000);
  assert.ok(statSync(new URL('../src/data/china-provinces.compact.json', import.meta.url)).size < 90000);
});

test('province label centers and all museum markers retain source containment parity', () => {
  const points = [
    ...provinces.map(province => ({ province:province.name, point:province.center, id:`center:${province.name}` })),
    ...museums.map(museum => ({ province:museum.province, point:museum.coord, id:museum.id })),
  ];
  for (const item of points) {
    const expected=contains(rawByName.get(item.province), item.point);
    assert.equal(contains(standardByName.get(item.province), item.point), expected, `standard:${item.id}`);
    assert.equal(contains(compactByName.get(item.province), item.point), expected, `compact:${item.id}`);
  }
});

test('Hong Kong and Macao keep dedicated label leaders and touch radii in the renderer', () => {
  const source = readFileSync(new URL('../src/components/ScrollMapScene.tsx', import.meta.url), 'utf8');
  for (const name of ['香港特别行政区','澳门特别行政区']) {
    assert.ok(featureArea(standardByName.get(name)) > 0, name);
    assert.match(source, new RegExp(`${name}: \\[65`));
    assert.match(source, new RegExp(`${name}: 20`));
  }
  assert.match(source, /china-provinces\.compact\.json/);
  assert.match(source, /china-provinces\.standard\.json/);
});

test('new Hangzhou and Lanzhou museum coordinates are inside their named province in all tiers',()=>{
  for(const id of ['china-silk','gansu-jiandu']){const museum=museums.find(m=>m.id===id);assert.ok(museum);for(const tier of [rawByName,standardByName,compactByName])assert.ok(contains(tier.get(museum.province),museum.coord),id);}
});

test('Wuhan and Changzhou city museum coordinates stay in their correct province across tiers',()=>{
 for(const id of ['wuhan-city','changzhou-city']){const m=museums.find(m=>m.id===id);assert.ok(m);for(const tier of [rawByName,standardByName,compactByName])assert.ok(contains(tier.get(m.province),m.coord),id);}
});
