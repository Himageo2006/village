# Copy-paste prompts — village building art

Generate **all four in one conversation, in this order**. Each prompt repeats the
full style spec so it still works if pasted alone, but keeping them in one chat is
what keeps the four consistent.

After each image, if the angle or scale drifts, reply:
`Same camera angle, same lighting, same scale as the first image. Regenerate.`

Save as `art/house.png`, `art/farm.png`, `art/lumber.png`, `art/store.png`,
then run `node tools/prep-art.js`.

---

## 1 — House → `art/house.png`

```
A single medieval peasant cottage, as a game asset sprite.

CAMERA: strict 2:1 isometric projection, viewed from a corner at 30 degrees
above the horizon. A square floor must appear as a diamond exactly twice as
wide as it is tall. No vanishing point, no dramatic perspective, no top-down
view, no straight-on elevation.

SUBJECT: a small timber-framed cottage. Exposed dark oak beams over warm cream
plaster walls. A steep pitched roof of weathered terracotta clay tiles with a
clearly visible ridge line running front to back. A rounded wooden plank door
with iron hinges on the front-left wall. One small shuttered window on the
front-right wall with a warm amber glow inside. A rough grey stone chimney at
one end. Slightly worn and lived-in, not pristine.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Clean readable silhouette, chunky simplified forms,
warm saturated colours, soft hand-painted shading, gentle ambient occlusion
where surfaces meet. Crisp edges, no photorealism, no fine texture noise.

LIGHTING: single key light from the upper LEFT. The left-facing wall and the
left roof slope are brightly lit; the right-facing wall and right roof slope
fall into soft shadow. Consistent and directional.

BACKGROUND: fully transparent. No ground, no grass, no dirt, no baseplate, no
drop shadow, no cast shadow of any kind. The building alone on transparency.

FRAMING: the building fills the frame with the base of its walls resting on
the bottom edge, centred horizontally. No empty padding around it.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, frames, multiple
angles, turnarounds, character figures, or any ground surface.
```

---

## 2 — Farm → `art/farm.png`

```
A medieval farm field, as a game asset sprite. Same art style, same camera
angle and same lighting as the cottage image.

CAMERA: strict 2:1 isometric projection, viewed from a corner at 30 degrees
above the horizon. A square plot must appear as a diamond exactly twice as
wide as it is tall. No vanishing point, no top-down view.

SUBJECT: a square ploughed field. Neat parallel furrows of rich dark brown
earth running diagonally across the plot, planted with rows of tall ripe
golden wheat. A low rustic wooden post-and-rail fence along the two front
edges. Two round hay bales and a small wooden handcart resting at one corner.
This is FLAT farmland, not a building — nothing tall, no walls, no roof.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Clean readable shapes, chunky simplified forms,
warm saturated colours, soft hand-painted shading. No photorealism.

LIGHTING: single key light from the upper LEFT, matching the cottage. Furrow
ridges catch the light on their left sides and cast soft shadow to the right.

BACKGROUND: fully transparent. No surrounding grass, no ground beneath the
plot, no drop shadow, no cast shadow. The field alone on transparency.

FRAMING: the plot fills the frame, resting on the bottom edge, centred
horizontally. No empty padding.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, multiple angles,
character figures, or any ground surface outside the field itself.
```

---

## 3 — Lumber Camp → `art/lumber.png`

```
A medieval lumberjack's camp, as a game asset sprite. Same art style, same
camera angle and same lighting as the cottage image.

CAMERA: strict 2:1 isometric projection, viewed from a corner at 30 degrees
above the horizon. A square floor must appear as a diamond exactly twice as
wide as it is tall. No vanishing point, no top-down view.

SUBJECT: an open-sided timber workshop, wider than it is deep. Four stout
corner posts holding up a simple pitched roof of overlapping wooden planks,
with the sides left open so the interior is visible. A large neat stack of
freshly cut logs showing their pale cut ends. A wooden sawhorse with a long
two-handled crosscut saw resting across it. A broad axe embedded in a
chopping stump. Wood chips and offcuts scattered at the base.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Clean readable silhouette, chunky simplified
forms, warm saturated colours, soft hand-painted shading. No photorealism.

LIGHTING: single key light from the upper LEFT. Left-facing surfaces and the
left roof slope are lit; right-facing surfaces fall into soft shadow.

BACKGROUND: fully transparent. No ground, no grass, no dirt patch, no drop
shadow, no cast shadow. The camp alone on transparency.

FRAMING: fills the frame, base resting on the bottom edge, centred
horizontally. No empty padding.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, multiple angles,
character figures, or any ground surface.
```

---

## 4 — Storehouse → `art/store.png`

```
A medieval granary and storehouse, as a game asset sprite. Same art style,
same camera angle and same lighting as the cottage image.

CAMERA: strict 2:1 isometric projection, viewed from a corner at 30 degrees
above the horizon. A square floor must appear as a diamond exactly twice as
wide as it is tall. No vanishing point, no top-down view.

SUBJECT: a tall sturdy timber barn, noticeably larger and bulkier than a
cottage — roughly twice its height. Heavy dark wooden plank walls with broad
horizontal boards and iron strapping. Wide double barn doors, one standing
slightly ajar. A steep shingled roof. A hoist beam projecting from the gable
above the doors with a rope and pulley hanging from it. Wooden barrels and
bulging grain sacks stacked against the near wall.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Clean readable silhouette, chunky simplified
forms, warm saturated colours, soft hand-painted shading. No photorealism.

LIGHTING: single key light from the upper LEFT. The left wall and left roof
slope are brightly lit; the right wall and right roof slope fall into soft
shadow.

BACKGROUND: fully transparent. No ground, no grass, no baseplate, no drop
shadow, no cast shadow. The building alone on transparency.

FRAMING: fills the frame, base of the walls resting on the bottom edge,
centred horizontally. No empty padding.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, multiple angles,
character figures, or any ground surface.
```

---

## If the tool refuses transparency

Many image tools quietly return a white background, or *paint* a fake
transparency checkerboard as real pixels. Both are fine — `tools/prep-art.js`
removes either, including checkerboard showing through gaps in the building. If
a background survives it was not flat enough to key; add this line to the prompt
and regenerate:

```
Render the subject on a plain solid pure white background, evenly lit, with
no shadow touching the background.
```

A flat white background keys out cleanly; a gradient or a painted scene does not.
