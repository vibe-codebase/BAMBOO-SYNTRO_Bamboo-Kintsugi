# Bamboo Kintsugi: design notes

## The idea
Kintsugi is the Japanese art of mending broken pottery with lacquer and gold, so that the breaks become the most beautiful part of the pot. The game is a quiet jigsaw with a single rule borrowed from the craft: work carefully. There is no timer. The reward for each shard is the gold that appears along every seam it closes.

## Rules
- Each shard has exactly one place, the right way up. Dropped near its place and upright, it slides home and holds.
- Dropped near its place but turned, nothing is lost: the game says to turn it.
- Dropped anywhere else on the pot, lacquer spills: a spill is counted and the shard goes back to the tray. Set down on the bench, it simply rests where it was left.
- Loose shards lie on the tray at a reduced size so they all fit, and grow to life size when lifted.
- A hint lights the shard that fits best next (one touching a placed shard, if any) and its place, and counts as a spill.

## Making the pots
- Each pot is a profile turned on the wheel, viewed from a little above. The view takes each screen point back to the ring it lies on, so painted bands curve, the mouth is an ellipse showing the inside, and the foot sits on a curve.
- Glazes are functions of position and noise: celadon, tenmoku with hare's fur, shino with orange blush and pinholes, porcelain, raku with heavy crackle and smoke, ash glaze with green runs, copper red with turquoise flashes, and oribe green over cream.
- Breaking: seeds are spread by best-candidate sampling and relaxed with Lloyd's method so shards are of similar size. Each pixel joins the nearest seed measured from a warped position, which makes the breaks jagged. Strays are given to a neighbour so every shard is one piece. The tests check this for every pot in the game.

## Difficulty curve
- **Tea House:** 3 to 7 upright shards in plain glazes; the outline and the glaze's flow are enough.
- **Blue and White:** 4 to 9 shards, turned. Painted patterns help, but they repeat, so edges matter.
- **Raku Fire:** 6 to 11 shards, turned, and in half the levels two pots broken together, so each shard must first be matched to its pot by glaze and curvature.

## Stars
Three for a pot mended without a spill, two for one or two spills, one otherwise.
