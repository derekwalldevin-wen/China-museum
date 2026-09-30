// The share-card copy in index.html is static HTML, so its collection counts
// cannot be derived at runtime the way the in-app directory labels are. This
// test binds that copy to the authority source: adding or removing artifacts
// without updating the wording fails here instead of shipping a stale claim.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { museums } from '../src/data/museums.ts';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const description = html.match(/<meta property="og:description" content="([^"]*)"\s*\/?>/)?.[1];

test('share-card description states the current museum and artifact totals', () => {
  assert.ok(description, 'index.html must keep an og:description for shared links');
  const museumCount = museums.length;
  const artifactCount = museums.reduce((sum, museum) => sum + museum.artifacts.length, 0);
  const claimedMuseums = Number(description.match(/(\d+)座博物馆/)?.[1]);
  const claimedArtifacts = Number(description.match(/(\d+)件代表文物/)?.[1]);
  assert.equal(claimedMuseums, museumCount, `og:description claims ${claimedMuseums} museums, authority source has ${museumCount}`);
  assert.equal(claimedArtifacts, artifactCount, `og:description claims ${claimedArtifacts} artifacts, authority source has ${artifactCount}`);
});

test('share-card copy keeps the scroll-map wording that is specific to this site', () => {
  assert.match(description, /省界与朱印/);
  assert.match(description, /一轴山河/);
});

// The author credit is a personal attribution, so it is bound to the homepage
// footer by name and placement: it must exist exactly once, inside the footer,
// and keep the singular wording "作者：德里克文". The element carries only an id
// so the initial JS bundle stays inside its budget.
test('homepage footer carries exactly one author credit inside the footer element', () => {
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const credits = app.match(/作者：德里克文/g) ?? [];
  assert.equal(credits.length, 1, 'App.tsx must render the author credit exactly once');
  const footer = app.match(/<footer className="atlas-footer[\s\S]*?<\/footer>/)?.[0];
  assert.ok(footer, 'the atlas footer must still exist');
  assert.match(footer, /<span id="author">作者：德里克文<\/span>/, 'the credit must live inside the footer (bottom-right of the homepage)');
  const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
  assert.match(css, /#author \{[\s\S]*?white-space:\s*nowrap/, 'the credit must not wrap');
  assert.match(css, /data-intro-active[^{]*#author[^{]*\{[^}]*opacity:\s*0/, 'the credit must fade with the map during the intro');
});
