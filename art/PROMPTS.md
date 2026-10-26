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
