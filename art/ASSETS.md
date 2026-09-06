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

Generate **all four in one conversation**, and after the first image tell it
*"same style, same camera angle, same lighting, same scale"* for each one after.
Style drift between separate chats is the single most likely thing to go wrong.

### 1. House — `art/house.png`
> A single medieval peasant cottage, 2:1 isometric game asset, viewed from a
> corner at about 30 degrees above the horizon. Timber-framed walls with exposed
> dark wooden beams and warm cream plaster, a steep pitched roof of weathered red
> clay tiles with a visible ridge line, a small wooden door on the front-left
> face, one shuttered window with a warm glow, and a stone chimney. Stylised
> low-poly mobile-game art, clean readable shapes, warm saturated colours, soft
> painted shading. Light coming from the upper left so the left wall is lit and
> the right wall is in shadow. Completely transparent background, no ground, no
> grass, no shadow underneath. The base of the building at the bottom centre of
> the frame.

### 2. Farm — `art/farm.png`
> A medieval farm plot, 2:1 isometric game asset, same camera angle and lighting
> as the cottage. Ploughed brown earth in neat furrows with rows of ripe golden
> wheat, a low wooden fence along two sides, a couple of hay bales and a small
> wooden cart. Low and flat — this is a field, not a building. Stylised low-poly
> mobile-game art, warm saturated colours, soft painted shading, light from the
> upper left. Completely transparent background, no ground beneath the plot, no
> shadow. Bottom centre anchored.

### 3. Lumber Camp — `art/lumber.png`
> A medieval lumberjack's camp, 2:1 isometric game asset, same camera angle and
> lighting as the cottage. An open-sided timber workshop with a plank roof, a
> large stack of cut logs, a sawhorse with a two-handled saw, and an axe embedded
> in a chopping stump. Wider than it is deep. Stylised low-poly mobile-game art,
> warm saturated colours, soft painted shading, light from the upper left.
> Completely transparent background, no ground, no shadow. Bottom centre anchored.

### 4. Storehouse — `art/store.png`
> A medieval granary and storehouse, 2:1 isometric game asset, same camera angle
> and lighting as the cottage. A tall sturdy timber barn with wide double doors,
> a steep shingled roof, a hoist beam projecting from the gable, and barrels and
> sacks stacked against the near wall. Noticeably taller and bulkier than the
> cottage. Stylised low-poly mobile-game art, warm saturated colours, soft painted
> shading, light from the upper left. Completely transparent background, no
> ground, no shadow. Bottom centre anchored.

---

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
