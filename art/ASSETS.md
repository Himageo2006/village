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
