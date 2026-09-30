import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import images from '../src/data/images.json' with { type: 'json' };
import museums from '../src/data/museum-index.json' with { type: 'json' };
import { resolveArtifactImageInfo } from '../src/data/image-types.ts';

const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const evidenceDir = path.join(root, 'assets', 'responsive-images');
const planPath = path.join(evidenceDir, 'plan.json');
const manifestPath = path.join(evidenceDir, 'manifest.json');
const outputDir = path.join(root, 'public', 'artifact-responsive');
const pythonScript = path.join(root, 'scripts', 'generate-responsive-images.py');
const python = process.env.HUAXIA_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const shapeById = new Map(museums.flatMap(museum => museum.artifacts.map(artifact => [artifact.id, artifact.shape])));

const artifacts = {};
for (const [id, info] of Object.entries(images)) {
  const shape = shapeById.get(id);
  if (!shape) throw new Error(`Missing artifact shape: ${id}`);
  artifacts[id] = { hold: Boolean(info.imageHold), shape, roles: {} };
  for (const role of ['card', 'detail']) {
    const resolved = resolveArtifactImageInfo(info, role);
    if (!resolved) continue;
    const profile = role === 'detail' && shape === 'scroll' ? 'scroll-detail' : role;
    artifacts[id].roles[role] = {
      profile,
      primary: { src: resolved.src, kind: resolved.kind },
      ...(resolved.fallback ? { fallback: { src: resolved.fallback.src, kind: resolved.fallback.kind } } : {}),
    };
  }
}

await mkdir(evidenceDir, { recursive: true });
await writeFile(planPath, `${JSON.stringify({ version: 1, artifacts }, null, 2)}\n`);

await new Promise((resolve, reject) => {
  const child = spawn(python, [pythonScript, '--root', root, '--plan', planPath, '--output', outputDir, '--manifest', manifestPath], {
    stdio: 'inherit',
  });
  child.once('error', reject);
  child.once('exit', code => code === 0 ? resolve() : reject(new Error(`Responsive image generator exited with ${code}`)));
});

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
console.log(JSON.stringify({
  artifacts: Object.keys(manifest.artifacts).length,
  eligibleArtifacts: Object.values(manifest.artifacts).filter(value => Object.keys(value.roles).length).length,
  sourceAssets: Object.keys(manifest.sources).length,
  derivatives: manifest.outputs.length,
  sourceBytes: manifest.summary.sourceBytes,
  derivativeBytes: manifest.summary.derivativeBytes,
}, null, 2));
