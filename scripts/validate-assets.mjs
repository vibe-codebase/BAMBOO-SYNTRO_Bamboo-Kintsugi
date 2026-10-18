import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const need = { 'assets/icons/app-icon.png': [1024, 1024], 'assets/icons/adaptive-foreground.png': [1024, 1024], 'assets/key-art/splash.png': null };
let ok = true;
for (const [rel, size] of Object.entries(need)) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) { console.error('missing', rel); ok = false; continue; }
  const b = fs.readFileSync(p);
  if (b.readUInt32BE(0) !== 0x89504e47) { console.error('not a PNG', rel); ok = false; continue; }
  const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
  if (size && (w !== size[0] || h !== size[1])) { console.error(`${rel} is ${w}x${h}, expected ${size.join('x')}`); ok = false; }
}
const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo;
if (!/^com\.[a-z0-9]+\.[a-z0-9]+$/.test(app.android.package)) { console.error('bad package id'); ok = false; }
if (!ok) process.exit(1);
console.log('Assets valid:', Object.keys(need).length, 'files,', app.android.package);
