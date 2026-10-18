// Store icon, adaptive-icon layers and splash: a tea bowl mended with gold, in lamplight on dark wood.
import * as A from '../src/game/art';
import { geometry, goldSeam, paint, shatter, SHAPES, type VesselSpec } from '../src/game/vessel';

function pot(spec: VesselSpec, width: number) {
  const S = width / SHAPES[spec.kind].w, g = geometry(spec, S), b = shatter(g), rgba = paint(b);
  const { c, g: ctx } = A.canvas(g.W, g.H);
  ctx.drawImage(A.rgbaCanvas(g.W, g.H, rgba), 0, 0);
  for (const s of b.seams) { const gs = goldSeam(b, s, S * 0.0075, 3); ctx.drawImage(A.rgbaCanvas(gs.w, gs.h, gs.data), gs.x0, gs.y0); }
  return c;
}
function ground(g: CanvasRenderingContext2D, W: number, H: number, cy: number) {
  const bg = g.createRadialGradient(W / 2, cy, 0, W / 2, cy, Math.max(W, H) * 0.75);
  bg.addColorStop(0, '#4a3628'); bg.addColorStop(0.55, '#24170f'); bg.addColorStop(1, '#0d0806');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
}
function shadow(g: CanvasRenderingContext2D, x: number, y: number, w: number) {
  const sh = g.createRadialGradient(x, y, 0, x, y, w / 2);
  sh.addColorStop(0, 'rgba(0,0,0,0.55)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
  g.save(); g.translate(x, y); g.scale(1, 0.16); g.translate(-x, -y); g.fillStyle = sh; g.beginPath(); g.arc(x, y, w / 2, 0, Math.PI * 2); g.fill(); g.restore();
}
const BOWL: VesselSpec = { kind: 'chawan', glaze: 'tenmoku', pattern: 'none', shards: 6, seed: 23 };
export function icon() {
  const { c, g } = A.canvas(1024, 1024);
  ground(g, 1024, 1024, 520);
  const p = pot(BOWL, 760);
  shadow(g, 512, 520 + p.height / 2 - 18, 640);
  g.drawImage(p, 512 - p.width / 2, 540 - p.height / 2);
  return c;
}
export function adaptive() {
  const { c, g } = A.canvas(1024, 1024);
  const p = pot(BOWL, 560);
  shadow(g, 512, 512 + p.height / 2 - 14, 480);
  g.drawImage(p, 512 - p.width / 2, 525 - p.height / 2);
  return c;
}
export function adaptiveBg() { const { c, g } = A.canvas(1024, 1024); ground(g, 1024, 1024, 512); return c; }
export function splash() {
  const W = 1284, H = 2778, { c, g } = A.canvas(W, H);
  g.drawImage(A.bench(A.MOODS[0], W / 3, H / 3, 1, [40, 780 / 3, W / 3 - 80, 1250 / 3], 7), 0, 0, W, H);
  const p = pot({ kind: 'vase', glaze: 'celadon', pattern: 'bands', shards: 7, seed: 61 }, 560);
  shadow(g, W / 2, 1290 + p.height / 2 - 20, 520);
  g.drawImage(p, W / 2 - p.width / 2, 1300 - p.height / 2);
  g.textAlign = 'center'; g.font = '700 210px "Shippori Mincho", serif';
  const tg = g.createLinearGradient(0, 380, 0, 600); tg.addColorStop(0, '#fff3cf'); tg.addColorStop(0.55, '#e8b85a'); tg.addColorStop(1, '#a8742e');
  g.save(); g.shadowColor = 'rgba(10,6,4,0.8)'; g.shadowBlur = 40; g.fillStyle = tg; g.fillText('Kintsugi', W / 2, 560); g.restore();
  g.font = '500 58px Outfit, sans-serif'; g.fillStyle = '#e8b85a'; try { g.letterSpacing = '34px'; } catch { /* */ } g.fillText('BAMBOO', W / 2 + 17, 330); try { g.letterSpacing = '0px'; } catch { /* */ }
  return c;
}
/** The Play Store feature graphic: a tea bowl mended with gold in lamplight on the right, the name in gold at the left. */
export function feature() {
  const W = 1024, H = 500, { c, g } = A.canvas(W, H);
  const bg = g.createRadialGradient(760, 260, 0, 760, 260, 620);
  bg.addColorStop(0, '#5a4230'); bg.addColorStop(0.5, '#24170f'); bg.addColorStop(1, '#0d0806');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const p = pot(BOWL, 330);
  shadow(g, 790, 262 + p.height / 2 - 8, 300);
  g.drawImage(p, 790 - p.width / 2, 270 - p.height / 2);
  const shade = g.createLinearGradient(0, 0, 560, 0); shade.addColorStop(0, 'rgba(10,6,4,0.85)'); shade.addColorStop(0.75, 'rgba(10,6,4,0.45)'); shade.addColorStop(1, 'rgba(10,6,4,0)');
  g.fillStyle = shade; g.fillRect(0, 0, 560, H);
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.font = '500 22px Outfit, sans-serif'; g.fillStyle = '#e8b85a'; try { g.letterSpacing = '13px'; } catch { /* */ } g.fillText('BAMBOO', 58, 116); try { g.letterSpacing = '0px'; } catch { /* */ }
  const tg = g.createLinearGradient(0, 140, 0, 230); tg.addColorStop(0, '#fff3cf'); tg.addColorStop(0.55, '#e8b85a'); tg.addColorStop(1, '#a8742e');
  g.save(); g.shadowColor = 'rgba(10,6,4,0.8)'; g.shadowBlur = 20; g.fillStyle = tg; g.font = '700 112px "Shippori Mincho", serif'; g.fillText('Kintsugi', 48, 226); g.restore();
  g.fillStyle = '#e8b85a'; g.fillRect(58, 256, 52, 3);
  g.fillStyle = 'rgba(251,240,220,0.95)'; g.font = '500 27px Outfit, sans-serif'; g.fillText('Mend every crack with gold.', 58, 304);
  g.fillStyle = 'rgba(251,240,220,0.78)'; g.font = '400 19px Outfit, sans-serif'; g.fillText('24 broken pots · celadon, tenmoku and raku', 58, 342);
  return c;
}
(window as unknown as { brand: unknown }).brand = { icon, adaptive, adaptiveBg, splash, feature };
