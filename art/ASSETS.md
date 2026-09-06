# Village — building artwork

Drop finished files in this folder as `art/<key>.png`. The game picks them up
automatically; anything missing keeps drawing the procedural version, so art can
arrive one file at a time and nothing ever breaks.

| File | Building | Footprint | Suggested source size |
|---|---|---|---|
| `art/house.png` | House | 1×1 | 512 × 560 |
| `art/farm.png` | Farm | 2×2 | 1024 × 700 |
| `art/lumber.png` | Lumber Camp | 2×1 | 768 × 620 |
| `art/store.png` | Storehouse | 2×2 | 1024 × 900 |

Sizes are only a guide — the game scales by height, so what matters is that every
image is drawn at the **same camera angle, same light, same scale relative to its
footprint**. Bigger is fine; it downscales cleanly.

---

## The four rules that actually matter

Get these wrong and the pieces will not sit together, however nice each one looks
on its own.

1. **Camera: 2:1 isometric, fixed.** Viewed from a corner, about 30° above the
   horizon. A square footprint must read as a diamond twice as wide as it is tall.
   Never straight-on, never top-down, never a "3/4 perspective" that drifts.
2. **Light from the upper LEFT.** The left face is lit, the right face is in
   shadow. This matches the ground shading and the villager sprites already in the
   game.
3. **Transparent background.** No ground, no grass, no shadow, no baseplate — the
   game draws the ground and the contact shadow itself. A baked-in shadow will
   show up as a dark smear on the grass.
4. **Anchor: the base of the building sits at the BOTTOM CENTRE of the image.**
   Trim empty space so the walls meet the bottom edge. That point is where the
   building meets the ground.

---

## Prompts

The full copy-paste prompts live in **[PROMPTS.md](PROMPTS.md)** — one per
building, each carrying the whole style spec so it works even if pasted alone.

Generate all four in one conversation, in the order given there.

## After generating

Image tools frequently ignore "transparent background" and hand back a white or
checkered one. Run this and it will fix the common problems — strip a flat
background to transparency, trim the empty margin, and report what it did:

```bash
node tools/prep-art.js
```

It rewrites each file in place, so keep your originals somewhere else if you want
them. Run the game afterwards and the sprites appear immediately.

## If a sprite looks wrong in game

- **Floating or sunk into the ground** → the base is not at the bottom of the
  image. Re-crop so the walls touch the bottom edge, then re-run `prep-art.js`.
- **Too big or too small next to the others** → it was drawn at a different scale
  for its footprint. Easiest fix is regenerating it in the same conversation as
  the others rather than adjusting numbers in code.
- **A dark rectangle or halo around it** → leftover background. Re-run
  `prep-art.js`, and if it persists the background was not flat enough to key out
  automatically; remove it by hand.
