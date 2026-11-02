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
