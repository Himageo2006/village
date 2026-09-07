# Copy-paste prompts — village art

Six groups: **buildings** (1-4), **villagers** (5-7), **scenery** (8-11),
**ground and backdrop** (12-13), **buildings, part two** (14-17) and
**decorations** (18-23).

Generate each group **in one conversation, in the order given**. Every prompt
repeats the whole style spec so it still works pasted alone, but keeping a group
together in one chat is what stops the pieces drifting apart.

Start each new group by pasting a finished building image in first and saying
*"match this art style"*. That is what keeps the villagers and the trees looking
like they belong in the same game as the cottage.

After each image, if the angle or scale drifts, reply:
`Same camera angle, same lighting, same scale as the first image. Regenerate.`

Save each one under the filename its heading gives, then run
`node tools/prep-art.js`.

---
---

# Buildings

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

---
---

# Villagers

Three standing figures. The game animates them itself — it bobs them as they
walk and **mirrors them** to turn them around — so do not ask for walk frames.

Two rules matter more here than they did for the buildings:

- **Light them evenly.** Because the game mirrors the sprite to face the other
  way, strong side lighting would flip with it and light the village from the
  wrong side every time a villager turned round.
- **Keep them bold.** They are drawn about 60 pixels tall. Fine detail turns to
  mud; a strong silhouette and a few clear blocks of colour read at any size.

---

## 5 — Farmer → `art/villager_farmer.png`

```
A medieval peasant farmer standing still, as a game character sprite. Match
the art style of the cottage image.

CAMERA: seen from slightly above, at the same angle as an isometric game
board — roughly 30 degrees above the horizon. The figure stands upright and
faces three-quarters to the RIGHT, turned slightly towards the viewer so the
face is visible. Full body, head to feet, both feet on the ground.

SUBJECT: a cheerful young man in simple medieval peasant clothing — a loose
knee-length tunic in muted earthy green, dark brown trousers, laced leather
boots, a wide brown belt. Sleeves rolled to the elbow. A soft cloth cap.
Standing at rest with his arms relaxed at his sides.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Chunky simplified forms, warm saturated colours,
soft hand-painted shading, crisp clean edges. A slightly large head and
hands so the character reads at small size. Friendly, not gritty. No
photorealism, no fine texture detail.

READABILITY: this sprite is displayed about 60 pixels tall. The silhouette
must be instantly clear and the clothing must be a few large blocks of
colour, not small patterns.

LIGHTING: soft and even, lit from the front and slightly above. Gentle
shading to give the form volume, but NO strong directional light and no hard
shadow down one side.

BACKGROUND: fully transparent. No ground, no grass, no baseplate, no drop
shadow, no cast shadow of any kind.

FRAMING: full body filling the frame vertically, feet resting on the bottom
edge, centred horizontally. No empty padding.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, multiple poses,
turnarounds, walk cycles, sprite sheets, weapons, armour, or any ground
surface.
```

---

## 6 — Villager with a basket → `art/villager_basket.png`

```
A medieval peasant woman standing still, as a game character sprite. Same
art style, same camera angle and same even lighting as the farmer sprite.

CAMERA: seen from slightly above, roughly 30 degrees above the horizon. The
figure stands upright and faces three-quarters to the RIGHT, turned slightly
towards the viewer. Full body, head to feet, both feet on the ground.

SUBJECT: a friendly young woman in modest medieval peasant clothing — a
long-sleeved ankle-length dress in muted dusty blue with a cream apron over
it, and a simple headscarf covering her hair. She carries a round wicker
basket of vegetables balanced on one hip.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Chunky simplified forms, warm saturated colours,
soft hand-painted shading, crisp clean edges. A slightly large head and
hands so the character reads at small size. Friendly, not gritty.

READABILITY: displayed about 60 pixels tall. Strong clear silhouette — the
basket should be plainly visible as a separate shape. Large blocks of
colour, no small patterns.

LIGHTING: soft and even, lit from the front and slightly above. NO strong
directional light and no hard shadow down one side.

BACKGROUND: fully transparent. No ground, no grass, no baseplate, no drop
shadow, no cast shadow.

FRAMING: full body filling the frame vertically, feet on the bottom edge,
centred horizontally. No empty padding.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, multiple poses,
turnarounds, walk cycles, sprite sheets, or any ground surface.
```

---

## 7 — Woodcutter → `art/villager_woodcutter.png`

```
A medieval woodcutter standing still, as a game character sprite. Same art
style, same camera angle and same even lighting as the farmer sprite.

CAMERA: seen from slightly above, roughly 30 degrees above the horizon. The
figure stands upright and faces three-quarters to the RIGHT, turned slightly
towards the viewer. Full body, head to feet, both feet on the ground.

SUBJECT: a burly older man in medieval peasant working clothes — a rust-red
sleeveless tunic over a cream undershirt, heavy dark trousers, thick leather
boots and a broad leather belt. A short beard. He rests a woodcutting axe on
one shoulder, holding it casually with one hand. The axe is a tool, not a
weapon.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Chunky simplified forms, warm saturated colours,
soft hand-painted shading, crisp clean edges. Slightly large head and hands.
Friendly, not gritty.

READABILITY: displayed about 60 pixels tall. The axe on the shoulder should
be a clear part of the silhouette. Large blocks of colour, no small detail.

LIGHTING: soft and even, lit from the front and slightly above. NO strong
directional light and no hard shadow down one side.

BACKGROUND: fully transparent. No ground, no grass, no baseplate, no drop
shadow, no cast shadow.

FRAMING: full body filling the frame vertically, feet on the bottom edge,
centred horizontally. No empty padding.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, multiple poses,
turnarounds, walk cycles, sprite sheets, armour, or any ground surface.
```

---
---

# Scenery

These stand on the same ground as the buildings, so they go back to the
buildings' rules: **strong light from the upper left**, and the base of the
object resting on the bottom of the image. They are never mirrored.

---

## 8 — Pine tree → `art/tree_pine.png`

```
A single evergreen pine tree, as a game asset sprite. Match the art style of
the cottage image.

CAMERA: seen from a corner at 30 degrees above the horizon, the same angle
as an isometric game board. No top-down view, no straight-on elevation.

SUBJECT: a tall conical pine tree. A straight reddish-brown trunk with a few
roots flaring at the base, and three or four broad tiers of dense needled
foliage narrowing to a point. Deep forest green, a little lighter at the
tips. Full and healthy, slightly irregular so it does not look manufactured.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Chunky simplified forms, foliage as a few large
sculpted masses rather than individual needles, warm saturated colours, soft
hand-painted shading. No photorealism.

LIGHTING: single key light from the upper LEFT. The left side of each
foliage tier is lit, the right side falls into soft shadow.

BACKGROUND: fully transparent. No ground, no grass, no baseplate, no drop
shadow, no cast shadow.

FRAMING: the tree fills the frame with the base of its trunk resting on the
bottom edge, centred horizontally. No empty padding.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, multiple trees, a
forest, character figures, or any ground surface.
```

---

## 9 — Broadleaf tree → `art/tree_oak.png`

```
A single broadleaf oak tree, as a game asset sprite. Same art style, same
camera angle and same lighting as the pine tree.

CAMERA: seen from a corner at 30 degrees above the horizon. No top-down
view, no straight-on elevation.

SUBJECT: a sturdy oak. A thick gnarled brown trunk splitting into a few
heavy branches, carrying a broad rounded canopy of rich mid-green leaves
built from three or four overlapping rounded clumps. Wider than it is tall.
A few roots flaring at the base.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Chunky simplified forms, the canopy as a few
large sculpted masses rather than individual leaves, warm saturated colours,
soft hand-painted shading. No photorealism.

LIGHTING: single key light from the upper LEFT. The left of the canopy is
lit, the right falls into soft shadow.

BACKGROUND: fully transparent. No ground, no grass, no baseplate, no drop
shadow, no cast shadow.

FRAMING: fills the frame, base of the trunk resting on the bottom edge,
centred horizontally. No empty padding.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, multiple trees, a
forest, character figures, or any ground surface.
```

---

## 10 — Boulder → `art/rock.png`

```
A cluster of grey boulders, as a game asset sprite. Same art style, same
camera angle and same lighting as the pine tree.

CAMERA: seen from a corner at 30 degrees above the horizon. No top-down
view, no straight-on elevation.

SUBJECT: one large weathered grey granite boulder with two smaller rocks
resting against it. Broad faceted planes with rounded worn edges, a few
cracks, patches of pale moss in the crevices. Wider than they are tall, low
and heavy looking.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Chunky simplified faceted forms, soft
hand-painted shading, crisp edges. No photorealism, no fine surface texture.

LIGHTING: single key light from the upper LEFT. Left-facing planes lit,
right-facing planes in soft shadow.

BACKGROUND: fully transparent. No ground, no grass, no baseplate, no drop
shadow, no cast shadow.

FRAMING: fills the frame, resting on the bottom edge, centred horizontally.
No empty padding.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, character figures, or
any ground surface.
```

---

## 11 — Bush → `art/bush.png`

```
A small leafy bush with berries, as a game asset sprite. Same art style,
same camera angle and same lighting as the pine tree.

CAMERA: seen from a corner at 30 degrees above the horizon. No top-down
view, no straight-on elevation.

SUBJECT: a low rounded shrub made of three or four overlapping clumps of
mid-green leaves, wider than it is tall, with a scattering of small red
berries. A hint of thin woody stems at the base.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Chunky simplified forms, foliage as a few
sculpted masses, warm saturated colours, soft hand-painted shading.

LIGHTING: single key light from the upper LEFT. Left lit, right in soft
shadow.

BACKGROUND: fully transparent. No ground, no grass, no baseplate, no drop
shadow, no cast shadow.

FRAMING: fills the frame, resting on the bottom edge, centred horizontally.
No empty padding.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, character figures, or
any ground surface.
```

---
---

# Ground and backdrop

Two pieces that replace the flat green tiles the village stands on today.

The ground is **one painted island, not a repeating tile**. A tile has to match
its own edges seamlessly, which image generators are bad at, and the seams show
up as a grid of hairlines across the entire map. One island has no seams at all,
and it lets the painting carry worn tracks and dry patches that no single
repeating tile could.

Its shape is fixed by the map: **a diamond exactly twice as wide as it is tall**,
with corners at left, right, top and bottom.

---

## 12 — Ground island → `art/ground.png`

```
A single island of grassland seen from above at an isometric angle, as a
game background plate. Match the art style of the cottage image.

SHAPE: the land forms one large DIAMOND — a square plot of ground seen from
a corner, so it is exactly twice as wide as it is tall, with its corners at
the far left, far right, top and bottom of the image. Everything outside
that diamond is empty.

CAMERA: seen from a corner at 30 degrees above the horizon, the standard 2:1
isometric game view. The ground is flat.

SUBJECT: lush green meadow grass covering the whole diamond. Gentle painted
variation across it — patches of lighter yellow-green and deeper shadowed
green, a few bare patches of dry brown earth, faint worn dirt tracks
wandering across the middle as though people walk there, scattered tufts of
darker grass and a few tiny wildflowers. Rich but calm: this sits UNDER the
buildings and must not compete with them. Around the rim the grass gives way
to a low crumbling edge of brown earth and grey rock where the land stops.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Soft hand-painted shading, warm saturated
colours, broad simple shapes. No photorealism, no individual grass blades,
no visible tiling or grid.

LIGHTING: soft even overhead daylight across the whole surface. No long
shadows, no dark corners, no vignette.

BACKGROUND: fully transparent outside the diamond of land. No water, no sky,
no border, no drop shadow.

FRAMING: the diamond fills the image edge to edge — its left and right
corners touch the left and right edges, its top and bottom corners touch the
top and bottom edges.

DO NOT INCLUDE: buildings, houses, farms, fences, roads, characters,
animals, trees, text, labels, watermarks, UI, borders, or a grid.
```

---

## 13 — Water backdrop → `art/water.png`

```
A wide expanse of calm shallow sea water seen from above, as a game
background. Match the art style of the cottage image.

CAMERA: looking down on open water at an isometric angle, roughly 30 degrees
above the horizon. Flat, with no horizon line and no sky.

SUBJECT: clear turquoise-blue water deepening to a richer teal in places.
Soft rolling ripples and gentle painted highlights catching the light, a few
slow curving lines of foam. Calm and inviting, not stormy. The whole image
is water and nothing else.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Soft hand-painted shading, broad simple shapes,
saturated colour. No photorealism, no fine detail, no sparkle noise.

LIGHTING: soft even overhead daylight across the whole surface. No vignette,
no dark corners, no bright hotspot.

BACKGROUND: none — the water fills the entire image edge to edge, with no
transparency anywhere.

FRAMING: fills the whole frame. Landscape, roughly twice as wide as it is
tall.

DO NOT INCLUDE: land, shore, beach, sand, rocks, islands, boats, buildings,
characters, sky, horizon, text, labels, watermarks, UI, or borders.
```

---
---

# Buildings, part two

Four more, for the town hall and the buildings its later levels unlock. Same
rules as the first four — **2:1 isometric, light from the upper LEFT,
transparent background, base at the bottom of the image**.

One rule is new, and it is there because the cottage caught us out. The cottage
was drawn as a rectangle roughly twice as long as it is deep, so on a single
square tile packed houses swallowed each other's doors and it had to be given a
2×1 plot instead. These four all stand on **square** plots, so each prompt asks
for a square plan outright: *as deep as it is wide*. If one comes back long and
thin, regenerate it rather than living with it.

| Prompt | Plot | Notes |
|---|---|---|
| Town Hall | 2 × 2 | the tallest thing in the village |
| Well | 1 × 1 | small; sits between other buildings |
| Mill | 2 × 2 | tall, with sails |
| Market | 2 × 2 | low and wide, open stalls |

---

## 14 — Town Hall → `art/hall.png`

```
A medieval village town hall, as a game asset sprite. Match the art style of
the cottage image.

CAMERA: strict 2:1 isometric projection, viewed from a corner at 30 degrees
above the horizon. A square floor must appear as a diamond exactly twice as
wide as it is tall. No vanishing point, no top-down view.

PLAN: the building is SQUARE in plan — as deep as it is wide. Not a long
hall, not a rectangle.

SUBJECT: the grandest building in a small medieval village, and clearly the
centre of it. A solid ground floor of pale dressed stone with a wide arched
double doorway and stone steps up to it. An upper storey of cream plaster
with dark oak timber framing, slightly overhanging the stone below. A steep
red tiled roof. A short square bell tower rising from one corner with a
visible bronze bell under a small pointed roof, and a plain cloth banner on
a pole. Well kept and civic, not a castle and not a church.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Clean readable silhouette, chunky simplified
forms, warm saturated colours, soft hand-painted shading. No photorealism.

LIGHTING: single key light from the upper LEFT. Left-facing walls and the
left roof slope are lit; right-facing walls and the right roof slope fall
into soft shadow.

BACKGROUND: fully transparent. No ground, no grass, no baseplate, no drop
shadow, no cast shadow of any kind.

FRAMING: fills the frame, the base of the walls resting on the bottom edge,
centred horizontally. No empty padding.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, multiple angles,
character figures, or any ground surface.
```

---

## 15 — Well → `art/well.png`

```
A medieval stone well, as a game asset sprite. Same art style, same camera
angle and same lighting as the cottage image.

CAMERA: strict 2:1 isometric projection, viewed from a corner at 30 degrees
above the horizon. No top-down view, no straight-on elevation.

PLAN: square and compact — as deep as it is wide. This is a SMALL object,
about a quarter the footprint of a cottage.

SUBJECT: a round well of mossy grey fieldstone, waist high, with a wooden
bucket hanging from a rope on a hand crank. Two timber posts carry a small
pitched roof of wooden shingles over it. A second bucket and a spill of wet
cobbles at the base. Worn and well used.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Chunky simplified forms, warm saturated colours,
soft hand-painted shading, crisp edges. No photorealism.

LIGHTING: single key light from the upper LEFT. Left lit, right in soft
shadow.

BACKGROUND: fully transparent. No ground, no grass, no baseplate, no drop
shadow, no cast shadow.

FRAMING: fills the frame, resting on the bottom edge, centred horizontally.
No empty padding.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, multiple angles,
character figures, or any ground surface.
```

---

## 16 — Mill → `art/mill.png`

```
A medieval windmill, as a game asset sprite. Same art style, same camera
angle and same lighting as the cottage image.

CAMERA: strict 2:1 isometric projection, viewed from a corner at 30 degrees
above the horizon. No top-down view, no straight-on elevation.

PLAN: SQUARE in plan — as deep as it is wide. Tall rather than long.

SUBJECT: a stout windmill. A broad tapering tower of pale stone and timber
with a wooden door and a couple of small windows, capped with a domed
shingled roof. Four large wooden sails on a hub at the front, latticed and
partly covered in cloth, angled so all four are clearly visible. Sacks of
grain and a small handcart at the base.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Clean readable silhouette, chunky simplified
forms, warm saturated colours, soft hand-painted shading. No photorealism.

LIGHTING: single key light from the upper LEFT. Left-facing surfaces lit,
right-facing surfaces in soft shadow.

BACKGROUND: fully transparent. No ground, no grass, no baseplate, no drop
shadow, no cast shadow.

FRAMING: fills the frame, the base of the tower resting on the bottom edge,
centred horizontally. No empty padding.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, multiple angles,
character figures, wind, motion blur, or any ground surface.
```

---

## 17 — Market → `art/market.png`

```
A medieval village market, as a game asset sprite. Same art style, same
camera angle and same lighting as the cottage image.

CAMERA: strict 2:1 isometric projection, viewed from a corner at 30 degrees
above the horizon. No top-down view, no straight-on elevation.

PLAN: SQUARE in plan — as deep as it is wide. Low and spread out rather than
tall; noticeably shorter than a cottage.

SUBJECT: two or three open market stalls set together in a square. Simple
timber frames with striped cloth awnings in faded red and cream, held up on
wooden poles. Wooden trestle counters piled with produce — apples, bread,
cloth bolts, clay pots. Barrels and crates stacked at the corners, a set of
brass scales on one counter. Busy and colourful, but no people.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Clean readable silhouette, chunky simplified
forms, warm saturated colours, soft hand-painted shading. No photorealism.

LIGHTING: single key light from the upper LEFT. Left-facing surfaces and the
left of each awning are lit; right-facing surfaces fall into soft shadow.

BACKGROUND: fully transparent. No ground, no grass, no cobbles, no
baseplate, no drop shadow, no cast shadow.

FRAMING: fills the frame, resting on the bottom edge, centred horizontally.
No empty padding.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, signage, multiple
angles, character figures, shoppers, or any ground surface.
```

---
---

# Decorations

Six small pieces the player places to make the village theirs. They are drawn
in code today and it shows — the path reads well, the hedges are green pills —
so these are the last things standing between the village and being entirely
painted.

Same rules as everything else: **2:1 isometric, light from the upper LEFT,
transparent background, base at the bottom of the image**. Two differences:

- These are **small**. A lamp stands about a third the height of a cottage; a
  flowerbed is ankle high. Say so, or they come back the size of a house.
- The **path is a floor tile**, not an object. It is the one asset that must be
  a diamond filling the frame, because the game lays it flat into the grid.

| Prompt | Drawn at | Notes |
|---|---|---|
| Path | fills one tile | flat on the ground; must tile edge to edge |
| Fence | ~42px tall | a single segment, laid end to end |
| Flowerbed | ~34px tall | low and wide |
| Hedge | ~48px tall | low and wide |
| Lamp | ~80px tall | the tallest of the six |
| Statue | ~88px tall | the showpiece |

---

## 18 — Path → `art/path.png`

```
A square tile of worn dirt path seen from above at an isometric angle, as a
game floor tile. Match the art style of the cottage image.

SHAPE: the tile is a DIAMOND that fills the frame — a square of ground seen
from a corner, so it is exactly twice as wide as it is tall, with its
corners touching the left, right, top and bottom edges of the image.

CAMERA: seen from a corner at 30 degrees above the horizon, the standard 2:1
isometric game view. Completely flat — this is ground, not an object.

SUBJECT: packed earth in warm mid-brown, lightly rutted, with a scatter of
small embedded pebbles and a few faint wheel tracks. Slightly darker towards
the edges so that laying several side by side reads as a continuous track.
Nothing standing on it.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Soft hand-painted shading, warm saturated
colours, broad simple shapes. No photorealism, no fine gravel texture.

LIGHTING: soft even overhead daylight. No long shadows, no directional
lighting, no vignette — this tile is repeated, so any highlight would repeat
with it and read as a grid.

BACKGROUND: fully transparent outside the diamond. No grass, no border, no
drop shadow.

DO NOT INCLUDE: grass, plants, buildings, characters, fences, text, labels,
watermarks, UI, borders, or a visible tile outline.
```

---

## 19 — Fence → `art/fence.png`

```
A single short section of medieval wooden fence, as a small game asset
sprite. Same art style, same camera angle and same lighting as the cottage
image.

CAMERA: seen from a corner at 30 degrees above the horizon. No top-down
view, no straight-on elevation.

SCALE: this is a SMALL object — about knee high on a person, roughly a fifth
the height of a cottage. Draw it as one short section that could be repeated
end to end to make a run of fence.

SUBJECT: two stout weathered timber posts with two horizontal split rails
between them. Rough-hewn pale brown wood with visible grain and a couple of
knots. A tuft or two of grass at the foot of each post.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Chunky simplified forms, warm saturated colours,
soft hand-painted shading, crisp edges. Bold enough to read small.

LIGHTING: single key light from the upper LEFT. Left lit, right in soft
shadow.

BACKGROUND: fully transparent. No ground, no grass patch, no baseplate, no
drop shadow, no cast shadow.

FRAMING: fills the frame, the foot of the posts resting on the bottom edge,
centred horizontally. No empty padding.

DO NOT INCLUDE: gates, a long run of fencing, text, labels, watermarks, UI,
borders, character figures, or any ground surface.
```

---

## 20 — Flowerbed → `art/flowers.png`

```
A small bed of wildflowers, as a game asset sprite. Same art style, same
camera angle and same lighting as the cottage image.

CAMERA: seen from a corner at 30 degrees above the horizon. No top-down
view.

SCALE: a SMALL, LOW object — ankle high, wider than it is tall, about a
seventh the height of a cottage.

SUBJECT: a rounded patch of rich dark soil edged with a few small stones,
planted with clusters of simple wildflowers — red, warm yellow, soft pink
and white — on short green stems. Full and cheerful, slightly irregular.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Chunky simplified forms, flowers as bold dots of
colour rather than detailed petals, soft hand-painted shading. Must read
clearly at a small size.

LIGHTING: single key light from the upper LEFT. Left lit, right in soft
shadow.

BACKGROUND: fully transparent. No grass, no ground beyond the bed itself, no
baseplate, no drop shadow, no cast shadow.

FRAMING: fills the frame, resting on the bottom edge, centred horizontally.
No empty padding.

DO NOT INCLUDE: pots, planters, text, labels, watermarks, UI, borders,
character figures, or any ground surface.
```

---

## 21 — Hedge → `art/hedge.png`

```
A short section of clipped garden hedge, as a game asset sprite. Same art
style, same camera angle and same lighting as the cottage image.

CAMERA: seen from a corner at 30 degrees above the horizon. No top-down
view, no straight-on elevation.

SCALE: a SMALL, LOW object — waist high, wider than it is tall, about a
quarter the height of a cottage. One section, repeatable end to end.

SUBJECT: a neatly clipped block of dense dark green foliage with softly
rounded corners and a flat top, built from a few large sculpted leafy masses.
A hint of woody stems at the base. Lighter fresh green on the upper
surfaces, deeper green underneath.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Chunky simplified forms, foliage as sculpted
masses rather than individual leaves, soft hand-painted shading.

LIGHTING: single key light from the upper LEFT. The left face and the top
are lit; the right face falls into soft shadow.

BACKGROUND: fully transparent. No ground, no grass, no baseplate, no drop
shadow, no cast shadow.

FRAMING: fills the frame, resting on the bottom edge, centred horizontally.
No empty padding.

DO NOT INCLUDE: flowers, topiary shapes, text, labels, watermarks, UI,
borders, character figures, or any ground surface.
```

---

## 22 — Lamp → `art/lamp.png`

```
A medieval iron lamp post, as a game asset sprite. Same art style, same
camera angle and same lighting as the cottage image.

CAMERA: seen from a corner at 30 degrees above the horizon. No top-down
view, no straight-on elevation.

SCALE: TALL AND NARROW, but small overall — roughly a third the height of a
cottage, and only a hand's width across.

SUBJECT: a slender black wrought-iron post on a small round stone base,
topped with a four-sided glass lantern in an iron frame with a little
pointed cap. A warm candle flame glowing amber inside the glass, casting a
soft golden light on the ironwork immediately around it. A simple curled
iron bracket where the lantern meets the post.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Chunky simplified forms, bold silhouette, soft
hand-painted shading. The lantern must read clearly at a small size.

LIGHTING: single key light from the upper LEFT on the post and base. The
lantern glows from within — warm amber, contained to the lamp itself.

BACKGROUND: fully transparent. No ground, no grass, no baseplate, no drop
shadow, no cast shadow, and NO glow spilling onto the background.

FRAMING: fills the frame vertically, the base resting on the bottom edge,
centred horizontally. No empty padding.

DO NOT INCLUDE: light rays, lens flare, a pool of light on the ground, text,
labels, watermarks, UI, borders, character figures, or any ground surface.
```

---

## 23 — Statue → `art/statue.png`

```
A small stone statue on a plinth, as a game asset sprite. Same art style,
same camera angle and same lighting as the cottage image.

CAMERA: seen from a corner at 30 degrees above the horizon. No top-down
view, no straight-on elevation.

SCALE: small — roughly a third the height of a cottage, standing on a
single square base.

SUBJECT: a carved pale limestone figure of a robed villager holding a sheaf
of wheat, standing on a square stepped plinth of dressed grey stone. Weathered
and slightly mossy at the base. Calm and dignified, a village monument rather
than a grand civic sculpture. Simple robes, no fine facial detail.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Chunky simplified forms, broad carved planes, soft
hand-painted shading. Bold enough to read at a small size.

LIGHTING: single key light from the upper LEFT. The left of the figure and
plinth is lit; the right falls into soft shadow.

BACKGROUND: fully transparent. No ground, no grass, no baseplate beyond the
plinth itself, no drop shadow, no cast shadow.

FRAMING: fills the frame, the plinth resting on the bottom edge, centred
horizontally. No empty padding.

DO NOT INCLUDE: weapons, armour, horses, fountains, water, text, labels,
watermarks, UI, borders, other figures, or any ground surface.
```
