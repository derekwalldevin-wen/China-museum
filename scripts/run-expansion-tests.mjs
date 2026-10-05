import { readdir, mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
const root = new URL('../', import.meta.url);
const files = (await readdir(new URL('scripts/', root))).filter(name => name.endsWith('.test.mjs')).sort().map(name => `scripts/${name}`);
await mkdir(new URL('docs/audits/', root), { recursive: true });
let output = '';
const code = await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ['--test', '--test-reporter=tap', ...files], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', data => { output += data; });
  child.stderr.on('data', data => { output += data; });
  child.once('error', reject);
  child.once('exit', resolve);
});
await writeFile(new URL('docs/audits/expansion-600-tests.tap', root), output);
console.log(output.slice(-6000));
if (code !== 0) process.exitCode = code || 1;
