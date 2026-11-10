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

Three standing figures. These are the REST pose and the fallback: the game
**mirrors them** to turn them around, and without walk frames it fakes a step by
rocking them about their feet. The walk frames themselves are group 24-26 at the
end of this file, and a character keeps this standing sprite until its six
frames arrive.

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

---
---

# Villager walk cycles

Six frames per villager, eighteen images in all. These replace the faked walk:
until they exist the game rocks the standing sprite about its feet, which reads
as a hop rather than a step, because nothing in a single drawing can move its
legs.

**Generate one character per conversation, in frame order.** Paste that
villager's finished standing sprite in first and say *"this exact character —
same face, same clothes, same colours, same camera, same lighting. I need a
six-frame walk cycle."* Then ask for one frame per message. Asking for all six
in one image gives a strip the model cannot keep consistent, and asking for them
in separate conversations drifts the hat, the belt and the palette.

Four rules decide whether the frames cut together or jitter:

- **The figure must not be re-framed.** Same canvas, same figure height, same
  horizontal centre, feet on the same ground line in every frame.

  Ask for it, but do not expect it, and do not try to fix it by hand. The
  first real set to come back was drawn a quarter apart in size with the feet
  a hundred and fifty pixels adrift, and it was fine: `prep-art.js --walk`
  FITS the frames to each other before it cuts them, by overlap for the size
  and by the feet for the ground line. Hand-registering them first only
  changes what it has to undo. The prompts still carry the instruction
  because a generator that half obeys it gives the fit less to do.
- **Same even frontal light in all six**, for the reason the standing sprites
  have it: the game mirrors a villager to turn them round, and a strong key
  light would flip with them.
- **The cycle has to loop.** Frame 6 leads back into frame 1. Frames 4-6 are
  frames 1-3 with the legs and arms swapped.
- **Arms swing opposite the legs.** Left leg forward means right arm forward.

The six poses, which are the standard eight-frame cycle with the two
in-betweens dropped:

| # | pose | body height |
|---|---|---|
| 1 | CONTACT — left foot forward and flat, right foot back on the toe, legs apart | middle |
| 2 | DOWN — weight over the left leg, which is bent; right foot leaving the ground | lowest |
| 3 | PASSING — right leg swings through under the body, feet close together, left leg straight | highest |
| 4 | CONTACT — right foot forward and flat, left foot back on the toe, legs apart | middle |
| 5 | DOWN — weight over the right leg, which is bent; left foot leaving the ground | lowest |
| 6 | PASSING — left leg swings through under the body, feet close together, right leg straight | highest |

Keep the height column small. A head's worth of rise and fall across the whole
cycle is plenty — these are drawn 60 pixels tall, and the game adds nothing of
its own once the frames exist.

Nor does the beat numbering have to come back right. A walk is a loop, so
`prep-art.js --walk` measures the footprint of all six and turns the loop
until the narrowest — feet together — is frame 6, which is the frame the game
holds while a villager is standing still. On the first real set the farmer had
passed on 2 and 5 and the woodcutter on 6, and both came out right anyway.

**Once a character has a cycle, the cycle is all the game draws of him** —
standing as well as walking. So the six frames have to carry the character on
their own, and a standing sprite drawn earlier in a different style is no
longer a fallback anybody will see.

---

## 24 — Farmer walk cycle → `art/villager_farmer_walk1.png` … `villager_farmer_walk6.png`

Six prompts, one per frame, each one self-contained: the character is
described in full, so these work with no reference image at all.

**Attaching the sprite is still better.** `art/original/villager_farmer.png`
is the master, `art/villager_farmer.webp` the smaller processed one; either
will do. A written description keeps the clothes and the palette, but only
the image keeps the FACE, and a face that drifts between frames is the one
thing a viewer notices immediately. Attach it, then send these in order, one
per message.

### Frame 1 of 6 → `art/villager_farmer_walk1.png`

```
Frame 1 of a six-frame walk cycle for this exact character, as a game
character sprite.

CHARACTER: a cheerful young medieval peasant farmer, clean-shaven, with a
friendly open face and warm tan skin. Short reddish-brown hair showing
under a soft slouchy cloth cap in pale tan (#d1aa78). He wears a
long-sleeved olive-green tunic (#56502b, lifting to #716637 where the light
catches it) falling to mid-thigh, with a laced V-neck closed by pale cord,
and cream undershirt sleeves rolled to just below the elbow leaving his
forearms bare. A wide dark brown leather belt (#4e2c16) with a square
pewter buckle and a small pouch at the hip. Very dark brown trousers
(#2c180c) tucked into mid-calf brown leather boots (#73492f) with folded
cuffs and laces.

If a reference image of this character is attached, match it exactly and
let it override every description above.

POSE — CONTACT, left leg leading. His left foot is forward and flat on the
ground, his right foot is back with the heel lifted and only the toe still
touching. The legs are clearly apart with daylight between them. His body is
at MIDDLE height. His right arm swings forward and his left arm back,
opposite to the legs.

CAMERA: the figure faces the viewer almost straight on, the body turned
only very slightly, seen from a little above as from an isometric game
board about 30 degrees above the horizon. Full body, head to feet. He is
walking towards the viewer's right. Keep this same near-frontal view in
all six frames -- do NOT turn the character into a side-on profile, and do
not change the angle between frames.

REGISTRATION: identical canvas, identical figure height and identical
horizontal centre in every frame of this cycle. The lowest foot rests on the
bottom edge. Do not zoom, crop or re-centre.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Chunky simplified forms, warm saturated colours,
soft hand-painted shading, crisp clean edges. A slightly large head and
hands so the character reads at small size. Friendly, not gritty.

READABILITY: displayed about 60 pixels tall. Clear daylight between the legs
and the swinging arm clearly separated from the body.

LIGHTING: soft and even, from the front and slightly above. NO strong
directional light and no hard shadow down one side.

BACKGROUND: fully transparent. No ground, no grass, no baseplate, no drop
shadow, no cast shadow of any kind.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, frame numbers,
multiple poses in one image, sprite sheets, turnarounds, weapons, armour, or
any ground surface.
```

### Frame 2 of 6 → `art/villager_farmer_walk2.png`

```
Frame 2 of a six-frame walk cycle for this exact character, as a game
character sprite.

CHARACTER: a cheerful young medieval peasant farmer, clean-shaven, with a
friendly open face and warm tan skin. Short reddish-brown hair showing
under a soft slouchy cloth cap in pale tan (#d1aa78). He wears a
long-sleeved olive-green tunic (#56502b, lifting to #716637 where the light
catches it) falling to mid-thigh, with a laced V-neck closed by pale cord,
and cream undershirt sleeves rolled to just below the elbow leaving his
forearms bare. A wide dark brown leather belt (#4e2c16) with a square
pewter buckle and a small pouch at the hip. Very dark brown trousers
(#2c180c) tucked into mid-calf brown leather boots (#73492f) with folded
cuffs and laces.

If a reference image of this character is attached, match it exactly and
let it override every description above.

POSE — DOWN, weight on the left leg. His weight has come fully over his left
leg, which is bent at the knee and taking it. His right foot is just leaving
the ground behind him. His body is at its LOWEST point of the whole cycle,
noticeably lower than frame 1. Both arms are passing close to his body,
roughly vertical.

CAMERA: the figure faces the viewer almost straight on, the body turned
only very slightly, seen from a little above as from an isometric game
board about 30 degrees above the horizon. Full body, head to feet. He is
walking towards the viewer's right. Keep this same near-frontal view in
all six frames -- do NOT turn the character into a side-on profile, and do
not change the angle between frames.

REGISTRATION: identical canvas, identical figure height and identical
horizontal centre in every frame of this cycle. The lowest foot rests on the
bottom edge. Do not zoom, crop or re-centre.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Chunky simplified forms, warm saturated colours,
soft hand-painted shading, crisp clean edges. A slightly large head and
hands so the character reads at small size. Friendly, not gritty.

READABILITY: displayed about 60 pixels tall. The bend in the supporting knee
must read in the silhouette.

LIGHTING: soft and even, from the front and slightly above. NO strong
directional light and no hard shadow down one side.

BACKGROUND: fully transparent. No ground, no grass, no baseplate, no drop
shadow, no cast shadow of any kind.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, frame numbers,
multiple poses in one image, sprite sheets, turnarounds, weapons, armour, or
any ground surface.
```

### Frame 3 of 6 → `art/villager_farmer_walk3.png`

```
Frame 3 of a six-frame walk cycle for this exact character, as a game
character sprite.

CHARACTER: a cheerful young medieval peasant farmer, clean-shaven, with a
friendly open face and warm tan skin. Short reddish-brown hair showing
under a soft slouchy cloth cap in pale tan (#d1aa78). He wears a
long-sleeved olive-green tunic (#56502b, lifting to #716637 where the light
catches it) falling to mid-thigh, with a laced V-neck closed by pale cord,
and cream undershirt sleeves rolled to just below the elbow leaving his
forearms bare. A wide dark brown leather belt (#4e2c16) with a square
pewter buckle and a small pouch at the hip. Very dark brown trousers
(#2c180c) tucked into mid-calf brown leather boots (#73492f) with folded
cuffs and laces.

If a reference image of this character is attached, match it exactly and
let it override every description above.

POSE — PASSING, right leg swinging through. His right leg swings forward
beneath his body, knee bent, the foot just clear of the ground. His left leg
is straight and carrying all the weight. The feet are close together, nearly
overlapping. His body is at its HIGHEST point of the whole cycle, risen up
over the straight leg. Both arms hang near vertical at his sides.

CAMERA: the figure faces the viewer almost straight on, the body turned
only very slightly, seen from a little above as from an isometric game
board about 30 degrees above the horizon. Full body, head to feet. He is
walking towards the viewer's right. Keep this same near-frontal view in
all six frames -- do NOT turn the character into a side-on profile, and do
not change the angle between frames.

REGISTRATION: identical canvas, identical figure height and identical
horizontal centre in every frame of this cycle. The supporting foot rests on
the bottom edge. Do not zoom, crop or re-centre.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Chunky simplified forms, warm saturated colours,
soft hand-painted shading, crisp clean edges. A slightly large head and
hands so the character reads at small size. Friendly, not gritty.

READABILITY: displayed about 60 pixels tall. The lifted swinging foot must
be clearly off the ground in the silhouette.

LIGHTING: soft and even, from the front and slightly above. NO strong
directional light and no hard shadow down one side.

BACKGROUND: fully transparent. No ground, no grass, no baseplate, no drop
shadow, no cast shadow of any kind.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, frame numbers,
multiple poses in one image, sprite sheets, turnarounds, weapons, armour, or
any ground surface.
```

### Frame 4 of 6 → `art/villager_farmer_walk4.png`

```
Frame 4 of a six-frame walk cycle for this exact character, as a game
character sprite.

CHARACTER: a cheerful young medieval peasant farmer, clean-shaven, with a
friendly open face and warm tan skin. Short reddish-brown hair showing
under a soft slouchy cloth cap in pale tan (#d1aa78). He wears a
long-sleeved olive-green tunic (#56502b, lifting to #716637 where the light
catches it) falling to mid-thigh, with a laced V-neck closed by pale cord,
and cream undershirt sleeves rolled to just below the elbow leaving his
forearms bare. A wide dark brown leather belt (#4e2c16) with a square
pewter buckle and a small pouch at the hip. Very dark brown trousers
(#2c180c) tucked into mid-calf brown leather boots (#73492f) with folded
cuffs and laces.

If a reference image of this character is attached, match it exactly and
let it override every description above.

POSE — CONTACT, right leg leading. This is frame 1 with the legs and arms
swapped. His RIGHT foot is forward and flat on the ground, his LEFT foot is
back with the heel lifted and only the toe still touching. The legs are
clearly apart with daylight between them. His body is at MIDDLE height. His
LEFT arm swings forward and his RIGHT arm back.

CAMERA: the figure faces the viewer almost straight on, the body turned
only very slightly, seen from a little above as from an isometric game
board about 30 degrees above the horizon. Full body, head to feet. He is
walking towards the viewer's right. Keep this same near-frontal view in
all six frames -- do NOT turn the character into a side-on profile, and do
not change the angle between frames.

REGISTRATION: identical canvas, identical figure height and identical
horizontal centre in every frame of this cycle. The lowest foot rests on the
bottom edge. Do not zoom, crop or re-centre.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Chunky simplified forms, warm saturated colours,
soft hand-painted shading, crisp clean edges. A slightly large head and
hands so the character reads at small size. Friendly, not gritty.

READABILITY: displayed about 60 pixels tall. Clear daylight between the legs
and the swinging arm clearly separated from the body.

LIGHTING: soft and even, from the front and slightly above. NO strong
directional light and no hard shadow down one side.

BACKGROUND: fully transparent. No ground, no grass, no baseplate, no drop
shadow, no cast shadow of any kind.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, frame numbers,
multiple poses in one image, sprite sheets, turnarounds, weapons, armour, or
any ground surface.
```

### Frame 5 of 6 → `art/villager_farmer_walk5.png`

```
Frame 5 of a six-frame walk cycle for this exact character, as a game
character sprite.

CHARACTER: a cheerful young medieval peasant farmer, clean-shaven, with a
friendly open face and warm tan skin. Short reddish-brown hair showing
under a soft slouchy cloth cap in pale tan (#d1aa78). He wears a
long-sleeved olive-green tunic (#56502b, lifting to #716637 where the light
catches it) falling to mid-thigh, with a laced V-neck closed by pale cord,
and cream undershirt sleeves rolled to just below the elbow leaving his
forearms bare. A wide dark brown leather belt (#4e2c16) with a square
pewter buckle and a small pouch at the hip. Very dark brown trousers
(#2c180c) tucked into mid-calf brown leather boots (#73492f) with folded
cuffs and laces.

If a reference image of this character is attached, match it exactly and
let it override every description above.

POSE — DOWN, weight on the right leg. This is frame 2 with the legs and arms
swapped. His weight has come fully over his RIGHT leg, which is bent at the
knee and taking it. His LEFT foot is just leaving the ground behind him. His
body is at its LOWEST point, the same height as frame 2. Both arms pass
close to his body, roughly vertical.

CAMERA: the figure faces the viewer almost straight on, the body turned
only very slightly, seen from a little above as from an isometric game
board about 30 degrees above the horizon. Full body, head to feet. He is
walking towards the viewer's right. Keep this same near-frontal view in
all six frames -- do NOT turn the character into a side-on profile, and do
not change the angle between frames.

REGISTRATION: identical canvas, identical figure height and identical
horizontal centre in every frame of this cycle. The lowest foot rests on the
bottom edge. Do not zoom, crop or re-centre.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Chunky simplified forms, warm saturated colours,
soft hand-painted shading, crisp clean edges. A slightly large head and
hands so the character reads at small size. Friendly, not gritty.

READABILITY: displayed about 60 pixels tall. The bend in the supporting knee
must read in the silhouette.

LIGHTING: soft and even, from the front and slightly above. NO strong
directional light and no hard shadow down one side.

BACKGROUND: fully transparent. No ground, no grass, no baseplate, no drop
shadow, no cast shadow of any kind.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, frame numbers,
multiple poses in one image, sprite sheets, turnarounds, weapons, armour, or
any ground surface.
```

### Frame 6 of 6 → `art/villager_farmer_walk6.png`

```
Frame 6 of a six-frame walk cycle for this exact character, as a game
character sprite.

CHARACTER: a cheerful young medieval peasant farmer, clean-shaven, with a
friendly open face and warm tan skin. Short reddish-brown hair showing
under a soft slouchy cloth cap in pale tan (#d1aa78). He wears a
long-sleeved olive-green tunic (#56502b, lifting to #716637 where the light
catches it) falling to mid-thigh, with a laced V-neck closed by pale cord,
and cream undershirt sleeves rolled to just below the elbow leaving his
forearms bare. A wide dark brown leather belt (#4e2c16) with a square
pewter buckle and a small pouch at the hip. Very dark brown trousers
(#2c180c) tucked into mid-calf brown leather boots (#73492f) with folded
cuffs and laces.

If a reference image of this character is attached, match it exactly and
let it override every description above.

POSE — PASSING, left leg swinging through. This is frame 3 with the legs and
arms swapped, and it is the last frame, so it must lead straight back into
frame 1. His LEFT leg swings forward beneath his body, knee bent, the foot
just clear of the ground. His RIGHT leg is straight and carrying all the
weight. The feet are close together, nearly overlapping. His body is at its
HIGHEST point, the same height as frame 3. Both arms hang near vertical.

CAMERA: the figure faces the viewer almost straight on, the body turned
only very slightly, seen from a little above as from an isometric game
board about 30 degrees above the horizon. Full body, head to feet. He is
walking towards the viewer's right. Keep this same near-frontal view in
all six frames -- do NOT turn the character into a side-on profile, and do
not change the angle between frames.

REGISTRATION: identical canvas, identical figure height and identical
horizontal centre in every frame of this cycle. The supporting foot rests on
the bottom edge. Do not zoom, crop or re-centre.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Chunky simplified forms, warm saturated colours,
soft hand-painted shading, crisp clean edges. A slightly large head and
hands so the character reads at small size. Friendly, not gritty.

READABILITY: displayed about 60 pixels tall. The lifted swinging foot must
be clearly off the ground in the silhouette.

LIGHTING: soft and even, from the front and slightly above. NO strong
directional light and no hard shadow down one side.

BACKGROUND: fully transparent. No ground, no grass, no baseplate, no drop
shadow, no cast shadow of any kind.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, frame numbers,
multiple poses in one image, sprite sheets, turnarounds, weapons, armour, or
any ground surface.
```

---

## 25 — Basket villager walk cycle → `art/villager_basket_walk1.png` … `villager_basket_walk6.png`

She wears an ankle-length dress, so her legs barely show — her silhouette is one
solid shape from the waist down, which is why her prompts describe the step in
the skirt and the body rather than in the feet. Each prompt is self-contained,
but attach `art/original/villager_basket.png` as well if you can -- only the
image keeps her face.

The shared block below is the same in all six; only POSE changes.

### Frame 1 of 6 → `art/villager_basket_walk1.png`

```
Frame 1 of a six-frame walk cycle for this exact character, as a game
character sprite.

CHARACTER: a friendly young medieval peasant woman with a warm open face
and tan skin. Brown hair tucked under a cream headscarf (#f2d3aa) tied
behind her head. She wears a slate-blue long-sleeved dress (#374d68) that
falls all the way to the ground and hides her feet, with a laced bodice and
cream undershirt sleeves rolled below the elbow. Over it a full-length
cream apron (#e9cba3) covering her front from chest to hem. On one hip she
carries a round woven wicker basket (#6c3611) heaped with vegetables --
orange carrots, red tomatoes, green cabbage leaves.

If a reference image of this character is attached, match it exactly and
let it override every description above.

POSE — CONTACT, left leg leading. Her left leg is forward, which pushes the
hem of the skirt forward and lifts it slightly on that side; the skirt falls
back and away on the right. The toe of the leading foot may just show below
the hem. Her body is at MIDDLE height. Her free arm swings forward, opposite
the leading leg. Her shoulders turn slightly against her hips. The basket
stays on the same hip, held by the same hand, and rides with that hip.

CAMERA: the figure faces the viewer almost straight on, the body turned
only very slightly, seen from a little above as from an isometric game
board about 30 degrees above the horizon. Full body, head to feet. She is
walking towards the viewer's right. Keep this same near-frontal view in
all six frames -- do NOT turn the character into a side-on profile, and do
not change the angle between frames.

REGISTRATION: identical canvas, identical figure height and identical
horizontal centre in every frame of this cycle. The lowest point of the hem
rests on the bottom edge. Do not zoom, crop or re-centre.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Chunky simplified forms, warm saturated colours,
soft hand-painted shading, crisp clean edges. A slightly large head and
hands so the character reads at small size. Friendly, not gritty.

READABILITY: displayed about 60 pixels tall. The swing of the hem and of the
free arm must read in the silhouette alone.

LIGHTING: soft and even, from the front and slightly above. NO strong
directional light and no hard shadow down one side.

BACKGROUND: fully transparent. No ground, no grass, no baseplate, no drop
shadow, no cast shadow of any kind.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, frame numbers,
multiple poses in one image, sprite sheets, turnarounds, or any ground
surface.
```

### Frame 2 of 6 → `art/villager_basket_walk2.png`

```
Frame 2 of a six-frame walk cycle for this exact character, as a game
character sprite.

CHARACTER: a friendly young medieval peasant woman with a warm open face
and tan skin. Brown hair tucked under a cream headscarf (#f2d3aa) tied
behind her head. She wears a slate-blue long-sleeved dress (#374d68) that
falls all the way to the ground and hides her feet, with a laced bodice and
cream undershirt sleeves rolled below the elbow. Over it a full-length
cream apron (#e9cba3) covering her front from chest to hem. On one hip she
carries a round woven wicker basket (#6c3611) heaped with vegetables --
orange carrots, red tomatoes, green cabbage leaves.

If a reference image of this character is attached, match it exactly and
let it override every description above.

POSE — DOWN, weight on the left leg. Her weight settles over her left side
and her whole body is at its LOWEST point of the cycle, noticeably lower
than frame 1. The skirt hangs straight and gathers in slightly, its swing
momentarily stilled. Her free arm passes close to her body. The basket is
pressed down against the hip.

CAMERA: the figure faces the viewer almost straight on, the body turned
only very slightly, seen from a little above as from an isometric game
board about 30 degrees above the horizon. Full body, head to feet. She is
walking towards the viewer's right. Keep this same near-frontal view in
all six frames -- do NOT turn the character into a side-on profile, and do
not change the angle between frames.

REGISTRATION: identical canvas, identical figure height and identical
horizontal centre in every frame of this cycle. The lowest point of the hem
rests on the bottom edge. Do not zoom, crop or re-centre.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Chunky simplified forms, warm saturated colours,
soft hand-painted shading, crisp clean edges. A slightly large head and
hands so the character reads at small size. Friendly, not gritty.

READABILITY: displayed about 60 pixels tall. The drop in her height must
read against the other frames.

LIGHTING: soft and even, from the front and slightly above. NO strong
directional light and no hard shadow down one side.

BACKGROUND: fully transparent. No ground, no grass, no baseplate, no drop
shadow, no cast shadow of any kind.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, frame numbers,
multiple poses in one image, sprite sheets, turnarounds, or any ground
surface.
```

### Frame 3 of 6 → `art/villager_basket_walk3.png`

```
Frame 3 of a six-frame walk cycle for this exact character, as a game
character sprite.

CHARACTER: a friendly young medieval peasant woman with a warm open face
and tan skin. Brown hair tucked under a cream headscarf (#f2d3aa) tied
behind her head. She wears a slate-blue long-sleeved dress (#374d68) that
falls all the way to the ground and hides her feet, with a laced bodice and
cream undershirt sleeves rolled below the elbow. Over it a full-length
cream apron (#e9cba3) covering her front from chest to hem. On one hip she
carries a round woven wicker basket (#6c3611) heaped with vegetables --
orange carrots, red tomatoes, green cabbage leaves.

If a reference image of this character is attached, match it exactly and
let it override every description above.

POSE — PASSING, right leg swinging through. She rises to her HIGHEST point
of the cycle over a straight supporting leg. The skirt is at its narrowest,
hanging close and almost still as the swinging leg passes beneath it. Her
free arm hangs near vertical. Her shoulders are square.

CAMERA: the figure faces the viewer almost straight on, the body turned
only very slightly, seen from a little above as from an isometric game
board about 30 degrees above the horizon. Full body, head to feet. She is
walking towards the viewer's right. Keep this same near-frontal view in
all six frames -- do NOT turn the character into a side-on profile, and do
not change the angle between frames.

REGISTRATION: identical canvas, identical figure height and identical
horizontal centre in every frame of this cycle. The lowest point of the hem
rests on the bottom edge. Do not zoom, crop or re-centre.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Chunky simplified forms, warm saturated colours,
soft hand-painted shading, crisp clean edges. A slightly large head and
hands so the character reads at small size. Friendly, not gritty.

READABILITY: displayed about 60 pixels tall. Her rise must read against the
other frames.

LIGHTING: soft and even, from the front and slightly above. NO strong
directional light and no hard shadow down one side.

BACKGROUND: fully transparent. No ground, no grass, no baseplate, no drop
shadow, no cast shadow of any kind.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, frame numbers,
multiple poses in one image, sprite sheets, turnarounds, or any ground
surface.
```

### Frame 4 of 6 → `art/villager_basket_walk4.png`

```
Frame 4 of a six-frame walk cycle for this exact character, as a game
character sprite.

CHARACTER: a friendly young medieval peasant woman with a warm open face
and tan skin. Brown hair tucked under a cream headscarf (#f2d3aa) tied
behind her head. She wears a slate-blue long-sleeved dress (#374d68) that
falls all the way to the ground and hides her feet, with a laced bodice and
cream undershirt sleeves rolled below the elbow. Over it a full-length
cream apron (#e9cba3) covering her front from chest to hem. On one hip she
carries a round woven wicker basket (#6c3611) heaped with vegetables --
orange carrots, red tomatoes, green cabbage leaves.

If a reference image of this character is attached, match it exactly and
let it override every description above.

POSE — CONTACT, right leg leading. This is frame 1 mirrored in the step: her
RIGHT leg is forward, pushing the hem forward and lifting it slightly on the
RIGHT side while the skirt falls back and away on the left. Her body is at
MIDDLE height. Her free arm swings BACK this time, opposite the leading leg.
Her shoulders turn the other way against her hips. The basket stays on the
same hip as always — it does NOT change sides.

CAMERA: the figure faces the viewer almost straight on, the body turned
only very slightly, seen from a little above as from an isometric game
board about 30 degrees above the horizon. Full body, head to feet. She is
walking towards the viewer's right. Keep this same near-frontal view in
all six frames -- do NOT turn the character into a side-on profile, and do
not change the angle between frames.

REGISTRATION: identical canvas, identical figure height and identical
horizontal centre in every frame of this cycle. The lowest point of the hem
rests on the bottom edge. Do not zoom, crop or re-centre.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Chunky simplified forms, warm saturated colours,
soft hand-painted shading, crisp clean edges. A slightly large head and
hands so the character reads at small size. Friendly, not gritty.

READABILITY: displayed about 60 pixels tall. The swing of the hem and of the
free arm must read in the silhouette alone.

LIGHTING: soft and even, from the front and slightly above. NO strong
directional light and no hard shadow down one side.

BACKGROUND: fully transparent. No ground, no grass, no baseplate, no drop
shadow, no cast shadow of any kind.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, frame numbers,
multiple poses in one image, sprite sheets, turnarounds, or any ground
surface.
```

### Frame 5 of 6 → `art/villager_basket_walk5.png`

```
Frame 5 of a six-frame walk cycle for this exact character, as a game
character sprite.

CHARACTER: a friendly young medieval peasant woman with a warm open face
and tan skin. Brown hair tucked under a cream headscarf (#f2d3aa) tied
behind her head. She wears a slate-blue long-sleeved dress (#374d68) that
falls all the way to the ground and hides her feet, with a laced bodice and
cream undershirt sleeves rolled below the elbow. Over it a full-length
cream apron (#e9cba3) covering her front from chest to hem. On one hip she
carries a round woven wicker basket (#6c3611) heaped with vegetables --
orange carrots, red tomatoes, green cabbage leaves.

If a reference image of this character is attached, match it exactly and
let it override every description above.

POSE — DOWN, weight on the right leg. Her weight settles over her right side
and her whole body is at its LOWEST point, the same height as frame 2. The
skirt hangs straight and gathers in slightly, its swing momentarily stilled.
Her free arm passes close to her body. The basket is pressed down against
the hip.

CAMERA: the figure faces the viewer almost straight on, the body turned
only very slightly, seen from a little above as from an isometric game
board about 30 degrees above the horizon. Full body, head to feet. She is
walking towards the viewer's right. Keep this same near-frontal view in
all six frames -- do NOT turn the character into a side-on profile, and do
not change the angle between frames.

REGISTRATION: identical canvas, identical figure height and identical
horizontal centre in every frame of this cycle. The lowest point of the hem
rests on the bottom edge. Do not zoom, crop or re-centre.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Chunky simplified forms, warm saturated colours,
soft hand-painted shading, crisp clean edges. A slightly large head and
hands so the character reads at small size. Friendly, not gritty.

READABILITY: displayed about 60 pixels tall. The drop in her height must
read against the other frames.

LIGHTING: soft and even, from the front and slightly above. NO strong
directional light and no hard shadow down one side.

BACKGROUND: fully transparent. No ground, no grass, no baseplate, no drop
shadow, no cast shadow of any kind.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, frame numbers,
multiple poses in one image, sprite sheets, turnarounds, or any ground
surface.
```

### Frame 6 of 6 → `art/villager_basket_walk6.png`

```
Frame 6 of a six-frame walk cycle for this exact character, as a game
character sprite.

CHARACTER: a friendly young medieval peasant woman with a warm open face
and tan skin. Brown hair tucked under a cream headscarf (#f2d3aa) tied
behind her head. She wears a slate-blue long-sleeved dress (#374d68) that
falls all the way to the ground and hides her feet, with a laced bodice and
cream undershirt sleeves rolled below the elbow. Over it a full-length
cream apron (#e9cba3) covering her front from chest to hem. On one hip she
carries a round woven wicker basket (#6c3611) heaped with vegetables --
orange carrots, red tomatoes, green cabbage leaves.

If a reference image of this character is attached, match it exactly and
let it override every description above.

POSE — PASSING, left leg swinging through. This is the last frame and it
must lead straight back into frame 1. She rises to her HIGHEST point, the
same height as frame 3, over a straight supporting leg. The skirt is at its
narrowest, hanging close and almost still as the swinging leg passes
beneath. Her free arm hangs near vertical. Her shoulders are square.

CAMERA: the figure faces the viewer almost straight on, the body turned
only very slightly, seen from a little above as from an isometric game
board about 30 degrees above the horizon. Full body, head to feet. She is
walking towards the viewer's right. Keep this same near-frontal view in
all six frames -- do NOT turn the character into a side-on profile, and do
not change the angle between frames.

REGISTRATION: identical canvas, identical figure height and identical
horizontal centre in every frame of this cycle. The lowest point of the hem
rests on the bottom edge. Do not zoom, crop or re-centre.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Chunky simplified forms, warm saturated colours,
soft hand-painted shading, crisp clean edges. A slightly large head and
hands so the character reads at small size. Friendly, not gritty.

READABILITY: displayed about 60 pixels tall. Her rise must read against the
other frames.

LIGHTING: soft and even, from the front and slightly above. NO strong
directional light and no hard shadow down one side.

BACKGROUND: fully transparent. No ground, no grass, no baseplate, no drop
shadow, no cast shadow of any kind.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, frame numbers,
multiple poses in one image, sprite sheets, turnarounds, or any ground
surface.
```

---

## 26 — Woodcutter walk cycle → `art/villager_woodcutter_walk1.png` … `villager_woodcutter_walk6.png`

The axe stays over the same shoulder in all six, held by the same hand, and
that arm never swings. Only the FREE arm swings. Each prompt is
self-contained, but attach `art/original/villager_woodcutter.png` as well if
you can -- only the image keeps his face.

### Frame 1 of 6 → `art/villager_woodcutter_walk1.png`

```
Frame 1 of a six-frame walk cycle for this exact character, as a game
character sprite.

CHARACTER: a sturdy, broad-shouldered older medieval woodcutter with a
weathered friendly face, tan skin and a full greying-brown beard (#705034).
A soft slouchy cloth cap in warm brown. He wears a brick-red long-sleeved
tunic (#8e3926) to mid-thigh with a laced V-neck, and cream undershirt
sleeves (#d6b58c) rolled to the elbow leaving thick forearms bare. A wide
dark brown leather belt with a square pewter buckle. Dark brown trousers
(#4d3826) tucked into mid-calf brown leather boots (#714a30). He carries a
large felling axe with a long pale wooden haft and a grey steel head
(#554b46) resting back over one shoulder, gripped by the hand on that side.

If a reference image of this character is attached, match it exactly and
let it override every description above.

POSE — CONTACT, left leg leading. His left foot is forward and flat on the
ground, his right foot is back with the heel lifted and only the toe still
touching. The legs are clearly apart with daylight between them. His body is
at MIDDLE height. His FREE arm swings forward. The arm holding the axe does
not swing; the axe head rocks very slightly with his shoulders.

CAMERA: the figure faces the viewer almost straight on, the body turned
only very slightly, seen from a little above as from an isometric game
board about 30 degrees above the horizon. Full body, head to feet. He is
walking towards the viewer's right. Keep this same near-frontal view in
all six frames -- do NOT turn the character into a side-on profile, and do
not change the angle between frames.

REGISTRATION: identical canvas, identical figure height and identical
horizontal centre in every frame of this cycle. The lowest foot rests on the
bottom edge. The axe may extend above the figure, but keep its reach the
same in every frame. Do not zoom, crop or re-centre.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Chunky simplified forms, warm saturated colours,
soft hand-painted shading, crisp clean edges. A slightly large head and
hands so the character reads at small size. Friendly, not gritty.

READABILITY: displayed about 60 pixels tall. Clear daylight between the legs
and an unmistakable axe silhouette.

LIGHTING: soft and even, from the front and slightly above. NO strong
directional light and no hard shadow down one side.

BACKGROUND: fully transparent. No ground, no grass, no baseplate, no drop
shadow, no cast shadow of any kind.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, frame numbers,
multiple poses in one image, sprite sheets, turnarounds, or any ground
surface.
```

### Frame 2 of 6 → `art/villager_woodcutter_walk2.png`

```
Frame 2 of a six-frame walk cycle for this exact character, as a game
character sprite.

CHARACTER: a sturdy, broad-shouldered older medieval woodcutter with a
weathered friendly face, tan skin and a full greying-brown beard (#705034).
A soft slouchy cloth cap in warm brown. He wears a brick-red long-sleeved
tunic (#8e3926) to mid-thigh with a laced V-neck, and cream undershirt
sleeves (#d6b58c) rolled to the elbow leaving thick forearms bare. A wide
dark brown leather belt with a square pewter buckle. Dark brown trousers
(#4d3826) tucked into mid-calf brown leather boots (#714a30). He carries a
large felling axe with a long pale wooden haft and a grey steel head
(#554b46) resting back over one shoulder, gripped by the hand on that side.

If a reference image of this character is attached, match it exactly and
let it override every description above.

POSE — DOWN, weight on the left leg. His weight has come fully over his left
leg, which is bent at the knee and taking it. His right foot is just leaving
the ground behind him. His body is at its LOWEST point of the whole cycle,
noticeably lower than frame 1. His free arm passes close to his body. The
axe dips with his shoulders.

CAMERA: the figure faces the viewer almost straight on, the body turned
only very slightly, seen from a little above as from an isometric game
board about 30 degrees above the horizon. Full body, head to feet. He is
walking towards the viewer's right. Keep this same near-frontal view in
all six frames -- do NOT turn the character into a side-on profile, and do
not change the angle between frames.

REGISTRATION: identical canvas, identical figure height and identical
horizontal centre in every frame of this cycle. The lowest foot rests on the
bottom edge. The axe may extend above the figure, but keep its reach the
same in every frame. Do not zoom, crop or re-centre.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Chunky simplified forms, warm saturated colours,
soft hand-painted shading, crisp clean edges. A slightly large head and
hands so the character reads at small size. Friendly, not gritty.

READABILITY: displayed about 60 pixels tall. The bend in the supporting knee
must read in the silhouette.

LIGHTING: soft and even, from the front and slightly above. NO strong
directional light and no hard shadow down one side.

BACKGROUND: fully transparent. No ground, no grass, no baseplate, no drop
shadow, no cast shadow of any kind.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, frame numbers,
multiple poses in one image, sprite sheets, turnarounds, or any ground
surface.
```

### Frame 3 of 6 → `art/villager_woodcutter_walk3.png`

```
Frame 3 of a six-frame walk cycle for this exact character, as a game
character sprite.

CHARACTER: a sturdy, broad-shouldered older medieval woodcutter with a
weathered friendly face, tan skin and a full greying-brown beard (#705034).
A soft slouchy cloth cap in warm brown. He wears a brick-red long-sleeved
tunic (#8e3926) to mid-thigh with a laced V-neck, and cream undershirt
sleeves (#d6b58c) rolled to the elbow leaving thick forearms bare. A wide
dark brown leather belt with a square pewter buckle. Dark brown trousers
(#4d3826) tucked into mid-calf brown leather boots (#714a30). He carries a
large felling axe with a long pale wooden haft and a grey steel head
(#554b46) resting back over one shoulder, gripped by the hand on that side.

If a reference image of this character is attached, match it exactly and
let it override every description above.

POSE — PASSING, right leg swinging through. His right leg swings forward
beneath his body, knee bent, the foot just clear of the ground. His left leg
is straight and carrying all the weight. The feet are close together, nearly
overlapping. His body is at its HIGHEST point of the whole cycle. His free
arm hangs near vertical. The axe rides at its highest with him.

CAMERA: the figure faces the viewer almost straight on, the body turned
only very slightly, seen from a little above as from an isometric game
board about 30 degrees above the horizon. Full body, head to feet. He is
walking towards the viewer's right. Keep this same near-frontal view in
all six frames -- do NOT turn the character into a side-on profile, and do
not change the angle between frames.

REGISTRATION: identical canvas, identical figure height and identical
horizontal centre in every frame of this cycle. The supporting foot rests on
the bottom edge. The axe may extend above the figure, but keep its reach the
same in every frame. Do not zoom, crop or re-centre.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Chunky simplified forms, warm saturated colours,
soft hand-painted shading, crisp clean edges. A slightly large head and
hands so the character reads at small size. Friendly, not gritty.

READABILITY: displayed about 60 pixels tall. The lifted swinging foot must
be clearly off the ground in the silhouette.

LIGHTING: soft and even, from the front and slightly above. NO strong
directional light and no hard shadow down one side.

BACKGROUND: fully transparent. No ground, no grass, no baseplate, no drop
shadow, no cast shadow of any kind.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, frame numbers,
multiple poses in one image, sprite sheets, turnarounds, or any ground
surface.
```

### Frame 4 of 6 → `art/villager_woodcutter_walk4.png`

```
Frame 4 of a six-frame walk cycle for this exact character, as a game
character sprite.

CHARACTER: a sturdy, broad-shouldered older medieval woodcutter with a
weathered friendly face, tan skin and a full greying-brown beard (#705034).
A soft slouchy cloth cap in warm brown. He wears a brick-red long-sleeved
tunic (#8e3926) to mid-thigh with a laced V-neck, and cream undershirt
sleeves (#d6b58c) rolled to the elbow leaving thick forearms bare. A wide
dark brown leather belt with a square pewter buckle. Dark brown trousers
(#4d3826) tucked into mid-calf brown leather boots (#714a30). He carries a
large felling axe with a long pale wooden haft and a grey steel head
(#554b46) resting back over one shoulder, gripped by the hand on that side.

If a reference image of this character is attached, match it exactly and
let it override every description above.

POSE — CONTACT, right leg leading. This is frame 1 with the legs swapped.
His RIGHT foot is forward and flat on the ground, his LEFT foot is back with
the heel lifted and only the toe still touching. The legs are clearly apart.
His body is at MIDDLE height. His FREE arm swings BACK this time. The axe
stays over the SAME shoulder as always — it does not change sides.

CAMERA: the figure faces the viewer almost straight on, the body turned
only very slightly, seen from a little above as from an isometric game
board about 30 degrees above the horizon. Full body, head to feet. He is
walking towards the viewer's right. Keep this same near-frontal view in
all six frames -- do NOT turn the character into a side-on profile, and do
not change the angle between frames.

REGISTRATION: identical canvas, identical figure height and identical
horizontal centre in every frame of this cycle. The lowest foot rests on the
bottom edge. The axe may extend above the figure, but keep its reach the
same in every frame. Do not zoom, crop or re-centre.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Chunky simplified forms, warm saturated colours,
soft hand-painted shading, crisp clean edges. A slightly large head and
hands so the character reads at small size. Friendly, not gritty.

READABILITY: displayed about 60 pixels tall. Clear daylight between the legs
and an unmistakable axe silhouette.

LIGHTING: soft and even, from the front and slightly above. NO strong
directional light and no hard shadow down one side.

BACKGROUND: fully transparent. No ground, no grass, no baseplate, no drop
shadow, no cast shadow of any kind.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, frame numbers,
multiple poses in one image, sprite sheets, turnarounds, or any ground
surface.
```

### Frame 5 of 6 → `art/villager_woodcutter_walk5.png`

```
Frame 5 of a six-frame walk cycle for this exact character, as a game
character sprite.

CHARACTER: a sturdy, broad-shouldered older medieval woodcutter with a
weathered friendly face, tan skin and a full greying-brown beard (#705034).
A soft slouchy cloth cap in warm brown. He wears a brick-red long-sleeved
tunic (#8e3926) to mid-thigh with a laced V-neck, and cream undershirt
sleeves (#d6b58c) rolled to the elbow leaving thick forearms bare. A wide
dark brown leather belt with a square pewter buckle. Dark brown trousers
(#4d3826) tucked into mid-calf brown leather boots (#714a30). He carries a
large felling axe with a long pale wooden haft and a grey steel head
(#554b46) resting back over one shoulder, gripped by the hand on that side.

If a reference image of this character is attached, match it exactly and
let it override every description above.

POSE — DOWN, weight on the right leg. This is frame 2 with the legs swapped.
His weight has come fully over his RIGHT leg, which is bent at the knee and
taking it. His LEFT foot is just leaving the ground behind him. His body is
at its LOWEST point, the same height as frame 2. His free arm passes close
to his body. The axe dips with his shoulders.

CAMERA: the figure faces the viewer almost straight on, the body turned
only very slightly, seen from a little above as from an isometric game
board about 30 degrees above the horizon. Full body, head to feet. He is
walking towards the viewer's right. Keep this same near-frontal view in
all six frames -- do NOT turn the character into a side-on profile, and do
not change the angle between frames.

REGISTRATION: identical canvas, identical figure height and identical
horizontal centre in every frame of this cycle. The lowest foot rests on the
bottom edge. The axe may extend above the figure, but keep its reach the
same in every frame. Do not zoom, crop or re-centre.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Chunky simplified forms, warm saturated colours,
soft hand-painted shading, crisp clean edges. A slightly large head and
hands so the character reads at small size. Friendly, not gritty.

READABILITY: displayed about 60 pixels tall. The bend in the supporting knee
must read in the silhouette.

LIGHTING: soft and even, from the front and slightly above. NO strong
directional light and no hard shadow down one side.

BACKGROUND: fully transparent. No ground, no grass, no baseplate, no drop
shadow, no cast shadow of any kind.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, frame numbers,
multiple poses in one image, sprite sheets, turnarounds, or any ground
surface.
```

### Frame 6 of 6 → `art/villager_woodcutter_walk6.png`

```
Frame 6 of a six-frame walk cycle for this exact character, as a game
character sprite.

CHARACTER: a sturdy, broad-shouldered older medieval woodcutter with a
weathered friendly face, tan skin and a full greying-brown beard (#705034).
A soft slouchy cloth cap in warm brown. He wears a brick-red long-sleeved
tunic (#8e3926) to mid-thigh with a laced V-neck, and cream undershirt
sleeves (#d6b58c) rolled to the elbow leaving thick forearms bare. A wide
dark brown leather belt with a square pewter buckle. Dark brown trousers
(#4d3826) tucked into mid-calf brown leather boots (#714a30). He carries a
large felling axe with a long pale wooden haft and a grey steel head
(#554b46) resting back over one shoulder, gripped by the hand on that side.

If a reference image of this character is attached, match it exactly and
let it override every description above.

POSE — PASSING, left leg swinging through. This is frame 3 with the legs
swapped, and it is the last frame, so it must lead straight back into frame
1. His LEFT leg swings forward beneath his body, knee bent, the foot just
clear of the ground. His RIGHT leg is straight and carrying all the weight.
The feet are close together. His body is at its HIGHEST point, the same
height as frame 3. His free arm hangs near vertical. The axe rides at its
highest with him.

CAMERA: the figure faces the viewer almost straight on, the body turned
only very slightly, seen from a little above as from an isometric game
board about 30 degrees above the horizon. Full body, head to feet. He is
walking towards the viewer's right. Keep this same near-frontal view in
all six frames -- do NOT turn the character into a side-on profile, and do
not change the angle between frames.

REGISTRATION: identical canvas, identical figure height and identical
horizontal centre in every frame of this cycle. The supporting foot rests on
the bottom edge. The axe may extend above the figure, but keep its reach the
same in every frame. Do not zoom, crop or re-centre.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Chunky simplified forms, warm saturated colours,
soft hand-painted shading, crisp clean edges. A slightly large head and
hands so the character reads at small size. Friendly, not gritty.

READABILITY: displayed about 60 pixels tall. The lifted swinging foot must
be clearly off the ground in the silhouette.

LIGHTING: soft and even, from the front and slightly above. NO strong
directional light and no hard shadow down one side.

BACKGROUND: fully transparent. No ground, no grass, no baseplate, no drop
shadow, no cast shadow of any kind.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, frame numbers,
multiple poses in one image, sprite sheets, turnarounds, or any ground
surface.
```

---

## Getting them into the game

Save the PNGs under the names above, then:

```
node tools/prep-art.js --walk
```

That keys the background and trims the whole cycle **as one set** against a
shared bounding box, so every frame keeps its registration relative to the
others, scales them all by the same factor, and writes the `.webp` files the
game loads.

The set is all-or-nothing per character: six frames and the game walks that
villager properly; fewer than six and it keeps the standing sprite and the
faked walk for them. So one character's cycle can land on its own, and the
other two are untouched until their frames arrive.

---
---

# 27 — The Beacon, five stages → `art/beacon_stage1.png` … `beacon_stage5.png`

The one building in the game with no ceiling, and the only thing a finished
village has left to do. It **drinks** the surplus — the wood and food a maxed
village was throwing away — and every stage it finishes sends more of what the
village sheds over the water to the neighbours.

So it has to **visibly rise**. A sink nobody can see is a number with a roof
on it, and the whole point of this building is that the player watches it grow
taller across an hour of play.

**Five images, one per stage, and they are a SET.** The game takes all five or
none: until every one is on disk the beacon is not offered in the tray at all,
and `artSweep` will say so if three of five turn up. It has no
`art/beacon.webp` and never will — these five are its art.

Four rules, and the first is the one a generator will get wrong:

- **One canvas, one footprint, one base.** All five stand on the same square of
  ground, at the same place in the frame, at the same width at the base. Only
  the TOP grows. If stage 4 is drawn wider or shifted, the beacon will appear
  to jump sideways the moment it finishes a stage.
- **It grows upward, not outward.** Stage 1 is a stone foundation and a stub.
  Stage 5 is a finished lighthouse with a lit lamp. Roughly: each stage about
  a third taller than the one before.
- **Same even light in all five**, from the upper LEFT, like every other
  building.
- **No scaffolding, no workers, no ropes.** The game draws its own scaffolding
  while a building is going up; a tower that already had scaffolding painted on
  would wear two sets.

| Stage | What it is | Height against a cottage |
|---|---|---|
| 1 | a squared stone footing with the first course laid, a low stub of tower | about the same |
| 2 | a stubby round tower, waist height, rough stone, a wooden door | half again |
| 3 | a proper tower with a narrow window and an iron band, unfinished top | twice |
| 4 | tall, a railed gallery near the top, the lamp housing framed but dark | three times |
| 5 | finished: white and slate bands, a glazed lantern room, the light LIT | three and a half times |

Send them one per message, in order, in one conversation. After the fifth, drop
all five PNGs into `art/` and run `node tools/prep-art.js`.

---

## 27.1 — Stage 1 → `art/beacon_stage1.png`

```
The stone footing of a coastal lighthouse under construction, as a game asset
sprite. Same art style, same camera angle and same lighting as the cottage
image.

CAMERA: strict 2:1 isometric projection, viewed from a corner at 30 degrees
above the horizon. No top-down view, no straight-on elevation.

PLAN: SQUARE in plan. A broad square stone footing with a short round stub of
tower rising from its centre.

SUBJECT: a freshly laid foundation of pale grey quarried blocks, squared off,
two courses high, with a low round stub of tower on top no taller than the
footing itself. A few spare blocks resting on the footing. Weathered mortar
between the stones. No roof, no door yet, no people.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Clean readable silhouette, chunky simplified
forms, warm saturated colours, soft hand-painted shading. No photorealism.

LIGHTING: single key light from the upper LEFT. Left-facing surfaces are lit;
right-facing surfaces fall into soft shadow.

BACKGROUND: fully transparent. No ground, no grass, no rocks, no sea, no
baseplate, no drop shadow, no cast shadow.

FRAMING: the square footing rests on the bottom edge, centred horizontally,
and fills the width of the frame. THIS FOOTING IS THE SAME SIZE AND IN THE
SAME PLACE IN ALL FIVE IMAGES OF THIS SET -- only what stands on it changes.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, scaffolding, cranes,
ropes, workers, character figures, or any ground surface.
```

## 27.2 — Stage 2 → `art/beacon_stage2.png`

```
A coastal lighthouse part-built, as a game asset sprite. Same art style, same
camera angle and same lighting as the cottage image.

CAMERA: strict 2:1 isometric projection, viewed from a corner at 30 degrees
above the horizon.

PLAN: SQUARE in plan, on the SAME square stone footing as before.

SUBJECT: the same pale grey stone footing, now carrying a stubby round tower
about waist height on it -- rough coursed stone, slightly tapered, with a
simple arched wooden door facing the viewer and an iron ring handle. The top
is open and unfinished, the last course uneven. No roof, no windows, no
people.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Clean readable silhouette, chunky simplified
forms, warm saturated colours, soft hand-painted shading.

LIGHTING: single key light from the upper LEFT.

BACKGROUND: fully transparent. No ground, no sea, no baseplate, no shadow.

FRAMING: the footing rests on the bottom edge, centred, SAME SIZE AND PLACE
as stage 1. The tower is about half again the total height of stage 1. Only
the top has grown.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, scaffolding, cranes,
ropes, workers, character figures, or any ground surface.
```

## 27.3 — Stage 3 → `art/beacon_stage3.png`

```
A coastal lighthouse half-built, as a game asset sprite. Same art style, same
camera angle and same lighting as the cottage image.

CAMERA: strict 2:1 isometric projection, viewed from a corner at 30 degrees
above the horizon.

PLAN: SQUARE in plan, on the SAME square stone footing as before.

SUBJECT: the tower now stands a proper storey tall -- tapered coursed stone,
the arched wooden door at its base, one narrow slit window above it, and a
band of dark iron strapping around the middle. The top course is still open
and uneven, nothing above it. No roof, no lamp, no people.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Clean readable silhouette, chunky simplified
forms, warm saturated colours, soft hand-painted shading.

LIGHTING: single key light from the upper LEFT.

BACKGROUND: fully transparent. No ground, no sea, no baseplate, no shadow.

FRAMING: the footing rests on the bottom edge, centred, SAME SIZE AND PLACE
as stages 1 and 2. Total height about twice a cottage. Only the top has
grown.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, scaffolding, cranes,
ropes, workers, character figures, or any ground surface.
```

## 27.4 — Stage 4 → `art/beacon_stage4.png`

```
A tall coastal lighthouse nearly finished but unlit, as a game asset sprite.
Same art style, same camera angle and same lighting as the cottage image.

CAMERA: strict 2:1 isometric projection, viewed from a corner at 30 degrees
above the horizon.

PLAN: SQUARE in plan, on the SAME square stone footing as before.

SUBJECT: a tall tapered stone tower on the same footing, with the arched
wooden door at its base, two narrow windows up its height, and near the top a
railed gallery of dark iron on stone corbels. Above the gallery the lamp
housing is framed in iron but UNGLAZED AND DARK -- an empty cage, no light.
No people.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Clean readable silhouette, chunky simplified
forms, warm saturated colours, soft hand-painted shading.

LIGHTING: single key light from the upper LEFT. Nothing glows.

BACKGROUND: fully transparent. No ground, no sea, no baseplate, no shadow.

FRAMING: the footing rests on the bottom edge, centred, SAME SIZE AND PLACE
as the earlier stages. Total height about three times a cottage. Only the top
has grown.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, scaffolding, cranes,
ropes, workers, character figures, or any ground surface.
```

## 27.5 — Stage 5 → `art/beacon_stage5.png`

```
A finished coastal lighthouse with its light burning, as a game asset sprite.
Same art style, same camera angle and same lighting as the cottage image.

CAMERA: strict 2:1 isometric projection, viewed from a corner at 30 degrees
above the horizon.

PLAN: SQUARE in plan, on the SAME square stone footing as before.

SUBJECT: the completed lighthouse -- a tall tapered tower in broad bands of
cream-white and slate grey, the arched wooden door at its base, narrow
windows up its height, a railed iron gallery near the top, and above it a
glazed lantern room with a brass frame. THE LAMP IS LIT: a warm golden glow
inside the glass, spilling softly onto the gallery rail and the stonework
just below it. A small weathervane on the cap. No people.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Clean readable silhouette, chunky simplified
forms, warm saturated colours, soft hand-painted shading.

LIGHTING: single key light from the upper LEFT, plus the lamp's own warm glow
at the top. Keep the glow CONTAINED to the lantern room and the stone
immediately around it -- no long beams, no rays across the frame, nothing
that would need the background to be visible.

BACKGROUND: fully transparent. No ground, no sea, no sky, no light beams
across the frame, no baseplate, no drop shadow.

FRAMING: the footing rests on the bottom edge, centred, SAME SIZE AND PLACE
as every earlier stage. Total height about three and a half times a cottage.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, scaffolding, cranes,
ropes, workers, character figures, light beams, or any ground surface.
```

---

## 27b — Stages 1 and 2, redrawn  ✅ DONE

The five images arrived and are in the game. Three to five are excellent and
agree with one another. **One and two do not**: they were drawn as a close-up
of a broad stepped plinth filling a landscape frame, and three to five draw
the whole tower standing on a narrow stepped skirt. Measured footings, in the
set's own output pixels:

```
stage      1     2     3     4     5
footing  799   765   382   320   420   px
```

Two and a half to one. `artRect` pins a building's sprite width to its plot,
so that is the ground under the lighthouse halving at the 2→3 step while the
tower goes up. `prep-art.js` warns about it now but cannot repair it: the fit
shifts frames and never scales them, and matching the footings in code was
tried and is worse — the lit lighthouse has a wider apron than the unlit one,
so normalising shrank the FINISHED building and the beacon got shorter at the
moment it was completed.

So it is an art fix, and only for the first two. The thing to change is the
subject, not the framing: **there is no broad plinth.** The tower stands on a
low stepped skirt barely wider than itself, with a few loose blocks at the
corners — the base stages 3, 4 and 5 already draw. Generate these two and drop
them in over the existing `beacon_stage1.png` / `beacon_stage2.png`; the other
three stay as they are.

### 27b.1 → `art/beacon_stage1.png`

```
The stone footing of a coastal lighthouse under construction, as a game asset
sprite. Same art style, same camera angle and same lighting as the cottage
image.

CAMERA: strict 2:1 isometric projection, viewed from a corner at 30 degrees
above the horizon. No top-down view, no straight-on elevation.

PLAN: SQUARE in plan. A low square stone skirt, only slightly wider than the
tower that will stand on it -- NOT a broad platform or plinth.

SUBJECT: a freshly laid foundation of pale grey quarried blocks, squared off,
two courses high, with a low round stub of wall rising from its centre no
taller than the skirt itself. A few loose blocks at the corners. Weathered
mortar between the stones. No roof, no door yet, no people.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Clean readable silhouette, chunky simplified
forms, warm saturated colours, soft hand-painted shading. No photorealism.

LIGHTING: single key light from the upper LEFT. Left-facing surfaces are lit;
right-facing surfaces fall into soft shadow.

BACKGROUND: fully transparent. No ground, no grass, no rocks, no sea, no
baseplate, no drop shadow, no cast shadow.

FRAMING: a TALL PORTRAIT frame. The footing sits at the bottom, small,
occupying about one third of the frame's width, with the upper two thirds of
the frame empty -- this is the first of five images of a lighthouse that will
grow to fill that space, and it must be drawn at the same distance as the
others. Leave a clear margin below it; do not let it touch the bottom edge.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, scaffolding, cranes,
ropes, workers, character figures, a wide platform or plinth, or any ground
surface.
```

### 27b.2 → `art/beacon_stage2.png`

```
A coastal lighthouse part-built, as a game asset sprite. Same art style, same
camera angle and same lighting as the cottage image.

CAMERA: strict 2:1 isometric projection, viewed from a corner at 30 degrees
above the horizon.

PLAN: SQUARE in plan, on the SAME low square stone skirt as stage 1 -- barely
wider than the tower, NOT a broad platform.

SUBJECT: the same pale grey stone footing, now carrying a stubby tower about
waist height -- rough coursed stone, slightly tapered, with a simple arched
wooden door facing the viewer and an iron ring handle. A few loose blocks at
the corners. The top is open and unfinished, the last course uneven. No roof,
no windows, no people.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Clean readable silhouette, chunky simplified
forms, warm saturated colours, soft hand-painted shading.

LIGHTING: single key light from the upper LEFT.

BACKGROUND: fully transparent. No ground, no sea, no baseplate, no shadow.

FRAMING: a TALL PORTRAIT frame, the same distance as stage 1 -- the footing
the same width in the frame, about one third of it, with most of the frame
above still empty. The building is about half again the height of stage 1.
Only the top has grown. Leave a clear margin below it; do not let it touch
the bottom edge.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, scaffolding, cranes,
ropes, workers, character figures, a wide platform or plinth, or any ground
surface.
```

After dropping both in, run `node tools/prep-art.js beacon` and read the
footing line. Under 1.5x and it stops warning.

**Both were generated and are in the game.** The footings went from
`799 765 382 320 420` (2.5x, warning) to `726 726 708 593 779` (1.3x, quiet),
and the set now cuts to 800x1496 and rises 1022px where it managed 295px
before. Nothing in group 27b is outstanding.

---
---

# 28 — What was already on the island → `art/find_stones.png` … `find_wreck.png`  ✅ DONE

Claiming a ring of land is the best moment this game has, and until now it
revealed grass. Each of the four rings now has something on it that was there
before the village was — standing stones, an orchard gone feral, the cottage of
whoever tried this island first, and their boat.

They are **found, not bought.** No cost, not in the tray, not rationed, cannot
be sold. You cannot decide to have one; you can only go and look.

**Until the art exists they are not placed at all.** The game checks for the
picture before putting a landmark down, so right now the feature is dormant and
nothing is broken — the same rule the beacon uses. Drop the four PNGs in and
every ring you have already claimed gets its landmark the next time the game
opens, put where it should always have been.

Four images, one per ring. They are **2×2 plots**, the same footprint as a farm
or a storehouse, so they should read at that size. All four share the cottage's
camera and lighting.

After generating them, drop all four into `art/` and run:

```bash
cd "D:\Claude ai\Remotion\village"; node tools/prep-art.js
```

### 28.1 → `art/find_stones.png`  (ring 1 — *The Old Stones*, 20 charm)

```
A ring of ancient standing stones on grass, as a game asset sprite. Same art
style, same camera angle and same lighting as the cottage image.

CAMERA: strict 2:1 isometric projection, viewed from a corner at 30 degrees
above the horizon. No top-down view, no straight-on elevation.

PLAN: SQUARE in plan, filling a square plot about twice the width of a
cottage.

SUBJECT: five rough grey standing stones set in a circle, the tallest about
the height of a man, leaning at slightly different angles. Weathered, pitted,
patched with pale green and yellow lichen. Tufts of long grass at their bases.
Much older than anything else in the village. No carvings, no runes, no
markings of any kind. No people.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Clean readable silhouette, chunky simplified forms,
warm saturated colours, soft hand-painted shading. No photorealism.

LIGHTING: single key light from the upper LEFT. Left-facing surfaces are lit;
right-facing surfaces fall into soft shadow.

BACKGROUND: fully transparent. No ground plane, no grass field, no baseplate,
no drop shadow, no cast shadow -- only the stones and the small tufts at their
feet.

FRAMING: centred, the whole group filling the frame with a small clear margin
all round. Do not let it touch any edge.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, people, animals,
buildings, fences, paths, or any ground surface.
```

### 28.2 → `art/find_orchard.png`  (ring 2 — *The Wild Orchard*, 30 charm)

```
A small overgrown orchard of old fruit trees, as a game asset sprite. Same art
style, same camera angle and same lighting as the cottage image.

CAMERA: strict 2:1 isometric projection, viewed from a corner at 30 degrees
above the horizon.

PLAN: SQUARE in plan, filling a square plot about twice the width of a
cottage.

SUBJECT: six or seven old apple trees still standing in the rows somebody
planted them in, now gone wild -- gnarled trunks, uneven crowns, branches
crossing into one another. A scatter of small red fruit in the leaves and a
few fallen in the long grass between them. One tree leaning badly. Nettles and
tall weeds have taken the rows. Abandoned, not tended. No people.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Clean readable silhouette, chunky simplified forms,
warm saturated colours, soft hand-painted shading.

LIGHTING: single key light from the upper LEFT.

BACKGROUND: fully transparent. No ground plane, no grass field, no baseplate,
no drop shadow.

FRAMING: centred, the whole group filling the frame with a small clear margin
all round. Keep the trees SHORT enough to read as an orchard on a plot rather
than as forest -- about twice the height of a cottage door, not forest-tall.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, people, animals,
fences, walls, buildings, paths, or any ground surface.
```

### 28.3 → `art/find_ruin.png`  (ring 3 — *The Old Cottage*, 45 charm)

```
The ruin of a small stone cottage, as a game asset sprite. Same art style,
same camera angle and same lighting as the cottage image.

CAMERA: strict 2:1 isometric projection, viewed from a corner at 30 degrees
above the horizon.

PLAN: SQUARE in plan, filling a square plot about twice the width of a
cottage.

SUBJECT: a roofless cottage of pale grey stone, walls standing to about
shoulder height on three sides and crumbled low on the fourth. An empty
doorway with no door, one empty window opening. A stone chimney breast still
standing at one gable, taller than the walls, with a cold dark hearth at its
foot. Fallen stones heaped where the walls gave way. Ivy up one corner, grass
and small shrubs growing inside the walls. Long abandoned. No people.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Clean readable silhouette, chunky simplified forms,
warm saturated colours, soft hand-painted shading.

LIGHTING: single key light from the upper LEFT.

BACKGROUND: fully transparent. No ground plane, no grass field, no baseplate,
no drop shadow.

FRAMING: centred, filling the frame with a small clear margin all round. It
must read clearly as a RUIN and not as a building under construction -- no
scaffolding, no neat stacks of cut stone, no timber frame, no tools.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, people, animals,
scaffolding, cranes, ropes, tools, a roof of any kind, or any ground surface.
```

### 28.4 → `art/find_wreck.png`  (ring 4 — *The Old Wreck*, 60 charm)

```
The wreck of a small wooden fishing boat up on a shingle shore, as a game
asset sprite. Same art style, same camera angle and same lighting as the
cottage image.

CAMERA: strict 2:1 isometric projection, viewed from a corner at 30 degrees
above the horizon.

PLAN: SQUARE in plan, filling a square plot about twice the width of a
cottage.

SUBJECT: an old clinker-built fishing boat lying canted over on its side on
grey shingle, well above the water. The hull is broken open along one flank
and the ribs show through like a cage. Planking grey and silvered with age,
the last of its paint -- a faded blue stripe -- peeling along the gunwale. A
stub of broken mast. A coil of rotted rope and a cracked lobster pot in the
shingle beside it. Long abandoned. No people.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Clean readable silhouette, chunky simplified forms,
warm saturated colours, soft hand-painted shading.

LIGHTING: single key light from the upper LEFT.

BACKGROUND: fully transparent. NO SEA, no water, no waves, no ground plane, no
baseplate, no drop shadow -- the boat is a long way up the beach and the game
puts it on grass. Keep the small patch of shingle immediately under the hull
and nothing more.

FRAMING: centred, filling the frame with a small clear margin all round.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, people, animals, sea,
water, waves, harbour, jetty, other boats, or any ground surface beyond the
shingle directly under the hull.
```

# 29 — The quarry → `art/quarry.png`  ✅ DONE

Stone is the third thing the village keeps, and the quarry is the only place it
comes from. The mill, the market, the statue and the beacon are built of it, so
the hall reaching level three stops being "now you may have a mill" and becomes
"now you may have a mill, once you have taken two villagers off wood or food
and put them on stone".

**The game ships with it already working.** Until this picture exists the
quarry is drawn by the procedural building — timber walls and a shingled roof,
the same stand-in every building had before its art arrived — so the economy is
complete and the sprite is the only thing missing. Drop the PNG in and it takes
over everywhere, with no other change.

It is a **2×1 plot**, the same footprint as the lumber camp, which is what two
of them replace in a full village's allowance. It should read at that size and
sit at the same height in the world: low and wide, not a tower.

After generating it, drop it into `art/` and run:

```bash
cd "D:\Claude ai\Remotion\village"; node tools/prep-art.js
```

### 29.1 → `art/quarry.png`

```
A small stone quarry with a cutting shed, as a game asset sprite. Same art
style, same camera angle and same lighting as the lumber camp image.

CAMERA: strict 2:1 isometric projection, viewed from a corner at 30 degrees
above the horizon. No top-down view, no straight-on elevation.

PLAN: RECTANGULAR in plan, twice as wide as it is deep -- the same footprint
as the lumber camp, lying along the wide axis.

SUBJECT: a shallow cut into pale grey rock at one end, with two or three
squared-off blocks of stone part-cut from the face and chisel marks still on
them. Beside it a low open-sided timber shed with a shingled roof, its posts
set on stone footings, sheltering a work bench and a stack of finished blocks.
A wooden mallet and two iron chisels left on the bench. A small heap of
rubble and grey dust at the foot of the cut. Low and wide and workmanlike --
no tower, no chimney, no wheel, no machinery. No people.

STYLE: stylised low-poly mobile strategy game art, in the vein of Clash of
Clans or Rise of Kingdoms. Clean readable silhouette, chunky simplified forms,
warm saturated colours, soft hand-painted shading. No photorealism.

LIGHTING: single key light from the upper LEFT. Left-facing surfaces are lit;
right-facing surfaces fall into soft shadow.

BACKGROUND: fully transparent. No ground plane, no grass field, no baseplate,
no drop shadow, no cast shadow -- only the cut, the shed and the stone around
their feet.

FRAMING: centred, the whole thing filling the frame with a small clear margin
all round. Do not let it touch any edge.

DO NOT INCLUDE: text, labels, watermarks, UI, borders, people, animals, carts,
rails, wagons, water, or any ground surface beyond the rubble at the foot of
the cut.
```

---
---

# 30 — The stonecutter → `art/villager_stonecutter.png` + `_walk1` … `_walk6`  ✅ DONE

The quarry's workers drew on the food workers' sprites until this existed, so
a woman with a basket of vegetables went to work cutting rock. She is worn at
the quarry only; off duty a villager is whoever the pool of three says.

Generated in ONE conversation, standing pose first, then one walk frame per
message, with `art/original/villager_woodcutter.png` and
`villager_woodcutter_walk1.png` attached as the style reference. Then
`node tools/prep-art.js villager_stonecutter` keys, fits and orders the set.

### 30.0 — Standing → `art/villager_stonecutter.png`

```
The two attached images are characters from my game (a woodcutter, standing
and walking). Make a NEW character for the same game, matching their art
style, camera, proportions, scale and lighting exactly. A medieval
stonecutter woman standing still, as a game character sprite.

CAMERA: near-frontal, body turned only very slightly towards the viewer's
right, seen from a little above as from an isometric game board about 30
degrees above the horizon -- the same view as the attached woodcutter.
Full body, both feet on the ground.

CHARACTER: a sturdy, strong young woman quarry worker with a friendly
determined face, warm brown skin and dark hair tied back under a faded
blue-grey kerchief (#5d7186). A slate blue-grey long-sleeved tunic
(#4f6274), sleeves pushed up to the elbow; a heavy tan leather work apron
(#9a7650) from chest to knee, powdered pale grey with stone dust; a dark
leather belt; charcoal trousers (#3f3a36); brown leather boots (#714a30).
A stonecutter's PICKAXE rests back over one shoulder: pale wooden haft,
grey iron head pointed at BOTH ends, so it reads as a pick and not an axe.

STYLE / READABILITY / LIGHTING / BACKGROUND / FRAMING / DO NOT INCLUDE:
as group 7 (the woodcutter) -- low-poly mobile strategy style, 60 px tall,
soft even frontal light, fully transparent, feet on the bottom edge, one
pose only.
```

### 30.1 – 30.6 — Walk frames → `art/villager_stonecutter_walk1.png` …

Frame 1 restates the whole character and the registration rules of group 26
("identical canvas, identical figure height and identical horizontal centre
in every frame ... the pick may extend above the figure, but keep its reach
the same"); frames 2-6 each say "same character, same camera, same canvas,
same size, same everything except the pose" and give only the pose, taken
word for word from group 26 with the axe read as the pick:

1. CONTACT, left leg leading -- free arm forward, the pick arm does not swing
2. DOWN, weight on the left leg -- lowest point of the cycle
3. PASSING, right leg swinging through -- highest point
4. CONTACT, right leg leading -- free arm back; the pick never changes shoulder
5. DOWN, weight on the right leg
6. PASSING, left leg swinging through -- leads back into frame 1

One frame (5) came back on flat white rather than transparency;
prep-art.js keys a flat background, and the set registered within 2%.

---
---

# 31 — The market trader → `art/villager_trader.png` + `_walk1` … `_walk6`  ✅ DONE

The market makes wood -- the trickle its trader turns over -- so its one hand
was drawn as a woodcutter, felling axe and all, walking the stalls. He is worn
at the market only, the way the stonecutter is worn at the quarry.

Same method as group 30: one conversation, the standing pose first with
`art/original/villager_woodcutter.png` and `villager_stonecutter.png`
attached, then one walk frame per message with the group 26 poses (the crate
reads as the axe: the arm steadying it never swings, and it never changes
shoulder). `node tools/prep-art.js villager_trader` registered the six
within 5%.

### 31.0 — Standing → `art/villager_trader.png`

```
The two attached images are villagers from my game (a woodcutter and a
stonecutter). Make a NEW character for the same game, matching their art
style, camera, proportions, scale and lighting exactly. A medieval market
trader standing still, as a game character sprite.

CHARACTER: a cheerful, round-faced, middle-aged merchant man with rosy
cheeks, light olive skin and a neat dark moustache. A soft green felt cap
(#4f7a3a) with a small feather. A mustard-yellow long-sleeved tunic
(#c99a2e), and over it a market apron with bold vertical stripes of red
and cream (#b8382c and #efe2c4), like a market-stall awning. A brown
leather belt with a small coin purse, dark brown trousers (#4d3826) and
brown leather boots (#714a30). He carries a WOODEN CRATE of goods on one
shoulder, steadied by the hand on that side -- red apples and a rolled
bolt of blue cloth poking out of the top. His other arm hangs free.

CAMERA / STYLE / READABILITY / LIGHTING / BACKGROUND / FRAMING / DO NOT
INCLUDE: as group 30 -- near-frontal from a little above, low-poly mobile
strategy style, 60 px tall with the apron and crate in the silhouette,
soft even frontal light, fully transparent, feet on the bottom edge.
```

---
---

# 32 — The miller → `art/villager_miller.png` + `_walk1` … `_walk6`  ✅ DONE

The mill makes food, so its two hands were the field hands -- the farmer and
the woman with the basket of vegetables -- standing in for whoever grinds the
grain. With a quarry hand and a trader drawn, the mill was the last workplace
without a figure of its own. Worn at the mill only.

Same method as groups 30 and 31, with `villager_woodcutter.png` and
`villager_trader.png` attached for the standing pose. One frame (6) came back
on a solid background; the keyer floods in from the edges, and his cream
clothes survived it whole. Registered within 4%.

### 32.0 — Standing → `art/villager_miller.png`

```
The two attached images are villagers from my game (a woodcutter and a
market trader). Make a NEW character for the same game, matching their art
style, camera, proportions, scale and lighting exactly. A medieval miller
standing still, as a game character sprite.

CHARACTER: a tall, lanky young man with a long friendly face, freckles,
pale skin and a mop of ginger hair under a soft flat cap of oatmeal linen
(#d8c8a4). Everything about him is dusted white with flour -- his hair, his
eyebrows, his shoulders. A loose cream linen shirt (#eee3cc) with the
sleeves rolled up, a short brown leather waistcoat (#7a5332), a long
off-white canvas apron (#e9e2d2) smeared with flour, grey-brown trousers
(#6b5a48) and brown leather boots (#714a30). He carries a fat bulging
FLOUR SACK of pale hessian (#d9c39a) over one shoulder, gripped at its neck
by the hand on that side. His other arm hangs free.

CAMERA / STYLE / READABILITY / LIGHTING / BACKGROUND / FRAMING / DO NOT
INCLUDE: as group 30.
```

---
---

# 33 — More of the wild island → `art/tree_birch.png`, `stump.png`, `flowers_wild.png`  ✅ DONE

The island was dressed with four things -- a pine, an oak, a boulder and a
bush -- stamped across every open tile. These are three more, in one
conversation with `art/original/tree_oak.png` and `bush.png` attached, under
the scenery rules of groups 8-11 (strong light from the upper left, base on
the bottom edge, never mirrored).

They take tiles from the kinds they were split from and from nothing else:
rocks and pines keep exactly the share they had, the oaks give some to the
birch, the bushes some to the stump and the wildflowers. If a picture is
missing the tile draws as its parent kind (SCENERY_FALLBACK).

### 33.1 → `art/tree_birch.png`

```
A single silver birch tree, as a game asset sprite, matching the attached
oak and bush. A slender silver birch: a tall thin trunk of bright white
bark marked with dark horizontal bands and black knots, leaning very
slightly, branching high into a light, airy, upright canopy of small fresh
yellow-green leaves built from three or four soft rounded clumps. Taller
than it is wide, and clearly lighter and more delicate than the oak, so the
two read as different trees at a glance.
CAMERA / STYLE / LIGHTING / BACKGROUND / FRAMING / DO NOT INCLUDE: as
group 9.
```

### 33.2 → `art/stump.png`

```
An old tree stump: squat and wide, about knee height. A flat cut top
showing pale growth rings, rough dark brown bark, a few thick roots flaring
at the base, soft green moss on one side, and three or four red-capped
white-spotted toadstools against its foot. Low and wider than it is tall --
a little detail for the ground, not a feature. No axe, no logs.
```

### 33.3 → `art/flowers_wild.png`

```
A small patch of wildflowers: a loose rounded clump of wild meadow plants
about shin height -- tall grass blades and leaves with white daisies, a few
red poppies and some small purple-blue cornflowers. Natural and untidy,
growing wild, not a planted flowerbed and with no border. Wider than it is
tall. No pots, fences, stones or insects.
```

This one came back on a painted chequerboard; prep-art.js keyed it and the
119 small gaps the stems enclosed.

---
---

# 34 — Two more ornaments → `art/bench.png`, `art/banner.png`  ✅ DONE

The decorate tray's charm ran 1, 2, 5, 7, 12 and then 45: from a lamp straight
to a statue. The bench (9 charm) and the banner (24) are the rungs between,
priced at about the wood per charm of their neighbours. Generated in one
conversation with `art/original/lamp.png` and `statue.png` attached, under the
decoration rules of groups 18-23.

### 34.1 → `art/bench.png`

```
A rustic wooden village bench, matching the attached lamp and statue. Small
and low, about the footprint of one paving tile, running along the diagonal
of the view. A seat of three thick weathered oak planks on two chunky log
legs at each end, a low plank backrest, wooden pegs and one iron strap. A
folded green cloth and a few fallen autumn leaves on the seat. No figures.
CAMERA / STYLE / LIGHTING / BACKGROUND / FRAMING: as group 22.
```

### 34.2 → `art/banner.png`

```
A village banner on a pole: a little taller than the lamp post and only a
hand's width across. A turned wooden pole in a small square base of grey
stone blocks, a short crossbar near the top, and a long vertical royal blue
banner (#2f4f8f) with a gold fleur-de-lis (#e2b23a), a gold fringe and a
swallowtail point -- the town hall's own colours. A small gilded finial.
No letters, no real-world flags.
```

It came back on a painted chequerboard; prep-art.js keyed it.

---
---

# 35 — The statue in three figures → `art/statue_knight.png`, `art/statue_fisher.png`  ✅ DONE

The charm goal comes to about fourteen statues -- the ceiling over the best
ornament -- and they were fourteen copies of one woman with a sheaf of wheat.
Two more figures on the same plinth; each statue takes one of the three by its
id (STATUE_LOOKS in game.js), so it keeps its figure when moved or reloaded.
Same price, same charm: only the picture changes.

Generated in one conversation with `art/original/statue.png` attached and the
instruction to keep the plinth identical; both came back at the original's
exact size.

### 35.1 → `art/statue_knight.png`

```
A SECOND statue for the set -- same style, camera, lighting, scale and the
SAME stone plinth as the attached one; only the figure changes. A carved
medieval knight in plate armour and a long surcoat, both hands on the pommel
of a great sword planted point-down, a kite shield against his leg, head
bare. The same pale weathered sandstone with moss and lichen -- a carving,
no paint, no metal shine. Silhouette clearly different from the attached.
```

### 35.2 → `art/statue_fisher.png`

```
A THIRD statue for the set, same plinth. A carved sturdy old fisherman in a
long oilskin coat and a sou'wester, full beard, one hand shading his eyes as
he looks out to sea, a coiled net over his shoulder. Same sandstone, moss
and lichen. No water, no boats.
```

---
---

# 36 — Sheep on the open grass → `art/sheep.png`, `art/sheep_rest.png`  ✅ DONE

Everything out on the open ground was a plant or a rock. Two sheep -- one
grazing, one lying down -- as scenery: no behaviour, just the one thing on
the island that is alive. Generated in one conversation with
`art/original/bush.png` and `villager_farmer.png` attached for style and
scale (a sheep's back about at the farmer's knee).

The island is fixed and its small scenery falls on eight tiles, so the bands
in the SCENERY kind line are set to give one of each: three rocks as before,
then a bush, a grazing sheep, a stump, a patch of flowers and a sheep lying
down. Missing pictures fall back to the bush.

### 36.1 → `art/sheep.png`

```
A single grazing sheep, matching the attached bush (style) and farmer
(scale). Side-on along the diagonal, facing the lower left. A plump fluffy
white sheep, the fleece a few chunky rounded lumps, black face and legs,
small ears out sideways, head lowered to graze. Friendly and a little
comical. Clearly smaller than the bush. No fence, shepherd or grass.
```

### 36.2 → `art/sheep_rest.png`

```
The SAME sheep lying down resting: legs tucked under, a low round cloud of
fleece on the ground, head up and turned slightly to the viewer, eyes half
closed. Lower and a little wider than the grazing one.
```

---
---

# 37 — Boats at anchor → `art/boat_fishing.png`, `art/boat_row.png`  ✅ DONE

On a portrait phone the sea fills the stretches above and below the island,
and it was empty. Two boats riding at anchor there (SEA_PROPS in game.js):
nothing moves and nothing can be tapped. Generated in one conversation with
`art/original/find_wreck.png` (the same kind of boat, broken) and `house.png`
attached.

The generator draws the whole hull down to the keel even when told to stop at
the waterline, so the game sinks the lowest eighth under the surface, lays a
darker patch beneath it and draws the ripple over its foot.

### 37.1 → `art/boat_fishing.png`

```
A small wooden fishing boat riding at anchor -- the same kind of boat as
the attached wreck but whole and cared for: honey-brown clinker planking, a
blue stripe along the gunwale, a short mast with a cream sail furled to its
yard, a coil of rope, two lobster pots and a crate of fish, an anchor rope
from the bow. Bow to the upper right. Nobody aboard. NO water, ripples,
reflection or shadow -- the boat alone.
```

### 37.2 → `art/boat_row.png`

```
A small rowing boat, about half the fishing boat's length: the same
planking with a faded red stripe, two plank seats, a pair of oars shipped
across them, a wicker basket and a coil of rope. No mast. Bow to the upper
LEFT. Nobody aboard, no water.
```

The rowing boat came back on a painted chequerboard; prep-art.js keyed it.

---
---

# 38 — Cottage looks → `art/house_stone.png`, `art/house_thatch.png`  ✅ DONE

A village of ten houses was ten copies of one cottage. Two more looks, chosen
per house from its id (LOOKS in game.js, the same mechanism as the statues);
a house whose look is missing is drawn as the plain cottage. Generated in one
conversation with `art/original/house.png` attached for scale, angle and
light; each look has its own ART_FIT entry because its front corner sits at a
different place in the picture. Prompts in short:

### 38.1 → `art/house_stone.png`

```
A second variant of the attached cottage, same size, angle, light and
painted style: walls of rough grey fieldstone with pale quoins, a roof of
blue-grey slate with timber bargeboards, a small round window in the gable,
a plank door, a window box of red flowers, the stone chimney. Nothing around
it -- no ground, no shadow.
```

### 38.2 → `art/house_thatch.png`

```
A THIRD cottage variant: whitewashed cob walls on a stone footing, a deep
rounded THATCHED roof of golden straw with a ridge pattern, a brick-topped
chimney, a green door with a climbing rose beside it, small shuttered
windows. The LONG side faces the viewer's lower left with the door on that
long front wall. Nothing around it.
```

The thatch came back on a painted chequerboard; prep-art.js keyed it.

---
---

# 39 — Farm looks → `art/farm_veg.png`, `art/farm_barley.png`  ✅ DONE

Every farm was the same wheat field. Two more looks, chosen per farm from its
id (LOOKS in game.js, as for the cottages). Generated in the cottage
conversation with `art/original/farm.png` attached; both came back on real
transparency and in the wheat farm's frame, so their ART_FIT entries keep its
width.

### 39.1 → `art/farm_veg.png`

```
A SECOND farm variant at exactly the same size, angle, footprint and fence
as the attached wheat farm: a VEGETABLE GARDEN inside the same rope-tied
timber fence -- tidy rows of dark soil with green cabbages, feathery carrot
tops, leeks, and a corner patch of orange pumpkins on their vines; a
straw-hatted scarecrow on a pole near the back corner; a wooden wheelbarrow
and a watering can by the fence. Nothing outside the fence: NO glow, NO
background, NO ground around it, NO shadow -- transparent background.
```

### 39.2 → `art/farm_barley.png`

```
A THIRD farm variant, same size, angle, footprint and fence: a BARLEY field
half way through harvest -- the back half still standing in pale green-gold
barley with drooping whiskered heads, the front half cut to short stubble
with three tied sheaves stood up together in stooks, a wooden hay rake
leaning on the fence and a small two-wheeled handcart with a few sheaves in
it. Same warm light from the upper left. Nothing outside the fence --
transparent background.
```

---
---

# 40 — A second look for every repeated workplace  ✅ DONE

A full village has four lumber camps, four wells, four storehouses, three
mills, two markets and two quarries, each a copy of one picture. One more
look for each, chosen per building from its id (LOOKS in game.js). All six
generated in the cottage conversation with the building's own original
attached for size, angle and light, and all came back on real transparency.
Each was fitted on its plot with the game's own artRect geometry before going
in; where the measured front corner was a stray prop (the sawpit's firewood,
the post mill's ladder) the anchor was set from the structure instead.

### 40.1 → `art/lumber_pit.png`

```
A SECOND lumber camp variant at the same size, angle and footprint, its long
side running the same way: an open-air SAWPIT yard instead of the shed -- a
big log across a timber trestle over a shallow pit with a long two-man pit
saw standing in the cut, a neat stack of sawn planks under a small lean-to of
bark shingles on two posts at one end, a chopping block with an axe, a pile
of split firewood and scattered wood chips, a few stone footings. Nobody in
it. Nothing around it -- transparent background.
```

### 40.2 → `art/well_iron.png`

```
A SECOND well variant at the same size and angle: a SQUARE well head of pale
dressed stone with a worn lip, no roof -- a curved wrought-iron arch over it
with a small iron pulley wheel, a rope down to a wooden bucket on the lip, a
second bucket on the flagstones, a little moss and grass in the joints.
Nothing beyond the flagstones -- transparent background.
```

### 40.3 → `art/store_granary.png`

```
A SECOND storehouse variant at the same size, angle and footprint: a
stone-built GRANARY -- honey-coloured stone walls with timber lintels, a
steep roof of grey stone slates with a louvred vent on the ridge, raised on
mushroom-shaped staddle stones, wooden steps up to an iron-strapped double
door, a pulley beam with a sack on its hook, sacks, barrels and a crate by
the steps. Transparent background.
```

### 40.4 → `art/mill_post.png`

```
A SECOND windmill variant at the same size and angle, its base on the same
footprint: a timber POST MILL -- a tall boxy body of weathered planks with a
curved shingle roof on a braced central post over a low round stone
roundhouse; four lattice sails with furled cream canvas in the same X as the
attached one; a tail pole with a small cartwheel; a ladder to the door;
sacks and a barrel at the foot. Transparent background.
```

A post mill is narrower than a tower mill; it is drawn a little wider than
the tower (w 1.15 against 1.05) so its roundhouse fills the plot's middle and
it stands about as tall.

### 40.5 → `art/market_hall.png`

```
A SECOND market variant at the same size, angle and footprint: a small
timber-framed MARKET HALL -- open on all sides under a broad hipped roof of
red clay tiles with a little bell turret; trestle tables of cloth, cheese,
loaves, honey and brass scales; baskets of apples and crates of pears; a
hanging sign of a golden sheaf. Green and mustard instead of the attached
one's red-and-white awnings. Transparent background.
```

### 40.6 → `art/quarry_pit.png`

```
A SECOND quarry variant at the same size, angle and footprint: an open pit
cut in stepped terraces into warm golden sandstone, a wooden treadwheel
crane lifting a squared block, a sledge with a block on rollers, a stack of
finished blocks, a mallet and chisels, scattered chips. Transparent
background.
```

---
---

# 41 — Ornament looks → `art/lamp_bracket.png`, `art/flowers_planter.png`  ✅ DONE

Charm comes from ornaments, so a pretty village is a dozen of the same lamp
and flower bed. One more look for each, chosen per ornament from its id
(LOOKS in game.js); an ornament is drawn at its kind's height, so a look only
has to match its original's proportions.

The night light used to sit at one fixed point above every lamp. It now
follows each look's lantern (LAMP_GLOW): on top of the post for the original,
off to the bracket side and a little lower for this one.

### 41.1 → `art/lamp_bracket.png`

```
A SECOND lamp variant at the same height and scale: a tall timber post on a
small stone footing with a curved wrought-iron bracket near the top, from
which a black iron lantern hangs on a short chain, its glass glowing warm
amber with a candle inside; a little ivy climbing the post. Nothing beyond
the footing -- transparent background.
```

### 41.2 → `art/flowers_planter.png`

```
A SECOND flower bed variant at the same size and footprint: a low square
raised bed edged with weathered timber boards, purple lavender in a mound at
the back, white and blue cornflowers, a little pink rose bush at one corner,
tiny yellow buds. Different colours from the attached red, pink and yellow
bed. Transparent background.
```

---
---

# 42 — Title screen and store art → `art/title_art.webp`, `art/logo.webp`, `store/feature-graphic.png`  ✅ DONE

The game opened straight onto the island with nothing before it. A title
screen now (index.html, #intro): a painting the shape of the canvas, the logo
over its sky, one button over its water, faded into the running village by a
tap -- which is also the first touch, so it wakes the sound. The store's
feature graphic is the same island painted wide with the same logo over it.

Generated with `store/1-village.jpg` and `resources/icon.png` attached for
buildings, style and palette. Masters in `art/original/`; the game ships
`title_art.webp` (1024x1536, q86) and `logo.webp` (trimmed, 900 wide).

### 42.1 → `art/original/title_art.png`

```
The TITLE SCREEN key art. A tall PORTRAIT painting, 2:3, in the same warm
painted style but richer and more cinematic: a small green island village in
a turquoise sea at golden hour, seen from above at a gentle angle -- the
timber-framed town hall with its bell tower and blue banners at the heart,
red- and slate-roofed cottages, a thatched cottage, a windmill, wheat and
vegetable fields, a market with striped awnings, dirt paths, tiny villagers,
sheep, birch and pine trees, a white stone lighthouse with a glowing lamp on
a rocky point, two small boats, gulls, soft sunbeams. Keep the TOP THIRD calm
sky for the logo and the BOTTOM sixth calm water for a button. Absolutely NO
text, letters, logo or UI.
```

### 42.2 → `art/original/logo.png`

```
The game's LOGO, wide, on a fully TRANSPARENT background. The word "Village"
in big, chunky, friendly hand-lettered serif, carved from honey-coloured wood
with a gold rim, a tiny red roof with a chimney on the V and a green leaf
sprig on the final e; beneath it a cream parchment ribbon reading "ISLAND
BUILDER" in dark-brown capitals. Spell both exactly. Nothing else.
```

It spelled both right first time.

### 42.3 → `art/original/feature_art.png`

```
A WIDE LANDSCAPE version of the title painting for the store banner, composed
for a 2:1 crop: the village in the RIGHT 55%, the LEFT 45% open calm sea
under a golden-pink sky with the sun low, nothing important there because
the logo goes over it. Everything important in the middle band. NO text.
```

---
---

# 43 — The island itself → `art/original/ground_t.png` → `art/ground.webp`  ✅ DONE

The ground plate everything stands on was a flat lawn with a thin rim of
earth. Repainted to look like the title screen's island: bright flowered
grass over sandstone cliffs, a strip of golden sand and a line of surf.

The grass face has to be an exact 2:1 diamond, because the tile grid is laid
on it, and the generator does not draw one:

- asked to repaint the old plate "keeping exactly the same shape", it
  squashed the front of the grass by a sixth to make room for its cliffs and
  tilted the whole face (the right corner 38 px low);
- given a template -- a magenta 2:1 diamond on a 1536x1024 canvas, "grass
  inside, cliffs below the two lower edges" -- it ignored the template's
  position but drew a near-diamond with the cliffs properly underneath:
  front-edge slopes 0.463 and -0.488 against 0.5, the side corners 57% of the
  way down rather than half.

That second one (`ground_t.png`) was straightened in code: the grass found by
colour, its four corners measured, and the picture warped onto a true diamond
by two affine triangles split on the left-right line. They meet without a
seam, and the stretch is mild (the back half to 85%, the front to 115%, cliffs
included). `ground_island.png` is the warped result; its grass face is
1501 x 750.5 and GROUND_FIT in game.js is measured off it.

### 43.1 → `art/original/ground_t.png`

```
Repaint it ON this attached template, keeping the same 1536x1024 canvas:
paint lush flowered grass so it fills EXACTLY the magenta diamond -- the
grass edges on the four magenta lines, all four corners where they are --
and the sandstone cliffs, mossy rocks, ferns and a narrow band of golden
sand with white surf foam entirely BELOW the two lower magenta edges,
hanging into the empty space under the diamond, never covering it. Remove
the magenta line, the pale fill and the words. Everything outside the
island fully transparent.
```

## 44. The open sea

The first water was a 900-wide painting with a few strong features, and on a
phone its repeat showed every third of a screen. This one is evenly lit, with
small crests scattered and no single bright spot, sent with the old texture
attached. Kept at 1400 x 700; the game mirrors it into a 2800 x 1400 tile.

### 44.1 → `art/original/water.png`

```
Next: the SEA around the island (attached: the current water texture).
Please paint a new open-sea texture, seen from the same high isometric
angle, to tile across a large area: clear bright turquoise water like the
title painting, deeper teal in places, soft sunlit caustic ripples, and only
a FEW small scattered white wave crests -- spread evenly and irregularly
with no big feature, no single bright spot, no horizon, no land, no boats,
no objects, and no strong directional pattern, so that a repeat of it is
hard to notice. Evenly lit edge to edge with no vignette. Wide landscape,
fill the whole canvas.
```

---
---

# 45 — Bench and banner looks → `art/bench_stone.png`, `art/banner_pennant.png`  ✅ DONE

The last two repeated ornaments with one picture each. Same conversation as
group 44, each with its original attached. The pennants fly out to one side,
so the pole is a quarter of the way across the picture; DECOR_AX in game.js
stands each banner look on its pole rather than on the picture's middle.

### 45.1 → `art/bench_stone.png`

```
Next: a SECOND village bench variant (attached: the current bench), at the
same size, scale, camera angle and footprint, running along the same
diagonal. This one is a stone garden bench: a thick slab seat of pale
weathered sandstone resting on two carved stone scroll supports, a little
green moss in the cracks and around the feet, a small clump of daisies and
grass at one end, and a terracotta pot of red geraniums standing beside it.
Same painterly style and warm light as the attached bench. No figures, no
text. Nothing beyond the bench and its pot: fully transparent background.
```

### 45.2 → `art/banner_pennant.png`

```
Next: a SECOND village banner variant (attached: the current banner), at the
same height, scale and camera angle, still only a hand's width across. This
one is a tall harbour flagpole: a slender weathered timber mast in a small
round base of grey cobbles with a coil of rope at its foot, a little brass
weathervane-ball finial on top, and two long tapering pennants flying from it
to one side in the sea breeze -- the upper one deep crimson with a thin gold
border, the lower one cream with a crimson stripe. No letters, no emblems of
real countries. Same painterly style and warm light as the attached banner.
Nothing beyond the base: fully transparent background.
```

---
---

# 46 — A flowering cherry → `art/tree_cherry.png`  ✅ DONE

Thirty-odd trees, all green. The oaks give a slice of their band to a cherry
in blossom, which lands on two tiles of the island: two spots of pink, and
no rock, pine or small scenery moves. Same conversation as group 44, with
`art/original/tree_oak.png` attached.

### 46.1 → `art/tree_cherry.png`

```
Next: a new single tree for the same island (attached: the current oak), at
the same scale, camera angle and painterly style: a flowering cherry tree in
full spring blossom. A gnarled dark reddish-brown trunk that splits into a
few curving branches, a rounded airy crown of soft pink and pale pink blossom
clouds with a few fresh green leaves showing through, a handful of loose
petals drifting down, and a little ring of fallen pink petals and grass on
the ground at its foot. About the oak's size. One tree only, no other
objects, no text. Fully transparent background.
```

---
---

# 47 — A third lamp and flower bed, a fourth cottage → `art/lamp_stone.png`, `art/flowers_tulip.png`, `art/house_fisher.png`  ✅ DONE

Lamps and flower beds are what a village is mostly made of once the charm
goals start, and houses are the most-built building. Each original was
attached to its own request in the group 44 conversation. The stone
lantern's flame was found by colour, 56 above its foot at lamp height, and
LAMP_GLOW puts the night light there.

### 47.1 → `art/lamp_stone.png`

```
Next: a THIRD village lamp variant (attached: the original lamp), at the
same height, scale and camera angle, standing straight up in the middle of
its picture. This one is a carved stone lantern pillar: a square base of
pale grey stone blocks, a slender stone column, and on top a small stone
lantern house with a little peaked slate roof and four open arched windows,
a warm amber candle flame glowing inside; a little moss on the base and a
sprig of white flowers at its foot. Same painterly style and warm light as
the attached lamp. No text. Nothing beyond the base: fully transparent
background.
```

### 47.2 → `art/flowers_tulip.png`

```
Next: a THIRD flower bed variant (attached: the original bed), at the same
size, footprint, scale and camera angle. This one is a round bed ringed with
small rounded fieldstones: tall orange and golden tulips and white daisies
in the middle, a ring of blue forget-me-nots around them, and a few bright
green leaves spilling over the stones. Different colours from the original
red, pink and yellow bed and from a purple lavender planter. Same painterly
style and warm light. No text. Nothing beyond the bed: fully transparent
background.
```

### 47.3 → `art/house_fisher.png`

```
Next: a FOURTH variant of the attached cottage, the same size, footprint,
angle, light and painted style: a fisherman's cottage by the sea.
Whitewashed walls over a low base of rough stone, a steep roof of weathered
red-brown clay tiles, sky-blue painted shutters and a blue plank door, a
small round window in the gable, a fishing net and two cork floats hung on
the side wall, a lobster pot and a coil of rope by the door, a whitewashed
chimney. Nothing around it -- no ground, no shadow, no text. Fully
transparent background.
```

---
---

# 48 — A third look for every workplace → `art/lumber_cabin.png`, `well_thatch.png`, `store_barn.png`, `mill_smock.png`, `market_fish.png`, `quarry_slate.png`  ✅ DONE

The six workplaces that had two looks get a third, each generated with its
original attached in the group 44 conversation and asked for the original's
footprint. Fitted by eye on fitsheet renders against their originals; the
smock mill came back a head taller than the stone mill and is drawn a little
narrower to match it.

### 48.1 → `art/lumber_cabin.png`

```
Next: a THIRD variant of the attached lumber camp, the same size, footprint
(a 2x1 rectangle running along the same diagonal), camera angle, light and
painted style. This one is a woodcutter's log cabin workshop: walls of round
stacked logs with notched corners, a low roof of green turf and moss with a
few little white flowers, a wide open front with a sawhorse and a half-cut
log inside, a tall neat stack of split firewood along one side under a small
lean-to, a big splitting stump with an axe in it, and a small handcart with
three logs. Nothing around it -- no ground, no shadow, no text. Fully
transparent background.
```

### 48.2 → `art/well_thatch.png`

```
Next: a THIRD variant of the attached village well, the same size, footprint
(one square tile), camera angle, light and painted style. This one is a
round well of warm honey-coloured sandstone with a cone-shaped golden
thatched roof on two stout timber posts, a wooden windlass with a crank and a
rope, a wooden bucket hanging over the water and a second bucket on the rim,
a little stone trough at its foot with ferns and yellow wildflowers. Nothing
around it -- no ground, no shadow, no text. Fully transparent background.
```

### 48.3 → `art/store_barn.png`

```
Next: a THIRD variant of the attached storehouse, the same size, footprint
(a 2x2 square), camera angle, light and painted style. This one is a big
farm barn: vertical plank walls painted barn red with white trim and white
X-braced double doors, a steep gambrel roof of grey-brown wooden shingles, an
open hay loft door high in the gable with a pulley beam and hay spilling out,
a stone foundation, and round hay bales, sacks of grain and a couple of
barrels stacked beside the doors. Nothing around it -- no ground, no shadow,
no text. Fully transparent background.
```

### 48.4 → `art/mill_smock.png`

```
Next: a THIRD variant of the attached windmill, the same size, footprint (a
2x2 square), camera angle, light and painted style. This one is a smock
mill: a tall eight-sided tower clad in white-painted weatherboard on a low
base of red brick, a dark brown thatched cap on top, four big lattice sails
with cream canvas facing the viewer at the same angle as the attached mill,
a little wooden gallery with a railing running around the tower halfway up,
a small green door at the bottom, and flour sacks and a wheelbarrow by the
door. Nothing around it -- no ground, no shadow, no text. Fully transparent
background.
```

### 48.5 → `art/market_fish.png`

```
Next: a THIRD variant of the attached market, the same size, footprint (a
2x2 square), camera angle, light and painted style. This one is a harbour
fish market: an open timber frame with a roof of blue-and-white striped
canvas awnings, long wooden counters with silver fish laid on crushed ice, a
big crab and a basket of mussels, hanging nets and a lantern, a scale,
barrels and crates of lemons and herbs, and a little painted blue signboard
with a fish shape (no letters). Nothing around it -- no ground, no shadow,
no text. Fully transparent background.
```

### 48.6 → `art/quarry_slate.png`

```
Next: a THIRD variant of the attached quarry, the same size, footprint (a
2x1 rectangle running along the same diagonal), camera angle, light and
painted style. This one is a slate quarry: a stepped rock face of dark
blue-grey slate split into flat layers, neat stacks of cut slate tiles and
dressed blocks, a timber lifting tripod with a rope block and tackle holding
a slab in the air, a stone-cutter's bench with a mallet and chisels, and a
small wooden cart half full of slate. Different colours from the attached
white stone and the honey sandstone quarries. Nothing around it -- no
ground, no shadow, no text. Fully transparent background.
```

---
---

# 49 — A second conifer → `art/tree_spruce.png`  ✅ DONE

Twenty-one of the island's thirty-three trees were one pine. About a third
of them (7 of the 21) are now drawn as this spruce, chosen by tile; the tile
is still a pine to everything else. Same conversation, with
`art/original/tree_pine.png` attached.

### 49.1 → `art/tree_spruce.png`

```
Next: a SECOND conifer for the same island (attached: the current pine), at
the same height, scale, camera angle and painterly style, so the two can
stand side by side in a forest without looking like copies. This one is a
Scots pine / spruce mix: a slightly leaning reddish-orange trunk with flaky
bark visible low down, uneven layered tiers of deep blue-green needles with
gaps between them, a narrower and more ragged silhouette than the attached
pine, a few brown cones, and a little tuft of grass and a fern at its foot.
One tree only, no other objects, no text. Fully transparent background.
```

---
---

# 50 — A ship under sail → `art/boat_ketch.png`  ✅ DONE

A third boat for the sea, in the open water off the island's north-east
shore beside the fishing boat (SEA_PROPS). Same conversation, with
`art/original/boat_fishing.png` attached.

### 50.1 → `art/boat_ketch.png`

```
Next: a third boat for the sea around the island (attached: the current
fishing boat), at the same scale, camera angle and painterly style: a small
two-masted merchant ketch under sail, a dark varnished wooden hull with a
white stripe, two cream canvas sails filled by the breeze and a small red
pennant at the mast top, a few crates and barrels lashed on deck, heeling
very slightly, pointing along the same diagonal as the attached boat. Only
the boat itself, drawn down to the waterline -- no water, no wake, no
reflection, no people, no text. Fully transparent background.
```

---
---

# 51 — The town hall grows → `art/hall_2.png`, `art/hall_3.png`  ✅ DONE

Raising the hall was the one upgrade you could not see. Two grander stages
of the same building on the same plot: a clock tower from level 3, the
guildhall at level 5 (HALL_STAGES in game.js; the look changes when the
upgrade is finished). The first was generated with `art/original/hall.png`
attached; the second in the same thread, from the first.

### 51.1 → `art/hall_2.png`

```
Next: the attached town hall, UPGRADED one step -- the same building grown
grander, keeping its footprint (a 2x2 square), camera angle, light, painted
style, red tile roofs, timber framing, blue-and-gold fleur-de-lis banners
and front steps so it is clearly the same hall. Add: a taller bell tower
with a little clock face (no numbers needed) and a copper-green spire, a
second wing with a row of arched windows, window boxes of red flowers, a
pair of carved stone lamp posts flanking the steps, and a gilded
weathervane. About 15 percent taller than the attached hall, no wider.
Nothing around it -- no ground, no shadow, no text. Fully transparent
background.
```

### 51.2 → `art/hall_3.png`

```
Lovely. Now the FINAL upgrade of that same town hall (the one you just
drew): the grandest version, keeping the same footprint (a 2x2 square),
camera angle, light, painted style, red tile roofs, timber framing and
blue-and-gold fleur-de-lis banners so it is clearly the same building. Make
it a proud guildhall: a tall square clock tower with a gilded clock face, an
open belfry and a tall copper-green spire with a golden finial, a front
arcade of three stone arches at the top of the steps, a small balcony with a
blue-and-gold banner hanging from it, gilded trim, ivy on one corner, and
blue-and-gold pennants on the roof ridges. About 25 percent taller than the
attached original hall, no wider. Nothing around it -- no ground, no shadow,
no text. Fully transparent background.
```

---
---

# 52 — Mossy boulders → `art/rock_moss.png`  ✅ DONE

The island's three rocks were one picture; two of them are now drawn as this
cluster (SCENERY_ALT in game.js, which also holds the spruce). Same
conversation, with `art/original/rock.png` attached.

### 52.1 → `art/rock_moss.png`

```
Next: a SECOND rock for the same island (attached: the current rock), at the
same size, scale, camera angle and painterly style. This one is a cluster of
three rounded granite boulders of different sizes, warm grey with flecks,
the biggest one capped with soft green moss, a few ferns and a clump of
purple heather and little white flowers tucked between them. Same light as
the attached rock. Nothing beyond the boulders and their plants: no ground
plane, no shadow, no text. Fully transparent background.
```

---
---

# 53 — A goat → `art/goat.png`  ✅ DONE

A second grazing animal beside the sheep. The island's small scenery falls on
a fixed handful of tiles, so the goat takes the stump's (the stump comes back
if the goat's picture is missing). Same conversation, with
`art/original/sheep.png` attached.

### 53.1 → `art/goat.png`

```
Next: a grazing animal to join the attached sheep on the island, at the same
scale, camera angle and painterly style: a small brown-and-white goat with
little curved horns and a tiny beard, standing on all four legs with its
head down nibbling grass, facing along the same diagonal as the sheep, about
the sheep's size. Only the goat -- no ground, no grass patch, no shadow, no
text. Fully transparent background.
```

---
---

# 54 — A third bench and banner → `art/bench_rose.png`, `art/banner_maypole.png`  ✅ DONE

Each with its original attached, in the same conversation. The rose arch is
taller than a bench, so an ornament's height can now be set per look
(DECOR_H in game.js); the maypole stands on its middle like the original.

### 54.1 → `art/bench_rose.png`

```
Next: a THIRD village bench variant (attached: the original bench), at the
same scale, camera angle and footprint, running along the same diagonal.
This one is a white-painted wooden garden bench set under a small arched
rose trellis: the arch of thin white-painted timber laths covered in
climbing pink and red roses and green leaves, curving over the bench, the
bench with a slatted back and curled armrests, a little lavender at its
feet. Keep the whole thing only a little taller than the attached bench is
wide. Same painterly style and warm light. No figures, no text. Fully
transparent background.
```

### 54.2 → `art/banner_maypole.png`

```
Next: a THIRD village banner variant (attached: the original banner), at the
same height, scale and camera angle, standing straight up in the middle of
its picture. This one is a little village maypole: a slender white-painted
pole on a small round base of grey stones with daisies, a garland crown of
green leaves and flowers near the top, and long ribbons in red, blue, yellow
and white spiralling down around the pole, their loose ends fluttering a
little. A small gilded ball on top. Same painterly style and warm light. No
figures, no text. Nothing beyond the base: fully transparent background.
```

---
---

# 55 — A pumpkin patch → `art/farm_pumpkin.png`  ✅ DONE

A fourth farm look, with `art/original/farm.png` attached, same conversation.
It came back with the field's fence on the plot's diamond and takes the
barley field's fit.

### 55.1 → `art/farm_pumpkin.png`

```
Next: a FOURTH variant of the attached farm, the same size, footprint (a 2x2
square field), camera angle, light and painted style, with the same low
fence around the field. This one is a pumpkin and squash patch: rows of big
orange pumpkins and a few green and yellow squashes on sprawling vines with
broad green leaves, a friendly straw scarecrow in a patched blue coat and
floppy hat standing in the middle, a small wooden handcart with three
pumpkins at the gate, and a few sunflowers along one fence. Nothing around
it -- no ground beyond the field, no shadow, no text. Fully transparent
background.
```

---
---

# 56 — The baker's cottage → `art/house_baker.png`  ✅ DONE

A fifth house look, with `art/original/house.png` attached, same
conversation. Its bread oven bulges out past the plot, so it is drawn a
little smaller than the other cottages, front wall on the plot's long edge.

### 56.1 → `art/house_baker.png`

```
Next: a FIFTH variant of the attached cottage, the same size, footprint (a
2x1 rectangle along the same diagonal), angle, light and painted style: the
village baker's cottage. Walls of warm ochre plaster with dark timber
framing, a roof of mossy dark-green-grey slate, a round brick bread oven
bulging from the side wall with its own little chimney puffing a wisp of
smoke, a green Dutch door with the top half open, a hanging iron sign shaped
like a loaf of bread (no letters), a window with a shelf of round loaves,
and a sack of flour and a basket of baguettes by the door. Nothing around it
-- no ground, no shadow, no text. Fully transparent background.
```

---
---

# 57 — A fountain → `art/statue_fountain.png`  ✅ DONE

A fourth statue look, with `art/original/statue.png` attached, same
conversation. Same price and charm as every statue; only the picture
changes.

### 57.1 → `art/statue_fountain.png`

```
Next: a FOURTH village statue variant (attached: the original statue), at
the same height, scale, camera angle and painterly style, standing straight
up in the middle of its picture on the same one-tile footprint. This one is
a small tiered stone fountain: a round basin of pale carved stone holding
clear turquoise water, a slender pedestal rising from it to a smaller bowl,
and on top a little stone fish leaping with a thin arc of water spouting
from its mouth, water spilling in soft streams from the upper bowl into the
basin, a little moss and two water lilies. Same warm light. No figures, no
text. Nothing beyond the basin: fully transparent background.
```

---
---

# 58 — Sea stacks → `art/sea_rocks.png`  ✅ DONE

Rocks in the open water below the south-west cliffs, painted with their own
surf so they are drawn as they are, without the boats' waterline treatment
(`still` in SEA_PROPS). Same conversation, with `art/original/rock.png`
attached for the style.

### 58.1 → `art/sea_rocks.png`

```
Next: a small group of sea rocks to stand in the open sea near the island,
in the same painterly style, light and high isometric camera angle as the
attached rock: three or four craggy sandstone-and-grey sea stacks of
different heights rising out of the water, streaked with white where
seabirds rest, dark green seaweed at their feet, two white seagulls perched
on the tallest one, and a ring of white surf foam and small splashes around
their bases. Only the rocks, the gulls and the foam at the waterline -- no
open water beyond the foam, no horizon, no text. Fully transparent
background.
```

---
---

# 59 — Dolphins → `art/sea_dolphins.png`  ✅ DONE

Two dolphins leaping off the south-east shore, a still sea prop like the
stacks. Asked for in the same thread straight after the sea rocks.

### 59.1 → `art/sea_dolphins.png`

```
Next, in the same painterly style, light and high isometric camera angle as
the sea rocks you just drew: two friendly grey-blue dolphins leaping out of
the sea side by side in a low arc, one slightly ahead of the other, with
small white splashes and a ring of foam where they break the surface and a
few flying droplets. Small in scale, about a third of the size of the sea
rocks. Only the dolphins, the splashes and the foam -- no open water beyond
the foam, no horizon, no text. Fully transparent background.
```

---

# 60 — Double lantern → `art/lamp_double.png`  ✅ DONE

A fourth lamp look: a green iron post with a crossarm and two lanterns. Asked for with
the current lamp attached.

### 60.1 → `art/lamp_double.png`

```
Next: a FOURTH village lamp variant (attached: the original lamp), at the
same height, scale and camera angle, standing straight up in the middle of
its picture. This one is a double lantern post: a dark green painted
cast-iron post with a fluted base on a small square of cobbles, a decorative
crossarm near the top with two little glass lanterns hanging from scrolled
hooks, one on each side, both glowing warm amber, and a small basket of
trailing red and white flowers hanging from the middle of the crossarm. Same
painterly style and warm light. No text. Nothing beyond the base: fully
transparent background.
```

---

# 61 — Flower barrel → `art/flowers_barrel.png`  ✅ DONE

A fourth flowers look: a half-barrel and a wheelbarrow of sunflowers. Asked for with the current flower bed attached.

### 61.1 → `art/flowers_barrel.png`

```
Next: a FOURTH flower bed variant (attached: the original bed), at the same
size, footprint, scale and camera angle. This one is an old wooden
half-barrel planter and a wheelbarrow side by side, both overflowing with
bright sunflowers, orange marigolds and blue cornflowers, a few leaves and
petals on the ground at their feet. Different colours from the
red-pink-yellow original, the purple lavender planter and the orange tulip
bed. Same painterly style and warm light. No text. Nothing beyond the
planters: fully transparent background.
```

---

# 62 — Hydrangea → `art/bush_hydrangea.png`  ✅ DONE

A second bush picture, swapped in for half the bushes on the island.

### 62.1 → `art/bush_hydrangea.png`

```
Next: a SECOND bush for the same island (attached: the current bush), at the
same size, scale, camera angle and painterly style: a rounded flowering
hydrangea shrub with big soft mophead blooms in pale blue, lilac and pink
among glossy green leaves, a few fallen petals at its base. One bush only, no
ground plane, no shadow, no text. Fully transparent background.
```

---

# 63 — Meadow flowers → `art/flowers_meadow.png`  ✅ DONE

A second wildflower picture, swapped in for half the wildflower tiles.

### 63.1 → `art/flowers_meadow.png`

```
Next: a SECOND wildflower patch for the same island (attached: the current
one), same size, scale, camera angle and painterly style: a low clump of
meadow wildflowers - red poppies, white daisies, blue cornflowers and yellow
buttercups among soft grass tufts. One small clump only, no ground plane, no
shadow, no text. Fully transparent background.
```

---

# 64 — Weaver's cottage → `art/house_weaver.png`  ✅ DONE

A sixth house look, sent again once the image limit reset.

### 64.1 → `art/house_weaver.png`

```
Next: a SIXTH variant of the attached cottage, the same size, footprint,
angle, light and painted style: a half-timbered weaver's cottage. Cream
plaster walls crossed with dark oak beams, an upper storey that juts out
slightly over the ground floor, a steep roof of mossy grey-green slate, small
diamond-paned windows with pink geraniums in window boxes, a sky-blue door, a
wooden spinning wheel and a basket of coloured wool skeins by the door, a
tall brick chimney. Nothing around it -- no ground, no shadow, no text. Fully
transparent background.
```

---

# 65 — Cheese market → `art/market_cheese.png`  ✅ DONE

A fourth market look: cheese and flower stalls under yellow awnings.

### 65.1 → `art/market_cheese.png`

```
Next: a FOURTH variant of the attached market, the same size, footprint,
angle, light and painted style: a cheese and flower market. Two wooden
stalls under striped awnings in sunny yellow and white: one stacked with big
golden cheese wheels and wedges on a chequered cloth, the other with buckets
of cut sunflowers, roses and lavender bunches; a hand-painted wooden sign
with a cheese wheel picture (no letters), a small cart of milk churns, a few
wicker baskets. Nothing around it -- no ground beyond the stalls, no shadow,
no text. Fully transparent background.
```

---

# 66 — Pump well → `art/well_pump.png`  ✅ DONE

A fourth well look: a green iron hand pump over a stone well and trough.

### 66.1 → `art/well_pump.png`

```
Next: a FOURTH variant of the attached well, the same size, footprint,
angle, light and painted style: a village pump well. A round low wall of
rough pale limestone, a cast-iron hand pump painted dark green with a curved
handle beside it, water trickling from its spout into a wooden trough, a
little wooden roof on two posts over the pump with a hanging bucket, ivy and
small yellow flowers creeping up the stones. Nothing around it -- no ground,
no shadow, no text. Fully transparent background.
```

---

# 67 — Seals → `art/sea_seals.png`  ✅ DONE

A still sea prop off the northern tip, asked for with the dolphins attached.

### 67.1 → `art/sea_seals.png`

```
Next, in the same painterly style, light and high isometric camera angle as
the attached dolphins: three grey harbour seals lounging on a small flat wet
rock poking out of the sea, one lifting its head and flippers, one asleep,
one sliding into the water with a little splash, a ring of white foam around
the rock. Small in scale, about the size of the dolphins. Only the seals,
the rock and the foam -- no open water beyond the foam, no horizon, no text.
Fully transparent background.
```

---

# 68 — Whale tail → `art/sea_whale.png`  ✅ DONE

A still sea prop off the south-west, opposite the dolphins.

### 68.1 → `art/sea_whale.png`

```
Next, in the same painterly style, light and high isometric camera angle as
the attached dolphins: the huge dark blue-grey tail fluke of a whale rising
out of the sea as it dives, water pouring off its edges in white streams and
droplets, a ring of white foam and a few ripples where it breaks the
surface. About twice the size of the dolphins. Only the tail, the falling
water and the foam -- no open water beyond the foam, no horizon, no text.
Fully transparent background.
```

---

# 69 — Watermill → `art/mill_water.png`  ✅ DONE

A fourth mill look, the only one without sails.

### 69.1 → `art/mill_water.png`

```
Next: a FOURTH variant of the attached mill, the same size, footprint,
angle, light and painted style: a watermill. A two-storey mill house of pale
stone with a dark timber upper floor and a red clay-tile roof, a big wooden
water wheel turning on its side fed by a short wooden flume (sluice) of
splashing water that runs into a small stone channel and pool at its foot,
sacks of flour stacked by the door, a small window box of red flowers.
Nothing around it -- no ground beyond the mill and its channel, no shadow,
no text. Fully transparent background.
```

---

# 70 — Tithe barn → `art/store_tithe.png`  ✅ DONE

A fourth storehouse look in honey-coloured stone.

### 70.1 → `art/store_tithe.png`

```
Next: a FOURTH variant of the attached storehouse, the same size, footprint,
angle, light and painted style: a stone tithe barn. Long thick walls of
honey-coloured stone with narrow slit windows and buttresses, a steep roof
of weathered grey stone slates, tall arched double wooden doors standing
open to show stacked crates, barrels and sacks inside, a wooden ladder
leaning against the wall and a hay cart beside the door. Nothing around it
-- no ground, no shadow, no text. Fully transparent background.
```

---

# 71 — Sawmill yard → `art/lumber_saw.png`  ✅ DONE

A fourth lumber camp look with a circular saw.

### 71.1 → `art/lumber_saw.png`

```
Next: a FOURTH variant of the attached lumber camp, the same size,
footprint, angle, light and painted style: a sawmill yard. An open-sided
timber shed with a shingled roof sheltering a long saw bench with a big
circular saw blade and a half-cut log, neat stacks of fresh pale planks
drying on crossed battens, a pile of round logs held by wooden stakes, a
sawhorse, a wheelbarrow of sawdust and wood shavings, an axe in a chopping
block. Nothing around it -- no ground beyond the yard, no shadow, no text.
Fully transparent background.
```

---

# 72 — Marble quarry → `art/quarry_marble.png`  ✅ DONE

A fourth quarry look in white and pink marble.

### 72.1 → `art/quarry_marble.png`

```
Next: a FOURTH variant of the attached quarry, the same size, footprint,
angle, light and painted style: a marble quarry. A stepped cut into gleaming
white and pale pink marble with clean square ledges, a wooden crane with a
rope and pulley lifting a white marble block, a few finished marble blocks
and a half-carved column drum on wooden rollers, a mason's bench with
chisels and mallets, a small tool shed with a red tile roof. Nothing around
it -- no ground beyond the quarry, no shadow, no text. Fully transparent
background.
```

---

# 73 — Vineyard → `art/farm_vine.png`  ✅ DONE

A fifth farm look.

### 73.1 → `art/farm_vine.png`

```
Next: a FIFTH variant of the attached farm, the same size, footprint (a 2x2
square field), camera angle, light and painted style, with the same low
fence around the field. This one is a little vineyard: neat rows of grape
vines on wooden posts and wires, heavy bunches of purple and green grapes, a
wooden grape press and two oak barrels in one corner, a wicker harvest
basket full of grapes, a few red roses planted at the ends of the rows.
Nothing around it -- no ground beyond the field, no shadow, no text. Fully
transparent background.
```

---

# 74 — Tree bench → `art/bench_tree.png`  ✅ DONE

A fourth bench look, taller than its kind (DECOR_H 66).

### 74.1 → `art/bench_tree.png`

```
Next: a FOURTH bench variant (attached: the original bench), at the same
size, footprint, scale and camera angle. This one is a round wooden bench
built all the way around the trunk of a small young apple tree with a few
red apples, a couple of fallen apples and leaves on the seat. Same painterly
style and warm light. No text. Nothing beyond the bench and tree: fully
transparent background.
```

---

# 75 — Topiary hedge → `art/hedge_topiary.png`  ✅ DONE

The hedge's first second look.

### 75.1 → `art/hedge_topiary.png`

```
Next: a SECOND hedge variant (attached: the original hedge), at the same
size, footprint, scale and camera angle. This one is a clipped boxwood
topiary hedge: a low neat rectangular box hedge with three round topiary
balls on top, tiny white flowers dotted through it, a few pink climbing
roses on one end. Same painterly style and warm light. No text. Nothing
beyond the hedge: fully transparent background.
```

---

# 76 — Living title screen → `art/title_loop.mp4`  ✅ DONE (Leonardo, not ChatGPT)

The title painting brought to life. Made in Leonardo.ai with MiniMax H3 (9:16,
768x1344, 6 s, Turbo, 90 credits) and `art/original/title_art.png` as the
start frame. The raw clip was turned into a seamless 5.4 s loop with ffmpeg by
cross-fading its last 1.2 s into its first:

    ffmpeg -i raw.mp4 -filter_complex "[0:v]split[a][b];[a]trim=start=1.2,setpts=PTS-STARTPTS[A];[b]trim=end=1.2,setpts=PTS-STARTPTS[B];[A][B]xfade=transition=fade:duration=1.2:offset=4.183,format=yuv420p[v]" -map "[v]" -an -c:v libx264 -preset slow -crf 27 -movflags +faststart title_loop.mp4

### 76.1 → `art/title_loop.mp4`

```
Gentle living painting, static camera, no zoom, no pan. The sea shimmers and
small waves lap softly at the island's beach, thin wisps of smoke rise
slowly from the cottage chimneys, a few seagulls glide across the sky in the
distance, clouds drift very slowly, leaves on the trees sway lightly in the
breeze, a windmill's sails turn slowly. Everything else stays still and
exactly as painted. Calm, peaceful, painterly style kept, no new objects, no
people appearing, no text.
```

---

# 77 — Windsock → `art/banner_windsock.png`  ✅ DONE

A fourth banner look; its pole stands a fifth of the way across (DECOR_AX 0.21).

### 77.1 → `art/banner_windsock.png`

```
Next: a FOURTH banner variant (attached: the original banner), at the same
height, scale and camera angle, its pole standing straight up in the middle
of the picture. This one is a tall wooden pole with a big colourful
kite-shaped wind sock of striped red, yellow and blue cloth streaming out
sideways in the breeze, a small brass bell hanging under it, and a ring of
little white stones at the foot of the pole. Same painterly style and warm
light. No text. Nothing beyond the base: fully transparent background.
```

---

# 78 — Willow → `art/tree_willow.png`  ✅ DONE

Swapped in for about a third of the oaks.

### 78.1 → `art/tree_willow.png`

```
Next: a SECOND broadleaf tree for the same island (attached: the current
oak), at the same size, scale, camera angle and painterly style: a graceful
weeping willow with a short sturdy trunk and long trailing curtains of soft
green leaves hanging almost to the ground, a few small yellow catkins. One
tree only, no ground plane, no shadow, no text. Fully transparent
background.
```

---

# 79 — Poplar → `art/tree_poplar.png`  ✅ DONE

Swapped in for some of the birches.

### 79.1 → `art/tree_poplar.png`

```
Next: a SECOND tall slim tree for the same island (attached: the current
birch), at the same size, scale, camera angle and painterly style: a tall
narrow Lombardy poplar, a slender column of fresh green leaves rising from a
straight grey-brown trunk, its leaves catching the light with silvery
undersides. One tree only, no ground plane, no shadow, no text. Fully
transparent background.
```

---

# 80 — Cow → `art/cow.png`  ✅ DONE

Grazes on some of the goat tiles.

### 80.1 → `art/cow.png`

```
Next: a farm animal for the same island (attached: the goat), in the same
painterly style, scale relative to its size, camera angle and light: a
friendly brown and white dairy cow standing side-on and grazing, head down
to the grass, a small brass bell on a leather collar, swishing tail. About
one and a half times the goat's size. One cow only, no ground plane, no
shadow, no text. Fully transparent background.
```

---

# 81 — Dragon statue → `art/statue_dragon.png`  ✅ DONE

A fifth statue look.

### 81.1 → `art/statue_dragon.png`

```
Next: a FIFTH statue variant (attached: the original statue), at the same
height, scale and camera angle, standing straight up in the middle of its
picture on a similar square stone plinth. This one is a friendly stone
dragon sitting curled on top of the plinth, wings folded, tail wrapped
around its feet, a little moss and lichen on its back, a few wildflowers
growing at the base. Same painterly style and warm light. No text. Nothing
beyond the plinth: fully transparent background.
```

---

# 82 — Mushroom log → `art/log_mushroom.png`  ✅ DONE

Lies on some of the stump tiles.

### 82.1 → `art/log_mushroom.png`

```
Next: a SECOND small woodland prop for the same island (attached: the
current tree stump), at the same size, scale, camera angle and painterly
style: a short fallen mossy log lying on its side, with a cluster of
red-capped white-spotted toadstools and a few small brown mushrooms growing
from it, a little fern beside it. One log only, no ground plane, no shadow,
no text. Fully transparent background.
```

---

# 83 — Bell buoy → `art/sea_buoy.png`  ✅ DONE

A still sea prop off the north-east, beside the ketch. Asked for with the rowing boat attached.

### 83.1 → `art/sea_buoy.png`

```
Next, in the same painterly style, light and high isometric camera angle as
the attached rowing boat: a red and white striped bell buoy floating in the
sea, a small iron cage on top holding a brass bell, a white seagull perched
on the top, a ring of white foam and small ripples around its base. Small in
scale, about the size of the rowing boat. Only the buoy, the gull and the
foam -- no open water beyond the foam, no horizon, no text. Fully
transparent background.
```

---

# 84 — Ewe and lambs → `art/sheep_lambs.png`  ✅ DONE

Scenery: stands in for a resting sheep about half the time (SCENERY_ALT).

### 84.1 → `art/sheep_lambs.png`

```
Next: in the same painterly style, scale, camera angle and light as the
attached resting sheep: a fluffy white ewe lying down in the grass with two
small lambs snuggled against her side, one lamb looking up, a few daisies
around them. One small group only, no ground plane, no shadow, no text.
Fully transparent background.
```

---

# 85 — Picket fence → `art/fence_picket.png`  ✅ DONE

The fence's first second look (DECOR_H 46).

### 85.1 → `art/fence_picket.png`

```
Next: a SECOND fence variant (attached: the original fence), at the same
size, footprint, scale and camera angle. This one is a white-painted picket
fence: neat pointed white pickets on two rails, slightly weathered paint, a
few climbing pink roses and green ivy twining along it, small daisies at its
foot. Same painterly style and warm light. No text. Nothing beyond the
fence: fully transparent background.
```

---

# 86 — Lavender hedge → `art/hedge_lavender.png`  ✅ DONE

A third hedge look (DECOR_H 56).

### 86.1 → `art/hedge_lavender.png`

```
Next: a THIRD hedge variant (attached: the original hedge), at the same
size, footprint, scale and camera angle. This one is a flowering lavender
hedge: a low clipped rosemary-green hedge topped with dense spikes of purple
lavender, a few white butterflies and a bumblebee over it, a small wooden
bee skep at one end. Same painterly style and warm light. No text. Nothing
beyond the hedge: fully transparent background.
```

---

# 87 — Dry-stone wall → `art/fence_stone.png`  ✅ DONE

A third fence look.

### 87.1 → `art/fence_stone.png`

```
Next: a THIRD fence variant (attached: the original fence), at the same
size, footprint, scale and camera angle, running the same direction. This
one is a low dry-stone wall: rounded grey and honey-coloured field stones
stacked without mortar, a row of upright capstones along the top, patches of
green moss and a few tufts of grass and small yellow flowers growing from
the gaps. Same painterly style and warm light. No text. Nothing beyond the
wall: fully transparent background.
```

---

# 88 — Ship's lantern → `art/lamp_ship.png`  ✅ DONE

A fifth lamp look. The post stands off-centre (DECOR_AX 0.61) and the night glow hangs from its hook (LAMP_GLOW dx -10).

### 88.1 → `art/lamp_ship.png`

```
Next: a FIFTH street lamp variant (attached: the original lamp), at the same
size, height, scale and camera angle. This one is a rustic ship's lantern: a
weathered wooden post with a curved iron hook arm at the top, a brass ship's
lantern with a warm glowing candle hanging from it, a coil of rope around
the base of the post and a small anchor leaning against it. Same painterly
style and warm light. No text. Nothing beyond the lamp: fully transparent
background.
```

---

# 89 — Flower cart → `art/flowers_cart.png`  ✅ DONE

A fifth flower bed look (DECOR_H 42). Came back on a painted checkerboard, which prep-art keys out.

### 89.1 → `art/flowers_cart.png`

```
Next: a FIFTH flower bed variant (attached: the original flowers), at the
same size, footprint, scale and camera angle. This one is a little old
wooden handcart with two spoked wheels, its bed overflowing with pots of red
geraniums, white daisies and trailing blue lobelia, a watering can leaning
against one wheel. Same painterly style and warm light. No text. Nothing
beyond the cart: fully transparent background.
```

---

# 90 — Finale painting → `art/finale_art.png`  ✅ DONE

The finished island celebrating, framed above the "Your village is finished" card (art/finale_art.webp, 960x640). Asked for with the title painting attached; it is also the start frame of 91.

### 90.1 → `art/finale_art.png`

```
Next: a wide LANDSCAPE painting (3:2, wider than tall) in exactly the same
painterly style as the attached title painting, of the same kind of island
village, now finished and celebrating at dusk: a little island with
cottages, a windmill, a town hall with a clock tower, a market square, and a
stone lighthouse beacon blazing on a headland; strings of warm paper
lanterns between the houses, windows glowing gold, a few small fireworks
blooming in a deep blue and rose-pink sky with the first stars, the calm
turquoise sea reflecting the lights, a couple of small boats with lanterns.
Seen from a high three-quarter angle, the whole island in frame with sea
around it. No people close up, no text, no logo. Fill the whole frame (no
transparency).
```

---

# 91 — Finale loop → `art/finale_loop.mp4`  ✅ DONE (Leonardo, not ChatGPT)

Plays in the finale frame once it is actually playing; the painting shows until
then, and instead of it under reduced motion. Leonardo.ai, MiniMax H3, 16:9 HD
1344x768, 6 s, Turbo, 90 credits, `art/original/finale_art.png` as the start
frame. Looped the same way as 76, scaled to 960 wide:

    ffmpeg -i raw.mp4 -filter_complex "[0:v]scale=960:-2,split[a][b];[a]trim=start=1.2,setpts=PTS-STARTPTS[A];[b]trim=end=1.2,setpts=PTS-STARTPTS[B];[A][B]xfade=transition=fade:duration=1.2:offset=4.183,format=yuv420p[v]" -map "[v]" -an -c:v libx264 -preset slow -crf 28 -movflags +faststart finale_loop.mp4

### 91.1 → `art/finale_loop.mp4`

```
Gentle living painting, static camera, no zoom, no pan. Small colourful
fireworks bloom softly and fade in the dusk sky, stars twinkle, the
lighthouse beam sweeps slowly, paper lanterns sway gently and glow, light
reflections shimmer on the calm sea, small waves lap at the rocks, the
windmill sails turn slowly, the little sailboats bob gently. Everything else
stays still and exactly as painted. Calm, festive, painterly style kept, no
new objects, no people appearing, no text.
```

---

# 92 — Festival bunting → `art/banner_bunting.png`  ✅ DONE

A fifth banner look; its pole stands at DECOR_AX 0.28. Came back on a painted checkerboard.

### 92.1 → `art/banner_bunting.png`

```
Next: a FIFTH banner variant (attached: the original banner), at the same
size, height, scale and camera angle, the pole standing in the same place.
This one is a tall wooden pole strung with a long line of colourful
triangular festival bunting and three round paper lanterns (red, yellow,
blue) hanging from a crossbar, a few ribbons fluttering. Same painterly
style and warm light. No text or letters. Nothing beyond it: fully
transparent background.
```

---

# 93 — Birdbath sundial → `art/statue_birdbath.png`  ✅ DONE

A sixth statue look.

### 93.1 → `art/statue_birdbath.png`

```
Next: a SIXTH statue variant (attached: the original statue), at the same
size, height, footprint, scale and camera angle. This one is a stone
birdbath sundial: a round carved stone pedestal on a square plinth, a
shallow basin of water on top with two little sparrows bathing and
splashing, a bronze sundial set in the plinth's front, ivy and small blue
forget-me-nots around the base. Same painterly style and warm light. No
text. Nothing beyond it: fully transparent background.
```

---

# 94 — Bee skeps → `art/skeps.png`  ✅ DONE

Scenery: takes the wildflowers' tile in summer (SEASON_ALT). The island is fixed and has one tile of each small kind, so the hash shares in SCENERY_ALT were all or nothing -- the cow, the lambs, the mushroom log and the hydrangea never came. They now take their tiles by season: lambs in spring, hives and hydrangea in summer, mushrooms and the cow in autumn, the cow again in winter.

### 94.1 → `art/skeps.png`

```
Next: in the same painterly style, scale, camera angle and light as the
attached tree stump: two old straw bee skeps sitting on a low wooden stand,
a few bees buzzing around them, a clump of purple clover and yellow
buttercups at the foot of the stand. One small group only, no ground plane,
no shadow, no text. Fully transparent background.
```

---

# 95 — Swing seat → `art/bench_swing.png`  ✅ DONE

A fifth bench look (DECOR_H 58). ChatGPT offered two; the second was kept.

### 95.1 → `art/bench_swing.png`

```
Next: a FIFTH bench variant (attached: the original bench), at the same
size, footprint, scale and camera angle. This one is a wooden garden swing
seat: a slatted wooden bench seat hanging on two ropes from a simple A-frame
of rough timber, a striped cushion and a knitted blanket on the seat, a
climbing honeysuckle twining up one post. Same painterly style and warm
light. No text. Nothing beyond it: fully transparent background.
```

---

# 96 — Potter's cottage → `art/house_potter.png`  ✅ DONE

A seventh house look.

### 96.1 → `art/house_potter.png`

```
Next: a SEVENTH variant of the attached house, the same size, footprint,
angle, light and painted style: a potter's cottage. Whitewashed walls with a
blue-painted door and shutters, a roof of rounded terracotta tiles, a small
round brick kiln with a chimney puffing smoke built against one side, a
wooden shelf by the door lined with blue and cream glazed pots and jugs, a
potter's wheel under a little lean-to, a few big clay urns planted with
herbs. Nothing around it -- no ground beyond the cottage, no shadow, no
text. Fully transparent background.
```

---

# 97 — Fruit and bakery market → `art/market_fruit.png`  ✅ DONE

A fifth market look.

### 97.1 → `art/market_fruit.png`

```
Next: a FIFTH variant of the attached market, the same size, footprint,
angle, light and painted style: a fruit and bakery market. Two wooden stalls
under striped awnings in leaf green and cream: one piled with crates of red
apples, pears, oranges and plums, the other with round loaves, braided
breads and pies on wooden boards under a little glass bell; a hand-painted
wooden sign with an apple picture (no letters), a wheelbarrow of melons, a
few wicker baskets and a chalkboard easel with drawings only. Nothing around
it -- no ground beyond the stalls, no shadow, no text. Fully transparent
background.
```

---

# 98 — Wishing well → `art/well_wish.png`  ✅ DONE

A fifth well look, drawn a little larger than the others (w 1.30) because the picture includes its flower pots.

### 98.1 → `art/well_wish.png`

```
Next: a FIFTH variant of the attached well, the same size, footprint, angle,
light and painted style: a wishing well in a little flower garden. A round
wall of smooth river stones topped with a ring of mossy capstones, a small
pointed roof of blue-grey slate on two carved posts with a crank and a
wooden bucket on a rope, a few shining coins on the rim, pots of pink and
white flowers around the base and a tiny wooden stool beside it. Nothing
around it -- no ground, no shadow, no text. Fully transparent background.
```

---

# 99 — Raised granary → `art/store_staddle.png`  ✅ DONE

A fifth storehouse look, on staddle stones.

### 99.1 → `art/store_staddle.png`

```
Next: a FIFTH variant of the attached storehouse, the same size, footprint,
angle, light and painted style: a raised granary on stone stilts. A long
timber store with slatted plank walls standing on six mushroom-shaped stone
pillars (staddle stones) to keep the mice out, a steep red clay-tile roof
with a small stone cross-shaped finial at each end, a wooden ladder up to
its door, sacks and baskets of grain stacked underneath, a few chickens
pecking by the ladder. Nothing around it -- no ground, no shadow, no text.
Fully transparent background.
```

---

# 100 — Tower windmill → `art/mill_tower.png`  ✅ DONE

A fifth mill look.

### 100.1 → `art/mill_tower.png`

```
Next: a FIFTH variant of the attached mill, the same size, footprint, angle,
light and painted style: a round stone tower windmill. A tall tapering
whitewashed stone tower with small arched windows and a blue door, a pointed
thatched cap on top, four sails of white canvas on wooden lattice frames, a
little wooden balcony running round the tower under the sails, flour sacks
and a handcart by the door, red poppies growing at the foot of the wall.
Nothing around it -- no ground, no shadow, no text. Fully transparent
background.
```

---

# 101 — Charcoal clearing → `art/lumber_charcoal.png`  ✅ DONE

A fifth lumber camp look.

### 101.1 → `art/lumber_charcoal.png`

```
Next: a FIFTH variant of the attached lumber camp, the same size, footprint,
angle, light and painted style: a charcoal burner's clearing. A domed
charcoal clamp of stacked logs covered in turf with thin wisps of smoke
seeping out, a small round woodsman's hut of upright logs with a conical
bark roof, neatly split firewood stacked in a round pile, a two-man crosscut
saw leaning on a sawbuck, a handcart of charcoal sacks and an axe in a
stump. Nothing around it -- no ground beyond the clearing, no shadow, no
text. Fully transparent background.
```

---

# 102 — Sandstone quarry → `art/quarry_sand.png`  ✅ DONE

A fifth quarry look.

### 102.1 → `art/quarry_sand.png`

```
Next: a FIFTH variant of the attached quarry, the same size, footprint,
angle, light and painted style: a sandstone quarry with a waterwheel. A
stepped cut into warm red and ochre sandstone, a small wooden waterwheel
turned by a trickle of water from a spring above powering a stone-cutting
saw, a few squared red blocks stacked on a wooden sledge, a pulley tripod
over the pit, a stonemason's lean-to shed with tools hanging on its wall and
a cart with stone wheels. Nothing around it -- no ground beyond the quarry,
no shadow, no text. Fully transparent background.
```

---

# 103 — Apple orchard → `art/farm_orchard.png`  ✅ DONE

A sixth farm look.

### 103.1 → `art/farm_orchard.png`

```
Next: a SIXTH variant of the attached farm, the same size, footprint (a 2x2
square field), camera angle, light and painted style, with the same low
fence around the field. This one is a little apple orchard: four small round
apple trees in a neat grid heavy with red apples, short green grass between
them dotted with fallen apples and white clover, a wooden ladder leaning in
one tree, two wicker baskets of picked apples and a small wooden cider
barrel in a corner. Nothing around it -- no ground beyond the field, no
shadow, no text. Fully transparent background.
```

---

# 104 — Sea turtle → `art/sea_turtle.png`  ✅ DONE

A still sea prop just off the south-east beach.

### 104.1 → `art/sea_turtle.png`

```
Next, in the same painterly style, light and high isometric camera angle as
the attached dolphins: a large green sea turtle swimming just under the
surface with its head and the top of its patterned shell breaking the water,
a few small fish darting beside it, a soft ring of white foam and gentle
ripples around it. Small in scale, about the size of the dolphins. Only the
turtle, the fish and the foam -- no open water beyond the foam, no horizon,
no text. Fully transparent background.
```

---

# 105 — Sandbar → `art/sea_sandbar.png`  ✅ DONE

A still sea prop off the north-west, with gulls and a message in a bottle.

### 105.1 → `art/sea_sandbar.png`

```
Next, in the same painterly style, light and high isometric camera angle as
the attached sea rocks: a tiny sandbar just breaking the surface of the sea,
pale golden sand with a few shells, a red crab, a piece of driftwood and a
glass bottle with a rolled message inside, two white seagulls standing on
it, a soft ring of white foam and ripples around the edge. Small in scale,
about the size of the rocks. Only the sandbar and its foam -- no open water
beyond the foam, no horizon, no text. Fully transparent background.
```

---

# 106 — Wattle fence → `art/fence_wattle.png`  ✅ DONE

A fourth fence look.

### 106.1 → `art/fence_wattle.png`

```
Next: a FOURTH fence variant (attached: the original fence), at the same
size, footprint, scale and camera angle, running the same direction. This
one is a woven wattle fence: thin hazel and willow branches woven in and out
between rough upright stakes, the stake tops sticking up unevenly, a few
green leaves still on the twigs, tall grass, ferns and a couple of purple
foxgloves growing at its foot. Same painterly style and warm light. No text.
Nothing beyond the fence: fully transparent background.
```

---

# 107 — Wild hedgerow → `art/hedge_wild.png`  ✅ DONE

A fourth hedge look (DECOR_H 54).

### 107.1 → `art/hedge_wild.png`

```
Next: a FOURTH hedge variant (attached: the original hedge), at the same
size, footprint, scale and camera angle. This one is a wild hawthorn and
bramble hedgerow: an untrimmed, slightly shaggy hedge of hawthorn covered in
white may blossom, brambles with a few blackberries trailing out of it, a
wild pink dog-rose climbing through, a small robin perched on a twig on top.
Same painterly style and warm light. No text. Nothing beyond the hedge:
fully transparent background.
```

---

# 108 — Beekeeper's cottage → `art/house_bee.png`  ✅ DONE

An eighth house look.

### 108.1 → `art/house_bee.png`

```
Next: an EIGHTH variant of the attached house, the same size, footprint,
angle, light and painted style: a beekeeper's cottage. Honey-coloured stone
walls, a deep golden thatched roof with a rounded ridge, a round
dovecote-style turret at one corner with a little conical thatched cap, a
green door under a porch of climbing honeysuckle, three white wooden
beehives in a row along the side wall with a few bees, jars of honey on a
little bench by the door and lavender in pots. Nothing around it -- no
ground beyond the cottage, no shadow, no text. Fully transparent background.
```

---

# 109 — Weathervane → `art/banner_vane.png`  ✅ DONE

A sixth banner look.

### 109.1 → `art/banner_vane.png`

```
Next: a SIXTH banner variant (attached: the original banner), at the same
size, height, scale and camera angle, the pole standing in the same place.
This one is a tall weathervane: a slender wrought-iron pole on a small stone
base, topped with a copper rooster weathervane turned green with age, the
four compass arms below it ending in little iron arrowheads (no letters), a
climbing rose twined up the bottom of the pole. Same painterly style and
warm light. No text or letters. Nothing beyond it: fully transparent
background.
```

---

# 110 — Flower-basket lamp → `art/lamp_basket.png`  ✅ DONE

A sixth lamp look; its night glow sits on the lantern (LAMP_GLOW dx 6, dy -60).

### 110.1 → `art/lamp_basket.png`

```
Next: a SIXTH street lamp variant (attached: the original lamp), at the same
size, height, scale and camera angle, the lantern centred on the post. This
one is a hanging flower-basket lamp post: a dark green painted cast-iron
post with a curly scrolled top holding a round glass lantern with a warm
glowing flame, two hanging baskets of trailing pink petunias and white
alyssum on little hooks either side, ivy curling up the base. Same painterly
style and warm light. No text. Nothing beyond the lamp: fully transparent
background.
```

---

# 111 — A picnic table → `art/bench_picnic.png`  ✅ DONE

Sixth bench. Reference: art/original/bench.png.

### 111.1 → `art/bench_picnic.png`

```
Next: a SIXTH bench variant (attached: the original bench), at the same
size, footprint, scale and camera angle. This one is a picnic table: a
sturdy wooden table with two attached bench seats, a red and white checked
cloth on top with a wicker picnic basket, a loaf of bread, a jug of lemonade
and a bowl of strawberries, a sleepy ginger cat curled up on one seat. Same
painterly style and warm light. No text. Nothing beyond it: fully
transparent background.
```

---

# 112 — A stone bear → `art/statue_bear.png`  ✅ DONE

Seventh statue. Reference: art/original/statue.png.

### 112.1 → `art/statue_bear.png`

```
Next: a SEVENTH statue variant (attached: the original statue), at the same
size, footprint, scale and camera angle. This one is a weathered stone bear
sitting up on a low round plinth, holding a carved stone honeycomb, moss on
its shoulders, a small brass plaque, little wildflowers and a clay pot of
honey at its feet, a bee or two. Same painterly style and warm light. No
text. Nothing beyond it: fully transparent background.
```

---

# 113 — A sunflower patch → `art/flowers_sun.png`  ✅ DONE

Sixth flowers. Reference: art/original/flowers.png.

### 113.1 → `art/flowers_sun.png`

```
Next: a SIXTH flowers variant (attached: the original flower bed), at the
same size, footprint, scale and camera angle. This one is a sunflower patch:
a low ring of round river stones holding a cluster of tall sunflowers at
different heights, some nodding, with marigolds and blue cornflowers around
their feet and a small sparrow perched on one flower head. Same painterly
style and warm light. No text. Nothing beyond it: fully transparent
background.
```

---

# 114 — A harbour rope fence → `art/fence_rope.png`  ✅ DONE

Fifth fence. Reference: art/original/fence.png.

### 114.1 → `art/fence_rope.png`

```
Next: a FIFTH fence variant (attached: the original fence), at exactly the
same size, footprint, length, scale and camera angle. This one is a harbour
rope fence: weathered driftwood posts with thick hemp rope slung in loose
loops between them, a cork float and a small coil of rope hanging from one
post, a tuft of sea grass at the base. Same painterly style and warm light.
No text. Nothing beyond it: fully transparent background.
```

---

# 115 — A holly hedge → `art/hedge_holly.png`  ✅ DONE

Fifth hedge. Reference: art/original/hedge.png. ChatGPT offered two; took the darker one.

### 115.1 → `art/hedge_holly.png`

```
Next: a FIFTH hedge variant (attached: the original hedge), at exactly the
same size, footprint, length, scale and camera angle. This one is a holly
hedge: dense glossy dark green holly leaves clipped into a neat block,
clusters of bright red berries all over it, a little robin perched on top
and a few fallen berries at its foot. Same painterly style and warm light.
No text. Nothing beyond it: fully transparent background.
```

---

# 116 — A wheel well → `art/well_wheel.png`  ✅ DONE

Sixth well. Reference: art/original/well.png.

### 116.1 → `art/well_wheel.png`

```
Next: a SIXTH well variant (attached: the original well), at the same size,
footprint, scale and camera angle. This one is a wheel well: a round
fieldstone well under a little tiled roof on two oak posts, with a big
wooden spoked hand-wheel on one side to wind the rope, a wooden bucket
brimming with water on the rim, a tin ladle hanging from a nail, ferns
growing between the stones. Same painterly style and warm light. No text.
Nothing beyond it: fully transparent background.
```

---

# 117 — A flower stall → `art/market_flower.png`  ✅ DONE

Sixth market. Reference: art/original/market.png.

### 117.1 → `art/market_flower.png`

```
Next: a SIXTH market variant (attached: the original market), at the same
size, footprint, scale and camera angle. This one is a flower market stall:
a wooden stall under a pink and cream striped awning, tiered shelves of
buckets full of cut flowers (roses, tulips, daisies, lavender), hanging
baskets dripping with blooms, a watering can, bundled bouquets wrapped in
brown paper, a small chalkboard with no writing. Same painterly style and
warm light. No text. Nothing beyond it: fully transparent background.
```

---

# 118 — A root cellar → `art/store_cellar.png`  ✅ DONE

Sixth storehouse. Reference: art/original/store.png.

### 118.1 → `art/store_cellar.png`

```
Next: a SIXTH storehouse variant (attached: the original storehouse), at the
same size, footprint, scale and camera angle. This one is a root cellar: a
grassy earth mound with wildflowers on top, a stone archway front with a
heavy round-topped oak door and iron hinges, a little chimney vent poking
out of the turf, crates of potatoes, turnips and apples and a stack of
firewood beside the door, a lantern on a hook. Same painterly style and warm
light. No text. Nothing beyond it: fully transparent background.
```

---

# 119 — A log hauling yard → `art/lumber_cart.png`  ✅ DONE

Sixth lumber camp. Reference: art/original/lumber.png.

### 119.1 → `art/lumber_cart.png`

```
Next: a SIXTH lumber camp variant (attached: the original lumber camp), at
the same size, footprint, scale and camera angle. This one is a log hauling
yard: a heavy wooden ox-cart (no animal) loaded with long chained pine logs,
a timber skid ramp beside it, a neat cross-stacked pile of planks, a
chopping block with an axe, a grindstone for sharpening and a pine sapling
planted in a little fenced ring. Same painterly style and warm light. No
text. Nothing beyond it: fully transparent background.
```

---

# 120 — A clay pit and brickworks → `art/quarry_clay.png`  ✅ DONE

Sixth quarry. Reference: art/original/quarry.png.

### 120.1 → `art/quarry_clay.png`

```
Next: a SIXTH quarry variant (attached: the original quarry), at the same
size, footprint, scale and camera angle. This one is a clay pit and
brickworks: a shallow terracotta-red clay pit with a wooden plank walkway
and a spade stuck in the clay, a small domed brick kiln with a glowing mouth
and a wisp of smoke, rows of drying unfired bricks on a pallet, a stack of
finished red bricks and a wheelbarrow. Same painterly style and warm light.
No text. Nothing beyond it: fully transparent background.
```

---

# 121 — A cider mill → `art/mill_cider.png`  ✅ DONE

Sixth mill. Reference: art/original/mill.png.

### 121.1 → `art/mill_cider.png`

```
Next: a SIXTH mill variant (attached: the original mill), at the same size,
footprint, scale and camera angle. This one is a cider mill: a timber-framed
open barn with a half-hipped thatched roof, inside it a big round stone
trough with an upright stone crushing wheel on a wooden beam, a screw cider
press with a basket of crushed apples, barrels stacked outside, crates and
baskets of red and green apples, a small apple tree beside it. Same
painterly style and warm light. No text. Nothing beyond it: fully
transparent background.
```

---

# 122 — A hop garden → `art/farm_hops.png`  ✅ DONE

Seventh farm. Reference: art/original/farm.png.

### 122.1 → `art/farm_hops.png`

```
Next: a SEVENTH farm variant (attached: the original farm), at the same
size, footprint, scale and camera angle. This one is a hop garden: neat rows
of tall wooden poles with twine strung between them, green hop bines
climbing up and hanging with pale green hop cones, a small round oast house
with a white cowl roof at one corner, wicker baskets of picked hops and a
ladder leaning on a pole. Same painterly style and warm light. No text.
Nothing beyond it: fully transparent background.
```

---

# 123 — An oak-tree cottage → `art/house_oak.png`  ✅ DONE

Ninth house. Reference: art/original/house.png. Drawn wider (w 1.30) since the crown spreads past the cottage.

### 123.1 → `art/house_oak.png`

```
Next: a NINTH house variant (attached: the original house), at the same
size, footprint, scale and camera angle. This one is an oak-tree cottage: a
small round cottage built snugly around the trunk of a great old oak, the
trunk rising through its mossy shingle roof into a leafy crown above, a
round green door between the roots, little round windows with warm light, a
spiral wooden stair winding up the trunk to a tiny lookout, a swing hanging
from a branch. Same painterly style and warm light. No text. Nothing beyond
it: fully transparent background.
```

---

# 124 — A snowman → `art/snowman.png`  ✅ DONE

Winter look of the island's bush tile (SEASON_ALT). Reference: art/original/bush.png.

### 124.1 → `art/snowman.png`

```
Next: a winter scenery piece (attached: the bush, for scale, style and
camera angle), at about the same size. A small friendly snowman standing on
a little patch of snow: three snowballs, coal eyes and buttons, a carrot
nose, a knitted red scarf and a battered old bucket for a hat, twig arms
with a tiny mitten on one, a robin on his shoulder. Same painterly style and
soft winter light. No text. Nothing beyond it: fully transparent background.
```

---

# 125 — A scarecrow → `art/statue_scarecrow.png`  ✅ DONE

Eighth statue. Reference: art/original/statue.png.

### 125.1 → `art/statue_scarecrow.png`

```
Next: an EIGHTH statue variant (attached: the original statue), at the same
size, footprint, scale and camera angle. This one is a cheerful scarecrow: a
straw-stuffed figure on a wooden cross-post, patched blue dungarees and a
checked shirt, a floppy straw hat with a sunflower tucked in the band, a
stitched sacking face with a kind smile, straw poking from the cuffs, a crow
perched on one arm, standing in a little tuft of wheat and a ring of
pumpkins at its feet. Same painterly style and warm light. No text. Nothing
beyond it: fully transparent background.
```

---

# 126 — A shepherd's crook lantern → `art/lamp_crook.png`  ✅ DONE

Seventh lamp. Reference: art/original/lamp.png. LAMP_GLOW sits on the jar.

### 126.1 → `art/lamp_crook.png`

```
Next: a SEVENTH lamp variant (attached: the original lamp), at the same
size, footprint, scale and camera angle. This one is a shepherd's crook
lantern: a tall curved wooden shepherd's crook staked into a little mound of
clover and stones, a glass jar lantern hanging from the hook glowing warm
gold, a few tiny fireflies drifting around it, a twist of ivy climbing the
staff. Same painterly style and warm light. No text. Nothing beyond it:
fully transparent background.
```

---

# 127 — A kite post → `art/banner_kite.png`  ✅ DONE

Seventh banner. Reference: art/original/banner.png. DECOR_AX 0.28 stands the post, not the kite, on the tile.

### 127.1 → `art/banner_kite.png`

```
Next: a SEVENTH banner variant (attached: the original banner), at the same
size, footprint, scale and camera angle. This one is a kite post: a sturdy
wooden post with a little reel of string tied to it, and a diamond-shaped
patchwork kite (red, yellow and blue squares) flying just above and to one
side of the post on a short taut string, with a long tail of knotted ribbon
bows fluttering below it; a tuft of grass and a few daisies at the base of
the post. Same painterly style and warm light. No text. Nothing beyond it:
fully transparent background.
```

---

# 128 — A campfire seat → `art/bench_campfire.png`  ✅ DONE

Seventh bench. Reference: art/original/bench.png.

### 128.1 → `art/bench_campfire.png`

```
Next: a SEVENTH bench variant (attached: the original bench), at the same
size, footprint, scale and camera angle. This one is a campfire seat: two
mossy split-log benches set at an angle around a small ring of stones with a
crackling little campfire, a blackened kettle on a tripod over it, a stack
of kindling, a tin mug resting on one log and a folded plaid blanket on the
other. Same painterly style and warm light. No text. Nothing beyond it:
fully transparent background.
```

---

# 129 — A wrought iron railing → `art/fence_iron.png`  ✅ DONE

Sixth fence. Reference: art/original/fence.png.

### 129.1 → `art/fence_iron.png`

```
Next: a SIXTH fence variant (attached: the original fence), at exactly the
same size, footprint, length, scale and camera angle. This one is a wrought
iron garden railing: black iron railings with curled scroll tops and little
spear finials between two short red-brick pillars capped with stone, a
climbing rose with pink blooms twining along it, some ivy at the foot. Same
painterly style and warm light. No text. Nothing beyond it: fully
transparent background.
```

---

# 130 — A copper beech hedge → `art/hedge_beech.png`  ✅ DONE

Sixth hedge. Reference: art/original/hedge.png. Last image before the day's ChatGPT quota ran out.

### 130.1 → `art/hedge_beech.png`

```
Next: a SIXTH hedge variant (attached: the original hedge), at exactly the
same size, footprint, length, scale and camera angle. This one is a copper
beech hedge: a neatly clipped block of rich russet, copper and deep red
beech leaves, with a few golden leaves, a small arched gap cut through the
middle like a tiny doorway, a hedgehog peeking out of it, a scatter of
fallen leaves at the base. Same painterly style and warm light. No text.
Nothing beyond it: fully transparent background.
```

---

# 131 — Town hall celebration → `art/hall_up.mp4`  ✅ DONE (Leonardo, not ChatGPT)

Plays once under the goal strip when the hall finishes a level, then fades
(`celebrate` in game.js); `art/hall_up.webp` is its first frame, shown
until the clip is playing and instead of it under reduced motion. The start
frame `art/original/hall_clip_frame.png` is the game's own `hall_3` composited
over a blurred crop of the title painting. Leonardo.ai, MiniMax H3, 16:9 HD
1344x768, 6 s, Turbo, 90 credits. Not looped -- the doves fly off -- just
scaled to 960 wide:

    ffmpeg -i raw.mp4 -vf "scale=960:-2,format=yuv420p" -an -c:v libx264 -preset slow -crf 28 -movflags +faststart hall_up.mp4

### 131.1 → `art/hall_up.mp4`

```
Gentle living painting, static camera, no zoom, no pan. A festive celebration
at the town hall: the bell in the clock tower swings and rings, the blue and
gold banners and the little bunting flags flutter in the breeze, golden
sparkles and small colourful confetti drift slowly down through the air, a
few white doves fly up from behind the roof, the lanterns by the door glow
warmly, the flowers in the window boxes sway lightly, soft sunlight shimmers.
The building itself stays still and exactly as painted. Joyful, painterly
style kept, no new buildings, no people appearing, no text.
```

---

# 132 — The beacon lit → `art/beacon_lit.mp4`  ✅ DONE (Leonardo, not ChatGPT)

Plays once when the beacon reaches its last stage (`celebrate('beacon_lit')`
in beaconTake); `art/beacon_lit.webp` is its first frame. Start frame
`art/original/beacon_clip_frame.png`: the game's `beacon_stage5` over a blurred
crop of the finale painting's sunset. Leonardo.ai, MiniMax H3, 16:9 HD, 6 s,
Turbo, 90 credits; encoded as 131.

### 132.1 → `art/beacon_lit.mp4`

```
Gentle living painting, static camera, no zoom, no pan. The lighthouse is lit
for the first time at dusk: the great lamp at the top flares up bright golden
and a soft beam of light slowly sweeps out across the sky, warm glowing sparks
and embers float up from the lantern room, the little weathervane turns, the
windows glow, the pink sunset clouds drift slowly and the sea shimmers in the
background. The tower itself stays still and exactly as painted. Triumphant,
calm, painterly style kept, no new buildings, no people appearing, no text.
```

---

# 133 — New land → `art/land_new.mp4`  ✅ DONE (Leonardo, not ChatGPT)

Plays once when a ring of land is claimed and its find had no room to go down
(`celebrate('land_new')` in
claimLand); `art/land_new.webp` is its first frame. Start frame
`art/original/land_clip_frame.png`: the sheep meadow and rocky shore cropped
from the title painting. Leonardo.ai, MiniMax H3, 16:9 HD, 6 s, Turbo, 90
credits; encoded as 131.

### 133.1 → `art/land_new.mp4`

```
Gentle living painting, static camera, no zoom, no pan. A bright new morning on
the island's shore: a thin soft morning mist drifts away off the meadow and the
rocks, revealing the land in warm sunlight, waves roll in and break in white
foam against the rocks, the sea shimmers turquoise, the sheep graze and one
lifts its head, the wildflowers and grass sway in the breeze, two seagulls
glide across. Everything else stays still and exactly as painted. Hopeful,
peaceful, painterly style kept, no new buildings, no people appearing, no text.
```

---

# 134 — A day going by → `art/away_day.mp4`  ✅ DONE (Leonardo, not ChatGPT)

Framed above the "While you were away" card (`drawAwayPic`), played once from
the top each time the card comes up and left on its last frame -- evening,
windows lit. `art/away_day.webp` is its first frame. Start frame
`art/original/away_clip_frame.png`: the village square cropped from the title
painting. Leonardo.ai, MiniMax H3, 16:9 HD, 6 s, Turbo, 90 credits; encoded as 131.

### 134.1 → `art/away_day.mp4`

```
Time-lapse living painting, static camera, no zoom, no pan. A whole day passes
quickly over the village: the little villagers hurry about their work on the
paths, the windmill sails spin, shadows sweep slowly across the ground, clouds
race overhead, the sunlight turns warm golden then dusky blue as evening falls,
and one by one the cottage windows and the street lanterns light up with a
warm glow, chimney smoke curls up, the sea darkens and shimmers. The buildings
stay exactly as painted. Cosy, peaceful, painterly style kept, no new
buildings, no text.
```

---

# 135 — The Old Stones → `art/find_stones_clip.mp4`  ✅ DONE (Leonardo, not ChatGPT)

Plays once when the ring of land holding it is claimed (claimLand, captioned
"New land · <its name>"); `art/find_stones_clip.webp` is its first frame. Named
`_clip` because `art/find_stones.webp` is the find's own sprite. Start frame
`art/original/find_stones_clip_frame.png`: the sprite over a blurred crop of the title
painting. Leonardo.ai, MiniMax H3, 16:9 HD, 6 s, Turbo, 90 credits; encoded as 131.

### 135.1 → `art/find_stones_clip.mp4`

```
Gentle living painting, static camera, no zoom, no pan. An ancient ring of
standing stones discovered at dawn: soft white mist swirls slowly around the
base of the stones, faint glowing golden runes shimmer softly on the stones and
fade, tiny fireflies and motes of light drift up between them, the grass and
wildflowers sway in the breeze, a beam of morning sunlight falls across the
ring, the sea shimmers in the blurred background. The stones themselves stay
still and exactly as painted. Mysterious, peaceful, painterly style kept, no
new objects, no people appearing, no text.
```

---

# 136 — The Wild Orchard → `art/find_orchard_clip.mp4`  ✅ DONE (Leonardo, not ChatGPT)

Plays once when the ring of land holding it is claimed (claimLand, captioned
"New land · <its name>"); `art/find_orchard_clip.webp` is its first frame. Named
`_clip` because `art/find_orchard.webp` is the find's own sprite. Start frame
`art/original/find_orchard_clip_frame.png`: the sprite over a blurred crop of the title
painting. Leonardo.ai, MiniMax H3, 16:9 HD, 6 s, Turbo, 90 credits; encoded as 131.

### 136.1 → `art/find_orchard_clip.mp4`

```
Gentle living painting, static camera, no zoom, no pan. A forgotten wild apple
orchard rediscovered on a sunny afternoon: the leaves of the old apple trees
rustle and sway in a warm breeze, a few white blossom petals and leaves drift
down through the air, one ripe red apple drops softly into the grass,
butterflies and a bumblebee flutter between the trees, dappled sunlight
flickers through the branches, the long grass waves. The trees themselves stay
in place exactly as painted. Warm, nostalgic, painterly style kept, no new
objects, no people appearing, no text.
```

---

# 137 — The Old Cottage → `art/find_ruin_clip.mp4`  ✅ DONE (Leonardo, not ChatGPT)

Plays once when the ring of land holding it is claimed (claimLand, captioned
"New land · <its name>"); `art/find_ruin_clip.webp` is its first frame. Named
`_clip` because `art/find_ruin.webp` is the find's own sprite. Start frame
`art/original/find_ruin_clip_frame.png`: the sprite over a blurred crop of the title
painting. Leonardo.ai, MiniMax H3, 16:9 HD, 6 s, Turbo, 90 credits; encoded as 131.

### 137.1 → `art/find_ruin_clip.mp4`

```
Gentle living painting, static camera, no zoom, no pan. The roofless ruin of
the island's first cottage, found in the evening: warm golden sunset light
slowly sweeps across the old stone walls, the ivy and leaves on the walls
rustle and sway in the breeze, a few dry leaves blow across the floor, a faint
wisp of smoke curls from the cold chimney as if remembering, small moths and
dust motes glitter in the light, a little robin hops on the wall and flies
away. The ruined walls stay still and exactly as painted. Wistful, quiet,
painterly style kept, no new buildings, no people appearing, no text.
```

---

# 138 — The Old Wreck → `art/find_wreck_clip.mp4`  ✅ DONE (Leonardo, not ChatGPT)

Plays once when the ring of land holding it is claimed (claimLand, captioned
"New land · <its name>"); `art/find_wreck_clip.webp` is its first frame. Named
`_clip` because `art/find_wreck.webp` is the find's own sprite. Start frame
`art/original/find_wreck_clip_frame.png`: the sprite over a blurred crop of the title
painting. Leonardo.ai, MiniMax H3, 16:9 HD, 6 s, Turbo, 90 credits; encoded as 131.

### 138.1 → `art/find_wreck_clip.mp4`

```
Gentle living painting, static camera, no zoom, no pan. An old wooden boat
wreck washed up on a pebble shore, found at golden hour: gentle turquoise waves
roll in around it and wash back in white foam, the water sparkles in the
sunlight, the faded blue paint glints, a little crab scuttles out from under
the hull, a seagull lands on the bow and then flies off, the old rope stirs in
the wash, sea spray drifts in the breeze. The wreck itself stays still and
exactly as painted. Adventurous, peaceful, painterly style kept, no new boats,
no people appearing, no text.
```

---

# 139 — The title screen through the year → `art/title_{autumn,winter,spring}.webp` + `_loop.mp4`  ✅ DONE (Leonardo, not ChatGPT)

The title screen picks its painting and loop by month, with the same months
the island's seasons use (SEASON_OF in game.js); summer keeps the original
`title_art` / `title_loop` (76). Each painting is the original repainted in
Leonardo.ai with Nano Banana 2.1 (9:16, 768x1376, 43 credits) and
`art/original/title_art.png` as the image reference; each loop is MiniMax H3
(9:16 HD, 6 s, Turbo, 90 credits) with that painting as the start frame,
cross-faded into a 5.4 s loop exactly as 76. Paintings kept as
`art/original/title_{season}.png`.

### 139.1 → `art/title_autumn.webp` (Nano Banana 2.1)

```
Repaint this exact painting as late autumn. Keep the exact same composition,
camera angle, island, buildings, windmill, lighthouse, docks, boats, sea and
painterly game-art style, every building in the same place. Change only the
season: the trees turn rich orange, red and gold, fallen leaves lie on the
paths and roofs, the wheat fields are harvested into golden stubble with round
hay bales and a few orange pumpkins, warm hazy late-afternoon autumn light, a
soft amber sky with light clouds, chimney smoke curling. Keep the empty space
at the top of the sky for a logo. No text, no logo, no new buildings.
```

### 139.2 → `art/title_winter.webp` (Nano Banana 2.1)

```
Repaint this exact painting as a snowy winter. Keep the exact same
composition, camera angle, island, buildings, windmill, lighthouse, docks,
boats, sea and painterly game-art style, every building in the same place.
Change only the season: thick soft snow on every roof, path and field,
snow-dusted pine trees, bare birch trees, icicles on the eaves, the cottage
windows glowing warm yellow, chimney smoke curling, a snowman in the square, a
cold pale blue and pink winter sunset sky, the sea a deep cold blue with a
little ice at the shore. Keep the empty space at the top of the sky for a
logo. No text, no logo, no new buildings.
```

### 139.3 → `art/title_spring.webp` (Nano Banana 2.1)

```
Repaint this exact painting as early spring. Keep the exact same composition,
camera angle, island, buildings, windmill, lighthouse, docks, boats, sea and
painterly game-art style, every building in the same place. Change only the
season: fresh bright green leaves, pink and white cherry and apple blossom on
the trees, the fields freshly ploughed with young green shoots in rows,
carpets of tulips, daffodils and bluebells along the paths, little lambs with
the sheep, a fresh clear morning light, a soft pastel blue sky with fluffy
white clouds. Keep the empty space at the top of the sky for a logo. No text,
no logo, no new buildings.
```

### 139.4 → `art/title_autumn_loop.mp4` (MiniMax H3)

```
Gentle living painting, static camera, no zoom, no pan. An autumn afternoon on
the island: orange and golden leaves drift down slowly from the trees and
swirl along the paths in the breeze, the autumn trees sway gently, thin wisps
of smoke rise slowly from the cottage chimneys, the windmill's sails turn
slowly, the sea shimmers in the golden light and small waves lap at the rocks,
a few seagulls glide in the distance, the clouds drift slowly. Everything else
stays still and exactly as painted. Calm, cosy, painterly style kept, no new
objects, no people appearing, no text.
```

### 139.5 → `art/title_winter_loop.mp4` (MiniMax H3)

```
Gentle living painting, static camera, no zoom, no pan. A winter evening on
the island: soft snowflakes fall slowly and steadily over the whole village,
thin wisps of smoke rise slowly from the snowy cottage chimneys, the warm
yellow windows flicker gently, the lighthouse lamp glows, the windmill's sails
turn slowly, the cold sea shimmers and small waves lap at the icy rocks, the
pink clouds drift very slowly. Everything else stays still and exactly as
painted. Calm, cosy, painterly style kept, no new objects, no people
appearing, no text.
```

### 139.6 → `art/title_spring_loop.mp4` (MiniMax H3)

```
Gentle living painting, static camera, no zoom, no pan. A spring morning on
the island: pink and white blossom petals drift slowly through the air from
the flowering trees, the fresh green leaves and the tulips sway lightly in the
breeze, butterflies flutter over the flowers, the little lambs skip beside the
sheep, the windmill's sails turn slowly, the turquoise sea shimmers and small
waves lap at the rocks, a few seagulls glide in the distance, the fluffy
clouds drift slowly. Everything else stays still and exactly as painted.
Fresh, joyful, painterly style kept, no new objects, no people appearing, no
text.
```

---

# 140 — The first of each working building → `art/first_{quarry,store,mill,market}_clip.mp4`  ✅ DONE (Leonardo, not ChatGPT)

Each plays once, when the first quarry, storehouse, mill or market in the
village finishes building (celebrateFirst in game.js; not on a later one, and
not on an upgrade). `art/first_<key>_clip.webp` is its first frame. Start frames
`art/original/first_<key>_clip_frame.png`: the building's sprite over a blurred
crop of the title painting, as 135 (the storehouse from `art/store.webp`, since
its original has a baked checkerboard). Leonardo.ai, MiniMax H3, 16:9 HD, 6 s,
Turbo, 90 credits; encoded as 131.

### 140.1 → `art/first_mill_clip.mp4` ("The mill is turning")

```
Gentle living painting, static camera, no zoom, no pan. A newly finished stone
windmill on a sunny island: its four canvas sails start to turn and pick up
speed, turning smoothly round and round, a little puff of flour dust drifts
from the open door, the wheat sheaf on the cart sways in the breeze, a few
small birds flutter past, soft warm sunlight and gentle shadows. The windmill
stays exactly as painted and in the same place, the blurred village behind
stays still. Cheerful, painterly game-art style kept, no people appearing, no
text.
```

### 140.2 → `art/first_market_clip.mp4` ("The market is open")

```
Gentle living painting, static camera, no zoom, no pan. A newly opened village
market stall on a sunny island: the red and white striped awnings ripple softly
in the breeze, the little pennant flags along the top flutter, the brass scales
sway and settle, a few butterflies and petals drift past, the hanging cloths
sway lightly, warm sunlight with soft moving dappled shadows. The market stays
exactly as painted and in the same place, the blurred village behind stays
still. Cheerful, festive, painterly game-art style kept, no people appearing,
no text.
```

### 140.3 → `art/first_quarry_clip.mp4` ("The quarry is open")

```
Gentle living painting, static camera, no zoom, no pan. A newly finished stone
quarry on a sunny island: little puffs of pale stone dust rise and drift slowly
from the cut rock face, a few tiny pebbles tumble down the rubble and settle,
fine dust motes glitter in the warm sunlight, a small bird hops on the stone
blocks then flies away, soft shadows shift gently. The quarry, its wooden
shelter and the stone blocks stay exactly as painted and in the same place, the
blurred village behind stays still. Cheerful, painterly game-art style kept, no
people appearing, no text.
```

### 140.4 → `art/first_store_clip.mp4` ("The storehouse is ready")

```
Gentle living painting, static camera, no zoom, no pan. A newly finished wooden
storehouse barn on a sunny island: the hanging grain sack on the hoist rope
sways gently back and forth, the rope creaks and swings, the open barn door
moves slightly in the breeze, a few loose wheat stalks and seeds blow past, a
small sparrow lands on a sack and pecks, warm sunlight and soft shadows shift
gently. The storehouse, barrels and sacks stay exactly as painted and in the
same place, the blurred village behind stays still. Cheerful, painterly
game-art style kept, no people appearing, no text.
```

---

# 141 — The first house, farm, lumber camp and well → `art/first_{house,farm,lumber,well}_clip.mp4`  ✅ DONE (Leonardo, not ChatGPT)

The early half of 140: the same celebrateFirst, the same rule (the first one
finished, never an upgrade). Start frames `art/original/first_<key>_clip_frame.png`
from the game sprites (`art/<key>.webp`) over the same blurred crop as 135.
Leonardo.ai, MiniMax H3, 16:9 HD, 6 s, Turbo, 90 credits; encoded as 131. The
farm's rows grow in until the whole field is wheat, which suits its caption.

### 141.1 → `art/first_house_clip.mp4` ("A first home")

```
Gentle living painting, static camera, no zoom, no pan. A newly built cosy
cottage on a sunny island, the very first home of a new village: a thin curl of
wood smoke begins to rise slowly from the stone chimney, the warm glow in the
window flickers softly as if a fire was just lit, a few small white petals and
leaves drift past on the breeze, a little bird lands on the roof ridge, warm
sunlight and soft shadows. The cottage stays exactly as painted and in the same
place, the blurred village behind stays still. Warm, welcoming, painterly
game-art style kept, no people appearing, no text.
```

### 141.2 → `art/first_farm_clip.mp4` ("The fields are sown")

```
Gentle living painting, static camera, no zoom, no pan. A newly planted wheat
field on a sunny island: the rows of golden wheat sway in soft waves as the
breeze passes over them, the ears of grain nod gently, a few butterflies
flutter low over the crop, a little sparrow lands on the wooden fence rail,
light seeds and chaff drift in the warm sunlight, soft cloud shadows pass
slowly across the field. The field, the fence, the hay bales and the cart stay
exactly as painted and in the same place, the blurred village behind stays
still. Cheerful, painterly game-art style kept, no people appearing, no text.
```

### 141.3 → `art/first_lumber_clip.mp4` ("The woodcutters are in")

```
Gentle living painting, static camera, no zoom, no pan. A newly built lumber
camp on a sunny island: a few fresh wood chips and curls of sawdust drift and
fall slowly through the warm sunlight, fine sawdust motes glitter in the air, a
few green leaves blow past from the forest, a little squirrel scampers onto the
log pile and sits up, soft shadows shift gently. The wooden shelter, the
stacked logs, the saw and the axe stay exactly as painted and in the same
place, the blurred village behind stays still. Cheerful, painterly game-art
style kept, no people appearing, no text.
```

### 141.4 → `art/first_well_clip.mp4` ("The well is dug")

```
Gentle living painting, static camera, no zoom, no pan. A newly built stone
well on a sunny island: the water inside the well sparkles and ripples with
soft light, the wooden bucket on its rope sways gently, a few drops of water
fall and glint in the sunshine, a small bluebird lands on the edge of the well
and takes a sip, the green moss and little leaves stir in the breeze, soft
shadows shift gently. The well, its roof, the crank and the bucket stay
exactly as painted and in the same place, the blurred village behind stays
still. Fresh, cheerful, painterly game-art style kept, no people appearing, no
text.
```

---

# 142 — A clip for each town hall level, and the first statue → `art/hall_up_{2,3,4}_clip.mp4`, `art/first_statue_clip.mp4`  ✅ DONE (Leonardo, not ChatGPT)

Every hall upgrade used to play 131, which shows the level-5 hall. Now levels
2-4 each have their own, showing the hall as it looks at that level (`hall.webp`
for 2, `hall_2.webp` for 3 and 4; see HALL_STAGES), and 131 is kept for the top
level (celebrateHall). The first statue plays when it is placed: decorations
go up finished, so place() calls celebrateFirst itself. Start frames
`art/original/{hall_up_N,first_statue}_clip_frame.png`, the sprite over the
same blurred crop as 135. Leonardo.ai, MiniMax H3, 16:9 HD, 6 s, Turbo, 90
credits; encoded as 131. Level 4 shares level 3's frame; its backdrop resolves
over its first second into a sharp village at dusk, which is the point.

### 142.1 → `art/hall_up_2_clip.mp4` ("Town hall · level 2")

```
Gentle living painting, static camera, no zoom, no pan. A village town hall on
a sunny island celebrating its new rank: the bell in the little tower swings
and rings back and forth, the blue banners with golden fleur-de-lis flutter
proudly in the breeze, a shower of small colourful paper petals and confetti
drifts down gently, two white doves fly up from the roof and circle, warm
golden sunlight glows. The town hall stays exactly as painted and in the same
place, the blurred village behind stays still. Joyful, festive, painterly
game-art style kept, no people appearing, no text.
```

### 142.2 → `art/hall_up_3_clip.mp4` ("Town hall · level 3")

```
Gentle living painting, static camera, no zoom, no pan. A grand new village
town hall with a clock tower on a bright sunny morning: the bell in the clock
tower swings and rings, the hands of the clock tick forward, the golden
weathervane on the green spire turns in the breeze, the blue banners flutter,
the red flowers in the window boxes sway, a flock of small birds lifts off from
the roof and wheels across the sky, sparkles of sunlight glint on the gold
trim. The town hall stays exactly as painted and in the same place, the
blurred village behind stays still. Proud, joyful, painterly game-art style
kept, no people appearing, no text.
```

### 142.3 → `art/hall_up_4_clip.mp4` ("Town hall · level 4")

```
Gentle living painting, static camera, no zoom, no pan. A grand village town
hall with a clock tower at golden dusk, celebrating: the sky behind slowly
warms to orange and pink, the lanterns by the door and the windows light up
one by one with a warm glow, small colourful fireworks burst softly high in
the sky and their sparks drift down, the bell in the clock tower swings and
rings, the blue banners flutter, glowing fireflies rise around the steps. The
town hall stays exactly as painted and in the same place, the blurred village
behind stays still. Magical, festive, painterly game-art style kept, no people
appearing, no text.
```

### 142.4 → `art/first_statue_clip.mp4` ("A statue for the square")

```
Gentle living painting, static camera, no zoom, no pan. A newly unveiled stone
statue of a harvest maiden holding a sheaf of wheat on a sunny island: a soft
beam of golden sunlight falls across the statue, tiny golden sparkles shimmer
and drift up around it, a few flower petals float down and settle at its base,
two white doves flutter down and land on the plinth, the moss on the stones
glistens. The statue and its plinth stay perfectly still, exactly as painted
and in the same place, the blurred village behind stays still. Serene, proud,
painterly game-art style kept, no people appearing, no text.
```

---

# 143 — A clip for the first flowerbed, bench, lamp and banner → `art/first_{flowers,bench,lamp,banner}_clip.mp4`  ✅ DONE (Leonardo, not ChatGPT)

The decorations that make a place of the village, each with its first one
celebrated as the statue's is (FIRST_CLIP; place() calls celebrateFirst for a
decoration). The path, fence and hedge get none, being laid by the dozen.
Start frames `art/original/first_*_clip_frame.png`, the default sprite of each
over the same blurred crop as 135. Leonardo.ai, MiniMax H3, 16:9 HD, 6 s,
Turbo, 90 credits; encoded as 131. The lamp's clip lays a patch of grass under
its base as the light comes up.

### 143.1 → `art/first_lamp_clip.mp4` ("A light for the evening")

```
Gentle living painting, static camera, no zoom, no pan. A new iron street lamp
on a stone base in a village as the evening falls: the sky behind slowly dims
to a warm dusk, the lamp flickers and then lights up with a soft warm golden
glow that spreads a halo of light around it, a few moths flutter around the
glass, tiny glowing fireflies rise slowly from the grass. The lamp and its base
stay perfectly still, exactly as painted and in the same place, the blurred
village behind stays still. Cosy, magical, painterly game-art style kept, no
people appearing, no text.
```

### 143.2 → `art/first_banner_clip.mp4` ("The village colours")

```
Gentle living painting, static camera, no zoom, no pan. A new blue and gold
village banner with a golden fleur-de-lis hanging from a wooden pole on a stone
base, on a bright sunny day: a breeze catches the banner and it ripples and
waves proudly, its golden tassels swing, sunlight glints on the gold finial at
the top of the pole, a few colourful confetti pieces and flower petals drift
past on the wind. The pole and its stone base stay perfectly still, exactly as
painted and in the same place, the blurred village behind stays still. Festive,
proud, painterly game-art style kept, no people appearing, no text.
```

### 143.3 → `art/first_bench_clip.mp4` ("A bench to sit on")

```
Gentle living painting, static camera, no zoom, no pan. A new wooden village
bench with a green blanket folded over it on a calm golden afternoon: a light
breeze lifts the fringe of the green blanket, a few orange autumn leaves drift
down and settle on the seat, a small robin hops onto the backrest and tilts its
head, warm dappled sunlight shifts gently across the wood. The bench stays
perfectly still, exactly as painted and in the same place, the blurred village
behind stays still. Peaceful, cosy, painterly game-art style kept, no people
appearing, no text.
```

### 143.4 → `art/first_flowers_clip.mp4` ("The first flowers")

```
Gentle living painting, static camera, no zoom, no pan. A newly planted
flowerbed edged with grey stones, full of red poppies, pink, white and yellow
flowers, on a fresh sunny spring morning: the flower heads open up and sway
softly in the breeze, glistening dew drops sparkle on the leaves, a fat
bumblebee and two small white butterflies flutter from flower to flower, a few
petals lift and drift on the air. The stone edging stays perfectly still and
the flowerbed stays exactly as painted and in the same place, the blurred
village behind stays still. Fresh, cheerful, painterly game-art style kept, no
people appearing, no text.
```

---

# 144 — A clip for each beacon stage, and the first trade → `art/beacon_up_{2,3,4}_clip.mp4`, `art/first_trade_clip.mp4`  ✅ DONE (Leonardo, not ChatGPT)

The beacon rises over hours of a finished village and only its last stage had
a moment (`beacon_lit`). Now stages 2-4 each play their own when beaconTake
raises it (the offline path, beaconAway, celebrates none, as before). The first
trade order filled plays the ship (fillOrder, ordersDone reaching 1). Start
frames `art/original/{beacon_up_N,first_trade}_clip_frame.png`: the
`beacon_stageN` sprite over a blurred crop of the title painting's sea and
trees (left 330, top 236, 420x240 -- clear of its own lighthouse), the ketch
over its harbour (left 500, top 1060, 524x300) with no ground shadow.
Leonardo.ai, MiniMax H3, 16:9 HD, 6 s, Turbo, 90 credits; encoded as 131. The
beacon backdrops resolve into a sharp headland; stage 4's lantern glows warm
from its first second despite "stays unlit", which reads as the light being
tried before the lit stage.

### 144.1 → `art/beacon_up_2_clip.mp4` ("The beacon is begun")

```
Gentle living painting, static camera, no zoom, no pan. The first course of a
new stone beacon tower on a sunny island headland by the sea: a little puff of
mortar dust drifts off the fresh stones, a few small pebbles settle, two white
seagulls glide in and land on the top of the low wall, the sea behind glitters
and its waves roll gently, the trees in front sway in the sea breeze. The stone
tower stays perfectly still, exactly as painted and in the same place, the
blurred sea behind stays in place. Hopeful, bright, painterly game-art style
kept, no people appearing, no text.
```

### 144.2 → `art/beacon_up_3_clip.mp4` ("The beacon is rising")

```
Gentle living painting, static camera, no zoom, no pan. A tall new stone beacon
tower with battlements and an iron band, half built, on a sunny island headland
by the sea: golden afternoon sunlight sweeps slowly across the stones, a flock
of seagulls circles the top of the tower and two of them land on the
battlements, a thin wisp of stone dust drifts from the top, the sea behind
sparkles and its waves roll, the trees in front sway in the sea breeze. The
stone tower stays perfectly still, exactly as painted and in the same place,
the blurred sea behind stays in place. Proud, hopeful, painterly game-art style
kept, no people appearing, no text.
```

### 144.3 → `art/beacon_up_4_clip.mp4` ("The lantern is in")

```
Gentle living painting, static camera, no zoom, no pan. A tall stone lighthouse
beacon tower with a new black iron lantern room and railing at its top, on an
island headland by the sea at golden sunset: the warm sunset light glints and
sparkles on the new glass and iron of the lantern room, the sky behind warms to
orange and pink, seagulls circle the top of the tower, a tiny faint spark
flickers once inside the empty lantern and fades, the sea behind shimmers with
golden light, the trees in front sway in the breeze. The tower stays perfectly
still, exactly as painted and in the same place, the lantern stays unlit, the
blurred sea behind stays in place. Expectant, proud, painterly game-art style
kept, no people appearing, no text.
```

### 144.4 → `art/first_trade_clip.mp4` ("The first trade")

```
Gentle living painting, static camera, no zoom, no pan. A small wooden
two-masted trading ship loaded with crates and barrels, moored by a village
jetty in clear turquoise water on a bright sunny day: the ship rocks gently up
and down on the water, its white sails fill and billow softly in the breeze,
the red pennant at the top of the mast flutters, ripples and little sparkles of
sunlight dance on the water around the hull, two white seagulls swoop down and
perch on the crates. The ship stays in the same place, exactly as painted, the
blurred jetty behind stays still. Cheerful, prosperous, painterly game-art
style kept, no people appearing, no text.
```

---

# 145 — A day going by, for each season → `art/away_{spring,autumn,winter}.mp4`  ✅ DONE (Leonardo, not ChatGPT)

The away card's day (134) by the time of year, chosen in drawAwayPic the way
the title chooses its painting: summer keeps `away_day`. Start frames
`art/original/away_{season}_clip_frame.png`: each season's title painting
(768x1376) cropped at left 6, top 322, 759x434 -- the same fraction of the
picture as 134's crop of the summer one, which lands a little closer in since
those paintings are framed tighter. Leonardo.ai, MiniMax H3, 16:9 HD, 6 s,
Turbo, 90 credits; encoded as 131, the first frame kept as the `.webp`. Spring's
clouds cross low over the middle of the village for a second or so.

### 145.1 → `art/away_spring.mp4`

```
Time-lapse living painting, static camera, no zoom, no pan. A whole spring day
passes quickly over the village: the little villagers hurry about their work on
the paths, the windmill sails spin, pink cherry blossom petals drift and swirl
on the breeze, shadows sweep slowly across the ground, white clouds race
overhead, the sunlight turns warm golden then dusky blue as evening falls, and
one by one the cottage windows and the street lanterns light up with a warm
glow, chimney smoke curls up, the sea darkens and shimmers. The buildings stay
exactly as painted. Fresh, cosy, painterly style kept, no new buildings, no
text.
```

### 145.2 → `art/away_autumn.mp4`

```
Time-lapse living painting, static camera, no zoom, no pan. A whole autumn day
passes quickly over the village: the little villagers hurry about their work on
the paths, the windmill sails spin, golden and orange leaves drift down and
swirl across the paths, shadows sweep slowly across the ground, clouds race
overhead, the low sunlight turns deep amber then dusky blue as evening falls,
and one by one the cottage windows and the street lanterns light up with a warm
glow, chimney smoke curls up thickly, the sea darkens and shimmers. The
buildings stay exactly as painted. Cosy, mellow, painterly style kept, no new
buildings, no text.
```

### 145.3 → `art/away_winter.mp4`

```
Time-lapse living painting, static camera, no zoom, no pan. A whole winter day
passes quickly over the snowy village: the little villagers hurry about their
work along the snowy paths, the windmill sails turn slowly, soft snowflakes fall
gently, shadows sweep slowly across the snow, clouds drift overhead, the pale
winter sunlight turns rosy pink then deep dusky blue as evening falls, and one
by one the cottage windows and the street lanterns glow brighter with warm
golden light, chimney smoke curls up from every roof, the icy sea darkens and
shimmers. The buildings and the snow on the roofs stay exactly as painted. Cosy,
magical, painterly style kept, no new buildings, no text.
```

---

# 146 — The last hour's three goals → `art/goal_{full,charm,work}_clip.mp4`  ✅ DONE (Leonardo, not ChatGPT)

The three goals that name the last hour of play -- everything the hall
allows, the charm ceiling, every workplace at level 5 -- arrived with only the
strip, where every earlier step has a moment of its own already. Each now
carries a `clip` that the goal banner plays (celebrate, captioned as below).
Start frames `art/original/goal_*_clip_frame.png`, cropped sharp from the title
painting: the square, market and docks (left 0, top 470, 1024x585), the
gardens by the hall (left 0, top 590, 512x293), the mill and fields (left 0,
top 307, 512x293). Leonardo.ai, MiniMax H3, 16:9 HD, 6 s, Turbo, 90 credits;
encoded as 131. The mill's cap swings round with its sails in the last one.

### 146.1 → `art/goal_full_clip.mp4` ("Everything the hall allows")

```
Gentle living painting, static camera, no zoom, no pan. A thriving complete
village on a sunny island holding a festival: strings of colourful bunting
flutter between the rooftops, the blue banners wave, a shower of confetti and
flower petals drifts down over the square, the little villagers bustle along
the paths and around the market stalls, the bell in the town hall tower swings,
chimney smoke curls up, the sheep graze, the boat at the jetty bobs on the
glittering sea, small birds wheel overhead. The buildings stay exactly as
painted and in the same places. Joyful, abundant, painterly game-art style
kept, no new buildings, no text.
```

### 146.2 → `art/goal_charm_clip.mp4` ("The village in bloom")

```
Gentle living painting, static camera, no zoom, no pan. A charming corner of a
village in full bloom on a warm sunny afternoon: the rose bushes and flowerbeds
burst open into even more colourful blossoms, butterflies and bees flutter
between the flowers, a gentle shower of pink and white petals drifts down
through the air, tiny golden sparkles shimmer over the gardens, the flower
boxes sway, the little villagers stroll along the path, chimney smoke curls up,
a soft rainbow glows faintly in the sky. The buildings stay exactly as painted
and in the same places. Lovely, enchanting, painterly game-art style kept, no
new buildings, no text.
```

### 146.3 → `art/goal_work_clip.mp4` ("Every workplace at its best")

```
Gentle living painting, static camera, no zoom, no pan. A busy working corner
of a village by the sea on a bright golden afternoon, everything at full work:
the windmill sails turn steadily round, the golden wheat in the fields ripples
in waves in the wind, a puff of flour dust drifts from the mill door, the
little villager carries a sack along the path, chimney smoke curls up from the
cottage, the trees sway, the sea behind sparkles, a seagull glides across the
sky. The buildings stay exactly as painted and in the same places. Productive,
prosperous, painterly game-art style kept, no new buildings, no text.
```

---

# 147 — Four earlier goals → `art/goal_{villagers4,trade3,up2,decor5}_clip.mp4`  ✅ DONE (Leonardo, not ChatGPT)

The goals with no building of their own to celebrate: four villagers housed,
three trade orders filled, the first upgrade, five decorations. Each carries a
`clip` like 146's, and a goal's clip now waits for one already on screen
(celebrateAfter) -- a goal often finishes on the heels of a first-building clip.
Start frames `art/original/goal_*_clip_frame.png`: sprites over the same
blurred crop as 135 -- the four villager sprites in a row, `market_hall`,
`house`, and the lamp, flowerbed, bench and banner together. Leonardo.ai,
MiniMax H3, 16:9 HD, 6 s, Turbo, 90 credits; encoded as 131. The market barely
moves -- its bunting stirs and little else; worth redoing when there are
credits (31 left, renewing 29 November).

### 147.1 → `art/goal_villagers4_clip.mp4` ("Four to the village")

```
Gentle living painting, static camera, no zoom, no pan. Four cheerful villagers
standing together in a sunny village, a farmer in green, a woman in a blue
dress with a basket of vegetables, a bearded woodcutter with an axe on his
shoulder, and a miller with a flour sack: they smile, wave hello and nod to one
another, the woman lifts her basket a little, the woodcutter shifts the axe on
his shoulder, the miller pats his flour sack and a puff of flour drifts up,
their clothes and hair move softly in the breeze, a few flower petals drift
past. The four villagers stay in the same places and look exactly as painted,
the blurred village behind stays still. Warm, welcoming, painterly game-art
style kept, no other people appearing, no text.
```

### 147.2 → `art/goal_trade3_clip.mp4` ("Trade is flowing")

```
Gentle living painting, static camera, no zoom, no pan. A covered wooden
village market hall with a red tiled roof, piled with crates of apples,
cheeses, bread and bolts of cloth, on a bright busy morning: the green and
cream bunting along the eaves flutters, the hanging wheat sign swings gently,
the brass scales tip and settle, a few gold coins glint and sparkle on the
counter, two small sparrows hop among the crates pecking at crumbs, warm
sunlight shifts across the goods. The market hall stays perfectly still,
exactly as painted and in the same place, the blurred village behind stays
still. Bustling, prosperous, painterly game-art style kept, no people
appearing, no text.
```

### 147.3 → `art/goal_up2_clip.mp4` ("A building grows")

```
Gentle living painting, static camera, no zoom, no pan. A freshly improved
half-timbered village cottage with a red tiled roof on a sunny morning: a sweep
of golden sparkles runs over the roof and walls as if newly finished, warm
light glows brighter in the window, a curl of chimney smoke rises from the
stone chimney, a few wood shavings and a little dust drift away from the walls,
two small birds land on the roof ridge, the trees in the background sway
softly. The cottage stays perfectly still, exactly as painted and in the same
place, the blurred village behind stays still. Proud, cheerful, painterly
game-art style kept, no people appearing, no text.
```

### 147.4 → `art/goal_decor5_clip.mp4` ("A village worth a stroll")

```
Gentle living painting, static camera, no zoom, no pan. A pretty little village
plaza with an iron street lamp, a stone-edged flowerbed, a wooden bench with a
green blanket and a blue and gold banner, on a warm sunny afternoon: the banner
waves in the breeze, the flowers sway and a bumblebee and a white butterfly
flutter over them, the lamp glass glints, a few autumn leaves drift down onto
the bench, a small robin hops along the bench, soft sunlight dapples across
everything. The lamp, the flowerbed, the bench and the banner pole stay
perfectly still, exactly as painted and in the same places, the blurred village
behind stays still. Charming, peaceful, painterly game-art style kept, no
people appearing, no text.
```

---

# 148 — The trees in winter → `art/tree_{oak,pine,spruce,birch}_winter.png`  ✅ DONE

All winter the trees stayed in full leaf under a pale wash. Now each of the
four main trees has a winter picture of its own, swapped in by SEASON_LOOK in
game.js; the willow, poplar and cherry keep the wash for now. Each was made in
the same chat with the summer tree attached, so the size, trunk position and
camera match and the swap doesn't jump. Capped at 560 px like the summer trees.

### 148.1 → `art/tree_oak_winter.png` (attach `art/original/tree_oak.png`)

```
Next: the WINTER version of this oak tree, at exactly the same size, trunk
position, scale and camera angle. Bare branches with no leaves, snow resting
along the boughs, a little snow drift around the base. Same painterly style as
the others. No text. Nothing beyond it: fully transparent background.
```

ChatGPT added a robin on a branch, and the robin was kept.

### 148.2 → `art/tree_pine_winter.png` (attach `art/original/tree_pine.png`)

```
Next: the WINTER version of this pine tree, at exactly the same size, trunk
position, scale and camera angle. Green needles under thick snow on every
tier, a few icicles, a little snow drift around the base. Same painterly style
as the others. No text. Nothing beyond it: fully transparent background.
```

### 148.3 → `art/tree_spruce_winter.png` (attach `art/original/tree_spruce.png`)

```
Next: the WINTER version of this spruce tree, at exactly the same size, trunk
position, scale and camera angle. Dark green needles weighed down with thick
snow on every tier, a few icicles, a little snow drift around the base. Same
painterly style as the others. No text. Nothing beyond it: fully transparent
background.
```

### 148.4 → `art/tree_birch_winter.png` (attach `art/original/tree_birch.png`)

```
Next: the WINTER version of this birch tree, at exactly the same size, trunk
position, scale and camera angle. Bare white-and-black birch branches with no
leaves, snow resting along the branches, a little snow drift around the base.
Same painterly style as the others. No text. Nothing beyond it: fully
transparent background.
```

---

# 149 — The rest of winter, and autumn → `art/tree_{willow,poplar,cherry}_winter.png`, `art/tree_{oak,birch,willow,poplar,cherry}_autumn.png`  ✅ DONE

148 finished winter for the four main trees. This finishes it for the willow,
poplar and cherry, and gives every leafy tree its own autumn picture in place
of the orange wash. The pine and spruce are evergreen and keep the wash in
autumn. Made in the same chat and the same way as 148: the summer tree
attached, "Next: the WINTER/AUTUMN version of this … at exactly the same
size, trunk position, scale and camera angle … Same painterly style as the
others. No text. Nothing beyond it: fully transparent background." Capped at
560 px; each ratio is within 0.03 of its summer tree.

What each one asked for, between the shared opening and closing:

- **149.1 willow, winter:** bare drooping willow wands with no leaves, a dusting of snow along the upper branches, a few small icicles hanging from the tips, a little snow drift around the base.
- **149.2 poplar, winter:** bare upright branches with no leaves, keeping the same tall narrow shape, snow resting along the branches, a little snow drift around the base.
- **149.3 cherry, winter:** bare dark branches with no blossom or leaves, snow resting along the branches, a little snow drift around the base.
- **149.4 oak, autumn:** the full crown of leaves turned golden, amber, orange and russet, a few leaves drifting down, a scatter of fallen leaves around the base.
- **149.5 birch, autumn:** the leaves turned bright butter-yellow and gold against the white bark, a few leaves drifting down, a scatter of fallen yellow leaves around the base.
- **149.6 willow, autumn:** the long drooping fronds turned golden-yellow and pale amber, a few leaves drifting down, a scatter of fallen yellow leaves around the base.
- **149.7 poplar, autumn:** keeping the same tall narrow shape, the leaves turned rich gold and yellow with a few touches of orange, a few leaves drifting down, a scatter of fallen leaves around the base.
- **149.8 cherry, autumn:** no blossom; the leaves turned deep crimson, scarlet and orange, a few leaves drifting down, a scatter of fallen red leaves around the base.

---

# 150 — The ground cover in winter → `art/{rock,rock_moss,stump,log_mushroom,flowers_wild,flowers_meadow}_winter.png`  ✅ DONE

With the trees in snow, the rocks, stumps and wildflowers were the last green
things on a white island. Same chat and same pattern as 148, with the summer
picture attached. The two flower patches don't just get snow: they become the
two flowers that bloom in it, so a winter island still has a little colour.
Capped at 360 px like their summer pictures.

- **150.1 rock:** a soft cap of snow resting on top, frost on the stone, a little snow drift around the base, the grass tufts gone.
- **150.2 mossy rock:** snow lying over the top and in the hollows, the moss mostly hidden with just a few dark green patches showing, frost on the stone, a little snow drift around the base. (ChatGPT added frosted ferns and winter heather.)
- **150.3 stump:** a thick round cushion of snow on the cut top, snow on the roots, frost on the bark, a little snow drift around the base. (It kept the red toadstools.)
- **150.4 mushroom log:** a long ridge of snow along the top of the log, the mushrooms gone, a few icicles hanging from the side, frost on the bark, a little snow drift around it.
- **150.5 wildflowers:** the summer flowers gone; instead a little clump of white snowdrops with nodding heads and slender green leaves poking up through a patch of snow.
- **150.6 meadow flowers:** the summer flowers gone; instead a low clump of winter hellebores (Christmas roses) with cream and soft pink cupped flowers and dark green leaves, sitting in a patch of snow, with a few frosted grass tufts.

---

# 151 — The flowers round the year, and the cherry in fruit → `art/tree_cherry_summer.png`, `art/flowers_{wild,meadow}_{spring,autumn}.png`  ✅ DONE

The cherry was in blossom all year round except autumn and winter (149), and
the wildflowers were the same summer patch under a tint from March to
November. Now the cherry blossoms in spring only and is green with ripe
cherries by summer. The wildflower patches change by season: daffodils and
bluebells in spring, the summer meadow (and the skeps), asters and heather in
autumn, then 150's snowdrops and hellebores. Same chat and pattern as 148.

- **151.1 cherry, summer:** the blossom gone: a full crown of glossy deep green leaves hung with clusters of ripe red cherries, a few fallen cherries in the grass at the base.
- **151.2 wildflowers, spring:** the summer flowers gone; instead a cheerful clump of yellow daffodils with trumpet heads and a few small white narcissi, with fresh green leaves in bright spring grass.
- **151.3 meadow flowers, spring:** the summer flowers gone; instead a drift of nodding blue bluebells with a few white wood anemones and primroses, among fresh bright green leaves and grass.
- **151.4 wildflowers, autumn:** the summer flowers gone; instead a clump of purple and lilac Michaelmas daisies with golden centres among grass turning golden-brown, a few fallen orange leaves caught in it.
- **151.5 meadow flowers, autumn:** the summer flowers gone; instead a low mound of pink and mauve heather in flower with a few russet bracken fronds and golden seed heads of grass.

---

# 152 — Snow on the houses → `art/house{,_stone,_thatch,_fisher,_baker,_weaver,_potter,_bee,_oak}_winter.png`  ✅ DONE

With the trees and the ground cover in snow, the houses were the biggest
thing on the island still standing in summer under a pale wash. A winter
picture for each of the nine house looks, swapped in by winterArt() in
game.js and not washed. Same chat, summer picture attached, one prompt shared
by all nine with only the name changed ("cottage", "stone house", "thatched
cottage", "fisherman's house", "baker's house", "weaver's house", "potter's
house", "beekeeper's house", "oak-framed house"):

```
Next: the WINTER version of this <house>, at exactly the same size, position,
scale and camera angle, with the base and footprint exactly as in the
original. Thick snow lying on the roof and along the eaves, a few icicles
hanging from the eaves, snow on the chimney top and window sills, warm golden
light glowing in the windows, a thin curl of chimney smoke. Keep the walls,
door and base unchanged, with only a thin dusting of snow at the foot of the
walls and no snow drifts spreading beyond the building. Same painterly style
as the others. No text. Nothing beyond it: fully transparent background.
```

Small additions per house: the fisherman's nets and barrels, the baker's sign
(and "a curl of oven smoke" -- it came out tall, hence the next note), the
potter's kiln and pots, the beekeeper's hives with no bees flying. From the
weaver on, "only a short wisp of chimney smoke".

The smoke and icicles move the top of the trim, so the winter heights differ
from the summer ones by up to 4% (weaver 716 -> 691). The winter picture is
therefore hung from the summer picture's base rather than fitted on its own:
see artRect. The "oak-framed house" is the treehouse in an oak; it came back
with snow on the oak's leaves and on the turf roof.

# 153 — Snow on the hall and the storehouses → `art/hall{,_2,_3}_winter.png`, `art/store{,_granary,_barn,_tithe,_staddle,_cellar}_winter.png`  ✅ DONE

After the houses, the town hall and the storehouses were the next most common
buildings still under a pale wash. A winter picture for each of the hall's
three stages (`hall`, `hall_2`, `hall_3`) and each of the six storehouse looks,
added to WINTER_LOOKS in game.js. Same chat, summer picture attached, the
houses' prompt with the light and smoke taken out:

```
Next: the WINTER version of this <building>, at exactly the same size,
position, scale and camera angle, with the base, footprint and outline
exactly as in the original. Thick snow lying on the roof and along the eaves,
a few icicles hanging from the eaves, snow capping the crates, sacks and
barrels outside and on any ledges. No smoke. Keep the walls, doors and base
unchanged, with only a thin dusting of snow at the foot of the walls and no
snow drifts spreading beyond the building. Same painterly style as the
others. No text. Nothing beyond it: fully transparent background.
```

Names used: "town hall", "town hall with its clock tower", "grand guildhall"
(those three said "No chimney smoke"), "storehouse", "granary", "barn" (snow
on the hay), "tithe barn", "staddle store" (snow on the staddle stones),
"cellar store". The proportions came back within 3% of the summer ones; the
pictures hang from the summer base as the houses' do.

# 154 — Snow on the mills and the market stalls → `art/mill{,_post,_smock,_water,_tower,_cider}_winter.png`, `art/market{,_hall,_fish,_cheese,_fruit,_flower}_winter.png`  ✅ DONE

The next tallest buildings still under the pale wash. A winter picture for
each of the six mill looks and the six market looks, added to WINTER_LOOKS in
game.js. Same chat, summer picture attached, round 153's prompt adapted.

Mills ("windmill", "post mill", "smock mill", "tower mill", "cider mill"):

```
Next: the WINTER version of this <mill>, at exactly the same size, position,
scale and camera angle, with the base, footprint, outline and sails exactly
as in the original. Thick snow lying on the roof and cap, a thin line of snow
along the top edges of the sails, a few icicles hanging from the eaves, snow
capping the sacks and barrels outside and on any ledges. No smoke. Keep the
walls, doors, sails and base unchanged, with only a thin dusting of snow at
the foot of the walls and no snow drifts spreading beyond the building. Same
painterly style as the others. No text. Nothing beyond it: fully transparent
background.
```

The watermill kept its wheel ("icicles ... from the rim of the water wheel,
the water in the race dark and cold but still flowing"); the cider mill has
no sails ("snow capping the barrels, crates and press").

Market stalls ("market stall", "market hall", "fish stall", "cheese stall",
"fruit stall"):

```
Next: the WINTER version of this <stall>, at exactly the same size, position,
scale and camera angle, with the base, footprint and outline exactly as in
the original. Thick snow lying on the awning or roof, a few icicles hanging
from its edge, a little snow capping the crates, sacks and barrels around it,
the goods on the counter still bright and on show. No smoke. Keep the stall,
counter and base unchanged, with only a thin dusting of snow at the foot and
no snow drifts spreading beyond it. Same painterly style as the others. No
text. Nothing beyond it: fully transparent background.
```

The flower stall's summer blooms would have read wrong in snow, so it was
told "The flowers become winter ones: holly sprigs, red winterberries, white
hellebores, evergreen wreaths and pine boughs, with no summer blooms."

All twelve came back within 1.3% of the summer proportions.

# 155 — Snow on the lumber camps and the wells → `art/lumber{,_pit,_cabin,_saw,_charcoal,_cart}_winter.png`, `art/well{,_iron,_thatch,_pump,_wish,_wheel}_winter.png`  ✅ DONE

A winter picture for each of the six lumber looks and the six well looks,
added to WINTER_LOOKS in game.js. Same chat, summer picture attached, round
153's prompt adapted again.

Lumber ("lumber camp", "saw pit", "woodcutter's cabin", "sawmill", "timber
yard with its log cart"):

```
Next: the WINTER version of this <camp>, at exactly the same size, position,
scale and camera angle, with the base, footprint and outline exactly as in
the original. Thick snow lying on any roof and along the eaves, a few icicles
hanging from the eaves, snow capping the log piles, stumps, tools and
sawhorses. No smoke. Keep the buildings, logs and base unchanged, with only a
thin dusting of snow on the ground and no snow drifts spreading beyond it.
Same painterly style as the others. No text. Nothing beyond it: fully
transparent background.
```

The charcoal burners' camp kept its smoke and its mound bare: "the warm
charcoal mound itself stays dark and free of snow. Keep any smoke exactly as
in the original, no more."

Wells ("well", "thatched well", "wishing well", "wheel well"):

```
Next: the WINTER version of this <well>, at exactly the same size, position,
scale and camera angle, with the base, footprint and outline exactly as in
the original. Thick snow lying on its little roof, a few icicles hanging from
the roof edge and the bucket, snow capping the stone rim, the winch and any
buckets or barrels beside it. Keep the well, rope and base unchanged, with
only a thin dusting of snow at the foot and no snow drifts spreading beyond
it. Same painterly style as the others. No text. Nothing beyond it: fully
transparent background.
```

The iron well had "a line of snow along the top of the ironwork"; the pump
"a thin skin of ice on the trough"; the wishing well's flowers became "frosted
evergreens and red winter berries"; the wheel well "a line of snow along the
top of the big wheel". The iron well and the wishing well came back as a
choice of two; the first of each was taken, the second of the wishing well
having grown a drift and a trough beyond its base.

The wells are capped at 400 like their summer pictures. Proportions within 3%
of the summer ones.

# 156 — Snow on the farms → `art/farm{,_veg,_barley,_pumpkin,_vine,_orchard,_hops}_winter.png`  ✅ DONE

A winter picture for each of the seven farm looks, added to WINTER_LOOKS in
game.js. The fields lie under snow: bare soil and bare branches, nothing
growing.

The wheat farm and the vegetable plots came from the same ChatGPT chat as
rounds 153 to 155, with round 155's prompt adapted ("snow lying over the
fields, the rows bare, snow capping the fences, baskets and tools"). ChatGPT
then ran out of image creations for the day.

The other five came from Leonardo (app.leonardo.ai), GPT Image 2.5 Flare at
Medium quality, 1:1 Small (1024), with the summer picture as an image
reference: 23 tokens each, 115 of the month's 150. Leonardo will not paint a
transparent background, so it was asked for a flat colour to key out:

```
Edit the reference image: the WINTER version of this <farm>, at exactly the
same size, position, scale and camera angle, with the base, footprint and
outline exactly as in the original. <what winter does to it>. Snow capping
the fence posts and rails. Keep the fence and base unchanged, with no snow
drifts spreading beyond it. Same painterly style. No text. Isolated on a
plain flat solid magenta (#FF00FF) background with nothing else in the
picture.
```

The barley field was asked for a white background and keyed fine. Magenta
left patches where the background is walled in (between the hop poles, inside
the fence) and a pink fringe on the bare branches, which the edge-flood keyer
can't reach; those four were keyed by colour everywhere, un-mixing the
magenta from the anti-aliased edges, before prep-art.

The Leonardo pictures stand 5 to 20% taller than the summer ones (the hop
poles, the bare orchard trees, the vine trellis); they hang from the summer
picture's base like the others, so the footprint is unchanged.

# 157 — Snow on the quarries → `art/quarry{,_pit,_slate,_marble,_sand,_clay}_winter.png`  ✅ DONE

A winter picture for each of the six quarry looks, added to WINTER_LOOKS in
game.js; with them every building look has its winter painting. Same ChatGPT
chat, summer picture attached, round 155's prompt adapted ("stone quarry",
"quarry pit", "slate quarry", "marble quarry", "sandstone quarry"):

```
Next: the WINTER version of this <quarry>, at exactly the same size,
position, scale and camera angle, with the base, footprint and outline
exactly as in the original. Thick snow lying on any roof and along the eaves,
a few icicles from the eaves and the crane, snow capping the cut blocks, the
rock ledges, the cart and the tools, while the steep cut rock faces stay bare
<grey stone / dark slate / veined marble / warm golden sandstone>. No smoke.
Keep the quarry, blocks and base unchanged, with only a thin dusting of snow
on the floor and no snow drifts spreading beyond it. Same painterly style as
the others. No text. Nothing beyond it: fully transparent background.
```

The clay pit and brickworks kept its kiln alight: "a thin skin of ice on any
water, while the dug clay banks stay bare and red-brown. Keep any kiln smoke
exactly as in the original, no more, and the warm kiln itself free of snow."

The pit's yellow stone came back pale under the snow; taken as it is.
Proportions within 1.5% of the summer ones.

# 158 — Snow on the hedges and fences → `art/hedge{,_topiary,_lavender,_wild,_holly,_beech}_winter.png`, `art/fence{,_picket,_stone,_wattle,_rope,_iron}_winter.png`  ✅ DONE

A winter picture for each of the six hedge looks and the six fence looks,
added to WINTER_LOOKS in game.js; drawDecor draws them unwashed at the summer
picture's width, so the snow on top makes them a little taller rather than
the hedge narrower. Same ChatGPT chat, summer picture attached.

Hedges ("garden hedge", "topiary hedge", "holly hedge"):

```
Next: the WINTER version of this <hedge>, at exactly the same size, position,
scale and camera angle, with the base, footprint and outline exactly as in
the original. A thick cap of snow lying along the top of the hedge and on its
ledges, a few frosted leaves showing through on the sides, the leaves still
dark green under the snow. Keep the hedge and base unchanged, with only a
thin dusting of snow at its foot and no snow drifts spreading beyond it. Same
painterly style as the others. No text. Nothing beyond it: fully transparent
background.
```

The lavender went out of flower ("no purple spikes, only the low silver-grey
winter bushes"); the wild hedgerow went bare ("bare twiggy branches with no
leaves and no flowers, a few red rose hips and haws left on them"); the beech
kept its leaves ("like a real beech hedge in winter it keeps its dry leaves,
now a warm copper-brown"). A robin sat on the hedgerow and the holly, and a
hedgehog in the beech, unasked; they stayed.

Fences ("wooden fence", "picket fence", "dry-stone wall", "woven wattle
fence", "rope and driftwood fence", "iron railing fence"):

```
Next: the WINTER version of this <fence>, at exactly the same size,
position, scale and camera angle, with the base, footprint and outline
exactly as in the original. A line of snow lying along the top of each rail,
a little cap of snow on each post, a few small icicles hanging from the
rails, frost on the wood. Keep the fence and base unchanged, with only a thin
dusting of snow at its foot and no snow drifts spreading beyond it. Same
painterly style as the others. No text. Nothing beyond it: fully transparent
background.
```

Flowers on the picket fence, the wattle and the iron railings became "bare
frosted stems". The dry-stone wall first came back on an opaque white snowy
ground, which can't be keyed from white snow; asked again with "The
background must be fully transparent (alpha), with no white, no ground and
no shadow around the wall", it came back clean.

# 159 — Snow on the benches and lamps → `art/bench{,_stone,_rose,_tree,_swing,_picnic,_campfire}_winter.png`, `art/lamp{,_bracket,_stone,_double,_ship,_basket,_crook}_winter.png`  ✅ DONE

A winter picture for each of the seven bench looks and the seven lamp looks,
added to WINTER_LOOKS in game.js and drawn like round 158's, at the summer
picture's width. Same ChatGPT chat, summer picture attached; every prompt now
ends with round 158's retry line, "The background must be fully transparent
(alpha), with no white, no ground and no shadow around it", and none came
back on a ground.

Benches ("wooden bench", "stone bench", "swing seat"):

```
Next: the WINTER version of this <bench>, at exactly the same size,
position, scale and camera angle, with the base, footprint and outline
exactly as in the original. A soft layer of snow lying on the seat and along
the top of the backrest and arms, a few small icicles hanging from the seat
edge, frost on the wood, any flowers or plants become bare frosted stems.
Keep the bench and base unchanged, with only a thin dusting of snow at its
foot and no snow drifts spreading beyond it. Same painterly style as the
others. No text. The background must be fully transparent (alpha), with no
white, no ground and no shadow around it.
```

The rose arch went to "bare and thorny with a few red rose hips"; the apple
tree went bare ("no leaves and no apples, its branches outlined with snow,
the same shape and size of crown in bare twigs"); the picnic table was
"cleared for winter: no food, no cloth, no basket", so it stands a little
lower than in summer; the campfire kept burning ("the ring of stones right
around it is clear of snow ... Keep any smoke exactly as in the original").

Lamps ("lamp post", "lantern on its bracket post", "stone lantern", "double
lamp post", "ship's lantern on its post", "lantern on its crook"):

```
Next: the WINTER version of this <lamp>, at exactly the same size, position,
scale and camera angle, with the base, footprint and outline exactly as in
the original. The lamp is lit and glowing warm exactly as in the original, a
little cap of snow on the lantern's roof and on any arms or ledges, a few
small icicles hanging from the lantern, frost on the post, any plants become
bare frosted stems. Keep the lamp and base unchanged, with only a thin
dusting of snow at its foot and no snow drifts spreading beyond it. Same
painterly style as the others. No text. The background must be fully
transparent (alpha), with no white, no ground and no shadow around it.
```

lamp_basket was asked for as "this fire basket on its post"; it is a lamp
hung with flower baskets, and ChatGPT followed the picture: the lamp lit, the
baskets holding bare frosted twigs. The crook kept its fireflies.

The summer ship's lantern is 184 wide on a 380 frame with clear margins
either side (its DECOR_AX of 0.61 is measured on that frame); the winter one
came back trimmed to 113. A retry asking for the arm "just as far from the
post as in the original" came back the same, and not downloaded: the
painting matched all along. The winter webp was padded with clear margins
(32 left, 39 right) so its post lines up with the summer one's; re-running
prep-art on lamp_ship_winter undoes that.

# 160 — Snow on the statues and flowerbeds → `art/statue{,_knight,_fisher,_fountain,_dragon,_birdbath,_bear,_scarecrow}_winter.png`, `art/flowers{,_planter,_tulip,_barrel,_cart,_sun}_winter.png`  ✅ DONE

A winter picture for each of the eight statue looks and the six flowerbed
looks, added to WINTER_LOOKS in game.js and drawn like rounds 158 and 159, at
the summer picture's width. Same ChatGPT chat, summer picture attached, same
transparent-background line at the end. Only the planter came back on a
painted checkerboard; prep-art keyed it cleanly.

Statues (the figure named for each: "statue", "knight statue", "fisherman
statue", "dragon statue", "bird bath", "bear statue", "scarecrow"):

```
Next: the WINTER version of this <statue>, at exactly the same size,
position, scale and camera angle, with the base, footprint and outline
exactly as in the original. Snow lying on the top of the head and shoulders,
along any raised parts, and on the ledges of the plinth, a few small icicles
hanging from the plinth edge, frost on the stone, any moss dull and frosted,
any plants become bare frosted stems. Keep the statue and plinth unchanged,
with only a thin dusting of snow at its foot and no snow drifts spreading
beyond it. Same painterly style as the others. No text. The background must
be fully transparent (alpha), with no white, no ground and no shadow around
it.
```

The fountain was asked to freeze: "no running or splashing water, the water
in the basins turned to pale blue ice, the spouts hung with long icicles
where the water used to fall". The bird bath iced over with two robins on its
rim; the bear kept its bees and honey pot; the scarecrow got a knitted scarf
and a robin and kept its pumpkins.

Flowerbeds (each prompt named what the summer flowers become):

```
Next: the WINTER version of this <flowerbed>, at exactly the same size,
position, scale and camera angle, with the base, footprint and outline
exactly as in the original. The summer flowers are gone: <what is left>,
snow along the top of any edging, frost on everything. Keep the bed, its
edging and base unchanged, with only a thin dusting of snow at its foot and
no snow drifts spreading beyond it. Same painterly style as the others. No
text. The background must be fully transparent (alpha), with no white, no
ground and no shadow around it.
```

- flowers: "a soft layer of snow with a few bare frosted seed heads and stems
  standing up through it, and a little clump of white snowdrops".
- flowers_planter: a cap of snow, bare stems and "a sprig of red-berried
  holly", icicles on the sides. The first try failed on ChatGPT's side; Try
  again worked.
- flowers_tulip: "neat rows of little frosted mounds where the bulbs sleep"
  and "a couple of early green bulb shoots".
- flowers_barrel: snow, bare stems, evergreen and red berries, icicles from
  the rim (the wheelbarrow beside it got the same).
- flowers_cart: "bundles of frosted evergreen boughs, pine cones and sprigs of
  red-berried holly".
- flowers_sun: "tall dry brown stalks still standing with drooping seed heads
  capped with snow", with a little bird on one head, the stalks kept to the
  summer height.

# 161 — Snow on the banners → `art/banner{,_pennant,_maypole,_windsock,_bunting,_vane,_kite}_winter.png`  ✅ DONE

A winter picture for each of the seven banner looks, added to WINTER_LOOKS
in game.js. With these every decoration but the flat path tile has its own
winter painting. Same ChatGPT chat, summer picture attached, same
transparent-background line; all seven came back transparent.

```
Next: the WINTER version of this <banner>, at exactly the same size,
position, scale and camera angle, with the pole, base, footprint and outline
exactly as in the original, the pole in exactly the same place. The flag
keeps its colours and still flies the same way, with a light dusting of snow
along its top edge and frost on the cloth, a little cap of snow on the pole's
finial and on its base stones, a few small icicles hanging from the base, any
plants become bare frosted stems. Keep the banner, pole and base unchanged,
with only a thin dusting of snow at its foot and no snow drifts spreading
beyond it. Same painterly style as the others. No text. The background must
be fully transparent (alpha), with no white, no ground and no shadow around
it.
```

"<banner>" was "banner", "pennant on its pole", "windsock", "bunting",
"weather vane" ("the vane points the same way") and "kite on its post". The
maypole's ribbons were kept "frosted and stiff with cold" and its flower
garland was "swapped for a wreath of evergreen and red holly berries". The
bunting kept its lanterns lit; the vane's rose vine went bare.

A banner hangs from its pole (DECOR_AX), and the winter picture is drawn at
the summer one's width, so the pole has to sit at the same fraction of it.
Five matched to within a pixel or two. The kite (185 wide against 196) and
the maypole (192 against 199) came back trimmed tighter; their webps were
padded with clear margins (kite 7 left and 4 right, maypole 7 right) so the
posts line up with summer's. Re-running prep-art on either undoes that.

# 162 — Snow on the finds → `art/find_{stones,orchard,ruin,wreck}_winter.png`  ✅ DONE

A winter picture for each of the four landmarks found on claimed land, added
to WINTER_LOOKS in game.js. A find is drawn the way a building is, scaled to
its 2x2 plot and stood on the summer picture's base (FIT), so nothing else
changed. Same ChatGPT chat, summer picture attached, same transparent-
background line; all four came back transparent.

- find_stones: "Snow lying on the tops and ledges of the stones, frost on the
  lichen, a few small icicles on the overhangs, the grass between them under
  a soft thin layer of snow", "every stone in exactly the same place, shape
  and size as in the original".
- find_orchard: "The fruit trees are bare for winter: no leaves and no fruit,
  their gnarled branches and twigs outlined with snow, a few last frozen
  apples on the ground", "the same shape and size of crown".
- find_ruin: snow along the broken walls, on the chimney and fallen stones,
  "a soft layer of snow on the floor inside the open walls and in the cold
  hearth", icicles from the sills, the ivy bare. "No smoke."
- find_wreck: snow along the gunwales and open ribs and in the bottom of the
  hull, icicles from the ribs, frost on the ropes and the lobster pot, the
  shingle dusted with snow.

Each prompt ended: "Keep the <find> and base unchanged, with only a thin
dusting of snow around its foot and no snow drifts spreading beyond it. Same
painterly style as the others. No text. The background must be fully
transparent (alpha), with no white, no ground and no shadow around it."

# 163 — Snow on the animals and the boats → `art/{sheep,sheep_rest,cow}_winter.png`, `art/boat_{fishing,row,ketch}_winter.png`  ✅ DONE

A winter picture for the animals still out in winter and for the three boats
at sea. The animals are scenery and go in SEASON_LOOK beside the trees and
rocks, with a SCENERY_H to match their summer height (the goat is already the
cow in winter, and the lambs are spring only, so neither needs one). The
boats are SEA_PROPS: drawSeaProps uses `<key>_winter` in winter when it
exists, for the boats only; the still props (rocks, seals and the rest)
keep their one picture. Same ChatGPT chat, summer picture attached; all six
came back transparent and within a few percent of the summer aspect.

- sheep: "a thicker winter fleece with snow resting on its back and head, a
  little frost on its wool", the grass tuft "turned to a small snowy patch",
  "a faint puff of breath at its nose".
- sheep_rest: the same for "the same resting sheep", "the grass it lies on
  turned to a small snowy patch".
- cow: "a dusting of snow along its back and between its horns, a shaggier
  winter coat, frost on its hooves", the snowy patch and the breath.
- boat_fishing: "snow on the deck, the cabin roof, the coiled ropes and the
  furled sail, small icicles along the gunwale and rigging, frost on the
  hull, and keep its lantern glowing warm".
- boat_row: "snow on the seats, the oars and the bow, small icicles along the
  gunwale, and frost on the hull".
- boat_ketch: "the same sails set the same way", snow on the deck, cabin roof
  and "along the tops of the booms and yards, frost on the sail edges, small
  icicles along the rail and rigging".

Each prompt began "Make a winter version of this exact same picture: the
same <subject>, same pose, same angle, same size, same painted style" and
ended "Keep the <subject> the same shape and outline so it lines up with the
original. The background must be fully transparent (alpha), with no white,
no ground (no water, for the boats) and no shadow around it."

# 164 — Snow on the sea props → `art/sea_{rocks,seals,sandbar,buoy}_winter.png`  ✅ DONE

A winter picture for the still props that something can settle on. Each
SEA_PROPS entry with one is marked `winter: true` (the three boats too, which
replaces the boats-only rule of 163); the dolphins, whale and turtle have
none. Same ChatGPT chat, summer picture attached; all four came back
transparent and within a few percent of the summer aspect. The sandbar and
the buoy came back as a pair to choose from: the sandbar's second (more
snow, iced edges), the buoy's first.

- sea_rocks: "snow on the tops and ledges of the rocks, a few small icicles
  hanging from the overhangs, frost on the seaweed".
- sea_seals: "snow on the top and ledges of the rock around the seals, a
  little frost on the seals' whiskers, a few small icicles on the rock's
  edges".
- sea_sandbar: "a thin layer of snow over the sand and on any driftwood or
  rocks, frost on the beach grass, the gulls with their feathers fluffed up
  against the cold".
- sea_buoy: "snow on top of its cage and ledges, small icicles hanging from
  the frame and the bell, frost on the painted float".

Each began "Make a winter version of this exact same picture: the same
<prop>, same angle, same size, same painted style, with the same surf
around <it>", asked to "keep the sea foam at the waterline as it is", and
ended "Keep the <prop> the same shape and outline so it lines up with the
original. The background must be fully transparent (alpha), with no white,
no open water beyond the surf and no shadow around it."

# 165 — Snow on the beacon → `art/beacon_stage{1..5}_winter.png`  ✅ DONE

A winter picture for each of the beacon's five stages; winterArt in game.js
takes `beacon_stage<N>_winter` for the stage it has reached. Stages 1 and 2
are from the ChatGPT chat (its image allowance ran out after them); 3, 4
and 5 from Leonardo, GPT Image 2.5 Flare, Medium, summer stage as the image
reference, on magenta: stage 3 at 1:1 (its original is near square), 4 and
5 at 2:3 (848x1264), 23-24 tokens each. All with the summer picture
attached.

- 1: "the same stone foundation ring", snow on the tops of the stones and
  the steps, "a soft layer of snow inside the ring".
- 2: "the same short stone tower with its arched wooden door", snow along
  the battlements and the steps, icicles from the battlements and the door.
- 3: "this half-built stone lighthouse tower", snow along the battlements,
  every ledge, the iron bands and the sills.
- 4: "this tall stone lighthouse tower with its unlit iron lantern room",
  snow on the lantern roof and the gallery, frost on the glass, "The
  lantern stays unlit."
- 5: "this finished striped stone lighthouse with its glowing lantern",
  the same, and "The lantern still glows warm and bright."

Each asked for "exactly the same size, position, scale and camera angle"
and for "no drifts spreading beyond it".

The summer stages are one set: stageSet shifts them, unscaled, onto one
shared canvas so the tower rises in place, and writes them 800x1496. The
winter ones are not a set to prep-art -- it trims each like any picture
(CAP 1600 so nothing is shrunk first) -- and are then fitted by hand into
the summer frame: each is scaled to the width of its summer stage's body
(rows and columns with 8+ solid pixels, so stray specks are not counted;
never taller than the frame) and stood on the same bottom centre. Re-running
prep-art on them undoes that, and the fit is a few lines to redo: measure
both bodies, scale, composite onto an 800x1496 clear canvas. The three Leonardo stages kept a magenta fringe and
a pink cast in the lantern glass; a despill pass (where red and blue both
exceed green, take the excess off both) made them neutral without touching
the snow or the lit lantern.

# 166 — Winter sea animals → `art/sea_{dolphins,whale,turtle}_winter.png`  ✅ DONE

The last three still sea props, now marked `winter: true` like the rest.
Leonardo, GPT Image 2.5 Flare, Medium, 1:1, 23 tokens each, summer picture
as the image reference, on magenta.

- sea_dolphins: "these two leaping dolphins ... exactly as in the
  original. The sea is cold and dark winter water, a deeper colder
  blue-grey, with a few small chunks of floating ice and thin plates of ice
  in the splash around them, frost-white spray, and a light frost glinting
  on the dolphins' backs and fins."
- sea_whale: "this whale's tail diving into the sea", the same cold sea and
  ice in "the ring of foam around it, the water streaming off the flukes
  turning to frost-white spray and a few small icicles on the tips of the
  flukes."
- sea_turtle: a turtle has no business in a winter sea, so its winter
  picture is something else in the same spot: "Use the reference image only
  for its size, camera angle, painterly game-art style and the shape of its
  ring of sea foam ... the sea turtle has gone south for the winter. In its
  place, a small flat floe of sea ice ... with a soft layer of snow on top,
  frosty blue-white edges and a few little broken plates of ice around it,
  and two gulls standing on the floe with their feathers fluffed up against
  the cold. No turtle and no fish."

Each ended "Same painterly game-art style as the reference. No text.
Isolated on a plain flat solid magenta (#FF00FF) background with nothing
else in the picture."

Magenta showed through the water: between the whale's falling streams and
in pockets of the dolphins' splash that the flood fill from the edges never
reaches, and a despill alone turned those pockets dark grey. So after
prep-art they had a second key over the whole picture -- where red and blue
both exceed green by 110 or more the pixel goes clear, between 30 and 110 it
fades and loses the cast -- and then the despill pass of 165.

# 167 — Fallen leaves on the rock → `art/rock_autumn.png`  ✅ DONE

The first autumn picture for anything but the trees and wildflowers: the
plain rock, in SEASON_LOOK beside its winter one (and for the moss rock too,
since on this island both rock tiles draw the moss rock). Leonardo, GPT Image 2 at Low quality, 1:1, 8 tokens -- what the last
of the month's tokens would buy; at 360px on screen Low is plenty. Summer
rock as the image reference, on magenta.

"Edit the reference image: the AUTUMN version of this rock, at exactly the
same size, position, scale and camera angle, with every stone the same shape
and in the same place as in the original. A scatter of fallen autumn leaves,
orange, red, gold and brown, lying on the top and ledges of the rock and
around its foot, the grass tufts at its base turned golden and dry, and a
small cluster of brown mushrooms by one side. The leaves stay on and right
around the rock, nothing spreading beyond it. Same painterly game-art style
and colours as the reference. No text. Isolated on a plain flat solid
magenta (#FF00FF) background with nothing else in the picture."

The same whole-picture key and despill as 166 after prep-art.

# 168 — Autumn on the moss rock, the stump and the log → `art/rock_moss_autumn.png`, `art/stump_autumn.png`, `art/log_mushroom_autumn.png`  ✅ DONE

ChatGPT, each with its summer picture attached as the reference. The moss
rock gets its own autumn picture now, so it keeps its shape (167 had lent
it the plain rock's). The log is also what the bushes turn into in autumn
(SEASON_ALT), so it shows up all over the island at that time of year.

"Make an autumn version of this mossy rock: the AUTUMN version at exactly
the same size, position, scale and camera angle, every stone the same shape
and in the same place. The moss turned golden-olive, the ferns turned rusty
orange and brown, the heather faded to dusky mauve, a scatter of fallen
autumn leaves (orange, red, gold, brown) on the tops and ledges of the
stones and around their foot, and a small cluster of brown mushrooms by one
side. Nothing spreading beyond the rocks. Same painterly game-art style. No
text. Isolated on a plain flat solid magenta (#FF00FF) background with
nothing else in the picture."

The stump: "...the stump and its roots the same shape and in the same
place. Fallen autumn leaves (orange, red, gold, brown) lying on the cut top
and gathered around the roots, any grass or plants at its base turned golden
and dry, a few brown bracket fungi or small mushrooms on the bark. Nothing
spreading beyond the stump..." and the log: "...the log and its mushrooms
the same shape and in the same place. Fallen autumn leaves lying along the
top of the log and drifted against its sides, any moss turned golden-olive,
any grass or plants around it turned golden and dry. Nothing spreading
beyond the log..." -- the rest as the rock.

After prep-art the log had a magenta pocket between the toadstools that the
edge flood never reached; the whole-picture key of 166 cleared it (no
despill, which would have greyed the rock's heather).

# 169 — Autumn on the pine, the spruce and the sheep → `art/tree_pine_autumn.png`, `art/tree_spruce_autumn.png`, `art/sheep_autumn.png`  ✅ DONE

ChatGPT, each with its summer picture attached. The evergreens had only the
seasonal wash in autumn until now; with a picture of their own they lose it.

"Make an autumn version of this spruce tree: the AUTUMN version at exactly
the same size, position, scale and camera angle, the tree the same shape and
in the same place. It stays an evergreen: the branches are only green
needles (a slightly deeper, cooler green) and a few brown cones, with NO
leaves in the branches. Fallen orange, red and gold leaves and brown needles
lie only on the ground around its foot, and any grass at its base is turned
golden and dry. Nothing spreading beyond the tree's base. Same painterly
game-art style. No text. Isolated on a plain flat solid magenta (#FF00FF)
background with nothing else in the picture."

The pine was asked the same way at first but without the "NO leaves in the
branches", and came back hung with leaves like baubles on a Christmas tree;
a follow-up -- "The same autumn pine again, but with NO leaves in the
branches at all -- the branches are only green needles and a few brown pine
cones. The fallen orange, red and gold leaves lie only on the ground around
its foot..." -- gave the one used.

The sheep: "Make an autumn version of these sheep: ... every sheep the same
pose and in the same place. Their fleece grown a little thicker and fluffier
for the cold months, a few fallen orange, red and gold leaves caught in the
wool and lying on the ground at their feet, and the grass tufts under them
turned golden and dry. Nothing spreading beyond the flock..."

Magenta pockets between the spruce's branches and the sheep's legs, so all
three had the whole-picture key of 166 after prep-art.

# 170 — Autumn on the resting sheep and the cow → `art/sheep_rest_autumn.png`, `art/cow_autumn.png`  ✅ DONE

ChatGPT, summer pictures attached, worded as the grazing sheep of 169. In
autumn the goat tiles are the cow (SEASON_ALT), so this is every animal on
the island in its autumn coat.

"Make an autumn version of these resting sheep: the AUTUMN version at
exactly the same size, position, scale and camera angle, every sheep the
same pose and in the same place. Their fleece grown a little thicker and
fluffier for the cold months, a few fallen orange, red and gold leaves
caught in the wool and lying on the ground around them, and the grass under
them turned golden and dry. Nothing spreading beyond the sheep. Same
painterly game-art style. No text. Isolated on a plain flat solid magenta
(#FF00FF) background with nothing else in the picture."

"Make an autumn version of this cow: ... the cow the same pose and in the
same place with the same markings. Her coat a little thicker for the cold
months, a couple of fallen orange and gold leaves on her back, fallen
orange, red and gold leaves lying on the ground at her feet, and the grass
under her turned golden and dry. Nothing spreading beyond the cow..."

The whole-picture key of 166 after prep-art, for the magenta between the
cow's legs.

# 171 — Spring on the trees and the moss rock → `art/tree_{oak,birch,willow,poplar,pine,spruce}_spring.png`, `art/rock_moss_spring.png`  ✅ DONE

ChatGPT, each with its summer picture attached. Until now spring had its own
pictures only for the wildflowers and the cherry (whose base picture is the
blossom); every other tree wore the summer picture under the seasonal wash.

"Make a spring version of this oak tree: the SPRING version at exactly the
same size, position, scale and camera angle, the trunk and the branches the
same shape and in the same place. The canopy in fresh new spring leaves, a
lighter, brighter, yellow-green than summer and a little less dense so a
few branches show through, with small pale catkins hanging here and there,
and a few small white and yellow spring flowers (daisies, primroses) in
fresh green grass at its foot. Nothing spreading beyond the tree's base.
Same painterly game-art style. No text. Isolated on a plain flat solid
magenta (#FF00FF) background with nothing else in the picture."

The birch the same with "the white trunk" and "slender pale catkins"; the
willow with "the trunk and the drooping branches" and "soft pale yellow
catkins along them" (ChatGPT offered two; the one closer to the summer
shape was picked); the poplar with "the tall narrow crown" and "a few
reddish catkins".

The evergreens: "...It stays an evergreen, but every branch tip has bright
fresh light-green new growth (soft new shoots and candles) against the
darker older needles, and a few small white and yellow spring flowers
(daisies, primroses) in fresh green grass at its foot. NO leaves or flowers
in the branches..." (the lesson of the autumn pine in 169).

The moss rock: "...The moss a fresh bright green, the ferns as young curled
fiddleheads just unrolling in pale green, and in place of the heather small
spring flowers growing between the stones: primroses, a few bluebells and
white wood anemones..."

All seven had the whole-picture key of 166 after prep-art, for the magenta
seen through the canopies.

# 172 — Spring on the stump, the log and the bush → `art/stump_spring.png`, `art/log_mushroom_spring.png`, `art/bush_spring.png`  ✅ DONE

ChatGPT, summer pictures attached. The bush in its summer picture is in red
berry, which read wrong in spring; in spring it is now a hawthorn in
blossom (SEASON_ALT, as the bush already turns into the hydrangea, the log
and the snowman through the year).

"Make a spring version of this tree stump: the SPRING version at exactly the
same size, position, scale and camera angle, the stump and its roots the
same shape and in the same place. A few fresh green shoots with small new
leaves sprouting from the side of the stump, the moss on it a fresh bright
green, and small spring flowers (primroses, white wood anemones, a few
violets) in fresh green grass around the roots. Nothing spreading beyond the
stump. Same painterly game-art style. No text. Isolated on a plain flat
solid magenta (#FF00FF) background with nothing else in the picture."

The log: "...The moss on it a fresh bright green, the fern beside it as
young curled fiddleheads just unrolling in pale green, only a couple of the
small brown mushrooms left (no red toadstools), and small spring flowers
(primroses, bluebells, white wood anemones) growing along and beside the
log..." The bush: "...It is a hawthorn in full spring blossom: fresh bright
green leaves covered in clusters of small creamy-white flowers, with a few
white petals fallen on the grass at its foot, and a couple of primroses
there..."

The whole-picture key of 166 after prep-art.

# 173 — Autumn on the houses, the hall and the storehouses → `art/{house,house_stone,house_thatch,house_fisher,house_baker,house_weaver,house_potter,house_bee,house_oak,hall,hall_2,hall_3,store,store_granary,store_barn,store_tithe,store_staddle,store_cellar}_autumn.png`  ✅ DONE

The buildings had only the seasonal wash in autumn. As the snow did for
winter (152, 153), an autumn picture per look, in AUTUMN_LOOKS in game.js,
returned by winterArt() in autumn and hung from the summer picture's base,
not washed. ChatGPT, summer picture attached, one prompt with the name and
the harvest by the door changed:

```
Make an autumn version of this <cottage>: the AUTUMN version at exactly the
same size, position, scale and camera angle, with the base and footprint
exactly as in the original and the walls, door, windows and roof the same
shape. Fallen orange, red and gold leaves scattered on the roof and gathered
along the foot of the walls, any creeper or climbing plant on the walls
turned red and orange, any garden plants around it turned golden and
russet, and a few small pumpkins and a basket of apples by the door. No
chimney smoke. No leaves spreading beyond the building's base. Same
painterly game-art style. No text. Isolated on a plain flat solid magenta
(#FF00FF) background with nothing else in the picture.
```

Names: "cottage", "stone house", "thatched cottage", "fisherman's house"
(nets and barrels kept), "baker's house" (sign kept, "No chimney or oven
smoke"), "weaver's house", "potter's house" (kiln and pots), "beekeeper's
house" (hives, "No bees flying"; ChatGPT offered two and the one showing
the whole building was picked), "oak-framed house built into an oak tree"
(the oak's leaves russet and gold); "town hall", "larger town hall", "grand
town hall" (sheaves of wheat with the pumpkins); "storehouse", "granary",
"barn" (hay bales), "tithe barn", "granary on staddle stones", "root
cellar" (sacks of potatoes). "No smoke" throughout, so the top of the trim
stays where the summer picture has it.

The whole-picture key of 166 after prep-art, for the magenta in the gaps
between eaves, stacks and barrels.

# 174 — Autumn on the mills and the market stalls → `art/{mill,mill_post,mill_smock,mill_water,mill_tower,mill_cider,market,market_hall,market_fish,market_cheese,market_fruit,market_flower}_autumn.png`  ✅ DONE
Added to winterArt()'s AUTUMN_LOOKS like 173. The same prompt as 173 with
the name changed for the mills ("windmill", "post mill", "smock mill",
"watermill", "tower mill", "cider mill" -- apples and barrels; ChatGPT
offered two and the second was picked), and for the stalls:

```
Make an autumn version of this <market stall>: the AUTUMN version at
exactly the same size, position, scale and camera angle, with the base and
footprint exactly as in the original and the stall, its awning and
everything around it the same shape and in the same place. Fallen orange,
red and gold leaves scattered on the awning and gathered around its foot,
<the goods>, and a few small pumpkins and baskets of apples stacked beside
it. No leaves spreading beyond the base. Same painterly game-art style. No
text. Isolated on a plain flat solid magenta (#FF00FF) background with
nothing else in the picture.
```

Goods: the market's turned to autumn produce (pumpkins, apples, pears,
nuts, honey); the market hall with the harvest piled under it; the fish
stall kept its fish with a lantern lit; the cheese stall with honey jars;
the fruit stall's fruit now apples, pears, plums, grapes and quinces; the
flower stall's now sunflowers, chrysanthemums, asters and seed heads. The
whole-picture key of 166 after prep-art.

# 175 — Autumn on the lumber camps and the wells → `art/{lumber,lumber_pit,lumber_cabin,lumber_saw,lumber_charcoal,lumber_cart,well,well_iron,well_thatch,well_pump,well_wish,well_wheel}_autumn.png`  ✅ DONE
Added to AUTUMN_LOOKS like 173. ChatGPT, summer picture attached:

```
Make an autumn version of this <lumber camp>: the AUTUMN version at
exactly the same size, position, scale and camera angle, with the base and
footprint exactly as in the original and the buildings, log piles and
everything around them the same shape and in the same place. Fallen
orange, red and gold leaves scattered on the roof and the log piles and
gathered around the foot, any trees or bushes on it turned russet, orange
and gold, and a few small pumpkins and mushrooms by the logs. No smoke. No
leaves spreading beyond the base. Same painterly game-art style. No text.
Isolated on a plain flat solid magenta (#FF00FF) background with nothing
else in the picture.
```

Names: "lumber camp", "saw pit", "woodcutter's cabin" ("No chimney
smoke"), "sawmill", "charcoal burner's camp" (no "No smoke" -- the mound
keeps its smoke, as in summer), "timber yard". The wells the same way with
"the well, its roof, bucket and everything around it", leaves on the roof
and the rim, "a small pumpkin and a few mushrooms by the base", and for the
pump and the wishing well "a few leaves floating in the water": "well",
"iron-framed well", "thatched well", "water pump", "wishing well", "wheel
well". Caps 800 and 400 as their summer pictures; the whole-picture key of
166 after prep-art.

# 176 — Autumn on the farms and the quarries → `art/{farm,farm_veg,farm_barley,farm_pumpkin,farm_vine,farm_orchard,farm_hops,quarry,quarry_pit,quarry_slate,quarry_marble,quarry_sand,quarry_clay}_autumn.png`  ✅ DONE
Added to AUTUMN_LOOKS like 173. ChatGPT, summer picture attached; the farms
at harvest:

```
Make an autumn version of this <farm>: the AUTUMN version at exactly the
same size, position, scale and camera angle, with the base and footprint
exactly as in the original and the fences, <field> and everything on it the
same shape and in the same place. Harvest time: <the crop>, fallen orange,
red and gold leaves gathered along the fences, <the harvest>. No leaves
spreading beyond the base. Same painterly game-art style. No text.
Isolated on a plain flat solid magenta (#FF00FF) background with nothing
else in the picture.
```

Crops: wheat ripe and part cut into sheaves on stubble; the vegetable
garden's beds of pumpkins, squash, cabbages and leeks; barley pale gold in
stooks; big pumpkins among withering vines; the vineyard's leaves red and
gold with ripe purple grapes and a tub of them; the orchard's trees
orange and red, laden with apples and pears, windfalls on the grass; the
hop bines yellowing with ripe cones in sacks. The quarries with "the rock
faces, stone blocks, crane, tools and everything on it", "leaves blown
into the corners, on the ledges and gathered around the foot, any grass
gone golden", and a pumpkin and mushrooms by the stones: "quarry",
"quarry pit", "slate quarry", "marble quarry", "sand pit", "clay pit".

The whole-picture key of 166 after prep-art, except the vineyard: its
purple grapes sit inside the key's fade band (min(r,b)-g) and came out
grey, so it has prep-art's flat-background key only.

# 177 — Autumn on the hedges, fences and benches → `art/hedge{,_topiary,_lavender,_wild,_holly,_beech}_autumn.png`, `art/fence{,_picket,_stone,_wattle,_rope,_iron}_autumn.png`, `art/bench{,_stone,_rose,_tree,_swing}_autumn.png`  ✅ DONE

The six hedges, the six fences and five of the seven benches, added to
AUTUMN_LOOKS in game.js; drawDecor hangs them at the summer picture's width
as it does the snow. The picnic table and the campfire bench have none yet
and stay as in summer. Leonardo, GPT Image 2 at Low quality, 1:1, 8 tokens
each -- the 136 tokens left this month (ChatGPT's image allowance was spent
on 173-176). Summer picture flattened onto magenta with a 40px margin as the
image reference. A Lucid Origin try first (unlimited on the plan, content
reference) came back a leafy cube on a pink wash, nothing like the hedge.

All one template:

```
Edit the reference image: the AUTUMN version of this <thing>, at exactly the
same size, position, scale and camera angle, with the base, footprint and
outline exactly as in the original. <autumn>. Keep it unchanged otherwise,
with nothing spreading beyond it. Same painterly game-art style as the
reference. No text. Isolated on a plain flat solid magenta (#FF00FF)
background with nothing else in the picture.
```

- Hedges: garden, topiary and beech "turning warm autumn colours" with
  fallen leaves on top and at the foot; the lavender "finished flowering ...
  dry grey-brown seed heads"; the wild hedgerow hung with "red rose hips,
  dark red haws and a few purple-black blackberries"; the holly "dark glossy
  evergreen, now heavy with bright clusters of red holly berries".
- Fences: "fallen autumn leaves ... lying along the top of the rails, caught
  at the foot of each post", the grass at the foot "golden and dry"; flowers
  on the picket and wattle turned to autumn blooms and seed heads, the
  roses on the iron railings to red creeper; the dry-stone wall asked for
  "no ground and no shadow", after its winter one came back on a ground.
- Benches: leaves on the seat and around the feet; the rose arbour "hung
  with plump red rose hips"; the tree in the round bench "its leaves turned
  autumn gold, orange and russet red".

prep-art, then the magenta key of 166 over the whole picture; the purple
lavender stalks and the hips came through it unharmed.

# 178 — Autumn on the rest of the decorations, from video → `art/bench_{picnic,campfire}_autumn.png`, `art/lamp{,_bracket,_stone,_double,_ship,_basket,_crook}_autumn.png`, `art/statue{,_knight,_fisher,_fountain,_dragon,_birdbath,_bear,_scarecrow}_autumn.png`, `art/flowers{,_planter,_tulip,_barrel,_cart,_sun}_autumn.png`, `art/banner{,_pennant,_maypole,_windsock,_bunting,_vane,_kite}_autumn.png`  ✅ DONE

The last 30 decoration looks, so every bench, lamp, statue, flowerbed and
banner is now in AUTUMN_LOOKS with the hedges and fences. Made with no tokens
at all: the plan's unlimited generations cover MiniMax H3 video at 480p, and
none of the image models that can edit a picture (the unlimited ones -- Lucid,
FLUX Dev, Phoenix -- only take a "content reference", and FLUX Dev at HIGH
strength gave a flat cartoon picnic table on a salmon wash). So each autumn
picture is the LAST FRAME of a 6 s MiniMax H3 clip (Turbo, 480p, 9:16 for the
tall ones, 16:9 for flowerbeds and benches) whose start frame is the summer
picture: the keyed .webp upscaled (lanczos) to fill 1400x820 or 860x1450 on a
flat #FF00FF 1920x1080 / 1080x1920 canvas. The clip keeps the object, the
painting and the camera; the prompt only says what autumn does to it.

```
Static camera, no zoom, no pan, no camera movement at all. The <thing> stays
perfectly still in exactly the same place and size. Autumn arrives: <what
changes>. No leaves land on the ground beyond it. By the end nothing is
moving. The background stays a perfectly flat solid magenta colour the whole
time, with no ground, no shadow, no light changes. Painterly game-art style
kept exactly, no text.
```

- Lamps: leaves "settle on the lamp head and on its stone base", creepers
  turn red, hanging baskets turn to "orange, gold and rust autumn flowers",
  "the lamp keeps its warm glow".
- Statues: leaves on shoulders and plinth steps, moss turned golden; a
  pumpkin by the harvest woman, leaves floating in the fountain and the
  birdbath, more pumpkins round the scarecrow and its sunflower gone to seed.
- Flowerbeds: chrysanthemums, asters and dahlias in place of the summer
  flowers; the sunflowers "heavy and droop with big dark seed heads"; small
  pumpkins in the barrow and the cart.
- Banners: garlands of autumn leaves and wheat tied round the poles, the
  maypole's crown a wreath of leaves and apples, the bunting's paper lanterns
  "small carved glowing pumpkin lanterns".
- Picnic table: apples for strawberries, cider for lemonade, two pumpkins,
  "the cat stays asleep" (the first try, without "No leaves land on the
  ground", laid a carpet of leaves twice the table's width; the second is
  used). Campfire: leaves on the log seats, pumpkins and roasting apples.

The last frame (ffmpeg -sseof -0.15) then prep-art (480p frames are small,
so the caps of the winter ones never shrink much), the magenta key of 166 --
the lamp glow came through it gold, not pink -- and one new step: a few
leaves still blew clear of the object despite the prompt, and drawDecor fits
the picture to the summer one's width, so stray leaves would shrink the
object. Every alpha island under 2% of the largest is dropped and the picture
re-trimmed; leaves touching the base stay.

# 179 — Autumn on the finds → `art/find_{stones,orchard,ruin,wreck}_autumn.png`  ✅ DONE

The old stones, the orchard, the ruined cottage and the wreck found on
claimed land, added to AUTUMN_LOOKS like their winter ones. Made as 178: the
last frame of a free MiniMax H3 480p 16:9 clip started on the summer
picture. The orchard's trees "keep their trunk and crown shape" with gold,
orange and russet leaves and "heavy with ripe red and yellow apples"; the
ruin's ivy "turns deep red and orange" with two wild pumpkins by the wall;
the wreck gets leaves in the hull and dry beach grass among the stones.

The standing stones took three goes. "Ring of ancient standing stones on its
grassy mound" (there is no mound) grew a golden mound under them and shrank
the stones; describing them as "five grey standing stones ... each on its
own small tuft of grass" kept them but coated them bright orange ("the moss
turns rusty orange"); the third asked for the stones to "stay grey with
their green-grey moss, nothing covers them" and only a few leaves on top.

# 180 — Autumn on the beacon → `art/beacon_stage{1..5}_autumn.png`  ✅ DONE

Each of the beacon's five stages in autumn; winterArt takes
`beacon_stage<N>_autumn` for the stage reached, as it does the winter ones
(165). Made as 178: the last frame of a free MiniMax H3 480p clip started on
the summer stage (stages 1-2 at 16:9, 3-5 at 9:16). Every stage: leaves
settle "on the tops of the stones, the steps and the ledges", the grass at
its foot turns golden, and "a little red creeper climbs the lower stones";
stage 2 adds two small pumpkins by the door; stages 4 and 5 put the leaves on
the gallery and the window ledges instead.

Stage 4 took two goes: the first lit the lantern, as if autumn had finished
the tower. The second called the lantern room "EMPTY and DARK", and that
one is kept.

Processed as 165: prep-art (CAP 1600), magenta keyed, specks dropped,
despilled, then fitted into the 800x1496 summer stage frame on the summer
body's bottom centre. Unlike the snow, the leaf skirt at the foot widens the
base, so fitting to the summer body's WIDTH shrank the towers to about 82%
of their summer height. These are fitted to its HEIGHT instead (never wider
than the frame, and shifted in where the centred skirt would cross its
edge), so the tower is the same height in every season.

# 181 — Spring on the buildings → `art/<look>_spring.png` for every house, hall, store, mill, market, lumber camp, well, farm and quarry look  ✅ DONE

All 55 building looks in spring, in a new SPRING_LOOKS set that winterArt
reads in spring the way it reads AUTUMN_LOOKS in autumn (hung from the
summer picture's base, drawn at the summer width). Made as 178, free: the
last frame of a MiniMax H3 480p clip started on the summer picture on flat
magenta (16:9, or 9:16 for the tall halls, mills and wells), with the usual
"static camera ... stays perfectly still in exactly the same place, shape
and size" and "Nothing spreads beyond its base."

- Houses, halls: "the window boxes fill with red and yellow tulips and
  daffodils, fresh bright green grass and a few clumps of daffodils and
  primroses appear right at its base, and a few pink and white blossom
  petals drift down and rest on the roof."
- Stores, mills, markets, lumber camps, wells: the same, with tubs of
  daffodils and tulips by the doors and bluebells at the foot; the stores
  get "a few sacks of seed ... stacked ready for sowing".
- Farms: "the field is freshly ploughed and sown with neat rows of tiny
  bright green seedlings", with each crop's own young growth (green barley,
  vines in new leaf, the orchard in blossom, hop bines climbing).
- Quarries: fresh grass tufts and little white and yellow wildflowers on
  the ledges.

The camps came out mossier than asked (moss on the log piles and roofs);
kept, as it reads as spring.

# 182 — Spring on the decorations, the finds and the beacon → `art/<look>_spring.png`, `art/beacon_stage{1..5}_spring.png`  ✅ DONE (not the orchard)

Every hedge, fence, bench, lamp, statue, flowerbed and banner look, three of
the four finds and the five beacon stages in spring, all added to
SPRING_LOOKS (the beacon by stage, as in autumn and winter). Made as 181,
free, from the summer pictures. The hedge, fence and bench start frames were
made fresh: the keyed summer picture upscaled (lanczos) to fit 1400x820 on a
flat magenta 1920x1080, or 860x1450 on 1080x1920 when it is tall.

- Hedges: "fresh bright green new leaves dotted with small white and pink
  blossom", daffodils, primroses and bluebells at the foot.
- Fences, lamps: the same flowers along the foot, and "a little fresh green
  ivy with tiny white flowers" up a post; the lamps "stay unlit" (the
  bracket lamp lit itself anyway; kept).
- Benches: flowers round the feet, blossom petals on the seat; the rose
  arch in fresh leaf with rosebuds, the bench tree in blossom.
- Statues: flowers round the plinth, petals on top, "The stone stays grey
  and clean."
- Flowerbeds: "every plant is in fresh spring bloom", with extra daffodils,
  primroses and bluebells; the sunflowers are young plants just budding.
- Banners: flowers at the foot of the pole and "a small garland of white and
  pink blossom" round it.
- Finds: the stones keep their grey; the ruin's ivy turns fresh green; the
  wreck gets fresh beach grass.
- Beacon: flowers at the foot and fresh ivy up the lower stones; stage 4's
  lantern "EMPTY and DARK", stage 5's still glowing. Fitted by height as in
  180, but the spring skirt is wider still, so stages 1-5 hit the 800px frame
  width and stage 5 stands at about 90% of its summer height.

The orchard came back as a carpet of blossoming bushes with no trunks and
is left out (summer picture in spring). A retry that insisted every
tree "keeps exactly its own brown trunk, branches and round crown shape"
got trunks back but still merged the rows into one clump of four trees.

# 183 — Autumn and spring at sea, spring in the fields, and the orchard → `art/{boat_fishing,boat_row,boat_ketch,sea_rocks,sea_seals,sea_sandbar}_{autumn,spring}.png`, `art/{sheep,cow,goat,rock,find_orchard}_spring.png`  ✅ DONE

Made as 181, free. The three boats, the sea stacks, the seals and the
sandbar get `autumn` and `spring` flags in SEA_PROPS, and drawSeaProps takes
`<key>_<season>` for whichever season is flagged (it took only winter
before). The whale, dolphins, turtle and buoy stay the same all year. The
sheep, cow, goat and plain rock gain spring looks in SEASON_LOOK, with
SCENERY_H heights matching their summer ones. The sea pictures carry their own
surf, so those prompts end "The water and white foam around it stay exactly
the same."

- Autumn boats: leaves on the deck, with pumpkins and a basket of red
  apples stowed among the gear (the leaves it also blew across the water were
  dropped as specks).
- Autumn stacks, seals and sandbar: the moss "turns rusty orange and gold",
  brown seaweed and kelp. The stacks came out mostly orange; kept.
- Spring boats: a blossom garland on the fishing boat's rail and daffodils
  in a jar, a basket of daffodils in the rowing boat, bunting and a blossom
  garland on the ketch.
- Spring stacks and sandbar: "pink sea thrift" and fresh moss and beach
  grass. The seals asked for "a small fluffy white seal pup" and got two.
- Sheep, cow, goat: "a small garland of white daisies and yellow primroses
  ... round its neck"; the sheep lifted its head.
- Rock: moss and primroses in its cracks.

The orchard (182 left it out): the third try asked that "almost nothing
changes. Every tree, trunk, branch and leaf stays exactly where it is. Only
tiny pale pink blossom dots appear" -- and kept the trees.

# 184 — Lit windows after dark
→ `art/<look>_glow.webp` for every house, the three halls, five stores, six mills, two markets, the woodcutter's cabin and the sawmill (27 looks) ✅ DONE

Free, made like 181 but with a night clip: the summer picture as the start frame and "Static camera, no zoom, no pan, no camera movement at all. The <subject> stays perfectly still in exactly the same place, shape, size, colours and daylight lighting. Evening comes inside: a warm golden lamplight glows from inside every window, as if candles and lanterns have been lit indoors. Only the window panes change; the walls, roof, ground and everything else stay exactly the same colours and brightness. By the end nothing is moving. The background stays a perfectly flat solid magenta colour the whole time, with no ground, no shadow, no light changes. Painterly game-art style kept exactly, no text." (MiniMax H3, 480p).

The glow is not a picture of the building. It is the light alone: the clip's last frame minus its first, where it got brighter, warmer and redder, mapped back onto the summer picture's own pixels and softened a little. So it lines up with the summer art exactly and carries no wall or roof of its own. Looks whose light is small came out fine too; the market stalls and the woodcutters' sheds light their lanterns under the roof instead of windows. The plain house picked up a couple of extra lit panes on a side wall, which were kept.

drawWindowGlow lays it on in drawBuilding, right after the building, so a house in front still hides the windows behind it, at the night's strength, once over and once more added on so the panes shine. Seasonal pictures hang from the summer frame's base at its width, so the glow uses that frame whatever season is drawn. Building sites (t < 1) stay dark.

# 185 — The lighthouse lit at night
→ `art/beacon_stage4_glow.webp`, `art/beacon_stage5_glow.webp` ✅ DONE

Made as 184 from the beacon's summer stages; stage 5's prompt adds "and the great lamp in the lantern room at the top blazes with a bright warm golden light" and lets the lantern glass change as well as the panes. Stages 2 and 3 were made too and dropped: the light came out off the tower, and the stump of 2 swung its door open. glowKey picks the beacon's glow by stage, from 4 up.

Once the beacon is finished, drawBeam turns a soft beam from the lamp after dark, once every 14 s, laid flat on the ground at the island's 2:1 so it sweeps across the sea, with a halo round the lantern. It goes in the lamp pass, after the night wash, so it is not dimmed. With reduced motion the beam holds still.

# 186 — Lights at sea, the resting sheep in spring, and the season in the air
→ `art/{boat_fishing,boat_ketch,sea_buoy}_glow.webp`, `art/sheep_rest_spring.png` ✅ DONE

Made as 184, free. The boats: "... stays perfectly still in exactly the same place, shape, size, colours and daylight lighting. Night falls at sea: a small ship's lantern hanging on the boat is lit and glows a warm golden light, and a soft warm lamplight shows from any cabin window. Only the lantern and windows change; the hull, sails, deck and everything else stay exactly the same colours and brightness." Both clips darkened the whole scene as well; the glow keeps only what got brighter and warmer, so that went. The buoy: "a warm golden signal lamp inside the iron cage around the bell is lit and glows brightly". The rowboat has nothing aboard to light and was left dark. SEA_PROPS marks the three with `glow`, and seaGlow lays each on the summer frame at the prop's height. The resting sheep took the standing flock's daisy-and-primrose garland (as 183).

The beacon's glows are `beacon_glow<n>`, not `beacon_stage<n>_glow`: the art checks read any `_stage` key as a frame of the beacon's set, and the glows do not stand on its ground line. Every glow is now one image, added on, and the game counts them (glowsDrawn) so the frame-cost check allows exactly those and nothing more.

Weather, drawn rather than made: drawAmbient scatters snow in winter, tumbling leaves in autumn and blossom petals in spring across the screen, and fireflies blink on summer nights. Each mote is worked out from the clock and its number, so nothing is stored; off with reduced motion.

# 187 — The campfire after dark, lanterns in hand, and the day sky
→ `art/bench_campfire_glow.webp` ✅ DONE

Made as 184, free: "... Evening comes: the campfire is lit and small warm golden flames and glowing embers burn in the fire ring, casting a soft warm glow on the stones beside it. Only the fire changes; the bench, stones and everything else stay exactly the same colours and brightness." The summer picture already has a small fire, so the glow is the fire burning up and the light on the ring. decorGlow lays it on the bench_campfire look, on the summer frame, the one decoration with a light of its own.

Drawn, not made: everyone walking after dark carries a lantern -- a small warm pool at the hand on the side they face, flickering on its own beat -- in the lamp pass with the lamps; and by day the shadows of three clouds slide across island and sea and a gull crosses now and then, both fading as the light goes and off with reduced motion.

# 188 — A fire in the ruin's hearth, and rainy days
→ `art/find_ruin_glow.webp` ✅ DONE

Made as 184, free: "... Evening comes: a small warm fire is lit in the old stone hearth, with golden flames and glowing embers, and its warm light falls softly on the stones just around it. Only the hearth changes; the walls, ivy, stones and everything else stay exactly the same colours and brightness." find_ruin joins GLOW_LOOKS; the finds are drawn as buildings, so it lights like a window does. The wreck was left dark -- a lantern on an abandoned hull reads as somebody living there.

Drawn: some days are wet -- a quarter in spring and autumn, one in ten in summer, none in winter -- picked from the day's number so there is nothing to store, coming in and going out over the first and last tenth of the day. Slanted streaks, the light a little grey, and the cloud shadows and gulls thin out under it.

# 189 — The sound of the air
No art. Under the tones there are now two quiet beds and an insect: the sea murmuring at the cliffs (low-passed noise, rising and falling slowly), rain hissing on a wet day (band-passed noise, following the shower in and out), and a cricket's three-note chirp now and then on a summer night. The beds are one looped buffer of noise each, so they make no oscillators; both go to nothing when muted or hidden, and the crickets are ordinary tones that stand down by tone()'s own rule.

# 190 — Sun on the water
No art. By day small glints wink on and off across the open sea: a short flash each, then gone and lit again somewhere else, brightest at noon, fading to nothing at dusk and under rain. They are scattered over the part of the sea in view at a fixed size on screen, placed from their number and the clock so nothing is stored, and drawn before the island so the land covers any that fall on it. Off with reduced motion.

# 191 — Moonlight on the water, and morning mist
No art. After dark the glints come back silver and half as many, as moonlight -- and the moon waxes and wanes over sixteen game days, so some nights the sea is bright with it and on a new moon it is dark. Around sunrise a soft white mist lies in drifting banks over island and sea and lifts as the sun climbs: thickest in autumn, then spring and winter, thin in summer. Both are worked out from the clock, store nothing, and are off with reduced motion.

# 192 — A rainbow after rain, and falling stars
No art. The morning after a wet day, once the mist has gone, a rainbow stands over the island for a while and fades -- which mornings follows from the same day's-number draw that makes the rain, so it stores nothing. On clear nights a star falls now and then: a short bright streak across the dark, a few a night. Both off with reduced motion.

# 193 — Butterflies, and fish leaping
No art. On fine spring and summer days a few butterflies wander loose loops over the island, wings opening and closing; their loops are laid on the island's diamond and their size follows the zoom, so they stay over the grass. By day and dusk a fish now and then leaps from the sea and drops back, leaving rings spreading on the water -- placed like the glints, in the sea in view, and drawn before the island so none come up through the land. Worked out from the clock, nothing stored, off with reduced motion.

Fixed alongside: the delivery pops ("+25 🪵") are now drawn over the lamps instead of under the night wash, on an outline twice as wide. The ink check measured 3.2 to 3.7 at midnight in some runs, over a warm lit patch -- probably a carried lantern (187), though the cause was never pinned down and the commit before passed every run. Now 13.

# 194 — Geese going over, and bats at dusk
No art. In spring and autumn a long V of geese crosses the screen every minute and a half or so, one way in spring and back the other in autumn. For a little while after sunset in summer and autumn, six bats flicker on quick, jinking paths and are gone once it is properly night. Worked out from the clock, nothing stored, none in the rain, off with reduced motion.

# 195 — Thunderstorms
No art. Two in five wet days turn to storms: at most one flash every twenty-three seconds, a jagged bolt from the top of the view and a soft pale flash over everything, and one to three seconds later a low roll of thunder (the beds' noise, low-passed hard). The flash is held to a fifth of full white for comfort; the light and the sound are both off with reduced motion, and the thunder stands down when muted or hidden. Which days and when are worked out from the clock, so nothing is stored.

# 196 — Smoke from the chimneys
No art. A thread of soft puffs rises from each chimney and bends away as it climbs: thickest in winter, then autumn and spring, a wisp in summer. CHIMNEY holds where the stack is on six of the house looks and all three halls, as a share of the summer picture. The baker and the potter have smoke painted in already, and the oak has no chimney. Drawn in the world before the night wash, so it dims with everything else; worked out from the clock, nothing stored, off with reduced motion.

# 197 — Sparks from the campfire
No art. After dark eight sparks climb from the campfire, waver and wink out, starting where the light is brightest in its glow picture (187). Added on, in the decoration's own pass, so a building in front still hides them. Worked out from the clock, nothing stored, off with reduced motion.

# 198 — The northern lights
No art. One winter night in three, by the day's number, curtains of green going to violet hang across the top of the view, three layers of thin columns that brighten and fade as the folds drift. They come up as the night deepens. Added on after the night wash; worked out from the clock, nothing stored, off with reduced motion.

# 199 — Birdsong, gulls and an owl
No art. Far off and now and then: a few quick notes of birdsong around sunrise (not in winter), the falling cry of gulls through the day, and an owl's two hoots in the dead of night. Nothing calls in the rain. They are ordinary tones, so they stand down when muted or hidden by tone()'s own rule.

# 200 — Rain on the sea, and shafts of low sun
No art. On wet days rings open on the open water where the drops land, thicker as the shower thickens. In dry weather at sunrise and sunset five slanting bars of gold come down the view, from the left in the morning and the right in the evening, breathing slowly. Worked out from the clock, nothing stored, off with reduced motion.

# 201 — Fireworks at the full moon
No art. The night of the full moon, one night in sixteen, is the village's festival: three fireworks going at a time over the island, each a shell climbing and a burst of coloured sparks falling away, with a soft thud as it opens. Dry nights only. Worked out from the clock, nothing stored; off with reduced motion, and the thuds stand down when muted or hidden.

# 202 — The hall bell and the doves
No art. At noon each day the hall bell strikes three slow strokes, and seven white doves go up from the roof at the noise, wheel round for about twenty seconds and come back down. The doves stay in out of the rain and with reduced motion on; the bell rings regardless unless the game is muted or out of sight.

# 203 — Umbrellas in the rain
No art. Once the rain has properly started every villager puts up an umbrella, each keeping a colour of their own, and takes it down again as the shower ends. What they carry rides above it.

# 204 — The autumn wind
No art. In autumn, on dry days, a gust every three-quarters of a minute carries a whirl of thirty leaves across the view, tumbling round a centre that travels, for about eleven seconds.

# 205 — A whale off the island
No art. Every seventy seconds, except in the dead of night, a whale comes up on the open water to one side of the island: the long back breaking the surface, two plumes of spray, and the flukes lifting as it dives, about fourteen seconds in all.

# 206 — A hot-air balloon
No art. Every two minutes or so, on dry days, a striped hot-air balloon drifts across the view for about three-quarters of a minute, in one of four colourings that change from one crossing to the next.

# 207 — Fishing boats at night
No art. On dry nights three small boats sit off the island, each with a lantern at the stern, a soft glow around it and the light trembling on the water below. The lights are drawn over the night's tint with the village lamps.

# 208 — Kite days
No art. On a little over half the dry days outside winter, two kites fly through the daylight on long strings from the green beside the hall, leaning and dipping on the wind with bow-tied tails snaking after them.

# 209 — Snowmen
No art. Through winter four snowmen stand on open ground nearest the hall, each with a top hat, a carrot and a scarf of its own colour. They stay on the same tiles from day to day and move on only if something is built where they stand.

# 210 — Carved pumpkins
No art. Through autumn up to five carved pumpkins sit on open ground near the hall, with nothing tall in front of them. Their faces are dark by day and glow, flickering, after dark.

# 211 — Dolphins
No art. Every fifty-five seconds by day, out of step with the whale, four dolphins travel past one side of the island, each leaping in turn and dropping back with a ring on the water.

# 212 — Catching the visitors
No art. A sparkle rides above each balloon, whale and pod of dolphins until it is tapped. Tapping one once gives a small share of the store's capacity: food from a balloon or the dolphins, wood from a whale. It is once per visit, and building placement takes the tap first when a building is selected.

# 213 — The island painted for each season → `art/ground_spring.webp`, `ground_autumn.webp`, `ground_winter.webp`  ✅ DONE
GPT Image edits of `ground.webp` on flat magenta, then magenta keyed out and each fitted to the summer picture's opaque bounds so the island stays in register. Prompt: "Edit this image. Keep the exact same island: same diamond shape, same outline, same size and position in the frame, same cliffs and beach at the front, same painterly game-art style, every bush, rock and flower patch in the same place. Change only the season to <season description>. No buildings, no people, no text. The flat solid magenta (#FF00FF) background stays exactly as it is. Landscape 3:2." Summer keeps the original with its tint.

# 214 — Painted snowman, pumpkin and balloon → `art/snowman_painted.webp`, `art/pumpkin.webp`, `art/pumpkin_glow.webp`, `art/balloon.webp`  ✅ DONE
GPT Image, isolated on flat magenta and keyed out, replacing the shapes drawn in code for 206, 209 and 210 (those stay as the fallback before the art loads). Prompts: "A single charming snowman: three packed snowballs, black top hat, carrot nose, coal eyes and buttons, a knitted red scarf, stick arms, standing on a small patch of snow"; "A single plump carved pumpkin with a friendly jack-o'-lantern face ... The carved holes are dark and empty, not lit"; "A single hot-air balloon seen from the side: a large round envelope with bold red and cream vertical stripes and gold trim, ropes down to a small wicker basket". The balloon is now the one red-and-cream colouring. `pumpkin_glow.webp` is the dark face pixels of the pumpkin turned to light, drawn over the night's tint.

# 215 — Painted whale, dolphin and fishing boat → `art/whale_back.webp`, `art/whale_flukes.webp`, `art/dolphin.webp`, `art/night_boat.webp`  ✅ DONE
GPT Image, isolated on flat magenta and keyed out, replacing the shapes drawn in code for 205, 207 and 211 (kept as the fallback before the art loads). Each subject is cut in a straight line at the waterline where it meets the sea, so the game can rise and sink it behind a clip. Prompts ask for the same painterly style with warm light from the upper left: "the long dark blue-grey back of a humpback whale breaking the surface"; "the raised tail flukes of a humpback whale seen from behind ... water streaming off the edges"; "a single dolphin in mid-leap, seen exactly from the side, body level and horizontal, nose pointing right"; "a single small wooden fishing boat seen from the side at dusk ... a small unlit iron lantern hanging on a short post at the right-hand end".

# 216 — Unclaimed land in winter
No art. The shade over land not yet claimed is a blue one in winter, so the painted snow reads as snow out of the sun instead of grey concrete. The other seasons keep the dark one.

# 217 — The winter sea → `art/water_winter.webp`  ✅ DONE
GPT Image edit of `water.webp`, resized back to its 1400×700 so the mirrored tiling holds. Prompt: "Edit this image of sea water, seen from above. Keep the same painterly game-art style, the same scale of waves and the same overall pattern of light across the surface, filling the whole frame edge to edge. Change the season to deep winter: the water becomes cold steel-blue and slate teal, less saturated, with a dozen small pale ice floes scattered evenly across it, thin slushy ice along them and soft white foam. No land, no boats, no text, no border."

# 218 — A lighter first load
No art. The game fetched every season's pictures at start: 525 files and 39.6 MB. It now fetches only the current season's ahead of time (394 files, 28.2 MB in autumn), and the others arrive as their season comes, with the tinted summer picture standing in until then.

# 219 — Lighter still
No art. Building looks, seasonal pictures and lit windows are now fetched when first drawn instead of at start: a first visit is 179 files and 11.4 MB, down from 39.6 MB.

# 220 — The game stays on the phone
No art. On the website a service worker (`sw.js`) now holds the pictures once they have been fetched and keeps a copy of the page and code for when there is no signal. A return visit drops from 11.5 MB to 1 MB, the title clip being the 1 MB, and the village opens with no network at all. The page and code still come from the network first. The phone app is left alone, since it carries everything already.

# 221 — The village remembers its visitors
No art. Every balloon, whale and pod of dolphins caught goes on a tally kept with the save. The more caught, the more the next is worth, rising to twice the share at forty. A note over each catch gives that kind's count, and at ten, twenty and forty it announces the new multiplier.

# 222 — The golden balloon, and the tally in the hall → `art/balloon_gold.webp`  ✅ DONE
GPT Image, keyed from flat magenta: "the same design as the striped hot-air balloon above ... rare and magical: the envelope is shining gold and deep royal purple stripes with sparkling gold trim and small glowing stars painted on it, ropes down to an ornate golden basket". About one balloon in seven is golden, worth three times the catch and counted on its own line. The hall's panel now lists every kind caught, once there is anything to list.

## Round 223: the visitor album (no new art)
The Town Hall's title row now opens a page of four cards, drawn from the existing balloon, balloon_gold, whale_back and dolphin paintings. A visitor not yet caught shows as the painting filled dark.

## Round 224: the album's reward (no new art)
All twelve stars put a golden weathervane on the Town Hall, drawn in code and stood on the peak read from whichever painting the hall is wearing.

## Round 225: fewer paid visits (no new art)
Whales and dolphins still come as often, but only every third visit carries a sparkle and can be caught.

## Round 226: say when a quarry comes first (no new art)
A goal-following playthrough sat on "Build a mill" with no stone coming in. The strip, the placement label and the upgrade button now say "build a quarry first" when a price needs goods nothing in the village makes yet.

## Round 227: carry a village to another device (no new art)
A Transfer chip on the Town Hall opens a card that copies the save as a short code, or takes one pasted from another device. The village it replaces is kept aside under its own key.

## Round 228: undo a pasted village (no new art)
When a paste has replaced a village, the Transfer card offers "Bring back the village before", which trades the two places. A profile of a full village under a sixfold CPU slowdown found no frame-rate problem, so nothing was changed for speed.

# 229 — Painted album and weathervane → `art/weathervane.webp`, `art/card_whale.webp`, `art/card_pod.webp`, `art/album_page.webp`  ✅ DONE
- **weathervane** (GPT Image, flat magenta, keyed): "a gilded rooster weathervane ... arrow pointing right, N/E/S/W letters on the cross arms, standing on a short pole with a gold ball", matched to the village's warm painted style. It replaces the vane that was drawn in code (that stays as the fallback). It stands about 78 world units tall on the hall's peak and turns edge-on with the wind.
- **card_whale** and **card_pod** (GPT Image, flat magenta, keyed): a whole humpback breaching with splash, and three leaping dolphins, both in the style of the existing whale_back and dolphin art. The album cards now show the whole animal rather than the part the sea shows.
- **album_page** (Leonardo Lucid Origin, free relaxed, keyed): "an old naturalist's album page, aged parchment with torn edges and gilded autumn-leaf scrollwork in the corners, empty centre". The Visitors album is drawn on it with dark-brown ink, and the cards sit 50u in from the edges, clear of the corners.

# 230 — Painted icons in place of emoji → `art/icon_*.webp` (24)  ✅ DONE
The build and decorate trays, the resource chips and the card prices used emoji, which every phone draws differently and none in the village's paint. Two GPT Image sheets, 4×3 on flat magenta, sliced by the empty bands between icons (masters in `art/original/icons_build.png` and `icons_decor.png`):
- **Buildings and loads**, made with a strip of the house, mill, storehouse and market paintings attached as a style reference: "a game UI icon sheet ... each icon a simple, bold, front-three-quarter view with a thin dark outline so it reads at small size": cottage, farm field and sheaf, axe in a log with cut logs, quarry blocks and pickaxe / barn with crates, roofed stone well, windmill, striped market stall / lighthouse beacon, town hall with clock tower, three cut logs, wheat sheaf.
- **Decorations**, made with the first sheet attached: "a second NEW sheet in exactly the same style, outline weight, lighting and size of icon": stone, golden twinkle, cobbled path, picket fence / tulip bed, round hedge, bench, street lamp / heraldic banner, knight statue, basket of apples (orchard find), treasure chest (wreck find).
- Leonardo Lucid Origin was tried twice for the decorations sheet (free relaxed). Both came back on a crimson background rather than magenta, in a flatter vector style. The second also had a 3×3 grid with items merged, so neither was used.
The game draws a painted icon wherever one has loaded, and the emoji it replaces otherwise (`drawIcon`, `iconText`). Inline text elsewhere (panels, notes) keeps its emoji.

# 231 — A painted panel board, and icons in the panels → `art/panel_wood.webp`, `art/icon_{lock,album,star,sound_on,sound_off,villager}.webp`  ✅ DONE
- **panel_wood** (Leonardo Lucid Origin, free relaxed, used as painted, no keying): "one rectangular dark walnut wooden board seen perfectly straight on, filling the entire image edge to edge with square corners. A slim raised wooden rim ... a thin line of gold inlay just inside it, and a small ornate gold filigree ornament ... in each of the four corners. The whole middle is plain, smooth, evenly lit dark brown wood grain". It is drawn as nine pieces (`boardPanel`, a 112 px cut of 1024) behind the building panel and a villager's card. These were the only flat dark-green cards left among the wooden HUD. A 32% dark wash goes over the board: the contrast sweep measured the salmon warning text at 4.27 against the light streaks in the grain, and it needs 4.5.
- **Six more icons** (GPT Image, 3×2 on flat magenta, made with the decorations sheet attached as the style reference): padlock, open storybook album, gold star, brass speaker with sound waves, the same speaker muted, a villager in a straw hat. The lock, album chip and sound button use them now. The star and villager are kept for later. Master: `art/original/icons_misc.png`.
- The panels now draw their emoji as painted icons too: the title, the hall's building counts and "level N adds", the load rows, and the Sell and Upgrade prices. `iconText` takes a map because the same glyph is a farm in a count and grain in a price.

# 232 — The elder, the trader's cart, and painted loads in the world → `art/icon_elder.webp` (256), `art/icon_cart.webp`  ✅ DONE
- **Elder and cart** (GPT Image, two pictures on flat magenta, made with the misc icon sheet attached as the style reference): "a head-and-shoulders portrait of a kindly old village elder woman, the village's advisor, with rosy cheeks, round spectacles, silver hair in a bun and a warm smile, wearing a mustard knitted shawl over a green dress ... the bust is cut off in a soft rounded shape at the bottom" and "a travelling merchant's covered wooden hand cart with a red and cream striped canopy, laden with crates, a sack and a basket". Master: `art/original/elder_cart.png`.
- The elder stands at the left end of the goal line and the one-off hints (`drawElder`), in a slot the line keeps whether or not she has loaded. The cart heads the "next trader" stall.
- Leonardo Lucid Origin painted the same elder (free relaxed). It was a softer, painterly bust in a pink disc on maroon. It was good, but without the outline of the HUD icons, so ChatGPT's was used.
- No new art for these: the load a villager carries, the "+8" delivery pops and the orders cards now use the painted wood/grain/stone, and the orders cards are wooden like every other tray. The draw budget allows one carried load per villager (`carriesDrawn`), as it allows one lit window per lit building. On the warm wood of an order that cannot be taken, the greyed "get" line measured 4.46, so it was lightened to #b4a291.

# 233 — Painted badges over the buildings → `art/badge_{up,idle,rest,far}.webp` (128), `art/badge_plaque.webp` (333×128)  ✅ DONE
- **Badge sheet** (GPT Image, one row on flat magenta, made with the misc icon sheet attached as the style reference): "5 small map badges that float above buildings ... no text or letters anywhere. 1) a round emerald-green enamel badge with a gold rim and a bold chunky golden UP arrow ... 2) a round amber-orange enamel badge with gold rim and a bold cream exclamation mark ... 3) a round slate-blue enamel badge with gold rim and two cream vertical pause bars ... 4) a round brown wooden badge with gold rim showing a small pair of worn leather boots ... 5) a wide horizontal empty wooden plaque/nameboard, about 3 times wider than tall, warm walnut planks with a gold trim border and rounded ends". Master: `art/original/badges.png`. Sliced with the icon slicer, keeping the plaque's width.
- The upgrade tick, the "!" of a post with nobody at it, and the pause of a post resting on full stores are now drawn as these discs. The hall's "Lv N" sits on the plaque, outlined dark. The long walk's "−N%" keeps its pill with the boots hung off its left end. The drawn pills stay as the fallback, and they are what the text-reading checkers see (`plainIcons`).
- Leonardo Lucid Origin painted the green upgrade badge alone (free relaxed). It came back on raspberry rather than magenta, with a drop shadow baked in and no dark outline, so it was not used.

# 234 — A ribbon for a met goal, and real grain in the wood → `art/ribbon.webp` (1141×200), `art/wood_grain.webp` (1024 tile)  ✅ DONE
- **ribbon** (GPT Image, flat magenta, made with the badge sheet attached as the style reference): "ONE wide horizontal celebration ribbon banner ... a rich crimson-red satin ribbon with a thin gold trim line along its top and bottom edges, about 5 times wider than tall, seen straight on. At each end the ribbon folds back behind itself into a darker red forked swallow-tail. The long middle band must be perfectly uniform from left to right ... so it can be stretched sideways ... A few small golden autumn leaves tucked into the folds at each end only. No text". Master: `art/original/ribbon.png`. "Goal complete!" is now written in white on this ribbon instead of the green pill. It is drawn in three pieces: the tails are a fifth of the width at each end, and the band between them stretches to fit the words. Measured, the band is 55% of the painting's height and sits at 53% down. The ribbon is kept below the resource chips.
- **wood_grain** (Leonardo Lucid Origin, free relaxed): "Seamless tileable texture of dark walnut wood planks seen perfectly straight on, flat even lighting, three long horizontal planks running edge to edge ... fine horizontal grain ... no knots near the edges, no nails, no vignette, no shadows, no perspective, hand-painted cozy mobile game texture style". Master: `art/original/wood_grain.jpg`. It was shrunk to 512 and mirrored four ways into a 1024 tile that repeats without a seam. Every `woodPanel` (chips, tabs, tray and order cards, the goal line) now lays it under the old gradient at 62%, so the gradient still sets the colour and the contrast.
- No new art for this: the goal line, the hints and the banner (`pillLines`) printed emoji for the loads, and now draw the painted ones through `iconText`.

# 235 — Painted buttons, a gilt frame, and the big cards on the walnut board → `art/btn_{on,warn,off}.webp`, `art/frame_gilt.webp` (775×680)  ✅ DONE
- **Buttons** (GPT Image, flat magenta, made with the badge sheet attached as the style reference): "THREE blank game UI buttons ... Each button is a wide horizontal pill with fully rounded ends, about 4 times wider than tall ... thin gold rim and a subtle glossy highlight along the top. 1) deep forest-green enamel (an action you can take). 2) deep rust-red enamel (a warning). 3) dull dark grey-brown slate, matte, with a dull bronze rim instead of gold (a disabled button). The faces must stay fairly DARK so cream text reads on them, and the long middle ... perfectly uniform ... No text". Master: `art/original/buttons.png`. Each button is drawn in three pieces (`paintedButton`): the rounded ends, and the middle stretched. They are used for the building panel's buttons, its Upgrade button and the Claim button. The slate face was darkened to 70%: the contrast sweep measured the grey "Need …" lettering at 3.88 on it.
- **frame_gilt** (Leonardo Lucid Origin, free relaxed): "An ornate gilded picture frame seen perfectly straight on, landscape 3:2 rectangle, thin elegant carved gold moulding with small autumn oak-leaf ornaments in the four corners ... the entire inside opening ... flat solid pure green #00FF00 and the whole background ... the same flat solid pure green". It came back on a muted green with a soft shadow. That was keyed by colour (green above red is background, since gilt is always redder than green) and cropped. Master: `art/original/frame_gilt.jpg`. It has ornaments at the corners and mid-sides, so it is cut 5×5 rather than 9: the ornaments keep their shape and only the plain moulding stretches. It frames the welcome-back and finished-village paintings.
- No new art for these: the welcome-back, finished, claim and transfer cards moved from the last dark-green fill onto `panel_wood` (`cardBoard`). The away and claim cards draw their loads as painted icons. The frame (24 pieces) and the board (9) are each painted once per size into a cached canvas (`chrome`). A finished village shows its card over every building, and drawn piece by piece that was 35 images over the draw budget.

# 236 — The elder's hints on parchment, a painted close button, count badge and blue button → `art/paper_grain.webp` (1024 tile), `art/ui_close.webp`, `art/ui_count.webp`, `art/btn_blue.webp`  ✅ DONE
- **paper_grain** (Leonardo Lucid Origin, free relaxed, second try): "Seamless tileable texture of old handmade parchment paper seen perfectly straight on, warm cream and honey tones with clearly visible paper fibres, soft tea-stained mottled patches spread evenly across the whole surface ... no dark vignette, no shadows, no perspective". The first try ("warm aged parchment ... very subtle fibres and faint soft mottling") came back almost flat cream, so it was not used. Master: `art/original/paper_grain.jpg`, mirrored four ways into a seamless tile. The elder's one-off hints are now in dark ink on this parchment, with a brown rim. The goal strip they replace stays on wood, so a hint no longer looks like the strip that is always there.
- **UI bits** (GPT Image, one row on flat magenta, made with the button sheet attached as the style reference): "1) a round close button: a dark walnut-wood disc with a gold rim and a bold chunky cream-coloured X cross ... 2) a small round notification badge: a bright golden-amber enamel disc with a gold rim, completely blank ... 3) a wide horizontal pill button ... in deep royal-blue enamel with a gold rim". Master: `art/original/ui_bits.png`.
  - Every × (the building panel, the claim card, the transfer card, the album) is now the walnut disc. The glyph stays for the text readers (`plainIcons`).
  - The count of trades ready on the Orders tab sits on the gold disc.
  - The transfer card's buttons use the blue pill, so all the full-screen cards now have painted buttons.
- The draw budget now has its own allowance for painted card furniture (`chromeDrawn`: a cached board or frame, three per stretched button or ribbon, the count disc), up to 20, in the same way as the icons.

# 237 — The elder's moods, sparkles for a met goal, and framed celebration clips → `art/icon_elder_{cheer,tip}.webp` (256), `art/spark_0..5.webp` (128)  ✅ DONE
- **Elder moods** (GPT Image, flat magenta, made with the round-232 elder attached as the reference): "Paint the SAME elder woman twice more, side by side ... Keep everything identical: the same face, silver hair bun, round spectacles, rosy cheeks, mustard knitted shawl over a green dress, the same thick dark outline ... 1) CHEERING: beaming with joy, eyes happily closed in a big smile, one hand raised beside her face waving a small golden autumn leaf. 2) EXPLAINING: a warm knowing smile, eyebrows raised, one finger raised beside her face as if giving a helpful tip". Master: `art/original/elder_moods.png`. The hints now show her explaining (`drawElder` takes a mood and falls back to the plain bust). The cheering elder stands over the ribbon's left tail when a goal is met.
- **Sparkles** (Leonardo Lucid Origin, free relaxed): "Six separate glowing golden sparkle bursts arranged in a loose 3 by 2 grid on a pure solid black background, each one well apart from the others ... soft four-pointed star twinkles with warm golden-white cores, gentle halos and a few tiny glints around each, different sizes and shapes, magical cozy game particle effect". Master: `art/original/sparkles.jpg`, cropped into six. They are drawn with additive light, so the black adds nothing. Ten of them burst along the ribbon in its first two seconds, each at a fixed moment and place (`sparkleBurst`). The first size was too faint to notice and they were enlarged twice. Under reduced motion they stay where they are and only fade, because the stillness sweep requires reduce motion not to change how many sprites are drawn.
- No new art for this: the celebration clips (`drawShow`) now sit inside the gilt frame from round 235. The clip was moved down 16 so the frame no longer touches the hint above it.

# 238 — Faces on the villager card → `art/portrait_{woodcutter,farmer,basket,stonecutter,miller,trader}.webp` (256), `art/ring_gilt.webp` (256)  ✅ DONE
- **Portraits** (GPT Image, flat magenta). Two references were attached: a sheet of the six walking figures, and the elder's moods sheet for the style. Prompt: "Paint SIX head-and-shoulders portraits of these six villagers in exactly the elder's portrait style: the same thick dark outline, soft painterly cartoon shading, warm lighting, same size and the same head-and-shoulders crop cut off in a soft rounded shape at the bottom. Keep each villager's face, hair, hat or headscarf and clothes colours exactly as in the first image ... Each with a friendly smile, facing slightly to the viewer's right. Arrange them in two rows of three". Master: `art/original/portraits.png`. Sliced with the badge slicer.
- **ring_gilt** (Leonardo Lucid Origin, free relaxed): "A single ornate round gilded medallion picture frame ring seen perfectly straight on, a thin circular carved gold moulding with tiny autumn oak leaves and acorns worked into it at the top and bottom, the empty inside of the circle and the whole background are flat solid pure green #00FF00, no shadow". It came back on a muted green with a soft shadow. It was cut out geometrically, as the annulus between the measured inner and outer radii, with the green keyed only near the two edges, so the green leaves on the ornaments were kept. Master: `art/original/ring_gilt.jpg`.
- Tapping a villager now shows their face at the left of their card, inside the ring (`drawPortrait`). The face is chosen by the figure they walk about as (`portraitKey`), so it matches the person tapped. Without the art, a plain gold circle keeps the place.

# 239 — Merchants at the stalls, and the empty stall painted → `art/merchant_{captain,spice,pedlar,cheese}.webp` (256), `art/stall_empty.webp` (223×256)  ✅ DONE
- **Merchants** (GPT Image, flat magenta, made with the round-238 villager portraits attached as the style reference): "paint FOUR travelling merchants who visit the village to trade, in exactly the same portrait style ... They must look clearly like visitors from far away, different from the villagers: 1) an old weathered sea captain with a white beard, a navy captain's cap and a pea coat with brass buttons; 2) a cheerful spice merchant woman with dark skin, golden hoop earrings and a rich teal and saffron patterned head wrap; 3) a tall thin pedlar with a long grey moustache, a wide brimmed traveller's hat with a feather and a big leather backpack strap on his shoulder; 4) a round rosy cheesemonger woman with a crimson hood and a wheel of cheese held up beside her face". Master: `art/original/merchants.png`.
  - Every offer on the orders board now shows the merchant who brought it, in the gilt ring from round 238 (`drawMedallion`), with the give / get lines centred in what is left of the card.
  - Who it is comes from the stall and the size of the offer (`merchantOf`), not from anything saved, so old saves have merchants too.
- **stall_empty** (Leonardo Lucid Origin, free relaxed): "A single small empty wooden village market stall seen from the front at a slight three-quarter angle, a simple timber counter with a red and cream striped cloth awning on two wooden posts, an empty counter top, a couple of empty wicker baskets and a small chalk sign hanging blank, a few golden autumn leaves on the awning, isolated and centred on a flat solid pure green #00FF00 background". It came back on a muted green, which was keyed out; the shadow was green-tinted too and went with it. Master: `art/original/stall_empty.jpg`. It is drawn at 30% behind "next trader" and "empty stall", so a vacant slot reads as a stall waiting for someone.
- The icon sweep's orders check now sets the board again after waiting for the art to load. The live frames carry on during that wait, and the tray had gone back to Build.

# 240 — Names that match the faces (no new art)
- Since round 238 the villager card shows a face, and names came from one list keyed only by the villager's number, so "Mara" could stand under the bearded woodcutter. Names now come from two lists of eighty, one for the women's figures (basket, stonecutter) and one for the men's. The list is chosen by the figure the villager is meant to have (`villagerArt(v, () => true)`), so the name does not flicker while the art loads. Each list is longer than the 72-villager ceiling and stepped by 37, so nobody shares a name. The name sweep now also checks every name against its figure.

# 241 — Faces in the building panel, painted tab icons, a gold rule → `art/icon_tab_{build,decor,orders}.webp` (128), `art/divider_gilt.webp` (914×123)  ✅ DONE
- **Tab icons** (GPT Image, flat magenta, made with the misc icon sheet attached as the style reference): "paint THREE new small game icons ... 1) BUILD: a wooden-handled claw hammer crossed over a small hand saw; 2) DECORATE: a small terracotta flower pot overflowing with orange and yellow autumn flowers; 3) ORDERS: a small golden pair of balance scales with a coin in one pan and a tiny wooden crate in the other". Master: `art/original/tab_icons.png`. Each tab draws its icon ahead of its word, a little dimmer on the tabs not chosen. The text readers still get the word alone.
- **divider_gilt** (Leonardo Lucid Origin, free relaxed): "A single long thin horizontal ornamental divider line in polished gold ... a slim gilded rule that tapers to fine points at both ends, with a small carved golden autumn oak leaf and two acorns as a centrepiece in the middle and delicate curling filigree scrolls either side of it, about ten times wider than tall, isolated and centred on a flat solid pure green #00FF00 background". Master: `art/original/divider_gilt.jpg`, keyed and trimmed. It is cut in five (`DIV_CUTS`): the curled ends and the leaf keep their shape, and the plain bar stretches. It is painted once per width into the chrome cache and drawn between a building panel's rows and its buttons.
- No new art for this: a building's panel shows the faces of the people posted there, in the gilt ring, right to left from the close button (`panelFaces`, at most four). A tap on a face opens that villager's card. The sweep checks both, and failed as it should with the tap switched off.

# 242 — What a villager is waiting for, as a thought → `art/bubble_think.webp` (160×155), `art/icon_hourglass.webp` (128)  ✅ DONE
- **bubble_think** (Leonardo Lucid Origin, free relaxed): "A single empty cartoon thought bubble seen straight on: a soft fluffy round cream-white cloud shape with a thick dark brown outline and gentle warm shading, completely empty inside, with two small round puffs trailing down from its lower left like a thought bubble, isolated and centred on a flat solid pure green #00FF00 background". It came with a drop shadow below. The image was cut above the shadow, keyed and trimmed. Master: `art/original/bubble_think.jpg`. The tip of the trail and the middle of the cloud were measured off it (`THOUGHT_TIP`, `THOUGHT_MID`).
- **icon_hourglass** (GPT Image, flat magenta, made with the tab icons attached as the style reference): "a wooden-framed hourglass with golden sand, most of the sand still in the top bulb and a thin stream falling into a small heap at the bottom, the frame made of warm brown carved wood with brass caps, standing upright". Master: `art/original/hourglass.png`.
- A villager with no post thinks of the Build tab's hammer and saw: a workplace would put them to work. One whose post is still scaffolding thinks of the hourglass (`thoughtOf`). The thoughts are queued and painted with the building badges, over the roofs and the night wash, so a villager behind the hall can still be seen thinking. They are there for as long as the state lasts, not on a timer, so reduce motion changes nothing but the small bob. The draw budget allows two images per villager for them (`thoughtsDrawn`).
- Also in this round: the gilt-ring faces (villager card, building panel, orders) are now painted once into the chrome cache. A night frame with a building's panel open had reached 1205 canvas calls against the cost sweep's ceiling of 1200. It is now 1144.

# 243 — A woodswoman at the lumber camps, and a backdrop behind every face → `art/villager_woodswoman.webp` + `_walk1..6` (320 tall), `art/portrait_woodswoman.webp` (256), `art/portrait_bg.webp` (256)  ✅ DONE
- **villager_woodswoman** (GPT Image). The woodcutter and stonecutter figures were attached as references, and the prompt asked for a woman woodcutter in the same style. She has a green knit cap, a copper-red braid, a rust shirt under a brown laced vest, olive trousers and laced boots, with the felling axe on her shoulder, on white. Then six walk frames in the same conversation, each "Frame N of 6. Same character, same camera, same canvas, same size, same white background, same everything except the pose." Processed with `node tools/prep-art.js villager_woodswoman`, which keyed the white and registered the six frames as one set. She was first written out at 800px because she was missing from prep-art's size table (`CAP`); she is now capped at 320 like the other villagers. Masters: `art/original/villager_woodswoman*.png`.
- **portrait_woodswoman** (GPT Image, flat magenta, the standing figure and the round-238 portrait sheet attached): "Now a portrait of this same woodswoman (first image) for her villager card, matching the second image's portrait style exactly: head and shoulders only, three-quarter view facing slightly left, friendly smile, same green knit cap, copper-red braid over her shoulder, rust shirt and brown laced vest, the axe handle just visible on her shoulder. Thick dark outline, soft cel shading, the bust cut off with a rounded bottom like the examples. One single portrait centred, filling most of a square canvas, on a perfectly flat solid magenta #FF00FF background, no shadow, no text, no frame." Sliced with the badge slicer. Master: `art/original/portrait_woodswoman.png`.
- **portrait_bg** (Leonardo Lucid Origin, free relaxed): "A soft dreamy out-of-focus autumn background for behind a portrait: warm golden and amber bokeh light circles, blurred orange and red maple leaves and a hint of warm late-afternoon sky, gently darker towards the edges, no objects in focus, no people, no text, square, painterly cozy mobile game style". Master: `art/original/portrait_bg.jpg`. It is clipped into the disc behind every gilt-ring face (villagers, panel faces, merchants) instead of the flat brown, inside the same cached medallion, so it costs nothing per frame.
- Every other hand at a lumber camp is now the woodswoman: an odd `v.k`, which is fixed for life (`villagerArt`). She is in `WOMEN_FIGURES`, so her name comes from the women's list and stays the same through reloads. The name sweep now checks both figures at a camp, their names and their faces. With the rule switched off it failed as it should ("a lumber hand with k=1 is drawn as villager_woodcutter").

# 244 — Children at play and cats on the doorsteps → `art/villager_girl.webp` + `_walk1..6` (320 tall), `art/cat_sleep.webp` (256×241)  ✅ DONE
- **villager_girl** (GPT Image, with the basket woman and the woodswoman attached for the style and scale): "New character for the same village game, in exactly the same painted style, camera angle, lighting and pose direction as these two villagers: a cheerful village CHILD of about eight, a little girl with two short strawberry-blonde pigtails tied with green ribbons, rosy freckled cheeks and a big gap-toothed grin, wearing a mustard yellow knitted jumper with a patched elbow over a short brown pinafore skirt, striped red and cream stockings and little brown laced boots, holding a red ball under one arm ... Full body, centred, same canvas size as the attached images, on a plain pure white background, no shadow, no text." Then the walk, with the woodswoman's six-frame strip attached as the pose guide: "Now a 6-frame walk cycle for this little girl, one frame per image, like the attached strip of the woodswoman walking ... the ball kept under the same arm. Frame 1 of 6 now", and then "Frame N of 6. Same character, same camera, same canvas, same size, same white background, same everything except the pose: the next step of the stride." Processed with `node tools/prep-art.js villager_girl` and capped at 320 like the villagers. Masters: `art/original/villager_girl*.png`.
- **cat_sleep** (Leonardo Lucid Origin, free relaxed). The first try was a flat line-drawn cartoon that did not sit with the painted sprites. The second: "A single fluffy ginger tabby cat curled up asleep in a round ball, seen from a three-quarter angle from slightly above, tail wrapped around its nose, eyes peacefully closed, richly detailed soft fur with warm orange and cream stripes, soft painterly 3D-rendered storybook illustration like a cozy isometric village building game sprite, warm sunlight from the upper left, isolated and centred on a flat solid pure green #00FF00 background, no shadow, no ground, no outline, no text". It came on a muted green with a soft shadow and a grey cushion under the cat. Keyed on greenness (green above both red and blue), which took the background and the shadow and kept the cushion. Master: `art/original/cat_sleep.jpg`.
- Every other house (in the order built, at most four) has a child. She runs to the open tile nearest the well, or nearest the hall before there is a well, plays there in a row with the others, bouncing on her toes, then runs home and rests at the door (`kidsNow`). The first house with open ground before its door, and every other one after it, has a cat asleep on the step (`catsNow`, at most three). Both are out by day and indoors at night or in the rain. Neither is a villager or saved: where they are comes from the clock, like the kites. Under reduce motion the children stand at the well. They are counted on their own tally (`lifeDrawn`), which the cost sweep allows up to the seven there can be.
- The first screenshots showed the children behind an oak and the cat behind the hall's tower. Ground under tall scenery now counts as taken, and the play spot and the cats' steps need the two rows in front of them clear (`seenAt`). The children stood round a circle and two of three were one behind the other; they now stand in a row.
- The icon sweep checks, at noon on a dry day, that children and cats are drawn with their painted sprites and that the tally matches, and that nobody is out at night. It failed as it should with the cats, and then the children, left out of the drawing pass.

# 245 — The children and cats where they can be seen (no new art)
- In the round-244 close-up one girl stood on the back edge of the land with her head in the shade over the wild, which is painted over everything standing. The play spot now has to be off that edge.
- Whether a child or a cat can be seen is now asked of the pictures, not counted in clear tiles: every building's drawn box (`artRect`), a decoration's tile and the tall scenery, nearer the camera than the spot, and covering more than a fifth of it (`occluders`, `hidden`). Counted rows were never right: two rows missed the hall's tower over a cat, and three still missed its spire over a child. Each child in the row is tested on her own, because a spire covers a sliver of the whole row and all of one girl.
- The row stepped two girls 4 px up the slope, which is exactly the depth of a house beside the spot on the same row, and they were drawn behind it. The row now only steps down the slope (`rowAt`).
- The icon sweep now also checks, at a moment when the children are at play, that each stands inside the claim, off its back edge, not in anything built and not behind anything. Each check failed as it should with the children moved off the land, and again with a picture laid over them.

# 246 — A boy, the children's cards and families, and a dog → `art/villager_boy.webp` + `_walk1..6` (320 tall), `art/portrait_{girl,boy}.webp` (256), `art/dog_sleep.webp` (256×221)  ✅ DONE
- **villager_boy** (GPT Image, with the girl and her walk strip attached): "A friend for this girl, in exactly the same painted style, camera angle, lighting, scale and facing direction as the first image: a cheerful village BOY of about nine, the same height as her, with tousled chestnut-brown hair sticking up at the crown, freckles and a cheeky grin, wearing a rust-red knitted jumper with the sleeves pushed up, a cream shirt collar showing, brown corduroy knee-length trousers held up with braces, grey knitted socks and scuffed brown boots, a little catapult tucked in his back pocket, both hands free and swinging ... on a plain pure white background, no shadow, no text." Then "Now a 6-frame walk cycle for this boy ... like the strip of the girl walking I attached before ... Frame 1 of 6 now", and frames 2 to 6 as in round 244. Processed with `node tools/prep-art.js villager_boy`. Masters: `art/original/villager_boy*.png`.
- **portrait_girl, portrait_boy** (GPT Image, flat magenta, with the round-238 portrait sheet and both standing figures attached): "Now two portraits for these children's cards, in exactly the style of the first image's villager portraits: head and shoulders only, the same thick dark outline, soft painterly cartoon shading, warm lighting, the same head-and-shoulders crop cut off in a soft rounded shape at the bottom ... LEFT: the little girl ... the red ball peeking up at the bottom. RIGHT: the boy ... Side by side, well apart, the same size, on a perfectly flat solid magenta #FF00FF background". Master: `art/original/kid_portraits.png`, sliced with the badge slicer.
- **dog_sleep** (Leonardo Lucid Origin, free relaxed): "A single small scruffy brown and white beagle puppy curled up asleep in a round ball on a little woven rag rug, seen from a three-quarter angle from slightly above, floppy ears, nose tucked into its tail, eyes peacefully closed, richly detailed soft fur, soft painterly 3D-rendered storybook illustration like a cozy isometric village building game sprite, warm sunlight from the upper left, isolated and centred on a flat solid pure green #00FF00 background, no shadow, no ground, no outline, no text". It came asleep in a woven basket on a dull olive green (181,199,120), which the cat's key left alone. It was keyed instead on green above the mean of red and blue (49 on the ground, under 7 on the dog and the basket). Master: `art/original/dog_sleep.jpg`.
- The children's houses take turns, girl then boy (`KID_FIGS`), and so do the pets on the steps, cat then dog (`PETS`). Each child has a name from a short list of their own, by house.
- A tap on a child, where they are drawn, opens their card where a villager's goes. It shows their face in the gilt ring, their name, whose child they are, what they are doing (playing ball by the well, running down or home, on the step), and when they are out. A ring marks them on the ground. Villagers do not belong to houses, so each house is given the next villagers by number, in the order the houses were built (`parentsOf`): "Ollie · Son of Halvard and Liv". The card closes with Back, or by itself when the child goes in.
- The icon sweep now builds three houses with clear steps and checks that both children and both pets are drawn. It taps a child at play and checks that the card gives the name, whose child it is, and the right face in the ring. It failed as it should with taps on children switched off.
