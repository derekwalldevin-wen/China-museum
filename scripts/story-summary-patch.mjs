// Prints a reviewable patch; it does not modify files itself.
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../src/data/museums.ts', import.meta.url), 'utf8');
const data = JSON.parse(readFileSync(new URL('../src/data/stories.json', import.meta.url), 'utf8'));
const lines = source.split(/\r?\n/);
const changes = [];
for (const story of data.stories.sort((a, b) => source.indexOf(`id: '${a.id}'`) - source.indexOf(`id: '${b.id}'`))) {
  const line = lines.find(line => line.includes(`id: '${story.id}'`));
  if (!line || !line.includes('story:')) throw new Error(`Missing ${story.id}`);
  const next = line.replace(/story: '(?:[^'\\]|\\.)*'/, `story: '${story.summary.replaceAll("'", "\\'")}'`);
  if (line !== next) changes.push(`@@\n-${line}\n+${next}`);
}
if (!changes.length) throw new Error('Already synchronized');
console.log(`*** Begin Patch\n*** Update File: C:/Users/derek/Documents/kimi/Workspaces/博物馆/museum-atlas/src/data/museums.ts\n${changes.join('\n')}\n*** End Patch`);
