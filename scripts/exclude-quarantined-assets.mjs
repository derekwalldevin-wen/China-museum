import { readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Only disposable build copies are removed. Original evidence stays in public/.
const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.resolve(root, 'dist');
const images = JSON.parse(await readFile(path.join(root, 'src/data/images.json'), 'utf8'));
const excluded = new Set();
for (const info of Object.values(images)) {
  for (const retired of info.retiredAssets ?? []) excluded.add(retired.src);
  if (info.imageHold) {
    excluded.add(info.src);
    for (const variant of Object.values(info.variants ?? {})) excluded.add(variant.src);
  } else {
    for (const variant of Object.values(info.variants ?? {})) {
      if (variant.provenance?.authorizationStatus === 'restricted') excluded.add(variant.src);
    }
  }
}
for (const src of excluded) {
  const target = path.resolve(dist, src.replace(/^\//, ''));
  if (!target.startsWith(dist + path.sep)) throw new Error(`Unsafe build asset: ${src}`);
  try { await unlink(target); } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
console.log(`Excluded ${excluded.size} quarantined/restricted build copies; all originals retained locally.`);
