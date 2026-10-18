import Phaser from 'phaser';
import * as A from './art';
import { LEVELS, starsFor, type Level } from './levels';
import { geometry, goldSeam, paint, shatter, SHAPES, type Broken } from './vessel';
import { sound } from '../audio/sound';

export type Result = { slips: number; stars: number; shards: number };
export type Finish = { level: Level; result: Result };
type Hooks = { onFinish?: (f: Finish) => void; onFirstAction?: () => void; onHaptic?: (s: 'light' | 'medium' | 'success' | 'warning') => void };
export type HudState = { placed: number; total: number; slips: number; done: boolean; msg: string; msgId: number };

/** Bridge between React and the Phaser scene. */
export const bench = {
  hooks: {} as Hooks,
  scene: null as BenchScene | null,
  reducedMotion: false,
  show(mode: 'menu' | 'play', level: Level) { this.scene?.show(mode, level); },
  setPaused(p: boolean) { this.scene?.setPaused(p); },
  state(): HudState | null { return this.scene?.hudState() ?? null; },
  hint() { this.scene?.hint(); },
  debug() { return this.scene?.debugState(); },
  /** QA only: CSS positions of a loose shard and of where it belongs. */
  qaShard(i: number) { return this.scene?.qaShard(i); },
  /** QA only: set a shard straight into place. */
  qaPlace(i: number) { this.scene?.qaPlace(i); },
};
(window as unknown as { __bench: typeof bench }).__bench = bench;

const VIEW_W = 360;
const SHOWCASE = ['t6', 'b5', 'r3', 'b7', 't8', 'r1'];

type Piece = {
  v: number; id: number; img: Phaser.GameObjects.Image; shadow: Phaser.GameObjects.Image;
  home: { x: number; y: number }; target: { x: number; y: number }; turns: number; placed: boolean; radius: number;
};
type Pot = { b: Broken; x: number; y: number; scale: number; seams: { a: number; b: number; img: Phaser.GameObjects.Image; shown: boolean; pts: number[] }[] };

export class BenchScene extends Phaser.Scene {
  level: Level = LEVELS[0];
  private mode: 'menu' | 'play' = 'menu';
  private paused = false;
  private finished = false;
  private acted = false;
  private texSeq = 0;
  private r = 2;
  private viewW = VIEW_W;
  private viewH = 700;
  private pots: Pot[] = [];
  private pieces: Piece[] = [];
  private slips = 0;
  private drag: { p: Piece; dx: number; dy: number; x0: number; y0: number; t0: number; moved: boolean } | null = null;
  private depthSeq = 30;
  private clock = 0;
  private msg = ''; private msgId = 0;
  private endT = -1;
  private fx!: Phaser.GameObjects.Graphics;
  private sparks: { x: number; y: number; vx: number; vy: number; t: number; life: number; c: number; s: number }[] = [];
  private smears: { x: number; y: number; t: number; rot: number }[] = [];
  private hintT = -9; private hintPiece: Piece | null = null;
  private demo: { k: number; wait: number; phase: 'mend' | 'hold' | 'break'; order: number[] } | null = null;
  private demoIdx = 0;
  private tray = { y0: 0, y1: 0 };
  private turnSaid = false;
  /** loose shards lie on the tray smaller than life, and grow to full size when lifted */
  private ts = 1;

  constructor() { super('bench'); }

  create() {
    bench.scene = this;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.down(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.move(p));
    this.input.on('pointerup', () => this.up());
    this.input.on('pointerupoutside', () => this.up());
    this.scale.on('resize', () => this.rebuild(true));
    this.show('menu', LEVELS.find((l) => l.id === SHOWCASE[0])!);
  }
  isMenu() { return this.mode === 'menu'; }
  setPaused(p: boolean) { this.paused = p; if (p) this.cancelDrag(); }
  hudState(): HudState { return { placed: this.pieces.filter((p) => p.placed).length, total: this.pieces.length, slips: this.slips, done: this.finished, msg: this.msg, msgId: this.msgId }; }
  debugState() { return { ...this.hudState(), mode: this.mode, turns: this.pieces.map((p) => p.turns) }; }
  private css(x: number, y: number) { const z = this.cameras.main.zoom, k = (this.game.canvas.clientWidth || VIEW_W) / this.scale.width; return { x: x * z * k, y: y * z * k }; }
  qaShard(i: number) { const p = this.pieces[i]; return p ? { at: this.css(p.img.x, p.img.y), target: this.css(p.target.x, p.target.y), turns: p.turns, placed: p.placed, v: p.v } : null; }
  qaPlace(i: number) { const p = this.pieces[i]; if (p && !p.placed) { p.turns = 0; p.img.setAngle(0); this.settle(p); } }

  show(mode: 'menu' | 'play', level: Level) {
    this.mode = mode;
    this.level = level;
    this.paused = false; this.finished = false; this.acted = false; this.endT = -1;
    this.slips = 0; this.drag = null; this.msg = ''; this.sparks = []; this.smears = []; this.hintPiece = null; this.turnSaid = false;
    this.demo = mode === 'menu' ? { k: 0, wait: 1, phase: 'mend', order: [] } : null;
    this.rebuild(false);
  }
  private say(m: string) { this.msg = m; this.msgId++; }

  // ── layout ────────────────────────────────────────────────────────────
  private tex(prefix: string, c: HTMLCanvasElement) { const k = `${prefix}-${++this.texSeq}`; this.textures.addCanvas(k, c); return k; }
  /** Build the bench. On a resize, pieces keep whether they are placed and how they are turned. */
  private rebuild(keep: boolean) {
    const old = keep ? this.pieces.map((p) => ({ placed: p.placed, turns: p.turns })) : null;
    const stale = this.textures.getTextureKeys().filter((k) => /-\d+$/.test(k));
    this.tweens.killAll();
    this.children.removeAll(true);
    if (stale.length) this.events.once('postrender', () => stale.forEach((k) => this.textures.exists(k) && this.textures.remove(k)));
    const pw = this.scale.width, ph = this.scale.height, dpr = Math.min(2, window.devicePixelRatio || 1);
    const zoom = Math.min(pw / VIEW_W, ph / 620);
    this.r = Math.min(2, Math.max(1, zoom));
    this.viewW = pw / zoom; this.viewH = ph / zoom;
    const css = zoom / dpr, top = (this.mode === 'play' ? 78 : 150) / css, bottom = (this.mode === 'play' ? 96 : 190) / css;
    this.cameras.main.setZoom(zoom).centerOn(this.viewW / 2, this.viewH / 2);
    const l = this.level, m = A.MOODS[l.chapter], r = this.r, n = l.vessels.length;
    // the pots' places: one centred, or two side by side
    const avail = this.viewH - top - bottom, potH = this.mode === 'play' ? avail * 0.47 : avail * 0.9;
    const slotW = Math.min(this.viewW - 30, 330) / n - (n > 1 ? 8 : 0);
    const scales = l.vessels.map((v) => { const s = SHAPES[v.kind]; return Math.min(slotW / s.w, (potH - 10) / (s.h * (1 + s.mouth * 0.9))); });
    const scale = Math.min(...scales);
    const potTop = top + 10;
    this.pots = l.vessels.map((v, k) => {
      const g = geometry(v, scale * r), b = shatter(g);
      const cx = this.viewW / 2 + (n > 1 ? (k - 0.5) * (slotW + 16) : 0);
      const ph2 = g.H / r, y = potTop + (potH - ph2) / 2;
      return { b, x: cx - g.W / r / 2, y, scale, seams: [] };
    });
    const clothY0 = top - 4, clothY1 = potTop + potH + 12;
    this.tray = { y0: clothY1 + 10, y1: this.viewH - bottom - 6 };
    const br = Math.min(1.25, r);
    this.add.image(0, 0, this.tex('bench', A.bench(m, this.viewW, this.viewH, br, [12, clothY0, this.viewW - 24, clothY1 - clothY0], 7 + l.chapter))).setOrigin(0, 0).setScale(1 / br);
    // each pot: its outline, its shards, its gold
    this.pieces = [];
    this.pots.forEach((pot, v) => {
      const b = pot.b, rgba = paint(b);
      this.add.image(pot.x, pot.y, this.tex('ghost', A.ghost(b, m))).setOrigin(0, 0).setScale(1 / r).setDepth(1);
      b.shards.forEach((s) => {
        const key = this.tex('shard', A.shardCanvas(b, rgba, s.id)), w = s.x1 - s.x0, h = s.y1 - s.y0;
        const ox = (s.cx - s.x0) / w, oy = (s.cy - s.y0) / h;
        const shadow = this.add.image(0, 0, key).setOrigin(ox, oy).setScale(1 / r).setTintFill(0x000000).setAlpha(0.32).setDepth(19);
        const img = this.add.image(0, 0, key).setOrigin(ox, oy).setScale(1 / r).setDepth(20);
        const target = { x: pot.x + s.cx / r, y: pot.y + s.cy / r };
        const radius = Math.hypot(w, h) / r / 2;
        this.pieces.push({ v, id: s.id, img, shadow, home: { x: 0, y: 0 }, target, turns: 0, placed: false, radius });
      });
      pot.seams = b.seams.map((s) => {
        const gs = goldSeam(b, s, 1.35 * r, 3 + v);
        const img = this.add.image(pot.x + gs.x0 / r, pot.y + gs.y0 / r, this.tex('gold', A.rgbaCanvas(gs.w, gs.h, gs.data))).setOrigin(0, 0).setScale(1 / r).setAlpha(0).setDepth(12);
        const pts: number[] = []; for (let k = 0; k < s.px.length; k += Math.max(1, Math.floor(s.px.length / 14))) { const p = s.px[k]; pts.push(pot.x + (p % b.g.W) / r, pot.y + Math.floor(p / b.g.W) / r); }
        return { a: s.a, b: s.b, img, shown: false, pts };
      });
    });
    this.scatter(old);
    this.fx = this.add.graphics().setDepth(200);
  }
  /** Lay the loose shards out on the tray, turned as they fell. */
  private scatter(old: { placed: boolean; turns: number }[] | null) {
    const rr = rngFor(this.level.id), W = this.viewW, { y0, y1 } = this.tray;
    const order = this.pieces.map((_, i) => i).sort(() => rr() - 0.5);
    // scale the tray so the pieces fit with room to spare
    const area = this.pieces.reduce((a, p) => { const sh = this.pots[p.v].b.shards[p.id]; return a + sh.area / (this.r * this.r); }, 0);
    this.ts = Math.max(0.42, Math.min(0.9, Math.sqrt(((W - 32) * Math.max(40, y1 - y0) * 0.34) / Math.max(1, area))));
    if (this.mode === 'menu') this.ts = 1;
    const homes: { x: number; y: number; r: number }[] = [];
    for (const i of order) {
      const p = this.pieces[i], pr = p.radius * 0.8 * this.ts;
      let best = { x: W / 2, y: (y0 + y1) / 2 }, bd = -Infinity;
      for (let c = 0; c < 60; c++) {
        const x = 16 + pr + rr() * Math.max(1, W - 32 - 2 * pr), y = y0 + pr * 0.7 + rr() * Math.max(1, y1 - y0 - 1.4 * pr);
        let d = Infinity; for (const h of homes) d = Math.min(d, Math.hypot(h.x - x, h.y - y) - h.r - pr);
        if (d > bd) { bd = d; best = { x, y }; }
        if (bd > 6) break;
      }
      homes.push({ ...best, r: pr });
      p.home = best;
    }
    this.pieces.forEach((p, i) => {
      p.turns = this.level.turn ? Math.floor(rr() * 4) : 0;
      if (this.level.turn && p.turns === 0 && rr() < 0.75) p.turns = 1 + Math.floor(rr() * 3);
      const o = old?.[i];
      if (o) { p.turns = o.turns; if (o.placed) { this.place(p, true); return; } }
      p.img.setPosition(p.home.x, p.home.y).setAngle(p.turns * 90).setScale(this.ts / this.r);
      this.syncShadow(p, 1);
    });
  }
  private syncShadow(p: Piece, lift: number) {
    p.shadow.setVisible(!p.placed).setPosition(p.img.x + 1.5 * lift, p.img.y + 2.5 * lift).setAngle(p.img.angle).setScale(p.img.scaleX, p.img.scaleY).setAlpha(0.22 + 0.06 * lift);
    p.shadow.setDepth(p.img.depth - 1);
  }

  // ── input ─────────────────────────────────────────────────────────────
  private world(p: Phaser.Input.Pointer) { const w = this.cameras.main.getWorldPoint(p.x, p.y); return { x: w.x, y: w.y }; }
  /** Is this world point on the shard's own pixels? */
  private hits(p: Piece, x: number, y: number) {
    const a = -p.img.rotation, dx = x - p.img.x, dy = y - p.img.y, sc = p.img.scaleX;
    const lx = (dx * Math.cos(a) - dy * Math.sin(a)) / sc, ly = (dx * Math.sin(a) + dy * Math.cos(a)) / sc;
    const b = this.pots[p.v].b, s = b.shards[p.id];
    const tx = Math.floor(s.cx + lx), ty = Math.floor(s.cy + ly);
    // a little grace around thin shards: any of the neighbouring pixels will do
    for (const [ox, oy] of [[0, 0], [3, 0], [-3, 0], [0, 3], [0, -3]]) {
      const xx = tx + ox * this.r, yy = ty + oy * this.r;
      if (xx >= 0 && yy >= 0 && xx < b.g.W && yy < b.g.H && b.labels[yy * b.g.W + xx] === p.id) return true;
    }
    return false;
  }
  private down(ptr: Phaser.Input.Pointer) {
    if (this.mode !== 'play' || this.paused || this.finished) return;
    const { x, y } = this.world(ptr);
    const loose = this.pieces.filter((p) => !p.placed).sort((a, b) => b.img.depth - a.img.depth);
    const p = loose.find((q) => this.hits(q, x, y));
    if (!p) return;
    if (!this.acted) { this.acted = true; bench.hooks.onFirstAction?.(); }
    const k = (1.04 / this.r) / p.img.scaleX; // keep the same spot of the shard under the finger as it grows
    this.drag = { p, dx: (p.img.x - x) * k, dy: (p.img.y - y) * k, x0: x, y0: y, t0: this.clock, moved: false };
    p.img.setDepth(++this.depthSeq + 100);
    this.tweens.add({ targets: p.img, scale: (1 / this.r) * 1.04, duration: 160, ease: 'Quad.easeOut', onUpdate: () => this.syncShadow(p, 3) });
    sound.pick();
    bench.hooks.onHaptic?.('light');
  }
  private move(ptr: Phaser.Input.Pointer) {
    const d = this.drag; if (!d) return;
    const { x, y } = this.world(ptr);
    if (!d.moved && Math.hypot(x - d.x0, y - d.y0) > 6) d.moved = true;
    if (d.moved) { d.p.img.setPosition(x + d.dx, y + d.dy - 6); this.syncShadow(d.p, 3); }
  }
  private cancelDrag() {
    const d = this.drag; if (!d) return;
    this.drag = null;
    d.p.img.setScale(this.ts / this.r).setDepth(++this.depthSeq);
    this.tweens.add({ targets: d.p.img, x: d.p.home.x, y: d.p.home.y, duration: 250, onUpdate: () => this.syncShadow(d.p, 1) });
  }
  private up() {
    const d = this.drag; if (!d) return;
    this.drag = null;
    const p = d.p;
    p.img.setDepth(++this.depthSeq);
    if (!d.moved) {
      if (p.img.y > this.tray.y0 - 20) this.tweens.add({ targets: p.img, scale: this.ts / this.r, duration: 160, onUpdate: () => this.syncShadow(p, 1) });
      // a tap turns the shard a quarter
      if (this.level.turn) {
        p.turns = (p.turns + 1) % 4;
        this.tweens.add({ targets: p.img, angle: p.img.angle + 90, duration: 220, ease: 'Back.easeOut', onUpdate: () => this.syncShadow(p, 1), onComplete: () => p.img.setAngle(p.turns * 90) });
        sound.turn();
      } else this.tweens.add({ targets: p.img, angle: { from: -4, to: 0 }, duration: 260, ease: 'Elastic.easeOut' });
      return;
    }
    this.drop(p);
  }
  /** Judge where a shard was let go. */
  private drop(p: Piece) {
    const { x, y } = p.img, t = p.target, pot = this.pots[p.v];
    const near = Math.hypot(x - t.x, y - t.y) < Math.max(14, pot.scale * 0.085);
    if (near && p.turns === 0) { this.settle(p); return; }
    if (near) {
      // right place, wrong way round: no harm done
      if (!this.turnSaid) { this.say('Right place. Tap the shard to turn it.'); this.turnSaid = true; }
      this.tweens.add({ targets: p.img, scale: 1 / this.r, angle: { from: p.img.angle - 5, to: p.img.angle }, duration: 300, ease: 'Elastic.easeOut' });
      this.syncShadow(p, 1); sound.nearly();
      return;
    }
    // dropped on a pot: lacquer spills
    const onPot = this.pots.some((q) => { const lx = Math.floor((x - q.x) * this.r), ly = Math.floor((y - q.y) * this.r); return lx >= 0 && ly >= 0 && lx < q.b.g.W && ly < q.b.g.H && q.b.labels[ly * q.b.g.W + lx] >= 0; });
    if (onPot) {
      this.slips++;
      this.smears.push({ x, y, t: 0, rot: Math.random() * 6 });
      sound.slip(); bench.hooks.onHaptic?.('warning');
      if (this.slips === 1) this.say('Lacquer spilled. Look for where its edges match.');
      this.tweens.add({ targets: p.img, x: p.home.x, y: p.home.y, scale: this.ts / this.r, duration: 420, ease: 'Cubic.easeInOut', onUpdate: () => this.syncShadow(p, 1) });
      return;
    }
    // dropped on the tray: it simply rests there
    p.home = { x: Math.max(10, Math.min(this.viewW - 10, x)), y: Math.max(this.tray.y0 - 20, Math.min(this.viewH - 30, y)) };
    this.tweens.add({ targets: p.img, x: p.home.x, y: p.home.y, scale: this.ts / this.r, duration: 160, onUpdate: () => this.syncShadow(p, 1) });
    sound.put();
  }
  /** The shard slides home and holds; any seam it closes fills with gold. */
  private settle(p: Piece) {
    p.placed = true;
    p.img.setDepth(10);
    p.shadow.setVisible(false);
    this.tweens.add({ targets: p.img, x: p.target.x, y: p.target.y, angle: 0, scale: 1 / this.r, duration: 180, ease: 'Quad.easeOut', onComplete: () => this.place(p, false) });
    sound.click(this.pieces.filter((q) => q.placed).length, this.pieces.length);
    bench.hooks.onHaptic?.('medium');
  }
  private place(p: Piece, quiet: boolean) {
    p.placed = true;
    p.img.setPosition(p.target.x, p.target.y).setAngle(0).setDepth(10);
    p.shadow.setVisible(false);
    const pot = this.pots[p.v];
    for (const s of pot.seams) {
      if (s.shown) continue;
      const a = this.pieces.find((q) => q.v === p.v && q.id === s.a)!, b = this.pieces.find((q) => q.v === p.v && q.id === s.b)!;
      if (!a.placed || !b.placed) continue;
      s.shown = true;
      if (quiet) { s.img.setAlpha(1); continue; }
      this.tweens.add({ targets: s.img, alpha: 1, duration: 700, ease: 'Sine.easeOut' });
      if (!this.reduced()) for (let k = 0; k < s.pts.length; k += 2) this.sparks.push({ x: s.pts[k], y: s.pts[k + 1], vx: (Math.random() - 0.5) * 14, vy: -6 - Math.random() * 14, t: -k * 0.012, life: 0.9, c: 0xffe39a, s: 0.6 + Math.random() * 0.5 });
      sound.gold();
    }
    if (!quiet && this.pieces.every((q) => q.placed) && this.endT < 0) this.complete();
  }
  private complete() {
    this.endT = this.clock;
    sound.finish(starsFor(this.slips)); bench.hooks.onHaptic?.('success');
    // a slow glint runs over the gold
    if (!this.reduced()) for (const pot of this.pots) for (const s of pot.seams) for (let k = 0; k < s.pts.length; k += 2) {
      const d = (s.pts[k + 1] - pot.y) / 160 + (s.pts[k] - pot.x) / 400;
      this.sparks.push({ x: s.pts[k], y: s.pts[k + 1], vx: 0, vy: -4, t: -0.5 - d, life: 0.8, c: 0xffffff, s: 1.1 });
    }
  }
  hint() {
    if (this.finished || this.mode !== 'play') return;
    const loose = this.pieces.filter((p) => !p.placed);
    if (!loose.length) return;
    // the shard that fits best now: one touching a placed shard if any
    const touching = loose.find((p) => this.pots[p.v].seams.some((s) => (s.a === p.id || s.b === p.id) && this.pieces.some((q) => q.v === p.v && q.placed && (q.id === s.a || q.id === s.b))));
    this.hintPiece = touching ?? loose[0]; this.hintT = this.clock;
    this.slips++;
    sound.hint();
  }

  // ── each frame ───────────────────────────────────────────────────────
  update(_t: number, dms: number) {
    const dt = Math.min(0.05, dms / 1000);
    this.clock += dt;
    if (this.mode === 'menu') this.runDemo(dt);
    if (this.endT >= 0 && !this.finished && this.mode === 'play' && this.clock - this.endT > 2.2) {
      this.finished = true;
      bench.hooks.onFinish?.({ level: this.level, result: { slips: this.slips, stars: starsFor(this.slips), shards: this.pieces.length } });
    }
    this.draw(dt);
  }
  private reduced() { return bench.reducedMotion; }
  private draw(dt: number) {
    const g = this.fx; g.clear();
    // spilled lacquer, drying away
    this.smears = this.smears.filter((s) => (s.t += dt) < 2.4);
    for (const s of this.smears) {
      const a = Math.min(1, s.t * 6) * (1 - Math.max(0, s.t - 1.4));
      g.fillStyle(0x5a1a10, 0.55 * a); g.fillEllipse(s.x, s.y, 16, 10);
      g.fillStyle(0x8a2a18, 0.5 * a); g.fillCircle(s.x + Math.cos(s.rot) * 9, s.y + Math.sin(s.rot) * 6, 2.6); g.fillCircle(s.x - Math.cos(s.rot) * 7, s.y + 6, 1.8);
      g.fillStyle(0xffffff, 0.3 * a); g.fillEllipse(s.x - 3, s.y - 2, 5, 2);
    }
    // the hint: the shard and its place glow for a moment
    const hp = this.hintPiece, he = this.clock - this.hintT;
    if (hp && he < 2.6 && !hp.placed) {
      const a = Math.sin(Math.min(1, he / 2.6) * Math.PI) * (0.6 + 0.4 * Math.sin(he * 10));
      g.lineStyle(2, 0xf6d27a, a); g.strokeCircle(hp.img.x, hp.img.y, hp.radius * 0.85 * hp.img.scaleX * this.r);
      g.lineStyle(2, 0xf6d27a, a * 0.8); g.strokeCircle(hp.target.x, hp.target.y, 10 + 4 * Math.sin(he * 6)); g.fillStyle(0xf6d27a, a * 0.5); g.fillCircle(hp.target.x, hp.target.y, 4);
    } else this.hintPiece = null;
    this.sparks = this.sparks.filter((s) => (s.t += dt) < s.life);
    for (const s of this.sparks) {
      if (s.t < 0) continue;
      s.x += s.vx * dt; s.y += s.vy * dt;
      const e = s.t / s.life, a = Math.sin(e * Math.PI);
      g.fillStyle(s.c, a * 0.9); g.fillCircle(s.x, s.y, s.s * (1.4 - e * 0.6));
      if (s.s > 1) { g.lineStyle(1, 0xffffff, a * 0.7); g.lineBetween(s.x - 4 * a, s.y, s.x + 4 * a, s.y); g.lineBetween(s.x, s.y - 4 * a, s.x, s.y + 4 * a); }
    }
  }

  // ── attract mode: a pot mends itself, rests, and breaks again ──────────
  private runDemo(dt: number) {
    const d = this.demo; if (!d) return;
    d.wait -= dt;
    if (d.wait > 0) return;
    if (d.phase === 'mend') {
      if (!d.order.length) d.order = this.pieces.map((_, i) => i).sort((a, b) => this.pieces[a].target.y - this.pieces[b].target.y);
      if (d.k >= d.order.length) { d.phase = 'hold'; d.wait = 3.4; return; }
      const p = this.pieces[d.order[d.k++]];
      p.img.setDepth(++this.depthSeq + 100);
      this.tweens.add({ targets: p.img, x: p.target.x, y: p.target.y, angle: 0, scale: 1 / this.r, duration: 650, ease: 'Cubic.easeInOut', onUpdate: () => this.syncShadow(p, 2), onComplete: () => { this.place(p, false); sound.click(d.k, this.pieces.length); } });
      d.wait = 0.75;
      return;
    }
    if (d.phase === 'hold') {
      d.phase = 'break'; d.wait = 1.6;
      // the pot breaks: shards spring apart and fall
      for (const pot of this.pots) for (const s of pot.seams) this.tweens.add({ targets: s.img, alpha: 0, duration: 300 });
      for (const p of this.pieces) {
        const cx = this.pots[p.v].x + this.pots[p.v].b.g.W / this.r / 2, ang = Math.atan2(p.target.y - (this.pots[p.v].y + 60), p.target.x - cx);
        p.placed = false; p.shadow.setVisible(true);
        this.tweens.add({ targets: p.img, x: p.img.x + Math.cos(ang) * 40, y: p.img.y + Math.sin(ang) * 30 + 30, angle: (Math.random() - 0.5) * 80, alpha: 0, duration: 1100, ease: 'Cubic.easeIn', onUpdate: () => this.syncShadow(p, 1) });
      }
      if (!this.reduced()) sound.shatter();
      return;
    }
    this.demoIdx = (this.demoIdx + 1) % SHOWCASE.length;
    this.show('menu', LEVELS.find((l) => l.id === SHOWCASE[this.demoIdx])!);
  }
}

function rngFor(id: string) { let h = 7; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0; let s = h || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

export function startGame(parent: HTMLElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#1b1512',
    scale: { mode: Phaser.Scale.NONE, width: parent.clientWidth * dpr, height: parent.clientHeight * dpr, zoom: 1 / dpr },
    render: { antialias: true, pixelArt: false, powerPreference: 'high-performance' },
    audio: { noAudio: true },
    fps: { target: 60, smoothStep: false },
    input: { activePointers: 1 },
    scene: [BenchScene],
    banner: false,
  });
  const onResize = () => {
    const d = Math.min(window.devicePixelRatio || 1, 2);
    game.scale.setZoom(1 / d);
    game.scale.resize(parent.clientWidth * d, parent.clientHeight * d);
  };
  window.addEventListener('resize', onResize);
  return () => { window.removeEventListener('resize', onResize); game.destroy(true); };
}
