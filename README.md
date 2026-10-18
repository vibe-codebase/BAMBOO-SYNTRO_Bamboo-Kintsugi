# Bamboo Kintsugi

By **BAMBOO SYNTRO** · package `com.bamboosyntro.bambookintsugi` · Expo owner `889-893`.

A touch puzzle game for Android about mending broken pottery with gold.

**How it plays.**
- A pot lies broken on the bench. Its outline is drawn on the cloth.
- Drag each shard onto the outline, where it broke from. Set in the right place, it holds, and every crack it closes fills with gold.
- From the second chapter the shards have turned as they fell: tap one to turn it a quarter.
- Mend with a steady hand. A shard set down on the pot in the wrong place spills lacquer.

**Content.**
- 24 pots in three chapters:
  - **Tea House:** tea bowls, a yunomi, jars and a sake bottle in celadon, tenmoku, shino and ash glaze.
  - **Blue and White:** porcelain painted in cobalt (waves, plum blossom, summer grass, lattice), with the shards turned.
  - **Raku Fire:** crackled raku, oxblood copper glaze and oribe green. Some days two pots break together.
- **Stars are gold-mended bowls:** three for no spills, two for one or two, one otherwise. A hint lights a shard and its place, and counts as a spill.

**Look and sound.**
- Visuals:
  - Every pot is thrown in code: a profile turned on the wheel, seen from a little above, so bands curve round it and open forms show the inside of their mouth.
  - Glazes painted per pixel, with crackle, pooling, pinholes, hare's-fur streaks and an unglazed foot. Brushwork follows the curve of the pot.
  - Breaks are jagged, and the broken edges show the pale clay body. The gold is raised and catches the light.
  - The bench is walnut, with a cloth (linen, indigo or felt) under a pool of lamplight.
- Sound: a breathy bamboo flute and a koto over a drone, a kettle, wind chimes or a cooling kiln; porcelain clinks, a soft tok as each shard settles, a shimmer as each seam turns gold, and a singing bowl when the pot is whole.

## Structure

| Path | What it is |
| --- | --- |
| `web/src/game/vessel.ts` | The pots: profiles, the projection, glazes and patterns, breaking (relaxed Voronoi in a warped space, with every shard kept in one piece), and the gold for each seam |
| `web/src/game/levels.ts` | The 24 pots |
| `web/src/game/scene.ts` | The bench: shards on the tray, drag, turn, settle, spills, hints, and the pot that mends and breaks itself on the title screen |
| `src/native/` | Expo WebView shell |

```bash
npm install && npm run web:install
npm run web:test     # 37 tests
npm run build:game && npm run validate:assets && npm run android
```

## Release builds

The Android release is configured for Google Play: target and compile SDK 36, R8 minification and resource shrinking, a non-debuggable release build, no Internet permission, and the game served offline from the app's own assets. Builds run on EAS; `eas.json` has two profiles:

```bash
npm install -g eas-cli && eas login
eas init                     # once: links this folder to your Expo project
npm run eas:apk              # preview profile: a signed APK for testing on devices
npm run eas:aab              # production profile: an AAB for Google Play (versionCode auto-increments)
```
