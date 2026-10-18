import { describe, expect, it } from 'vitest';
import { CHAPTERS, LEVELS, levelIndex, shardCount, starsFor } from '../game/levels';
import { geometry, goldSeam, paint, region, shatter, SHAPES } from '../game/vessel';
import { freshSave, isUnlocked, parseSave, recordResult, totalStars } from '../state/save';

describe('levels', () => {
  it('has 24 pots in three chapters of eight, with unique ids', () => {
    expect(LEVELS).toHaveLength(24);
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(24);
    CHAPTERS.forEach((_, c) => expect(LEVELS.filter((l) => l.chapter === c)).toHaveLength(8));
    expect(levelIndex('r8')).toBe(23);
  });
  it('the first chapter keeps shards upright; the later ones turn them', () => {
    for (const l of LEVELS) expect(l.turn).toBe(l.chapter > 0);
  });
  it('gets harder: more pieces in later chapters, and two pots at once only at the end', () => {
    const mean = (c: number) => LEVELS.filter((l) => l.chapter === c).reduce((a, l) => a + shardCount(l), 0) / 8;
    expect(mean(1)).toBeGreaterThan(mean(0));
    expect(mean(2)).toBeGreaterThan(mean(1));
    for (const l of LEVELS) if (l.vessels.length > 1) expect(l.chapter).toBe(2);
  });
  it('stars: no spills is three, up to two is two', () => {
    expect(starsFor(0)).toBe(3); expect(starsFor(1)).toBe(2); expect(starsFor(2)).toBe(2); expect(starsFor(3)).toBe(1);
  });
});

describe('breaking pots', () => {
  for (const l of LEVELS) for (const [k, v] of l.vessels.entries()) {
    it(`${l.id} ${l.name} (${k + 1}): ${v.shards} shards, each one whole piece, each touching another`, () => {
      const g = geometry(v, 120), b = shatter(g), { W, H } = g;
      expect(b.shards).toHaveLength(v.shards);
      const total = b.shards.reduce((a, s) => a + s.area, 0);
      for (const s of b.shards) {
        expect(s.area).toBeGreaterThan(total / v.shards / 5);
        // one connected piece
        let start = -1; for (let i = 0; i < W * H; i++) if (b.labels[i] === s.id) { start = i; break; }
        const seen = new Uint8Array(W * H), st = [start]; seen[start] = 1; let n = 0;
        while (st.length) { const q = st.pop()!; n++; const x = q % W; for (const nb of [x > 0 ? q - 1 : -1, x < W - 1 ? q + 1 : -1, q - W, q + W]) if (nb >= 0 && nb < W * H && !seen[nb] && b.labels[nb] === s.id) { seen[nb] = 1; st.push(nb); } }
        expect(n).toBe(s.area);
        expect(b.seams.some((sm) => sm.a === s.id || sm.b === s.id)).toBe(true);
        // its centre of mass (where it is held and set) lies near its own pixels
        expect(s.cx).toBeGreaterThanOrEqual(s.x0); expect(s.cx).toBeLessThanOrEqual(s.x1);
      }
      // every pixel of the pot belongs to a shard
      for (let y = 0; y < H; y += 3) for (let x = 0; x < W; x += 3) expect(b.labels[y * W + x] >= 0).toBe(region(g, x + 0.5, y + 0.5) > 0);
    });
  }
  it('breaks the same way every time', () => {
    const v = LEVELS[5].vessels[0];
    expect(Array.from(shatter(geometry(v, 80)).labels)).toEqual(Array.from(shatter(geometry(v, 80)).labels));
  });
  it('paints every pixel of the pot, and only the pot', () => {
    for (const kind of Object.keys(SHAPES) as (keyof typeof SHAPES)[]) {
      const b = shatter(geometry({ kind, glaze: 'celadon', pattern: 'waves', shards: 4, seed: 9 }, 60)), img = paint(b);
      for (let i = 0; i < b.labels.length; i++) {
        expect(img[i * 4 + 3]).toBe(b.labels[i] >= 0 ? 255 : 0);
        if (b.labels[i] >= 0) expect(Number.isFinite(img[i * 4]) && img[i * 4] + img[i * 4 + 1] + img[i * 4 + 2] > 0).toBe(true);
      }
    }
  });
  it('gold follows each seam', () => {
    const b = shatter(geometry(LEVELS[0].vessels[0], 100));
    for (const s of b.seams) { const gs = goldSeam(b, s, 2); expect(gs.data.some((v, i) => i % 4 === 3 && v > 200)).toBe(true); }
  });
});

describe('save', () => {
  it('survives junk and keeps only known pots', () => {
    expect(parseSave('nope')).toEqual(freshSave());
    const s = parseSave(JSON.stringify({ v: 1, stars: { t1: 3, zz: 2, t2: 9 }, best: { t1: 0, t2: 'x', t3: 2 }, seenHints: ['t1', 5], settings: { music: 4, sfx: 0.2 } }));
    expect(s.stars).toEqual({ t1: 3, t2: 3 });
    expect(s.best).toEqual({ t1: 0, t3: 2 });
    expect(s.seenHints).toEqual(['t1']);
    expect(s.settings).toMatchObject({ music: 1, sfx: 0.2, haptics: true });
  });
  it('records the best gold and fewest spills, and unlocks in order', () => {
    let s = freshSave();
    expect(isUnlocked(s, 1)).toBe(false);
    s = recordResult(s, 't1', 2, 1); s = recordResult(s, 't1', 3, 0);
    expect(s.stars.t1).toBe(3); expect(s.best.t1).toBe(0); expect(isUnlocked(s, 1)).toBe(true); expect(totalStars(s)).toBe(3);
  });
});
