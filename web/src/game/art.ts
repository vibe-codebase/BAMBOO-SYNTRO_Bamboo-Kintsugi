/** Canvas painting for the workbench: the table, the cloth the pot is mended on, and the outline of the pot. */
import { fbm, vnoise, type Broken } from './vessel';

export type Mood = { name: string; wood: [string, string, string]; cloth: [string, string]; thread: string; glow: string; ghost: [number, number, number]; ui: string };
export const MOODS: Mood[] = [
  { name: 'tea', wood: ['#3a2618', '#24170e', '#5a3c26'], cloth: ['#d9cbb0', '#c4b394'], thread: '#a8946f', glow: 'rgba(255,226,170,0.22)', ghost: [120, 98, 66], ui: '#e9c46a' },
  { name: 'blue', wood: ['#2c2420', '#1a1512', '#4a3a30'], cloth: ['#2c3d5c', '#1f2c45'], thread: '#46608a', glow: 'rgba(190,210,255,0.16)', ghost: [200, 214, 240], ui: '#e9c46a' },
  { name: 'raku', wood: ['#2a1d18', '#140e0b', '#45302a'], cloth: ['#33302e', '#24211f'], thread: '#4a4441', glow: 'rgba(255,140,70,0.18)', ghost: [230, 200, 180], ui: '#f0b25a' },
];

export function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  return { c, g: c.getContext('2d')! };
}

/**
 * The bench: walnut boards with their grain, a square of cloth laid where the pot is mended, and a pool of
 * lamplight over it. `cloth` is the cloth's rectangle in view units.
 */
export function bench(m: Mood, W: number, H: number, r: number, cloth: [number, number, number, number], seed: number) {
  const { c, g } = canvas(W * r, H * r), img = g.createImageData(c.width, c.height), d = img.data;
  const hexc = (h: string) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const [a, b, k] = m.wood.map(hexc), [ca, cb] = m.cloth.map(hexc), th = hexc(m.thread);
  const [cx, cy, cw, ch] = cloth.map((v) => v * r);
  const boardW = 92 * r;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    const o = (y * c.width + x) * 4;
    let col: number[];
    const inCloth = x >= cx && x < cx + cw && y >= cy && y < cy + ch;
    if (inCloth) {
      // linen: a fine weave, slubs, and soft folds
      const wx = Math.sin((x / r) * 2.4) * 0.5 + 0.5, wy = Math.sin((y / r) * 2.4 + 1) * 0.5 + 0.5;
      const slub = vnoise((x / r) * 0.08, (y / r) * 1.4, seed + 3) > 0.8 ? 0.08 : 0;
      const fold = (fbm((x / r) * 0.012, (y / r) * 0.02, seed + 7, 3) - 0.5) * 0.35;
      const t = 0.5 + (wx * wy - 0.25) * 0.4 + slub + fold;
      col = [ca[0] + (cb[0] - ca[0]) * t, ca[1] + (cb[1] - ca[1]) * t, ca[2] + (cb[2] - ca[2]) * t];
      if ((x / r) % 40 < 0.6 * (1 + slub * 4) && vnoise(0, (y / r) * 0.2, seed) > 0.4) col = col.map((v, i) => v + (th[i] - v) * 0.25);
      // a hemmed edge
      const e = Math.min(x - cx, y - cy, cx + cw - x, cy + ch - y) / r;
      if (e < 5) col = col.map((v) => v * (0.8 + (e / 5) * 0.2));
      if (e > 6 && e < 7) col = col.map((v, i) => v + (th[i] - v) * 0.6);
    } else {
      // walnut: boards with long grain, figure, and a dark gap between them
      const bx = x % boardW, board = Math.floor(x / boardW);
      const grain = Math.sin((x / r) * 0.9 + fbm((x / r) * 0.02, (y / r) * 0.004 + board * 3, seed + board, 4) * 24) * 0.5 + 0.5;
      const fig = fbm((x / r) * 0.05, (y / r) * 0.01 + board, seed + 11, 3);
      const t = grain * 0.45 + fig * 0.55;
      col = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
      if (vnoise((x / r) * 0.6, (y / r) * 0.02, seed + board) > 0.86) col = col.map((v, i) => v + (k[i] - v) * 0.35);
      if (bx < 1.2 * r) col = col.map((v) => v * 0.45);
      // the cloth casts a soft shadow
      const dx = Math.max(cx - x, 0, x - (cx + cw)), dy = Math.max(cy - y, 0, y - (cy + ch)), dd = Math.hypot(dx, dy) / r;
      const sh = Math.max(0, 1 - dd / 9) * 0.35;
      col = col.map((v) => v * (1 - sh));
    }
    d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  // lamplight: a warm pool over the cloth, the room falling to dark at the edges
  const lx = (cx + cw / 2), ly = cy + ch * 0.45;
  const pool = g.createRadialGradient(lx, ly, 0, lx, ly, Math.max(cw, ch) * 0.75);
  pool.addColorStop(0, m.glow); pool.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = pool; g.fillRect(0, 0, c.width, c.height);
  const vig = g.createRadialGradient(c.width / 2, c.height * 0.45, Math.min(c.width, c.height) * 0.3, c.width / 2, c.height * 0.45, Math.max(c.width, c.height) * 0.8);
  vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.55)');
  g.fillStyle = vig; g.fillRect(0, 0, c.width, c.height);
  return c;
}

/** Where the pot will stand: a faint silhouette with a fine drawn outline. */
export function ghost(b: Broken, m: Mood) {
  const { W, H } = b.g, { c, g } = canvas(W, H), img = g.createImageData(W, H), d = img.data, L = b.labels;
  const [gr, gg, gb] = m.ghost;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (L[i] < 0) continue;
    let edge = 0;
    for (let j = -2; j <= 2; j++) for (let k = -2; k <= 2; k++) {
      const xx = x + k, yy = y + j;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H || L[yy * W + xx] < 0) edge = Math.max(edge, 1 - Math.hypot(j, k) / 3);
    }
    const o = i * 4;
    d[o] = gr; d[o + 1] = gg; d[o + 2] = gb; d[o + 3] = 22 + edge * 150;
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** One shard cut from the painted pot: its pixels inside its bounding box. */
export function shardCanvas(b: Broken, rgba: Uint8ClampedArray, id: number) {
  const s = b.shards[id], w = s.x1 - s.x0, h = s.y1 - s.y0, { W } = b.g;
  const { c, g } = canvas(w, h), img = g.createImageData(w, h), d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y + s.y0) * W + x + s.x0; if (b.labels[i] !== id) continue;
    const o = (y * w + x) * 4, p = i * 4;
    d[o] = rgba[p]; d[o + 1] = rgba[p + 1]; d[o + 2] = rgba[p + 2]; d[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}
export function rgbaCanvas(w: number, h: number, data: Uint8ClampedArray) {
  const { c, g } = canvas(w, h), img = g.createImageData(w, h);
  img.data.set(data); g.putImageData(img, 0, 0);
  return c;
}
/** A soft round dot, for sparkles. */
export function dot(px: number, color = '#ffffff') {
  const { c, g } = canvas(px, px), gr = g.createRadialGradient(px / 2, px / 2, 0, px / 2, px / 2, px / 2);
  gr.addColorStop(0, color); gr.addColorStop(0.35, color); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, px, px);
  return c;
}
