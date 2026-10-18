import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const from = path.join(root, 'web/dist');
const to = path.join(root, 'assets/www');
if (!fs.existsSync(path.join(from, 'index.html'))) throw new Error('Run "npm run web:build" first.');
fs.rmSync(to, { recursive: true, force: true });
fs.cpSync(from, to, { recursive: true });
for (const f of fs.readdirSync(path.join(to, 'assets'))) {
  if (!/\.(js|css|html)$/.test(f)) continue;
  const s = fs.readFileSync(path.join(to, 'assets', f), 'utf8');
  if (/["'(]\/(assets|game-assets)\//.test(s)) throw new Error(`Absolute asset path in ${f}; it would break on Android.`);
}
if (/https?:\/\//i.test(fs.readFileSync(path.join(to, 'index.html'), 'utf8'))) throw new Error('Remote URL in index.html');
console.log('Copied offline web build to assets/www.');
