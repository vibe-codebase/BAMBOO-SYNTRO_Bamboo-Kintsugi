/**
 * Kintsugi sound, synthesised with Web Audio: a breathy bamboo flute and a koto over a low drone; a kettle
 * simmering in the tea house, a wind chime by the porcelain, the tick of the kiln cooling; and for the work
 * itself, porcelain clinks (inharmonic partials, quickly damped), the soft tok of a shard settling, a bright
 * shimmer as a seam fills with gold, and a singing bowl when the pot is whole.
 */
const semis = (root: number, n: number) => root * Math.pow(2, n / 12);
const SCALE = [0, 2, 3, 7, 8, 12, 14, 15, 19, 20, 24]; // miyako-bushi
const ROOTS = [220, 196, 174.61];

export class Sound {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private music!: GainNode;
  private sfx!: GainNode;
  private verb!: ConvolverNode;
  private noise!: AudioBuffer;
  private amb: GainNode | null = null;
  private timer: number | null = null;
  private next = 0;
  private beatN = 0;
  private chapter = 0;
  private seed = 13;
  private musicVol = 0.6;
  private sfxVol = 0.8;
  private ducked = false;
  private phrase = 4;
  private strings = new Map<number, AudioBuffer>();

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      this.ctx = ctx;
      this.master = ctx.createGain(); this.master.gain.value = 0.9;
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3;
      this.master.connect(comp).connect(ctx.destination);
      this.music = ctx.createGain(); this.sfx = ctx.createGain();
      this.verb = ctx.createConvolver(); this.verb.buffer = this.impulse(3);
      const wet = ctx.createGain(); wet.gain.value = 0.32;
      this.verb.connect(wet).connect(this.master);
      this.music.connect(this.master); this.music.connect(this.verb);
      this.sfx.connect(this.master); this.sfx.connect(this.verb);
      this.noise = this.makeNoise();
      // the room: a kettle on the brazier, or the kiln's breath
      const src = ctx.createBufferSource(); src.buffer = this.noise; src.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.6;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.13; const lg = ctx.createGain(); lg.gain.value = 0.006;
      this.amb = ctx.createGain(); this.amb.gain.value = 0.012;
      lfo.connect(lg).connect(this.amb.gain); lfo.start();
      src.connect(bp).connect(this.amb).connect(this.music); src.start();
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }
  setVolumes(music: number, sfx: number) { this.musicVol = music; this.sfxVol = sfx; this.applyVolumes(); }
  private applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.music.gain.setTargetAtTime(this.musicVol * 0.55 * (this.ducked ? 0.55 : 1), t, 0.25);
    this.sfx.gain.setTargetAtTime(this.sfxVol, t, 0.05);
  }
  duck(on: boolean) { this.ducked = on; this.applyVolumes(); }
  suspend() { void this.ctx?.suspend(); }
  resume() { if (this.ctx?.state === 'suspended') void this.ctx.resume(); }

  startMusic(chapter: number) {
    if (!this.ctx) return;
    if (this.timer !== null && chapter === this.chapter) return;
    this.chapter = chapter;
    this.next = this.ctx.currentTime + 0.4;
    if (this.timer === null) this.timer = window.setInterval(() => this.schedule(), 150);
  }
  private rnd() { this.seed = (this.seed * 9301 + 49297) % 233280; return this.seed / 233280; }
  private schedule() {
    const ctx = this.ctx!;
    const step = 60 / 60 / 2;
    const root = ROOTS[this.chapter % 3];
    while (this.next < ctx.currentTime + 0.8) {
      const t = this.next, pos = this.beatN % 32;
      if (pos === 0) { this.drone(t, root / 2, step * 32); this.phrase = 3 + Math.floor(this.rnd() * 4); }
      if (pos === 2 || (pos === 18 && this.rnd() < 0.5)) {
        // a flute phrase: two or three long breaths
        let tt = t;
        for (let k = 0; k < 2 + Math.floor(this.rnd() * 2); k++) {
          this.phrase = Math.max(2, Math.min(SCALE.length - 2, this.phrase + Math.floor(this.rnd() * 5) - 2));
          const d = step * (2 + Math.floor(this.rnd() * 3));
          this.flute(tt, semis(root * 2, SCALE[this.phrase]), d * 0.95);
          tt += d;
        }
      }
      if (pos % 4 === 0 && pos > 8 && this.rnd() < 0.45) this.koto(t, semis(root, SCALE[Math.floor(this.rnd() * 6)]), 0.05, this.music);
      if (this.chapter === 0 && this.rnd() < 0.008) this.bird(t);
      if (this.chapter === 1 && this.rnd() < 0.012) this.chime(t);
      if (this.chapter === 2 && this.rnd() < 0.06) this.crackle(t);
      this.next += step; this.beatN++;
    }
  }
  private drone(t: number, f: number, dur: number) {
    const ctx = this.ctx!;
    for (const [m, v] of [[1, 0.026], [1.5, 0.01], [2, 0.008]] as const) {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f * m;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + dur * 0.35); g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.music); o.start(t); o.stop(t + dur + 0.1);
    }
  }
  /** Shakuhachi-ish: a sine with slow vibrato and a breath of filtered noise, swelling and falling. */
  private flute(t: number, f: number, dur: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(), g = ctx.createGain(), vib = ctx.createOscillator(), vg = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f * 0.985, t); o.frequency.linearRampToValueAtTime(f, t + 0.25);
    vib.frequency.value = 4.6; vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(f * 0.008, t + dur * 0.6);
    vib.connect(vg).connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.03, t + 0.18); g.gain.linearRampToValueAtTime(0.022, t + dur * 0.7); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.music); o.start(t); o.stop(t + dur + 0.05); vib.start(t); vib.stop(t + dur + 0.05);
    const src = ctx.createBufferSource(); src.buffer = this.noise;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 2; bp.Q.value = 6;
    const ng = ctx.createGain(); ng.gain.setValueAtTime(0.0001, t); ng.gain.linearRampToValueAtTime(0.02, t + 0.1); ng.gain.linearRampToValueAtTime(0.004, t + 0.5); ng.gain.linearRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(ng).connect(this.music); src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }
  private koto(t: number, f: number, vol: number, bus: GainNode) {
    const ctx = this.ctx!;
    const key = Math.round(f * 10);
    let buf = this.strings.get(key);
    if (!buf) {
      const sr = ctx.sampleRate, n = Math.floor(sr * 1.8), period = Math.round(sr / f);
      buf = ctx.createBuffer(1, n, sr);
      const d = buf.getChannelData(0);
      for (let i = 0; i < period; i++) d[i] = (i < period / 3 ? 1 : -0.5) * (0.6 + Math.random() * 0.4) * 0.7;
      for (let i = period; i < n; i++) d[i] = 0.4975 * (d[i - period] + d[i - period + 1]);
      this.strings.set(key, buf);
    }
    const src = ctx.createBufferSource(); src.buffer = buf;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 4000;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(lp).connect(g).connect(bus); src.start(t);
  }
  /** A struck piece of porcelain or a bell: inharmonic partials, each fading at its own rate. */
  private bell(t: number, f: number, vol: number, bus: GainNode, dur = 1.6, ratios = [1, 2.76, 5.4, 8.93]) {
    const ctx = this.ctx!;
    ratios.forEach((m, k) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f * m;
      const d = dur / (1 + k * 1.2);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol / (1 + k * 0.7), t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(bus); o.start(t); o.stop(t + d + 0.02);
    });
  }
  private bird(t: number) {
    const ctx = this.ctx!;
    const f = 2400 + this.rnd() * 1600;
    for (let k = 0; k < 3; k++) {
      const o = ctx.createOscillator(), g = ctx.createGain(), s = t + k * 0.12;
      o.type = 'sine'; o.frequency.setValueAtTime(f, s); o.frequency.exponentialRampToValueAtTime(f * (k % 2 ? 0.8 : 1.25), s + 0.08);
      g.gain.setValueAtTime(0.0001, s); g.gain.linearRampToValueAtTime(0.008, s + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, s + 0.09);
      o.connect(g).connect(this.music); o.start(s); o.stop(s + 0.1);
    }
  }
  private chime(t: number) { for (let k = 0; k < 3; k++) this.bell(t + k * (0.15 + this.rnd() * 0.2), 1200 + this.rnd() * 900, 0.012, this.music, 2.4, [1, 2.4, 4.1]); }
  private crackle(t: number) { this.hiss(t, 0.02, 0.012 + this.rnd() * 0.01, 2500 + this.rnd() * 2000, 2, this.music); }
  private hiss(t: number, dur: number, vol: number, freq: number, q = 1, bus?: GainNode) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource(); src.buffer = this.noise;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = q; bp.frequency.value = freq;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.01, dur / 4)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(g).connect(bus ?? this.sfx); src.start(t, Math.random()); src.stop(t + dur + 0.05);
    return bp;
  }
  private thump(t: number, f: number, vol: number, dur = 0.12) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f * 1.5, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.04);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.sfx); o.start(t); o.stop(t + dur + 0.02);
  }
  tap() { if (this.ctx) this.koto(this.ctx.currentTime, 659.25, 0.05, this.sfx); }
  /** Picking a shard up: a light clink. */
  pick() { if (this.ctx) { const t = this.ctx.currentTime; this.bell(t, 2600 + Math.random() * 500, 0.02, this.sfx, 0.25); this.hiss(t, 0.03, 0.03, 4000, 3); } }
  turn() { if (this.ctx) { const t = this.ctx.currentTime; this.hiss(t, 0.06, 0.04, 2400, 2); this.bell(t + 0.04, 3100, 0.012, this.sfx, 0.18); } }
  put() { if (this.ctx) { const t = this.ctx.currentTime; this.thump(t, 300, 0.05, 0.06); this.bell(t, 2200 + Math.random() * 400, 0.015, this.sfx, 0.2); } }
  nearly() { if (this.ctx) { const t = this.ctx.currentTime; this.bell(t, 1800, 0.025, this.sfx, 0.3); this.bell(t + 0.07, 1700, 0.02, this.sfx, 0.3); } }
  /** A shard dropped in the wrong place: a dull clack and a smear of lacquer. */
  slip() { if (this.ctx) { const t = this.ctx.currentTime; this.thump(t, 140, 0.12, 0.14); this.hiss(t, 0.12, 0.04, 700, 1.2); } }
  /** A shard settles home: a soft tok, and a note that climbs as the pot comes together. */
  click(n: number, total: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, root = ROOTS[this.chapter % 3] * 2;
    this.thump(t, 420, 0.08, 0.05); this.bell(t, 3000, 0.02, this.sfx, 0.15);
    const deg = Math.min(SCALE.length - 1, Math.round((n / Math.max(1, total)) * 8));
    this.koto(t + 0.04, semis(root, SCALE[deg]), 0.07, this.sfx);
  }
  /** A seam fills with gold: a bright, quick shimmer. */
  gold() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.12;
    for (let k = 0; k < 4; k++) this.bell(t + k * 0.05, 2600 + k * 380 + Math.random() * 100, 0.008, this.sfx, 0.7, [1, 2.2]);
  }
  hint() { if (this.ctx) { const t = this.ctx.currentTime; this.bell(t, 880, 0.03, this.sfx, 1.2); } }
  shatter() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (let k = 0; k < 7; k++) this.bell(t + k * 0.03 + Math.random() * 0.03, 1800 + Math.random() * 2600, 0.015, this.sfx, 0.35);
    this.hiss(t, 0.3, 0.04, 3200, 0.8);
  }
  /** The pot is whole: a singing bowl, and a rising koto figure. */
  finish(stars: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, root = ROOTS[this.chapter % 3];
    this.bell(t + 0.1, root, 0.09, this.sfx, 5, [1, 2.71, 5.15]);
    [0, 2, 4, 5, 7].slice(0, 2 + stars).forEach((d, i) => this.koto(t + 0.35 + i * 0.14, semis(root * 2, SCALE[d]), 0.09, this.sfx));
  }
  star(i: number) { if (this.ctx) this.bell(this.ctx.currentTime, [880, 1046.5, 1318.5][i] ?? 1318.5, 0.03, this.sfx, 1.2); }

  private makeNoise() {
    const ctx = this.ctx!;
    const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  private impulse(seconds: number) {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    return b;
  }
}
export const sound = new Sound();
