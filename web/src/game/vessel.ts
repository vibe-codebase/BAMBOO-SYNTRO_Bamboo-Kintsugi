/**
 * Kintsugi's pottery: a vessel is a surface of revolution (a profile turned on the wheel) seen from the
 * front and a little above, so open forms show their mouth as an ellipse. It is painted per pixel, with its
 * glaze, brushwork and crackle, then broken: shards are the cells of a relaxed Voronoi diagram, measured
 * through a warped space so the breaks run jagged and irregular as real ones do. Everything here is pure
 * (no DOM), so the tests can break and mend pots too.
 */
export type Kind = 'chawan' | 'bowl' | 'cup' | 'jar' | 'vase' | 'bottle' | 'tsubo' | 'dish';
export type Glaze = 'celadon' | 'tenmoku' | 'shino' | 'porcelain' | 'raku' | 'ash' | 'copper' | 'oribe';
export type Pattern = 'none' | 'bands' | 'waves' | 'plum' | 'grass' | 'dots' | 'lattice' | 'brush';
export type VesselSpec = { kind: Kind; glaze: Glaze; pattern: Pattern; shards: number; seed: number };

type Shape = { w: number; h: number; mouth: number; foot: number; pts: [number, number][] };
/** Profiles: t runs from the rim (0) to the foot (1), r is the half-width as a share of w / 2. */
export const SHAPES: Record<Kind, Shape> = {
  chawan: { w: 1, h: 0.74, mouth: 0.2, foot: 0.12, pts: [[0, 1], [0.25, 0.985], [0.6, 0.86], [0.84, 0.62], [0.88, 0.44], [1, 0.44]] },
  bowl: { w: 1, h: 0.46, mouth: 0.24, foot: 0.14, pts: [[0, 1], [0.35, 0.92], [0.7, 0.66], [0.86, 0.38], [1, 0.37]] },
  cup: { w: 0.6, h: 0.86, mouth: 0.22, foot: 0.08, pts: [[0, 1], [0.5, 0.96], [0.85, 0.9], [0.92, 0.8], [1, 0.78]] },
  jar: { w: 0.88, h: 0.92, mouth: 0.2, foot: 0.08, pts: [[0, 0.52], [0.06, 0.5], [0.13, 0.62], [0.36, 0.98], [0.62, 0.94], [0.88, 0.66], [1, 0.56]] },
  vase: { w: 0.6, h: 1.12, mouth: 0.22, foot: 0.06, pts: [[0, 0.66], [0.05, 0.54], [0.24, 0.34], [0.45, 0.5], [0.74, 1], [0.92, 0.86], [1, 0.64]] },
  bottle: { w: 0.56, h: 1.08, mouth: 0.3, foot: 0.06, pts: [[0, 0.26], [0.07, 0.22], [0.28, 0.26], [0.5, 0.72], [0.75, 1], [0.93, 0.9], [1, 0.72]] },
  tsubo: { w: 0.94, h: 0.9, mouth: 0.22, foot: 0.07, pts: [[0, 0.44], [0.06, 0.42], [0.13, 0.58], [0.45, 1], [0.8, 0.86], [1, 0.52]] },
  dish: { w: 1, h: 0.3, mouth: 0.42, foot: 0.25, pts: [[0, 1], [0.5, 0.88], [1, 0.6]] },
};

// ── noise ───────────────────────────────────────────────────────────────
export function rng(seed: number) {
  let s = Math.imul(seed + 0x9e3779b9, 2654435761) >>> 0 || 1;
  const next = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  for (let k = 0; k < 8; k++) next();
  return next;
}
const hash = (x: number, y: number, s: number) => {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};
export function vnoise(x: number, y: number, s = 0) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(x0, y0, s), b = hash(x0 + 1, y0, s), c = hash(x0, y0 + 1, s), d = hash(x0 + 1, y0 + 1, s);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
export const fbm = (x: number, y: number, s = 0, oct = 4) => { let v = 0, a = 0.5, f = 1, n = 0; for (let k = 0; k < oct; k++) { v += vnoise(x * f, y * f, s + k * 17) * a; n += a; a *= 0.5; f *= 2.03; } return v / n; };
/** Worley: distance to nearest and second-nearest feature points (for crackle). */
function worley(x: number, y: number, s: number): [number, number] {
  const xi = Math.floor(x), yi = Math.floor(y);
  let d1 = 9, d2 = 9;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = xi + i, cy = yi + j, px = cx + hash(cx, cy, s), py = cy + hash(cx, cy, s + 9);
    const d = Math.hypot(px - x, py - y);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return [d1, d2];
}
const sstep = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
type C3 = [number, number, number];
const hex = (h: string): C3 => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mix3 = (a: C3, b: C3, t: number): C3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// ── geometry ───────────────────────────────────────────────────────────
/** A vessel laid out at S texture pixels per unit: the profile, and where the mouth's ellipse sits. */
export type Geometry = { spec: VesselSpec; S: number; W: number; H: number; top: number; rx: number; ry: number; R: (y: number) => number; dR: (y: number) => number; shape: Shape };
/**
 * Seen from a little above, each ring of the pot is an ellipse, and we see the front half of it, lower on
 * the screen than its centre. For a screen point, find the height on the wheel (y) of the ring it lies on.
 */
export function surface(g: Geometry, cx: number, Y: number): { y: number; nx: number; nz: number } | null {
  const m = g.shape.mouth;
  let y = Y;
  for (let k = 0; k < 6; k++) {
    const r = g.R(y);
    if (r <= 0) { if (y > g.top) { y -= 0.5; continue; } return null; }
    const nx = cx / r; if (Math.abs(nx) > 1) return null;
    y = Y - m * r * Math.sqrt(1 - nx * nx);
  }
  const r = g.R(y);
  if (r <= 0 || Math.abs(cx) > r) return null;
  const nx = cx / r;
  return { y, nx, nz: Math.sqrt(1 - nx * nx) };
}
export function geometry(spec: VesselSpec, S: number): Geometry {
  const shape = SHAPES[spec.kind], pts = shape.pts;
  // smooth profile through the points (Catmull-Rom in t)
  const prof = (t: number) => {
    t = Math.max(0, Math.min(1, t));
    let k = 0; while (k < pts.length - 2 && t > pts[k + 1][0]) k++;
    const p0 = pts[Math.max(0, k - 1)], p1 = pts[k], p2 = pts[k + 1], p3 = pts[Math.min(pts.length - 1, k + 2)];
    const u = (t - p1[0]) / Math.max(1e-6, p2[0] - p1[0]), u2 = u * u, u3 = u2 * u;
    const m1 = ((p2[1] - p0[1]) / Math.max(1e-6, p2[0] - p0[0])) * (p2[0] - p1[0]), m2 = ((p3[1] - p1[1]) / Math.max(1e-6, p3[0] - p1[0])) * (p2[0] - p1[0]);
    return (2 * u3 - 3 * u2 + 1) * p1[1] + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * p2[1] + (u3 - u2) * m2;
  };
  const half = (shape.w / 2) * S, hh = shape.h * S;
  const rx = prof(0) * half, ry = rx * shape.mouth;
  const W = Math.ceil(shape.w * S + 4), H = Math.ceil(hh + ry + prof(1) * half * shape.mouth + 4);
  const top = ry + 2;
  const R = (y: number) => (y < top || y > top + hh ? -1 : prof((y - top) / hh) * half);
  const dR = (y: number) => (R(y + 1) - R(y - 1)) / 2;
  return { spec, S, W, H, top, rx, ry, R, dR, shape };
}
/** 0 outside, 1 the outside of the pot, 2 inside its mouth. */
export function region(g: Geometry, x: number, y: number) {
  const cx = x - g.W / 2;
  if (g.ry > 0 && ((cx / g.rx) ** 2 + ((y - g.top) / g.ry) ** 2) <= 1) return 2;
  return surface(g, cx, y) ? 1 : 0;
}

// ── breaking ───────────────────────────────────────────────────────────
export type Shard = { id: number; area: number; cx: number; cy: number; x0: number; y0: number; x1: number; y1: number };
export type Seam = { a: number; b: number; px: number[] };
export type Broken = { g: Geometry; labels: Int16Array; shards: Shard[]; seams: Seam[] };

/**
 * Break the pot into `spec.shards` pieces. Seeds are spread by best-candidate sampling and relaxed (Lloyd);
 * each pixel then joins the nearest seed measured from a warped position, so the breaks are jagged. Any
 * stray islands are given to a neighbour, so every shard is one piece.
 */
export function shatter(g: Geometry): Broken {
  const { W, H, S, spec } = g, r = rng(spec.seed), n = spec.shards;
  const inside: number[] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (region(g, x + 0.5, y + 0.5)) inside.push(y * W + x);
  // best-candidate seeds
  const seeds: [number, number][] = [];
  while (seeds.length < n) {
    let best: [number, number] = [0, 0], bd = -1;
    for (let c = 0; c < 24; c++) {
      const p = inside[Math.floor(r() * inside.length)], x = (p % W) + 0.5, y = Math.floor(p / W) + 0.5;
      let d = Infinity; for (const s of seeds) d = Math.min(d, Math.hypot(s[0] - x, s[1] - y));
      if (d > bd) { bd = d; best = [x, y]; }
    }
    seeds.push(best);
  }
  // relax: a few rounds of Lloyd on a coarse sample
  for (let it = 0; it < 4; it++) {
    const sx = new Float64Array(n), sy = new Float64Array(n), sc = new Float64Array(n);
    for (let k = 0; k < inside.length; k += 3) {
      const p = inside[k], x = (p % W) + 0.5, y = Math.floor(p / W) + 0.5;
      let bi = 0, bd = Infinity; for (let i = 0; i < n; i++) { const d = (seeds[i][0] - x) ** 2 + (seeds[i][1] - y) ** 2; if (d < bd) { bd = d; bi = i; } }
      sx[bi] += x; sy[bi] += y; sc[bi]++;
    }
    for (let i = 0; i < n; i++) if (sc[i]) seeds[i] = [sx[i] / sc[i], sy[i] / sc[i]];
  }
  // assign through a warped space
  const labels = new Int16Array(W * H).fill(-1), wa = S * 0.07, wb = S * 0.012, f1 = 5 / S, f2 = 40 / S, s0 = spec.seed * 7;
  for (const p of inside) {
    const x = (p % W) + 0.5, y = Math.floor(p / W) + 0.5;
    const qx = x + (fbm(x * f1, y * f1, s0, 3) - 0.5) * 2 * wa + (vnoise(x * f2, y * f2, s0 + 3) - 0.5) * 2 * wb;
    const qy = y + (fbm(x * f1, y * f1, s0 + 5, 3) - 0.5) * 2 * wa + (vnoise(x * f2, y * f2, s0 + 4) - 0.5) * 2 * wb;
    let bi = 0, bd = Infinity; for (let i = 0; i < n; i++) { const d = (seeds[i][0] - qx) ** 2 + (seeds[i][1] - qy) ** 2; if (d < bd) { bd = d; bi = i; } }
    labels[p] = bi;
  }
  // one piece each: keep each label's largest component, give strays to a neighbour
  for (let pass = 0; pass < 4; pass++) {
    const comp = new Int32Array(W * H).fill(-1), sizes: number[] = [], owner: number[] = [];
    for (const p of inside) {
      if (comp[p] >= 0) continue;
      const id = sizes.length, lab = labels[p], st = [p]; comp[p] = id; let c = 0;
      while (st.length) {
        const q = st.pop()!; c++;
        const qx = q % W;
        for (const nb of [qx > 0 ? q - 1 : -1, qx < W - 1 ? q + 1 : -1, q - W, q + W]) if (nb >= 0 && nb < W * H && comp[nb] < 0 && labels[nb] === lab) { comp[nb] = id; st.push(nb); }
      }
      sizes.push(c); owner.push(lab);
    }
    const bestComp = new Map<number, number>();
    sizes.forEach((sz, id) => { const l = owner[id], b = bestComp.get(l); if (b === undefined || sizes[b] < sz) bestComp.set(l, id); });
    let moved = 0;
    for (const p of inside) {
      if (bestComp.get(labels[p]) === comp[p]) continue;
      const qx = p % W;
      for (const nb of [qx > 0 ? p - 1 : -1, qx < W - 1 ? p + 1 : -1, p - W, p + W]) if (nb >= 0 && nb < W * H && labels[nb] >= 0 && labels[nb] !== labels[p] && bestComp.get(labels[nb]) === comp[nb]) { labels[p] = labels[nb]; moved++; break; }
    }
    if (!moved) break;
  }
  // shards and seams
  const shards: Shard[] = Array.from({ length: n }, (_, id) => ({ id, area: 0, cx: 0, cy: 0, x0: W, y0: H, x1: 0, y1: 0 }));
  const seamMap = new Map<number, number[]>();
  for (const p of inside) {
    const l = labels[p]; if (l < 0) continue;
    const x = p % W, y = Math.floor(p / W), sh = shards[l];
    sh.area++; sh.cx += x + 0.5; sh.cy += y + 0.5; sh.x0 = Math.min(sh.x0, x); sh.y0 = Math.min(sh.y0, y); sh.x1 = Math.max(sh.x1, x + 1); sh.y1 = Math.max(sh.y1, y + 1);
    for (const nb of [x < W - 1 ? p + 1 : -1, p + W]) {
      if (nb < 0 || nb >= W * H) continue;
      const m = labels[nb];
      if (m >= 0 && m !== l) { const key = Math.min(l, m) * 1000 + Math.max(l, m); let a = seamMap.get(key); if (!a) seamMap.set(key, (a = [])); a.push(p); }
    }
  }
  for (const sh of shards) if (sh.area) { sh.cx /= sh.area; sh.cy /= sh.area; }
  const seams: Seam[] = [...seamMap.entries()].map(([k, px]) => ({ a: Math.floor(k / 1000), b: k % 1000, px }));
  return { g, labels, shards, seams };
}

// ── painting ───────────────────────────────────────────────────────────
type GlazeFn = (u: number, t: number, x: number, y: number) => C3;
const P = { iron: hex('#4e2f1c'), cobalt: hex('#22397a'), gold: hex('#c8962e') };
const CLAY = hex('#c9ad88'), CLAY_DARK = hex('#9b7a56'), BODY = hex('#e3d6c0');

function glazeFn(gl: Glaze, S: number, seed: number): { base: GlazeFn; inside: C3; gloss: number; crackle: number; ink: C3 } {
  const n = (x: number, y: number, f: number, s = 0) => fbm((x / S) * f, (y / S) * f, seed + s, 4);
  switch (gl) {
    case 'celadon': return { gloss: 0.9, crackle: 0.5, ink: P.iron, inside: hex('#a9c7b0'),
      base: (_u, t, x, y) => mix3(hex('#94b8a0'), hex('#c6dcc8'), n(x, y, 3) * 0.7 + (1 - t) * 0.2) };
    case 'tenmoku': return { gloss: 1, crackle: 0, ink: hex('#c98a3a'), inside: hex('#2b1b12'),
      base: (u, t, x, y) => {
        const streak = sstep(0.55, 0.85, vnoise(u * 70, (y / S) * 3, seed) * 0.7 + n(x, y, 6) * 0.3);
        let c = mix3(hex('#1e130d'), hex('#3a2416'), n(x, y, 4));
        c = mix3(c, hex('#9a5426'), streak * (0.55 - t * 0.3));
        return mix3(c, hex('#8a4a22'), sstep(0.12, 0, t) * 0.7);
      } };
    case 'shino': return { gloss: 0.45, crackle: 0.15, ink: P.iron, inside: hex('#efe5d3'),
      base: (_u, _t, x, y) => {
        let c = mix3(hex('#f1e8d8'), hex('#e6d8c0'), n(x, y, 5));
        c = mix3(c, hex('#d58a4e'), sstep(0.55, 0.85, n(x, y, 1.6, 7)) * 0.65);
        if (vnoise((x / S) * 60, (y / S) * 60, seed + 11) > 0.93) c = mix3(c, hex('#b9a083'), 0.6); // pinholes
        return c;
      } };
    case 'porcelain': return { gloss: 1, crackle: 0, ink: P.cobalt, inside: hex('#f2f5f7'),
      base: (_u, _t, x, y) => mix3(hex('#f4f7f8'), hex('#e3eaf0'), n(x, y, 2)) };
    case 'raku': return { gloss: 0.7, crackle: 1, ink: hex('#1c1a18'), inside: hex('#e8e2d6'),
      base: (_u, t, x, y) => mix3(mix3(hex('#ece6da'), hex('#d8d0c2'), n(x, y, 3)), hex('#5a524a'), sstep(0.55, 1, t + (n(x, y, 2, 3) - 0.5) * 0.5) * 0.8) };
    case 'ash': return { gloss: 0.6, crackle: 0.2, ink: P.iron, inside: hex('#7f8a52'),
      base: (u, t, x, y) => {
        const drip = sstep(0, 0.25, vnoise(u * 26, 0.5, seed) * 0.9 - t * 0.9 + 0.25);
        return mix3(mix3(hex('#7a6446'), hex('#94784e'), n(x, y, 4)), mix3(hex('#5f7a44'), hex('#9aa868'), n(x, y, 8)), drip);
      } };
    case 'copper': return { gloss: 1, crackle: 0, ink: hex('#e6d3a8'), inside: hex('#8a2a20'),
      base: (_u, t, x, y) => {
        let c = mix3(hex('#7e1d18'), hex('#b0362a'), n(x, y, 3));
        c = mix3(c, hex('#3f8f86'), sstep(0.62, 0.8, n(x, y, 2, 5)) * 0.8);
        return mix3(c, hex('#e9dccb'), sstep(0.1, 0, t) * 0.6);
      } };
    case 'oribe': return { gloss: 0.8, crackle: 0.2, ink: P.iron, inside: hex('#e6dcc4'),
      base: (u, _t, x, y) => {
        const green = sstep(0.42, 0.5, u + (n(x, y, 2) - 0.5) * 0.25);
        return mix3(mix3(hex('#ece2cc'), hex('#ddd0b4'), n(x, y, 5)), mix3(hex('#2f6e4a'), hex('#5c9a62'), n(x, y, 6, 2)), green);
      } };
  }
}

/** How much ink a pattern lays at (u, t): 0..1. `px` is the size of a texture pixel in pattern units. */
function patternInk(p: Pattern, u: number, t: number, seed: number, px: number): number {
  const line = (d: number, w: number) => 1 - sstep(w - px, w + px, Math.abs(d));
  switch (p) {
    case 'none': return 0;
    case 'bands': return Math.max(line(t - 0.18, 0.012), line(t - 0.24, 0.006), line(t - 0.8, 0.01));
    case 'waves': {
      // seigaiha: rows of overlapping arcs between two bands
      if (t < 0.3 || t > 0.72) return Math.max(line(t - 0.28, 0.008), line(t - 0.74, 0.008));
      const sx = u * 9, sy = (t - 0.3) * 9 / 0.42 * 0.42 * 2.2, row = Math.floor(sy), ox = row % 2 ? 0.5 : 0;
      const cx = Math.floor(sx + ox) - ox + 0.5, cy = row + 1, d = Math.hypot(sx - cx, sy - cy);
      let ink = 0; for (const rr of [0.5, 0.36, 0.22]) ink = Math.max(ink, line(d - rr, 0.035));
      return d < 0.56 ? ink : 0;
    }
    case 'plum': {
      let ink = 0;
      const rr = rng(seed + 21);
      for (let k = 0; k < 9; k++) {
        const bu = 0.08 + rr() * 0.84, bt = 0.18 + rr() * 0.55, s = 0.035 + rr() * 0.03;
        const du = (u - bu) / s, dt = (t - bt) / (s * 1.4), d = Math.hypot(du, dt);
        if (d < 1.2) { const a = Math.atan2(dt, du); const petal = 0.75 + 0.25 * Math.cos(a * 5); ink = Math.max(ink, d < petal ? (d < 0.22 ? 0.25 : 0.95) : 0); }
      }
      // a branch
      const bt = 0.42 + Math.sin(u * 7 + seed) * 0.08;
      return Math.max(ink, line(t - bt, 0.01) * sstep(0.05, 0.15, u) * (1 - sstep(0.85, 0.95, u)));
    }
    case 'grass': {
      let ink = 0;
      for (let k = 0; k < 14; k++) {
        const bu = (k + 0.5) / 14 + Math.sin(k * 7.3 + seed) * 0.02, h = 0.3 + ((k * 37) % 10) / 30, bend = Math.sin(k * 3.1) * 0.06;
        const s = (0.9 - t) / h; if (s < 0 || s > 1) continue;
        const cu = bu + bend * s * s, w = 0.01 * (1 - s) + 0.002;
        ink = Math.max(ink, line(u - cu, w));
      }
      return ink;
    }
    case 'dots': {
      const sx = u * 7, sy = t * 7, row = Math.floor(sy), ox = row % 2 ? 0.5 : 0, cx = Math.floor(sx + ox) - ox + 0.5, cy = row + 0.5;
      const d = Math.hypot(sx - cx, (sy - cy) * 1.05);
      return t > 0.12 && t < 0.86 ? 1 - sstep(0.2 - px * 7, 0.2 + px * 7, d) : 0;
    }
    case 'lattice': {
      if (t < 0.22 || t > 0.78) return line(t - 0.2, 0.008);
      const a = ((u + t * 0.6) * 10) % 1, b = ((u - t * 0.6) * 10 + 10) % 1;
      return Math.max(line(a - 0.5, 0.04), line(b - 0.5, 0.04)) * 0.9;
    }
    case 'brush': {
      // hakeme: one broad sweep of white slip around the body, streaked by the brush's bristles
      const c = 0.48 + Math.sin(u * 5 + seed) * 0.05, d = Math.abs(t - c);
      const edge = 0.11 + (vnoise(u * 30, 1, seed) - 0.5) * 0.04;
      return d < edge ? 0.55 + 0.45 * vnoise(u * 4, t * 140, seed + 3) : 0;
    }
  }
}

/** Paint the whole pot (RGBA, W×H) with the broken edges of each shard showing pale body. */
export function paint(b: Broken): Uint8ClampedArray {
  const { g, labels } = b, { W, H, S, spec } = g, out = new Uint8ClampedArray(W * H * 4);
  const gl = glazeFn(spec.glaze, S, spec.seed), inside = gl.inside;
  const L = [-0.5, -0.62, 0.6], ll = Math.hypot(L[0], L[1], L[2]); L[0] /= ll; L[1] /= ll; L[2] /= ll;
  const Hh = [L[0], L[1], L[2] + 1], hl = Math.hypot(Hh[0], Hh[1], Hh[2]); Hh[0] /= hl; Hh[1] /= hl; Hh[2] /= hl;
  const hh = g.shape.h * S, footY = g.top + hh * (1 - g.shape.foot);
  const ink = spec.glaze === 'porcelain' ? P.cobalt : gl.ink;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, lab = labels[i];
    if (lab < 0) continue;
    const X = x + 0.5, Y = y + 0.5, reg = region(g, X, Y), cx = X - W / 2;
    let c: C3;
    if (reg === 2) {
      // the inside of the mouth: the far wall lit, the well in shadow, the rim catching light
      const ex = cx / g.rx, ey = (Y - g.top) / g.ry, e = Math.hypot(ex, ey);
      const deep = sstep(-0.9, 0.7, ey) * (1 - e * 0.5);
      c = mix3(inside, [inside[0] * 0.45, inside[1] * 0.42, inside[2] * 0.42], deep * 0.75);
      c = mix3(c, gl.base(0.5, 0.5, x, y), 0.25);
      const rim = sstep(0.9, 0.985, e);
      c = mix3(c, mix3(gl.base(0.5, 0, x, y), [255, 250, 240], 0.25), rim * 0.85);
      if (ey > 0.2 && e > 0.97) c = mix3(c, [0, 0, 0], 0.25);
      const glint = Math.exp(-(((ex + 0.35) / 0.18) ** 2) - (((ey + 0.55) / 0.12) ** 2)) * gl.gloss;
      c = mix3(c, [255, 255, 255], glint * 0.5);
    } else {
      const sf = surface(g, cx, Y)!, Yw = sf.y, nx = sf.nx, nz = sf.nz;
      const ny = -g.dR(Yw) * 0.9 - 0.25 * g.shape.mouth, nl = Math.hypot(nx, ny, nz), Nx = nx / nl, Ny = ny / nl, Nz = nz / nl;
      const dif = Math.max(0, Nx * L[0] + Ny * L[1] + Nz * L[2]);
      const spec2 = Math.pow(Math.max(0, Nx * Hh[0] + Ny * Hh[1] + Nz * Hh[2]), 38) * gl.gloss;
      const u = Math.asin(nx) / Math.PI + 0.5, t = (Yw - g.top) / hh;
      const wavy = footY + Math.sin(u * 23 + spec.seed) * S * 0.008 + (fbm(u * 8, 2, spec.seed) - 0.5) * S * 0.02;
      if (Yw > wavy) {
        // the foot: bare clay, gritty, a little scorched
        c = mix3(CLAY, CLAY_DARK, fbm(x / S * 30, y / S * 30, spec.seed + 4, 2));
        c = [c[0] * (0.45 + dif * 0.75), c[1] * (0.45 + dif * 0.75), c[2] * (0.45 + dif * 0.75)];
      } else {
        c = gl.base(u, t, x, y);
        const k = patternInk(spec.pattern, u, t, spec.seed, 1 / (S * 0.5));
        if (k > 0) c = mix3(c, mix3(ink, c, 0.15 * vnoise(x / S * 40, y / S * 40, 5)), k * 0.88);
        if (gl.crackle > 0) {
          const [d1, d2] = worley((x / S) * 22, (y / S) * 22, spec.seed + 2);
          const crk = 1 - sstep(0.015, 0.05, d2 - d1);
          c = mix3(c, [c[0] * 0.55, c[1] * 0.5, c[2] * 0.45], crk * gl.crackle * 0.6);
        }
        // glaze pools a little darker toward the foot, thinner and paler at the rim
        const thick = sstep(0.55, 1, (Yw - g.top) / (wavy - g.top));
        c = [c[0] * (1 - thick * 0.12), c[1] * (1 - thick * 0.12), c[2] * (1 - thick * 0.1)];
        const sh = 0.38 + dif * 0.78;
        c = [c[0] * sh + 255 * spec2 * 0.7, c[1] * sh + 255 * spec2 * 0.7, c[2] * sh + 255 * spec2 * 0.68];
        // a soft reflection of the room in the glaze
        c = mix3(c, [255, 248, 236], Math.max(0, -Nx - 0.6) * 0.15 * gl.gloss);
      }
      // the very edge of the silhouette falls away
      const edge = sstep(0.93, 1, Math.abs(nx));
      c = [c[0] * (1 - edge * 0.35), c[1] * (1 - edge * 0.35), c[2] * (1 - edge * 0.35)];
    }
    // the broken edge of a shard shows the pale body under the glaze
    let broke = 0;
    for (const [dx, dy, w] of [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [2, 0, 0.5], [-2, 0, 0.5], [0, 2, 0.5], [0, -2, 0.5]] as const) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      const m = labels[yy * W + xx];
      if (m >= 0 && m !== lab) broke = Math.max(broke, w);
    }
    if (broke) c = mix3(c, BODY, broke * 0.75);
    const o = i * 4;
    out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = 255;
  }
  return out;
}

/** The gold for one seam: pixels near the seam, as RGBA in the seam's bounding box. */
export function goldSeam(b: Broken, s: Seam, width: number, seed = 1) {
  const { W, H } = b.g;
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (const p of s.px) { const x = p % W, y = Math.floor(p / W); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const pad = Math.ceil(width) + 1;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W - 1, x1 + pad + 1); y1 = Math.min(H - 1, y1 + pad + 1);
  const w = x1 - x0 + 1, h = y1 - y0 + 1, dist = new Float32Array(w * h).fill(99);
  const R = Math.ceil(width);
  for (const p of s.px) {
    const px = (p % W) - x0 + 1, py = Math.floor(p / W) - y0 + 0.5;
    for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) {
      const xx = Math.floor(px) + i, yy = Math.floor(py) + j;
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      const d = Math.hypot(xx + 0.5 - px, yy + 0.5 - py), k = yy * w + xx;
      if (d < dist[k]) dist[k] = d;
    }
  }
  const out = new Uint8ClampedArray(w * h * 4);
  for (let k = 0; k < w * h; k++) {
    const d = dist[k]; if (d > width + 1) continue;
    // the gold is raised a little: bright down its crest, deeper at its edges, with a fleck of sparkle
    const crest = Math.max(0, 1 - d / (width + 0.5)), a = 1 - sstep(width - 0.3, width + 0.9, d);
    const x = k % w, y = Math.floor(k / w), fl = vnoise((x + x0) * 0.6, (y + y0) * 0.6, seed);
    const c = mix3(hex('#8a5a14'), hex('#f6d27a'), Math.min(1, crest * 1.1 + (fl - 0.5) * 0.35));
    const hot = Math.pow(crest, 3) * 0.55 + (fl > 0.86 ? 0.35 : 0);
    out[k * 4] = c[0] + (255 - c[0]) * hot; out[k * 4 + 1] = c[1] + (255 - c[1]) * hot; out[k * 4 + 2] = c[2] + (240 - c[2]) * hot * 0.8; out[k * 4 + 3] = a * 255;
  }
  return { x0, y0, w, h, data: out };
}
