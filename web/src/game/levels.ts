import type { VesselSpec } from './vessel';

export type Level = { id: string; name: string; chapter: number; vessels: VesselSpec[]; turn: boolean; hint?: string };

export const CHAPTERS = [
  { name: 'Tea House', blurb: 'Tea bowls and jars in quiet glazes. Fit each shard back where it broke from.' },
  { name: 'Blue and White', blurb: 'Painted porcelain. The shards have turned as they fell: tap one to turn it.' },
  { name: 'Raku Fire', blurb: 'Fire-crackled raku and red copper glaze. Some days two pots break together.' },
];

const V = (kind: VesselSpec['kind'], glaze: VesselSpec['glaze'], pattern: VesselSpec['pattern'], shards: number, seed: number): VesselSpec => ({ kind, glaze, pattern, shards, seed });

type Draft = Omit<Level, 'chapter'>;
const TEA: Draft[] = [
  { id: 't1', name: 'First Bowl', turn: false, vessels: [V('chawan', 'celadon', 'none', 3, 11)], hint: 'Drag each shard onto the outline, where it broke from. Set it right and it holds.' },
  { id: 't2', name: 'Tenmoku', turn: false, vessels: [V('bowl', 'tenmoku', 'none', 4, 23)], hint: 'Mend with a steady hand: a shard dropped in the wrong place spills lacquer.' },
  { id: 't3', name: 'Yunomi', turn: false, vessels: [V('cup', 'shino', 'grass', 4, 31)] },
  { id: 't4', name: 'Ash Jar', turn: false, vessels: [V('tsubo', 'ash', 'none', 5, 47)] },
  { id: 't5', name: 'Morning Tea', turn: false, vessels: [V('chawan', 'shino', 'brush', 5, 53)] },
  { id: 't6', name: 'Flower Vase', turn: false, vessels: [V('vase', 'celadon', 'bands', 6, 61)] },
  { id: 't7', name: 'Sake Bottle', turn: false, vessels: [V('bottle', 'tenmoku', 'none', 6, 73)] },
  { id: 't8', name: 'Old Jar', turn: false, vessels: [V('jar', 'ash', 'none', 7, 89)] },
];
const BLUE: Draft[] = [
  { id: 'b1', name: 'Waves', turn: true, vessels: [V('chawan', 'porcelain', 'waves', 4, 101)], hint: 'Tap a shard to turn it. It only fits the right way up.' },
  { id: 'b2', name: 'Plum Blossom', turn: true, vessels: [V('cup', 'porcelain', 'plum', 5, 113)] },
  { id: 'b3', name: 'Rain', turn: true, vessels: [V('dish', 'porcelain', 'dots', 5, 127)] },
  { id: 'b4', name: 'Lattice', turn: true, vessels: [V('jar', 'porcelain', 'lattice', 6, 131)] },
  { id: 'b5', name: 'Summer Grass', turn: true, vessels: [V('vase', 'porcelain', 'grass', 6, 149)] },
  { id: 'b6', name: 'Three Bands', turn: true, vessels: [V('bowl', 'porcelain', 'bands', 7, 151)] },
  { id: 'b7', name: 'Sea Waves', turn: true, vessels: [V('tsubo', 'porcelain', 'waves', 8, 163)] },
  { id: 'b8', name: 'Plum Bottle', turn: true, vessels: [V('bottle', 'porcelain', 'plum', 9, 173)] },
];
const RAKU: Draft[] = [
  { id: 'r1', name: 'Raku', turn: true, vessels: [V('chawan', 'raku', 'none', 6, 211)] },
  { id: 'r2', name: 'Two Cups', turn: true, vessels: [V('cup', 'raku', 'none', 3, 223), V('cup', 'copper', 'none', 3, 227)], hint: 'Two pots broke together. Each shard belongs to only one of them.' },
  { id: 'r3', name: 'Oxblood', turn: true, vessels: [V('tsubo', 'copper', 'none', 7, 233)] },
  { id: 'r4', name: 'Oribe', turn: true, vessels: [V('cup', 'oribe', 'lattice', 4, 241), V('chawan', 'oribe', 'none', 4, 251)] },
  { id: 'r5', name: 'Smoke', turn: true, vessels: [V('vase', 'raku', 'none', 8, 257)] },
  { id: 'r6', name: 'Brother Bowls', turn: true, vessels: [V('chawan', 'tenmoku', 'none', 4, 263), V('chawan', 'raku', 'none', 5, 269)] },
  { id: 'r7', name: 'Ember', turn: true, vessels: [V('jar', 'copper', 'none', 9, 271)] },
  { id: 'r8', name: 'Kiln Morning', turn: true, vessels: [V('bottle', 'ash', 'none', 5, 277), V('tsubo', 'raku', 'none', 6, 281)] },
];

const fin = (d: Draft[], chapter: number): Level[] => d.map((x) => ({ ...x, chapter }));
export const LEVELS: Level[] = [...fin(TEA, 0), ...fin(BLUE, 1), ...fin(RAKU, 2)];
export const levelIndex = (id: string) => LEVELS.findIndex((l) => l.id === id);
export const shardCount = (l: Level) => l.vessels.reduce((a, v) => a + v.shards, 0);
/** Stars are gold: three for no spilled lacquer, two for up to two spills, one otherwise. */
export const starsFor = (slips: number) => (slips === 0 ? 3 : slips <= 2 ? 2 : 1);
