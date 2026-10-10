# Village — building artwork

## How art gets into the game

1. Generate the image — the prompts are in **[PROMPTS.md](PROMPTS.md)**.
2. Save it as `art/<key>.png` (`house`, `farm`, `lumber`, `store`).
3. Run `node tools/prep-art.js`.
4. Fit it to its plot — see *Calibrating a new sprite* below.

Step 3 moves your PNG to `art/original/` as the untouched master, strips the
background, trims the empty margin, scales it to 800px and writes the
`art/<key>.webp` the game actually loads. Re-run it any time; it works from the
masters, so nothing degrades on a second pass.

Artwork is optional. A key with no `.webp` keeps drawing its procedural version,
so art can arrive one file at a time and the game never shows a hole.

| Key | Building | Plot |
|---|---|---|
| `house` | House | 2 × 1 |
| `farm` | Farm | 2 × 2 |
| `lumber` | Lumber Camp | 2 × 1 |
| `store` | Storehouse | 2 × 2 |

The plot has to match the shape the artist drew. The cottage and the lumber camp
are rectangles roughly twice as long as they are deep, so they get 2 × 1 plots;
squeezing them onto one tile made packed houses overlap and swallow each other's
doors.

---

## The four rules that actually matter

Get these wrong and the pieces will not sit together, however good each one looks
on its own.

1. **Camera: 2:1 isometric, fixed.** Viewed from a corner, about 30° above the
   horizon. A square footprint must read as a diamond twice as wide as it is
   tall. Never straight-on, never top-down, never a drifting "3/4 perspective".
2. **Light from the upper LEFT.** The left face is lit, the right face is in
   shadow. This matches the ground shading and the villagers.
3. **Transparent background.** No ground, no grass, no shadow, no baseplate —
   the game draws the ground and the contact shadow itself.
4. **The base of the building sits at the bottom of the image.** Its front
   corner is the anchor, and it is the one landmark every sprite shares.

Rules 3 and 4 are the forgiving ones: `prep-art.js` keys a flat *or* checkerboard
background and trims the margin for you.

---

## Calibrating a new sprite

The game scales art to the plot and pins it by its **front corner** — the near
point of the base, where the building touches the ground. That needs three
numbers per key in `ART_FIT` in `game.js`:

| | |
|---|---|
| `ax`, `ay` | where the front corner sits in the image, 0..1 |
| `w` | drawn width as a multiple of the plot's diamond width |

**`ax` and `ay` are measured, not guessed.** The lowest opaque pixel in the
image *is* the front corner, so:

```bash
node tools/measure-art.js
```

prints the values to paste in.

**`w` is judged by eye**, because how far the eaves and clutter overhang the
foundation is a decision, not a measurement. Put the building in the game with
the plot drawn on top and adjust until the base sits on the plot:

```js
// paste in the browser console
const _db = drawBuilding;
window.drawBuilding = function (p, a, t) {
  _db(p, a, t);
  const b = B(p.key);
  g.save(); g.strokeStyle = '#ff2ad4'; g.lineWidth = 2.5;
  for (let dc = 0; dc < b.w; dc++) for (let dr = 0; dr < b.h; dr++) { tilePath(p.c + dc, p.r + dr); g.stroke(); }
  g.restore();
};
placed.length = 0; placed.push({ key: 'house', c: 5, r: 5, t: 1 });
ART_FIT.house.w = 1.2;          // tweak this line and watch
```

`ART_FIT` is a plain object, so `w` can be changed live without reloading.

---

## If a sprite looks wrong in game

- **Floating or sunk** → `ay` is off, or something is drawn below the
  foundation. Re-run `measure-art.js`.
- **Sitting off to one side** → `ax` is off. Same fix.
- **Too big or small for its plot** → adjust `w`.
- **Overlapping its neighbours when packed** → the art is a rectangle on a
  square plot. Change the plot in `BUILDINGS`, not `w`.
- **A grey chequered patch on the grass** → the generator painted a fake
  transparency checkerboard and part of it was enclosed by the building, so the
  edge flood could not reach it. `prep-art.js` handles this; if a patch
  survives, it did not contain two distinct background greys, and needs removing
  by hand.

---

## Beyond the buildings

Buildings are the fiddly case, because their base has to land on a plot. The
rest is simpler.

**Villagers** (`villager_farmer`, `villager_basket`, `villager_woodcutter`) are
single standing poses, anchored bottom-centre. The game picks one per villager.

If a villager also has a six-frame walk cycle -- `<key>_walk1.webp` through
`_walk6.webp`, groups 24-26 in PROMPTS.md -- then the cycle replaces the
standing sprite **entirely**. He walks through all six, one frame per sixth of
a stride, driven by the ground he covers rather than by a clock; and when he
stops he holds frame six. That is deliberate: the cycle is a fresh set of
drawings and the old standing sprite is not, so showing one and then the other
changes the character every time he reaches a door. Standing and walking have
to come out of the same set.

Without a cycle the standing sprite is rocked about its feet and lifted a
little on each step instead, which is a fair imitation of weight but cannot
move his legs. The set is all-or-nothing, and both the pipeline and the game
ignore a set with a frame missing.

`node tools/prep-art.js --walk` does three things to a cycle that it does not
do to a single image:

1. **Fits the frames to one another.** The brief asks the generator for one
   figure height, one centre and the feet on the bottom edge, and no generator
   obeys it: the first real set was drawn a quarter apart in size with the feet
   a hundred and fifty pixels adrift. Each frame is tried at a range of sizes
   against a reference frame and the best overlap wins; the vertical placement
   is taken from the feet instead, because the supporting foot is on the ground
   in every frame of every walk and so is the one landmark that is pinned. So
   **do not hand-register the frames before running this** -- it is done for
   you, and done from measurements rather than from a promise.
2. **Trims the set against a SHARED bounding box**, and caps by HEIGHT rather
   than by the longest side. A cycle is wider than a standing sprite because
   the legs are apart in most of it, and capping the longest side would shrink
   the villager the moment he set off.
3. **Turns the loop** so the frame with the narrowest footprint -- feet
   together, the passing stride -- lands on frame six, which is the one he
   stands on. A walk is a loop, so which drawing is called number one is free,
   and this is the one thing worth spending it on. Measured, not assumed: the
   brief asks for passing on beats three and six and the generator put it on
   two and five for the farmer and on six for the woodcutter.

Two things they must be drawn with:

- **Flat, frontal light** — unlike everything else. The game mirrors a villager
  to turn them round, and a strong key light would flip with them.
- **Bold shapes.** They are drawn 60 world px tall.

**The beacon** is the one building whose art is a SET rather than a single
picture. It has five stages -- `beacon_stage1.webp` through `_stage5` -- and it
is drawn at whichever one it has reached, so it visibly rises as it eats the
village's surplus. There is no `beacon.webp` and there should never be one;
`SET_ART` in game.js names the keys whose art works this way so the harness
does not report a hole that is not there.

All five or none, like the walk cycles: until the whole set is on disk the
beacon is not offered in the tray at all. Three rules beyond the usual --
**same footprint, same place in the frame, same base width in all five**, only
the top growing -- or the tower jumps sideways each time it finishes a stage.
Prompts are group 27 in PROMPTS.md.

Two of those three the pipeline now enforces for you. Place in the frame and
the base line are *fitted*: the first real set arrived with its bases scattered
and came out registered to the pixel. **Footprint is not**, and cannot be. The
fit shifts frames and never scales them, because scaling a set to one size is
exactly what would flatten the rise -- so if the stages are drawn at different
zooms, the building changes size as it is built and only the artist can fix it.
The tool measures it and says so:

```
beacon stages   WARNING: stage 1 stands on a footing 2.5x the width of stage 4,
                so the building shrinks as it is built
                footings 799 765 382 320 420 px        widest is 2.5x the narrowest
```

It warns above 1.5x. Below that is normal -- stages dress their base
differently as they go up, and the delivered beacon's last three sit within
1.2x of one another. **The first two stages of the delivered set are drawn at
roughly twice the zoom of the last three**, which is what the warning above is
about: they show a broad stepped plinth that stages three to five do not have.
Redrawing stages 1 and 2 on the narrow stepped skirt the tower actually uses
would close it. Matching the footings in code was tried and is wrong -- the lit
lighthouse has a wider stone apron than the unlit one, so normalising on the
footing scaled the finished building DOWN and the beacon got shorter at the
moment it was completed.

One more thing a stage set must not do: **outgrow the tray**. The beacon is an
eighth kind in a build bar that divides a fixed 1024 between however many kinds
there are, so every other card lost 13% of its width the moment the art landed
and the beacon's own four-digit price now sits three pixels from its card's
border. It fits at every HUD scale the game allows, but there is no room left:
a ninth kind, or a price that reaches five digits, will not fit.

`prep-art.js` has a SEPARATE path for a stage set, and the difference from the
walk path is the whole point of it. A walk cycle is fitted by silhouette so
every frame comes out the same size; a stage set must NOT be, because a tower
is supposed to get taller. Measured on test stages whose foundation is the same
320px in every master: fitted the walk way the foundation came out 395, 356,
320, 290, 253 -- shrinking by over a third as the tower rose, so the building
would appear to sink into the ground. The stage path shifts the frames until
their FOUNDATIONS coincide and never scales anything: 320 in all five, with the
base line identical to the pixel.

It also caps on WIDTH rather than the longest side, because `artRect` pins a
building's width to its plot and lets the height follow the image -- the
opposite of a villager, who is drawn to a height.

**Scenery** (`tree_pine`, `tree_oak`, `rock`, `bush`) is anchored bottom-centre
too, and sized by `SCENERY_H` in `game.js` — world height at scale 1, which each
piece then varies by its own seeded factor. Set against a cottage at ~207px.

**The ground** (`ground`) is one painted island, and **the sea** (`water`) is a
single image mirrored into a 2×2 tile at runtime, so it repeats with no seam
whatever the artwork does at its edges.

The island needs `GROUND_FIT`, because the plate is not just a diamond — a rim
of earth and rock hangs below the grass, so the bottom of the *image* is the
foot of the cliff, not the corner of the ground the village stands on. Those
three numbers say where the grass surface itself is. Check a new plate by
outlining the grid over it:

```js
// paste in the browser console
const _dg = drawGround;
window.drawGround = function () {
  _dg();
  const t = (c, r) => tileToWorld(c, r);
  const top = t(0, 0), right = t(GW - 1, 0), bot = t(GW - 1, GH - 1), left = t(0, GH - 1);
  g.save(); g.strokeStyle = '#ff2ad4'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(top.x, top.y - TH / 2); g.lineTo(right.x + TW / 2, right.y);
  g.lineTo(bot.x, bot.y + TH / 2); g.lineTo(left.x - TW / 2, left.y); g.closePath(); g.stroke();
  g.restore();
};
```

The outline should sit on the painted edge all the way round.

### A caution about `measure-art.js`

It reads the anchor off the lowest opaque pixel, which is the front corner **of
a building**. A standing figure bottoms out on one foot and a boulder on the
near edge of a broad base, so on those it returns a point off to one side. It
warns when it detects this. Villagers and scenery are anchored bottom-centre and
do not use `ART_FIT` at all.
