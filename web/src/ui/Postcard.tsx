import { useEffect, useRef } from 'react';
import { canvas, rgbaCanvas, shardCanvas } from '../game/art';
import type { Level } from '../game/levels';
import { geometry, goldSeam, paint, shatter, SHAPES } from '../game/vessel';

const cache = new Map<string, HTMLCanvasElement>();
const queue: (() => void)[] = [];
let busy = false;
function pump() {
  if (busy) return;
  const job = queue.shift();
  if (!job) return;
  busy = true;
  window.setTimeout(() => { try { job(); } finally { busy = false; pump(); } }, 16);
}

/** A pot on a dark ground: mended with gold once finished, still in pieces before. */
function paintCard(level: Level, mended: boolean, w: number, h: number, dpr: number) {
  const { c, g } = canvas(w * dpr, h * dpr);
  g.save(); g.beginPath(); g.roundRect(0, 0, w * dpr, h * dpr, 9 * dpr); g.clip();
  const bg = g.createRadialGradient(w * dpr / 2, h * dpr * 0.45, 0, w * dpr / 2, h * dpr * 0.45, w * dpr);
  bg.addColorStop(0, ['#3b2c22', '#24304a', '#33251f'][level.chapter]); bg.addColorStop(1, '#120d0a');
  g.fillStyle = bg; g.fillRect(0, 0, w * dpr, h * dpr);
  const n = level.vessels.length, slot = (w * dpr * 0.84) / n;
  level.vessels.forEach((v, k) => {
    const sh = SHAPES[v.kind], S = Math.min(slot / sh.w, (h * dpr * 0.72) / (sh.h * (1 + sh.mouth))) * 0.92;
    const geo = geometry(v, S), b = shatter(geo), rgba = paint(b);
    const ox = w * dpr * 0.08 + slot * k + (slot - geo.W) / 2, oy = (h * dpr - geo.H) / 2;
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(ox + geo.W / 2, oy + geo.H - 2, geo.W * 0.36, geo.H * 0.04, 0, 0, Math.PI * 2); g.fill();
    if (mended) {
      g.drawImage(rgbaCanvas(geo.W, geo.H, rgba), ox, oy);
      for (const s of b.seams) { const gs = goldSeam(b, s, Math.max(0.6, S * 0.0045), 3); g.drawImage(rgbaCanvas(gs.w, gs.h, gs.data), ox + gs.x0, oy + gs.y0); }
    } else {
      // pieces drawn a little apart, as if just broken
      const cx = geo.W / 2, cy = geo.H * 0.5;
      for (const s of b.shards) {
        const dx = (s.cx - cx) * 0.12, dy = (s.cy - cy) * 0.1 + 2;
        g.globalAlpha = 0.9; g.drawImage(shardCanvas(b, rgba, s.id), ox + s.x0 + dx, oy + s.y0 + dy); g.globalAlpha = 1;
      }
    }
  });
  g.restore();
  return c;
}

export function Postcard({ level, mended, locked, width }: { level: Level; mended: boolean; locked: boolean; width: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const height = Math.round(width * 1.12);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const key = `${level.id}|${mended}|${locked}|${width}|${dpr}`;
    let live = true;
    const show = (src: HTMLCanvasElement) => { if (!live) return; el.width = src.width; el.height = src.height; el.getContext('2d')!.drawImage(src, 0, 0); };
    const hit = cache.get(key);
    if (hit) show(hit);
    else { queue.push(() => { if (!live) return; const src = paintCard(level, mended && !locked, width, height, dpr); cache.set(key, src); show(src); }); pump(); }
    return () => { live = false; };
  }, [level, mended, locked, width, height]);
  return <canvas ref={ref} className="postcard" style={{ width, height }} aria-hidden />;
}
