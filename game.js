/* Village — isometric base builder.
   Slice 1: the ground you build on. Iso grid, drag/pinch camera, tap-to-place,
   procedurally drawn buildings, two resources that actually tick, and a save.

   Engine conventions carried over from Gatestorm, because they were hard-won:
     - one definition drives BOTH drawing and hit-testing (camProject/camUnproject),
       so the picture and the touch regions cannot drift apart
     - taps fire on pointer UP with a dead zone, so a drag is not a tap; the drag
       flag lives on the POINTER, never globally, or one lost touch kills tapping
     - the world layer scales to COVER the canvas; the HUD is drawn separately at
       its own scale and anchored to the true canvas edges
*/
const cv = document.getElementById('c');
const g  = cv.getContext('2d');
const W = cv.width, H = cv.height;      // logical play area
let VH = H, OY = 0;                     // canvas height / letterbox offset

/* ---------- grid ---------- */
const GW = 14, GH = 14;                 // tiles
const TW = 128, TH = 64;                // iso tile width / height (2:1)
const ORIGIN = { x: W / 2, y: 300 };

const tileToWorld = (c, r) => ({
  x: ORIGIN.x + (c - r) * TW / 2,
  y: ORIGIN.y + (c + r) * TH / 2,
});
// inverse of the above: world point -> fractional tile
function worldToTile(x, y) {
  const dx = x - ORIGIN.x, dy = y - ORIGIN.y;
  return { c: (dy / TH + dx / TW), r: (dy / TH - dx / TW) };
}
/* Which tile a world point is IN.

   tileToWorld returns tile CENTRES -- tilePath draws its diamond centred on
   one -- so worldToTile gives coordinates centred on the tile too, and tile
   (5,7) spans 4.5..5.5. Rounding is therefore correct and flooring is off by
   half a tile: a point at 4.72 is inside tile 5, and floor called it 4.

   Everything that hit-tests the grid used floor, so every tap landed a tile
   up-left of where it looked whenever you touched the left half of a tile.
   This is the exact drift the project's own convention exists to prevent, so
   it now lives in one function that both sides call. */
const tileAt = (x, y) => { const t = worldToTile(x, y);
  return { c: Math.round(t.c), r: Math.round(t.r) }; };

/* ---------- sprites ---------- */
/* Villagers are three STANDING figures, not a walk cycle. Four frames that
   match each other will not come back from an image generator, and one good
   pose swayed and bobbed in code reads as walking at the size these are drawn.
   Each villager keeps its own index into this list. */
const VILLAGERS = ['villager_farmer', 'villager_basket', 'villager_woodcutter'];
// a quarry hand's figure, worn at work only -- see villagerArt
const STONECUTTER = 'villager_stonecutter';
// and the market's, who would otherwise be a woodcutter: the market makes wood
const TRADER = 'villager_trader';
// and the mill's, white with flour, where the field hands used to stand in
const MILLER = 'villager_miller';
/* A painted walk cycle, if one has been drawn for this villager.

   Six frames to the stride, and the stride is the one the walker is
   actually taking -- the same phase that drives everything else, so the
   feet land where the ground says they should and a villager hurrying
   along a road cycles faster without being told to.

   All six or none. artFor hands back null both for a file that is missing
   and for one still decoding, which is exactly the answer wanted here:
   until the whole set is on screen the villager keeps his standing sprite
   and the faked walk, and he switches over the moment the last frame
   arrives. Half a cycle would be a limp. */
const WALK_STEPS = 6;
/* Which frame he stands on.

   A villager with a painted cycle is drawn FROM that cycle whether he is
   walking or not, and this is the frame he holds when he is not. It has to
   come out of the same set: the cycle is a fresh set of drawings and the
   old standing sprite is not, so showing one and then the other would
   change the man's hair colour and build every time he reached a door.
   Drawn from the same set and cut from the same box, standing and walking
   cannot disagree about who he is or how tall he is.

   The LAST beat, and the pipeline guarantees what is in it. A walk is a
   loop, so which drawing gets called number one is free, and prep-art
   spends that freedom here: it measures the footprint of all six and turns
   the loop until the narrowest -- feet together, passing stride, the
   nearest thing a walk has to standing still -- is the one this points at.
   The number has to agree with STAND_AT in tools/prep-art.js. */
const WALK_STAND = WALK_STEPS - 1;

/* Remembered once it is whole, because this is now asked on every draw of
   every villager rather than only of the ones in motion. Until then it
   really does have to look again each time: artFor answers null both for a
   frame that is missing and for one still decoding, and the difference
   between those two only shows up by asking later. */
const walkSets = new Map();
function walkFrames(key) {
  const got = walkSets.get(key);
  if (got) return got;
  const out = [];
  for (let i = 1; i <= WALK_STEPS; i++) {
    const im = artFor(key + '_walk' + i);
    if (!im) return null;
    out.push(im);
  }
  walkSets.set(key, out);
  return out;
}
const ready=im=>im&&im.complete&&im.naturalWidth>0;

/* Building artwork is OPTIONAL. If art/<key>.webp exists it is drawn; if it is
   missing or has not decoded yet the procedural version draws instead, so the
   game never shows a hole and art can arrive one file at a time.
   The .webp files are built from the PNG masters in art/original/ by
   tools/prep-art.js -- do not edit them by hand.
   Each sprite is anchored by the CENTRE OF ITS BASE, which is where the building
   meets the ground -- see art/ASSETS.md for the specs these must be drawn to. */
const ART = {};
function artFor(key) {
  // a missing key would request art/undefined.webp and 404 -- harmless but it
  // hides the real fault, which is whatever handed us nothing to draw
  if (!key) return null;
  if (!(key in ART)) {
    const im = new Image();
    im.onerror = () => { ART[key] = null; };      // no file: stay procedural, silently
    im.src = 'art/' + key + '.webp';
    ART[key] = im;
  }
  const im = ART[key];
  return ready(im) ? im : null;
}
/* How each sprite is fitted to its plot.

   Art is scaled to the FOOTPRINT rather than to a fixed height, or buildings of
   different sizes stop looking like they share a world. The one landmark every
   sprite has in common is its FRONT CORNER -- the near point of its base, where
   it touches the ground -- so that is the anchor, and everything else is
   measured against it:

     w   drawn width as a multiple of the plot's diamond width. Above 1 the
         building overhangs its plot, which is normal: painted eaves, log piles
         and stacked sacks all sit outside the foundation. The cottage and the
         barn are also RECTANGULAR in plan while their plots are square, so they
         need more room than the farm, whose fence really is a square.
     ax  where the front corner sits across the image, 0..1. Rarely 0.5 -- the
         buildings are drawn slightly off-centre.
     ay  where the front corner sits down the image, 0..1. Below 1 when
         something is drawn BELOW the foundation, as the barn's sacks are.

   ax and ay come from tools/measure-art.js; w is set by eye against the plot
   outline. Anything missing falls back to a plain bottom-centre fit. */
const ART_FIT = {
  house:  { w: 1.20, ax: 0.652, ay: 0.994 },
  house_stone:  { w: 1.20, ax: 0.684, ay: 0.997 },
  house_fisher: { w: 1.22, ax: 0.672, ay: 1.000 },
  house_baker:  { w: 1.12, ax: 0.600, ay: 0.97 },
  house_weaver: { w: 1.06, ax: 0.644, ay: 0.99 },
  house_potter: { w: 1.16, ax: 0.500, ay: 0.99 },
  house_bee:    { w: 1.04, ax: 0.450, ay: 0.98 },
  house_oak:    { w: 1.30, ax: 0.470, ay: 0.98 },
  house_thatch: { w: 1.20, ax: 0.694, ay: 1.000 },
  farm:   { w: 0.85, ax: 0.531, ay: 1.000 },
  farm_veg:    { w: 0.85, ax: 0.531, ay: 0.998 },
  farm_barley: { w: 0.85, ax: 0.526, ay: 0.998 },
  farm_pumpkin: { w: 0.85, ax: 0.526, ay: 0.995 },
  farm_vine:    { w: 0.85, ax: 0.521, ay: 0.995 },
  farm_orchard: { w: 0.85, ax: 0.507, ay: 0.995 },
  farm_hops:    { w: 0.85, ax: 0.476, ay: 0.996 },
  lumber: { w: 1.18, ax: 0.570, ay: 1.000 },
  lumber_pit:  { w: 1.18, ax: 0.660, ay: 0.95 },
  lumber_cabin: { w: 1.18, ax: 0.600, ay: 0.97 },
  lumber_saw: { w: 1.15, ax: 0.600, ay: 0.97 },
  lumber_charcoal: { w: 1.15, ax: 0.530, ay: 0.96 },
  lumber_cart: { w: 1.15, ax: 0.500, ay: 0.97 },
  store:  { w: 1.09, ax: 0.522, ay: 1.000 },
  store_granary: { w: 1.09, ax: 0.558, ay: 0.998 },
  store_barn: { w: 1.09, ax: 0.560, ay: 0.99 },
  store_tithe: { w: 1.09, ax: 0.580, ay: 0.99 },
  store_staddle: { w: 1.12, ax: 0.450, ay: 0.97 },
  store_cellar: { w: 1.10, ax: 0.500, ay: 0.97 },
  hall:   { w: 1.15, ax: 0.500, ay: 0.999 },
  hall_2: { w: 1.15, ax: 0.500, ay: 0.995 },
  hall_3: { w: 1.15, ax: 0.500, ay: 0.995 },
  // ax measured 0.344, which is the water trough spilling off the well's
  // lower-left, not the well. Set to the centre of the stone ring by hand --
  // exactly the case measure-art.js warns about for broad-based objects.
  well:   { w: 1.15, ax: 0.500, ay: 0.995 },
  well_iron:   { w: 1.15, ax: 0.500, ay: 0.98 },
  well_thatch: { w: 1.15, ax: 0.500, ay: 0.98 },
  well_pump: { w: 1.15, ax: 0.480, ay: 0.98 },
  well_wish: { w: 1.30, ax: 0.500, ay: 0.96 },
  well_wheel: { w: 1.30, ax: 0.430, ay: 0.97 },
  // the tower base matches its plot; the sails then overhang by a good margin,
  // which is what a windmill does
  mill:   { w: 1.05, ax: 0.551, ay: 0.998 },
  mill_post:   { w: 1.15, ax: 0.520, ay: 0.97 },
  mill_smock:  { w: 1.00, ax: 0.540, ay: 0.98 },
  mill_tower:  { w: 1.10, ax: 0.500, ay: 0.98 },
  mill_cider:  { w: 1.10, ax: 0.500, ay: 0.98 },
  mill_water:  { w: 1.05, ax: 0.520, ay: 0.98 },
  market: { w: 1.10, ax: 0.561, ay: 0.999 },
  market_hall: { w: 1.10, ax: 0.653, ay: 1.000 },
  market_fish: { w: 1.10, ax: 0.560, ay: 0.99 },
  market_cheese: { w: 1.10, ax: 0.600, ay: 0.99 },
  market_fruit: { w: 1.10, ax: 0.520, ay: 0.97 },
  market_flower: { w: 1.10, ax: 0.500, ay: 0.97 },
  // the shed's near post is the front corner; the rock cut rises behind it
  quarry: { w: 1.18, ax: 0.680, ay: 1.000 },
  quarry_pit:  { w: 1.18, ax: 0.637, ay: 1.000 },
  quarry_slate: { w: 1.18, ax: 0.640, ay: 0.99 },
  quarry_marble: { w: 1.18, ax: 0.620, ay: 0.99 },
  quarry_sand: { w: 1.18, ax: 0.549, ay: 0.98 },
  quarry_clay: { w: 1.18, ax: 0.500, ay: 0.97 },
  /* The landmarks found on claimed land. A scattered group has no front
     corner of its own -- the lowest pixel is whichever stone or tree
     happens to stand nearest -- so ax is the middle of the group, set by
     eye, as the well's is. */
  find_stones:  { w: 0.88, ax: 0.500, ay: 0.997 },
  find_orchard: { w: 1.00, ax: 0.540, ay: 0.998 },
  find_ruin:    { w: 1.00, ax: 0.537, ay: 0.997 },
  find_wreck:   { w: 1.00, ax: 0.500, ay: 1.000 },
};
const FIT_DEF = { w: 1.2, ax: 0.5, ay: 1 };

/* ---------- scenery ----------
   Seeded from the tile index so the trees never move between frames or reloads,
   and never need storing in the save. */
/* A plain XOR of two multiples barely mixes for small c/r -- measured 0..0.25
   across the whole grid, so nothing ever cleared the scenery threshold. This is
   an integer avalanche hash, verified uniform over the grid. */
function hash(c,r){
  let h = (Math.imul(c, 374761393) + Math.imul(r, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const SCENERY=[];
for(let r=0;r<GH;r++) for(let c=0;c<GW;c++){
  const n=hash(c,r);
  const edge = c<1||r<1||c>=GW-1||r>=GH-1;
  if(n>0.86 || (edge && n>0.55)){
    // a second, independent hash picks the variety -- reusing n would tie the
    // kind to the threshold above and put every rock in the same places
    const v=hash(c*7+3, r*11+5);
    /* Rocks and pines keep exactly the share of tiles they always had; the
       oaks give some of theirs to birches and flowering cherries, the bushes some of theirs to
       stumps and wildflowers, so the island reads less like four stamps
       repeated and nothing moves. The sheep take one tile from the bushes and
       one from the flowers: the island is fixed, and its small scenery falls on
       eight tiles -- three rocks, then values .603 .669 .765 .903 .923 -- so
       the bands are set to give one bush, one grazing sheep, one stump, one
       patch of flowers and one sheep lying down, rather than a share that
       would have turned both flower tiles into sheep. The goat has since
       taken the stump's tile (.765): a goat grazing beside the sheep is worth
       more to the island than a cut stump, which comes back if it is missing. */
    const kind = n>0.955 ? (v<0.55?'rock':v<0.64?'bush':v<0.72?'sheep':v<0.80?'goat':v<0.86?'stump':v<0.915?'flowers_wild':'sheep_rest')
                         : (v<0.62?'tree_pine':v<0.76?'tree_oak':v<0.84?'tree_cherry':'tree_birch');
    SCENERY.push({c,r,kind,rock:kind==='rock',s:0.78+((n*97)%1)*0.5,f:(n*31)%1});
  }
}

/* ---------- villagers ----------
   One per house-pop, wandering between finished buildings. They are what makes a
   base read as ALIVE rather than as a diagram -- the reference footage is mostly
   little figures walking around. */
const villagers=[];
/* Walking pace, world px per second. A tile is 128 wide, so at the 26 this
   started at a villager took ten seconds to cross two tiles and spent most of
   the game in transit rather than working -- the first delivery landed a minute
   in. Fast enough to look purposeful, slow enough to watch. */
const VIL_SPD=58;
/* How far a villager covers between footfalls.

   The walk used to be a clock: the phase driving the bob advanced at a flat
   seven radians a second whatever the legs were doing. A villager on a road
   moves at better than twice the speed and was still rocking at walking
   cadence, so he skated -- the one thing that reads as broken however good
   the rest of the figure looks. Phase comes off the ground covered now, so
   the feet keep up with the floor by construction.

   Cadence rises with speed and so does stride length, which is why the
   hurrying villager is not simply twice as frantic: at walking pace this is
   a step every 24 world pixels, about two and a half a second, and on a road
   a longer step at about three and a half. */
const STRIDE = 24;
const strideFor = spd => STRIDE * Math.sqrt(Math.max(0.25, spd / VIL_SPD));
/* The last few steps of any journey, which used to be three magic numbers in
   three functions. A worker does not stand at the centre of the building they
   work at, they do not walk to the centre of the store either, and they stop
   short rather than landing on the spot. For every ordinary walk that is a
   rounding error on eight seconds. For a building that is its OWN store it is
   the entire journey -- see SELF_TRIP. */
const POST_SPREAD = { x: 34, y: 18 };   // how far off centre a worker stands
const DROP_Y = 10;                      // where a load is set down, below the store's centre
const ARRIVE = 6;                       // close enough: the walk ends here
/* Paths are not decoration any more. A villager on one moves more than twice as
   fast, which makes laying a road from a farm to the storehouse a real economic
   act with a real cost -- and gives the cheapest decoration in the game a reason
   to exist beyond looking tidy. */
const PATH_SPEED = 2.2;
let pathSet = new Set();
const rebuildPaths = () => {
  pathSet = new Set();
  for (const p of placed) if (p.key === 'path') pathSet.add(p.c + ',' + p.r);
};
// what each workplace's round trip costs, worked out once per change
let travelCache = new Map();
function onPath(x, y) {
  if (!pathSet.size) return false;
  const t = tileAt(x, y);
  return pathSet.has(t.c + ',' + t.r);
}

/* ---------- how well a workplace is doing ----------
   Half the economy is decided by how far a villager has to carry a load, and
   until now that was invisible: a farm across the island produced half what an
   identical farm beside the storehouse did, and nothing said so. Surfacing it
   is what turns "drop buildings anywhere" into laying out a village.

   A villager's cycle is: fill up at the workplace, walk to a store, walk back.
   Efficiency is the share of that cycle actually spent producing. */
/* Is there a store to walk to at all? Returns null when there is none, which
   is what tells a building that cannot deliver anything apart from one that is
   merely inefficient. (This replaced a distance-in-grid-tiles helper: nothing
   should be priced in tiles, because the same tile count is a different walk
   depending on which way it runs.) */
function hasStore(p) {
  const c = centreOf(p);
  return nearestStore(c.x, c.y) ? true : null;
}
/* Seconds a villager spends walking a load from here to the nearest store and
   back, counting the paved tiles the route crosses.

   Measured in the pixels a villager ACTUALLY covers. It used to un-squash the
   distance back into grid tiles and then price every tile at a full tile-width
   of walking -- which double-counts movement up and down the screen, because
   un-squashing stretches the vertical axis and the villager does not walk the
   stretched version. A store two tiles away up the screen was charged 256px for
   a 128px walk, while one two tiles away across the screen was charged
   correctly, so the penalty was up to two-fold and depended on which way the
   store happened to lie. Every efficiency, upgrade quote, well figure and
   offline total came off that number.

   It used to cost the walk at the plain pace whatever the ground was, and call
   that a floor the player could trust. It was a floor 33% below the truth on a
   paved route -- and worse, it meant the cheapest thing in the game, a five-wood
   path that speeds a villager up more than twice over, changed no number the
   player could see. Nothing taught them roads did anything at all. Now laying
   one makes the delivery figure on the panel go up, which is the whole lesson. */
/* The round trip a worker makes WITHOUT LEAVING the building they work at.

   routeOf measures centre to centre, and for every ordinary workplace that is
   right to within a fifth of a per cent -- measured, over fifteen simulated
   minutes: a farm quoted 0.7981/s delivered 0.8000, a mill 3.0563 delivered
   3.0667. The worker's post is scattered either side of the centre and the
   scatter cancels over a long walk.

   It does not cancel when the distance is zero. A market is its own store, so
   nearestStore returns the market itself, the centres coincide and the walk
   comes out as nothing at all -- while the worker really does step out to a
   post, fill a load, carry it back to the drop point and go again. Measured,
   that cost the market up to a tenth of what its panel promised: 3.9600/s
   quoted against 3.6089 delivered at level five, 1.8700 against 1.7511 at
   level three. The error grows with the level because the fill time shrinks
   and the walk does not.

   A floor rather than a term added to every route, because the measurements
   say so at both ends: at distance zero the walk is entirely this, and at
   eight seconds it is already accounted for. Integrated over the post
   scatter, with the same arrival slack the walk itself uses -- a worker stops
   ARRIVE short of each target, which is two thirds of a second across a
   journey this size and the reason a plain expectation came out 0.78 against
   the 0.57 the village actually runs at. Deterministic quadrature, so it is
   the same number on every machine and every run. */
const SELF_TRIP = (() => {
  const N = 64;
  let sum = 0;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const dx = ((i + 0.5) / N * 2 - 1) * POST_SPREAD.x;
    const dy = ((j + 0.5) / N * 2 - 1) * POST_SPREAD.y;
    sum += Math.max(0, Math.hypot(dx, dy - DROP_Y) - ARRIVE);
  }
  return 2 * (sum / (N * N)) / VIL_SPD;
})();
/* Which buildings keep their own goods: the hall, and anything with storage.

   Four places were asking this and they did not all agree. rebuildStores
   decides what counts as a store by it; the building panel suppresses the
   round-trip row by it, because a storehouse's walk is not a thing to advise
   anybody about; and the two below -- the route and the best route -- did not
   ask it at all, which is the whole of the fault this comment sits above. */
const storesItself = key => { const b = B(key); return !!b && (!!b.caps || key === 'hall'); };
function routeOf(p) {
  const key = p.id;
  if (key !== undefined && key !== -1) {
    const hit = travelCache.get(key);
    if (hit !== undefined) return hit;
  }
  const c = centreOf(p), s = nearestStore(c.x, c.y);
  let out;
  /* A market stores for itself, so it carries nothing anywhere: the load is
     set down where it was made and the trip is the one a worker makes inside
     their own building.

     A market standing on the island already got this answer, by accident --
     it is in the store list, so nearestStore hands it back to itself at
     nought distance. A market that is not standing yet is not in that list,
     so the pill under the player's finger priced its round trip as a walk to
     somebody else's storehouse, and quoted a different number for every tile
     on an island where the tile makes no difference at all. Measured against
     the panel of the market afterwards: 0.30/s here, 0.42/s here, 0.23/s
     here, and 0.53/s delivered wherever it was actually put. The dearest
     building in the tray, sold on a figure up to a factor of two under what
     it does, with the spread presented as a reason to choose.

     Asked of the building rather than of the store list, so it is the same
     answer before it is built, while it is going up, and after. */
  if (storesItself(p.key)) out = { secs: SELF_TRIP, paved: 0 };
  else if (!s) out = { secs: 0, paved: 0 };
  else {
    const d = centreOf(s);
    const dist = Math.hypot(d.x - c.x, d.y - c.y);
    let frac = 0;
    if (pathSet.size) {
      /* Villagers walk straight at their target, so the route is the straight
         line between the two. Sample it, and add the time up per stretch -- an
         average SPEED would be wrong, because the slow stretches take longer
         and so count for more of the journey. */
      const n = Math.max(4, Math.min(48, Math.round(dist / 24)));
      let hits = 0;
      for (let i = 0; i < n; i++) {
        const f = (i + 0.5) / n;
        if (onPath(c.x + (d.x - c.x) * f, c.y + (d.y - c.y) * f)) hits++;
      }
      frac = hits / n;
    }
    // never less than the trip a worker makes inside their own building
    out = { secs: Math.max(SELF_TRIP, 2 * dist * (frac / (VIL_SPD * PATH_SPEED) + (1 - frac) / VIL_SPD)), paved: frac };
  }
  if (key !== undefined && key !== -1) travelCache.set(key, out);
  return out;
}
const travelSecondsOf = p => routeOf(p).secs;
/* What a workplace running at `rate` actually DELIVERS.

   The cycle is fill-then-carry, so throughput is the load divided by the fill
   time plus the walk. Everything the interface says about the worth of a level,
   a well or a decoration is measured with this, because a multiplier applies to
   the rate and the walk does not care. */
function deliveredWith(p, rate) {
  if (rate <= 0) return 0;
  return CARRY / (CARRY / rate + travelSecondsOf(p));
}
const ratedOf = (p, kind, mul) =>
  rateOf(p, kind) * boostAt(p) * (mul === undefined ? charmMul() : mul);

/* The round trip a workplace gets standing as close to a storehouse as the
   grid will LET it -- searched over every legal relative placement, for this
   footprint against each footprint a load can be carried to.

   It used to be one constant, 2 * hypot(TW/2, TH/2) / VIL_SPD: the walk between
   two buildings whose centres are one tile apart. No two buildings in the game
   can stand that way. Every store is 2x2 and so is the hall, and the smallest
   workplace is 2x1, so the closest two centres can come is 2 tiles for a 2x2
   and 1.5 for a 2x1 -- and in isometric world units the shortest of those is a
   diagonal step, not a straight one, which no closed form catches. Searched
   instead.

   Measured, with a farm at the tightest placement the grid allows beside a
   storehouse: the walk is 3.98s against the constant's 2.47, the panel offered
   1.15/s for moving there, and five minutes of counting the storehouse gave
   1.01. An offer the game could not keep, on the one row that exists to tell a
   player whether moving a building is worth it. The same gap capped reach at
   0.90 for a perfectly placed farm, so "well placed" and the "far" warning were
   both measured against a spot that does not exist. */
const snugCache = new Map();
function snugWalkOf(b) {
  const hit = snugCache.get(b.key);
  if (hit !== undefined) return hit;
  let best = Infinity;
  const here = tileToWorld((b.w - 1) / 2, (b.h - 1) / 2);
  for (const s of BUILDINGS) {
    if (!storesItself(s.key)) continue;               // the same test rebuildStores uses
    for (let dc = -s.w; dc <= b.w; dc++) for (let dr = -s.h; dr <= b.h; dr++) {
      if (dc < b.w && dc + s.w > 0 && dr < b.h && dr + s.h > 0) continue;   // they would overlap
      const t = tileToWorld(dc + (s.w - 1) / 2, dr + (s.h - 1) / 2);
      best = Math.min(best, 2 * Math.hypot(t.x - here.x, t.y - here.y) / VIL_SPD);
    }
  }
  snugCache.set(b.key, best);
  return best;
}
/* What this workplace would deliver in that spot -- the yardstick a placement
   should be judged against.

   Efficiency on its own cannot be that yardstick, because it is not comparable
   between levels: a level five farm empties its stock four times faster than a
   level one, so the same walk costs it far more, and the best figure it can
   EVER show, standing next to a store, is 66% against the level one's 82%. The
   badge threshold of 45% therefore said almost nothing early on and hung a
   warning on seven buildings in ten in a maxed village, where it was both
   unavoidable and useless as advice. Measured against what the same building
   would do in a good spot, the number means the same thing at every level: how
   much of it the walk is taking. */
function bestDeliveredOf(p, lvl) {
  const b = B(p.key);
  if (!b.makes || !b.jobs) return 0;
  const q = lvl === undefined ? p : { ...p, lvl };
  const rate = ratedOf(q, Object.keys(b.makes)[0]);
  return rate <= 0 ? 0 : CARRY / (CARRY / rate + snugWalkOf(b));
}
// 0..1: the share of its potential this building is actually delivering
function reachOf(p) {
  const best = bestDeliveredOf(p);
  return best <= 0 ? 1 : Math.max(0, Math.min(1, deliveredOf(p) / best));
}
/* What this workplace hands over per second -- for ONE pair of hands.

   Throughput scales exactly with the workforce: whatever the staff, a worker
   waits L/rate for a load to be ready and then walks it, so each of them runs
   the same cycle and the building delivers n times this. (That the wait does
   not shorten as the staff grows is not obvious, but it falls out of the
   steady state: the stock fills faster with more hands, and is drawn down
   faster in exactly the same proportion.) */
function deliveredOf(p, lvl) {
  const b = B(p.key);
  if (!b.makes || !b.jobs) return 0;
  const q = lvl === undefined ? p : { ...p, lvl };
  return deliveredWith(q, ratedOf(q, Object.keys(b.makes)[0]));
}
/* And what it is handing over RIGHT NOW, which is nothing at all while the
   scaffolding is up.

   deliveredOf is a question about a LEVEL -- what a building of this kind at
   this level delivers per pair of hands -- and four places asked it when what
   they meant was "what is arriving". The one gate stepVillagers produces
   through is p.t >= 1, and an upgrade is PAID FOR before the work is done: the
   level lands the instant the player taps, so those four counted the new,
   bigger rate on a building that makes nothing until the scaffolding comes
   down. capsSum and livedIn already answer their own questions with the level a
   building is HOLDING, for the same reason -- a thing paid for is not a thing
   finished.

   The resource chips were fixed where they stood, and the note left there said
   the rest of it out loud without following it up: "the new level opens another
   post, so the workforce walks onto the dead building". It does, and that is
   the expensive half. computeJobs ranks posts by this figure and staffs them in
   that order, so paying for an upgrade made the village's best-paying post the
   one that pays nothing, and left a pair of hands standing in the scaffolding
   while a working post went short. Measured on a four-villager village with the
   farm's upgrade held open: 3.17/s arriving before the tap, 2.47/s after, one
   hand of four parked on nothing for as long as the work took.

   Asked without a level, so every caller that wants the hypothetical -- the
   panel's "when it is done", a ghost's badge, the next level's quote, the walk
   penalty measured against a perfect spot -- still names the level it means and
   is untouched by this. */
const deliveringNow = p => p.t < 1 ? 0 : deliveredOf(p);
// how many pairs of hands a level would really get: the staff it has, plus
// whoever is loitering, and never more posts than the level opens
/* Hands a post could actually get, which is not the same as hands with no job
   at all.

   The hall's woodpile is a fallback, not a career: whoever is on it leaves the
   moment a real workplace has room. Counting only the genuinely jobless made
   the tray lie in the first ninety seconds of a new village -- the goal says
   "build a lumber camp", the button under it says "none free", and building it
   anyway brings the caretaker straight over and takes wood from 0.15/s to
   0.40/s. The same contradiction the goal ORDER was reshuffled to avoid, still
   there in the warning itself.

   exceptId leaves out a post's OWN staff, so quoting the hall's next level does
   not count its woodpile hands as spare hands coming to it. */
function freeHands(exceptId) {
  let n = 0;
  for (const v of villagers) {
    if (v.job == null) { n++; continue; }
    if (v.job === exceptId) continue;
    const q = byId(v.job);
    if (q && q.key === 'hall') n++;
  }
  return n;
}
function handsFor(p, lvl) {
  const have = workersAt(p.id);
  return Math.max(have, Math.min(jobsOf({ ...p, lvl }), have + freeHands(p.id)));
}
/* Small loads on purpose. A big load means the resource counter sits still for
   half a minute and then jumps, which reads as a broken game; small ones keep
   something arriving every few seconds. */
const CARRY=8;
const STOCK_MAX=CARRY*2;    // a workplace stops filling once it has this much waiting

/* ---------- time of day ----------
   Driven off the wall clock rather than a counter, so the cycle carries on
   while the game is shut and you come back to a different hour instead of
   always to the moment you left. It also gives the lamp decoration a reason to
   exist: until now it was an ornament that glowed at noon.

   Night is capped well short of black. This is a village you are meant to keep
   playing in, not a stealth game, and a build bar you cannot read at 2am is a
   bug however pretty it looks. */
const DAY_MS = 8 * 60 * 1000;         // a full cycle
const NIGHT_MAX = 0.36;               // strongest wash, tuned to stay readable
const dayPhase = () => (Date.now() % DAY_MS) / DAY_MS;

/* sun: 1 at noon, 0 at dawn and dusk, -1 at midnight.

   The night used to begin while the sun was still a quarter of the way up and
   creep in from there, which washed the island navy for 58% of every day --
   most of the time anyone looked at it, the village was dimmer than its own
   pictures. It now begins once the sun is well down and is fully dark only
   around midnight: dimmed for 40% of the day and at its darkest for 14%,
   with dusk and dawn left to the warm light. */
function sky() {
  const sun = Math.cos((dayPhase() - 0.25) * Math.PI * 2);
  const night = Math.max(0, Math.min(1, (-0.3 - sun) / 0.6));
  const warm = Math.max(0, 1 - Math.abs(sun) * 2.6);   // peaks at sunrise and sunset
  return { sun, night, warm };
}
function drawSky() {
  const { night, warm } = sky();
  if (night <= 0.001 && warm <= 0.001) return;
  g.save();
  if (warm > 0) {                      // low sun spills orange across everything
    g.fillStyle = 'rgba(255,146,58,' + (0.20 * warm).toFixed(3) + ')';
    g.fillRect(0, screenTop(), W, screenBot() - screenTop());
  }
  if (night > 0) {
    g.fillStyle = 'rgba(16,30,74,' + (NIGHT_MAX * night).toFixed(3) + ')';
    g.fillRect(0, screenTop(), W, screenBot() - screenTop());
  }
  g.restore();
}
/* Weather in the air, by season: snow drifting down in winter, leaves in
   autumn, blossom petals in spring, and on summer nights fireflies. Painted
   on the screen, not the world, so it costs the same at any zoom, and kept
   no state: each mote's place is worked out from the clock and its number, so
   nothing is spawned, stored or saved. Thin on purpose -- it is the air
   between you and the village, not a storm -- and off for reduced motion. */
const AMBIENT = {
  winter: { n: 60, fall: 34, sway: 18, size: [2, 4], col: () => 'rgba(255,255,255,0.85)' },
  autumn: { n: 18, fall: 26, sway: 46, size: [5, 8], col: i => ['#c8541e', '#e0892a', '#b8321c', '#d9a52c'][i % 4] },
  spring: { n: 18, fall: 20, sway: 40, size: [2.6, 4], col: i => (i % 3 ? '#f7c6d6' : '#fde6ee') },
};
const frac = x => x - Math.floor(x);
const rnd = (i, k) => frac(Math.sin(i * 127.1 + k * 311.7) * 43758.5453);
/* By day the sky is there too, though the camera never looks at it: the
   shadows of a few clouds sliding over island and sea, and now and then a
   gull crossing. Both fade out as the light goes. */
const CLOUDS = 3, GULLS = 3;
/* Some days are wet: a quarter of them in spring and autumn, one in ten in
   summer, none in winter (it snows instead). Which ones is worked out from the
   day's number, so it needs no state and is the same for everyone. The shower
   comes in and goes out over the first and last tenth of the day rather than
   switching on. */
const RAIN_SHARE = { spring: 0.25, summer: 0.1, autumn: 0.25 };
function rainNow() {
  const share = RAIN_SHARE[season().key];
  if (!share) return 0;
  const day = Math.floor(Date.now() / DAY_MS), ph = dayPhase();
  if (rnd(day, 16) >= share) return 0;
  return Math.min(1, ph / 0.1, (1 - ph) / 0.1);
}
/* The morning after a wet day, as the mist lifts, a rainbow stands over the
   island for a while and fades. */
function rainbowNow() {
  const share = RAIN_SHARE[season().key], ph = dayPhase();
  if (!share || ph < 0.03 || ph > 0.2) return 0;
  if (rnd(Math.floor(Date.now() / DAY_MS) - 1, 16) >= share || rainNow() > 0) return 0;
  return Math.min(1, (ph - 0.03) / 0.04, (0.2 - ph) / 0.06);
}
const RAINBOW = ['255,70,60', '255,150,40', '255,228,70', '90,210,90', '70,150,255', '130,90,230'];
function drawRainbow(top, hh, k) {
  const cx = W * 0.55, cy = top + hh * 0.72, r0 = W * 0.8, band = W * 0.024;
  g.lineWidth = band;
  RAINBOW.forEach((c, i) => {
    g.strokeStyle = 'rgba(' + c + ',' + (0.26 * k).toFixed(3) + ')';
    g.beginPath(); g.arc(cx, cy, r0 - i * band, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
  });
}
/* On a clear night now and then a star falls: a short bright streak across
   the dark, one every several seconds at most. */
function drawShootingStars(t, top, hh, night) {
  g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
  for (let i = 0; i < 2; i++) {
    const cyc = 7 + i * 4, k = t / cyc + i * 0.37, n = Math.floor(k), ph = frac(k);
    if (ph > 0.09 || rnd(n, 30 + i) > 0.35) continue;
    const q = ph / 0.09, dir = rnd(n, 32 + i) < 0.5 ? 1 : -1, len = W * 0.18;
    const sx = W * (0.15 + 0.7 * rnd(n, 34 + i)), sy = top + hh * (0.05 + 0.4 * rnd(n, 36 + i));
    const x = sx + dir * q * W * 0.3, y = sy + q * hh * 0.12;
    const al = night * Math.sin(q * Math.PI);
    const gr = g.createLinearGradient(x, y, x - dir * len, y - len * 0.4);
    gr.addColorStop(0, 'rgba(255,255,236,' + (0.95 * al).toFixed(3) + ')');
    gr.addColorStop(1, 'rgba(200,220,255,0)');
    g.strokeStyle = gr; g.lineWidth = 4;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x - dir * len, y - len * 0.4); g.stroke();
  }
  g.globalCompositeOperation = 'source-over';
}
/* Butterflies on fine spring and summer days: a few wandering on loose loops
   over the island, wings opening and closing. Their loops are laid on the
   island and their size follows the zoom, so they stay over the grass. */
const BUTTERFLY = ['#f4c430', '#ffffff', '#f08a3c', '#8fb8f0', '#f2a0c8'];
function drawButterflies(t, k) {
  const b = worldBounds(), cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, rx = (b.x1 - b.x0) / 2, ry = (b.y1 - b.y0) / 2;
  for (let i = 0; i < 6; i++) {
    const s1 = 0.05 + rnd(i, 40) * 0.05, s2 = 0.07 + rnd(i, 41) * 0.05;
    // a loop inside the diamond of the island: |u| + |v| stays under 0.8
    const p = 0.4 * Math.sin(t * s1 + i * 2.3) + 0.04 * Math.sin(t * 1.3 + i), q = 0.4 * Math.sin(t * s2 + i * 1.7);
    const at = camProject(cx + rx * (p + q), cy + ry * (q - p) - 40), x = at.x, y = at.y;
    const flap = 0.25 + 0.75 * Math.abs(Math.sin(t * 11 + i * 5)), sz = 17 * Math.min(1.4, camScale() / 1.25);
    g.save(); g.translate(x, y); g.globalAlpha = k;
    g.fillStyle = BUTTERFLY[i % BUTTERFLY.length];
    for (const sd of [-1, 1]) {
      g.beginPath(); g.ellipse(sd * sz * 0.55 * flap, -sz * 0.2, sz * 0.6 * flap, sz * 0.75, 0, 0, 7); g.fill();
      g.beginPath(); g.ellipse(sd * sz * 0.4 * flap, sz * 0.45, sz * 0.4 * flap, sz * 0.45, 0, 0, 7); g.fill();
    }
    g.fillStyle = '#3a2a1c'; g.fillRect(-2.5, -sz * 0.6, 5, sz * 1.3);
    g.restore();
  }
}
/* In autumn the wind gets up every three-quarters of a minute or so and carries
   a whirl of leaves across the view, tumbling round a centre that travels. */
const GUST_S = 45, GUST_LEN = 0.24, GUST_LEAVES = 30, GUST_COL = ['#d9782a', '#b8402a', '#e6b13c', '#a8622a'];
function gustNow() {
  if (season().key !== 'autumn' || rainNow() > 0) return -1;
  const ph = frac(Date.now() / 1000 / GUST_S);
  return ph < GUST_LEN ? ph / GUST_LEN : -1;
}
function drawGust(t, top, hh, q) {
  const n = Math.floor(Date.now() / 1000 / GUST_S), dir = rnd(n, 62) < 0.5 ? 1 : -1, span = W + 900;
  const cy = top + hh * (0.25 + 0.4 * rnd(n, 63)) + (q - 0.5) * hh * 0.1;
  for (let col = 0; col < GUST_COL.length; col++) {        // one fill a colour, however many leaves
    g.fillStyle = GUST_COL[col];
    g.beginPath();
    for (let i = col; i < GUST_LEAVES; i += GUST_COL.length) {
      // strung out along the path, so the whirl has a head and a trailing tail
      const c = (dir > 0 ? -450 + q * span : W + 450 - q * span) - dir * rnd(i, 64) * 320;
      const r = 30 + rnd(i, 65) * 130, a = t * (3 + rnd(i, 66) * 2) + i * 2.4, sz = 11 + rnd(i, 67) * 8;
      const x = c + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.55 + rnd(i, 68) * 60 - 30;
      g.moveTo(x + sz, y);
      g.ellipse(x, y, sz, sz * (0.3 + 0.3 * Math.abs(Math.sin(a * 2))), a * 1.4, 0, 7);
    }
    g.fill();
  }
}
/* Every couple of minutes on a clear day a hot-air balloon drifts over, high up
   and in no hurry. The colours change from one to the next. */
const BALLOON_S = 140, BALLOON_LEN = 0.32, BALLOON_COL = [['#c8473c', '#f0d9a8'], ['#3f74b5', '#f2c14e'], ['#4f9a62', '#f4ead2'], ['#8a57a8', '#f0b65a']];
function balloonNow() {
  if (rainNow() > 0 || sky().night > 0.4) return -1;
  const ph = frac(Date.now() / 1000 / BALLOON_S);
  return ph < BALLOON_LEN ? ph / BALLOON_LEN : -1;
}
function balloonAt(t, top, hh, q) {
  const n = Math.floor(t / BALLOON_S), dir = rnd(n, 80) < 0.5 ? 1 : -1, span = W + 360;
  return { n, x: dir > 0 ? -180 + q * span : W + 180 - q * span, y: top + hh * (0.24 + rnd(n, 81) * 0.2) + Math.sin(t * 0.5) * 12 };
}
function drawBalloon(t, top, hh, q) {
  const { n, x, y } = balloonAt(t, top, hh, q), R = 74;
  const [a, b] = BALLOON_COL[n % BALLOON_COL.length];
  g.save(); g.translate(x, y);
  g.strokeStyle = '#5a4230'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(-20, R * 0.9); g.lineTo(-14, R * 1.5); g.moveTo(20, R * 0.9); g.lineTo(14, R * 1.5); g.stroke();
  g.fillStyle = '#8a5f35'; g.beginPath(); g.roundRect(-16, R * 1.5, 32, 25, 5); g.fill();
  g.strokeStyle = 'rgba(30,24,20,.6)'; g.lineWidth = 2.5; g.stroke();
  // the skirt, then the gores as nested ellipses in turn
  g.fillStyle = a;
  g.beginPath(); g.moveTo(-R * 0.72, R * 0.55); g.quadraticCurveTo(-R * 0.3, R * 0.85, -22, R * 1.02);
  g.lineTo(22, R * 1.02); g.quadraticCurveTo(R * 0.3, R * 0.85, R * 0.72, R * 0.55); g.closePath(); g.fill(); g.stroke();
  for (let i = 0; i < 4; i++) {
    g.fillStyle = i % 2 ? b : a;
    g.beginPath(); g.ellipse(0, 0, R * (1 - i * 0.26), R, 0, 0, 7); g.fill();
    if (!i) g.stroke();
  }
  g.fillStyle = 'rgba(255,255,255,.2)'; g.beginPath(); g.ellipse(-R * 0.34, -R * 0.3, R * 0.2, R * 0.42, 0.25, 0, 7); g.fill();
  g.restore();
}
/* Every other day or so, when it is dry and not winter, somebody has the kites
   out: two of them through the daylight, on long strings from the green beside
   the hall, leaning and dipping on the wind with their tails snaking after. */
const KITES = [[-150, 60, '#d8483c', '#f2c14e', 0], [165, 40, '#3f74b5', '#f4ead2', 2.1]];
function kitesNow() {
  const ph = dayPhase(), day = Math.floor(Date.now() / DAY_MS);
  if (season().key === 'winter' || rainNow() > 0 || !hallOf() || ph < 0.04 || ph > 0.44 || rnd(day, 82) >= 0.55) return 0;
  return Math.min(1, (ph - 0.04) / 0.02, (0.44 - ph) / 0.02);
}
function drawKites(t, k) {
  const c = centreOf(hallOf()), s = camScale(), sc = Math.min(1.4, s / 1.25), sz = 38 * sc;
  g.save(); g.globalAlpha = k; g.lineCap = 'round'; g.lineJoin = 'round';
  for (const [dx, dy, a, b, off] of KITES) {
    const gr = camProject(c.x + dx, c.y + dy);
    const x = gr.x + dx * 0.5 * sc + Math.sin(t * 0.4 + off) * 34 * sc, y = gr.y - (300 + Math.sin(t * 0.55 + off * 2) * 30) * sc;
    const lean = Math.sin(t * 0.8 + off) * 0.22;
    g.strokeStyle = 'rgba(245,245,235,.6)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(gr.x, gr.y); g.quadraticCurveTo(gr.x + (x - gr.x) * 0.8, gr.y + (y - gr.y) * 0.45, x, y + sz);
    g.stroke();
    g.save(); g.translate(x, y); g.rotate(lean);
    g.fillStyle = a; g.beginPath(); g.moveTo(0, -sz); g.lineTo(sz * 0.72, -sz * 0.15); g.lineTo(0, sz); g.closePath(); g.fill();
    g.fillStyle = b; g.beginPath(); g.moveTo(0, -sz); g.lineTo(-sz * 0.72, -sz * 0.15); g.lineTo(0, sz); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(40,30,24,.65)'; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(0, -sz); g.lineTo(sz * 0.72, -sz * 0.15); g.lineTo(0, sz); g.lineTo(-sz * 0.72, -sz * 0.15); g.closePath();
    g.moveTo(0, -sz); g.lineTo(0, sz); g.moveTo(-sz * 0.72, -sz * 0.15); g.lineTo(sz * 0.72, -sz * 0.15);
    // the tail, snaking
    g.moveTo(0, sz);
    for (let i = 1; i <= 7; i++) g.lineTo(Math.sin(t * 3.5 + i * 1.1 + off) * (4 + i * 2.2) * sc, sz + i * 13 * sc);
    g.stroke();
    g.fillStyle = b;
    g.beginPath();
    for (const i of [2, 4, 6]) {
      const bx = Math.sin(t * 3.5 + i * 1.1 + off) * (4 + i * 2.2) * sc, by = sz + i * 13 * sc, w = 9 * sc;
      g.moveTo(bx, by); g.lineTo(bx - w, by - w * 0.6); g.lineTo(bx - w, by + w * 0.6); g.closePath();
      g.moveTo(bx, by); g.lineTo(bx + w, by - w * 0.6); g.lineTo(bx + w, by + w * 0.6); g.closePath();
    }
    g.fill();
    g.restore();
  }
  g.restore();
}
/* The visitors can be caught. Each balloon, whale and pod is worth a small share
   of what the stores hold, once, for whoever taps it while it is there; a sparkle
   rides above any that has not been tapped yet. Shares of the caps rather than
   amounts, so a visit means the same to a first village as to a full one. */
const SPOT_SHARE = { balloon: 0.05, whale: 0.08, pod: 0.04 }, SPOT_RES = { balloon: 'food', whale: 'wood', pod: 'food' };
const spotTaken = { balloon: -1, whale: -1, pod: -1 };
function visitors() {
  const t = Date.now() / 1000, top = screenTop(), hh = screenBot() - top, out = [], u = 2.2 / camScale();
  const q1 = balloonNow();
  if (q1 >= 0 && !reduceMotion) { const a = balloonAt(t, top, hh, q1); out.push({ id: 'balloon', n: a.n, x: a.x, y: a.y, r: 100, up: 92 }); }
  const q2 = whaleNow();
  if (q2 >= 0) { const a = whaleAt(t, q2), c = camProject(a.x, a.y), s = camScale(); out.push({ id: 'whale', n: a.n, x: c.x, y: c.y, r: 120, up: 34 * u * s }); }
  const q3 = podNow();
  if (q3 >= 0) { const a = podAt(t), c = camProject(a.at.x, a.at.y), s = camScale(); out.push({ id: 'pod', n: a.n, x: c.x, y: c.y, r: 130, up: 42 * u * s }); }
  return out.filter(v => v.n !== spotTaken[v.id] && v.y > screenTop() && v.x > 0 && v.x < W);
}
function drawVisitorSparkles(t) {
  const list = visitors();
  if (!list.length) return;
  g.save(); g.fillStyle = '#ffe07a'; g.strokeStyle = 'rgba(120,70,10,.7)'; g.lineWidth = 2; g.lineJoin = 'round';
  g.globalAlpha = 0.72 + 0.28 * Math.sin(t * 5);
  g.beginPath();
  for (const v of list) {                 // a four-pointed star, and a small one beside it
    const y = v.y - v.up + Math.sin(t * 2.4) * 7;
    for (const [cx, cy, R] of [[v.x, y, 24 + Math.sin(t * 5) * 3], [v.x + 24, y - 20, 10]]) {
      g.moveTo(cx, cy - R);
      g.quadraticCurveTo(cx, cy, cx + R, cy); g.quadraticCurveTo(cx, cy, cx, cy + R);
      g.quadraticCurveTo(cx, cy, cx - R, cy); g.quadraticCurveTo(cx, cy, cx, cy - R);
      g.closePath();
    }
  }
  g.fill(); g.stroke();
  g.restore();
}
function catchVisitor(sx, sy) {
  const v = visitors().find(o => Math.hypot(sx - o.x, sy - o.y) < o.r);
  if (!v) return false;
  spotTaken[v.id] = v.n;
  const w = camUnproject(v.x, v.y), k = SPOT_RES[v.id];
  if (grant(k, Math.max(5, Math.round(caps[k] * SPOT_SHARE[v.id])), w.x, w.y) > 0.01) SFX.goal(); else SFX.tap();
  save();
  return true;
}
/* Noon, by the hall bell: three strokes, and the doves that live on the roof go
   up at the noise, wheel round for twenty seconds and come back down. */
const NOON = 0.25, NOON_LEN = 0.04, DOVES = 7;
function dovesNow() {
  const q = (dayPhase() - NOON) / NOON_LEN;
  return q >= 0 && q <= 1 && rainNow() === 0 && hallOf() ? q : -1;
}
function drawDoves(t, q) {
  const c = centreOf(hallOf()), s = camScale(), sz = 20 * Math.min(1.4, s / 1.25);
  const out = Math.sin(Math.PI * q);   // up and away, then home again
  g.lineCap = 'round';
  for (const [col, lw] of [['rgba(50,56,66,.75)', 10], ['#fbfaf3', 5.5]]) {
    g.strokeStyle = col; g.lineWidth = lw;
    g.beginPath();
    for (let i = 0; i < DOVES; i++) {
      const a = i / DOVES * 6.283 + t * 0.55, r = out * (70 + rnd(i, 60) * 45);
      const at = camProject(c.x + Math.cos(a) * r, c.y - 70 - out * (75 + rnd(i, 61) * 45) + Math.sin(a) * r * 0.5);
      const lift = sz * (0.15 + 0.5 * Math.sin(t * 13 + i * 2.1));
      g.moveTo(at.x - sz, at.y - lift); g.quadraticCurveTo(at.x - sz * 0.4, at.y - lift - 3, at.x, at.y);
      g.quadraticCurveTo(at.x + sz * 0.4, at.y - lift - 3, at.x + sz, at.y - lift);
    }
    g.stroke();
  }
}
/* Spring and autumn bring the geese over: one long V crossing every minute and
   a half or so, north in spring and south in autumn, which here is up and down
   the screen's slant. */
const GEESE_MS = 90, GEESE = 4;
function drawGeese(t, top, hh, day, key) {
  const k = t / GEESE_MS, ph = frac(k), n = Math.floor(k);
  if (ph > 0.45) return;
  const q = ph / 0.45, dir = key === 'spring' ? 1 : -1, span = W + 700;
  const hx = dir > 0 ? -350 + q * span : W + 350 - q * span;
  const hy = top + hh * (0.12 + 0.4 * rnd(n, 50)) - dir * (q - 0.5) * hh * 0.12;
  g.strokeStyle = 'rgba(30,34,38,' + (0.8 * day).toFixed(3) + ')'; g.lineWidth = 5; g.lineCap = 'round';
  g.beginPath();
  for (let j = -GEESE; j <= GEESE; j++) {
    const x = hx - dir * Math.abs(j) * 62, y = hy + j * 40;
    const lift = 5 + Math.sin(t * 6 + j * 1.4) * 7, w = 20;
    g.moveTo(x - w, y - lift); g.quadraticCurveTo(x - w * 0.4, y - lift - 3, x, y);
    g.quadraticCurveTo(x + w * 0.4, y - lift - 3, x + w, y - lift);
  }
  g.stroke();
}
/* And for a little while after sunset in summer and autumn, bats: a few dark
   flickers on quick, jinking paths, gone once it is properly night. */
function batsNow() {
  const key = season().key, ph = dayPhase();
  if ((key !== 'summer' && key !== 'autumn') || ph < 0.47 || ph > 0.62 || rainNow() > 0) return 0;
  return Math.min(1, (ph - 0.47) / 0.03, (0.62 - ph) / 0.04);
}
function drawBats(t, top, hh, k) {
  g.fillStyle = 'rgba(18,14,24,' + (0.92 * k).toFixed(3) + ')';
  for (let i = 0; i < 6; i++) {
    const x = W * (0.5 + 0.44 * Math.sin(t * 0.31 + i * 2.1) + 0.05 * Math.sin(t * 3.1 + i));
    const y = top + hh * (0.34 + 0.26 * Math.sin(t * 0.37 + i * 1.3) + 0.04 * Math.sin(t * 4.3 + i * 2));
    const f = Math.sin(t * 19 + i * 3), w = 24, up = f * 11;
    g.beginPath(); g.moveTo(x, y + 5);
    g.quadraticCurveTo(x - w * 0.5, y - 5 + up * 0.4, x - w, y + up);
    g.lineTo(x - w * 0.55, y + 3 + up * 0.5); g.lineTo(x, y + 9);
    g.lineTo(x + w * 0.55, y + 3 + up * 0.5); g.lineTo(x + w, y + up);
    g.quadraticCurveTo(x + w * 0.5, y - 5 + up * 0.4, x, y + 5);
    g.fill();
  }
}
/* Some wet days turn to storms: every so often a far-off bolt and a soft flash
   over everything, and a moment later the thunder. Kept gentle and well apart
   -- a flash is a fifth of full white at most, never faster than one every
   twenty-odd seconds -- and, like all the weather, off for reduced motion. */
const STORM_SHARE = 0.4, STORM_CYC = 23;
function stormNow() {
  return rainNow() > 0.6 && rnd(Math.floor(Date.now() / DAY_MS), 52) < STORM_SHARE;
}
// the flash of this cycle, if there is one and it has happened yet
function flashAt(t) {
  const k = t / STORM_CYC, n = Math.floor(k);
  if (rnd(n, 53) > 0.6) return null;
  const age = (frac(k) - rnd(n, 54) * 0.85) * STORM_CYC;
  return age < 0 ? null : { n, age };
}
function drawLightning(t, top, hh) {
  const f = flashAt(t);
  if (!f || f.age > 0.7) return;
  const a = f.age, i = a < 0.1 ? 1 : a < 0.18 ? 0.25 : a < 0.28 ? 0.7 : 0.7 * (0.7 - a) / 0.42;
  g.fillStyle = 'rgba(214,226,255,' + (0.2 * i).toFixed(3) + ')';
  g.fillRect(0, top, W, hh);
  if (a > 0.28) return;
  // the bolt, coming down from the top of the view
  let x = W * (0.12 + 0.76 * rnd(f.n, 55)), y = top;
  const end = top + hh * (0.16 + 0.14 * rnd(f.n, 56)), steps = 9;
  g.strokeStyle = 'rgba(240,244,255,' + (0.9 * i).toFixed(3) + ')';
  g.lineWidth = 5; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(x, y);
  for (let j = 1; j <= steps; j++) {
    x += (rnd(f.n + j, 57) - 0.5) * 70; y = top + (end - top) * j / steps;
    g.lineTo(x, y);
  }
  g.stroke();
}
/* One winter night in three the northern lights hang over the top of the view:
   curtains of green going to violet, built from thin columns that brighten and
   fade along their length as the folds drift. */
const AURORA_SHARE = 0.35, AURORA_STEP = 26;
const AURORA = [['90,255,170', '150,90,255', 0], ['70,230,200', '90,120,255', 1], ['140,255,130', '190,90,230', 2]];
function auroraNow() {
  if (season().key !== 'winter' || rnd(Math.floor(Date.now() / DAY_MS), 70) >= AURORA_SHARE) return 0;
  return Math.max(0, (sky().night - 0.3) / 0.7);
}
function drawAurora(t, top, hh, k) {
  g.globalCompositeOperation = 'lighter';
  for (const [c1, c2, b] of AURORA) {
    const y0 = top + hh * (0.03 + b * 0.05), len = hh * (0.24 - b * 0.03);
    for (let x = -AURORA_STEP; x < W + AURORA_STEP; x += AURORA_STEP) {
      const y = y0 + Math.sin(x * 0.006 + t * 0.12 + b * 2) * hh * 0.035 + Math.sin(x * 0.017 - t * 0.2 + b) * hh * 0.012;
      const fold = Math.pow(0.5 + 0.5 * Math.sin(x * 0.011 + t * (0.17 + b * 0.05) + b * 1.7), 2);
      const gr = g.createLinearGradient(0, y, 0, y + len);
      gr.addColorStop(0, 'rgba(' + c2 + ',0)');
      gr.addColorStop(0.25, 'rgba(' + c1 + ',' + (0.3 * k * fold).toFixed(3) + ')');
      gr.addColorStop(1, 'rgba(' + c1 + ',0)');
      g.fillStyle = gr; g.fillRect(x, y, AURORA_STEP, len);
    }
  }
  g.globalCompositeOperation = 'source-over';
}
/* Low sun comes through in shafts: a few slanting bars of gold, from the left
   at sunrise and the right at sunset, breathing slowly. */
const SHAFTS = 5;
function drawShafts(t, top, hh, warm) {
  const dir = dayPhase() < 0.25 || dayPhase() > 0.75 ? 1 : -1, slant = hh * 0.42;
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < SHAFTS; i++) {
    const wid = 70 + rnd(i, 71) * 130, x = W * (0.02 + 0.2 * i + 0.1 * rnd(i, 72)) + Math.sin(t * 0.08 + i * 2) * 26 - dir * slant * 0.5;
    const al = 0.2 * warm * (0.55 + 0.45 * Math.sin(t * 0.3 + i * 1.9));
    const gr = g.createLinearGradient(0, top, 0, top + hh * 0.9);
    gr.addColorStop(0, 'rgba(255,212,140,' + al.toFixed(3) + ')');
    gr.addColorStop(1, 'rgba(255,212,140,0)');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(x, top); g.lineTo(x + wid, top);
    g.lineTo(x + wid + dir * slant, top + hh * 0.9); g.lineTo(x + dir * slant, top + hh * 0.9);
    g.fill();
  }
  g.globalCompositeOperation = 'source-over';
}
/* The night of the full moon is the village's festival: fireworks over the
   island, three going at a time, each a shell climbing and a burst falling
   away. A dry night only. */
const FIREWORKS = 3, FW_BANG = 0.25;
const FW_COLOURS = ['255,120,90', '255,214,100', '130,220,255', '190,140,255', '140,255,170'];
function festivalNow() {
  const day = Math.floor(Date.now() / DAY_MS);
  return ((day % MOON_DAYS) + MOON_DAYS) % MOON_DAYS === MOON_DAYS / 2 && sky().night > 0.5 && rainNow() === 0;
}
function fireworkAt(t, i) {
  const k = t / (3.4 + i * 0.9) + i * 0.31, n = Math.floor(k);
  return { n, ph: k - n };
}
function drawFireworks(t, top, hh) {
  g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
  for (let i = 0; i < FIREWORKS; i++) {
    const { n, ph } = fireworkAt(t, i), id = n * 3 + i;
    const x = W * (0.14 + 0.72 * rnd(id, 80)), y = top + hh * (0.1 + 0.28 * rnd(id, 81));
    const col = FW_COLOURS[Math.floor(rnd(id, 82) * FW_COLOURS.length)];
    if (ph < FW_BANG) {                    // the shell going up
      const q = ph / FW_BANG, sy = top + hh + (y - top - hh) * (1 - (1 - q) * (1 - q));
      g.strokeStyle = 'rgba(255,236,190,0.8)'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(x, sy); g.lineTo(x, sy + 34); g.stroke();
      continue;
    }
    if (ph > 0.8) continue;                // and a dark moment before the next
    const q = (ph - FW_BANG) / (0.8 - FW_BANG), r = 190 * (1 - (1 - q) * (1 - q)), drop = q * q * 70;
    g.fillStyle = 'rgba(' + col + ',' + (1 - q).toFixed(3) + ')';
    g.beginPath();
    for (let j = 0; j < 30; j++) {
      const a = j / 30 * Math.PI * 2 + id, rr = r * (0.35 + 0.65 * rnd(id + j, 83));
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr + drop;
      g.moveTo(px + 5, py); g.arc(px, py, 5, 0, 7);
    }
    g.fill();
  }
  g.globalCompositeOperation = 'source-over';
}
function drawRain(t, top, hh, rain) {
  // the light goes grey under it
  g.fillStyle = 'rgba(70,84,100,' + (0.2 * rain).toFixed(3) + ')';
  g.fillRect(0, top, W, hh);
  if (reduceMotion) return;
  g.strokeStyle = 'rgba(222,232,244,' + (0.6 * rain).toFixed(3) + ')';
  g.lineWidth = 1.7; g.lineCap = 'round';
  g.beginPath();
  const n = Math.round(150 * rain);
  for (let i = 0; i < n; i++) {
    const sp = 0.8 + rnd(i, 17) * 0.4, len = 18 + rnd(i, 18) * 14;
    const y = top + frac(rnd(i, 19) + t * 1.6 * sp) * (hh + 40) - 20;
    const x = frac(rnd(i, 20) - t * 0.05 * sp) * (W + 60) - 30;
    g.moveTo(x, y); g.lineTo(x - len * 0.28, y + len);
  }
  g.stroke();
}
/* Mornings begin in mist: a soft white haze lies over island and sea around
   sunrise and lifts as the sun climbs -- thickest in autumn, thin in summer. */
const MIST = { autumn: 1, spring: 0.8, winter: 0.7, summer: 0.4 };
function mistNow() {
  const ph = dayPhase(), d = ph > 0.5 ? ph - 1 : ph;        // sunrise is phase 0
  if (d < -0.06 || d > 0.1) return 0;
  return (MIST[season().key] || 0) * (d < 0 ? (d + 0.06) / 0.06 : 1 - d / 0.1);
}
function drawMist(t, top, hh, mist) {
  for (let i = 0; i < 7; i++) {
    const span = W + 1200, x = frac(rnd(i, 26) + t * (4 + rnd(i, 27) * 4) / span) * span - 600;
    const y = top + hh * (0.08 + 0.84 * rnd(i, 28)), rw = 420 + rnd(i, 29) * 260;
    g.save(); g.translate(x, y); g.scale(1, 0.4);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, rw);
    gr.addColorStop(0, 'rgba(236,240,244,' + (0.55 * mist).toFixed(3) + ')');
    gr.addColorStop(1, 'rgba(236,240,244,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rw, 0, 7); g.fill();
    g.restore();
  }
}
function drawDaySky(t, top, hh, day) {
  for (let i = 0; i < CLOUDS; i++) {
    const span = W + 900, sp = 9 + rnd(i, 8) * 6;
    const x = frac(rnd(i, 9) + t * sp / span) * span - 450;
    const y = top + hh * (0.15 + 0.7 * rnd(i, 10)) + (x - W / 2) * 0.18;
    const rw = 240 + rnd(i, 11) * 160;
    g.save(); g.translate(x, y); g.scale(1, 0.55);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, rw);
    gr.addColorStop(0, 'rgba(14,30,44,' + (0.10 * day).toFixed(3) + ')');
    gr.addColorStop(0.6, 'rgba(14,30,44,' + (0.06 * day).toFixed(3) + ')');
    gr.addColorStop(1, 'rgba(14,30,44,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rw, 0, 7); g.fill();
    g.restore();
  }
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (let i = 0; i < GULLS; i++) {
    // each gull crosses once in a while and is gone the rest of its cycle
    const cyc = 38 + rnd(i, 12) * 30, ph = frac(t / cyc + rnd(i, 13));
    if (ph > 0.55) continue;
    const dir = rnd(i, 14) < 0.5 ? 1 : -1, q = ph / 0.55;
    const x = dir > 0 ? -40 + q * (W + 80) : W + 40 - q * (W + 80);
    const y = top + hh * (0.1 + 0.5 * rnd(i, 15)) + Math.sin(t * 0.7 + i) * 14;
    const flap = Math.sin(t * 7 + i * 2), w = 9, lift = 3 + flap * 4;
    g.strokeStyle = 'rgba(40,52,60,' + (0.55 * day).toFixed(3) + ')'; g.lineWidth = 3.2;
    g.beginPath(); g.moveTo(x - w, y - lift); g.quadraticCurveTo(x - w * 0.45, y - lift - 2, x, y);
    g.quadraticCurveTo(x + w * 0.45, y - lift - 2, x + w, y - lift); g.stroke();
    g.strokeStyle = 'rgba(250,252,255,' + (0.95 * day).toFixed(3) + ')'; g.lineWidth = 1.8;
    g.stroke();
  }
}
function drawAmbient() {
  if (reduceMotion) return;
  const key = season().key, t = Date.now() / 1000;
  const top = screenTop(), hh = screenBot() - top;
  g.save();
  const day = 1 - sky().night, rain = rainNow();
  if (day > 0.05) drawDaySky(t, top, hh, day * (1 - 0.6 * rain));
  if (rain > 0) drawRain(t, top, hh, rain);
  if (stormNow()) drawLightning(t, top, hh);
  if (festivalNow()) drawFireworks(t, top, hh);
  const warmth = sky().warm;
  if (warmth > 0.15 && rain === 0) drawShafts(t, top, hh, warmth);
  const aurora = auroraNow();
  if (aurora > 0.01) drawAurora(t, top, hh, aurora);
  const mist = mistNow();
  if (mist > 0.01) drawMist(t, top, hh, mist);
  const bow = rainbowNow();
  if (bow > 0.01) drawRainbow(top, hh, bow);
  if (sky().night > 0.6 && rain === 0) drawShootingStars(t, top, hh, sky().night);
  if ((key === 'spring' || key === 'autumn') && rain === 0 && day > 0.5) drawGeese(t, top, hh, day, key);
  const bats = batsNow();
  if (bats > 0.01) drawBats(t, top, hh, bats);
  const kites = kitesNow();
  if (kites > 0.01) drawKites(t, kites);
  const balloon = balloonNow();
  if (balloon >= 0) drawBalloon(t, top, hh, balloon);
  const gust = gustNow();
  if (gust >= 0) drawGust(t, top, hh, gust);
  const doves = dovesNow();
  if (doves >= 0) drawDoves(t, doves);
  drawVisitorSparkles(t);
  if ((key === 'spring' || key === 'summer') && rain === 0 && sky().sun > 0.15) drawButterflies(t, Math.min(1, (sky().sun - 0.15) / 0.2));
  const a = AMBIENT[key];
  if (a) {
    for (let i = 0; i < a.n; i++) {
      const sp = 0.7 + rnd(i, 1) * 0.6, size = a.size[0] + rnd(i, 2) * (a.size[1] - a.size[0]);
      const y = top + frac(rnd(i, 3) + t * a.fall * sp / hh) * hh;
      const x = frac(rnd(i, 4) + t * 0.006 * sp) * W + Math.sin(t * 0.9 * sp + i) * a.sway;
      g.fillStyle = a.col(i);
      if (key === 'winter') { g.beginPath(); g.arc(x, y, size, 0, 7); g.fill(); continue; }
      g.save(); g.translate(x, y); g.rotate(t * 1.3 * sp + i);
      g.scale(1, 0.45 + 0.4 * Math.abs(Math.sin(t * 2 * sp + i)));   // tumbling
      g.beginPath(); g.ellipse(0, 0, size, size * 0.6, 0, 0, 7); g.fill();
      g.restore();
    }
  }
  const night = sky().night;
  if (key === 'summer' && night > 0.05) {
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 22; i++) {
      const x = frac(rnd(i, 5) + Math.sin(t * 0.13 + i) * 0.03) * W;
      const y = top + hh * (0.25 + 0.6 * frac(rnd(i, 6) + Math.cos(t * 0.11 + i * 2) * 0.03));
      const blink = Math.max(0, Math.sin(t * (0.8 + rnd(i, 7)) + i * 3));
      const al = night * blink * 0.9;
      if (al < 0.02) continue;
      const gr = g.createRadialGradient(x, y, 0, x, y, 9);
      gr.addColorStop(0, 'rgba(236,255,140,' + al.toFixed(3) + ')');
      gr.addColorStop(1, 'rgba(200,255,90,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill();
    }
  }
  g.restore();
}
/* Lamps are drawn AFTER the night wash so their light sits on top of it rather
   than being dimmed along with everything else. The light goes where each
   look's lantern is: on top of the post, or hanging off its bracket. */
const LAMP_GLOW = { lamp: { dx: 0, dy: -52 }, lamp_bracket: { dx: 8, dy: -42 }, lamp_stone: { dx: 0, dy: -56 }, lamp_double: { dx: 0, dy: -55 }, lamp_ship: { dx: -10, dy: -52 }, lamp_basket: { dx: 6, dy: -60 }, lamp_crook: { dx: -5, dy: -56 } };
/* The finished lighthouse's lamp, where it sits in the stage-5 picture, and the
   beam it turns over the sea. The beam lies on the ground plane -- squashed to
   the island's 2:1 -- so it sweeps across the water rather than up the sky. */
const LANTERN = { fx: 0.512, fy: 0.201 };
const BEAM_TURN_MS = 14000, BEAM_LEN = 1100, BEAM_HALF = 0.11;
function drawBeam(night) {
  const p = placed.find(q => q.key === BEACON);
  if (!p || p.t < 1 || (p.lvl | 0) < BEACON_STAGES) return;
  const ar = artRect(p);
  if (!ar) return;
  const x = ar.left + LANTERN.fx * ar.wid, y = ar.baseTop + LANTERN.fy * ar.baseH;
  const halo = g.createRadialGradient(x, y, 0, x, y, 70);
  halo.addColorStop(0, 'rgba(255,214,130,' + (0.55 * night).toFixed(3) + ')');
  halo.addColorStop(1, 'rgba(255,190,90,0)');
  g.fillStyle = halo; g.beginPath(); g.arc(x, y, 70, 0, 7); g.fill();
  const turn = reduceMotion ? 0.35 : (Date.now() % BEAM_TURN_MS) / BEAM_TURN_MS;
  const th = turn * Math.PI * 2;
  g.save(); g.translate(x, y); g.scale(1, 0.5);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, BEAM_LEN);
  gr.addColorStop(0, 'rgba(255,226,160,' + (0.34 * night).toFixed(3) + ')');
  gr.addColorStop(0.5, 'rgba(255,214,140,' + (0.12 * night).toFixed(3) + ')');
  gr.addColorStop(1, 'rgba(255,210,130,0)');
  g.fillStyle = gr;
  g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, BEAM_LEN, th - BEAM_HALF, th + BEAM_HALF); g.closePath(); g.fill();
  g.restore();
}
/* And everyone out after dark carries a light: a small warm pool at the hand,
   so the paths show who is walking them. No art -- a lantern at this size is
   a point of light -- and it flickers a little, each on its own beat, except
   for reduced motion. In the lamp pass, after the wash, like the lamps. */
function drawLanterns(night) {
  const t = Date.now() / 1000, r = VILLAGER_H * 0.42;
  for (const v of villagers) {
    const x = v.x + (v.face || 1) * VILLAGER_H * 0.12, y = v.y - VILLAGER_H * 0.42;
    const flick = reduceMotion ? 1 : 0.88 + 0.12 * Math.sin(t * 9 + v.seed * 1.7) * Math.sin(t * 5.3 + v.seed);
    const a = 0.5 * night * flick;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,214,128,' + a.toFixed(3) + ')');
    gr.addColorStop(0.35, 'rgba(255,180,80,' + (a * 0.4).toFixed(3) + ')');
    gr.addColorStop(1, 'rgba(255,170,70,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
}
function drawLamps() {
  const { night } = sky();
  if (night < 0.04) return;
  g.save();
  g.globalCompositeOperation = 'lighter';
  drawBeam(night);
  drawLanterns(night);
  for (const p of placed) {
    if (p.key !== 'lamp') continue;
    const at = LAMP_GLOW[lookOf(p)] || LAMP_GLOW.lamp;
    const o = tileToWorld(p.c, p.r), x = o.x + at.dx, y = o.y + at.dy;
    const r = 92, gr = g.createRadialGradient(x, y, 0, x, y, r);
    const a = 0.50 * night;
    gr.addColorStop(0, 'rgba(255,206,120,' + a.toFixed(3) + ')');
    gr.addColorStop(0.45, 'rgba(255,178,80,' + (a * 0.35).toFixed(3) + ')');
    gr.addColorStop(1, 'rgba(255,170,70,0)');
    g.fillStyle = gr;
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  g.restore();
}

/* ---------- sound ----------
   Synthesised rather than sampled: a handful of oscillators and envelopes cost
   nothing to ship, need no art pass, and cannot be the wrong style. Everything
   here is a short shaped tone, which is enough to make an action feel like it
   landed.

   The context is created on the FIRST TOUCH and not before. Browsers refuse to
   start audio without a gesture, and a context made at load sits in 'suspended'
   for ever -- silently, so it looks like the code is broken rather than the
   policy. */
let actx = null, master = null, muted = false;
let lastDeliverAt = 0;

function audioOn() {
  /* Anything but running. iOS reports 'interrupted', not 'suspended', after a
     phone call or a trip to the background, and checking only for suspended
     left the game silent until it was restarted. */
  if (actx) { if (actx.state !== 'running' && actx.state !== 'closed') actx.resume().catch(() => {}); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try {
    actx = new AC();
    master = actx.createGain();
    master.gain.value = 0.35;
    master.connect(actx.destination);
  } catch (e) { actx = null; }
}

/* One shaped tone. type/freq/dur describe it; slide bends the pitch, which is
   what separates a rising "that worked" from a falling "that did not". */
function tone({ f = 440, to = 0, type = 'sine', dur = 0.14, vol = 0.5, delay = 0 }) {
  /* Nothing is sounded while nobody is listening, for the same reason nothing
     is painted while nobody is watching -- and here it does not merely go to
     waste, it piles up. The village keeps working in the background, its
     deliveries keep ringing, and the context is suspended: a suspended context
     stops its clock, so every one of those tones is scheduled for the SAME
     frozen instant, and none of them can be collected while it waits to play.

     They all fire together on the first touch after coming back. Measured: one
     tap peaks at 9 of 128 full scale, two hundred queued tones peak at 128 --
     hard clipped, fourteen times a tap. A night on the home screen queues
     about fourteen hundred. The player's welcome back was a bang. */
  if (!actx || muted || document.hidden) return;
  const t0 = actx.currentTime + delay;
  const o = actx.createOscillator(), gn = actx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(Math.max(30, to), t0 + dur);
  // a quick attack and a smooth tail; a square cut at the end clicks
  gn.gain.setValueAtTime(0.0001, t0);
  gn.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(gn); gn.connect(master);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

/* The air has a sound too, under the tones: the sea murmuring at the cliffs,
   rain hissing on a wet day, and crickets on a summer night. The two beds are
   one looped buffer of noise each, filtered -- the surf low, the rain high --
   so they cost no oscillators and nothing per frame but two gain targets. They
   go to nothing when the game is muted or out of sight; the crickets are
   ordinary tones and so stand down by tone()'s own rule. */
let beds = null;
function bedsOn() {
  if (beds || !actx) return;
  try {
    const len = actx.sampleRate * 2, buf = actx.createBuffer(1, len, actx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const bed = (type, f, q) => {
      const src = actx.createBufferSource(); src.buffer = buf; src.loop = true;
      const fl = actx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
      const gn = actx.createGain(); gn.gain.value = 0;
      src.connect(fl); fl.connect(gn); gn.connect(master); src.start();
      return gn;
    };
    beds = { rain: bed('bandpass', 2400, 0.6), surf: bed('lowpass', 420, 0.7), cricketAt: 0, callAt: 0, buf, thunderN: -1, bangN: [] };
  } catch (e) { beds = null; }
}
// one roll of thunder: the beds' noise, low-passed hard, swelling and dying away
function thunder() {
  const src = actx.createBufferSource(); src.buffer = beds.buf; src.loop = true;
  const fl = actx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 130;
  const gn = actx.createGain(), t = actx.currentTime;
  gn.gain.setValueAtTime(0, t);
  gn.gain.linearRampToValueAtTime(0.5, t + 0.25);
  gn.gain.exponentialRampToValueAtTime(0.001, t + 3);
  src.connect(fl); fl.connect(gn); gn.connect(master); src.start(t); src.stop(t + 3.1);
}
/* The creatures of the hour, far off and now and then: birdsong around sunrise
   (not in winter), gulls through the day, an owl in the dead of night. Dry
   weather only -- nothing sings in the rain. Ordinary tones, so they stand
   down by tone()'s own rule. */
// three slow strokes: a low hum under a brighter strike, with a long tail
function bell() {
  beds.bellRung = (beds.bellRung || 0) + 1;
  for (let i = 0; i < 3; i++) {
    tone({ f: 330, type: 'sine', dur: 2.2, vol: 0.09, delay: i * 1.5 });
    tone({ f: 792, type: 'sine', dur: 1.1, vol: 0.035, delay: i * 1.5 });
  }
}
function stepCalls(now) {
  if (now < beds.callAt || rainNow() > 0) return;
  const ph = dayPhase(), { sun, night } = sky();
  if ((ph < 0.14 || ph > 0.97) && season().key !== 'winter') {
    beds.callAt = now + 2.5 + Math.random() * 4;
    const notes = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < notes; i++) {
      const f = 2600 + Math.random() * 1500;
      tone({ f, to: f * (0.85 + Math.random() * 0.35), type: 'sine', dur: 0.09, vol: 0.022, delay: i * 0.12 });
    }
  } else if (sun > 0.1) {
    beds.callAt = now + 12 + Math.random() * 14;
    const cries = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < cries; i++) tone({ f: 1400, to: 820, type: 'triangle', dur: 0.24, vol: 0.018, delay: i * 0.3 });
  } else if (night > 0.6) {
    beds.callAt = now + 18 + Math.random() * 18;
    tone({ f: 390, to: 350, type: 'sine', dur: 0.32, vol: 0.05 });
    tone({ f: 370, to: 330, type: 'sine', dur: 0.5, vol: 0.05, delay: 0.5 });
  }
}
function hushBeds() {
  if (!beds || !actx) return;
  const t = actx.currentTime;
  beds.rain.gain.cancelScheduledValues(t); beds.rain.gain.setValueAtTime(0, t);
  beds.surf.gain.cancelScheduledValues(t); beds.surf.gain.setValueAtTime(0, t);
}
// frames stop while the page is hidden, so the beds are hushed here rather than left at their last level
document.addEventListener('visibilitychange', () => { if (document.hidden) hushBeds(); });
function stepAmbience() {
  if (!actx || actx.state !== 'running') return;
  bedsOn();
  if (!beds) return;
  const quiet = muted || document.hidden, t = actx.currentTime, now = Date.now() / 1000;
  beds.rain.gain.setTargetAtTime(quiet ? 0 : 0.10 * rainNow(), t, 0.5);
  beds.surf.gain.setTargetAtTime(quiet ? 0 : 0.035 * (0.65 + 0.35 * Math.sin(now * 0.45)), t, 0.8);
  if (!quiet && !reduceMotion && stormNow()) {
    // the sound comes after the light, later the further off the bolt was
    const f = flashAt(now);
    if (f && f.n !== beds.thunderN) {
      const wait = 1.2 + rnd(f.n, 58) * 2.2;
      if (f.age >= wait && f.age < wait + 0.5) { beds.thunderN = f.n; thunder(); }
    }
  }
  if (!quiet) stepCalls(now);
  const today = Math.floor(Date.now() / DAY_MS), ph = dayPhase();
  if (!quiet && ph >= NOON && ph < NOON + 0.01 && beds.bellDay !== today) { beds.bellDay = today; bell(); }
  if (!quiet && !reduceMotion && festivalNow()) {
    // a soft thud as each one bursts
    for (let i = 0; i < FIREWORKS; i++) {
      const f = fireworkAt(now, i);
      if (f.ph >= FW_BANG && f.ph < FW_BANG + 0.1 && beds.bangN[i] !== f.n) {
        beds.bangN[i] = f.n;
        tone({ f: 170, to: 55, type: 'triangle', dur: 0.22, vol: 0.09 });
      }
    }
  }
  if (!quiet && season().key === 'summer' && sky().night > 0.4 && now > beds.cricketAt) {
    beds.cricketAt = now + 0.6 + Math.random() * 2.2;
    for (let i = 0; i < 3; i++) tone({ f: 4300, type: 'sine', dur: 0.035, vol: 0.025, delay: i * 0.07 });
  }
}

const SFX = {
  tap:     () => tone({ f: 620, to: 520, type: 'triangle', dur: 0.06, vol: 0.22 }),
  place:   () => { tone({ f: 180, to: 90, type: 'sine', dur: 0.22, vol: 0.55 });
                   tone({ f: 300, to: 200, type: 'triangle', dur: 0.10, vol: 0.22, delay: 0.02 }); },
  deliver: () => { // throttled: a busy village delivers constantly and would chatter
                   const now = performance.now();
                   if (now - lastDeliverAt < 220) return;
                   lastDeliverAt = now;
                   tone({ f: 880, type: 'sine', dur: 0.08, vol: 0.16 });
                   tone({ f: 1320, type: 'sine', dur: 0.09, vol: 0.12, delay: 0.055 }); },
  upgrade: () => [0, 0.09, 0.18].forEach((d, i) =>
                   tone({ f: 523 * Math.pow(1.26, i), type: 'triangle', dur: 0.20, vol: 0.34, delay: d })),
  sell:    () => { tone({ f: 420, to: 240, type: 'triangle', dur: 0.16, vol: 0.30 }); },
  /* Scaffolding coming down. Placing something thunks; three seconds later it
     quietly became real and the game said nothing at all, which is the moment a
     builder is actually about for. Rising where place() falls, and quieter than
     an upgrade, because it happens far more often. */
  done:    () => { tone({ f: 440, to: 660, type: 'triangle', dur: 0.14, vol: 0.26 });
                   tone({ f: 880, type: 'sine', dur: 0.10, vol: 0.14, delay: 0.07 }); },
  deny:    () => tone({ f: 170, to: 120, type: 'square', dur: 0.16, vol: 0.20 }),
  goal:    () => [0, 0.10, 0.20, 0.32].forEach((d, i) =>
                   tone({ f: [523, 659, 784, 1047][i], type: 'sine', dur: 0.30, vol: 0.30, delay: d })),
};

/* ---------- what the village keeps ----------

   Two kinds of goods, and "wood and food" was written out by hand in
   thirty-eight places: sixteen loops over a literal ['wood', 'food'] and
   twenty-two copies of the ternary that turns a key into an icon. Every one
   of them is somewhere a third kind has to be remembered, and somewhere it
   can be forgotten -- the loops silently skipping it, the ternaries quietly
   calling it food. None of that would throw; it would simply be wrong, in
   thirty-eight places at once, on a save migration or a trade board or an
   offline reckoning.

   The order is the order they are shown in: the chips along the top, and the
   lines of a price. */
const RES = ['wood', 'food', 'stone'];
const RES_SET = new Set(RES);
/* A tally with one slot per kind, so a new kind cannot be left out of one.

   There were thirteen `{ wood: 0, food: 0 }` literals in this file -- the
   smoothed rates, the window they are averaged over, what has been shipped,
   what a building has had put into it, what is in a carrier's arms at the
   moment of a save, the ceilings. Thirteen places to remember, and a slot
   that gets forgotten is not zero: it is undefined, which turns the first +=
   into NaN and every comparison after it into false. A barn with a NaN
   ceiling is never full and never empty. */
const tally = (v) => { const o = {}; for (const k of RES) o[k] = v || 0; return o; };
/* The icon for a kind of goods, in one place. */
const RES_ICON = { wood: '🪵', food: '🌾', stone: '🪨' };
/* And the colour, where a figure is tinted by what it counts rather than by
   what it means -- the delivery pops over a storehouse are the only ones. */
const RES_TINT = { wood: '#f0d49a', food: '#cdeb9a', stone: '#d6dde6' };
/* And the colour of the figure on its chip, which is a different question:
   these sit on a dark pill rather than over the island, and were chosen
   against it. */
const RES_CHIP = { wood: '#e8c98a', food: '#bfe08a', stone: '#cfd8e2' };
/* ---------- feedback ----------
   Deliveries used to change a number in the corner and nothing else, which
   makes a working village indistinguishable from a stalled one. Everything that
   arrives now says so where it arrived, and the HUD reports the rate the
   village is ACTUALLY achieving rather than the rate its buildings are rated
   for -- the gap between the two is walking time, and it is large. */
const pops = [];
const POP_MAX = 24, POP_LIFE = 1.5;
let rateNow = tally();                       // smoothed, shown in the HUD
let rateAcc = tally(), rateT = 0;
const RATE_WINDOW = 5;                       // long enough that a sparse village does not flicker

/* Hand the player a resource and SHOW what actually arrived.

   Every grant in this game clamps to the storage cap, and three separate times
   I wrote the clamp in one place and the announcement in another, so the game
   congratulated the player on goods it had just thrown away. Everything that
   grants now goes through here. */
function grant(k, n, x, y) {
  const before = res[k];
  res[k] = Math.min(caps[k], res[k] + n);
  const got = res[k] - before;
  if (got > 0.01 && pops.length < POP_MAX) pops.push({ x, y, k, n: got, age: 0 });
  return got;
}
/* What a finished village does with what it cannot keep.

   Every goal done, every building at its best, the whole island claimed: a
   village in that state has seventy-two villagers carrying about sixty-five goods
   a second into stores that are already full, and for as long as this game has
   existed every one of those loads was thrown away. Measured, and written down
   as the one gap left -- a finished village with nowhere for its work to go.

   So once the goal list is complete, overflow is sent to the neighbouring
   villages instead, and the village keeps a tally of what it has given. It
   changes nothing that can be spent -- the goods were lost either way -- which is
   the point: it is a record, not a new economy, and it does not reach back into
   the game before it is finished. Before that, a full store still says
   "wasting", because that pressure is what teaches storage and trade. */
let sharedTotal = tally();
const villageFinished = () => goalIdx >= GOALS.length;
/* The beacon's half of a load, taken as it arrives.

   It used to drink out of the barns, eighteen a second of every kind, and
   that had no good answer. Drinking everything held the stores at zero for
   the hours a hundred thousand takes; keeping half back for the village to
   spend still left every barn below full, and only a full barn sends anything
   over the water -- measured over ten minutes of a finished village, 3,936
   shipped without a beacon and NONE with one. The goal strip sat on "Ship 50k
   to the neighbours" for two hours, under a card promising that the beacon
   "sends more of it over the water".

   So it takes half of every load a villager carries home, while it has a
   stage left to finish, and the other half arrives exactly as it always did:
   into the barn, and over the water once the barn is full. Only carried
   loads, because only they are the village's work -- a reward or a refund
   was never the surplus. It rises at half the pace it did, and the village
   goes on filling, spending and shipping while it does. */
const BEACON_SHARE = 0.5;
/* The part of each carried load that reaches the barn: all of it, or the
   half the beacon leaves while it is still rising. Anything that quotes what
   the village WOULD deliver -- the chips' expected rate, the sharing figure
   -- multiplies by this, or it quotes the beacon's half as the barn's. */
const beaconCut = () => {
  const p = beaconOf();
  if (!p || p.t < 1) return 1;
  return BEACON_NEED[Math.min(BEACON_STAGES, Math.max(1, p.lvl | 0)) - 1] ? 1 - BEACON_SHARE : 1;
};
const BEACON_CAPTION = [null, null, 'The beacon is begun', 'The beacon is rising', 'The lantern is in'];
function beaconTake(k, n) {
  if (!(n > 0) || beaconCut() === 1) return 0;   // none standing, or the top stage
  const p = beaconOf();
  const lvl = Math.min(BEACON_STAGES, Math.max(1, p.lvl | 0));
  const take = n * BEACON_SHARE;
  p.stock = (p.stock || 0) + take;
  if (p.stock >= BEACON_NEED[lvl - 1]) {
    p.stock = 0; p.lvl = lvl + 1; SFX.upgrade(); save();
    /* hours apart at the end of the game, so each stage gets its own: the
       first course, the tower, the lantern room, and then the light */
    if (p.lvl >= BEACON_STAGES) celebrate('beacon_lit', 'The beacon is lit');
    else celebrate('beacon_up_' + p.lvl + '_clip', BEACON_CAPTION[p.lvl]);
  }
  return take;
}
/* The beacon's half of a stretch the village worked unwatched: the same rule
   as beaconTake, for production that never arrived as loads. Half of what was
   made, until the tower reaches its top -- and if it gets there part-way
   through, only the share that took it there, so the rest of the stretch
   arrives whole, exactly as live loads would after the last stage. */
function beaconAway(rate, secs) {
  const took = tally(), out = { took, sum: 0, from: 0, to: 0 };
  if (beaconCut() === 1 || !(secs > 0)) return out;
  const p = beaconOf();
  p.lvl = Math.min(BEACON_STAGES, Math.max(1, p.lvl | 0));
  let left = -(p.stock || 0);
  for (let l = p.lvl; l <= BEACON_STAGES; l++) left += BEACON_NEED[l - 1];
  let offered = 0;
  for (const k of RES) offered += Math.max(0, rate[k]) * secs * BEACON_SHARE;
  if (!(offered > 0) || !(left > 0)) return out;
  const f = Math.min(1, left / offered);
  for (const k of RES) { took[k] = Math.max(0, rate[k]) * secs * BEACON_SHARE * f; out.sum += took[k]; }
  out.from = p.lvl;
  p.stock = (p.stock || 0) + out.sum;
  while (BEACON_NEED[p.lvl - 1] && p.stock >= BEACON_NEED[p.lvl - 1] - 1e-6) {
    p.stock -= BEACON_NEED[p.lvl - 1]; p.lvl++;
  }
  if (!BEACON_NEED[p.lvl - 1]) p.stock = 0;
  out.to = p.lvl;
  return out;
}
function deliver(k, n, x, y) {
  n -= beaconTake(k, n);
  const got = grant(k, n, x, y);
  rateAcc[k] += got;                  // a sale is not production, so only here
  if (got > 0.01) SFX.deliver();
  // only what the villagers carried: rewards and refunds are not the village's work
  /* Worth more for every stage of the beacon, which is the only thing it is
     for. Without one this is exactly what it always was. */
  if (villageFinished()) sharedTotal[k] += Math.max(0, Math.min(n, n - got)) * shareMul();
  return got;
}
/* 1234 -> "1.2k", 1234567 -> "1.2M". A tally that runs for hours reaches seven
   figures, and the hall panel has one line to say it in. */
/* Stopped at billions, so the largest total a save may hold printed as
   "1000000.0B" and ran off the hall panel. Each step also decides its unit from
   the ROUNDED figure: 999,999 used to come out as "1000k". */
const COMPACT_UNITS = ['k', 'M', 'B', 'T', 'Q'];
function compact(n) {
  n = Math.floor(Math.max(0, n) || 0);
  if (n < 1000) return String(n);
  let v = n;
  for (let u = 0; u < COMPACT_UNITS.length; u++) {
    v /= 1000;
    const s = v.toFixed(v < 9.95 ? 1 : 0);
    if (+s < 1000 || u === COMPACT_UNITS.length - 1) return s + COMPACT_UNITS[u];
  }
}
function stepFeedback(dt) {
  for (const q of pops) q.age += dt;
  for (let i = pops.length - 1; i >= 0; i--) if (pops[i].age > POP_LIFE) pops.splice(i, 1);
  rateT += dt;
  if (rateT >= RATE_WINDOW) {
    for (const k of RES) {
      // eased so the readout settles instead of flickering between windows
      rateNow[k] += (rateAcc[k] / rateT - rateNow[k]) * 0.40;
      rateAcc[k] = 0;
    }
    rateT = 0;
  }
}
/* Sized like the badges, so "+8" reaches the readable floor on screen. At a
   fixed 21 units it came out near six CSS pixels on a zoomed-out phone -- and
   these are the one sign of where goods are actually arriving, kept even when
   reduce-motion takes the decoration away. */
const POP_PX = 21;
function drawPops() {
  const k = badgeScale() * BADGE_TEXT_PX / POP_PX;
  for (const q of pops) {
    const t = q.age / POP_LIFE;
    g.save();
    g.globalAlpha = Math.min(1, (1 - t) * 2.2);
    g.translate(q.x, q.y); g.scale(k, k);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `bold ${POP_PX}px Segoe UI, sans-serif`;
    g.lineWidth = 8; g.lineJoin = 'round'; g.strokeStyle = 'rgba(8,16,8,.75)';
    const txt = '+' + Math.round(q.n) + ' ' + RES_ICON[q.k];
    const y = -26 - t * 34;
    g.strokeText(txt, 0, y);
    g.fillStyle = RES_TINT[q.k];
    g.fillText(txt, 0, y);
    g.restore();
  }
}

const byId = id => placed.find(p=>p.id===id);
const centreOf = p => { const b=B(p.key); return tileToWorld(p.c+(b.w-1)/2, p.r+(b.h-1)/2); };
/* A building that has finished at least once. An UPGRADE puts the scaffolding
   back up, and a building under scaffolding for the second time is not the same
   as one being built for the first: the first has nobody working it yet, the
   second has people who should still have their jobs when it comes back. */
const established = p => p.t >= 1 || lvlOf(p) > 1;
/* The level a building is USING right now: the one it has once it is done, the
   one it had while the scaffolding is up, nought the first time round. Houses,
   storehouses, wells and markets all keep what they had while they improve --
   starting an upgrade must never take anything away. */
const lvlHeld = p => p.t >= 1 ? lvlOf(p) : lvlOf(p) - 1;
const producers = () => placed.filter(p => established(p) && B(p.key).jobs);
// the hall always accepts a delivery, so a village can never deadlock for want
// of somewhere to put things
/* The stores, with their centres, kept ready.

   nearestStore() is asked for a distance by every building on every frame -- the
   placement badge needs one -- and by every villager that finishes a load, and
   it was rebuilding this list with a filter and an allocation every single time.
   On a full village that came to 4.5ms of a 10ms frame here, which is a third
   of the budget gone on a phone before anything is drawn.

   The set changes only when something is built, finishes building, is sold,
   moved or loaded, so it is rebuilt at those points and nowhere else. */
let storeAt = [];                     // [{ p, x, y }]
function rebuildStores() {
  rebuildCharm();                     // the same events change both
  rebuildPaths();                     // and a new road changes every travel time
  travelCache = new Map();
  invalidateJobs();                   // and they all move the delivery figures
  storeAt.length = 0;
  for (const p of placed)
    /* established, not finished -- the same line capacity and staffing already
       draw. A building under its FIRST construction is not a store yet; one
       being UPGRADED still is.

       With p.t >= 1 here, starting an upgrade took the building off the list of
       places to carry goods, while its capacity stayed. For the town hall that
       broke the promise written just above: early on the hall is the only store,
       raising it is a goal, and for the six seconds the work took the list of
       delivery targets was empty -- measured, carriers stopped hauling and goods
       piled up at the workplaces until the scaffolding came down. Upgrading a
       storehouse likewise sent every carrier on a detour to the next one. */
    if (established(p) && storesItself(p.key)) {
      const c = centreOf(p);
      storeAt.push({ p, x: c.x, y: c.y });
    }
}
const stores = () => storeAt.map(s => s.p);
const workersAt = id => villagers.reduce((n,v)=>n+(v.job===id?1:0),0);

/* Output multiplier from wells in reach. Distance is measured centre to centre
   in TILES, not world pixels, so a well's reach is a circle on the grid rather
   than the squashed ellipse the iso projection would give. */
function boostAt(p, exceptWell){
  const bp=B(p.key); let m=1;
  for(const w of placed){
    if(w.key!=='well' || !established(w)) continue;   // an improving well keeps its reach
    if(exceptWell !== undefined && w.id === exceptWell) continue;   // "what if this well were not here"
    const bw=B('well');
    const dx=(w.c+(bw.w-1)/2)-(p.c+(bp.w-1)/2);
    const dy=(w.r+(bw.h-1)/2)-(p.r+(bp.h-1)/2);
    if(Math.hypot(dx,dy)<=bw.boostR) m+=bw.boost*outMul(lvlHeld(w));
  }
  return m;
}
function nearestStore(x,y){
  let best=null,bd=Infinity;
  for(const s of storeAt){ const dx=s.x-x, dy=s.y-y, d=dx*dx+dy*dy; if(d<bd){bd=d;best=s.p;} }
  return best;                        // squared distances: the nearest is the same one
}
function wanderTarget(){
  const done=placed.filter(p=>p.t>=1);
  if(!done.length) return tileToWorld(GW/2,GH/2);
  const c=centreOf(done[(Math.random()*done.length)|0]);
  return { x:c.x+(Math.random()*2-1)*46, y:c.y+(Math.random()*2-1)*26 };
}
const postNear = p => { const c=centreOf(p);
  return { x:c.x+(Math.random()*2-1)*POST_SPREAD.x, y:c.y+(Math.random()*2-1)*POST_SPREAD.y }; };

/* The most villagers a village will ever hold.

   This was 24, chosen as a performance guard, and it quietly broke the late
   game: a maxed village WANTS 72 villagers and has 69 jobs, so eight of the
   twelve houses the hall allows did nothing at all -- still costing wood, still
   gated behind hall levels, still asked for by a goal. The ceiling now sits
   above what a full village asks for, so a house is never wasted. */
const VILLAGER_MAX = 72;

/* ---------- who the villagers are ----------

   Seventy-two figures walking about an island, and not one of them was
   anybody. Worse than anonymous: they were not even the SAME anonymous twice.
   A villager's look came from k, which was rolled at random every time one
   was spawned -- and they are all spawned afresh on every load, because they
   are not in the save, they are worked out from the houses. So the woodcutter
   you watched walk to the mill yesterday came back this morning as a farmer,
   and nothing in the game had changed.

   A seed fixes both. It is the villager's own number, kept on the record, and
   everything about them that is not position or timing comes out of it: the
   name, and the sprite they are drawn with. Rebuild the pool from an empty
   list -- which is what a reload does -- and villager nought is handed seed
   nought again, so the village comes back with the same people in it.

   The SMALLEST unused seed, not the length of the list. Someone leaving is
   spliced out of the middle, so the next arrival would otherwise take a
   number that a later villager is still using, and two people in a village of
   seventy-two would answer to the same name.

   Eighty names against a ceiling of seventy-two, stepped by a number coprime
   with eighty, so every seed in range lands on a different one. Nobody shares
   a name, and nobody has to. */
const NAMES = [
  'Mara', 'Tomas', 'Jens', 'Alda', 'Piet', 'Nell', 'Otto', 'Greta',
  'Hans', 'Lise', 'Bram', 'Ilse', 'Gus', 'Mette', 'Arne', 'Fenna',
  'Joren', 'Saskia', 'Klaas', 'Roos', 'Teun', 'Hilde', 'Wim', 'Anke',
  'Dirk', 'Marit', 'Sven', 'Lotte', 'Rune', 'Birgit', 'Olav', 'Karin',
  'Erik', 'Sonja', 'Lars', 'Elin', 'Nils', 'Astrid', 'Jonas', 'Freja',
  'Kai', 'Signe', 'Bo', 'Inga', 'Halle', 'Rikke', 'Esben', 'Maren',
  'Finn', 'Tove', 'Soren', 'Liv', 'Odd', 'Hedda', 'Vidar', 'Siri',
  'Trygve', 'Runa', 'Egil', 'Thora', 'Knut', 'Ylva', 'Harald', 'Gudrun',
  'Sigurd', 'Asta', 'Leif', 'Solveig', 'Torkel', 'Ragna', 'Einar', 'Dagny',
  'Bjorn', 'Kari', 'Steinar', 'Alva', 'Gunnar', 'Hanne', 'Magnus', 'Edda',
];
const NAME_STEP = 37;                 // coprime with 80, so seeds do not collide
const villagerName = v => NAMES[((v && v.seed | 0) * NAME_STEP) % NAMES.length];
/* The smallest number nobody is using. */
function freeSeed() {
  const taken = new Set(villagers.map(v => v.seed));
  for (let i = 0; i < VILLAGER_MAX; i++) if (!taken.has(i)) return i;
  return 0;
}
/* Everyone working here, in the order they joined, which is the order their
   seeds were handed out and so the order their names come back in. */
const workersOf = id => villagers.filter(v => v.job === id);
const whoIs = () => who == null ? null : villagers.find(v => v.seed === who) || null;

/* A villager's trade, in the words the player would use.

   Taken from the building they are posted to rather than stored on them: a
   villager IS whatever they are currently doing, and the game moves them
   between posts whenever the workforce plan changes. Storing a trade would
   mean a farmer standing in a lumber camp. */
function tradeOf(v) {
  const p = v.job == null ? null : byId(v.job);
  if (!p) return { name: 'Between jobs', at: null };
  const b = B(p.key);
  /* Named on the building rather than worked out from what it produces. The
     first version read the trade off b.makes and called the market trader a
     woodcutter, because a market really does make wood -- it is the stall
     taking a cut, and it is also the only building in the game that both
     produces and stores. Three of the five workplaces make wood and they are
     not three of the same job. */
  return { name: b.trade || ('Keeps the ' + b.name.toLowerCase()), at: p };
}

/* What they are doing at this instant, in one line.

   The states are the same four the step loop runs on, said out loud. A
   village of seventy-two people walking about is the most alive thing on the
   screen and the game has never once told the player what any of it is for. */
function doingOf(v) {
  const p = v.job == null ? null : byId(v.job);
  if (v.carry) {
    const st = nearestStore(v.x, v.y);
    return 'Carrying ' + RES_ICON[v.carry.k] + Math.round(v.carry.n)
      + ' to the ' + (st ? B(st.key).name.toLowerCase() : 'store');
  }
  if (v.st === 'toWork' && p) return 'Walking to the ' + B(p.key).name.toLowerCase();
  if (v.st === 'work' && p) {
    const b = B(p.key);
    if (!established(p)) return 'Waiting for the scaffolding to come down';
    if (!b.makes) return 'On duty at the ' + b.name.toLowerCase();
    return 'Filling a load  \u00b7  ' + Math.floor(p.stock || 0) + ' / ' + CARRY;
  }
  return 'Nothing to do';
}

/* The round trip this villager actually walks, in seconds.

   Post to store and back, at the speed they really move -- which is why it
   is worth printing. The whole economy of this game is walking time: a farm
   seven tiles from a storehouse delivers a fraction of its rated output, and
   until now nothing anywhere said so. A number attached to a person is the
   one place a player will believe it. */
function roundTripOf(v) {
  const p = v.job == null ? null : byId(v.job);
  if (!p) return null;
  const c = centreOf(p), st = nearestStore(c.x, c.y);
  if (!st) return null;
  /* A market holds goods AND makes them, so its own trader walks nowhere --
     the nearest store is the building they are standing in. Worth saying
     rather than printing a round trip of nought point three seconds, because
     it is the best deal in the game and nothing has ever pointed at it. */
  if (st.id === p.id) return { secs: 0, store: st, here: true };
  const sc = centreOf(st);
  const d = Math.hypot(sc.x - c.x, sc.y - c.y + DROP_Y);
  return { secs: 2 * d / VIL_SPD, store: st, here: false };
}
/* "Mara", "Mara and Tomas", "Mara, Tomas and Jens". */
const nameList = vs => vs.length < 2 ? (vs.length ? villagerName(vs[0]) : '')
  : vs.slice(0, -1).map(villagerName).join(', ') + ' and ' + villagerName(vs[vs.length - 1]);
function syncVillagers(){
  let want=0;
  for(const p of placed) want += livedIn(p);
  /* The hall keeps one caretaker whatever else happens, and that one is a
     safety net rather than a flourish.

     Villagers come from houses, every scrap of income comes from villagers, and
     the cheapest thing in the game costs five wood. So a village with no houses
     and an empty barn produces nothing, for ever: an hour of simulated time
     from that state leaves it exactly where it started, with nothing to sell,
     nothing to trade and nothing affordable. It is reachable by selling down --
     each sale returns half, so enough of them grind any village to nothing --
     and the autosave writes the dead end down as it happens.

     One pair of hands on the woodpile is 0.15/s, which rebuilds a house in
     three and a half minutes. Slow enough to be a punishment, not a wall. */
  want=Math.max(1, Math.min(want,VILLAGER_MAX));
  if(villagers.length!==want) invalidateJobs();
  while(villagers.length<want){
    const h=hallOf(), t=h?centreOf(h):tileToWorld(GW/2,GH/2);
    /* ph and wait stay random -- they are where in a stride and how long until
       the next errand, and nobody notices those repeating. k does not: it is
       what the villager LOOKS like, and rolling it on every spawn meant every
       reload redealt the whole village. */
    const seed = freeSeed();
    villagers.push({x:t.x,y:t.y,tx:t.x,ty:t.y,ph:Math.random()*7,wait:Math.random()*2,face:1,
      seed, k: (seed * 11) % VILLAGERS.length, job:null, st:'idle', carry:null});
  }
  /* Whoever leaves hands in what they were carrying.

     It used to pop the end of the list, load and all. Selling a level five
     house lets six villagers go at once, and with a load each that is
     forty-eight goods gone -- measured, with three thousand of room in the
     stores, so it was not the full-barn rule doing it. Nothing was said, and
     nothing could be: the goods simply stopped existing.

     sellBuilding already worried about exactly this for a workplace -- "a
     villager wandering the village holding eight food that would never be
     delivered" -- and let them finish the trip. They cannot finish it if they
     are not there any more, so the load goes in through deliver(), the same
     path a carried load always takes, which means the stores can still refuse
     it if they are full and a finished village still shares the overflow.

     Someone empty-handed goes first, so most of the time there is nothing to
     hand in at all. */
  while(villagers.length>want){
    let i=villagers.findIndex(v=>!v.carry);
    if(i<0) i=villagers.length-1;
    const gone=villagers.splice(i,1)[0];
    if(gone.carry){ deliver(gone.carry.k, gone.carry.n, gone.x, gone.y); gone.carry=null; }
  }
}

/* Hand out posts. A villager keeps its workplace until that workplace is gone,
   so the village does not reshuffle every time something new is built. */
/* Runs every tick for every villager, so it counts the workforce ONCE into a
   map instead of rescanning every villager for every villager. The old version
   called producers() and workersAt() inside the per-villager loop, which is
   quadratic in population and fine at a dozen villagers and not at seventy. */
/* Where the workforce SHOULD be.

   Villagers never reconsidered a job once they had one, so posts filled in
   whatever order they happened to be built. In a village with a mill worth 0.97
   a head and a stranded farm worth 0.45, the farm had three people and the mill
   had none -- a quarter of the village's labour going to waste, and every
   placement decision the player made counting for nothing.

   Every workplace gets one pair of hands before any gets a second, so a new
   building is never simply ignored and the player can see what it does. After
   that, hands go where they deliver most. The hall's woodpile sorts last
   throughout: it is where spare hands go when there is nothing better, not a
   career. */
/* Cached, like the store list and the charm total, and dirtied by the same
   events plus a change in the population. Working it out means a sort and a
   delivery figure for every workplace, and it ran on every tick: 0.24ms of a
   0.30ms tick on a full village, to answer a question whose answer only changes
   when a building or a villager appears. */
let jobPlan = null;
function invalidateJobs() { jobPlan = null; }
function desiredJobs(handsIn) {
  if (handsIn !== undefined) return computeJobs(handsIn);
  /* The cache checks itself.

     Room is the one input to this plan that changes without anything being
     built, sold or moved -- every load a villager carries in can flip it -- so
     no list of mutation points can cover it. Hanging the invalidation off the
     tick instead was worse: the soak test grants a resource and asks the
     question before the next tick has run, and caught a stale plan 90 times in
     60,000 rounds. Comparing the mask on the way out is a handful of
     arithmetic and cannot be got wrong by a caller. */
  const m = fullMask();
  if (jobPlan && m === jobMask) return jobPlan;
  jobMask = m;
  jobPlan = computeJobs();
  return jobPlan;
}
/* Which resources the barn can still take a load of.

   A full barn does not slow a workplace down, it throws its work away -- so a
   post producing into one is worth nothing, however fast it is. The allocator
   ranked posts by delivered rate alone, which is the right measure only while
   there is somewhere to put the goods. Measured on a mid-game village with food
   at the ceiling and no wood at all: ten of sixteen hands were on food, making
   8.12/s that was destroyed on arrival, and six were on wood making 3.39/s.

   A load is CARRY, so room for less than one load is no room. */
const hasRoomFor = k => caps[k] - res[k] >= CARRY;
/* THE definition of a full store, used everywhere that says so.

   There were three. The workforce, the resting badge, the building panel and the
   hall said "full" with room for less than one load; the resource bar and its
   wasting figure waited until the very ceiling; the first-time hint wanted the
   ceiling exactly. So for a moment on the way up -- four wood short, say -- the
   hall read "🪵 store full, build a storehouse" while the bar underneath it read
   "+0.3 / s". Brief in ordinary play, 0.6% of it and never more than three
   seconds, but it is the same fault twice now in two rounds: one rule, two
   places. Room for less than one load is the honest line, because the next load
   will not fit. */
const isFull = k => !hasRoomFor(k);
/* One bit per resource. The plan is cached, so it must be thrown away when this
   changes -- and only when it changes, or the cache would be rebuilt every
   frame that anything arrives. */
/* One bit per kind of goods, built from the list rather than written out.

   This is what tells the cached job plan it has gone stale, and it was two
   bits: wood and food. A third kind of goods filling or emptying its barn
   changed the plan and did not change the mask, so the village went on
   using a plan made for a different barn -- villagers at posts producing
   into a full store while an empty one went unworked. The soak test caught
   it on the first resume: the cache and a fresh computation disagreed.

   The comment above desiredJobs says room is the one input no list of
   mutation points can cover, which is why the mask exists. A mask that
   covers some of the rooms is the same bug in a smaller frame. */
const fullMask = () => RES.reduce((m, k, i) => m | (hasRoomFor(k) ? 1 << i : 0), 0);
let jobMask = -1;
function computeJobs(handsIn) {
  const posts = producers().filter(p => jobsOf(p) > 0);
  /* Falls back to the plain rate when NOTHING has room: with both barns full
     every post is worth zero, and an arbitrary order would have the village
     reshuffling its whole workforce for no reason. */
  const anyRoom = RES.some(hasRoomFor);
  const worth = p => {
    const b = B(p.key);
    if (!b.makes) return 0;
    if (anyRoom && !hasRoomFor(Object.keys(b.makes)[0])) return 0;
    /* And a post under scaffolding is worth nothing for the same reason a post
       filling a full barn is: whatever the hands do there reaches nobody. They
       are not turned out of it -- the pass that places spare hands ignores this
       figure, so an idle villager still stands in the scaffolding rather than
       loitering -- but they no longer hold the post against a working one. */
    return deliveringNow(p);
  };
  posts.sort((a, b) => (a.key === 'hall') - (b.key === 'hall') || worth(b) - worth(a));
  const want = new Map(posts.map(p => [p.id, 0]));
  /* Callable with a population that does not exist yet: offline earnings are
     worked out before the first tick has spawned anybody. */
  let hands = handsIn === undefined ? villagers.length : handsIn;
  /* One each, but not the woodpile: it is the fallback, so it only earns hands
     once every real workplace is full. Guaranteeing it one put a villager on
     the least productive job in the village ahead of a second pair of hands at
     the best one. With no real workplace yet -- the first minute of a new
     village -- the second pass gives it everybody, which is the point of it. */
  for (const p of posts) {
    if (hands <= 0) break;
    if (p.key === 'hall') continue;
    /* Not a post whose barn is full either. Guaranteeing one pair of hands to
       every farm while the granary is overflowing is the same mistake as
       guaranteeing one to the woodpile: it spends the village's labour on
       nothing before the second pair reaches the job that is actually worth
       doing. */
    if (!worth(p)) continue;
    want.set(p.id, 1); hands--;
  }
  for (const p of posts) {
    if (!worth(p)) continue;
    const cap = jobsOf(p);
    while (hands > 0 && want.get(p.id) < cap) { want.set(p.id, want.get(p.id) + 1); hands--; }
  }
  /* Whoever is still spare goes to the posts that are producing into a full
     barn, rather than standing about: the goods are wasted either way, and a
     village of idlers beside working farms reads as broken. They leave again
     the moment the barn has room, one job change per tick. */
  for (const p of posts) {
    const cap = jobsOf(p);
    while (hands > 0 && want.get(p.id) < cap) { want.set(p.id, want.get(p.id) + 1); hands--; }
  }
  return { want, posts };
}
function assignJobs(){
  const count = new Map();
  for(const v of villagers){
    if(v.job==null) continue;
    const p=byId(v.job);
    if(p && established(p) && B(p.key).jobs){ count.set(v.job, (count.get(v.job)||0)+1); continue; }
    /* The post is gone. A load already in hand is NOT: it was on its way to a
       store and it still can be. Throwing it away destroyed eight goods every
       time a player upgraded a staffed building -- the upgrade began, every
       worker was unassigned on the next tick, and whatever they were carrying
       went with the job. */
    v.job = null;
    if (!v.carry) v.st = 'idle';
  }
  const { want, posts } = desiredJobs();
  const under = () => posts.filter(p => (count.get(p.id) || 0) < (want.get(p.id) || 0));

  // first, anyone with no job at all
  let open = under();
  let i = 0;
  for (const v of villagers) {
    /* Not while they are carrying something. A villager whose workplace was
       sold keeps the load and keeps walking to the store -- and then this loop
       saw someone with no job, handed them one, and pointed them at it, which
       threw the delivery away: the load rides along to the new post and is
       overwritten by the next one. They take a job on the pass after they have
       put it down. */
    if (v.job != null || v.carry) continue;
    while (i < open.length && (count.get(open[i].id) || 0) >= (want.get(open[i].id) || 0)) i++;
    if (i >= open.length) break;
    const free = open[i];
    count.set(free.id, (count.get(free.id) || 0) + 1);
    v.job = free.id; v.st = 'toWork';
    const t = postNear(free); v.tx = t.x; v.ty = t.y;
  }

  /* Then ONE person changes job per pass, from a post that has more hands than
     it deserves to one that has fewer. One at a time because this runs every
     tick: it converges in under a second either way, and it reads as people
     walking to a different job rather than the whole village teleporting.

     Anything they are carrying is left alone -- they finish the delivery and
     take the new post afterwards. */
  const shortOf = under()[0];
  if (!shortOf) return;
  const spare = posts.find(p => (count.get(p.id) || 0) > (want.get(p.id) || 0));
  if (!spare) return;
  const mover = villagers.find(v => v.job === spare.id && !v.carry);
  if (!mover) return;
  count.set(spare.id, (count.get(spare.id) || 1) - 1);
  count.set(shortOf.id, (count.get(shortOf.id) || 0) + 1);
  mover.job = shortOf.id;
  if (mover.st === 'work' || mover.st === 'idle') {
    mover.st = 'toWork';
    const t = postNear(shortOf); mover.tx = t.x; mover.ty = t.y;
  }
}

/* Villagers are the economy: a workplace fills only while someone is standing
   at it, and what it makes reaches the player only when that villager walks a
   load to a store. Nothing ticks on its own. */
function stepVillagers(dt){
  for(const v of villagers){
    const step1=()=>{ const dx=v.tx-v.x, dy=v.ty-v.y, d=Math.hypot(dx,dy);
      if(d<ARRIVE) return true;
      const spd = VIL_SPD * (onPath(v.x, v.y) ? PATH_SPEED : 1);
      /* Never step PAST the target. A frame is up to 0.1s, and on a road that
         is a 12.8px stride against a 6px arrival window -- so a villager
         standing 6.4px away jumped over the target, landed 6.4px on the far
         side, and did that for ever. It never worked and never delivered
         again. Only slow frames are big enough to do it, which means it would
         have happened on a struggling phone and nowhere else. */
      const m = Math.min(spd * dt, d);
      v.x+=dx/d*m; v.y+=dy/d*m; v.face=dx<0?-1:1;
      v.ph += m * Math.PI / strideFor(spd);   // one footfall per PI, measured on the ground
      return false; };

    /* A workplace can move out from under somebody: the Move button picks the
       whole building up and sets it down across the island, and nothing told the
       people working there. They carried on standing in the empty field it used
       to occupy, filling its stock from there -- and then walked their load to
       the store from the OLD spot, so the first cycle after a move was timed for
       a building that was no longer there. Whoever is carrying something is left
       alone; they finish the delivery and take the new post on the way back,
       which is what already happened. */
    if((v.st==='toWork' || v.st==='work') && v.job != null){
      const p=byId(v.job);
      if(p){ const c=centreOf(p);
        const ref = v.st==='toWork' ? { x:v.tx, y:v.ty } : { x:v.x, y:v.y };
        if(Math.hypot(ref.x-c.x, ref.y-c.y) > 110){
          const t=postNear(p); v.tx=t.x; v.ty=t.y; v.st='toWork';
        } }
    }
    if(v.st==='toWork'){ if(step1()) v.st='work'; continue; }

    if(v.st==='work'){
      const p=byId(v.job); if(!p){ v.st='idle'; continue; }
      const b=B(p.key);
      // nothing comes out of a building with the scaffolding up; the people
      // posted there wait for it rather than losing the job
      if(b.makes && p.t>=1 && p.stock<STOCK_MAX){
        const kind=Object.keys(b.makes)[0];
        p.stock=Math.min(STOCK_MAX, p.stock+rateOf(p,kind)*boostAt(p)*charmMul()*dt);
      }
      v.ph+=dt*2.5;                          // a slow sway while working
      if(p.stock>=CARRY){
        const kind=Object.keys(b.makes)[0];
        p.stock-=CARRY; v.carry={k:kind,n:CARRY};
        const s=nearestStore(v.x,v.y);
        if(s){ const c=centreOf(s); v.tx=c.x; v.ty=c.y+DROP_Y; v.st='toStore'; }
        else { deliver(kind, CARRY, v.x, v.y); v.carry=null; }
      }
      continue;
    }

    if(v.st==='toStore'){
      if(!step1()) continue;
      if(v.carry){ deliver(v.carry.k, v.carry.n, v.x, v.y); v.carry=null; }
      const p=byId(v.job);
      if(p){ const t=postNear(p); v.tx=t.x; v.ty=t.y; v.st='toWork'; } else v.st='idle';
      continue;
    }

    // idle: drift between finished buildings, as before
    if(v.wait>0){ v.wait-=dt; continue; }
    if(step1()){ const t=wanderTarget(); v.tx=t.x; v.ty=t.y; v.wait=0.6+Math.random()*2.2; }
  }
}
/* ---------- camera (pan + pinch) ---------- */
const CAM = { z: 1, base: 1, x: W / 2, y: 520 };
/* A village built out to BOTH far points of a full island cannot be shown at
   once on a tall phone at any readable size -- it would need 0.39, and at that
   zoom the buildings are thumbnails. The floor stays where it is and the player
   pans; the opening fit frames what they built, which is the common case. */
const ZMIN = 0.55, ZMAX = 2.2;

/* ---------- how big a control has to be for a thumb ----------

   The canvas is a fixed 1024 across however wide the phone is, so a control's
   size in real millimetres depends entirely on that mapping. On a 375-wide
   handset one logical pixel is 0.366 of a CSS pixel, and measuring the controls
   that way was unpleasant reading: the panel buttons came out 29 CSS pixels
   tall, the tabs 23, the close cross 34 -- against the 44 to 48 both platforms
   ask for. They LOOK fine, because they are wide; they are simply thin.

   The drawn shapes are left alone. What grows is the region that answers a tap,
   which costs nothing and shows nothing -- hit(), and the circles below, take a
   minimum and pad outwards from the middle. Where the space to pad into is not
   there, the control gets as much as fits rather than as much as it wants. */
const TOUCH_MIN = 128;                // logical px: 47 CSS px on a 375 screen, 45 on a 360
const padHit = (half, room) => Math.max(half, Math.min(TOUCH_MIN / 2, half + room));
const camScale = () => CAM.base * CAM.z;
function camClamp() {
  const s = camScale();
  const hw = W / (2 * s), hh = VH / (2 * s);
  const b = worldBounds();
  CAM.x = Math.max(b.x0 + hw * 0.35, Math.min(b.x1 - hw * 0.35, CAM.x));
  CAM.y = Math.max(b.y0 + hh * 0.35, Math.min(b.y1 - hh * 0.35, CAM.y));
  /* And the middle of the screen is somewhere on the island.

     The two lines above bound the camera against worldBounds, which is the
     BOX around the grid -- and the grid is a diamond inside that box. The
     four corner regions of the box are open sea, so a camera held inside the
     box can still be centred on nothing: the limit is reached in x, y is left
     wherever the player had it, and the point where they meet is off the
     island.

     Measured on a fresh village at full zoom, dragged west until the clamp
     stopped it: the middle of the screen sat at tile 0.77, 13.89, where the
     grid ends at 13.5. Tapping it did nothing -- not land to claim, not a
     building to open -- because tap asks for a tile inside the grid and there
     was not one there. On a desktop window the same drag stops at tile 1, 13
     and offers the claim, because the margin the lines above keep is 0.35 of
     a HALF-VIEW and a desktop half-view is wider: 82 world pixels against 56.
     So the fault was never desktop-shaped, and the battery was run on a
     desktop.

     Clamping the tile coordinates is the same rule the lines above are trying
     to express, said in the space the grid is actually square in. It is
     tighter than the box everywhere except the four points of the diamond,
     which it still reaches -- so the player can still pan to each far point
     of the island, and cannot pan into the water beside it. Held to tile
     CENTRES rather than tile edges so that the rounding tileAt does lands
     inside the grid rather than exactly on its boundary. */
  const t = worldToTile(CAM.x, CAM.y);
  const c = Math.max(0, Math.min(GW - 1, t.c)), r = Math.max(0, Math.min(GH - 1, t.r));
  if (c !== t.c || r !== t.r) { const w = tileToWorld(c, r); CAM.x = w.x; CAM.y = w.y; }
}
/* Change the zoom while holding one world point under one screen point.

   This is what "anchored zoom" means, and both ways of zooming need it: a pinch
   holds the point between the fingers, a wheel holds the point under the
   cursor. Written once so the two cannot drift apart. */
function zoomHolding(z, sx, sy, w) {
  CAM.z = Math.max(ZMIN, Math.min(ZMAX, z));
  const sc = camScale();
  CAM.x = w.x - (sx - W / 2) / sc;
  CAM.y = w.y - (sy - H / 2) / sc;
  camClamp();
}
function worldBounds() {
  const a = tileToWorld(0, 0), b = tileToWorld(GW, 0), c2 = tileToWorld(0, GH), d = tileToWorld(GW, GH);
  return { x0: Math.min(a.x, b.x, c2.x, d.x), x1: Math.max(a.x, b.x, c2.x, d.x),
           y0: Math.min(a.y, b.y, c2.y, d.y), y1: Math.max(a.y, b.y, c2.y, d.y) };
}
/* Frame the land the player OWNS, not the whole sea.

   The camera opened at zoom 1 on the middle of a 14x14 grid whatever the
   village looked like, so a new player -- who owns a six-tile core and one
   building -- met a hall the size of a thumbnail with half the screen given
   over to open water. The land is the subject; the sea is the frame. */
function landWorldBounds() {
  const L = landBounds();
  const cs = [tileToWorld(L.lo - .5, L.lo - .5), tileToWorld(L.hi + .5, L.lo - .5),
              tileToWorld(L.lo - .5, L.hi + .5), tileToWorld(L.hi + .5, L.hi + .5)];
  const xs = cs.map(p => p.x), ys = cs.map(p => p.y);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}
/* The zoom that just contains it. The vertical margin is the larger one because
   the resource bars sit over the top of the world and the build tray over the
   bottom -- fitting to the raw canvas would tuck the near corner of the island
   behind the tray. */
/* What the opening view should contain: the village, not the island.

   Framing the claimed land sounds right and is not, once there is anything on
   it. At full size the island is fourteen tiles across and simply does not fit
   a phone at a readable size, so the fit cropped the east and west points --
   and on a tall handset, where width is what limits everything, that crop came
   off whatever the player had built out there. Framing what they built instead
   gives a close view of a compact village, the same view as before of a spread
   one, and never cuts a building in half to show more water.

   The floor keeps an empty island from opening on one lonely hall. */
function builtBounds() {
  const L = landBounds();
  const core = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
  for (const p of placed) {
    /* By the painting where there is one. A tile either side of the centre is
       narrower than a mill's sails or a farm's fence, and on a full island that
       put a farm 37 and a mill 41 logical pixels off the screen edges -- the
       very crop the paragraph above says this fit exists to prevent. */
    const R = artRect(p);
    if (R) {
      core.x0 = Math.min(core.x0, R.left); core.x1 = Math.max(core.x1, R.left + R.wid);
      core.y0 = Math.min(core.y0, R.top); core.y1 = Math.max(core.y1, R.top + R.hgt);
      continue;
    }
    const c = centreOf(p);
    core.x0 = Math.min(core.x0, c.x - TW); core.x1 = Math.max(core.x1, c.x + TW);
    core.y0 = Math.min(core.y0, c.y - TH); core.y1 = Math.max(core.y1, c.y + TH);
  }
  if (!isFinite(core.x0)) return landWorldBounds();
  // never tighter than the starting plot, never wider than the island
  const mid = tileToWorld((L.lo + L.hi) / 2, (L.lo + L.hi) / 2);
  const minHalfW = 3.2 * TW, minHalfH = 3.2 * TH;
  core.x0 = Math.min(core.x0, mid.x - minHalfW); core.x1 = Math.max(core.x1, mid.x + minHalfW);
  core.y0 = Math.min(core.y0, mid.y - minHalfH); core.y1 = Math.max(core.y1, mid.y + minHalfH);
  /* Held inside the whole grid, not the claimed diamond: a painting on the
     edge of the claim stands out past it, and clamping to the claim cropped it.

     And half a tile past the grid as well, for the same reason one step up.
     A painting is fitted to the WIDTH of its plot, and the plots on the very
     edge of the fourth ring sit on the edge of the grid -- so a wide sprite
     there stands out over the water, which is exactly what it is supposed to
     do and exactly what this clamp then cut off. Measured on a packed island
     at the largest ring: a lumber camp framed from -26 to 152 on a 360 wide
     phone, twenty-six pixels of it past the edge of the screen in the one view
     whose whole job is to show the village. Half a tile is the overhang a
     plot-wide sprite can have and no more. */
  const b = worldBounds(), over = TW / 2;
  return { x0: Math.max(core.x0, b.x0 - over), x1: Math.min(core.x1, b.x1 + over),
           y0: Math.max(core.y0, b.y0 - over), y1: Math.min(core.y1, b.y1 + over) };
}
function landFitZoom(wide) {
  const b = wide ? landWorldBounds() : builtBounds();
  const padTop = 130 * US(), padBot = 300 * US();
  /* The land is a diamond twice as wide as it is tall, and the screen is taller
     than it is wide, so a strict fit is always limited by the width and leaves a
     third of the height as open water. The extreme east and west points of the
     diamond are its emptiest ground, so a little of them is allowed off the
     edges -- worth about fifteen percent more zoom on everything the player
     actually looks at, and they are one pan away. */
  /* Showing the whole island is what the "wide" fit is for -- the moment a ring
     is bought, so the player sees what their money went on. Its east and west
     points are its emptiest ground, so a little of them is allowed past the
     edges there; the village fit is exact, because everything in it matters. */
  const zx = W / ((b.x1 - b.x0) * (wide ? 0.86 : 1));
  const zy = (VH - padTop - padBot) / (b.y1 - b.y0);
  return Math.max(ZMIN, Math.min(ZMAX, Math.min(zx, zy) / CAM.base));
}
/* Centred on the land, nudged down so the free space lands under the tray
   rather than being split evenly above and below. */
function camFitTarget(wide) {
  const b = wide ? landWorldBounds() : builtBounds(), z = landFitZoom(wide);
  const s = CAM.base * z;
  return { z, x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 + (300 * US() - 130 * US()) / (2 * s) };
}
/* The player's "reduce motion" setting, read live.

   Android and iOS both expose it and a Capacitor WebView passes it through as
   prefers-reduced-motion, and nothing in this game had ever looked at it -- while
   the last few rounds ADDED motion: a glide whenever the camera frames something,
   and momentum that carries a flick onwards after the finger lifts. Uninvited
   camera movement is exactly what that setting exists to switch off.

   What goes is decoration: the glide becomes a cut, a flick stops where the
   finger stops, villagers walk without bobbing, smoke and lamplight hold still.
   What stays is information -- villagers still move between their work and the
   store, because that movement IS the economy, and delivery pops still rise
   where goods land. Listened to rather than read once, because the setting can
   be changed with the app open. */
let reduceMotion = false;
try {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  reduceMotion = mq.matches;
  const onChange = e => { reduceMotion = e.matches; if (reduceMotion) { camFling = null; } };
  if (mq.addEventListener) mq.addEventListener('change', onChange);
  else if (mq.addListener) mq.addListener(onChange);
} catch (e) {}
function camFit(instant, wide) {
  const t = camFitTarget(wide);
  camFling = null;                       // a framing move outranks a flick
  if (instant || reduceMotion) { CAM.z = t.z; CAM.x = t.x; CAM.y = t.y; camGlide = null; camClamp(); }
  else camGlide = t;
}
/* An eased move rather than a jump. A cut makes the player re-find their own
   village; a glide of about half a second carries the eye with it. */
let camGlide = null;
let camTouched = false;                 // the player has moved the camera since boot
/* Where a flick is still going after the finger has gone.

   The camera stopped dead the instant a drag ended, which is the one thing a
   draggable map never does: on a phone, crossing a full island meant four
   separate drags with a full stop between each. Momentum in WORLD units per
   second, so a flick at one zoom carries the same distance across the ground as
   the same flick at another.

   FLING_DECAY is per second and settles in about a third of a second -- long
   enough to feel like the map has weight, short enough that it never runs away
   from the thumb about to touch it again. */
let camFling = null;
const FLING_DECAY = 0.002, FLING_MIN = 12;
function stepCam(dt) {
  if (camFling) {
    CAM.x += camFling.x * dt;
    CAM.y += camFling.y * dt;
    const k = Math.pow(FLING_DECAY, dt);
    camFling.x *= k; camFling.y *= k;
    const before = { x: CAM.x, y: CAM.y };
    camClamp();
    /* Clamped means it hit the edge of the world; carrying on would grind
       against it for another quarter of a second. */
    if (Math.hypot(camFling.x, camFling.y) < FLING_MIN
      || before.x !== CAM.x || before.y !== CAM.y) camFling = null;
  }
  if (!camGlide) return;
  const k = 1 - Math.pow(0.004, dt);            // ~half a second to settle
  CAM.z += (camGlide.z - CAM.z) * k;
  CAM.x += (camGlide.x - CAM.x) * k;
  CAM.y += (camGlide.y - CAM.y) * k;
  camClamp();
  if (Math.abs(camGlide.z - CAM.z) < 0.002
    && Math.hypot(camGlide.x - CAM.x, camGlide.y - CAM.y) < 2) camGlide = null;
}
function camApply() { const s = camScale(); g.translate(W / 2, H / 2); g.scale(s, s); g.translate(-CAM.x, -CAM.y); }
function camUnproject(sx, sy) { const s = camScale(); return { x: (sx - W / 2) / s + CAM.x, y: (sy - H / 2) / s + CAM.y }; }
function camProject(wx, wy) { const s = camScale(); return { x: (wx - CAM.x) * s + W / 2, y: (wy - CAM.y) * s + H / 2 }; }

/* ---------- HUD scale (same approach as Gatestorm) ---------- */
const US = () => Math.max(1, Math.min(1.34, VH / H));
/* The whole canvas, cutout and all. The night wash and the dimming behind a
   card use this: they should cover the screen, notch included, or the tint
   stops in a line across the top of the phone. */
const screenTop = () => -OY;
const screenBot = () => H + OY;
/* Where the interface may actually put things. A phone with a camera cutout
   eats the top of its own screen and the gesture bar eats the bottom, and the
   page asks for viewport-fit=cover -- which is what lets the sea reach the
   edges, and also what puts the resource chips under the camera unless somebody
   subtracts the insets again. Nothing did. */
let SAFE = { top: 0, bottom: 0 };
/* Whether the insets have ever been read off a canvas that had a box to
   measure. A read that finds a laid-out canvas and gets zero is a success --
   most phones have no notch -- and only a read that found nothing to measure
   leaves this false. */
let safeKnown = false;
function readSafeArea() {
  const el = document.getElementById('safe');
  if (!el) return;
  const cs = getComputedStyle(el);
  const t = parseFloat(cs.paddingTop) || 0, b = parseFloat(cs.paddingBottom) || 0;
  // CSS pixels into the canvas's own units, which is what everything is drawn in
  const rect = cv.getBoundingClientRect();
  if (!(rect.height > 0)) return;                    // laid out yet? fitCanvas asks again
  const k = VH / rect.height;
  SAFE = { top: t * k, bottom: b * k };
  safeKnown = true;
}
const hudTop = () => -OY + SAFE.top;
const hudBot = () => H + OY - SAFE.bottom;
const mS = v => v * US();

/* ---------- buildings ----------
   jobs   how many villagers can work here. A building with jobs produces
          NOTHING on its own -- see stepVillagers.
   wallH  height of the procedural stand-in, used until art arrives.
   boost  a well lifts the output of producers near it. */
const BUILDINGS = [
  /* The hall keeps a woodpile, worked by whoever is spare. It is deliberately
     feeble -- its job is not to feed the village but to make a dead end
     impossible. Two houses and a farm at level 1 leave you 15 wood, no wood
     income, and a lumber camp costs 20: without this the game is over. */
  { key: 'hall',   name: 'Town Hall', w: 2, h: 2, cost: { wood: 0 }, unique: true, wallH: 88, icon: '🏛️',
    makes: { wood: 0.15 }, jobs: 1, trade: 'Woodcutter',
    blurb: 'The heart of the village. Spare villagers keep its woodpile.' },
  { key: 'house',  name: 'House',     w: 2, h: 1, cost: { wood: 30 },            pop: 2,   icon: '🏠',
    // said "two more villagers" flat, while the panel beneath it counts up to
    // six -- a level five house takes three times what the description claims
    blurb: 'Villagers live here. Every level makes room for one more.' },
  { key: 'farm',   name: 'Farm',      w: 2, h: 2, cost: { wood: 45 },            makes: { food: 0.7 },  jobs: 2, trade: 'Farmhand', wallH: 26, icon: '🌾',
    blurb: 'Grows food. Needs villagers to work it.' },
  /* short: what the tray calls it. The full name is two words and the tray
     divides a fixed 1024 between however many kinds are unlocked, so at a size
     anyone can read on a phone "Lumber Camp" runs into "Storehouse" beside it.
     The panel, which has the room, still says Lumber Camp. */
  { key: 'lumber', name: 'Lumber Camp', short: 'Lumber', w: 2, h: 1, cost: { wood: 20, food: 15 }, makes: { wood: 0.6 },  jobs: 2, trade: 'Woodcutter', icon: '🪵',
    blurb: 'Cuts wood. Needs villagers to work it.' },
  /* The third kind of goods, and the first one that is not simply another
     pile to grow.

     Wood and food are interchangeable in every way that matters: both are
     made by a camp with workers in it, both are spent on everything, and a
     village short of one builds the other building. Nothing in that is a
     decision. Stone is spent on the three things a village WANTS -- the mill,
     the market, the beacon -- and on the statue, and it is made nowhere else
     but here. So the hall reaching level three stops being "now you may have
     a mill" and becomes "now you may have a mill, once you have taken two
     villagers off wood or food and put them on stone", which is the first
     time the game asks the player to give something up.

     Slower than either of the others on purpose -- 0.4 against a farm's 0.7
     and a lumber camp's 0.6 -- because what it buys is bought once, and a
     third pile that fills as fast as the other two is a third pile nobody
     has to think about.

     It shipped as a standIn, drawn by the procedural building until its
     picture existed (prompt group 29). The picture exists now, so the flag
     is gone and artSweep requires it like any other building's. */
  { key: 'quarry', name: 'Quarry',    w: 2, h: 1, cost: { wood: 80, food: 40 },  makes: { stone: 0.4 }, jobs: 2, trade: 'Stonecutter', wallH: 34, icon: '🪨',
    blurb: 'Cuts stone. The mill and the market are built of it.' },
  // short: see the note on the lumber camp -- "Storehouse" is 137 logical
  // pixels wide in a 115 pixel tray button
  { key: 'store',  name: 'Storehouse', short: 'Store', w: 2, h: 2, cost: { wood: 60, food: 20 },  caps: { wood: 400, food: 400, stone: 400 }, wallH: 74, icon: '📦',
    /* The second sentence is the one that matters and it was doing no work.
       Carrying is half this economy: a storehouse near a distant farm shortens
       every trip that farm ever makes, which is usually worth more than the
       ceiling it raises. */
    /* The panel gives a blurb ONE line, and fitLines will not shrink below the
       readable floor -- so a blurb that does not fit at that floor does not get
       smaller, it gets drawn past the edge of the panel and, on a 16:9 phone,
       past the edge of the screen. This one ran 168 logical px over at its
       worst. A blurb has to be short enough to fit at the floor: no fitter can
       save a string that is simply too long. */
    blurb: 'Raises what you can hold. Villagers carry to the nearest one.' },
  { key: 'well',   name: 'Well',      w: 1, h: 1, cost: { wood: 40 },            boost: 0.35, boostR: 2.6, wallH: 30, icon: '⛲',
    // no percentage here on purpose: it would be a rate figure, and the line
    // below the blurb reports what the well is really adding where it stands
    blurb: 'Speeds up the workplaces around it. Keep it close to them.' },
  { key: 'mill',   name: 'Mill',      w: 2, h: 2, cost: { wood: 120, stone: 60 }, makes: { food: 1.8 },  jobs: 2, trade: 'Miller', wallH: 96, icon: '🌬️',
    blurb: 'Grinds grain. Far more food than a farm, for two workers.' },
  { key: 'market', name: 'Market',    w: 2, h: 2, cost: { wood: 200, stone: 120 }, caps: { wood: 800, food: 800, stone: 800 }, makes: { wood: 0.55 }, jobs: 1, trade: 'Trader', wallH: 62, icon: '🏪',
    blurb: 'Adds a trading stall and brings the traders round sooner.' },

  /* ---------- the beacon ----------

     What a finished village is FOR.

     Measured on one: every building kind at its allowance, both resources
     pinned at the ceiling, and sixty-nine villagers producing eighty a second
     into a barn that cannot take a grain of it. The game says so itself --
     "what villagers bring in now is thrown away" -- and it was right.

     The beacon is the one thing in this game with no ceiling. It does not
     have to be afforded, and that is deliberate rather than generous: every
     stage past the first would cost more than a full barn holds, so an
     ordinary upgrade button could never be pressed however long anyone
     played. It DRINKS instead. While a stage is unfinished it draws steadily
     out of the stores, so the surplus that was being destroyed goes into it,
     and the thing a maxed village does all day stops being waste and starts
     being a building getting taller.

     And it pays for itself in the only currency left. Each stage sends more
     of what the village sheds over the water, which is the number the goals
     past the ladder are counted in -- so the loop closes: produce, overflow,
     ship, and the beacon makes the shipping worth more.

     Unlocked by finishing, not by the hall. It is deliberately NOT in the
     hall's allowance: that table is what "build everything your hall allows"
     is measured against, and a building that needs art nobody has drawn yet
     would make that goal impossible to finish. */
  { key: 'beacon', name: 'Beacon',    w: 2, h: 2, cost: { wood: 2500, stone: 1600 }, unique: true, wallH: 150, icon: '🗼',
    blurb: 'A light for your neighbours. It takes half of every load as it rises, and sends more over the water.' },

  /* ---------- decorations ----------
     Bought and placed like buildings, but they take no time to put up, have no
     level, and can be taken away again. `charm` is what they are for: a village
     people want to look at works a little harder. `flat` marks the ones painted
     ONTO the ground rather than standing on it. */
  { key: 'path',    name: 'Path',      w: 1, h: 1, cost: { wood: 5 },             decor: true, flat: true, charm: 1,  icon: '🟫',
    // said "half again" while the figure above it was 2.2; the number moved once
    // and the words did not
    blurb: 'Villagers walk twice as fast on a road. Lay them end to end.' },
  { key: 'fence',   name: 'Fence',     w: 1, h: 1, cost: { wood: 8 },             decor: true, charm: 2,  icon: '🚧',
    blurb: 'Split rails. Good for edging a farm.' },
  { key: 'flowers', name: 'Flowerbed', w: 1, h: 1, cost: { wood: 10, food: 10 },  decor: true, charm: 5,  icon: '🌷',
    blurb: 'A bed of wildflowers.' },
  { key: 'hedge',   name: 'Hedge',     w: 1, h: 1, cost: { wood: 16, food: 8 },   decor: true, charm: 7,  icon: '🌲',
    blurb: 'A clipped green hedge.' },
  /* The ladder ran 1, 2, 5, 7, 12 and then 45, so a player saving towards
     charm went from a lamp straight to a statue with nothing between; the
     bench and the banner are the rungs it was missing, priced at about the
     same wood per charm as the ornaments either side of them. */
  { key: 'bench',   name: 'Bench',     w: 1, h: 1, cost: { wood: 24, food: 6 },   decor: true, charm: 9,  icon: '🪑',
    blurb: 'Oak planks on log legs. Somewhere to sit and watch the village.' },
  { key: 'lamp',    name: 'Lamp',      w: 1, h: 1, cost: { wood: 30 },            decor: true, charm: 12, icon: '🏮',
    blurb: 'An iron lamp on a post, lit at dusk.' },
  { key: 'banner',  name: 'Banner',    w: 1, h: 1, cost: { wood: 70, food: 40 },  decor: true, charm: 24, icon: '🚩',
    blurb: 'The village colours on a tall pole, the same as on the hall.' },
  { key: 'statue',  name: 'Statue',    w: 1, h: 1, cost: { wood: 150, stone: 80 }, decor: true, charm: 45, icon: '🗿',
    blurb: 'A stone figure on a plinth. The pride of the village.' },

  /* ---------- what is already out there ----------

     Claiming a ring of land is the best moment this game has, and until now
     it revealed grass. You paid five thousand wood for a rectangle.

     So each ring has something on it, and the something was there before you
     were: standing stones, an orchard gone feral, the cottage of whoever
     tried this island first, and their boat. They are FOUND, not bought.
     There is no cost, they are not in the tray, and they are not rationed --
     you cannot decide to have one, you can only go and look.

     They are decorations as far as charm is concerned, which is the one
     reward that costs the economy nothing to hand out: charm already has a
     ceiling, already multiplies what the village makes, and is already
     measured. What they must NOT do is count as decorations anywhere else --
     not against the sixty the village is allowed, not in the tray, and not in
     BEST_CHARM, which decides whether the charm goal is still reachable and
     would otherwise be told the best ornament available is one nobody can
     buy. Hence `found`. */
  { key: 'find_stones',  name: 'The Old Stones',   w: 2, h: 2, cost: {}, decor: true, found: true, charm: 20, icon: '🗿',
    blurb: 'Five standing stones, lichened over. Older than the village and nobody knows who set them.' },
  { key: 'find_orchard', name: 'The Wild Orchard', w: 2, h: 2, cost: {}, decor: true, found: true, charm: 30, icon: '🍎',
    blurb: 'Fruit trees gone feral in rows. Somebody planted these and did not come back.' },
  { key: 'find_ruin',    name: 'The Old Cottage',  w: 2, h: 2, cost: {}, decor: true, found: true, charm: 45, icon: '🏚️',
    blurb: 'A roofless cottage with a cold hearth. The first people to try this island lived here.' },
  { key: 'find_wreck',   name: 'The Old Wreck',    w: 2, h: 2, cost: {}, decor: true, found: true, charm: 60, icon: '🛶',
    blurb: 'A fishing boat up on the shingle, ribs open to the weather. This is how they left.' },
];

/* Which ring hides which. Index is the land tier, so nothing is on the
   founding claim -- that ground is yours from the first minute and a find
   there would be a gift, not a discovery. */
const FINDS = [null, 'find_stones', 'find_orchard', 'find_ruin', 'find_wreck'];
const FIND_KEYS = FINDS.filter(Boolean);
const isFound = key => { const b = B(key); return !!(b && b.found); };
/* The hottest primitive in the file by a distance -- centreOf, isDecor, jobsOf,
   every draw and every hit-test starts by looking a building up by key. It was
   a linear scan of the table, which is nothing on its own and everything at the
   rate this is called. A Map returns the same object, and undefined for an
   unknown key exactly as find did. */
const BY_KEY = new Map(BUILDINGS.map(b => [b.key, b]));
const B = k => BY_KEY.get(k);

/* ---------- land ----------
   The island used to be handed over whole, and a 14x14 field with four
   buildings on it never feels like it is growing. Now you start on a 6x6 core
   around the hall and buy your way outwards a ring at a time.

   This gives the village a second axis: the hall says WHAT you may build, the
   land says WHERE, and space becomes something you weigh rather than something
   you have too much of. It is also the largest sink in the game. */
const LAND = [
  { lo: 4, hi: 9,  cost: null },                          // the founding claim
  { lo: 3, hi: 10, cost: { wood: 200,  food: 120 } },
  { lo: 2, hi: 11, cost: { wood: 700,  food: 450 } },
  /* The last two rings are priced in wood the village no longer makes.

     Stone cost a full village two of its six lumber camps, which is the whole
     of that feature -- the labour here is fixed, so a third kind of goods has
     to come out of what used to go into wood. Measured on a maxed village:
     wood income went from 30.35 a second to 22.78, down a quarter, while food
     lost nothing and stayed at 35.60 in both. These two are bought at hall
     four and five, out of exactly that income, so their wood comes down by
     the same quarter and their food does not move at all.

     What this is NOT is a fix for the long stretch at the end of a
     playthrough, which is what it was reached for. Measured directly -- a
     maxed village, stores emptied, nothing else buying -- affording the
     fourth ring takes 2.1 minutes and the island 2.9. The stretch they sit in
     is sixteen. The price is about a eighth of it and a quarter off the price
     is worth half a minute; the rest is a village with somewhere else to put
     its wood. Keeping the figure in step with the income is worth doing on
     its own, and it is all this does. */
  { lo: 1, hi: 12, cost: { wood: 1500, food: 1300 } },
  { lo: 0, hi: 13, cost: { wood: 3750, food: 3200 } },
];
const LAND_MAX = LAND.length - 1;
let landTier = 0;
let claimAsk = false;                 // the claim prompt is open

const landBounds = () => LAND[Math.min(LAND_MAX, Math.max(0, landTier))];
function inLand(c, r) { const L = landBounds(); return c >= L.lo && c <= L.hi && r >= L.lo && r <= L.hi; }
const landNext = () => (landTier >= LAND_MAX ? null : LAND[landTier + 1].cost);
const canClaim = () => !!landNext() && canAfford(landNext());
function claimLand() {
  if (!canClaim()) return false;
  for (const [k, v] of Object.entries(landNext())) res[k] -= v;
  landTier++;
  placeFinds();                          // and what was already on it
  camFit(false, true);                   // the whole island, to show what was bought
  /* What was found on it, filmed, when it was put down -- the stones, the
     orchard, the cottage, the wreck. A ring with no room for its find today
     gets the shore instead: the clip must not show a thing that is not there. */
  const found = FINDS[landTier];
  if (found && placed.some(p => p.key === found)) celebrate(found + '_clip', 'New land · ' + B(found).name);
  else celebrate('land_new', 'New land · ring ' + (landTier + 1));
  claimAsk = false;
  save();
  SFX.upgrade();
  return true;
}
/* A save made before land existed, or edited, can hold buildings outside the
   current claim. Rather than strand them somewhere unreachable, the claim is
   widened to include what is already there. */
/* A free spot for a find, somewhere in the ring that was just claimed.

   The band only, not the whole island: the point of the thing is that it
   comes with the new land. Ordered by the same hash the scenery uses, so it
   lands somewhere different in each corner of the map rather than always the
   top-left tile of the band, and so it lands in the SAME place every time
   this island is played -- it was supposed to have been there for years. */
function findSpot(key, tier) {
  const L = LAND[tier], inner = LAND[tier - 1];
  const occ = occupied(), spots = [];
  for (let r = L.lo; r <= L.hi - 1; r++) for (let c = L.lo; c <= L.hi - 1; c++) {
    const outside = c < inner.lo || r < inner.lo || c + 1 > inner.hi || r + 1 > inner.hi;
    if (!outside) continue;                    // inside the old border: not new land
    if (!canPlace(key, c, r, occ)) continue;
    spots.push({ c, r, n: hash(c * 13 + tier, r * 17 + tier) });
  }
  if (!spots.length) return null;
  spots.sort((a, b) => a.n - b.n);
  return spots[0];
}

/* Everything the claimed land should be holding, put there if it is not.

   Reconciled rather than placed once at the moment of claiming, for two
   reasons. The art may not have arrived yet -- a find with no picture would
   draw as a coloured box, so it simply is not placed until there is
   something to draw, and appears when the file turns up. And a save from
   before any of this existed has claimed land with nothing on it; those
   finds are put where they always should have been, the next time the game
   opens.

   Nothing is ever moved or removed by this. If a find is already in `placed`
   it is left exactly where it is, wherever the player has since dragged it. */
/* Asked once a second rather than once at boot.

   Two things arrive late and neither announces itself. The art is fetched
   asynchronously, so on a cold start there is nothing to draw for the first
   second or so and a find placed then would be a coloured box. And a village
   packed to its border may have no room for a 2x2 landmark today and plenty
   tomorrow, after something is sold or moved.

   Cheap enough to leave running: four keys, each answered by a `some` over
   the placements, and it stops doing even that once every claimed ring has
   its find. */
let findClock = 0;
function stepFinds(dt) {
  findClock += dt;
  if (findClock < 1) return;
  findClock = 0;
  placeFinds();
}
function placeFinds() {
  for (let tier = 1; tier <= Math.min(LAND_MAX, landTier); tier++) {
    const key = FINDS[tier];
    if (!key || !artFor(key)) continue;        // no picture yet, so nothing to reveal
    if (placed.some(p => p.key === key)) continue;
    const at = findSpot(key, tier);
    if (!at) continue;                         // no room today; asked again later
    /* build as every other placement has it. It means nothing for a find,
       which is never built, but load() reads 0 as missing and writes
       BUILD_TIME, so a find saved with 0 came back different from how it
       went in -- the one thing a save round trip must never do. */
    placed.push({ id: nextId++, key, c: at.c, r: at.r, t: 1, lvl: 1, stock: 0, build: BUILD_TIME });
    rebuildCharm();
    save();
  }
}

function coverPlaced() {
  for (const p of placed) {
    const b = B(p.key);
    while (landTier < LAND_MAX &&
      (p.c < landBounds().lo || p.r < landBounds().lo ||
       p.c + b.w - 1 > landBounds().hi || p.r + b.h - 1 > landBounds().hi)) landTier++;
  }
}

/* ---------- town hall levels ----------
   The hall is the spine of the game: every level raises the cap on what you may
   build, and introduces the next kind. `allow` is the TOTAL permitted at that
   level, not an increment, so the table reads as the shape of the village at
   each stage. `up` is the cost of reaching the NEXT level; null means the top. */
const HALL = [
  null,
  { allow: { house: 2,  farm: 1, lumber: 1 },                                       up: { wood: 150,  food: 80 } },
  { allow: { house: 4,  farm: 2, lumber: 2, store: 1, well: 1 },                    up: { wood: 400,  food: 220 } },
  { allow: { house: 6,  farm: 3, lumber: 2, quarry: 1, store: 2, well: 2, mill: 1 }, up: { wood: 900,  food: 500 } },
  { allow: { house: 9,  farm: 4, lumber: 3, quarry: 1, store: 3, well: 3, mill: 2, market: 1 }, up: { wood: 2000, food: 1100 } },
  { allow: { house: 12, farm: 6, lumber: 4, quarry: 2, store: 4, well: 4, mill: 3, market: 2 }, up: null },
];
const HALL_MAX = HALL.length - 1;
const HALL_TIME = 6;                  // seconds an upgrade takes

/* ---------- building levels ----------
   The hall caps HOW MANY of each building you may have, which on its own runs
   out: by hall level 4 the village is full and there is nothing left to want.
   Levels are the sink. Every building goes to 5, each step costing sharply more
   than the last, so a full storehouse always has somewhere to go.

   A building may never outrank its hall. That is what keeps the hall the centre
   of the game rather than a gate you walk through once. */
const LVL_MAX = 5;
const lvlOf = p => Math.min(LVL_MAX, Math.max(1, p.lvl | 0));
// what a level is worth: level 5 is 2.4x level 1
const outMul = l => 1 + 0.35 * (l - 1);
const popOf  = p => B(p.key).pop ? B(p.key).pop + (lvlOf(p) - 1) : 0;
/* How many people actually live here right now.

   A house being UPGRADED keeps the people it already had, for exactly the
   reason a storehouse keeps its capacity while it is being improved: counting
   only finished buildings threw the residents out for the duration, so the
   workplaces they staffed stopped, and improving a house punished you for
   improving it. A house that has never finished houses nobody. */
function livedIn(p) {
  if (!B(p.key).pop) return 0;
  const lvl = lvlHeld(p);
  return lvl >= 1 ? B(p.key).pop + (lvl - 1) : 0;
}
// and how many are on their way, once what is being built finishes
const peopleComing = () => placed.reduce((n, p) =>
  n + (p.t < 1 && B(p.key).pop ? popOf(p) - livedIn(p) : 0), 0);
/* A bigger workplace employs more people. Without this the village runs out of
   jobs long before it runs out of houses, and every house past the fourth is
   wood spent on villagers who stand about. */
const jobsOf = p => { const b = B(p.key); if (!b.jobs) return 0;
  const l = lvlOf(p); return b.jobs + (l >= 3 ? 1 : 0) + (l >= 5 ? 1 : 0); };
const capsOf = (p, k) => B(p.key).caps ? Math.round(B(p.key).caps[k] * outMul(lvlOf(p))) : 0;
/* What it is HOLDING for the village right now: nothing the first time it is
   being built, and the room it already had while an upgrade is under way. The
   same question livedIn answers about people, and for the same reason -- a
   thing paid for is not a thing finished. capsSum worked it out inline and the
   panel did not ask it at all. */
const capsHeld = (p, k) => { const lvl = lvlHeld(p); return lvl < 1 ? 0 : capsOf({ key: p.key, lvl }, k); };
const rateOf = (p, k) => (B(p.key).makes ? B(p.key).makes[k] || 0 : 0) * outMul(lvlOf(p));

/* Upgrade prices climb steeply on purpose -- a gentle curve is exhausted in an
   evening. A house runs 65, 140, 290, 610 wood across its four steps, and
   unitSweep holds the ladder to that so the note cannot drift off the
   constants again -- it said 295 and 620 for a while after they moved. */
const UP_STEP = 2.2, UP_GROWTH = 2.1;
function upCostOf(p) {
  const b = B(p.key), f = UP_STEP * Math.pow(UP_GROWTH, lvlOf(p) - 1);
  const c = {};
  for (const [k, v] of Object.entries(b.cost)) if (v) c[k] = Math.round(v * f / 5) * 5;
  // wood-only buildings start wanting food too, so late upgrades drain both
  // piles rather than leaving one of them pointless
  if (!c.food) c.food = Math.round(f * 9 / 5) * 5;
  /* In the order every other price is written in. The food was added last, so
     a mill or a market -- the two buildings priced in stone -- read
     "Upgrade to 2   🪵440  🪨265  🌾20" while the sell button beside it, the
     tray and the goal strip all go wood, food, stone. A reader scanning a row
     of costs finds each kind by where it sits, not by its icon. */
  return Object.fromEntries(RES.filter(k => c[k]).map(k => [k, c[k]]));
}
const upTime = p => 4 + 2 * lvlOf(p);

/* Everything the upgrade button needs to know, for the hall and for the rest. */
function upInfo(p) {
  const l = lvlOf(p);
  /* A decoration has no levels. Nothing about one grows with a level -- its
     charm is fixed -- and upgrading a statue spent 330 wood and 175 food to
     change nothing at all. The panel never offered it; the rule now agrees. */
  if (isDecor(p.key)) return { max: true, cost: null, gate: 0 };
  /* Nor is the beacon, and for a harder reason than the statue's. Every stage
     past the first costs more than a full barn can hold, so an upgrade button
     here would be one no player could ever press however long they played.
     It takes what it needs out of the stores itself, a little each second,
     and the panel says how far along it is instead of offering a price. */
  if (p.key === BEACON) return { max: true, cost: null, gate: 0 };
  if (p.key === 'hall') {
    const nx = HALL[l].up;
    return { max: !nx, cost: nx, gate: 0 };
  }
  if (l >= LVL_MAX) return { max: true, cost: null, gate: 0 };
  // gate: the hall level you would need first, or 0 if none
  return { max: false, cost: upCostOf(p), gate: l >= hallLevel() ? l + 1 : 0 };
}
function canUpgrade(p) {
  if (!p || p.t < 1) return false;
  const i = upInfo(p);
  return !i.max && !i.gate && canAfford(i.cost);
}
function upgradeBuilding(p) {
  if (!canUpgrade(p)) return false;
  const i = upInfo(p);
  for (const [k, v] of Object.entries(i.cost)) res[k] -= v;
  p.lvl = Math.min(p.key === 'hall' ? HALL_MAX : LVL_MAX, lvlOf(p) + 1);
  p.t = 0;                            // back under scaffolding while it grows
  p.build = p.key === 'hall' ? HALL_TIME : upTime(p);
  recomputeCaps();
  save();
  SFX.upgrade();
  return true;
}

let res = { ...tally(), wood: 120, food: 60 };
let caps = tally(300);
let placed = [];                      // {id,key,c,r,t,lvl,stock} t = build progress 0..1
let nextId = 1;
let selBuild = null;                  // key being placed
let ghost = null;                     // {c,r,ok}
let panel = null;                     // id of the building whose panel is open
/* The SEED of the villager whose card is open, not an index into the list.

   Villagers are spliced out of the middle when a house goes, so an index
   would quietly become a different person -- and the whole point of giving
   them names was that they stop being interchangeable. A seed belongs to one
   villager for as long as that villager exists, and survives the rebuild the
   game does on every load. */
let who = null;
let moving = null;                    // id of the building being relocated
/* Placement takes two taps: the first puts the ghost down, the second commits.

   One tap was not enough. The ghost only updates while a pointer is DOWN, so on
   a phone a single tap placed the building instantly and the preview -- which is
   where the efficiency of the spot is shown -- was never on screen long enough
   to read. Choosing a spot you were shown beats discovering it afterwards, and
   a mis-tap now costs nothing. */
let armed = null;                     // {c,r} the ghost is waiting to confirm
/* Selling is the only move in the game that cannot be undone, and it was the
   one thing that happened on a single tap -- while PLACING a building, which
   costs nothing you cannot get back, asked for confirmation. A level five mill
   is two thousand wood and one mis-tap from gone. It now arms first, and
   disarms itself after a few seconds so the panel is never left sitting there
   with a live demolish button on it. */
let sellArm = null;                   // {id, t} the sell button awaiting its second tap
const SELL_ARM = 4;                   // seconds before it goes back to sleep

/* ---------- orders ----------
   Two problems, one system.

   Between decisions there was nothing to do but watch numbers rise. And one
   resource always ran ahead of the other -- food routinely sat at its cap doing
   nothing while wood was the bottleneck -- so half the village's output was
   being thrown away.

   Orders are a standing trade: hand over the resource you have too much of, take
   the one you need. They are deliberately SMALL and slow to arrive, because an
   order that beats a lumber camp would replace the game rather than season it.
   Sized against the storage cap so they stay meaningful as the village grows. */
const ORDER_SLOTS = 3;                // with no market
const ORDER_EVERY = 75;               // seconds between new offers, likewise
let orders = [], orderT = 0, orderSeq = 1, ordersDone = 0;

/* The market runs the market.

   As a producer it was dominated ten to twenty times over by every other
   workplace, and as storage it was half a storehouse per wood -- so a player
   who did the arithmetic would never build one. The problem was not its
   numbers: it was that the trade BUILDING had nothing to do with the trade
   SYSTEM. Now each one adds a stall and brings the traders round faster, which
   at a full village is where a third of all wood comes from. */
const marketCount = () => placed.reduce((n, p) => n + (p.key === 'market' && established(p) ? 1 : 0), 0);
const orderSlots = () => Math.min(5, ORDER_SLOTS + marketCount());
const orderEvery = () => ORDER_EVERY / (1 + 0.30 * marketCount());

/* Three sizes, and the big one trades better.

   Every offer used to be a random 10-14% of the cap paying back a random
   10-13%, and the direction is fixed by whichever resource the village is
   richer in -- so the three stalls showed three copies of the same trade at
   three barely different prices, and which one to take was luck rather than a
   decision. Now they are a quick one, a middling one and a big one, and the
   rate improves with the size, so holding out for the big stall is a real
   choice and saving up for it is rewarded.

   Every rate is still BELOW even, and that is deliberate. Direction follows the
   surplus, so an order that paid more than it cost could be looped -- give
   food, take wood, now wood is the rich one, give it back -- and it would print
   resources for ever. (My first numbers asked 14% and returned 8%, which is the
   same mistake pointing the other way: auto-filling every order stalled the run
   completely.) Trade is not meant to be profitable in units. Its value is that
   a full barn is throwing away everything the villagers carry into it, so
   converting that surplus at 94% into the thing you are short of is a bargain
   against the nothing it was worth. */
const ORDER_TIERS = [
  { size: 0.07, rate: 0.88 },
  { size: 0.14, rate: 0.94 },
  { size: 0.23, rate: 0.99 },
];
/* Which size an order of this many units is, for an order that predates the
   tiers or whose cap has since changed. */
function nearestTier(n, kind) {
  const share = n / Math.max(1, caps[kind]);
  let best = 0, bd = Infinity;
  ORDER_TIERS.forEach((T, i) => { const d = Math.abs(T.size - share); if (d < bd) { bd = d; best = i; } });
  return best;
}
/* The kinds a trade may name.

   The sentence below is "ask for whatever the village is fullest of and pay
   in whatever it is shortest of", and it quietly assumes that what a village
   is short of is something it wants. A third resource broke that. Stone is
   zero from the first second of a new village and there is no way to make any
   until a quarry, which the hall does not allow until level three -- and zero
   of a cap is as empty as a kind can get, so stone was the answer to "what is
   this village shortest of" for the whole early game, and every offer paid in
   it. Measured across the early-game spread of stores: 93.7% of offers, and
   100% of them once the village held any wood AND any food, which is the
   normal case. Goal 6, "Fill three trade orders", arrives four goals before
   the quarry and asks the player to take three of them: 132 wood for 125
   stone, with a house at 30 wood and nothing stone can buy for another ten
   goals. Three stalls showing three sizes of one forced trade is the exact
   degeneracy ORDER_TIERS was added to end.

   So a trade may only name a kind the village has some way of obtaining:
   something the hall already allows makes it, or there is some in the stores
   already. Holding some counts as well as making it, so that a player who
   took one of those trades before this was fixed can sell the stone back
   instead of being stuck with it for ten goals. Costing a kind deliberately
   does NOT count -- a statue costs stone and sits on the decorate tray from
   the first minute, which is what made paying in stone look defensible.

   The fallback to all three is for a village that somehow qualifies on fewer
   than two: a trade needs two sides, and one drawn from a single kind would
   offer to swap a resource for itself. */
const tradeKinds = () => {
  const ks = RES.filter(k => res[k] > 0 || BUILDINGS.some(b => b.makes && b.makes[k] && unlocked(b.key)));
  return ks.length >= 2 ? ks : RES.slice();
};
function makeOrder(tier) {
  /* Ask for whatever the village is fullest of and pay in whatever it is
     shortest of. With two kinds that is the same sentence as "the richer of
     the two", which is what this was; with three it is the only version of
     it that still means anything.

     Ties break towards the LATER kind, which is what the comparison it
     replaces did -- a village holding exactly half of each offered to give
     food, not wood -- and the order sweep sets both stores to half a barn on
     purpose, so a tie is not a corner case here, it is the usual case. */
  const fullness = k => res[k] / Math.max(1, caps[k]);
  const order = tradeKinds().sort((a, b) =>
    (fullness(b) - fullness(a)) || (RES.indexOf(b) - RES.indexOf(a)));
  let giveK = order[0], getK = order[order.length - 1];
  /* And among a tie, a pairing the board does not already have.

     With two kinds a tie had one answer and the board was its three sizes.
     With three, a village with its barns equally full -- every finished
     village, whose barns all sit at the ceiling -- broke every tie the same
     way, and all three stalls read "give 🪨, get 🪵": measured, 180 offers
     out of 180 at a tenth, half and nine tenths full. The rule is unchanged
     -- give from the fullest, get the emptiest -- and among the kinds tied for
     either, the first pairing not already standing at another stall wins,
     taken in the order the comparison above prefers. */
  const f = order.map(fullness), hi = f[0], lo = f[f.length - 1];
  const tops = order.filter(k => hi - fullness(k) < 1e-9);
  const bots = order.slice().reverse().filter(k => fullness(k) - lo < 1e-9);
  if (tops.length > 1 || bots.length > 1) {
    const standing = new Set(orders.map(o => o.giveK + '>' + o.getK));
    const pairs = [];
    for (const g2 of tops) for (const t2 of bots) if (g2 !== t2) pairs.push([g2, t2]);
    const fresh = pairs.find(([g2, t2]) => !standing.has(g2 + '>' + t2)) || pairs[0];
    if (fresh) [giveK, getK] = fresh;
  }
  /* Prefer a size that is not already on the board, so the stalls stay
     distinct even though they are filled one at a time. */
  /* Round to fives once the numbers are big enough to look untidy otherwise --
     at an early cap of 300 the small stall is asking for twenty, and rounding
     THAT to a five turns a 12% spread into a 25% one. */
  const snap = n => n >= 100 ? Math.max(5, Math.round(n / 5) * 5) : Math.max(1, Math.round(n));
  if (tier === undefined) {
    const taken = new Set(orders.map(o => o.tier));
    const all = ORDER_TIERS.map((_, i) => i), free = all.filter(i => !taken.has(i));
    /* And a size the village can pay for NOW, where there is one. The size was
       picked at random, so with both stores low the big stall asked for more
       than the village held -- and the board only swaps an offer out when none
       can be taken, one per trader, so a board of those sat there for minutes.
       A size it can pay comes first, a size not already on the board among those. */
    const payable = i => snap(caps[giveK] * ORDER_TIERS[i].size) <= res[giveK];
    const pools = [free.filter(payable), all.filter(payable), free, all];
    const from = pools.find(p => p.length);
    tier = from[(Math.random() * from.length) | 0];
  }
  const T = ORDER_TIERS[tier];
  const giveN = snap(caps[giveK] * T.size);
  /* Both sides as a share of the SAME cap, so the rate means what it says even
     when the two ceilings differ. */
  let getN = snap(caps[getK] * T.size * T.rate);
  /* And rounding must never pull an order up to exactly even. It did: at a cap
     of 1000 the big stall asked 230 and paid 230, which is a free converter,
     and a free converter makes wood and food the same resource for anyone who
     opens the tab -- no reason to balance farms against lumber camps, and every
     smaller stall pointless. Compared as shares, because the two ceilings can
     differ. */
  const step = getN >= 100 ? 5 : 1;
  while (getN > step && getN / caps[getK] >= giveN / caps[giveK]) getN -= step;
  return { id: orderSeq++, tier, giveK, giveN, getK, getN };
}
/* Each offer keeps its stall.

   Filling an order took it out of the list and the ones after it slid left
   into its place, so a quick second tap where the first had been traded on a
   DIFFERENT offer -- the 185-wood "best rate" card moved under the finger the
   instant the 42-food one beside it was taken. The replacement path already
   swapped in place for exactly this reason; filling did not. Now a filled
   stall stays empty, with its countdown, until a trader takes it. */
function freeStall() {
  const n = Math.max(1, orderSlots()), used = new Set(orders.map(o => o.slot));
  for (let i = 0; i < n; i++) if (!used.has(i)) return i;
  return n;
}
// repair: a stall that is missing, doubled, or beyond the board (a market sold)
function seatOrders() {
  const n = Math.max(1, orderSlots()), seen = new Set();
  for (const o of orders) {
    if (Number.isInteger(o.slot) && o.slot >= 0 && o.slot < n && !seen.has(o.slot)) seen.add(o.slot);
    else o.slot = undefined;
  }
  for (const o of orders) if (o.slot === undefined) {
    let i = 0; while (seen.has(i)) i++;
    o.slot = i; seen.add(i);
  }
  /* And the board cannot hold more offers than it has stalls.

     A market adds a stall, so selling one takes a stall away -- and the offer
     standing at it had nowhere to go. It kept its place in the list with a
     slot past the end of the board: never drawn, because orderRects only
     lays out the stalls that exist, and never cleared, because nothing looked.

     It is not merely invisible, it jams the board. orders.length is what
     decides whether a new trader is due, so a board of three showing three
     and holding five reports itself full for ever -- no countdown, no new
     offer. And the replacement path stands down the moment ANY offer can be
     filled, including one nobody can see, so three unfillable cards could sit
     there permanently behind a fourth that was fillable and invisible.
     Measured: two markets sold on a full board left five offers on three
     stalls, and ten simulated minutes later it was still five on three.

     The surplus goes. The player loses nothing they could have acted on --
     they could not see it -- and the board starts breathing again. Those that
     were already standing at a stall keep it; it is the ones that spilled past
     the end that are dropped. */
  if (orders.length > n) orders = orders.filter(o => o.slot < n);
}
function stepOrders(dt) {
  orderT += dt;
  if (orderT < orderEvery()) return;
  orderT = 0;
  seatOrders();
  if (orders.length < orderSlots()) { orders.push({ ...makeOrder(), slot: freeStall() }); save(); return; }
  /* A full board never changed again until something on it was filled, and an
     order asks for whichever resource the village was richer in WHEN IT WAS
     WRITTEN. Spend that down, or simply tip the other way, and all three point
     the wrong way at once -- three offers the player cannot take, sitting there
     for ever. Half an hour of simulated time with the same three ids on the
     board, and no way to clear them.

     A trader gives up and a new one comes, but only when there is nothing on
     the board the player could have taken: an offer they can act on is never
     pulled out from under them, even one they are saving up for. Replaced in
     place so the cards do not jump around. */
  if (orders.some(canFill)) return;
  /* Being unable to fill anything is not one situation, it is two, and only one
     of them is helped by a new trader.

     If the offers are unaffordable, or pointing the wrong way, the next one may
     well point the right way -- that is what this replacement is for. But if
     every offer is affordable and blocked only because there is no ROOM for what
     it pays, a new offer hits the same wall: makeOrder asks for whichever
     resource the village is richer in, and when both barns are full that is
     always the same direction and always unfillable.

     Measured with both stores capped: ten minutes of that wrote eight new
     traders nobody could trade with, and 138 localStorage writes to record
     them. The board now sits still, which is also the honest picture -- nothing
     is wrong with the offers, the village simply has nowhere to put anything. */
  if (orders.every(o => res[o.giveK] >= o.giveN)) return;
  /* And it takes the offer the player is FURTHEST from being able to take,
     not whichever happens to sit at the front of the list.

     The promise above says an offer they can act on is never pulled out from
     under them, even one they are saving up for. The first half was kept and
     the second was not: saving up for something means you cannot fill it yet,
     which is exactly what this path looks for, and it took orders[0] without
     asking which one that was. Measured -- a board of four, the player one
     unit short of the offer at the front and visibly climbing: gone after 57
     seconds, replaced at the same stall by a trade pointing the other way.

     Judged as a SHARE of what the offer asks, not as a bare shortfall. A bare
     shortfall protects the small offers and feeds the big ones to the trader,
     which is backwards -- the big one is the one with the best rate and the
     only one worth saving for. As a share, ten short of five hundred is 2%
     and beats a hundred and twenty short of a hundred and thirty-five at 89%,
     whatever their sizes. An offer already affordable scores zero and is safe.

     The board still moves: something is always replaced, so it can never sit
     dead. It is just no longer the one being saved for. */
  let worst = 0, worstShare = -Infinity;
  orders.forEach((o, i) => {
    const share = Math.max(0, o.giveN - res[o.giveK]) / Math.max(1, o.giveN);
    if (share > worstShare) { worstShare = share; worst = i; }
  });
  orders.splice(worst, 1, { ...makeOrder(), slot: orders[worst].slot });
  save();
}
/* Room for the reward is part of the price. Without this an order filled while
   the paid resource is capped takes the goods and hands back nothing, silently
   -- I gave 40 food for 0 wood before this check existed. */
/* ---------- the board at the ceiling ----------

   A full barn used to lock the trade board solid, and for most of the game
   that is right: "no room" is advice, and the answer to it is a storehouse.

   At the end of the game it stops being advice and becomes a wall. Measured
   on a finished village: four storehouses of four allowed, two markets of
   two, both resources pinned at 8380 of 8380, and five offers on the board
   of which not one could be taken -- 1135 food for 1065 wood, between two
   resources that were already full, for ever. The board was not losing the
   player anything. It was doing nothing at all, and there was no storehouse
   left to build that would have changed it.

   So once the village is finished, goods the barns cannot hold are not
   refused -- they go over the water to the neighbours instead, and count as
   shipped, which is the one tally in this game with no ceiling and the one
   the goals past the ladder are measured in. A beacon makes them worth more,
   like everything else that leaves the island.

   Gated on FINISHED rather than on the barn being full, deliberately. The
   pressure to build storage has to keep meaning something for as long as
   there is storage left to build; this only relaxes at the point the player
   can no longer do anything about it. */
const shipsSpare = () => villageFinished();
/* Whether any of this offer's payment would go to the neighbours rather than
   into a barn. Used by the card, so the player is told before they tap. */
const willShip = o => !!o && shipsSpare() && caps[o.getK] - res[o.getK] < o.getN;
const hasRoom = o => shipsSpare() || caps[o.getK] - res[o.getK] >= o.getN;
const canFill = o => !!o && res[o.giveK] >= o.giveN && hasRoom(o);
function fillOrder(o) {
  if (!canFill(o)) return false;
  res[o.giveK] -= o.giveN;
  /* Through grant, like everything else that arrives.

     This wrote res directly, so a trade was the one thing in the game that
     turned up with no announcement: the card vanished, a chime played, and two
     numbers in the corner changed. The game's own rule is that everything which
     arrives says so where it arrived -- deliveries were given pops precisely
     because a number in a corner makes a working village look like a stalled
     one -- and a trade is the largest single arrival there is.

     It lands at the market if the village has one, because that is where the
     trading happens, and at the hall otherwise. Not through deliver(): a sale
     is not production and must not count towards the rate the HUD reports. */
  const at = placed.find(q => q.key === 'market' && established(q)) || hallOf();
  const c = at ? centreOf(at) : { x: 0, y: 0 };
  /* What the barns could not take. grant hands back what actually landed, so
     the remainder is the part that would have been destroyed -- and on a
     finished village it is not destroyed, it is sent on. Counted through the
     same multiplier as everything else that leaves the island, so a beacon
     pays on a trade exactly as it pays on an overflowing barn. */
  const got = grant(o.getK, o.getN, c.x, c.y);
  const over = o.getN - got;
  if (over >= 0.5 && shipsSpare()) sharedTotal[o.getK] += over * shareMul();
  orders = orders.filter(q => q.id !== o.id);
  ordersDone++;
  SFX.goal();
  // the first ship in is a moment; after that trade is just trade
  if (ordersDone === 1) celebrate('first_trade_clip', 'The first trade');
  save();
  return true;
}

/* ---------- goals ----------
   Levels alone give a village somewhere to spend, but nothing to aim at. These
   run in a fixed order, one at a time, each naming the next thing worth doing
   and paying for it. Rewards are about a THIRD of what the next step costs: a
   nudge, not a bypass. Paying the full cost was tried and it let a player skip
   the entire early game -- the first hall upgrade fell from four minutes to
   nothing, because each goal handed over enough to complete the next one.

   done() is checked against the village itself rather than counted by events,
   so a goal cannot be missed by a reload, a sell, or anything done out of
   order. */
let goalIdx = 0, goalDone = null;     // goalDone: {g, age} while the banner shows
const GOAL_SHOW = 4.5;
/* A shorter hold when the goal behind this one is ALREADY done. A player coming
   back to a village that has quietly satisfied several at once should see each
   of them, but not sit through four and a half seconds nine times over. */
const GOAL_SHOW_QUEUED = 1.8;

const anyAtLevel = n => placed.some(p => p.key !== 'hall' && lvlOf(p) >= n && p.t >= 1);
const GOALS = [
  { text: 'Build your first house',        done: () => countOf('house') >= 1,  give: { wood: 15 } },
  { text: 'Build a lumber camp',           done: () => countOf('lumber') >= 1, give: { food: 15 } },
  /* The second house comes BEFORE the farm, and the order matters more than it
     looks. One house is two villagers and the lumber camp takes both, so a farm
     built at this point has nobody to work it -- the goal strip said "build a
     farm" while the button for it said "no one free", which is a straight
     contradiction inside the first two minutes. Housed first, the farm is
     staffed the moment it is finished. */
  { text: 'House four villagers',          done: () => villagers.length >= 4,  give: { wood: 25 },
    clip: ['goal_villagers4_clip', 'Four to the village'],
    at: () => [villagers.length, 4] },
  { text: 'Build a farm',                  done: () => countOf('farm') >= 1,   give: { wood: 30, food: 20 } },
  { text: 'Raise the town hall to level 2', buy: 'hall', done: () => hallLevel() >= 2,      give: { wood: 60, food: 40 } },
  { text: 'Build a storehouse',            done: () => countOf('store') >= 1,  give: { wood: 70 } },
  // not "at the market": trading needs no market, and naming one sends the
  // player looking for a building the hall will not allow for another two levels
  { text: 'Fill three trade orders',        done: () => ordersDone >= 3,        give: { wood: 100, food: 60 },
    clip: ['goal_trade3_clip', 'Trade is flowing'],
    at: () => [ordersDone, 3] },
  { text: 'Claim land beyond your border', buy: 'land', done: () => landTier >= 1,          give: { wood: 120, food: 70 } },
  { text: 'Upgrade any building to level 2', done: () => anyAtLevel(2),        give: { wood: 90, food: 50 },
    clip: ['goal_up2_clip', 'A building grows'] },
  { text: 'Dig a well',                    done: () => countOf('well') >= 1,   give: { wood: 110 } },
  { text: 'Raise the town hall to level 3', buy: 'hall', done: () => hallLevel() >= 3,      give: { wood: 180, food: 120 } },
  { text: 'Claim a third ring of land',    buy: 'land', done: () => landTier >= 2,          give: { wood: 350, food: 220 } },
  { text: 'Place five decorations',        done: () => decorCount() >= 5,      give: { wood: 150, food: 90 },
    clip: ['goal_decor5_clip', 'A village worth a stroll'],
    at: () => [decorCount(), 5] },
  { text: 'Upgrade any building to level 3', done: () => anyAtLevel(3),        give: { wood: 250, food: 160 } },
  { text: 'Build a mill',                  done: () => countOf('mill') >= 1,   give: { wood: 350, food: 220 } },
  { text: 'Raise the town hall to level 4', buy: 'hall', done: () => hallLevel() >= 4,      give: { wood: 550, food: 360 } },
  { text: 'Open a market',                 done: () => countOf('market') >= 1, give: { wood: 800, food: 500 } },
  { text: 'Raise the town hall to level 5', buy: 'hall', done: () => hallLevel() >= 5,      give: { wood: 1400, food: 900 } },
  /* The fourth ring, which was never asked for.

     Goals name land at the second ring and then at the whole island, and
     nothing in between -- while the last ring costs 3750 wood, two and a half
     times the one before it and the largest single purchase in the game.
     Measured on
     a full playthrough, that left a 33-minute stretch with one unchanging line
     on the strip, the longest silence in the game by a wide margin. */
  { text: 'Claim a fourth ring of land',  buy: 'land', done: () => landTier >= LAND_MAX - 1,
    give: { wood: 1200, food: 800 } },
  /* The village outlasts its goals by about an hour.

     Claiming the island was the last thing the game ever asked for, and it
     happens around fifty minutes in -- while a maxed village is another hour of
     upgrades beyond that, all of it unacknowledged. Simulated to the end: hall 5
     and the whole island arrive with every building still at level 3 or so, and
     from there the player is filling out an allowance, a charm ceiling and a
     hundred and eighty levels with nothing naming any of it.

     These three name the rest, in the order they are actually reachable. Filling
     the allowance is cheapest, the charm ceiling is about fourteen statues, and
     raising every workplace to five is far and away the longest. The last one is
     the end of the game, which is why it is worth saying out loud. */
  /* These three come BEFORE the island, not after it, and the order is the whole
     point of them. Added to cover the last hour, they did nothing of the kind:
     the final ring is the most expensive thing in the game, so by the time a
     player can afford it they have already built everything, hit the charm
     ceiling and maxed their buildings -- and all three fired within twelve
     seconds of the island, measured. Asked first, they name the stretch the
     player is actually spending that hour on.

     All three are reachable on the fourth ring, checked rather than assumed: a
     twelve-tile island holds the whole hall-five allowance and the hall -- 38
     buildings in 104 tiles -- with room left for the fourteen statues the
     charm ceiling needs. On the third ring it does not, which is why the ring
     above comes first. (It said 37 in 104, which counted the hall's four tiles
     but not the hall. unitSweep holds both numbers now.) */
  { text: 'Build everything your hall allows',
    done: () => Object.keys(HALL[HALL_MAX].allow).every(k => countOf(k) >= HALL[HALL_MAX].allow[k]),
    give: { wood: 2000, food: 1300 }, clip: ['goal_full_clip', 'Everything the hall allows'],
    at: () => { const a = HALL[HALL_MAX].allow; let have = 0, want = 0;
                for (const k of Object.keys(a)) { have += Math.min(countOf(k), a[k]); want += a[k]; }
                return [have, want]; } },
  { text: 'Fill the village with charm',   buy: 'charm',
    done: () => charmTotal() >= CHARM_FULL,
    give: { wood: 2600, food: 1700 }, clip: ['goal_charm_clip', 'The village in bloom'],
    at: () => [Math.min(charmTotal(), CHARM_FULL), CHARM_FULL] },
  { text: 'Raise every workplace to level 5', buy: 'workplace',
    /* Counted at the level each has REACHED: one still under scaffolding on its
       way to five is not there yet, and leaving it out finished the goal the
       moment the last upgrade was paid for. */
    done: () => { const w = placed.filter(p => B(p.key).jobs && p.key !== 'hall');
                  return w.length > 0 && w.every(p => lvlHeld(p) >= LVL_MAX); },
    give: { wood: 3400, food: 2200 }, clip: ['goal_work_clip', 'Every workplace at its best'],
    at: () => { const w = placed.filter(p => B(p.key).jobs && p.key !== 'hall');
                return [w.filter(p => lvlHeld(p) >= LVL_MAX).length, w.length]; } },
  /* The finale, and the one the completion card names. */
  { text: 'Claim the whole island',        buy: 'land', done: () => landTier >= LAND_MAX,
    give: { wood: 5000, food: 3200 } },
];
/* ---------- after the ladder ----------

   The twenty-three goals above are the spine of the game and they END, and
   the strip at the top of the screen -- the one line that is always there --
   has said the same sentence ever since, for as long as the player keeps
   playing. Measured on a finished village: every building kind locked at its
   allowance, both resources pinned at their ceiling, charm past its cap,
   nothing left to name and nothing left to ask for.

   There are exactly two things a finished village can still do more of.
   Everything else in this game has a ceiling, deliberately: buildings have
   the hall's allowance, charm has CHARM_FULL, land stops at LAND_MAX,
   villagers at VILLAGER_MAX, decorations at DECOR_MAX. What has no ceiling
   is what the village sends AWAY -- the surplus the neighbours take, and the
   orders it fills. So those are what the strip goes on naming.

   Counted from where the player stood when the ladder ran out, not from
   zero. A village that has already shipped five million would otherwise be
   handed a dozen goals it passed weeks ago, one banner after another, and
   the first thing the new system ever did would be to scroll.

   The steps grow triangularly rather than evenly. The first few land quickly,
   which is the point of them; a village that has been running for a week is
   not asked for the same step it was asked for in its first hour.

   THEY PAY NOTHING, and that is not an oversight. At this point in the game
   there is nothing left worth receiving: the stores are full, so a reward in
   wood or food is announced and destroyed in the same breath, and the card
   would read "spilled -- stores full" every single time. A goal that hands
   you something you then watch being thrown away is worse than a goal that
   hands you nothing. What these give is the one thing the village still
   lacks, which is somebody to notice. */
const AFTER_SHIP = 50000;             // the first shipping step; it grows
const AFTER_ORDERS = 10;
/* How far past the ladder a SAVE is allowed to claim to be.

   The generator will happily make goal number nine billion, so the bound is
   not about the generator -- it is the same job the clamp on goalIdx has
   always done, which is to refuse a damaged file. Two thousand is a thousand
   shipping goals past the end of the game, the last of them asking for
   twenty-five billion sent over the water; at the eighty a second a maxed
   village manages that is about ten years of play. It bounds the nonsense
   without being reachable. */
const AFTER_MAX = 2000;
let afterMark = null;                 // where the counters stood when the ladder ended
/* Every kind, from the list -- the same lesson as the thirty-eight places
   above, missed here. Written as wood plus food, the shipping goal never
   counted a block of stone sent over the water, and the strip and the hall
   never showed one: about a fifth of what a finished village ships (0.7 of
   4.0 a second, measured), recorded in the save and then ignored by
   everything that reads it. */
const shipped = () => RES.reduce((n, k) => n + (sharedTotal[k] || 0), 0);
const sharedText = () => RES.filter(k => (sharedTotal[k] || 0) >= 1)
  .map(k => RES_ICON[k] + compact(sharedTotal[k])).join(' ');

function afterGoal(n) {
  const m = afterMark || { ship: 0, orders: 0 };
  const round = Math.floor(n / 2) + 1;
  if (n % 2 === 0) {
    const want = m.ship + AFTER_SHIP * round * (round + 1) / 2;
    return { after: true, give: {},
      text: 'Ship ' + compact(want) + ' to the neighbours',
      done: () => shipped() >= want,
      praise: compact(want) + ' sent over the water' };
  }
  const want = m.orders + AFTER_ORDERS * round;
  return { after: true, give: {},
    text: 'Fill ' + want + ' trade orders in all',
    done: () => ordersDone >= want,
    at: () => [ordersDone, want],
    praise: want + ' trade orders filled' };
}
/* Never null any more. The ladder running out is no longer the end of the
   list, it is the point the list starts generating itself. */
const currentGoal = () => GOALS[goalIdx] || afterGoal(goalIdx - GOALS.length);

function stepGoals(dt) {
  /* Where the counters stood when the ladder ended, which every goal after it
     is measured from.

     FIRST, before a single line of this function asks what the current goal
     is. It used to be taken further down, next to the completion card, and
     the ordering was the whole bug: currentGoal() is called at the top, so
     on the one tick the ladder ran out the first generated goal was built
     against a mark of nothing -- asking for fifty thousand shipped from a
     village that had already shipped five and a half million. It completed
     in the same frame it was created, and the player was congratulated for
     work they did last week.

     Not caught by the checker, and worth saying why: the sweep sets a
     village up with a thousand shipped, and a thousand is less than fifty
     thousand, so the goal was NOT already done and the fault never showed.
     It took a real save -- five and a half million shipped -- to make the
     difference between a mark of nothing and the right one visible. The
     checker now starts from a village that has shipped millions.

     And cleared when the village is short of the end: the mark only means
     anything past the ladder, and one left over from a finished village
     would otherwise be carried into a save that has no goals past it. */
  afterMark = villageFinished()
    ? (afterMark || { ship: Math.round(shipped()), orders: ordersDone })
    : null;
  /* One at a time. The goals are a queue, and finishing one often reveals
     another that is ALREADY done -- fill three orders, and the land you claimed
     an hour ago and the building you upgraded last week both come due at once.
     Each then overwrote the last one's banner on the next frame, so the player
     saw a single announcement and silently collected three rewards. Now the
     next one waits for the banner in front of it. */
  const next = currentGoal();
  if (goalDone) {
    // and it is shown for four and a half seconds of somebody looking at it,
    // by the same rule the hints keep: a banner is not read from a home screen
    if (!document.hidden) goalDone.age += dt;
    const hold = (next && next.done()) ? GOAL_SHOW_QUEUED : GOAL_SHOW;
    if (goalDone.age <= hold) return;
    goalDone = null;
  }
  /* The card for finishing is raised from the STATE of the village, not from
     the frame a goal happened to complete on.

     Raised there, it was gone on a reload. tutSeen recorded it the instant it
     was put up, and nothing puts it up twice -- so a player who finished the
     village and closed the app during the four and a half second banner came
     back to a finished village, 'complete' already in tutSeen, and no card,
     ever. Measured: set, saved, reloaded, and sixty simulated seconds later
     still not drawn.

     Here instead, where it is asked every tick: finished, not yet dismissed,
     not already up. And after the banner rather than before it, because that
     is the moment it could be shown -- the player reads what they finished
     before being told they finished, which is what the old placement was
     for. */
  if (!finished && villageFinished() && !tutSeen.includes(FINISH_ID))
    finished = { villagers: villagers.length,
                 buildings: placed.filter(q => !isDecor(q.key)).length,
                 trades: ordersDone, charm: charmTotal() };

  const g2 = next;
  if (!g2 || !g2.done()) return;
  /* Bank what will actually fit and report THAT. Announcing the offered amount
     when storage swallowed half of it is the same lie the order rewards used to
     tell, and it is worse here because the banner is the only record.

     Through grant(), like every other way the village receives anything, so
     the reward lands on the hall as visible numbers rather than appearing only
     in a counter. */
  const h = hallOf(), c = h ? centreOf(h) : { x: 0, y: 0 };
  /* And what would NOT fit, which is the half this card used to leave out.

     Both ends were right and the middle was not. Nothing fits and it says
     'stores already full'; everything fits and it says what arrived. One
     barn at the ceiling and the other with room -- which is the ordinary
     state of a village that has been spending one of the two -- and it
     printed the half that arrived and not a word about the half destroyed.
     Measured on 'Build a farm', worth 30 wood and 20 food, with the wood at
     its ceiling: 'Goal complete!   food +20'. The thirty wood was gone. At
     the last goal the same silence is worth five thousand.

     This is the fault the welcome-back card was already fixed for, written
     up there as 'two different ceilings can eat this haul, and the card
     used to show the survivor of both with no account of either'. It is the
     same card in a smaller frame, and it kept the same silence. */
  const got = {}, lost = {};
  for (const [k, val] of Object.entries(g2.give)) {
    const gained = grant(k, val, c.x, c.y);
    if (gained >= 0.5) got[k] = Math.round(gained);
    if (val - gained >= 0.5) lost[k] = Math.round(val - gained);
  }
  goalDone = { g: g2, got, lost, age: 0 };
  goalIdx++;
  SFX.goal();
  /* The goals with no building of their own to celebrate -- villagers, trade,
     a first upgrade, a handful of decorations, and the last hour's three --
     have a clip instead. A goal often finishes the moment the one before it
     does, on the heels of a first-building clip, so it waits its turn. */
  if (g2.clip) celebrateAfter(...g2.clip);
  save();
}

/* ---------- first-time hints ----------
   The village opens with an island, a hall and a row of icons, and says nothing
   about villagers being the entire economy. One line at a time, driven by what
   the village actually looks like, each shown ONCE and then remembered -- a hint
   that keeps coming back is nagging, not teaching. */
let tutSeen = [];
let tutT = 0, tutNow = null;          // which hint is on screen, to notice when it leaves
/* A hint is finished when the player DOES the thing. The timer is the fallback
   for a player who does not, which is why it can afford to be generous.

   It used to be the other way round, and the two halves were backwards. Acting
   on a hint never marked it read -- build the first house within two seconds and
   the hint vanished with none of its time spent, so selling that house an hour
   later brought "Build a house first" back to a player who plainly knew. And the
   player who did NOT act lost it after eleven seconds, for ever: the one who had
   shown they understood kept being told, and the one who had not never saw it
   again. Eleven seconds is also simply short for the first thing a new player
   ever reads, and "tap any building to upgrade, move or sell it" is the only
   thing in the game that teaches its main interaction. */
const TUT_SHOW = 20;
const TUT = [
  { id: 'house', text: 'Build a house first — villagers live there, and villagers do all the work',
    when: () => countOf('house') === 0 },
  { id: 'work',  text: 'Now a lumber camp. Villagers will work it and carry the wood to your hall',
    when: () => countOf('house') > 0 && placed.some(p => p.key === 'house' && p.t >= 1)
                && !placed.some(p => B(p.key).jobs && p.key !== 'hall') },
  { id: 'tap',   text: 'Tap any building to upgrade, move or sell it',
    when: () => placed.some(p => B(p.key).jobs && p.key !== 'hall' && p.t >= 1) },
  { id: 'hall',  text: 'Your town hall can grow — tap it to raise what you are allowed to build',
    when: () => canUpgrade(hallOf()) },
  /* The one state whose cost is completely invisible. Full stores do not slow
     the village down, they throw its work away: villagers keep walking loads to
     a barn that cannot take them. The bar says "storage full" but not what that
     means, and a player who leaves the game overnight comes back to a village
     that earned nothing and no explanation of why. */
  /* Trading is named because the surplus is usually structural, not an
     accident: a village built to its allowance makes food at two to three times
     the rate it makes wood, while nearly everything it buys costs more wood
     than food. Converting the one into the other is the answer the game is
     built around, and "build a storehouse" only postpones it. */
  /* The one core action no hint taught. The goal strip says "Claim land beyond
     your border" and nothing on screen says how: the answer is to tap the dark
     ground, which the player has had no reason to try since placements there
     were refused. Shown when a goal asks for land, or when the village has
     simply run out of room for anything it is allowed to build. */
  { id: 'land',  text: 'Tap the darker ground past your border to claim more land',
    when: () => !!landNext() && (/land|island/i.test((currentGoal() || {}).text || '') || outOfRoom()) },
  /* The last clause is only true when the hall allows another storehouse.
     Measured at hall level one, three villagers and a full three hundred: the
     strip read "or build a storehouse" with the storehouse not yet unlocked and
     no such card on the tray, and the hint is shown ONCE, so that was the whole
     of what the player was ever told about the state. Raising the hall is not
     named here because the hint above this one is about exactly that, and it
     comes first in the list. */
  { id: 'full', text: () => 'Your stores are full — what villagers bring in now is thrown away. '
      + (permitted('store') ? 'Spend it, trade it away, or build a storehouse' : 'Spend it or trade it away'),
    when: () => placed.some(p => p.key !== 'hall' && B(p.key).jobs && p.t >= 1)
                && RES.some(isFull) },
];
// nowhere left on the claim for any building the hall still allows
function outOfRoom() {
  const want = BUILDINGS.filter(b => b.key !== 'hall' && !b.decor && permitted(b.key));
  if (!want.length) return false;
  const L = landBounds(), occ = occupied();
  for (const b of want)
    for (let c = L.lo; c <= L.hi; c++) for (let r = L.lo; r <= L.hi; r++)
      if (canPlace(b.key, c, r, occ)) return false;
  return true;
}
/* A hint's words. All but one are fixed; the one about full stores has to look
   at the village, because half of what it said was advice the tray refuses. */
const hintText = h => typeof h.text === 'function' ? h.text() : h.text;
function currentHint() {
  for (const h of TUT) if (!tutSeen.includes(h.id) && h.when()) return h;
  return null;
}
function stepHints(dt) {
  const h = currentHint();
  const id = h ? h.id : null;
  if (tutNow !== id) {
    /* A hint is finished when the player does the thing it asked for, and the
       only evidence of that is its OWN condition going false.

       This used to mark it done whenever it left the strip, on the reasoning
       that currentHint returns the earliest unseen hint and so nothing can
       displace it. That is exactly backwards: an EARLIER hint becoming true
       displaces a later one, and the later one was then written off as read.

       Measured, and it is not a corner: the goal says "Claim a third ring of
       land" and the land hint -- the one thing in the game that says HOW, by
       tapping the dark ground -- is on the strip. Five seconds later the
       village can afford a hall upgrade, which turns the hall hint true. The
       hall hint is earlier in the list, so it takes the strip, and the land
       hint goes into tutSeen unread and never comes back. The goal still asks
       for land and nothing will ever say how again. The same thing loses the
       full-stores hint, which is the one state whose cost is invisible, to the
       hall hint that the full stores just made affordable.

       Now it stays unread and comes back when the hint in front of it is done. */
    const gone = tutNow == null ? null : TUT.find(t => t.id === tutNow);
    if (gone && !tutSeen.includes(tutNow) && !gone.when()) { tutSeen.push(tutNow); save(); }
    /* And whatever is on the strip now gets its own twenty seconds. The timer
       was only reset when a hint was marked read, so a hint that displaced
       another inherited however long that one had already been up. */
    tutT = 0;
    tutNow = id;
  }
  if (!h) { tutT = 0; return; }
  /* Only time it is actually on screen counts. The goal banner, the welcome-back
     card and the finished card all hide it, and the clock ran on behind them:
     a hint that arrived with a goal lost four and a half of its twenty seconds
     to the "Goal complete!" banner, and one that came up while the away card
     was open could expire without ever being drawn. */
  if (hintVisible()) tutT += dt;
  if (tutT >= TUT_SHOW) { tutSeen.push(h.id); tutT = 0; tutNow = null; save(); }
}

const hallOf = () => placed.find(p => p.key === 'hall');
/* The level the hall HOLDS -- what it is actually giving the village right
   now, which during its own upgrade is the level it has not left yet.

   Every other building in the game earns an upgrade when the scaffolding comes
   down: a storehouse keeps the capacity it had, a house keeps the residents it
   had, a well keeps its old reach. The hall read its lvl field directly and so
   handed over everything the instant the work STARTED. Measured on a hall
   going from one to two: the moment the upgrade began, storage jumped from 300
   to 800, the storehouse appeared unlocked in the tray, and every building in
   the village could be sent to level two -- six seconds before the hall that
   permits any of it existed. A storehouse upgraded at the same moment held its
   800 until it was done, which is the rule this now keeps too.

   The panel's title still names the level being built, the way it does for
   every building under scaffolding. This is what the village is given. */
const hallLevel = () => { const h = hallOf(); return h ? Math.min(HALL_MAX, Math.max(1, lvlHeld(h))) : 1; };
/* ---------- what the beacon is worth, and when it may be built ---------- */
const BEACON = 'beacon';
const BEACON_STAGES = 5;
/* What each stage takes before the next one starts. Rising steeply, and the
   whole thing is ninety thousand -- about an hour of a maxed village, since
   it takes half of every load (see beaconTake), which is the point: it is a
   sink for a village that has nothing left to spend on, not an errand. */
const BEACON_NEED = [6000, 12000, 24000, 48000, 0];   // the last stage is the top

const beaconOf = () => placed.find(p => p.key === BEACON) || null;
/* The stage it has REACHED, so one still going up counts as the one below. */
const beaconStage = () => { const p = beaconOf(); return p && p.t >= 1 ? Math.min(BEACON_STAGES, Math.max(1, p.lvl | 0)) : 0; };
/* How much further a village's surplus carries for having built it. Nothing
   without one; half as much again at the first stage; three times at the top. */
const shareMul = () => 1 + 0.4 * beaconStage();

/* All five drawings or none, the same rule the walk cycles keep and for the
   same reason: a building with no picture is a coloured box, and half a set
   is an artist's work that appears nowhere and reports nothing. Until the
   whole set is on disk the beacon is not in the tray, not in the hints and
   not in anything that asks what may be built. */
/* Keys whose art is a SET rather than a single picture, and how many.

   The beacon has no beacon.webp and never will: its art is the five stages,
   and asking for a sixth picture of it to stand in for the others would be a
   drawing nothing ever shows. Said here so the harness can tell the
   difference between a building with no art and a building whose art is not
   one file -- otherwise it correctly reports a hole that is not there. */
const SET_ART = { [BEACON]: BEACON_STAGES };
const beaconArt = i => artFor(BEACON + '_stage' + i);
/* Which picture a building is drawn with. One each for everything in the
   game except the beacon, whose whole point is that it changes shape as it
   rises -- a sink nobody can see is a number, not a landmark. */
/* Several looks for the buildings a village has many of, one chosen per
   building.

   Fourteen statues is what the charm goal comes to -- the ceiling over the
   best ornament -- and they were fourteen copies of one woman with a sheaf
   of wheat; a full village has twelve houses and they were twelve copies of
   one cottage, and every farm the same wheat field. Chosen from the
   building's id rather than its tile, so each keeps its look when it is
   moved and when the game reloads; a missing
   picture falls back to the first look rather than to nothing. A look may
   carry its own ART_FIT entry, because a cottage of stone is not drawn with
   its front corner exactly where a timber one is. */
const LOOKS = {
  statue: ['statue', 'statue_knight', 'statue_fisher', 'statue_fountain', 'statue_dragon', 'statue_birdbath', 'statue_bear', 'statue_scarecrow'],
  house:  ['house', 'house_stone', 'house_thatch', 'house_fisher', 'house_baker', 'house_weaver', 'house_potter', 'house_bee', 'house_oak'],
  farm:   ['farm', 'farm_veg', 'farm_barley', 'farm_pumpkin', 'farm_vine', 'farm_orchard', 'farm_hops'],
  lumber: ['lumber', 'lumber_pit', 'lumber_cabin', 'lumber_saw', 'lumber_charcoal', 'lumber_cart'],
  well:   ['well', 'well_iron', 'well_thatch', 'well_pump', 'well_wish', 'well_wheel'],
  store:  ['store', 'store_granary', 'store_barn', 'store_tithe', 'store_staddle', 'store_cellar'],
  mill:   ['mill', 'mill_post', 'mill_smock', 'mill_water', 'mill_tower', 'mill_cider'],
  market: ['market', 'market_hall', 'market_fish', 'market_cheese', 'market_fruit', 'market_flower'],
  quarry: ['quarry', 'quarry_pit', 'quarry_slate', 'quarry_marble', 'quarry_sand', 'quarry_clay'],
  lamp:   ['lamp', 'lamp_bracket', 'lamp_stone', 'lamp_double', 'lamp_ship', 'lamp_basket', 'lamp_crook'],
  flowers: ['flowers', 'flowers_planter', 'flowers_tulip', 'flowers_barrel', 'flowers_cart', 'flowers_sun'],
  bench:  ['bench', 'bench_stone', 'bench_rose', 'bench_tree', 'bench_swing', 'bench_picnic', 'bench_campfire'],
  banner: ['banner', 'banner_pennant', 'banner_maypole', 'banner_windsock', 'banner_bunting', 'banner_vane', 'banner_kite'],
  hedge:  ['hedge', 'hedge_topiary', 'hedge_lavender', 'hedge_wild', 'hedge_holly', 'hedge_beech'],
  fence:  ['fence', 'fence_picket', 'fence_stone', 'fence_wattle', 'fence_rope', 'fence_iron'],
};
const STATUE_LOOKS = LOOKS.statue;
/* The town hall is the one building whose look follows its level instead of
   its id: there is only ever one, and raising it was the one upgrade nobody
   could see. A clock tower at level 3, the guildhall at level 5; a stage whose
   picture is missing falls back to the one below. It changes when the upgrade
   is finished, not when it is paid for. */
const HALL_STAGES = [[5, 'hall_3'], [3, 'hall_2']];
function hallLook(p) {
  for (const [l, k] of HALL_STAGES) if (lvlHeld(p) >= l && artFor(k)) return k;
  return p.key;
}
function lookOf(p) {
  if (p.key === 'hall') return hallLook(p);
  const set = LOOKS[p.key];
  if (!set) return p.key;
  const look = set[Math.floor(hash(p.id * 7 + 3, 11) * set.length) % set.length];
  return look !== p.key && artFor(look) ? look : p.key;
}
function buildingArt(p) {
  if (LOOKS[p.key] || p.key === 'hall') {
    const look = lookOf(p);
    if (look !== p.key) return artFor(look);
  }
  if (p.key === BEACON) {
    const set = beaconSet();
    if (set) return set[Math.min(BEACON_STAGES, Math.max(1, p.lvl | 0)) - 1];
  }
  return artFor(p.key);
}
function beaconSet() {
  const out = [];
  for (let i = 1; i <= BEACON_STAGES; i++) { const im = beaconArt(i); if (!im) return null; out.push(im); }
  return out;
}
/* Offered once the village is finished and the pictures exist. Deliberately
   outside the hall table -- see the note on the building itself. */
const beaconOpen = () => villageFinished() && !!beaconSet();
/* What the panel says where every other building names a price. */
function beaconLabel(p) {
  const lvl = Math.min(BEACON_STAGES, Math.max(1, p.lvl | 0));
  const need = BEACON_NEED[lvl - 1];
  if (!need) return 'Finished  ·  stage ' + BEACON_STAGES + ' of ' + BEACON_STAGES;
  return 'Stage ' + lvl + ' of ' + BEACON_STAGES + '  ·  ' + compact(Math.round(p.stock || 0))
    + ' / ' + compact(need) + ' poured in';
}
const allowedOf = key => key === BEACON ? (beaconOpen() ? 1 : 0) : (HALL[hallLevel()].allow[key] || 0);
const countOf = key => placed.reduce((n, p) => n + (p.key === key ? 1 : 0), 0);
// a building type you cannot have yet is hidden entirely; one you have run out
// of room for stays visible but locked, so the limit is legible
// takes a KEY, not a placed record, and tolerates an unknown one
const isDecor = key => { const b = B(key); return !!(b && b.decor); };
/* Decorations are not rationed by hall level -- the whole point is to let people
   fiddle -- but there is a ceiling on the total, so a village cannot be carpeted
   into an unreadable mess or a performance problem. */
const DECOR_MAX = 60;
/* Bought decorations only. A find does not spend one of the sixty slots --
   it is not a thing the player chose to put there. */
const decorCount = () => placed.reduce((n, p) => n + (isDecor(p.key) && !isFound(p.key) ? 1 : 0), 0);
const unlocked = key => key === 'hall' || isDecor(key) || allowedOf(key) > 0;
const atLimit = key => isDecor(key) ? decorCount() >= DECOR_MAX : countOf(key) >= allowedOf(key);
/* Whether the village can make a kind of goods yet, and the hall level that
   first lets it. A price the village is short of in a kind it cannot make is
   not a shortfall it can close by waiting or working -- see the tray and the
   placement label, which say what unlocks it instead. */
const canMake = k => BUILDINGS.some(b => b.makes && b.makes[k] && unlocked(b.key));
const hallFor = k => {
  for (let l = 1; l <= HALL_MAX; l++)
    if (BUILDINGS.some(b => b.makes && b.makes[k] && (HALL[l].allow[b.key] || 0) > 0)) return l;
  return 0;
};
/* The first kind in a price that the village is short of AND cannot make. */
const blockedBy = cost => Object.entries(cost || {})
  .find(([k, v]) => res[k] < v && !canMake(k)) || null;
/* Whether "build one of these" is advice the player can actually take: the hall
   allows another, and the card is on the tray to be tapped. Three places asked
   it and a fourth -- the hint that fires when the stores fill -- did not, and
   told a player at hall level one to build a storehouse, which at that level is
   not merely unaffordable but not in the tray at all. Advice the tray refuses
   is worse than none; it is the same fault the hall panel was fixed for, and it
   was still loose here because the words were written into a table rather than
   worked out from the village. */
const permitted = key => unlocked(key) && !atLimit(key);
/* Villagers with no post. A workplace built with none of these standing about
   produces NOTHING -- nobody moves house to staff it -- and the village is short
   of people at every hall level: eleven posts go begging at hall five with
   everything at level one. The hall unlocks a second farm, the tray sells it,
   and the wood buys an empty shed. It comes right as houses are upgraded, so
   the building is not wasted for ever, just useless for now -- which the player
   has no way to know at the moment they are deciding. */
const sparePeople = () => villagers.reduce((n, v) => n + (v.job == null ? 1 : 0), 0);
/* Nobody spare to staff it -- which is NOT the same as "it would stand empty",
   which is what this used to be called and what the labels used to say.

   A new post always gets a hand: the allocator gives every worthwhile workplace
   one before filling any of them, so it simply takes somebody off an existing
   post. Tested across 148 village states, 97 of them built the "empty" building
   and watched a villager walk straight into it.

   The advice was right and the reason was wrong. With no spare hands a new
   workplace does not ADD output, it shares out the hands already working, so
   the wood is wasted -- and that is what the labels say now. */
const noSpareHands = key => {
  const b = B(key);
  /* Counting the people still walking out of a house that is being built, or
     it warned about the lumber camp the goal had just asked for -- the first
     house was three seconds from finishing and its two villagers were already
     spoken for. */
  return !!(b && b.jobs && !b.caps && key !== 'hall')
    && freeHands() + peopleComing() === 0;
};

/* Charm: what decorations are actually for. A pleasant village works a little
   harder, capped so it stays a bonus rather than the main economy. */
const CHARM_FULL = 600, CHARM_CAP = 0.20;
/* The most charm one ornament slot can be worth, which decides whether the
   charm goal is still reachable. Read off the table so that retuning a
   statue cannot leave this behind. */
const BEST_CHARM = BUILDINGS.reduce((n, b) => b.decor && !b.found ? Math.max(n, b.charm || 0) : n, 0);
/* Cached for the same reason as the stores: every rate the interface quotes
   multiplies by charm, so this whole-village scan ran twice per producer per
   frame. Decorations only appear and disappear through the paths that already
   rebuild, so it is rebuilt alongside them. */
let charmSum = 0;
function rebuildCharm() {
  charmSum = 0;
  for (const p of placed) if (isDecor(p.key)) charmSum += B(p.key).charm;
}
const charmTotal = () => charmSum;
/* How much of a decoration's charm the village can still USE. The bonus stops
   climbing at CHARM_FULL, which is about fourteen statues -- and the tray went
   on advertising the next forty-six at forty-five charm each, nearly seven
   thousand wood of purchases that changed no number in the game. A decoration
   bought past the line is worth having for the look of it; it is not worth
   having for the reason the tray was giving. */
const charmRoom = () => Math.max(0, CHARM_FULL - charmSum);
const usefulCharm = key => Math.min(B(key).charm || 0, charmRoom());
const charmMul = () => mulFor(charmSum);        // one formula, shared with charmGainFrom

const occupied = (exceptId) => {
  const set = new Set();
  for (const p of placed) {
    if (exceptId !== undefined && p.id === exceptId) continue;   // a building being moved
    const b = B(p.key);
    for (let dc = 0; dc < b.w; dc++) for (let dr = 0; dr < b.h; dr++) set.add((p.c + dc) + ',' + (p.r + dr)); }
  return set;
};
/* WHY a spot is refused, or null when it is not. canPlace is this and nothing
   else, so the reason the placement pill gives can never disagree with the
   refusal itself. */
function placeProblem(key, c, r, occ) {
  const b = B(key);
  if (c < 0 || r < 0 || c + b.w > GW || r + b.h > GH) return 'land';
  // every tile of the footprint has to be on land you actually own
  for (let dc = 0; dc < b.w; dc++) for (let dr = 0; dr < b.h; dr++)
    if (!inLand(c + dc, r + dr)) return 'land';
  for (let dc = 0; dc < b.w; dc++) for (let dr = 0; dr < b.h; dr++) if (occ.has((c + dc) + ',' + (r + dr))) return 'taken';
  return null;
}
const canPlace = (key, c, r, occ) => placeProblem(key, c, r, occ) === null;
const canAfford = cost => Object.entries(cost).every(([k, v]) => res[k] >= v);
/* A price the village cannot physically HOLD, which is a different answer from
   cannot afford: no amount of saving reaches it, so the honest advice is about
   storage rather than patience. The upgrade button and the goal strip both ask
   it, and the strip only asked it for two of the three things a goal can tell
   you to buy. */
const overCaps = cost => !!cost && Object.entries(cost).some(([k, v]) => v > caps[k]);
/* Exactly how far short you are. "Cannot afford" was signalled by a red tint
   and nothing else, which says the same thing whether you are two wood away or
   two thousand -- and says nothing at all to the one man in twelve who cannot
   separate the red from the green. */
function shortfall(cost) {
  const out = {};
  for (const [k, v] of Object.entries(cost)) if (res[k] < v) out[k] = Math.ceil(v - res[k]);
  return out;
}
const shortText = cost => Object.entries(shortfall(cost))
  .map(([k, v]) => RES_ICON[k] + v).join('  ');
const affordable = key => canAfford(B(key).cost);
const buildable = key => unlocked(key) && !atLimit(key) && affordable(key);

function place(key, c, r) {
  const b = B(key);
  /* The UI already gates both of these, but place() is also the API a test or a
     future caller reaches for. Unguarded it will spend into the negative, and
     it will happily drop a building on unclaimed land or on top of another
     one -- the position check is not optional just because the ghost normally
     does it. */
  if (!canAfford(b.cost)) return false;
  if (!canPlace(key, c, r, occupied())) return false;
  /* And the hall's allowance, which was the one gate left to the interface.
     The tray does refuse it and the selection clears after each placement, so
     no sequence of taps got past it -- but place() promises to be safe on its
     own, and a soak test calling it directly built ten houses under a hall that
     permits two. A guard that only exists in the button is a guard that leaves
     with the next redesign of the button. */
  if (atLimit(key)) return false;
  for (const [k, v] of Object.entries(b.cost)) res[k] -= v;
  placed.push({ id: nextId++, key, c, r, t: b.decor ? 1 : 0, lvl: 1, stock: 0, build: BUILD_TIME });
  recomputeCaps();
  save();
  SFX.place();
  // decorations go up finished, so the first statue never passes the scaffold
  if (b.decor) celebrateFirst(placed[placed.length - 1]);
  return true;
}
/* The ceilings the village would have if this building were gone -- what the
   sell button has to quote, because selling storage takes its own capacity
   with it. */
/* What the village could hold, optionally pretending one building is not
   there. Both callers want the same sum; only one of them wants to keep it. */
function capsSum(skip) {
  // the hall itself holds more as it grows, so an upgrade is worth something
  // even before you have spent the room it unlocks
  const base = 200 + 100 * hallLevel();
  const out = tally(base);
  for (const p of placed) {
    if (p === skip || !B(p.key).caps) continue;
    /* A storehouse being UPGRADED keeps the capacity it already had. Counting
       only finished buildings meant starting an upgrade collapsed the ceiling,
       put the village instantly over it, and stopped every delivery until the
       work finished -- so improving your storage punished you for improving
       your storage. It earns the new capacity when it is done, not before. */
    for (const k of RES) out[k] += capsHeld(p, k);
  }
  return out;
}
/* The ceilings the village would have if this building were gone -- what the
   sell button has to quote, because selling storage takes its own capacity with
   it.

   It used to get there by taking the building out of the world, calling
   recomputeCaps, and putting it back. That was merely ugly until the rebuilds
   hanging off recomputeCaps grew: the panel calls this every frame it is open,
   so an open panel rebuilt the store list four times a tick and threw away the
   workforce plan thirty times a second, which is the one thing the plan is
   cached to avoid. It just adds up the numbers now. */
function capsWithout(p) { return capsSum(p); }
function recomputeCaps() {
  rebuildStores();                    // the same events change both
  caps = capsSum();
}

/* Everything ever paid into a building, so selling can return a fair half
   rather than half of the original price -- a level 4 farm has had far more
   than a farm's worth put into it. Derived from the level, so nothing extra
   has to be stored or kept in step. */
function investedIn(p) {
  const t = tally();
  for (const [k, v] of Object.entries(B(p.key).cost)) t[k] += v;
  for (let l = 1; l < lvlOf(p); l++) {
    const c = p.key === 'hall' ? (HALL[l] && HALL[l].up) : upCostOf({ key: p.key, lvl: l });
    if (c) for (const [k, v] of Object.entries(c)) t[k] += v;
  }
  return t;
}
const sellValue = p => {
  const t = investedIn(p), o = {};
  for (const k of RES) if (t[k]) o[k] = Math.floor(t[k] / 2);
  return o;
};
/* The hall is the village, and a find was here before the village was: it
   cost nothing, so there is nothing to get back, and knocking down the
   standing stones for no wood at all is a button that can only be a
   mistake. Moving one is still allowed -- a 2x2 landmark in the wrong place
   would otherwise wall off the corner it landed in. */
const canSell = p => !!p && p.key !== 'hall' && !isFound(p.key);
function sellBuilding(p) {
  if (!canSell(p)) return false;
  const c = centreOf(p);
  /* Take the building down BEFORE paying for it. Paid first, a storehouse
     refunded into the capacity it was about to take away with it, and the
     village was left holding more than it could store -- which then leaked
     back out on the next delivery. Selling storage cannot be a way to exceed
     storage. The panel quotes the refund against the same after-the-sale
     ceiling, so the figure on the button is still the figure received. */
  placed = placed.filter(q => q !== p);
  if (panel === p.id) panel = null;
  if (moving === p.id) moving = null;
  recomputeCaps();
  /* And what the new ceiling cannot hold is gone, which is exactly what the
     warning on the button promises: "-- would spoil".

     That used to happen by accident. The refund goes through grant(), and
     grant clamps to the ceiling, so a building that paid back some of every
     kind it STORED carried the overflow away with it. It only held while
     those two sets were the same set. A market is built of wood and stone
     and stores food as well, so the moment its price stopped naming food the
     warning "800 would spoil" became a sentence about nothing: the food sat
     there above a ceiling that no longer existed until some later delivery
     quietly clamped it, which is both a lie on the button and free storage
     for as long as nobody delivered anything. */
  for (const k of RES) res[k] = Math.min(res[k], caps[k]);
  for (const [k, v] of Object.entries(sellValue(p))) grant(k, v, c.x, c.y);
  /* And whatever it had already made. A workplace holds up to two loads waiting
     for a carrier, and selling it binned them: sixteen goods, measured, with
     two thousand four hundred of room in the stores. Those are finished goods
     in exactly the same state as a load in a villager's hands, which the
     village now hands in rather than losing, and they go the same way -- so a
     full store can still refuse them and a finished village still shares them.

     After the refund, for the same reason the refund comes after the building
     is taken down: selling a storehouse must not deliver into capacity that is
     leaving with it. */
  const b = B(p.key);
  if (b.makes && p.stock > 0.01) { deliver(Object.keys(b.makes)[0], p.stock, c.x, c.y); p.stock = 0; }
  /* Anyone who worked here is out of a job this instant, not on the next tick.
     assignJobs does clear it, but until it ran the village held villagers
     posted to a building that no longer existed.

     Not anyone carrying, though. Sending them idle stopped them walking and
     they kept the load for ever -- a villager wandering the village holding
     eight food that would never be delivered, because the idle state has no way
     to put anything down. They finish the trip and go idle on arrival. */
  for (const g of villagers) if (g.job === p.id) { g.job = null; if (!g.carry) g.st = 'idle'; }
  save();
  SFX.sell();
  return true;
}

/* Decorations are taken away through sellBuilding like everything else -- half
   the price back, clamped to storage, the workers released, the caps and the
   charm total rebuilt. There used to be a second removeDecor() beside it doing
   the same job by hand, and doing it slightly wrong: it never recomputed, so
   with a cached charm total it would have left the village claiming a bonus for
   an ornament that was no longer there. Nothing called it. */

/* ---------- save ---------- */
/* Where the village is written down.

   A let rather than a const, and that is not an accident of style -- it is
   the only thing standing between the test harness and the player's village.

   The harness drives a real, running game: it empties the island, drops fifty
   buildings on it, clamps the stores to twenty and steps the clock, all inside
   the same page the player left open. Meanwhile this game autosaves every five
   seconds off whatever is in memory, and the first autosave after a load
   promotes the primary to the backup. So a sweep would restore the file it had
   carefully copied aside, and three seconds later the game wrote its scratch
   village straight back over it, and over the one copy that could have rescued
   it. Twice, measured, on a finished village that took hours to build.

   Restoring afterwards is the wrong shape of fix, because it is a race the
   game can always win. Pointing the game at somewhere else entirely is not a
   race at all: while the harness holds these, every save in the game -- the
   autosave, the one after a goal, the ones the save sweep makes on purpose --
   lands on a key nobody reads. The player's file is not protected, it is
   unreachable. */
let KEY = 'vil_save';
/* A second, older copy of the save.

   A village is hours of work held in one string. If that string is truncated by
   a browser killed mid-write, or the storage is cleared under us, load() finds
   nothing usable and the player is handed a brand new island with no
   explanation and no way back. The backup lags by roughly a minute and was
   itself a primary that loaded cleanly, so falling back to it costs a minute
   rather than everything. */
let KEY_BAK = 'vil_save_bak';
const BACKUP_EVERY = 12;              // saves between backups; saves are ~5s apart
let saveN = 0, saveFailed = false, loadedFromBackup = false;
const SAVE_V = 4;      // 2: house 2x1. 3: hall and jobs. 4: every building levels
/* Send every save somewhere else, and back again. All three together, because
   a run with the primary moved and the backup left behind would promote the
   scratch village into the player's backup on the very first autosave -- the
   same hole in a smaller frame. */
function setSaveKeys(k, b, o) { KEY = k; KEY_BAK = b; KEY_OTHER = o; }
const SAVE_KEYS = { key: 'vil_save', bak: 'vil_save_bak', other: 'vil_save_other' };
/* Whether a string in storage is a save this game would actually load. load()
   has always asked it of what it reads; save() did not ask it of what it
   PROMOTES, which is the other half of the same question and the half the
   backup exists for. */
const readSave = str => { try { return JSON.parse(str); } catch (e) { return null; } };
const usableSave = x => !!x && typeof x === 'object' && x.v === SAVE_V && Array.isArray(x.placed);
/* A village written by a different build of this game.

   usableSave wants the version to match exactly, which is right -- this
   build does not know what a v3 placed array means. What was wrong was what
   happened next: load gave up, the game started empty, and five seconds
   later the first autosave wrote the empty village over the file. The backup
   went the same way inside the minute, because promotion copies the primary
   whenever the primary is readable and an empty village is perfectly
   readable. Measured: seven buildings on disk, both copies gone within a
   minute, and not one word on screen.

   The version has already moved three times -- 2 for the house, 3 for the
   hall, 4 for building levels -- so a fourth is likely, and after this ships
   a fourth would do that to somebody who has played for hours.

   So a village we cannot read is not destroyed. It is set aside under its
   own key, once, and the player is told it is there. That is not a
   migration and does not pretend to be one; it is the difference between a
   village that can be brought back by a later build and one that cannot. */
let KEY_OTHER = 'vil_save_other';
let otherBuild = 0;                   // the version of a save this build cannot read
const isVillage = x => !!x && typeof x === 'object' && Array.isArray(x.placed);
function setAside(raw2, v) {
  otherBuild = Number.isFinite(v) ? v : -1;
  /* The most recent one, not the first.

     This began as "keep it only if nothing is kept yet", to stop a second
     start copying the empty village over the one being kept safe. That cannot
     happen: once a readable save exists setAside is never reached again, so
     within one install the kept copy is already stable. What the guard did
     instead was decide which village survives TWO updates -- and it chose the
     oldest, which is the one the player is least likely to want back. */
  try { if (raw2) localStorage.setItem(KEY_OTHER, raw2); } catch (e) {}
}
/* The moment the simulation has reached, which is not always now.

   A backgrounded page is throttled, not stopped: the tick still runs, a few
   times a second, with its dt capped at a tenth -- so the village simulates a
   fraction of the time that passes. The unsimulated remainder is what being
   away is worth, and the resume path credits it.

   But the throttled tick also kept saving, and every save stamped the wall
   clock: the file claimed the village had been simulated right up to the
   moment it was written, when it had not. Harmless while the page lives long
   enough to come back -- which is exactly what does not happen on a phone,
   where Android kills the backgrounded WebView and the next start is a cold
   one reading that stamp. Whatever the background lasts, all of it is lost
   except the last save interval. Measured in this throttled page: 69 seconds
   hidden simulated 34, owed 35, and a cold start would have credited 7.8 --
   under the one-minute floor, so nothing at all. A night on a phone, the way
   an idle game is actually played, came back to an empty card.

   So the stamp is where the simulation got to, and a cold start credits the
   rest: the same arithmetic the resume path does. Never ahead of the wall
   clock, so a device whose clock steps back cannot mint time. */
const simNow = () => hiddenAt ? Math.min(Date.now(), hiddenAt + hiddenSim * 1000) : Date.now();
/* The measured delivery rate is saved along with the time, so a village can
   carry on working while the game is shut. Saving the RATE rather than
   recomputing it on load matters: the rate the buildings are rated for is
   roughly double what they actually deliver, because villagers spend half
   their time walking, and paying out the rated figure would make being away
   better than playing. */
/* What the villagers are holding, by kind.

   A workplace's shelf is written into the save and comes back with it; the
   loads in villagers' hands were not, because villagers are not saved at all --
   they are rebuilt from the houses on the next boot, empty-handed. So the same
   goods survived a restart or did not, depending only on whether somebody
   happened to be carrying them at the moment the game was written down.

   Measured in a thirty-eight building village: 34.6 goods in hands on average,
   peaking at 72, thrown away on every start. */
const inTransit = () => {
  const out = tally();
  for (const v of villagers) if (v.carry) out[v.carry.k] += v.carry.n;
  return out;
};
function save() {
  try {
    /* Promote the last KNOWN-GOOD primary before overwriting it -- known-good
       by reading it, which is what the note above the backup claims happens
       and what nothing actually did. It promoted whatever byte string was
       sitting in KEY.

       That is the one string it must never promote. The whole mechanism is for
       a primary truncated by a browser killed mid-write, and after such a kill
       the page starts again with saveN back at nought -- so the FIRST autosave,
       five seconds in, copied the truncated primary over the good backup that
       had just rescued the village. The fallback was destroyed by the recovery
       it had performed, and a second kill inside the next minute took the lot.

       Measured: truncate the primary to sixty per cent and save, and the
       backup comes back unparseable. Keeping the older backup instead means it
       lags by more than the usual minute, which is the right way round: a
       minute is the price, a village is not. */
    if (saveN++ % BACKUP_EVERY === 0) {
      const prev = localStorage.getItem(KEY);
      if (prev && usableSave(readSave(prev))) localStorage.setItem(KEY_BAK, prev);
    }
  } catch (e) {}
  try { localStorage.setItem(KEY, JSON.stringify({
    v: SAVE_V, res, placed, t: simNow(), rate: rateNow, seen: tutSeen, mute: muted, transit: inTransit(),
    goal: goalIdx, land: landTier, orders, ordersDone, shared: sharedTotal,
    /* Only when there is one. A village short of the ladder's end has no
       mark, and writing the field as null put a field in the file that
       cannot be missed when it goes -- which is precisely what the save
       sweep tests every field for, and it would have reported the check
       going blind rather than the field being empty. */
    ...(afterMark ? { mark: afterMark } : {}) }));
    saveFailed = false; savedMs = Date.now();
  } catch (e) {
    /* Storage can be full, or blocked outright in a private window. Swallowing
       this means the player keeps playing a village that is not being written
       down, and finds out when they come back to nothing. */
    saveFailed = true;
  }
}
function load() {
  const parse = k => readSave(localStorage.getItem(k));
  const usable = usableSave;
  let s = parse(KEY);
  // same defensive shape as Gatestorm's loadProg: never trust what comes back
  if (!usable(s)) {
    const bak = parse(KEY_BAK);
    if (usable(bak)) { s = bak; loadedFromBackup = true; }
    /* Neither one is readable. If either is a village all the same -- a real
       save from another build rather than a damaged one -- it is kept. */
    else for (const [k, x] of [[KEY, s], [KEY_BAK, bak]])
      if (isVillage(x)) { setAside(localStorage.getItem(k), x.v); break; }
  }
  if (!usable(s)) return;
  if (s.rate && typeof s.rate === 'object') for (const k of RES)
    if (typeof s.rate[k] === 'number' && isFinite(s.rate[k]) && s.rate[k] >= 0)
      /* Past anything the village can reach, not at a number that sounded
         large. A maxed village delivers 28.7 wood and 37.8 a second, measured,
         and the save records it correctly -- so a ceiling of 20 meant reopening
         the app showed the best village in the game "+20.0 / s" on both chips
         until the five-second window caught up. Understating the player's own
         work, in the one number they watch most. The bound is only here to
         reject a damaged save, so it belongs well clear of honest play. */
      rateNow[k] = Math.min(200, s.rate[k]);
  if (Number.isFinite(s.t)) savedAt = s.t;
  /* Held until the village exists to receive it: caps are not known until the
     hall and the storehouses are back, and a load cannot arrive into a barn
     that has not been read yet. */
  pendingTransit = tally();
  if (s.transit && typeof s.transit === 'object') for (const k of RES)
    if (typeof s.transit[k] === 'number' && isFinite(s.transit[k]) && s.transit[k] >= 0)
      pendingTransit[k] = Math.min(VILLAGER_MAX * CARRY, s.transit[k]);
  if (Array.isArray(s.seen)) tutSeen = s.seen.filter(x => typeof x === 'string');
  if (typeof s.mute === 'boolean') muted = s.mute;
  /* Past the end of the ladder on purpose. This clamped to GOALS.length, which
     was right while that was the last goal there was and is now a quiet reset:
     every goal the player had earned past the ladder would be handed back on
     the next reload, for ever, and the strip would start again from the first
     shipping step each time they opened the app. */
  if (Number.isFinite(s.goal)) goalIdx = Math.max(0, Math.min(GOALS.length + AFTER_MAX, s.goal | 0));
  if (Number.isFinite(s.land)) landTier = Math.max(0, Math.min(LAND_MAX, s.land | 0));
  if (Number.isFinite(s.ordersDone)) ordersDone = Math.max(0, s.ordersDone | 0);
  /* Not | 0: a tally that runs for hours passes the 32-bit range, and a wrapped
     one would come back negative -- the same truncation that turned trade orders
     into free converters. A save written before the tally existed has none. */
  if (s.shared && typeof s.shared === 'object') for (const k of RES)
    if (typeof s.shared[k] === 'number' && isFinite(s.shared[k]) && s.shared[k] >= 0)
      sharedTotal[k] = Math.min(1e15, s.shared[k]);
  /* Cleared first. load() is not only called once at boot -- the harness calls
     it, and so does the recovery path -- and a mark left over from the village
     before this one would measure the new one's goals from the old one's
     history. A save written before the mark existed correctly leaves it null,
     and stepGoals takes a fresh one from wherever that village actually is. */
  afterMark = null;
  if (s.mark && typeof s.mark === 'object'
      && Number.isFinite(s.mark.ship) && Number.isFinite(s.mark.orders))
    afterMark = { ship: Math.max(0, Math.min(1e15, s.mark.ship)),
                  orders: Math.max(0, s.mark.orders | 0) };
  if (Array.isArray(s.orders)) {
    orders = s.orders.filter(o => o && RES_SET.has(o.giveK) && RES_SET.has(o.getK)
      && Number.isFinite(o.giveN) && Number.isFinite(o.getN))
      .slice(0, 5)
      /* The tier has to survive the trip. Without it every stall came back
         looking like the smallest one, so the board stopped marking its best
         rate and stopped keeping the three sizes distinct when it refilled --
         and both of those are invisible failures that only start after a
         reload. An order saved before tiers existed is placed by its size. */
      .map(o => ({ id: orderSeq++, giveK: o.giveK, getK: o.getK, slot: o.slot,
        tier: Number.isFinite(o.tier) ? Math.max(0, Math.min(ORDER_TIERS.length - 1, o.tier | 0))
          : nearestTier(o.giveN, o.giveK),
        /* | 0 is a 32-bit truncation, and a size past that range wraps. A save
           carrying 1e12 came back as 1 -- and a one-for-one trade is not a
           broken order, it is the free converter makeOrder goes out of its way
           to prevent: loop it and wood and food become the same resource, which
           makes balancing farms against lumber camps pointless. Rounded and
           held inside the ceiling instead. */
        /* Bounded against nonsense, NOT against the current ceiling.

           Clamping to caps looked right and quietly destroyed good orders. Sell
           storage after a big offer is written and the offer is larger than the
           barn -- clamping squashed both of its numbers to the same cap, which
           made it worth exactly what it asks, and the filter below then deleted
           it as a free converter. A save with five orders came back with four,
           once every twenty thousand rounds.

           An offer bigger than the barn is not a broken offer, it is one that
           cannot be filled today: res >= giveN fails, so the board replaces it
           within the minute of its own accord. The bound here only has to be
           past anything the game can produce -- the largest possible order is
           about a quarter of 8380 -- while still catching a wrapped 1e12. */
        giveN: Math.max(1, Math.min(1e5, Math.round(o.giveN))),
        getN: Math.max(1, Math.min(1e5, Math.round(o.getN))) }))
      /* And an order must still be worth less than it asks, which is the one
         rule every generated order obeys. Anything that is not is dropped; the
         board writes a new one within the minute. */
      .filter(o => o.getN / Math.max(1, caps[o.getK]) < o.giveN / Math.max(1, caps[o.giveK]));
  }
  if (s.res && typeof s.res === 'object') for (const k of RES)
    if (typeof s.res[k] === 'number' && isFinite(s.res[k])) res[k] = s.res[k];
  if (Array.isArray(s.placed)) placed = s.placed.filter(p =>
    p && B(p.key) && Number.isFinite(p.c) && Number.isFinite(p.r))
    .map(p => ({
      id: Number.isFinite(p.id) ? p.id | 0 : nextId++,
      key: p.key, c: p.c | 0, r: p.r | 0,
      t: typeof p.t === 'number' ? Math.min(1, Math.max(0, p.t)) : 1,
      lvl: Math.min(p.key === 'hall' ? HALL_MAX : LVL_MAX, Math.max(1, p.lvl | 0)),
      /* What a workplace is holding, waiting to be carried. It stops filling at
         STOCK_MAX by design, so a save saying 9999 is describing a state the
         game never produces -- and it pays out as a backlog of free goods. */
      stock: typeof p.stock === 'number' && isFinite(p.stock)
        ? Math.max(0, Math.min(STOCK_MAX, p.stock)) : 0,
      /* How long this one takes, not how long a new building takes.

         t is progress from 0 to 1 and build is what that progress is measured
         against, so throwing build away and substituting BUILD_TIME rescales
         whatever was under way. A hall upgrade takes six seconds and a level
         four building twelve; reload either at the halfway mark and the three
         seconds still owed became one and a half. Reloading was a way to finish
         an upgrade four times faster, which is small in seconds and wrong in
         principle. Clamped, because it comes out of a save like everything
         else. */
      build: Number.isFinite(p.build) && p.build > 0 ? Math.min(60, p.build) : BUILD_TIME,
    }));
  /* A save cannot put a building somewhere the game would never have let you
     build it.

     Every position was taken on trust: a save with its buildings at c=-40 and
     r=80 loaded them off the map, and one with all of them written to the same
     tile loaded twelve buildings stacked on a single square. place() refuses
     both -- "the position check is not optional just because the ghost normally
     prevents it" -- and the soak test has rules saying neither state may exist.
     load() was the way in.

     Kept in order, so the hall (always first) wins any tile it shares.

     The land is stretched to cover the village BEFORE any of this, which is not
     a detail. coverPlaced() has always repaired a save whose land field came
     back smaller than its buildings by claiming rings until they fit -- and it
     runs after load(), so when this filter first went in it threw those
     buildings away before the repair could reach them. An eight-building village
     whose land field read 0 came back as one building. Dropping a building is
     for a position the game could never have produced; a shrunken land field is
     a save to mend, not a village to demolish. */
  coverPlaced();
  {
    const taken = new Set(), keep = [];
    for (const q of placed) {
      const b = B(q.key);
      let ok = true;
      for (let dc = 0; dc < b.w && ok; dc++) for (let dr = 0; dr < b.h && ok; dr++) {
        const key = (q.c + dc) + ',' + (q.r + dr);
        if (taken.has(key) || !inLand(q.c + dc, q.r + dr)) ok = false;
      }
      if (!ok) continue;
      for (let dc = 0; dc < b.w; dc++) for (let dr = 0; dr < b.h; dr++)
        taken.add((q.c + dc) + ',' + (q.r + dr));
      keep.push(q);
    }
    placed = keep;
  }
  // ids must not collide with anything placed later in the session
  nextId = Math.max(nextId, ...placed.map(p => p.id + 1), 1);
  recomputeCaps();
  /* A stored amount was only checked for being a finite number, so a save
     holding -999 wood loaded as -999 wood: every cost then fails its
     affordability check for ever and the village can never build again.
     Clamped here, after recomputeCaps, because the ceiling depends on what was
     just loaded. */
  for (const k of RES) res[k] = Math.max(0, Math.min(caps[k], res[k]));
  /* And an offer this board would not make today does not survive the trip.

     tradeKinds arrived after a build that paid every early trade in stone, so
     a village saved by that build comes back holding a boardful of them. They
     are perfectly fillable, and the replacement path only steps in when
     NOTHING on the board can be taken -- so they would stand there until the
     player took them, which is the trade the rule exists to prevent. Dropped
     rather than rewritten: an empty stall is a state the board already knows
     how to be in, and the next trader fills it within one wait.

     Last in load, because tradeKinds reads the hall level and the stores, and
     neither is settled until placed is back and the caps are recomputed. */
  const tradeable = new Set(tradeKinds());
  orders = orders.filter(o => tradeable.has(o.giveK) && tradeable.has(o.getK));
}
/* What the village earned while the game was closed.

   The storage cap does the limiting rather than an arbitrary percentage: come
   back after an hour and you find full storehouses, which is the honest result
   and quietly makes upgrading storage worth more. Anything under a minute is
   ignored so a reload is not a reward. */
let pendingTransit = tally();
/* The loads that were in villagers' hands when the game was last written down,
   put back into the village once it is standing again.

   Through grant rather than deliver: these goods were made and counted long
   ago, and running them through the delivery path would have them arrive twice
   in the rate the HUD reports -- once when they were carried, once when the app
   reopened. The stores can still be too full to take them, which is the same
   answer a carrier would have got. */
function landTransit() {
  const c = hallOf() ? centreOf(hallOf()) : { x: 0, y: 0 };
  for (const k of RES) if (pendingTransit[k] > 0) grant(k, pendingTransit[k], c.x, c.y);
  pendingTransit = tally();
}
const AWAY_MIN = 60, AWAY_MAX = 12 * 3600;
let savedAt = 0;
let away = null;                      // {secs, got:{wood,food}} until dismissed
/* The finished village, shown once, the first time the last goal falls.

   Two hours of play ended with the goal strip going grey and saying "Every goal
   done" in the same voice it uses for "dig a well". Everything else the village
   achieves is announced where it happens; finishing it was the one thing that
   was not. Remembered in tutSeen rather than in a new save field, because that
   is exactly what tutSeen is: the list of things this player has been told
   once. */
let finished = null;                  // {villagers, buildings, trades, charm} until dismissed
/* Whether the completion card is actually ON SCREEN -- one rule, because the
   thing that paints it and the things that dismiss it have to agree.

   The card yields to the goal banner, the welcome-back card and the claim
   dialogue, so being set is not the same as being up. A tap and the back
   gesture both cleared it on being set, and the two came apart at exactly the
   worst moment: the LAST goal completing is what raises this card, and it also
   raises the banner announcing that goal. For those four and a half seconds
   the card is set and deliberately not drawn -- and a tap, which is the
   natural thing to do with a banner on screen, threw it away. It is shown
   once in a playthrough and remembered in tutSeen, so it never came back.

   Measured: claim the island, step one frame, and the card is set and not
   painted; one tap and it is gone for good, two hours of village unmarked. */
const finishedUp = () => !!finished && !goalDone && !away && !claimAsk;
/* The three cards that dim the whole screen: a question waiting for an answer,
   what was missed while nobody was watching, and the one that says the village
   is done. Each is the only thing that matters until it is dismissed -- tap()
   has always known that, and answers every tap with the card while one is up,
   whatever is underneath.

   Drawing did not. The building panel and the villager card were drawn
   underneath, poking out either side of a 620-wide card from a 960-wide panel,
   under a two-thirds dim, with their own words still on the screen. It read as
   accidentally fine only because the panel sits above the tabs and the tabs
   used to be low enough that the two did not meet; the moment the tray needed
   a second row the panel came up 169 pixels and the finished card's heading
   was printed straight through a building's name.

   Same rule drawFinished already states for itself -- one card at a time -- 
   applied to the two things that were exempt from it. */
const modalUp = () => claimAsk || !!away || !!finished;
/* Putting it away is what records it as seen, and the only thing that does.

   tutSeen used to be written the moment the card was RAISED, which is the
   same mistake the hints made: a thing is not read because it was offered.
   It cost the whole card to a reload during the goal banner. Now the village
   being finished is what raises it, every tick until it is dismissed, so a
   cold start puts it back up. */
function closeFinished() {
  finished = null;
  stopFinale();
  if (!tutSeen.includes(FINISH_ID)) { tutSeen.push(FINISH_ID); save(); }
}
const FINISH_ID = 'complete';

/* What the village is CAPABLE of producing per second, worked out from its
   buildings rather than from what was recently delivered.

   Offline earnings used the measured delivery rate, and that rate is zero
   whenever the storehouses are full -- because nothing can be delivered. So the
   player who filled their stores and went to bed, the one playing well, earned
   nothing while away, and the player who left with empty stores earned the lot.
   Exactly backwards.

   Villagers do not exist yet when this runs at boot, so the workforce is worked
   out the way assignJobs would fill it: the houses' population spread across
   the job slots, real workplaces before the hall's woodpile. Efficiency is
   folded in, so walking time is still paid for. */
/* What the villagers at work RIGHT NOW should be delivering, per resource.

   potentialRate answers for the village as it would be staffed; this answers
   for the hands actually in the posts, and it is what the chips fall back on
   while the measured rate has nothing to say yet. The measurement is a five
   second window eased in at 40% a window, and wood arrives in loads, so a new
   player's first lumber camp read "idle" for its first several seconds while
   the number above it visibly climbed. Measured against the eased rate in a
   full village the two agree within a few per cent. */
function expectedRate() {
  const out = tally();
  for (const p of producers()) {
    const b = B(p.key);
    if (!b.makes) continue;
    /* Nothing while the scaffolding is up -- deliveringNow says why. Measured
       on a village whose only farm was being improved, with the scaffolding
       held up for two minutes: the food chip read +1.45/s while 0.00/s reached
       the granary, and the wood chip beside it was right to within 4%. */
    const n = workersAt(p.id);
    if (n) out[Object.keys(b.makes)[0]] += n * deliveringNow(p);
  }
  return out;
}
function potentialRate(withoutHome) {
  /* The workforce assembled exactly the way assignJobs assembles it. It used to
     fill posts in the order they were built, which matched the game until hands
     started going where they deliver most -- and then the offline figure sat a
     quarter BELOW what the village was really producing, which is the same kind
     of lie as the ones it was written to avoid, just pointing the other way.

     Counted from the houses rather than from the villagers, because this runs
     at load, before the first tick has spawned any of them. */
  let pop = 0;
  for (const p of placed) if (p.id !== withoutHome) pop += livedIn(p);
  const { want, posts } = desiredJobs(Math.min(pop, VILLAGER_MAX));
  const out = tally();
  for (const p of posts) {
    const hands = want.get(p.id) || 0;
    if (!hands) continue;
    out[Object.keys(B(p.key).makes)[0]] += hands * deliveringNow(p);
  }
  return out;
}

/* Credit a stretch of time the village worked through unwatched, and put up the
   card. Split out from collectAway because a cold start is not the only way to
   be away: on Android, closing the app usually leaves the page alive, so coming
   back an hour later resumes rather than reloads. */
function grantAway(secs) {
  const capped = secs > AWAY_MAX;              // away longer than the village can bank
  secs = Math.min(AWAY_MAX, secs);
  if (secs < AWAY_MIN) return;
  /* Building is work too, and the builders were the one trade that stopped.

     Everything else in the village carried on unwatched -- the harvest, the
     hour of the day, the traders -- but a house left going up and an upgrade
     left half paid for came back at exactly the progress they were at.
     Measured over twelve hours: a three second house in at t 0.333 and out at
     t 0.333, an eight second upgrade in at 0.125 and out at 0.125, on a
     village credited 800 food for the same stretch. And the upgrade was
     counted at its NEW level for every second of that credit, so the
     scaffolding was paid for twice over and then still standing when the
     player looked at it.

     This is the line step() already runs; it is only that a cold start never
     gets to run it. A page merely hidden does still tick, so the two ways of
     being away disagreed with each other as well.

     Before the earnings rather than after, because what finished changes what
     the village was worth: a storehouse has to raise the ceiling before the
     haul is clamped to it, a house has to take its residents in before the
     workforce is worked out, and a hall has to reach its new level before
     either. recomputeCaps does all three. */
  let built = false;
  for (const p of placed) if (p.t < 1) { p.t = Math.min(1, p.t + secs / (p.build || BUILD_TIME)); built = true; }
  if (built) recomputeCaps();
  const got = {}, shared = {};
  let any = false, spilled = false;
  const rate = potentialRate();
  /* The same rule as a delivery, or the two paths contradict each other. A
     finished village shares its overflow while you watch it; left alone for an
     hour it used to "spill" the very same overflow instead, in amber, on the
     first card a returning player reads. Only the time the village actually
     worked counts -- past AWAY_MAX it was not working, so it was not sharing. */
  const finished = villageFinished();
  /* And the same rule as a delivery for the beacon, too.

     A carried load gives the beacon half while it is rising, and what the barn
     cannot hold goes over the water at the beacon's multiplier. This path did
     neither: the tower stood still for every hour the app was closed -- which
     for a game you leave running is most of them -- and the overflow was
     counted plain, so an hour away shipped less than the same hour watched.
     The multiplier is the one the village had when it was left, which is
     what the loads of that stretch would have carried. */
  const mul = shareMul();
  const beacon = beaconAway(rate, secs);
  let fullAfter = Infinity;
  for (const k of RES) {
    const room = caps[k] - res[k];
    const want = rate[k] * secs - beacon.took[k];
    const inflow = want / secs;
    if (want - Math.max(0, room) > 1 && inflow > 0) fullAfter = Math.min(fullAfter, Math.max(0, room) / inflow);
    const earned = Math.max(0, Math.min(room, want));
    if (finished && want - earned > 1) {
      sharedTotal[k] += (want - earned) * mul;
      shared[k] = Math.floor((want - earned) * mul);
    }
    /* Two different ceilings can eat this haul, and the card used to show the
       survivor of both with no account of either: twelve hours away could hand
       back three wood because the barn was already nearly full, and twelve
       hours was itself all you got for a week. Both are worth saying; neither
       was said. */
    if (want - earned > 1) spilled = true;
    if (earned >= 1) { res[k] += earned; got[k] = Math.floor(earned); any = true; }
  }
  /* And the traders came too, which is the one thing in that list that did
     not.

     The note above says everything else carried on unwatched -- the harvest,
     the hour of the day, the traders. The first two do: the harvest is what
     this function credits, and the day runs off the wall clock. The board
     was simply frozen. orderT only moves inside step(), so a village left
     for twelve hours came back to the stalls it was left with, down to the
     offer, and a countdown that had not moved a second.

     Measured: an empty board, away one hour, eight hours, twelve hours --
     nought stalls taken every time, against the forty-eight to five hundred
     and seventy-six traders that stretch is worth. Five minutes of actually
     playing fills all three. So the player most likely to find an empty
     market is the one who closed the app before the board had filled, and
     what they come back to is another three and three quarter minutes of
     waiting -- a stall at a time, at seventy-five seconds each.

     Enough time for ONE trader is all this needs to know. Past that the
     board is simply full, and running the clock five hundred times over
     would arrive at the same three stalls having written five hundred
     saves to get there.

     After the earnings, not before: makeOrder sizes an offer against the
     ceiling and points it at whichever resource the village is richer in,
     and both of those are what the haul just changed. */
  if (secs >= orderEvery()) {
    seatOrders();
    /* An offer nobody could take would have been replaced, one stall per
       trader, and over a stretch this long every one of them. The exception
       the live rule keeps is kept here too: a board blocked only because
       there is nowhere to PUT the payout is not a board of bad offers, and
       the trader who replaced them would hit the same wall. */
    if (orders.length && !orders.some(canFill) && !orders.every(o => res[o.giveK] >= o.giveN))
      orders = orders.map(o => ({ ...makeOrder(), slot: o.slot }));
    /* One at a time, so each new offer sees the ones already standing and
       keeps the three sizes distinct, exactly as the live board does. */
    while (orders.length < orderSlots()) orders.push({ ...makeOrder(), slot: freeStall() });
    orderT = 0;                        // a trader has just been; the next is a full wait away
  }
  if (any || spilled || beacon.sum >= 1) away = { secs, got, capped, spilled, shared: finished ? shared : null,
    fullAfter: isFinite(fullAfter) ? fullAfter : null, beacon: beacon.sum >= 1 ? beacon : null };
}
// a cold start: measured from the save, which is where the last session ended
function collectAway() {
  if (!savedAt) return;
  grantAway((Date.now() - savedAt) / 1000);
}

/* A village with no hall has no rules and no centre, so one is founded for free
   at the middle of the map. Also repairs a save that predates the hall. */
/* Exactly one hall, always.

   load() is careful about every other kind of nonsense a save file can carry
   and did not check this one, because nothing in the game can build a second
   hall. A file that has somehow acquired two -- a merge, a half-written save,
   an edit -- loaded them both, and the village was then stuck with an
   unsellable duplicate woodpile that also counted as a storehouse and pulled
   every delivery distance towards itself. hallLevel() read whichever came
   first, so the allowances could come from the wrong one too.

   The best one wins: it is the one the player most likely paid for. */
function ensureHall() {
  const halls = placed.filter(p => p.key === 'hall');
  if (halls.length > 1) {
    halls.sort((a, b) => lvlOf(b) - lvlOf(a));
    placed = placed.filter(p => p.key !== 'hall' || p === halls[0]);
    recomputeCaps();
  }
  if (hallOf()) return;
  const b = B('hall'), c = Math.floor((GW - b.w) / 2), r = Math.floor((GH - b.h) / 2);
  placed.push({ id: nextId++, key: 'hall', c, r, t: 1, lvl: 1, stock: 0, build: BUILD_TIME });
  recomputeCaps();
}

/* ---------- simulation ---------- */
const BUILD_TIME = 3.0;
const SAVE_EVERY = 5;                 // seconds
let saveT = 0, savedMs = 0;
function step(dt) {
  /* The away clock runs whenever the page is hidden, however it got that way.
     visibilitychange only fires on a CHANGE, so a page that STARTED hidden --
     a WebView restored into the background, a tab opened behind the one being
     read -- was throttled from its first frame with nothing counting. Asked
     every tick rather than once at boot, so there is one answer to 'is this
     page being watched' and it cannot drift out of step. */
  if (document.hidden && !hiddenAt) { hiddenAt = Date.now(); hiddenSim = 0; }
  if (hiddenAt) hiddenSim += dt;      // what the throttled tick managed while away
  stepCam(dt);
  stepFinds(dt);
  if (backOpen()) armBack();          // so the back button can close it again
  else if (backArmed) disarmBack();   // closed some other way: take the entry back out
  if (sellArm) { sellArm.t -= dt; if (sellArm.t <= 0 || panel !== sellArm.id) sellArm = null; }
  /* Scaffolding comes down BEFORE the jobs are handed out. It used to be the
     last thing in the tick, so a building that finished had to wait a frame for
     anyone to walk to it -- and the recompute it triggers threw away the
     workforce plan that had just been acted on, leaving the village a tick out
     of step with itself. Nothing produces in here any more; see stepVillagers. */
  for (const p of placed) {
    if (p.t < 1) {
      p.t = Math.min(1, p.t + dt / (p.build || BUILD_TIME));
      // a finished building has to be written down, or reloading replays its
      // construction from wherever the last save caught it
      if (p.t >= 1) {
        recomputeCaps(); save(); SFX.done();
        if (p.key === 'hall' && lvlOf(p) > 1) celebrateHall(lvlOf(p));
        else celebrateFirst(p);
      }
    }
  }
  syncVillagers();
  assignJobs();
  stepVillagers(dt);
  stepFeedback(dt);
  stepHints(dt);
  stepGoals(dt);
  stepShow(dt);
  stepOrders(dt);
  /* Everything the villagers carry in changes res without going through place(),
     so without this a session's whole harvest is lost on reload.

     Every five SIMULATED seconds, which while hidden is far longer in real
     ones -- and the stamp is only ever as fresh as the last write, so the
     stretch between two writes comes back credited as time away although the
     village worked it. Real seconds count too, once nobody is watching. */
  saveT += dt;
  if (saveT >= SAVE_EVERY || (hiddenAt && Date.now() - savedMs >= SAVE_EVERY * 1000)) { saveT = 0; save(); }
}

/* ---------- drawing ---------- */
function fitCanvas() {
  const sw = window.innerWidth || W, sh = window.innerHeight || H;
  const want = Math.max(H, Math.min(H * 2, Math.round(W * sh / sw)));
  /* The insets only move when the window does, and reading them means a
     getComputedStyle and a layout read -- cheap here, a forced synchronous
     layout in the middle of a frame on a phone. fitCanvas runs every frame, so
     it asks only when something actually changed.

     And it keeps asking until it gets an answer. readSafeArea gives up when the
     canvas has no box yet -- "try again later" -- and there was no later: the
     only other callers are resize and orientationchange, and a phone held
     still in portrait fires neither. So a start-up where the first read lands
     before the canvas is laid out left the insets at zero for the whole
     session, with the resource chips under the camera and the tray under the
     gesture bar, and the only way out was to turn the phone over.
     Demonstrated: read normally the insets come out at 94 and 68; read once
     with nothing to measure they stay at zero, and sixty frames of ordinary
     play later they were still zero with the canvas 768 tall.

     One extra layout read per frame until it works, and none ever after. */
  if (cv.height !== want) { cv.height = want; VH = cv.height; readSafeArea(); }
  else if (!safeKnown) readSafeArea();
  VH = cv.height; OY = Math.round((VH - H) / 2);
  CAM.base = VH / H;
}
function tilePath(c, r) {
  const p = tileToWorld(c, r);
  g.beginPath();
  g.moveTo(p.x, p.y - TH / 2); g.lineTo(p.x + TW / 2, p.y);
  g.lineTo(p.x, p.y + TH / 2); g.lineTo(p.x - TW / 2, p.y);
  g.closePath();
}
/* Fitting the painted island to the grid.

   The plate is not simply a diamond: below the grass there is a rim of earth
   and rock, so the bottom of the IMAGE is the bottom of the cliff, not the
   corner of the ground the village stands on. These three numbers, measured
   off the alpha channel, say where the top face actually is:

     faceW  width of the grass surface as a fraction of the image width
     ax,ay  where the near corner of that surface sits in the image

   The plate is the lush one: flowered grass over sandstone cliffs, a strip of
   sand and a line of surf, all hanging BELOW the grass rather than eating
   into it. The generator never draws an exact diamond -- its first try
   squashed the front of the grass by a sixth to make room for the cliffs, its
   second came back a kite with the side corners low -- so the picture was
   warped onto one: two affine triangles split on the left-right line, which
   meet without a seam and stretch the cliffs by a sixth at most. The grass
   face is now 1501 x 750.5, exactly 2:1, with its corners on the grid's. */
const GROUND_FIT = { faceW: 0.9446, ax: 0.5000, ay: 0.7245 };

/* The sea is one painted image mirrored into a 2x2 tile, which makes it repeat
   with no seam whatever the artwork does at its edges: every tile boundary
   meets its own reflection. Built once, on the first frame after it loads. */
let waterPat = null;
function waterPattern() {
  if (waterPat) return waterPat;
  const im = artFor('water');
  if (!ready(im)) return null;
  const w = im.width, h = im.height;
  const cv = document.createElement('canvas');
  cv.width = w * 2; cv.height = h * 2;
  const q = cv.getContext('2d');
  q.drawImage(im, 0, 0);
  q.save(); q.translate(w * 2, 0); q.scale(-1, 1); q.drawImage(im, 0, 0); q.restore();
  q.save(); q.translate(0, h * 2); q.scale(1, -1); q.drawImage(im, 0, 0); q.restore();
  q.save(); q.translate(w * 2, h * 2); q.scale(-1, -1); q.drawImage(im, 0, 0); q.restore();
  waterPat = g.createPattern(cv, 'repeat');
  return waterPat;
}

/* Boats riding at anchor off the coast.

   On a phone the sea is a third of every screen -- the island is wider than
   it is tall and the screen is the other way round -- and it was empty. Two
   boats, placed against the island's own bounds so they stay off the coast at
   any size, in the two stretches a portrait screen leaves empty: the open
   water above the island's top corner and below its southern cliffs. A third,
   a ketch under sail, keeps the fishing boat company in the upper water. Nothing about them moves or can be touched; they are scenery for the
   water, as the sheep are for the grass. A boat whose picture is missing is
   simply not there. In winter the boats carry snow on their decks and ice
   along their rails, and the stacks, the seals' rock, the sandbar and the
   buoy are snowed on too, and the dolphins and the whale break through a
   cold grey sea with ice in it: each marked `winter` has a picture of its
   own for it. The turtle has gone south; its winter picture is an ice floe
   in the same water, with two gulls on it. The boats, the stacks, the seals
   and the sandbar have an autumn and a spring too -- leaves and the harvest
   on the decks, rusty lichen and kelp; blossom garlands and bunting, sea
   thrift, a seal pup (art/PROMPTS.md 183). The animals out at sea and the
   buoy are the same all year. */
const SEA_PROPS = [
  { key: 'boat_fishing', fx: -0.12, top: true,  dy: -230, h: 100, winter: true, autumn: true, spring: true, glow: true },
  { key: 'boat_row',     fx:  0.11, top: false, dy:  330, h: 52, winter: true, autumn: true, spring: true },   // clear of the cliffs and sand
  { key: 'boat_ketch',   fx:  0.24, top: true,  dy: -100, h: 132, winter: true, autumn: true, spring: true, glow: true },  // under sail, off the north-east shore
  { key: 'sea_rocks',    fx: -0.14, top: false, dy:  390, h: 150, still: true, winter: true, autumn: true, spring: true },  // sea stacks off the south-west cliffs
  { key: 'sea_dolphins', fx:  0.34, top: false, dy:  230, h: 72,  still: true, winter: true },  // leaping off the south-east shore
  { key: 'sea_seals',    fx:  0.07, top: true,  dy: -150, h: 84,  still: true, winter: true, autumn: true, spring: true },  // basking off the northern tip
  { key: 'sea_whale',    fx: -0.30, top: false, dy:  250, h: 96,  still: true, winter: true },  // diving off the south-west
  { key: 'sea_buoy',     fx:  0.17, top: true,  dy:  -30, h: 64,  still: true, winter: true, glow: true },  // a bell buoy out to the north-east
  { key: 'sea_turtle',   fx:  0.19, top: false, dy:  110, h: 52,  still: true, winter: true },  // a turtle surfacing off the south-east
  { key: 'sea_sandbar',  fx: -0.19, top: true,  dy:  -40, h: 84,  still: true, winter: true, autumn: true, spring: true },  // a sandbar with gulls off the north-west
];
/* The lights at sea after dark (art/PROMPTS.md 186): a lantern on the fishing
   boat and the ketch, and the lamp in the buoy's cage. Each glow was made
   against the summer picture, so it is laid on that picture's frame at the
   prop's height -- the seasonal pictures are the same boat at the same size. */
function seaGlow(s, x, top, hgt) {
  if (!s.glow) return;
  const n = sky().night;
  if (n < 0.04) return;
  const base = artFor(s.key), glow = artFor(s.key + '_glow');
  if (!base || !glow) return;
  const wid = base.width * (hgt / base.height);
  paintGlow(glow, x - wid / 2, top, wid, hgt, n);
}
/* Sun on the water: by day small glints wink on and off across the sea around
   the island, brightest at noon, gone at dusk and under rain. Each is placed
   from its number and lit from the clock, so there is nothing to keep; the
   island is drawn over them afterwards, so they only show on open water.
   They are scattered over the part of the sea in view, at a size that stays
   the same on screen whatever the zoom. */
const GLINTS = 90;
/* The moon waxes and wanes over sixteen days of the game: 0 at new, 1 at full. */
const MOON_DAYS = 16;
const moonFull = () => 0.5 - 0.5 * Math.cos(Math.floor(Date.now() / DAY_MS) / MOON_DAYS * Math.PI * 2);
let glintsDrawn = 0;
function drawGlints() {
  glintsDrawn = 0;
  if (reduceMotion) return;
  const { sun, night } = sky(), dry = 1 - rainNow();
  // after dark the moon lays a fainter, silver light on the water, fuller some nights than others
  const moon = night > 0.05 ? night * moonFull() * dry : 0, lit = Math.max(0, sun) * dry;
  const by = Math.max(lit, moon), col = moon > lit ? '214,228,255' : '255,252,226';
  if (by < 0.05) return;
  const t = Date.now() / 1000, a = camUnproject(0, screenTop()), c = camUnproject(W, screenBot());
  const x0 = a.x, y0 = a.y, w = c.x - a.x, h = c.y - a.y, u = 1 / camScale();
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
  for (let i = 0; i < GLINTS; i++) {
    // each glint flashes briefly once in its cycle, then moves to a new spot
    const cyc = 2.2 + rnd(i, 21) * 2.6, k = t / cyc + rnd(i, 22), ph = frac(k);
    if (ph > 0.3 || (moon > lit && i % 2)) continue;
    const n = Math.floor(k), al = Math.sin(ph / 0.3 * Math.PI) * by;
    if (al < 0.04) continue;
    const x = x0 + rnd(i + n * 7.3, 23) * w, y = y0 + rnd(i + n * 7.3, 24) * h, r = (12 + rnd(i, 25) * 12) * u;
    g.strokeStyle = 'rgba(' + col + ',' + (0.9 * al).toFixed(3) + ')'; g.lineWidth = 5 * u;
    g.beginPath(); g.moveTo(x - r * 1.6, y); g.lineTo(x + r * 1.6, y); g.moveTo(x, y - r * 0.8); g.lineTo(x, y + r * 0.8); g.stroke();
    g.fillStyle = 'rgba(' + col + ',' + al.toFixed(3) + ')';
    g.beginPath(); g.arc(x, y, r * 0.32, 0, 7); g.fill();
    glintsDrawn++;
  }
  g.restore();
}
/* Rain on the sea: rings opening where the drops land. Before the island, so
   they show only on open water. */
const RAIN_RINGS = 70;
let ringsDrawn = 0;
function drawRainRings() {
  ringsDrawn = 0;
  const rain = rainNow();
  if (reduceMotion || rain < 0.05) return;
  const t = Date.now() / 1000, a = camUnproject(0, screenTop()), c = camUnproject(W, screenBot()), u = 2.2 / camScale();
  g.save(); g.lineWidth = 2.2 * u;
  // four strokes, one per band of fading, rather than one a ring
  for (let band = 0; band < 4; band++) {
  g.strokeStyle = 'rgba(232,246,255,' + (0.6 * (1 - (band + 0.5) / 4)).toFixed(3) + ')';
  g.beginPath();
  for (let i = 0; i < RAIN_RINGS * rain; i++) {
    const cyc = 0.8 + rnd(i, 73) * 0.6, k = t / cyc + rnd(i, 74), ph = frac(k), n = Math.floor(k);
    const x = a.x + rnd(i + n * 5.3, 75) * (c.x - a.x), y = a.y + rnd(i + n * 5.3, 76) * (c.y - a.y);
    if (Math.floor(ph * 4) !== band) continue;
    g.moveTo(x + (2 + ph * 14) * u, y); g.ellipse(x, y, (2 + ph * 14) * u, (1 + ph * 7) * u, 0, 0, 7);
    ringsDrawn++;
  }
  g.stroke();
  }
  g.restore();
}
/* Now and then a fish leaps clear of the water and drops back: a small dark
   arc over the sea, then rings spreading where it went in. Placed like the
   glints, in the sea in view, and drawn before the island so none land on it. */
let leapsDrawn = 0;
function drawLeaps() {
  leapsDrawn = 0;
  if (reduceMotion || sky().night > 0.7) return;
  const t = Date.now() / 1000, a = camUnproject(0, screenTop()), c = camUnproject(W, screenBot());
  const u = 2.2 / camScale();          // the canvas is drawn at well under half size on a phone
  g.save(); g.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const cyc = 5 + rnd(i, 42) * 4, k = t / cyc + rnd(i, 43), ph = frac(k), n = Math.floor(k);
    if (ph > 0.5) continue;
    const x = a.x + rnd(i + n * 3.1, 44) * (c.x - a.x), y = a.y + rnd(i + n * 3.1, 45) * (c.y - a.y);
    const dir = rnd(i + n, 46) < 0.5 ? 1 : -1, L = 34 * u;
    leapsDrawn++;
    if (ph < 0.12) {                       // in the air: the fish on its arc
      const q = ph / 0.12, fx = x + dir * (q - 1) * L, fy = y - Math.sin(q * Math.PI) * L * 0.8;
      g.save(); g.translate(fx, fy); g.rotate(dir * (q - 0.5) * 2.2); g.scale(dir, 1);
      g.fillStyle = 'rgba(44,62,70,0.9)';
      g.beginPath(); g.ellipse(0, 0, 9 * u, 3.4 * u, 0, 0, 7); g.fill();
      g.beginPath(); g.moveTo(-8 * u, 0); g.lineTo(-14 * u, -4 * u); g.lineTo(-14 * u, 4 * u); g.fill();
      g.restore();
      continue;
    }
    const q = (ph - 0.12) / 0.38;          // back in: rings widening and fading
    for (let r = 0; r < 2; r++) {
      const qq = q - r * 0.25;
      if (qq <= 0) continue;
      g.strokeStyle = 'rgba(236,250,255,' + (0.7 * (1 - qq)).toFixed(3) + ')'; g.lineWidth = 3.5 * u;
      g.beginPath(); g.ellipse(x, y, (6 + qq * 34) * u, (3 + qq * 17) * u, 0, 0, 7); g.stroke();
    }
  }
  g.restore();
}
/* Every minute or so a whale comes up off to one side of the view,
   where there is always sea: the long back breaking the surface, two spouts of
   spray, and the flukes lifting as it dives. Drawn before the island, like the
   fish, so that a camera panned the other way just has land over it. */
const WHALE_S = 70, WHALE_LEN = 0.2;
function whaleNow() {
  if (reduceMotion || sky().night > 0.7) return -1;
  const ph = frac(Date.now() / 1000 / WHALE_S);
  return ph < WHALE_LEN ? ph / WHALE_LEN : -1;
}
function whaleAt(t, q) {
  const n = Math.floor(t / WHALE_S), left = rnd(n, 70) < 0.5, dir = rnd(n, 71) < 0.5 ? 1 : -1;
  const at = camUnproject(W * (left ? 0.12 + rnd(n, 72) * 0.07 : 0.8 + rnd(n, 72) * 0.07), screenTop() + (screenBot() - screenTop()) * (0.15 + rnd(n, 73) * 0.05));
  const u = 2.2 / camScale();
  return { n, dir, u, x: at.x + dir * (q - 0.5) * 60 * u, y: at.y };
}
function drawWhale() {
  const q = whaleNow();
  if (q < 0) return;
  const { dir, u, x, y } = whaleAt(Date.now() / 1000, q);
  const up = Math.min(1, q / 0.12, (0.72 - q) / 0.1), L = 44 * u;
  g.save();
  if (up > 0) {
    g.save(); g.beginPath(); g.rect(x - L * 2, y - L * 2, L * 4, L * 2); g.clip();   // only what is above the water
    g.fillStyle = '#31454f';
    g.beginPath(); g.ellipse(x, y + (1 - up) * 18 * u, L, 11 * u, 0, 0, 7); g.fill();
    g.fillStyle = '#4b626c';
    g.beginPath(); g.ellipse(x - dir * L * 0.15, y - 3 * u + (1 - up) * 18 * u, L * 0.6, 5 * u, 0, 0, 7); g.fill();
    g.restore();
    g.strokeStyle = 'rgba(236,250,255,' + (0.75 * up).toFixed(3) + ')'; g.lineWidth = 3 * u; g.lineCap = 'round';
    g.beginPath(); g.ellipse(x, y, L * 1.08, 5 * u, 0, 0, 3.15); g.stroke();
  }
  for (const b of [0.14, 0.42]) {                 // a spout: spray going up and fanning out
    const sq = (q - b) / 0.12;
    if (sq <= 0 || sq >= 1) continue;
    g.fillStyle = 'rgba(244,252,255,' + (0.9 * (1 - sq)).toFixed(3) + ')';
    g.beginPath();
    for (let i = 0; i < 30; i++) {
      const h = (0.3 + rnd(i, 74) * 0.7) * Math.sin(sq * 1.7) * 50 * u, sp = (rnd(i, 75) - 0.5) * (0.25 + sq) * 34 * u;
      const dx = x + dir * L * 0.4 + sp, dy = y - 8 * u - h, dr = (3 + rnd(i, 76) * 3.5) * u;
      g.moveTo(dx + dr, dy); g.arc(dx, dy, dr, 0, 7);
    }
    g.fill();
  }
  if (q > 0.72) {                                  // the flukes, going down last
    const f = Math.sin((q - 0.72) / 0.28 * Math.PI), fx = x - dir * L * 0.5;
    g.save(); g.beginPath(); g.rect(fx - L, y - L * 2, L * 2, L * 2); g.clip();
    g.fillStyle = '#31454f';
    g.translate(fx, y + (1 - f) * 34 * u);
    g.beginPath(); g.moveTo(-4 * u, 4 * u); g.lineTo(-3 * u, -18 * u);
    g.quadraticCurveTo(-16 * u, -22 * u, -26 * u, -36 * u); g.quadraticCurveTo(-8 * u, -32 * u, 0, -24 * u);
    g.quadraticCurveTo(8 * u, -32 * u, 26 * u, -36 * u); g.quadraticCurveTo(16 * u, -22 * u, 3 * u, -18 * u);
    g.lineTo(4 * u, 4 * u); g.closePath(); g.fill();
    g.restore();
  }
  g.restore();
}
/* After dark the fishing boats are out, on dry nights: three small hulls off
   the island, each with a lantern at the stern and its light trembling on the
   water below. */
const NIGHT_BOATS = [[0.1, 0.16], [0.85, 0.13], [0.9, 0.2]];
function nightBoats(paint) {
  const k = Math.min(1, (sky().night - 0.35) / 0.2);
  if (k <= 0 || rainNow() > 0) return;
  const t = reduceMotion ? 0 : Date.now() / 1000, top = screenTop(), hh = screenBot() - top, u = 2.2 / camScale();
  g.save(); g.globalAlpha = k; g.lineCap = 'round';
  NIGHT_BOATS.forEach(([fx, fy], i) => {
    const at = camUnproject(W * (fx + 0.015 * Math.sin(t * 0.07 + i * 2)), top + hh * fy);
    const y = at.y + Math.sin(t * 1.1 + i) * 1.5 * u, d = i % 2 ? -1 : 1;
    paint(at.x, y, at.x + d * 15 * u, y - 17 * u, d, u, t, i);
  });
  g.restore();
}
function drawNightBoats() {
  nightBoats((x, y, lx, ly, d, u) => {
    g.fillStyle = '#1c2a33';
    g.beginPath(); g.moveTo(x - 24 * u, y - 6 * u); g.lineTo(x + 24 * u, y - 6 * u);
    g.quadraticCurveTo(x + 18 * u, y + 5 * u, x + 12 * u, y + 5 * u); g.lineTo(x - 12 * u, y + 5 * u);
    g.quadraticCurveTo(x - 18 * u, y + 5 * u, x - 24 * u, y - 6 * u);
    g.rect(x - d * 3 * u - 1.2 * u, y - 34 * u, 2.4 * u, 29 * u);
    g.rect(lx - 0.9 * u, ly, 1.8 * u, 12 * u);
    g.fill();
  });
}
// the lights go over the night's tint with the lamps, or they would be dimmed by it; a boat with land over it shows none
function drawBoatLights() {
  const b = worldBounds(), cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, rx = (b.x1 - b.x0) / 2, ry = (b.y1 - b.y0) / 2;
  nightBoats((x, y, lx, ly, d, u, t, i) => {
    if (Math.abs(lx - cx) / rx + Math.abs(ly - cy) / ry < 1.05) return;
    const halo = g.createRadialGradient(lx, ly, 0, lx, ly, 30 * u);
    halo.addColorStop(0, 'rgba(255,200,110,.5)'); halo.addColorStop(1, 'rgba(255,190,90,0)');
    g.fillStyle = halo; g.beginPath(); g.arc(lx, ly, 30 * u, 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,205,120,.5)'; g.lineWidth = 1.8 * u;
    g.beginPath();
    for (let j = 0; j < 6; j++) {            // the reflection, broken into wavering dashes
      const wy = y + (8 + j * 3.6) * u, w = (3 - j * 0.25 + Math.sin(t * 2.3 + j * 1.9 + i) * 1.8) * u, sh = Math.sin(t * 1.7 + j * 2.6 + i) * 2.5 * u;
      g.moveTo(lx + sh - w, wy); g.lineTo(lx + sh + w, wy);
    }
    g.stroke();
    g.fillStyle = '#ffe2a0'; g.beginPath(); g.arc(lx, ly, 3.6 * u, 0, 7); g.fill();
  });
}
/* And dolphins, on the off beat from the whale: four travelling together past
   one side of the island, each leaping in turn and dropping back with a splash. */
const POD_S = 55, POD_LEN = 0.26, POD = 4, POD_LEAP = 2.2;
function podNow() {
  if (reduceMotion || sky().night > 0.5) return -1;
  const ph = frac(Date.now() / 1000 / POD_S + 0.5);
  return ph < POD_LEN ? ph / POD_LEN : -1;
}
function drawPod() {
  const q = podNow();
  if (q < 0) return;
  const t = Date.now() / 1000, { n, dir, at } = podAt(t);
  const u = 2.2 / camScale(), edge = Math.min(1, q / 0.1, (1 - q) / 0.1);
  podBody(t, q, dir, at, u, edge);
}
function podAt(t) {
  const n = Math.floor(t / POD_S + 0.5), left = n % 2 === 0, dir = rnd(n, 83) < 0.5 ? 1 : -1;
  const at = camUnproject(W * (left ? 0.1 : 0.89), screenTop() + (screenBot() - screenTop()) * (0.16 + rnd(n, 84) * 0.04));
  return { n, dir, at };
}
function podBody(t, q, dir, at, u, edge) {
  g.save(); g.globalAlpha = edge; g.lineCap = 'round';
  g.fillStyle = '#4a6877'; g.strokeStyle = 'rgba(236,250,255,.75)'; g.lineWidth = 2.5 * u;
  for (let i = 0; i < POD; i++) {
    const x0 = at.x + dir * (q - 0.5) * 90 * u - dir * (i - 1.5) * 32 * u, y0 = at.y + (i % 2) * 11 * u;
    const f = frac(t / POD_LEAP + i * 0.31);
    if (f < 0.5) {                            // in the air, nose following the arc
      const p = f / 0.5, x = x0 + dir * (p - 0.5) * 30 * u, y = y0 - Math.sin(p * Math.PI) * 26 * u;
      g.save(); g.translate(x, y); g.scale(dir, 1); g.rotate((p - 0.5) * 1.9);
      g.beginPath(); g.ellipse(0, 0, 14 * u, 4.6 * u, 0, 0, 7);
      g.moveTo(-1 * u, -4 * u); g.lineTo(-6 * u, -9 * u); g.lineTo(3 * u, -4 * u); g.closePath();
      g.moveTo(-12 * u, 0); g.lineTo(-20 * u, -6 * u); g.lineTo(-17 * u, 0); g.lineTo(-20 * u, 6 * u); g.closePath();
      g.moveTo(12 * u, 0); g.lineTo(18 * u, 1 * u); g.lineTo(12 * u, 3 * u); g.closePath();
      g.fill(); g.restore();
    } else {                                  // the ring where it went back in
      const p = (f - 0.5) / 0.5;
      g.globalAlpha = edge * (1 - p);
      g.beginPath(); g.ellipse(x0 + dir * 15 * u, y0, (5 + p * 20) * u, (2.5 + p * 10) * u, 0, 0, 7); g.stroke();
      g.globalAlpha = edge;
    }
  }
  g.restore();
}
function drawSeaProps(b) {
  const W = b.x1 - b.x0, cx = (b.x0 + b.x1) / 2;
  for (const s of SEA_PROPS) {
    const sk = season().key, art = (s[sk] === true && artFor(s.key + '_' + sk)) || artFor(s.key);
    if (!art) continue;
    const x = cx + s.fx * W, y = (s.top ? b.y0 : b.y1) + s.dy;
    const hgt = s.h, wid = art.width * (hgt / art.height);
    // rocks are painted with their own surf at the waterline: drawn as they are
    if (s.still) { g.drawImage(art, x - wid / 2, y - hgt, wid, hgt); seaGlow(s, x, y - hgt, hgt); continue; }
    g.save();
    // the hull sits IN the water: a darker patch under it ...
    g.fillStyle = 'rgba(8,40,58,.28)';
    g.beginPath(); g.ellipse(x, y - 2, wid * 0.48, wid * 0.13, 0, 0, 7); g.fill();
    /* ... and the bottom of it under the surface. The generator draws the
       whole hull down to the keel, which floats it on top of the sea; the
       lowest eighth is cut off at the waterline instead. */
    g.save();
    g.beginPath(); g.rect(x - wid, y - hgt * 1.2, wid * 2, hgt * 1.2); g.clip();
    g.drawImage(art, x - wid / 2, y - hgt * 0.88, wid, hgt);
    seaGlow(s, x, y - hgt * 0.88, hgt);
    g.restore();
    // the ripple where hull meets water, over the hull's foot
    g.strokeStyle = 'rgba(235,250,255,.34)'; g.lineWidth = 2.5;
    g.beginPath(); g.ellipse(x, y - 1, wid * 0.52, wid * 0.14, 0, 0, Math.PI); g.stroke();
    g.restore();
  }
}
function drawGround() {
  const b = worldBounds(), cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;

  // sea, drawn far enough out that it still fills the screen at minimum zoom
  const pat = waterPattern();
  if (pat) {
    const pad = 2600;
    g.save(); g.fillStyle = pat;
    g.fillRect(b.x0 - pad, b.y0 - pad, (b.x1 - b.x0) + pad * 2, (b.y1 - b.y0) + pad * 2);
    g.restore();
  }
  drawGlints();
  drawLeaps();
  drawWhale();
  drawPod();
  drawNightBoats();
  drawRainRings();
  drawSeaProps(b);

  // soft ground shadow so the plot sits ON something instead of floating
  g.save(); g.fillStyle = 'rgba(8,14,6,.5)'; g.filter = 'blur(26px)';
  g.beginPath(); g.ellipse(cx, cy + 26, (b.x1 - b.x0) / 2 + 30, (b.y1 - b.y0) / 2 + 24, 0, 0, 7); g.fill();
  g.filter = 'none'; g.restore();

  const land = artFor('ground');
  if (ready(land)) {
    const f = GROUND_FIT;
    const wid = (b.x1 - b.x0) / f.faceW;              // grass surface spans the grid
    const hgt = land.height * (wid / land.width);
    // the near corner of the grass meets the near corner of tile (GW-1, GH-1)
    const ny = tileToWorld(GW - 1, GH - 1).y + TH / 2;
    g.drawImage(seasonSkin(land, 'ground'), cx - f.ax * wid, ny - f.ay * hgt, wid, hgt);
    return;
  }

  for (let r = 0; r < GH; r++) for (let c = 0; c < GW; c++) {
    const n = hash(c, r), n2 = hash(r * 3 + 1, c * 5 + 2);
    tilePath(c, r);
    // two greens mottled together, lighter toward the middle of the plot
    const mid = 1 - (Math.abs(c - GW / 2) + Math.abs(r - GH / 2)) / (GW / 2 + GH / 2);
    const hue = 92 + n * 14, sat = 30 + n2 * 14, lit = 27 + n * 9 + mid * 7;
    g.fillStyle = `hsl(${hue}, ${sat}%, ${lit}%)`;
    g.fill();
    g.strokeStyle = 'rgba(24,44,20,.22)'; g.lineWidth = 1.2; g.stroke();
    // scattered grass tufts
    if (n2 > 0.74) { const p = tileToWorld(c, r);
      g.strokeStyle = `hsla(${hue - 6},${sat + 16}%,${lit + 14}%,.75)`; g.lineWidth = 2.5; g.lineCap = 'round';
      for (let i = 0; i < 3; i++) { const a = n * 6 + i * 2.1, ox = Math.cos(a) * 20, oy = Math.sin(a) * 9;
        g.beginPath(); g.moveTo(p.x + ox, p.y + oy); g.lineTo(p.x + ox + 2, p.y + oy - 7); g.stroke(); } }
  }
}
/* World height of each kind at scale 1, set against a cottage at ~207px so the
   trees read as trees rather than shrubs or redwoods. */
const SCENERY_H = { goat: 30, cow: 40, tree_pine: 115, tree_spruce: 118, tree_oak: 100, tree_willow: 96, tree_poplar: 126, tree_cherry: 100, tree_birch: 122, rock: 54, rock_moss: 50, bush: 46, bush_hydrangea: 46, stump: 38, log_mushroom: 34, flowers_wild: 30, flowers_meadow: 30, sheep: 30, sheep_rest: 22, sheep_lambs: 26, skeps: 40, snowman: 50,
  tree_oak_winter: 100, tree_pine_winter: 115, tree_spruce_winter: 118, tree_birch_winter: 122,
  tree_willow_winter: 96, tree_poplar_winter: 126, tree_cherry_winter: 100, tree_oak_autumn: 100, tree_birch_autumn: 122, tree_willow_autumn: 96, tree_poplar_autumn: 126, tree_cherry_autumn: 100,
  tree_oak_spring: 100, tree_birch_spring: 122, tree_willow_spring: 96, tree_poplar_spring: 126, tree_pine_spring: 115, tree_spruce_spring: 118, rock_moss_spring: 50, stump_spring: 38, log_mushroom_spring: 34, bush_spring: 46,
  rock_winter: 54, rock_autumn: 54, rock_moss_autumn: 50, stump_autumn: 38, log_mushroom_autumn: 34, tree_pine_autumn: 115, tree_spruce_autumn: 118, sheep_autumn: 30, sheep_rest_spring: 22, sheep_rest_autumn: 22, cow_autumn: 40, rock_moss_winter: 50, stump_winter: 38, log_mushroom_winter: 34, flowers_wild_winter: 30, flowers_meadow_winter: 30, sheep_winter: 30, sheep_rest_winter: 22, cow_winter: 40,
  tree_cherry_summer: 100, flowers_wild_spring: 30, flowers_meadow_spring: 30, flowers_wild_autumn: 30, flowers_meadow_autumn: 30,
  sheep_spring: 30, cow_spring: 40, goat_spring: 30, rock_spring: 54 };
/* What a newer kind is drawn as while its own picture is missing, so a lost
   file shows the kind it was split from rather than the procedural tree. */
const SCENERY_FALLBACK = { goat: 'stump', cow: 'stump', tree_birch: 'tree_oak', tree_cherry: 'tree_oak', stump: 'bush', flowers_wild: 'bush', sheep: 'bush', sheep_rest: 'bush', sheep_lambs: 'sheep_rest' };

/* ---------- the time of year ----------

   The clock already drives the light, and a village that looks different at
   six in the evening from how it looked at noon is most of the reason this
   place feels like somewhere rather than a diagram. The calendar costs
   nothing to add and does the same job over a much longer arc: open the game
   in October and the island has turned.

   This is the one thing the big games in this category buy with machinery --
   an events team, a server, a season pass, a thing you will miss if you do
   not log in. The freshness is the point of all that and the machinery is
   not. Four palettes on a date are the same feeling with none of it, and they
   keep working with the aeroplane mode on and the company gone.

   Northern hemisphere, from the device's own clock. That is an assumption and
   it is wrong for about a tenth of the world, who will see the leaves turn in
   April. The alternatives are worse: asking is a question nobody wants on
   their first run, and guessing from a timezone is the same assumption with
   extra steps and a worse failure. It is a tint on the grass, not a mechanic,
   and nothing in the economy reads it.

   Tints, not new art. A season that needed four sets of everything would cost
   four times the download and would never be finished; a wash over the
   ground and the trees reads from the first second and is free. */
/* Three channels, because a finished village is almost entirely ROOF.

   Tinting the grass and the trees was the obvious half of this and on a bare
   island it reads beautifully. Measured on a village of fifty-two buildings
   -- which is what this looks like after a few hours, and the state most
   people will be in when a season turns -- the whole island shifted by two
   per cent between high summer and deep winter. There is no grass left to
   tint. So the buildings wear it too, and gently, because a roof is already
   a strong colour and the village must still look like itself in February.

   The order matters: the ground takes the most, the leaves take a lot in
   autumn because that is the whole of what autumn is, and the roofs take a
   little -- except in winter, where a pale wash over every roof IS the snow,
   and no new art was needed to get it. */
const SEASONS = [
  { key: 'spring', name: 'Spring', ground: 'rgba(138,216,104,.22)', leaf: 'rgba(164,232,118,.26)', build: 'rgba(158,220,128,.10)' },
  { key: 'summer', name: 'Summer', ground: 'rgba(250,198,66,.19)',  leaf: 'rgba(88,168,62,.17)',   build: 'rgba(255,206,86,.14)' },
  { key: 'autumn', name: 'Autumn', ground: 'rgba(206,132,56,.19)',  leaf: 'rgba(224,122,46,.36)',  build: 'rgba(222,134,52,.13)' },
  { key: 'winter', name: 'Winter', ground: 'rgba(226,239,251,.25)', leaf: 'rgba(222,236,251,.30)', build: 'rgba(228,240,252,.22)' },
];
/* Which one a month belongs to. Written out rather than worked out: a month
   is twelve cases and the arithmetic that collapses them is always slightly
   wrong at one end of the year. */
const SEASON_OF = [3, 3, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3];   // Jan..Dec
let seasonForced = null;                                  // the harness sets this
const seasonIdx = () => seasonForced != null
  ? ((seasonForced % SEASONS.length) + SEASONS.length) % SEASONS.length
  : SEASON_OF[new Date().getMonth()];
const season = () => SEASONS[seasonIdx()];

/* A sprite with the season washed over it, kept.

   source-atop on a canvas holding ONLY this picture, so the wash lands on the
   painted pixels and nowhere else -- done against the live canvas it would
   tint the sea, the shadow and everything else already drawn under it.

   Cached by picture and tint, because this is a per-frame draw and the answer
   changes four times a year. By picture, not by name: one name can have
   several pictures -- the cottage and statue looks, the beacon's stages --
   and a cache keyed by name handed every one of them whichever was tinted
   first. One canvas per picture per season actually
   reached: about twenty in a full village, and only for the sprites that are
   on the island. */
/* Rocks do not change colour in October, and neither does a dirt path or a
   stone statue -- they take the building wash, which is slight, rather than
   the leaf one. */
const SEASON_LEAF = new Set(['tree_pine', 'tree_spruce', 'tree_oak', 'tree_willow', 'tree_poplar', 'tree_cherry', 'tree_birch', 'bush', 'bush_hydrangea', 'flowers_wild', 'flowers_meadow']);
const seasonSkins = new WeakMap();      // picture -> (tint -> canvas)
function seasonSkin(im, key) {
  const sea = season();
  const tint = key === 'ground' ? sea.ground : SEASON_LEAF.has(key) ? sea.leaf : sea.build;
  if (!tint) return im;
  let skins = seasonSkins.get(im);
  if (!skins) seasonSkins.set(im, skins = new Map());
  const hit = skins.get(tint);
  if (hit) return hit;
  const w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
  if (!w || !h) return im;
  let cv;
  try {
    cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const c = cv.getContext('2d');
    c.drawImage(im, 0, 0);
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = tint;
    c.fillRect(0, 0, w, h);
  } catch (e) { return im; }      // out of memory, or a tainted canvas: no season rather than no village
  skins.set(tint, cv);
  return cv;
}


/* A second picture for the kinds that repeat, chosen by tile below the given
   share. About a third of the pines are drawn as the spruce: the pines are two
   thirds of the island's trees, and one picture twenty times over read as a
   stamp (on the island as it is, 7 of the 21). Only the picture changes -- the
   tile is still a pine, or a rock, to everything else. */
const SCENERY_ALT = { tree_pine: ['tree_spruce', 0.5], rock: ['rock_moss', 0.5], bush: ['bush_hydrangea', 0.5], flowers_wild: ['flowers_meadow', 0.5], tree_oak: ['tree_willow', 0.35], tree_birch: ['tree_poplar', 0.4], goat: ['cow', 0.45], stump: ['log_mushroom', 0.45], sheep_rest: ['sheep_lambs', 0.45] };
/* The small scenery is one tile of each kind -- the island is fixed, see the
   bands in the generator -- so a share is all or nothing: the goat's tile hashes
   to .98 and the cow never came. Those tiles change with the calendar instead,
   which is what lambs and hives and mushrooms (and snowmen) do anyway; the
   bush is a hawthorn in blossom in spring rather than in berry. */
const SEASON_ALT = { sheep_rest: { spring: 'sheep_lambs' }, flowers_wild: { summer: 'skeps' },
  bush: { spring: 'bush_spring', summer: 'bush_hydrangea', autumn: 'log_mushroom', winter: 'snowman' }, goat: { autumn: 'cow', winter: 'cow' } };
/* And the trees, which the wash alone left green under a pale tint all winter
   and only a little orange in October. Keyed by the picture already chosen
   rather than by the tile, so a spruce stays a spruce in the snow; a picture
   with no look for the season keeps the wash. In spring the leafy trees are
   in fresh yellow-green with catkins, the evergreens bright at every tip,
   and the moss rock in primroses and fiddleheads. The evergreens keep their
   needles in autumn, with blown leaves round their feet. */
const SEASON_LOOK = {
  tree_oak: { spring: 'tree_oak_spring', autumn: 'tree_oak_autumn', winter: 'tree_oak_winter' },
  tree_birch: { spring: 'tree_birch_spring', autumn: 'tree_birch_autumn', winter: 'tree_birch_winter' },
  tree_willow: { spring: 'tree_willow_spring', autumn: 'tree_willow_autumn', winter: 'tree_willow_winter' },
  tree_poplar: { spring: 'tree_poplar_spring', autumn: 'tree_poplar_autumn', winter: 'tree_poplar_winter' },
  tree_cherry: { summer: 'tree_cherry_summer', autumn: 'tree_cherry_autumn', winter: 'tree_cherry_winter' },
  tree_pine: { spring: 'tree_pine_spring', autumn: 'tree_pine_autumn', winter: 'tree_pine_winter' }, tree_spruce: { spring: 'tree_spruce_spring', autumn: 'tree_spruce_autumn', winter: 'tree_spruce_winter' },
  /* the ground cover too: snow on the stones and stumps (and fallen leaves
     on the rocks, the stump and the log in autumn), and the wildflowers
     go round the year -- daffodils and bluebells, the summer meadow, asters
     and heather, then the two that do flower in the snow. The cherry is in
     blossom in spring only, and in fruit by summer. */
  rock: { spring: 'rock_spring', autumn: 'rock_autumn', winter: 'rock_winter' }, rock_moss: { spring: 'rock_moss_spring', autumn: 'rock_moss_autumn', winter: 'rock_moss_winter' },
  stump: { spring: 'stump_spring', autumn: 'stump_autumn', winter: 'stump_winter' }, log_mushroom: { spring: 'log_mushroom_spring', autumn: 'log_mushroom_autumn', winter: 'log_mushroom_winter' },
  flowers_wild: { spring: 'flowers_wild_spring', autumn: 'flowers_wild_autumn', winter: 'flowers_wild_winter' },
  flowers_meadow: { spring: 'flowers_meadow_spring', autumn: 'flowers_meadow_autumn', winter: 'flowers_meadow_winter' },
  /* and the animals left out in it: the flock and the cow (the goat is the cow
     by then) in thick coats with snow on their backs, and the whole flock
     and the cow with fallen leaves in their coats in autumn, and the sheep
     (standing and lying down), the cow and the goat in daisy-and-primrose
     garlands in spring */
  sheep: { spring: 'sheep_spring', autumn: 'sheep_autumn', winter: 'sheep_winter' }, sheep_rest: { spring: 'sheep_rest_spring', autumn: 'sheep_rest_autumn', winter: 'sheep_rest_winter' },
  cow: { spring: 'cow_spring', autumn: 'cow_autumn', winter: 'cow_winter' }, goat: { spring: 'goat_spring' } };
function drawScenery(o) {
  const p = tileToWorld(o.c, o.r), s2 = o.s;
  let kind = artFor(o.kind) || !SCENERY_FALLBACK[o.kind] ? o.kind : SCENERY_FALLBACK[o.kind];
  const alt = SCENERY_ALT[kind], now = (SEASON_ALT[kind] || {})[season().key];
  if (now && artFor(now)) kind = now;
  else if (alt && hash(o.c * 5 + 1, o.r * 3 + 7) < alt[1] && artFor(alt[0])) kind = alt[0];
  const look = (SEASON_LOOK[kind] || {})[season().key];
  if (look && artFor(look)) kind = look;
  const art = artFor(kind);
  if (art) {
    const hgt = (SCENERY_H[kind] || 90) * s2, wid = art.width * (hgt / art.height);
    g.save();
    g.fillStyle = 'rgba(10,18,8,.30)';
    g.beginPath(); g.ellipse(p.x, p.y + 3, wid * 0.30, wid * 0.15, 0, 0, 7); g.fill();
    g.drawImage(SEASON_LEAF.has(kind) ? seasonSkin(art, kind) : art,
      p.x - wid / 2, p.y - hgt, wid, hgt);                  // anchored bottom-centre
    g.restore();
    return;
  }
  g.save();
  g.fillStyle = 'rgba(10,18,8,.30)';
  g.beginPath(); g.ellipse(p.x, p.y + 4, 20 * s2, 9 * s2, 0, 0, 7); g.fill();
  if (o.rock) {
    g.fillStyle = '#7d7a72';
    g.beginPath(); g.moveTo(p.x - 20 * s2, p.y + 3); g.lineTo(p.x - 7 * s2, p.y - 18 * s2);
    g.lineTo(p.x + 12 * s2, p.y - 14 * s2); g.lineTo(p.x + 20 * s2, p.y + 3); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.16)';
    g.beginPath(); g.moveTo(p.x - 7 * s2, p.y - 18 * s2); g.lineTo(p.x + 12 * s2, p.y - 14 * s2); g.lineTo(p.x + 2 * s2, p.y - 6 * s2); g.closePath(); g.fill();
  } else {
    g.strokeStyle = '#54341c'; g.lineWidth = 7 * s2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x, p.y - 26 * s2); g.stroke();
    const tiers = [[30, 20], [24, 34], [17, 46]];
    for (let i = 0; i < tiers.length; i++) {
      const [rw, ry] = tiers[i];
      g.fillStyle = `hsl(${104 + o.f * 12}, 38%, ${20 + i * 5}%)`;
      g.beginPath(); g.moveTo(p.x, p.y - (ry + 20) * s2);
      g.lineTo(p.x + rw * s2, p.y - ry * s2); g.lineTo(p.x - rw * s2, p.y - ry * s2); g.closePath(); g.fill();
    }
  }
  g.restore();
}
/* Villager height in world px. Set against the painted buildings rather than
   the tile: a villager should stand about as tall as a cottage doorway, which
   is roughly a third of the cottage itself. The procedural buildings this
   started with were much smaller, so 46 read fine then and looks like a mouse
   next to the art. */
const VILLAGER_H = 60;
/* Which of the three figures a villager is drawn as.

   They were handed out at random and kept for life, which put axes in the wheat
   and a woman with a basket of vegetables at the lumber camp. The art is
   role-specific -- one carries an axe over his shoulder, one a basket of
   produce -- so a village where the sprite matches the job can be read at a
   glance: axes at the camps, field hands among the crops.

   Food work draws on two of them rather than one. Mapping each job to a single
   figure made a food-heavy village -- which is most of them, since it makes
   food two to three times faster than wood -- into a crowd of identical men,
   and retired the only woman in the game to the ranks of the unemployed. A
   basket of vegetables belongs in a field. Off duty they are whoever they
   happen to be. */
function villagerArt(v) {
  const p = v.job == null ? null : byId(v.job);
  const b = p && B(p.key);
  if (b && b.makes) {
    /* Before the wood rule, because the market makes wood -- its trickle is
       what the trader turns over -- and so its one hand walked the stalls
       with a felling axe on his shoulder. He carries a crate of goods. */
    if (p.key === 'market' && artFor(TRADER)) return TRADER;
    // the mill makes food too, so it is asked for before the field hands
    if (p.key === 'mill' && artFor(MILLER)) return MILLER;
    if (b.makes.wood !== undefined) return 'villager_woodcutter';
    /* Stone has a figure of its own: a pick over the shoulder and an apron
       grey with dust. The quarry drew on the food workers until it had one,
       so a basket of vegetables went to work cutting rock. Off duty she
       is whoever the pool says, as everyone else is -- the pool is left at
       three, because each villager's look is picked from its length. */
    if (b.makes.stone !== undefined && artFor(STONECUTTER)) return STONECUTTER;
    return (v.k % 2) ? 'villager_basket' : 'villager_farmer';
  }
  return VILLAGERS[v.k % VILLAGERS.length];
}
/* Up go the umbrellas once the rain has properly started, each villager keeping
   the colour of their own, and down again as it stops. */
const UMBRELLA = ['#c8473c', '#3f74b5', '#e0a93a', '#4f9a62', '#8a57a8', '#e07a9a'];
let umbrellasDrawn = 0;
// one path for canopy and pole, one fill and one stroke: a full village is a lot of umbrellas
function drawUmbrella(v, bob, k) {
  const r = VILLAGER_H * 0.52 * k, x = v.x, top = v.y - VILLAGER_H - 13 - bob;
  g.fillStyle = UMBRELLA[Math.abs(Math.floor(v.seed * 97)) % UMBRELLA.length];
  g.strokeStyle = 'rgba(30,24,20,.65)'; g.lineWidth = 2.5; g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(x - r, top + r * 0.28);
  g.quadraticCurveTo(x - r * 0.85, top - r * 0.62, x, top - r * 0.66);
  g.quadraticCurveTo(x + r * 0.85, top - r * 0.62, x + r, top + r * 0.28);
  // the scalloped hem between the ribs
  for (let i = 1; i >= -1; i -= 0.5) g.quadraticCurveTo(x + (i + 0.25) * r * 0.8, top + r * 0.02, x + i * r * 0.8 - (i === -1 ? r * 0.2 : 0), top + r * 0.28);
  g.closePath();
  g.moveTo(x, top + r * 0.1); g.lineTo(x, v.y - VILLAGER_H * 0.45 - bob);
  g.fill();
  if (camScale() >= 0.8) g.stroke();     // too small to see from further out, and that is when there are most of them
  umbrellasDrawn++;
}
/* Winter's snowmen: four of them on open ground nearest the hall, on tiles picked
   by the same sort of hash as the scenery so they stay put from one day to the
   next, and moving on only if something gets built where they stand. */
const SNOWMEN = 4, SNOWMAN_SCARF = ['#c8473c', '#3f74b5', '#4f9a62', '#e0a93a'];
function seasonTiles(occ, count, salt, inFront = 0) {
  const h = hallOf(), L = landBounds(), out = [], taken = new Set(SCENERY.map(o => o.c + ',' + o.r)),
    tall = new Set(SCENERY.filter(o => o.kind.startsWith('tree')).map(o => o.c + ',' + o.r));
  if (!h) return out;
  for (let c = L.lo; c <= L.hi; c++) for (let r = L.lo; r <= L.hi; r++) {
    const key = c + ',' + r;
    if (occ.has(key) || taken.has(key) || rnd(c * 37 + r * 101, salt) < (inFront ? 0.15 : 0.55)) continue;   // the view-clear test thins them enough already
    // nothing standing nearer the viewer, for anything whose light is drawn over everything
    let hidden = false;
    for (let dc = 0; dc <= inFront && !hidden; dc++) for (let dr = 0; dr <= inFront; dr++) {
      const f = (c + dc) + ',' + (r + dr);
      if (occ.has(f) || tall.has(f)) { hidden = true; break; }
    }
    if (hidden) continue;
    out.push({ c, r, d: (c - h.c) * (c - h.c) + (r - h.r) * (r - h.r) });
  }
  return out.sort((a, b) => a.d - b.d || a.c - b.c).slice(0, count);
}
/* And autumn's pumpkins, carved and set out on the open ground the same way. The
   faces are dark by day; after dark they are lit, over the night's tint with
   the other lights. */
const PUMPKINS = 5, PUMPKIN_R = 20;
let pumpkinTiles = [];
function pumpkinFace(x, y) {
  const R = PUMPKIN_R;
  g.beginPath();
  for (const d of [-1, 1]) { g.moveTo(x + d * R * 0.42, y - R * 0.5); g.lineTo(x + d * R * 0.62, y - R * 0.12); g.lineTo(x + d * R * 0.2, y - R * 0.12); g.closePath(); }
  g.moveTo(x - R * 0.62, y + R * 0.14); g.quadraticCurveTo(x, y + R * 0.95, x + R * 0.62, y + R * 0.14); g.quadraticCurveTo(x, y + R * 0.42, x - R * 0.62, y + R * 0.14);
  g.fill();
}
function drawPumpkin(o) {
  const { x, y: gy } = tileToWorld(o.c, o.r), R = PUMPKIN_R, y = gy - R * 0.72;
  g.fillStyle = 'rgba(30,20,10,.3)'; g.beginPath(); g.ellipse(x, gy + 2, R * 1.2, R * 0.45, 0, 0, 7); g.fill();
  g.fillStyle = '#5d7a2e'; g.beginPath(); g.roundRect(x - 3, y - R * 1.1, 7, R * 0.5, 2); g.fill();
  g.fillStyle = '#df7a1f'; g.strokeStyle = 'rgba(110,50,10,.8)'; g.lineWidth = 2;
  g.beginPath();
  for (const [dx, rx] of [[-0.55, 0.62], [0.55, 0.62], [0, 0.72]]) { g.moveTo(x + (dx + rx) * R, y); g.ellipse(x + dx * R, y, rx * R, R * 0.8, 0, 0, 7); }
  g.fill(); g.stroke();
  g.fillStyle = '#3b2010'; pumpkinFace(x, y);
}
function drawPumpkinLights() {
  const k = Math.min(1, (sky().night - 0.3) / 0.2);
  if (k <= 0 || season().key !== 'autumn') return;
  const t = reduceMotion ? 0 : Date.now() / 1000;
  g.save();
  pumpkinTiles.forEach((o, i) => {
    const { x, y: gy } = tileToWorld(o.c, o.r), y = gy - PUMPKIN_R * 0.72;
    g.globalAlpha = k * (0.85 + 0.15 * Math.sin(t * 8 + i * 2.2) * Math.sin(t * 5.1 + i));
    const halo = g.createRadialGradient(x, y, 0, x, y, PUMPKIN_R * 3);
    halo.addColorStop(0, 'rgba(255,170,70,.45)'); halo.addColorStop(1, 'rgba(255,150,50,0)');
    g.fillStyle = halo; g.beginPath(); g.arc(x, y, PUMPKIN_R * 3, 0, 7); g.fill();
    g.fillStyle = '#ffd66b'; pumpkinFace(x, y);
  });
  g.restore();
}
function drawSnowman(o, i) {
  const { x, y } = tileToWorld(o.c, o.r);
  g.save(); g.translate(x, y);
  g.fillStyle = 'rgba(40,60,90,.22)'; g.beginPath(); g.ellipse(0, 3, 24, 10, 0, 0, 7); g.fill();
  g.fillStyle = '#f6f9fc'; g.strokeStyle = 'rgba(90,120,160,.55)'; g.lineWidth = 2;
  g.beginPath(); g.arc(0, -16, 19, 0, 7); g.moveTo(14, -46); g.arc(0, -46, 14, 0, 7); g.moveTo(10, -68); g.arc(0, -68, 10, 0, 7);
  g.fill(); g.stroke();
  g.fillStyle = SNOWMAN_SCARF[i % SNOWMAN_SCARF.length];
  g.beginPath(); g.roundRect(-12, -60, 24, 6, 3); g.roundRect(4, -58, 6, 16, 3); g.fill();
  g.fillStyle = '#2b2622';
  g.beginPath(); g.moveTo(-1.5, -71); g.arc(-4, -71, 1.8, 0, 7); g.moveTo(5.8, -71); g.arc(4, -71, 1.8, 0, 7);
  g.moveTo(1.8, -47); g.arc(0, -47, 1.8, 0, 7); g.moveTo(1.8, -38); g.arc(0, -38, 1.8, 0, 7);
  g.rect(-10, -80, 20, 3); g.rect(-6.5, -91, 13, 11);
  g.fill();
  g.fillStyle = '#e8842c'; g.beginPath(); g.moveTo(0, -69); g.lineTo(13, -66); g.lineTo(0, -64); g.closePath(); g.fill();
  g.restore();
}
function drawVillager(v) {
  const key = villagerArt(v);
  /* Far from where he is going, and nothing holding him there.

     "Nothing holding him" used to be written as `v.wait <= 0`, and wait is not
     a property of walking at all: it belongs to the idle drift, which sets it
     on arrival before choosing somewhere new to stand, and counts it down
     only in the idle branch. A villager who takes a job keeps whatever wait he
     happened to have for ever, because nothing outside that branch ever
     touches it -- and a new villager is born with up to two seconds of it.

     So the one test standing between the walk animation and the people doing
     the walking was a timer that, for them, never moves. Measured on a working
     village: not one villager in 3,600 frames had wait at or below zero, so
     the bob and the lean below were dead for every worker in the game. The
     only villagers who ever rocked were the idle ones drifting between
     buildings.

     Said as what it means instead. The idle drift is the only state that parks
     somebody at a distance from his target; a worker walking to a post or to a
     store is always moving, and one standing AT his post is within ARRIVE of
     it and fails the distance test on its own. */
  const moving = Math.hypot(v.tx - v.x, v.ty - v.y) > ARRIVE
    && !(v.st === 'idle' && v.wait > 0);
  /* The painted cycle where there is one. Six frames to the stride, picked
     by where in that stride he is -- so the frame changes with the ground
     covered rather than with the clock, and the feet do not skate. */
  const set = walkFrames(key);
  const cycle = set && moving && !reduceMotion;
  const im = set
    ? set[cycle ? Math.floor(v.ph / (Math.PI * 2) * WALK_STEPS) % WALK_STEPS : WALK_STAND]
    : artFor(key);
  const HGT = VILLAGER_H;
  /* A walk cycle out of one standing drawing.

     There are no legs to move -- the art is a single cut-out figure -- so the
     walk is carried by the whole body, the way a flipbook does it. The phase
     runs a footfall every PI and everything hangs off where in that step he
     is: nought at CONTACT, when the foot lands and the body is at its lowest,
     one at PASSING, when it swings under him and he is at his tallest.

       lift      a small rise at passing and a dip at contact, once per
                 step. SMALL. This was seven and a half per cent of his
                 height and it read as hopping, because a big vertical is
                 what a jump is and a walk is a horizontal act with a
                 wobble on top. Two and a half per cent, on a squared sine
                 so it eases through the dip rather than bouncing off it --
                 an absolute sine has a cusp at the bottom, and a cusp is a
                 landing
       squash    wider and shorter at contact where the weight lands,
                 narrower and taller at passing. Halved along with the
                 lift: squash is the cue that says weight is being TAKEN,
                 but stacked on a big rise it just adds to the bounce
       rock      tipping over whichever foot is planted, and it alternates
                 EVERY STEP. It used to run at half the step rate -- one
                 roll per two strides -- which is a wallow rather than a
                 walk, and was the other half of why this looked wrong
       pitch     leaning into the direction of travel, which is what tells
                 you somebody is walking rather than standing and bouncing

     Both feet never leave the ground, because that is the whole difference
     between a walk and a jump -- so the shadow stays exactly where it is
     and exactly the size it is. Shrinking it with the rise was arguing the
     opposite. */
  /* The faked walk is the UNDERSTUDY. With painted frames the lift, the
     squash and the rock all stand down: the drawing is already doing them,
     and doing both is a villager bouncing on top of his own footsteps. */
  const anim = moving && !reduceMotion && !set;
  const sn = anim ? Math.sin(v.ph) : 0;               // sign alternates each step
  const t = sn * sn;                                  // 0 contact, 1 passing, smooth through both
  const bob = t * HGT * 0.025;
  const sy = anim ? 1 + (t - 0.5) * 0.035 : 1;
  const sx = anim ? 1 - (t - 0.5) * 0.03 : 1;
  const lean = anim ? sn * 0.035 + 0.05 * v.face : 0;
  g.save();
  g.fillStyle = 'rgba(10,18,8,.34)';
  g.beginPath(); g.ellipse(v.x, v.y + 2, HGT * 0.24, HGT * 0.11, 0, 0, 7); g.fill();
  /* Whose card is open. On the ground rather than over their head, because a
     marker above a villager is a marker lost behind whatever building they
     happen to be standing in front of. */
  if (who != null && v.seed === who) {
    g.strokeStyle = '#9fe86b'; g.lineWidth = 2.5;
    g.beginPath(); g.ellipse(v.x, v.y + 2, HGT * 0.3, HGT * 0.14, 0, 0, 7); g.stroke();
  }
  if (ready(im)) {
    const w = im.width * (HGT / im.height);
    g.translate(v.x, v.y); g.rotate(lean); g.scale(v.face * sx, sy);
    /* Divided by the squash so the FEET sit on the ground and the body
       compresses upward from them -- scaled about the origin, which is where
       he is standing, a bob applied after the scale would lift him off it. */
    g.drawImage(im, -w / 2, -HGT - bob / sy, w, HGT);
  } else {                                   // sprite not decoded yet
    g.fillStyle = '#c9b089'; g.beginPath(); g.arc(v.x, v.y - HGT * 0.75, 6, 0, 7); g.fill();
    g.fillStyle = '#5a6f8a'; g.fillRect(v.x - 5, v.y - HGT * 0.6, 10, HGT * 0.6);
  }
  g.restore();
  const wet = rainNow(), brolly = wet > 0.3 ? Math.min(1, (wet - 0.3) / 0.2) : 0;
  if (brolly > 0) drawUmbrella(v, bob, brolly);
  /* What they are carrying, drawn OUTSIDE the mirrored transform so the icon
     does not flip when a villager turns round. */
  if (v.carry) {
    const y = v.y - HGT - 13 - bob - brolly * 34;        // carried goods ride the bob, not the air above it, and clear an umbrella
    g.save();
    g.fillStyle = 'rgba(14,22,12,.72)';
    g.beginPath(); g.roundRect(v.x - 15, y - 12, 30, 24, 12); g.fill();
    g.font = '17px Segoe UI, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(RES_ICON[v.carry.k], v.x, y + 1);
    g.restore();
  }
}
/* Draws the painted sprite when it has loaded, and the procedural building when
   it has not -- so the village still works before the art arrives, and while it
   is still decoding on a cold start. */
/* Where a building's painting sits in the world, or null when it has none.
   One definition for drawing it and for tapping it. */
/* How far up a building has risen. Only the FIRST time: an upgrade put the
   hall back to a third of its size and grew it again, so for the length of
   the work the village's biggest building looked demolished -- a small hall
   sitting in the middle of its own full-size shadow. An upgrade keeps the
   building standing and shows the scaffold. */
const growOf = p => established(p) ? 1 : 0.35 + 0.65 * Math.max(0, Math.min(1, p.t));
/* Snow on the roofs. A pale wash over every roof was all winter had, and it
   reads as a grey village rather than a snowed-on one; the houses -- the
   commonest building by far -- the hall at each of its stages, the
   storehouses, mills, market stalls, lumber camps, wells, farms and quarries
   -- every building with a look of its own -- have their own painting with
   the snow lying on them, and so does every decoration out in the cold:
   hedges, fences, benches, lamps, statues, flowerbeds and banners, and
   the old stones, orchard, cottage and wreck found on claimed land. The
   beacon too, at each of its five stages: each winter stage is fitted into
   the summer set's shared frame (art/PROMPTS.md 165), so it rises the same.
   Painted to the summer one's frame, but a curl of smoke or a run of icicles
   moves the top of the trim by a few per cent, so it stands on the
   summer picture's base: the front corner is found from the summer picture
   and the winter one is hung from there. Not washed, either: the snow is
   the winter. */
const WINTER_LOOKS = new Set([...LOOKS.house, 'hall', 'hall_2', 'hall_3', ...LOOKS.store,
  ...LOOKS.mill, ...LOOKS.market, ...LOOKS.lumber, ...LOOKS.well, ...LOOKS.farm, ...LOOKS.quarry,
  ...LOOKS.hedge, ...LOOKS.fence, ...LOOKS.bench, ...LOOKS.lamp,
  ...LOOKS.statue, ...LOOKS.flowers, ...LOOKS.banner, ...FINDS.slice(1)]);
/* Autumn the same way, for the looks painted so far: leaves on the roofs and
   along the walls, the creeper turned red, and the harvest -- pumpkins,
   sacks, sheaves -- stacked by the doors (art/PROMPTS.md 173). Hung from the
   summer picture's base like the snow. Every decoration has its own too: turned
   leaves, hips and haws, leaves drifted against the rails and the plinths,
   pumpkins by the scarecrow (177, 178) -- and so do the finds (179) and
   each stage of the beacon (180). */
const AUTUMN_LOOKS = new Set([...LOOKS.house, 'hall', 'hall_2', 'hall_3', ...LOOKS.store, ...LOOKS.mill, ...LOOKS.market, ...LOOKS.lumber, ...LOOKS.well, ...LOOKS.farm, ...LOOKS.quarry,
  ...LOOKS.hedge, ...LOOKS.fence, ...LOOKS.bench, ...LOOKS.lamp,
  ...LOOKS.statue, ...LOOKS.flowers, ...LOOKS.banner, ...FINDS.slice(1)]);
/* And spring on the buildings: tulips and daffodils in the window boxes and
   by the doors, primroses and bluebells at the foot, blossom petals on the
   roofs, the fields ploughed and sown (art/PROMPTS.md 181). The decorations,
   the finds and the beacon too: new leaves and blossom, daffodils, primroses
   and bluebells at the foot, fresh ivy up the posts and the stones (182).
   The orchard took three goes (183). */
const SPRING_LOOKS = new Set([...LOOKS.house, 'hall', 'hall_2', 'hall_3', ...LOOKS.store, ...LOOKS.mill, ...LOOKS.market, ...LOOKS.lumber, ...LOOKS.well, ...LOOKS.farm, ...LOOKS.quarry,
  ...LOOKS.hedge, ...LOOKS.fence, ...LOOKS.bench, ...LOOKS.lamp,
  ...LOOKS.statue, ...LOOKS.flowers, ...LOOKS.banner, ...FINDS.slice(1)]);
function winterArt(p) {
  if (season().key === 'spring') {
    if (p.key === BEACON)
      return beaconSet() ? artFor(BEACON + '_stage' + Math.min(BEACON_STAGES, Math.max(1, p.lvl | 0)) + '_spring') : null;
    const look = lookOf(p);
    return SPRING_LOOKS.has(look) ? artFor(look + '_spring') : null;
  }
  if (season().key === 'autumn') {
    if (p.key === BEACON)
      return beaconSet() ? artFor(BEACON + '_stage' + Math.min(BEACON_STAGES, Math.max(1, p.lvl | 0)) + '_autumn') : null;
    const look = lookOf(p);
    return AUTUMN_LOOKS.has(look) ? artFor(look + '_autumn') : null;
  }
  if (season().key !== 'winter') return null;
  if (p.key === BEACON)
    return beaconSet() ? artFor(BEACON + '_stage' + Math.min(BEACON_STAGES, Math.max(1, p.lvl | 0)) + '_winter') : null;
  const look = lookOf(p);
  return WINTER_LOOKS.has(look) ? artFor(look + '_winter') : null;
}
function artRect(p) {
  const b = B(p.key), base = buildingArt(p), snow = base && winterArt(p), art = snow || base;
  /* A find is a decoration for charm and nothing else: it stands on a 2x2
     plot like a farm, so it is fitted to its plot like one. */
  if (!art || (isDecor(p.key) && !isFound(p.key))) return null;
  const a = tileToWorld(p.c, p.r), d = tileToWorld(p.c + b.w - 1, p.r + b.h - 1);
  const cx = (a.x + d.x) / 2, cy = (a.y + d.y) / 2;
  const grow = growOf(p);
  const f = ART_FIT[lookOf(p)] || ART_FIT[p.key] || FIT_DEF;
  const fw = (b.w + b.h) * TW / 2;          // width of the plot's diamond
  const wid = fw * f.w * grow;
  const hgt = art.height * (wid / art.width);
  // the plot's near vertex: where the front corner of the building lands
  const ny = cy + (b.w + b.h) * TH / 4;
  const below = (1 - f.ay) * base.height * (wid / base.width);   // front corner to the bottom of the base
  return { art, snow: !!snow, cx, cy, fw, ny, wid, hgt, left: cx - f.ax * wid, top: ny + below - hgt,
    baseTop: ny + below - base.height * (wid / base.width), baseH: base.height * (wid / base.width) };
}
/* Lit windows after dark (art/PROMPTS.md 184). Each <look>_glow is only the
   light: the last frame of a clip of the summer picture in which the lamps
   come on inside, minus its first frame, so it is the summer picture's own
   size and lines up with it pixel for pixel. Painted in the building pass, in
   depth order, so a house in front still hides the windows behind it; the
   night wash then dims it a little, as it does the lamps' posts. The seasonal
   pictures hang from the summer one's base at its width, so the glow is laid
   on the summer frame whatever is drawn. */
const GLOW_LOOKS = new Set([...LOOKS.house, 'hall', 'hall_2', 'hall_3',
  'store', 'store_granary', 'store_barn', 'store_tithe', 'store_cellar',
  'mill', 'mill_post', 'mill_smock', 'mill_water', 'mill_tower', 'mill_cider',
  'market', 'market_hall', 'lumber_cabin', 'lumber_saw',
  'find_ruin']);   // somebody keeps a fire in the ruin's old hearth (PROMPTS 188)
for (const look of GLOW_LOOKS) artFor(look + '_glow');
/* The beacon by stage: only the two tall ones, 4 and 5, have windows to light
   (5 its lamp too). The stumps of 2 and 3 came out of the clip misplaced and
   with a door flung open, and at that height nobody misses them. */
const BEACON_GLOW_FROM = 4;
function glowKey(p) {
  if (p.key === BEACON) {
    const st = Math.min(BEACON_STAGES, Math.max(1, p.lvl | 0));
    // not "_stage<n>_glow": a _stage key is a frame of the beacon's set to the art checks
    return st >= BEACON_GLOW_FROM ? BEACON + '_glow' + st : null;
  }
  const look = lookOf(p);
  return GLOW_LOOKS.has(look) ? look + '_glow' : null;
}
for (let i = BEACON_GLOW_FROM; i <= BEACON_STAGES; i++) artFor(BEACON + '_glow' + i);
/* Smoke from the chimneys: a thin thread of puffs from the top of each stack,
   thickest in winter, a wisp on a summer's evening. Where each chimney is, as
   a share of the summer picture. The baker and the potter have smoke painted
   into their pictures already, and the oak has no chimney to smoke. */
const CHIMNEY = {
  house: [0.84, 0.11], house_stone: [0.84, 0.12], house_thatch: [0.81, 0.09], house_fisher: [0.85, 0.11],
  house_weaver: [0.84, 0.085], house_bee: [0.72, 0.04],
  hall: [0.26, 0.23], hall_2: [0.245, 0.33], hall_3: [0.27, 0.33],
};
const SMOKE = { winter: 1, autumn: 0.8, spring: 0.5, summer: 0.3 };
const SMOKE_PUFFS = 5;
let smokeDrawn = 0;
function drawSmoke() {
  smokeDrawn = 0;
  if (reduceMotion) return;
  const k = SMOKE[season().key] || 0, t = Date.now() / 1000;
  g.save();
  for (const q of placed) {
    const at = q.t >= 1 && CHIMNEY[lookOf(q)];
    if (!at) continue;
    const ar = artRect(q);
    if (!ar) continue;
    const x = ar.left + at[0] * ar.wid, y = ar.baseTop + at[1] * ar.baseH, u = ar.wid / 240;
    for (let i = 0; i < SMOKE_PUFFS; i++) {
      const ph = frac(t / 4.5 + i / SMOKE_PUFFS + q.id * 0.37);
      const al = 0.62 * k * (1 - ph) * Math.min(1, ph * 7);
      g.fillStyle = 'rgba(232,232,236,' + al.toFixed(3) + ')';
      g.beginPath();
      g.arc(x + (ph * ph * 70 + Math.sin(ph * 7 + q.id) * 10) * u, y - ph * 190 * u, (13 + ph * 36) * u, 0, 7);
      g.fill();
      smokeDrawn++;
    }
  }
  g.restore();
}
function drawWindowGlow(p, ar) {
  if (p.t < 1) return;
  const n = sky().night;
  if (n < 0.04) return;
  const key = glowKey(p);
  if (!key) return;
  const glow = artFor(key);
  if (!glow) return;
  /* Added on rather than laid over, so the panes shine rather than just turn
     yellow -- and in one pass: it is the one extra image a lit building
     costs, and the frame-cost check allows exactly that. */
  paintGlow(glow, ar.left, ar.baseTop, ar.wid, ar.baseH, n);
}
/* How many lit windows and lanterns this frame drew: each is one image over
   the thing it lights, and the frame-cost check allows exactly these. */
let glowsDrawn = 0;
function paintGlow(glow, x, y, w, h, n) {
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha *= Math.min(1, n * 1.4);
  g.drawImage(glow, x, y, w, h);
  g.restore();
  glowsDrawn++;
}
function drawBuilding(p, alpha, tint) {
  const b = B(p.key);
  const a = tileToWorld(p.c, p.r), d = tileToWorld(p.c + b.w - 1, p.r + b.h - 1);
  const cx = (a.x + d.x) / 2, cy = (a.y + d.y) / 2;
  const ar = tint ? null : artRect(p);        // tint is only used by the ghost preview
  if (ar) {
    const { art, snow, fw, ny, wid, hgt, left, top } = ar;
    g.save(); g.globalAlpha = alpha;
    g.fillStyle = 'rgba(10,18,8,.30)';
    g.beginPath(); g.ellipse(cx, cy, fw * 0.40, fw * 0.20, 0, 0, 7); g.fill();
    g.drawImage(snow ? art : seasonSkin(art, p.key), left, top, wid, hgt);
    drawWindowGlow(p, ar);
    if (p.t < 1) {                          // scaffold while it goes up
      g.strokeStyle = 'rgba(230,200,140,.85)'; g.lineWidth = 3; g.setLineDash([8, 6]);
      g.beginPath(); g.moveTo(cx - fw * 0.4, ny); g.lineTo(cx, ny - hgt * 0.5); g.lineTo(cx + fw * 0.4, ny); g.stroke();
      g.setLineDash([]);
    }
    g.restore();
    return;
  }
  const halfW = (b.w + b.h) * TW / 4.6, halfH = (b.w + b.h) * TH / 4.6;
  const grow = growOf(p);                            // rises as it is built
  const wallH = (b.wallH || 62) * grow;

  g.save(); g.globalAlpha = alpha;
  // footprint shadow
  g.fillStyle = 'rgba(10,18,8,.32)';
  g.beginPath(); g.ellipse(cx, cy + halfH * 0.32, halfW * 0.95, halfH * 0.62, 0, 0, 7); g.fill();

  if (b.key === 'farm') {                              // tilled rows, no walls
    g.fillStyle = tint || '#6b4a28';
    g.beginPath(); g.moveTo(cx, cy - halfH); g.lineTo(cx + halfW, cy); g.lineTo(cx, cy + halfH); g.lineTo(cx - halfW, cy); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(40,26,12,.55)'; g.lineWidth = 3;
    for (let i = -3; i <= 3; i++) {
      g.beginPath(); g.moveTo(cx - halfW * 0.8 + i * 9, cy + i * 5); g.lineTo(cx + halfW * 0.2 + i * 9, cy + halfH * 0.5 + i * 5); g.stroke();
    }
    if (p.t >= 1) { g.fillStyle = '#c9a83e';
      for (let i = 0; i < 7; i++) { const t = i / 6;
        g.beginPath(); g.arc(cx - halfW * 0.6 + t * halfW * 1.2, cy - halfH * 0.1 + Math.sin(t * 6) * 8, 5, 0, 7); g.fill(); } }
  } else {
    const top = cy - wallH;
    const lit = tint || '#8a6740', dark = tint || '#63482a';
    // left wall (lit) and right wall (shaded)
    g.fillStyle = lit;
    g.beginPath(); g.moveTo(cx - halfW, cy); g.lineTo(cx, cy + halfH); g.lineTo(cx, cy + halfH - wallH); g.lineTo(cx - halfW, cy - wallH); g.closePath(); g.fill();
    g.fillStyle = dark;
    g.beginPath(); g.moveTo(cx + halfW, cy); g.lineTo(cx, cy + halfH); g.lineTo(cx, cy + halfH - wallH); g.lineTo(cx + halfW, cy - wallH); g.closePath(); g.fill();
    // timber framing: uprights following the iso rake of each wall
    if (p.t >= 1) {
      g.strokeStyle = 'rgba(48,32,16,.55)'; g.lineWidth = 3;
      for (let i = 1; i < 4; i++) {
        const t1 = i / 4;
        const lx = cx - halfW + halfW * t1, ly = cy + halfH * t1;
        g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx, ly - wallH); g.stroke();
        const rx = cx + halfW - halfW * t1, ry = cy + halfH * t1;
        g.beginPath(); g.moveTo(rx, ry); g.lineTo(rx, ry - wallH); g.stroke();
      }
      // door on the left face, a shuttered window on the right
      const dh = wallH * 0.52, dw = halfW * 0.24;
      g.fillStyle = '#3b2716';
      g.beginPath(); g.moveTo(cx - halfW * 0.46, cy + halfH * 0.46);
      g.lineTo(cx - halfW * 0.46 + dw, cy + halfH * 0.46 + dw * halfH / halfW);
      g.lineTo(cx - halfW * 0.46 + dw, cy + halfH * 0.46 + dw * halfH / halfW - dh);
      g.lineTo(cx - halfW * 0.46, cy + halfH * 0.46 - dh); g.closePath(); g.fill();
      g.fillStyle = '#e8c477';
      const wy = cy + halfH * 0.30 - wallH * 0.62, ww = halfW * 0.20;
      g.beginPath(); g.moveTo(cx + halfW * 0.40, wy);
      g.lineTo(cx + halfW * 0.40 + ww, wy - ww * halfH / halfW);
      g.lineTo(cx + halfW * 0.40 + ww, wy - ww * halfH / halfW + wallH * 0.26);
      g.lineTo(cx + halfW * 0.40, wy + wallH * 0.26); g.closePath(); g.fill();
    }
    // pitched roof: two slopes off a ridge, so it is not a flat lozenge
    const ridge = top - halfH * 0.95, eave = top + halfH * 0.10;
    g.fillStyle = '#a4482e';
    g.beginPath(); g.moveTo(cx, ridge); g.lineTo(cx - halfW * 1.06, eave);
    g.lineTo(cx, eave + halfH * 0.92); g.closePath(); g.fill();
    g.fillStyle = '#7d3320';
    g.beginPath(); g.moveTo(cx, ridge); g.lineTo(cx + halfW * 1.06, eave);
    g.lineTo(cx, eave + halfH * 0.92); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(38,16,8,.55)'; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(cx, ridge); g.lineTo(cx - halfW * 1.06, eave); g.lineTo(cx, eave + halfH * 0.92);
    g.lineTo(cx + halfW * 1.06, eave); g.closePath(); g.stroke();
    g.strokeStyle = 'rgba(255,214,180,.30)'; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(cx, ridge); g.lineTo(cx, eave + halfH * 0.92); g.stroke();
    // chimney + smoke once it is working
    if (p.t >= 1 && b.key !== 'lumber') {
      const chx = cx + halfW * 0.42, chy = ridge + halfH * 0.30;
      g.fillStyle = '#6e6157'; g.fillRect(chx - 6, chy - 26, 13, 28);
      g.fillStyle = 'rgba(226,226,226,.34)';
      // held at fixed heights under reduced motion, so the chimney still reads as lit
      for (let i = 0; i < 3; i++) { const t2 = reduceMotion ? 0.15 + i * 0.3 : ((Date.now() / 900 + i * 0.33) % 1);
        g.beginPath(); g.arc(chx + Math.sin(t2 * 5 + i) * 7, chy - 30 - t2 * 40, 5 + t2 * 9, 0, 7); g.fill(); }
    }
    // log pile marks the lumber camp
    if (p.t >= 1 && b.key === 'lumber') {
      g.fillStyle = '#6b4a28';
      for (let i = 0; i < 3; i++) { g.beginPath();
        g.ellipse(cx - halfW * 0.55 + i * 13, cy + halfH * 0.30 - i * 5, 11, 6, 0, 0, 7); g.fill(); }
    }
  }
  // scaffold while building
  if (p.t < 1) {
    g.strokeStyle = 'rgba(230,200,140,.85)'; g.lineWidth = 3; g.setLineDash([8, 6]);
    g.beginPath(); g.moveTo(cx - halfW, cy); g.lineTo(cx, cy - halfH); g.lineTo(cx + halfW, cy); g.stroke();
    g.setLineDash([]);
  }
  g.restore();
}

/* Roughly where the top of a building is in world space, so a badge can sit
   above it. The art path knows its real height; the procedural one is measured
   from its wall height. */
// the top of the painting, from the same artRect the painting is drawn with
function topOf(p) {
  const R = artRect(p);
  if (R) return { x: R.cx, y: R.top };
  const b = B(p.key);
  const a = tileToWorld(p.c, p.r), d = tileToWorld(p.c + b.w - 1, p.r + b.h - 1);
  const cx = (a.x + d.x) / 2, cy = (a.y + d.y) / 2;
  return { x: cx, y: cy - (b.wallH || 62) - (b.w + b.h) * TH / 4 };
}
/* Badges are counter-scaled so they stay readable when the camera pulls back.
   Clamped, or at minimum zoom they swell over the buildings they label. */
/* Counter-scaled against the camera, and sized so the smallest badge text --
   19 of these units -- lands at TEXT_MIN on screen, the floor every HUD label
   is held to. It was held to nothing: "−63%" and "Lv 3" came out near 7 CSS
   pixels on a phone, the warnings a player most needs to read. */
const BADGE_TEXT_PX = 19;
const badgeScale = () => Math.max(0.55, Math.min(2, 1 / camScale())) * (TEXT_MIN / BADGE_TEXT_PX);

function drawStatus(p) {
  if (p.t < 1) return;
  const b = B(p.key);
  const hall = p.key === 'hall';
  const idle = b.jobs && !hall && workersAt(p.id) === 0;
  /* Empty for two very different reasons.

     Since the workforce learned to leave a post whose barn is full, a farm can
     stand empty because the village is short of people OR because the granary
     is at the ceiling and everyone sensibly went to cut wood. Both wore the same
     amber "!", so a player whose stores were full saw three alarmed farms and
     the obvious response -- build a house -- makes it worse.

     Resting is not a fault, so it does not get the alarm. */
  const resting = idle && !!b.makes && !hasRoomFor(Object.keys(b.makes)[0]);
  /* How much of this building the walk is taking, measured against the same
     building beside a store -- not its raw efficiency, which falls as a
     building improves and so flagged most of a finished village. */
  const reach = (!hall && b.makes && b.jobs && !idle) ? reachOf(p) : null;
  const far = reach !== null && reach < 0.5;
  const up = !idle && !far && canUpgrade(p);
  if (!hall && !idle && !far && !up) return;
  const t = topOf(p), s = badgeScale();
  const kind = (!hall && up) ? 'up' : far ? 'far' : hall ? 'hall' : resting ? 'rest' : 'idle';
  g.save(); g.font = 'bold 20px Segoe UI, sans-serif';
  const hw = kind === 'far' ? 30 : kind === 'hall' ? (g.measureText('Lv ' + hallLevel()).width + 22) / 2 + (up ? 30 : 0) : 17;
  g.restore();
  badgeQueue.push({ prio: BADGE_PRIO[kind], x: t.x, y: t.y - 14 * s, hw: hw * s, hh: 16 * s, paint: () => {
  g.save();
  g.translate(t.x, t.y - 14 * s); g.scale(s, s);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (!hall && up) {
    /* You can afford to improve this. Shown only when it is actually
       affordable, so the village points at what to do next instead of wearing
       a permanent row of level numbers. */
    g.fillStyle = 'rgba(24,52,20,.9)'; g.strokeStyle = 'rgba(150,232,110,.95)'; g.lineWidth = 2.5;
    g.beginPath(); g.roundRect(-17, -16, 34, 32, 16); g.fill(); g.stroke();
    g.font = 'bold 20px Segoe UI, sans-serif'; g.fillStyle = '#b6f58a';
    g.fillText('▲', 0, 1);
  } else if (far) {
    /* This building is losing more than half of itself to the walk. Amber
       rather than red: it is working, just badly, and the fix is a storehouse
       or a road. The figure is what it is LOSING, which is the thing worth
       acting on -- the old badge showed efficiency, so a well-placed level five
       farm and a stranded level one could wear the same number. */
    g.fillStyle = 'rgba(52,38,12,.9)'; g.strokeStyle = 'rgba(240,200,110,.95)'; g.lineWidth = 2.5;
    g.beginPath(); g.roundRect(-30, -16, 60, 32, 16); g.fill(); g.stroke();
    g.font = 'bold 19px Segoe UI, sans-serif'; g.fillStyle = '#ffd98a';
    g.fillText('−' + Math.round((1 - reach) * 100) + '%', 0, 1);
  } else if (hall) {
    const label = 'Lv ' + hallLevel();
    g.font = 'bold 20px Segoe UI, sans-serif';
    const w = g.measureText(label).width + 22;
    g.fillStyle = 'rgba(20,32,16,.86)'; g.strokeStyle = 'rgba(226,200,120,.9)'; g.lineWidth = 2;
    g.beginPath(); g.roundRect(-w / 2, -15, w, 30, 15); g.fill(); g.stroke();
    g.fillStyle = '#f0d894'; g.fillText(label, 0, 1);
    if (up) {
      /* A hall that can grow gets a tick beside its level, and it is the SAME
         tick a building wears on its own when it can be improved -- same
         meaning, so the same size. It was drawn at 15 of these units where
         every other badge glyph is 19 to 23, and because the badges are
         counter-scaled that lands it at 20.5 logical pixels: 7.5 CSS on a 375
         phone, against the 9.5 that TEXT_MIN works out to and that every other
         label in the game clears. The one glyph in the village that says "your
         hall can grow", which gates the land, the people and every build limit,
         was the smallest thing on the screen. The circle is matched to the
         height of the pill it hangs off, so what it reaches to is unchanged. */
      g.fillStyle = 'rgba(24,52,20,.92)'; g.strokeStyle = 'rgba(150,232,110,.95)'; g.lineWidth = 2;
      g.beginPath(); g.arc(w / 2 + 15, 0, 15, 0, 7); g.fill(); g.stroke();
      g.font = 'bold 20px Segoe UI, sans-serif'; g.fillStyle = '#b6f58a';
      g.fillText('▲', w / 2 + 15, 1);
    }
  } else if (resting) {
    /* Nowhere to put what it makes, so nobody is working it. A calm slate pill
       and a pause, because nothing is wrong: the village is doing the right
       thing and the answer is storage, not another house. Two drawn bars rather
       than a glyph -- the pause character is not in every font, and at this size
       a missing one is a box. */
    g.fillStyle = 'rgba(24,32,40,.9)'; g.strokeStyle = 'rgba(150,180,205,.85)'; g.lineWidth = 2.5;
    g.beginPath(); g.roundRect(-17, -16, 34, 32, 16); g.fill(); g.stroke();
    g.fillStyle = '#b6ccdd';
    g.beginPath(); g.roundRect(-7, -8, 5, 16, 2); g.fill();
    g.beginPath(); g.roundRect(2, -8, 5, 16, 2); g.fill();
  } else {
    /* A producer with nobody at it is the single most confusing state in the
       game, so it says so rather than quietly making nothing. Drawn as a plain
       glyph, not an emoji: at this size an emoji is a smudge, and it would be
       drawn in whatever colour happened to be current. */
    g.fillStyle = 'rgba(52,20,14,.9)'; g.strokeStyle = 'rgba(240,170,110,.95)'; g.lineWidth = 2.5;
    g.beginPath(); g.roundRect(-17, -16, 34, 32, 16); g.fill(); g.stroke();
    g.font = 'bold 23px Segoe UI, sans-serif'; g.fillStyle = '#ffca7a';
    g.fillText('!', 0, 1);
  }
  g.restore();
  } });
}
/* Badges are queued during the depth pass and drawn after it, most important
   first, skipping any that would land on one already drawn.

   A built-up island at phone zoom drew thirty-odd of them into the same rows:
   "−63%", "−65%", "−69%" and a carpet of ▲ printed over one another until
   none could be read, and a badge on a building behind was covered by the
   roof in front. The warnings are what the player must not miss, so they go
   down first and an upgrade tick gives way to them; zooming in spreads the
   village out and brings the others back. */
let badgeQueue = [], lastBadges = [];
const BADGE_PRIO = { hall: 0, idle: 1, far: 2, rest: 3, up: 4 };
function flushBadges() {
  const q = badgeQueue; badgeQueue = [];
  q.sort((a, b) => a.prio - b.prio);
  const kept = [];
  for (const b of q) {
    if (kept.some(k => Math.abs(k.x - b.x) < k.hw + b.hw && Math.abs(k.y - b.y) < k.hh + b.hh)) continue;
    kept.push(b); b.paint();
  }
  lastBadges = kept;
  return kept.length;
}

/* Decorations, drawn in code rather than from art. They are simple enough that
   a few shapes read cleanly, and unlike the buildings there is no silhouette to
   get wrong. Seeded off the tile so a flowerbed does not shimmer between
   frames. */
/* World height of each decoration at scale 1, for when art arrives. A path is
   not here: it is fitted to the tile diamond instead of standing on it. */
const DECOR_H = { fence: 42, flowers: 34, hedge: 48, bench: 40, lamp: 80, banner: 104, statue: 88,
  bench_rose: 56,     // looks taller than their kind: the bench stands under a rose arch
  bench_tree: 66,     // ... or rings an apple tree
  bench_swing: 58,    // ... or hangs from a frame
  bench_picnic: 44,   // ... or is a whole picnic table
  bench_campfire: 46, // ... or two logs round a fire
  hedge_topiary: 54,  // ... or carries clipped balls on top
  fence_picket: 46,   // ... or has taller pickets
  fence_rope: 50,     // ... or tall driftwood posts
  fence_iron: 50,     // ... or brick pillars
  hedge_lavender: 56,  // ... or flowers above its leaves
  flowers_cart: 42,   // ... or rides in a handcart
  flowers_sun: 58,    // ... or is sunflowers
  hedge_wild: 54 };   // ... or has grown shaggy
/* Where a pole stands across its picture, for the looks whose flag flies out
   to one side: centring the picture would plant the pole a third of a tile
   off its own square. Everything else stands on its middle. */
const DECOR_AX = { banner: 0.33, banner_pennant: 0.25, banner_windsock: 0.21, banner_bunting: 0.28, banner_kite: 0.28, lamp_ship: 0.61 };

/* The campfire bench's fire burns up after dark (art/PROMPTS.md 187): the same
   light-only overlay as the windows, on the summer picture's frame. */
const DECOR_GLOW = new Set(['bench_campfire']);
artFor('bench_campfire_glow');
function decorGlow(p, x, y, w, h) {
  if (!DECOR_GLOW.has(lookOf(p))) return;
  const n = sky().night;
  if (n < 0.04) return;
  const glow = artFor(lookOf(p) + '_glow');
  if (!glow) return;
  paintGlow(glow, x, y, w, h, n);
  if (lookOf(p) === 'bench_campfire') drawSparks(x + w * FIRE_AT[0], y + h * FIRE_AT[1], w / 90, n, p.id);
}
/* Sparks going up from the campfire after dark, where its light is brightest
   in the glow picture. Each climbs, wavers and winks out. */
const FIRE_AT = [0.43, 0.6], SPARKS = 8;
function drawSparks(x, y, u, n, id) {
  if (reduceMotion) return;
  const t = Date.now() / 1000;
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < SPARKS; i++) {
    const cyc = 1.4 + rnd(i, 60) * 1.2, ph = frac(t / cyc + rnd(i, 61) + id * 0.13);
    const al = n * (1 - ph) * (0.7 + 0.3 * Math.sin(t * 17 + i * 3));
    g.fillStyle = 'rgba(255,' + Math.round(190 - ph * 110) + ',70,' + al.toFixed(3) + ')';
    g.beginPath();
    g.arc(x + (rnd(i, 62) - 0.5) * 22 * u + Math.sin(ph * 6 + i) * 9 * u, y - ph * 72 * u, (3.6 - 2 * ph) * u, 0, 7);
    g.fill();
  }
  g.restore();
}
function drawDecor(p, alpha) {
  const b = B(p.key), o = tileToWorld(p.c, p.r), n = hash(p.c * 13 + 7, p.r * 17 + 3);
  g.save();
  g.globalAlpha = alpha === undefined ? 1 : alpha;

  /* Painted art if it exists, the drawn version if not -- the same optional-art
     path the buildings use, so a decoration sprite can be dropped in later
     without touching this function again. */
  const art = buildingArt(p);
  if (art) {
    if (b.flat) {
      /* Forced to the tile's own diamond rather than to the art's aspect. The
         generated tile came back 1.83:1 instead of 2:1, and preserving that
         would leave every path tile 11% too tall and creeping over the row
         behind it. Squashing dirt by 9% is invisible; a misaligned grid is not. */
      const wid = TW * 1.02, hgt = TH * 1.02;
      g.drawImage(seasonSkin(art, p.key), o.x - wid / 2, o.y - hgt / 2, wid, hgt);
    } else {
      g.fillStyle = 'rgba(10,18,8,.28)';
      g.beginPath(); g.ellipse(o.x, o.y + 3, 24, 11, 0, 0, 7); g.fill();
      const hgt = DECOR_H[lookOf(p)] || DECOR_H[p.key] || 48, wid = art.width * (hgt / art.height);
      /* A snowed-on hedge, fence, lamp or statue is the summer one's width: the
         snow on top makes it a little taller, not the hedge any narrower. */
      const snow = winterArt(p), sh = snow ? wid * snow.height / snow.width : hgt;
      g.drawImage(snow || seasonSkin(art, p.key), o.x - wid * (DECOR_AX[lookOf(p)] || 0.5), o.y - sh, wid, sh);
      decorGlow(p, o.x - wid * (DECOR_AX[lookOf(p)] || 0.5), o.y - hgt, wid, hgt);
    }
    g.restore(); return;
  }

  if (p.key === 'path') {
    // painted onto the ground: a soft diamond, inset so neighbours run together
    tilePath(p.c, p.r);
    g.fillStyle = 'rgba(150,118,74,.85)'; g.fill();
    g.fillStyle = 'rgba(126,98,60,.55)';
    for (let i = 0; i < 4; i++) { const a = n * 7 + i * 1.7;
      g.beginPath(); g.ellipse(o.x + Math.cos(a) * 34, o.y + Math.sin(a) * 16, 7, 4, 0, 0, 7); g.fill(); }
    g.restore(); return;
  }
  const shade = () => { g.fillStyle = 'rgba(10,18,8,.28)';
    g.beginPath(); g.ellipse(o.x, o.y + 3, 26, 12, 0, 0, 7); g.fill(); };
  if (p.key === 'fence') {
    shade();
    g.strokeStyle = '#8a6438'; g.lineCap = 'round';
    // two posts on the tile's long axis, rails between, following the iso rake
    const dx = TW / 2 * 0.8, dy = TH / 2 * 0.8;
    g.lineWidth = 7;
    g.beginPath(); g.moveTo(o.x - dx, o.y + dy); g.lineTo(o.x - dx, o.y + dy - 26); g.stroke();
    g.beginPath(); g.moveTo(o.x + dx, o.y - dy); g.lineTo(o.x + dx, o.y - dy - 26); g.stroke();
    g.lineWidth = 5; g.strokeStyle = '#a37a48';
    for (const h2 of [10, 20]) { g.beginPath();
      g.moveTo(o.x - dx, o.y + dy - h2); g.lineTo(o.x + dx, o.y - dy - h2); g.stroke(); }
  } else if (p.key === 'flowers') {
    shade();
    g.fillStyle = '#4c7a35';
    g.beginPath(); g.ellipse(o.x, o.y, 30, 15, 0, 0, 7); g.fill();
    const cols = ['#e4574c', '#f0c04a', '#d97fc0', '#f2f0e4'];
    for (let i = 0; i < 9; i++) { const a = n * 11 + i * 0.9, r = 6 + (i % 3) * 7;
      g.fillStyle = cols[(i + Math.floor(n * 4)) % cols.length];
      g.beginPath(); g.arc(o.x + Math.cos(a) * r * 1.9, o.y + Math.sin(a) * r * 0.9 - 5, 4, 0, 7); g.fill(); }
  } else if (p.key === 'hedge') {
    shade();
    g.fillStyle = '#2f5a28';
    g.beginPath(); g.roundRect(o.x - 32, o.y - 30, 64, 34, 12); g.fill();
    g.fillStyle = '#3e7433';
    g.beginPath(); g.roundRect(o.x - 32, o.y - 34, 64, 24, 12); g.fill();
    g.fillStyle = 'rgba(150,200,120,.35)';
    g.beginPath(); g.ellipse(o.x - 10, o.y - 28, 16, 7, 0, 0, 7); g.fill();
  } else if (p.key === 'lamp') {
    shade();
    g.fillStyle = '#6a5a48';
    g.beginPath(); g.ellipse(o.x, o.y, 11, 5, 0, 0, 7); g.fill();
    g.strokeStyle = '#3f3830'; g.lineWidth = 6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(o.x, o.y - 2); g.lineTo(o.x, o.y - 52); g.stroke();
    const glow = reduceMotion ? 0.85 : 0.7 + 0.3 * Math.sin(Date.now() / 700 + n * 6);
    g.fillStyle = 'rgba(255,206,120,' + (0.20 * glow) + ')';
    g.beginPath(); g.arc(o.x, o.y - 58, 20, 0, 7); g.fill();
    g.fillStyle = '#ffd98a';
    g.beginPath(); g.roundRect(o.x - 8, o.y - 68, 16, 18, 4); g.fill();
    g.strokeStyle = '#3f3830'; g.lineWidth = 2.5;
    g.beginPath(); g.roundRect(o.x - 8, o.y - 68, 16, 18, 4); g.stroke();
  } else if (p.key === 'statue') {
    shade();
    g.fillStyle = '#8d8a82';                     // plinth
    g.beginPath(); g.ellipse(o.x, o.y - 4, 26, 13, 0, 0, 7); g.fill();
    g.fillStyle = '#9a978e';
    g.beginPath(); g.roundRect(o.x - 20, o.y - 20, 40, 18, 4); g.fill();
    g.fillStyle = '#b3b0a6';                     // figure
    g.beginPath(); g.roundRect(o.x - 10, o.y - 60, 20, 42, 8); g.fill();
    g.beginPath(); g.arc(o.x, o.y - 66, 10, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.30)';
    g.beginPath(); g.roundRect(o.x - 10, o.y - 60, 8, 42, 8); g.fill();
  }
  g.restore();
}
/* The landmarks found on claimed land are decorations for charm, but they
   stand on a 2x2 plot, so they are drawn the way a building is: scaled to
   the plot. Sent through drawDecor -- which draws a one-tile ornament 48
   high at the plot's first tile -- the first find to get its picture came
   out a quarter of its plot's width, sitting in the top corner. No find had
   ever been drawn before, so nothing had ever taken that path. */
const drawPlaced = (p, alpha, tint) => isDecor(p.key) && !isFound(p.key) ? drawDecor(p, alpha) : drawBuilding(p, alpha, tint);

/* Land you do not own yet: one dark wash over every unclaimed tile, built as a
   single path so it is one fill rather than a hundred and sixty. A rope line
   marks the frontier, which reads as a boundary rather than as a rendering
   fault. */
function drawFrontier() {
  if (landTier >= LAND_MAX) return;
  const L = landBounds();
  g.save();
  g.beginPath();
  for (let r = 0; r < GH; r++) for (let c = 0; c < GW; c++) {
    if (c >= L.lo && c <= L.hi && r >= L.lo && r <= L.hi) continue;
    const p2 = tileToWorld(c, r);
    g.moveTo(p2.x, p2.y - TH / 2); g.lineTo(p2.x + TW / 2, p2.y);
    g.lineTo(p2.x, p2.y + TH / 2); g.lineTo(p2.x - TW / 2, p2.y);
    g.closePath();
  }
  g.fillStyle = 'rgba(9,16,26,.52)'; g.fill();
  // the owned edge, traced round the four corners of the claim
  const a = tileToWorld(L.lo, L.lo), b = tileToWorld(L.hi, L.lo);
  const c2 = tileToWorld(L.hi, L.hi), d = tileToWorld(L.lo, L.hi);
  g.beginPath();
  g.moveTo(a.x, a.y - TH / 2); g.lineTo(b.x + TW / 2, b.y);
  g.lineTo(c2.x, c2.y + TH / 2); g.lineTo(d.x - TW / 2, d.y); g.closePath();
  g.strokeStyle = 'rgba(240,214,140,.60)'; g.lineWidth = 3; g.setLineDash([16, 12]);
  g.stroke(); g.setLineDash([]);
  g.restore();
}

let pendingGhost = null;              // the placement label, drawn last
function drawWorld() {
  pendingGhost = null;
  const occSet = occupied();          // scenery hides under buildings
  drawGround();
  // paths are painted ON the ground, so they go down before anything stands up
  for (const p of placed) if (B(p.key).flat) drawDecor(p, 1);
  /* Tap a well and you can see how far it reaches. The panel already says how
     many workplaces it lifts; this says WHICH, which is the part that tells you
     where to move it. */
  if (panel != null) {
    const wp = byId(panel);
    if (wp && B(wp.key).boost && established(wp)) drawWellReach(wp.c, wp.r, 0.8);
  }

  if (ghost && ghostKey()) {                            // placement preview
    const selKey = ghostKey(), b = B(selKey);
    for (let dc = 0; dc < b.w; dc++) for (let dr = 0; dr < b.h; dr++) {
      tilePath(ghost.c + dc, ghost.r + dr);
      g.fillStyle = ghost.ok ? 'rgba(120,230,120,.40)' : 'rgba(235,90,70,.40)';
      g.fill();
      /* Hatched when it cannot go there, not only red.

         Green for yes and red for no is the one pairing the most common colour
         blindness takes away. Measured on the island's own ground: the two
         fills sit 51 apart in perceived colour for normal vision, and 9.9 apart
         under deuteranopia -- roughly one man in twelve. Worse than the number
         sounds, because nobody sees the two side by side: the player sees ONE
         tile and has to decide what its colour means.

         Stripes carry the answer without colour at all, so the tile reads as
         blocked in greyscale, at night, and to anyone. */
      if (!ghost.ok) {
        const o = tileToWorld(ghost.c + dc, ghost.r + dr);
        g.save(); g.clip();
        g.strokeStyle = 'rgba(40,12,8,.55)'; g.lineWidth = 5;
        g.beginPath();
        for (let k = -TW; k <= TW; k += 18) {
          g.moveTo(o.x + k - TH, o.y - TH); g.lineTo(o.x + k + TH, o.y + TH);
        }
        g.stroke(); g.restore();
      }
    }
    /* fits, not ok: a tile that is legal but unaffordable still gets the preview
       and the label, because "you cannot pay for this yet" is worth saying and
       the red under it already says you cannot place it. A tile that is illegal
       -- off the land, under something else -- still gets nothing but the red,
       which needs no words and would otherwise flicker a pill under the finger
       across every unusable tile on the island. */
    if (ghost.fits) {
      // a well's reach, under the ghost, before it is paid for
      if (selKey === 'well') drawWellReach(ghost.c, ghost.r, 1);
      drawPlaced({ id: -1, key: selKey, c: ghost.c, r: ghost.r, t: 1, lvl: 1 }, 0.55);
      /* What this spot would actually be worth. Shown DURING placement, because
         telling the player afterwards is telling them too late. */
      /* The building being MOVED, if this is a move at all. Wanted here and
         again in the label below, so it is worked out once. */
      const from = moving != null ? byId(moving) : null;
      /* And at the level it IS, which for a move is not level one.

         probe describes the building this spot would hold, and it was written
         for a BUILD, where level one is exactly right -- that is what you get
         for your forty wood. Pointed at a building being moved it went on
         saying level one while the figure printed beside it, 'now', quoted the
         real level. The same building, on the same pill, at two levels.

         It reads as a punishment for moving anything you have invested in.
         Measured on a five-villager village, a level five farm with four
         hands carried to a spot exactly as good as the one it was on: the
         pill said '2.02/s here   ·   now 3.49', a 42% drop, for a move that
         changed nothing whatever. Walk the same farm up the levels and the
         left-hand figure never moves off 2.02 while the right-hand one climbs
         2.02, 2.48, 2.87, 3.20, 3.49 -- the gap is the whole of the
         improvement the player has paid for, quoted back to them as the cost
         of picking the building up.

         A new building is untouched: from is null, and level one is what it
         will be. */
      const probe = { id: -1, key: selKey, c: ghost.c, r: ghost.r, t: 1,
        lvl: from && from.key === selKey ? lvlOf(from) : 1 };
      /* The two rates rather than a percentage. The player is comparing spots,
         and "0.31/s here, 0.58 beside a store" answers that directly, where a
         percentage has to be decoded first -- and decoded wrongly, since the
         same percentage means different things at different levels. */
      const isWell = !!B(selKey).boost;
      /* Only something that PRODUCES gets a rate. reachOf returns 1 for a
         building with no output -- there is nothing to fall short of -- so
         moving a house put a green pill reading "0.00/s here" over it. */
      const makes = !!(b.makes && b.jobs);
      /* Anything that PRODUCES gets its rate, storage or not: a market makes wood
         as well as holding it, and moving one quoted nothing while its panel said
         0.56/s delivered. */
      const eff = (isWell || !makes) ? null : reachOf(probe);
      /* A storehouse has no reach figure and is not a well, so it never got a
         label at all -- and it is one of the two most expensive things in the
         tray. It gets one now when the only thing to say is the price. */
      const isCharm = !!B(selKey).charm && moving == null;
      if (eff !== null || isWell || isCharm || (selBuild && !affordable(selKey))) {
        const a = tileToWorld(ghost.c, ghost.r), d2 = tileToWorld(ghost.c + b.w - 1, ghost.r + b.h - 1);
        const cx = (a.x + d2.x) / 2, cy = (a.y + d2.y) / 2;
        const sc = badgeScale();
        /* Kept for AFTER the buildings are drawn. This label is the whole
           point of the placement preview, and it was being painted before the
           depth pass -- so choosing a spot behind the hall hid the one number
           the player was choosing by. */
        pendingGhost = () => {
        g.save();
        g.translate(cx, cy - 96 * sc); g.scale(sc, sc);
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = 'bold 22px Segoe UI, sans-serif';
        /* Only a NEW building needs hands to spare. Moving one takes its workers
           with it, and the label said "no one spare -- raise the town hall first"
           over a lumber camp being moved, in red, instead of the one number a
           move is for: what it would deliver there. */
        const empty = moving == null && noSpareHands(selKey);
        // a move keeps its workers; a new building gets whoever is free to take its posts
        const hands = Math.max(1, from ? workersAt(from.id) : handsFor(probe, 1));
        /* Cheaper than either of them, and it outranks both: this is what is
           stopping the tap from working right now.

           The label quoted a delivery rate for a mill the player could not buy
           -- a green pill promising 1.80/s, and then a buzz when they tapped.
           The claim panel has said "Need 🪵140 more" for a long time; the
           placement preview, which is where most of the buying happens, said
           nothing at all. Only for a BUILD: moving something already paid for
           costs nothing. */
        const cantAfford = selBuild && !affordable(selKey);
        let txt;
        const stuck = cantAfford ? blockedBy(B(selKey).cost) : null;
        if (stuck && hallFor(stuck[0]))
          txt = 'needs ' + RES_ICON[stuck[0]] + ' — a ' + BUILDINGS.find(b => b.makes && b.makes[stuck[0]]).name.toLowerCase()
            + ' comes with hall level ' + hallFor(stuck[0]);
        else if (cantAfford && overCaps(B(selKey).cost))
          txt = 'costs more than your stores hold — ' + (atLimit('store') ? 'needs a bigger storehouse' : 'needs another storehouse');
        else if (cantAfford) txt = 'need ' + shortText(B(selKey).cost) + ' more';
        else if (isWell) {
          /* A well already standing is a different question from one that is
             not there yet -- see wellMoveGain. */
          const mv = from && from.key === selKey ? from : null;
          const wg = mv ? wellMoveGain(mv, ghost.c, ghost.r) : wellGainAt(ghost.c, ghost.r, 1);
          const where = wg.n ? 'lifts ' + count(wg.n, 'workplace') : 'reaches no workplace';
          /* In reach of three sheds that nobody is working is not the same as
             in reach of nothing, and "+0.00/s" beside "lifts 3 workplaces"
             reads as broken rather than as the truth it is. */
          /* A move can cost, so its figure carries a sign, and a spot that
             reaches nothing still has to say what leaving costs. A new well
             can only ever add, so that half is left exactly as it was. */
          txt = mv
            ? where + '   ·   ' + (wg.gain > 0.005 ? '+' + wg.gain.toFixed(2) + '/s'
                : wg.gain < -0.005 ? '−' + (-wg.gain).toFixed(2) + '/s' : 'no change')
            : !wg.n ? 'reaches no workplace'
            : where + '   ·   '
              + (wg.gain > 0.005 ? '+' + wg.gain.toFixed(2) + '/s' : 'none of them worked yet');
        } else if (isCharm) {
          const add = usefulCharm(selKey), gain = decorGainCached(selKey, ghost.c, ghost.r);
          const working = placed.some(q => established(q) && B(q.key).makes && B(q.key).jobs && workersAt(q.id));
          txt = add <= 0 && gain <= 0.005 ? 'charm is full — this one is for the look'
            : (add > 0 ? '✨+' + add + ' charm   ·   ' : 'charm full   ·   ')
              + (gain > 0.005 ? '+' + gain.toFixed(2) + '/s delivered'
                : working ? 'too little to count yet' : 'nothing is being worked yet');
        /* With the price, because nothing else on the screen has it.

           The tray card swaps its price for "no spare" when nobody is free --
           the button cannot hold both -- and this pill was the only other
           thing drawn while a farm was being placed. Every string on the
           screen of a new player one tap from building one, read off the
           canvas: "no one spare — build a house first", "Farm / no spare",
           "Tap the same spot again to confirm". Not one of them said 45 wood,
           and the second tap spent it. The advice is right and stays first;
           the price follows it, because the player is about to pay it. */
        } else txt = empty ? 'no one spare — ' + remedy('people') + ' first   ·   '
            + Object.entries(B(selKey).cost).map(([k, v]) => RES_ICON[k] + v).join('  ')
          /* For the whole building, as its panel counts it -- the hands it would
             have times what each delivers. The label quoted one worker's share,
             so a lumber camp whose panel said "0.92/s delivered" was "now 0.46"
             here: the same camp, two numbers, a factor of two apart. */
          : (hands * deliveredOf(probe)).toFixed(2) + '/s here'
            + (from && from.key === selKey ? '   ·   now ' + (hands * deliveringNow(from)).toFixed(2)
              : eff > 0.85 ? '' : '   ·   best ' + (hands * bestDeliveredOf(probe)).toFixed(2));
        /* Two lines when one will not fit on the glass.

           Shifting keeps a label on the screen only while it is narrower than
           the screen. The longest ones now carry two clauses -- the reason and
           the price, "no one spare — build a house first · 🪵45" -- and at full
           zoom that ran from -59 to 1083 on a 1024 screen, cut at both ends,
           and the end that went was the price. Broken at the separator nearest
           the middle, so each line is a clause and not half of one. */
        const kk = sc * camScale(), room = (W - 20) / kk;
        let lines = [txt];
        if (g.measureText(txt).width + 26 > room) {
          const cuts = [];
          for (const sep of ['   ·   ', ' — ']) {
            let i = txt.indexOf(sep);
            while (i >= 0) { cuts.push([i, sep]); i = txt.indexOf(sep, i + 1); }
          }
          if (!cuts.length) for (let i = txt.indexOf(' '); i >= 0; i = txt.indexOf(' ', i + 1)) cuts.push([i, ' ']);
          if (cuts.length) {
            const [i, sep] = cuts.reduce((a, b) => Math.abs(b[0] - txt.length / 2) < Math.abs(a[0] - txt.length / 2) ? b : a);
            /* The dash stays at the end of the first line, where it reads as
               "and so"; the dot between two figures is only a gap. */
            lines = [txt.slice(0, i) + (sep === ' — ' ? ' —' : ''), txt.slice(i + sep.length)];
          }
        }
        const w2 = Math.max(...lines.map(l => g.measureText(l).width)) + 26;
        const ph = lines.length > 1 ? 60 : 34;
        /* Held on the screen. Everything else drawn in the world is allowed to
           wander off it -- a badge belongs to a building, and a building the
           camera is not looking at has no business painting over one it is.
           This label belongs to the player's FINGER, which is by definition on
           the screen, and it carries the only number the placement decision is
           made on.

           Measured at full zoom: a statue's label spanning -213 to 406, so
           '✨+45 char' was simply gone, and a well's running to 1198 on a 1024
           screen. Worse upwards, where it does not clip but disappears: with
           the tile near the top of the view the whole pill sat at -274, off the
           screen entirely, and the player was choosing a forty wood spot with
           nothing to read at all.

           Shifted rather than shrunk, because the text is already as short as
           it can be said. It is pushed the least it can be and only at the
           edges; in the middle of the screen, which is where a finger usually
           is, nothing moves. Downwards it stops at the tabs rather than at the
           bottom of the screen, since the tray is open whenever this is drawn. */
        {
          const at = camProject(cx, cy - 96 * sc), k = sc * camScale();
          const hw = w2 / 2 * k, hh = ph / 2 * k, pad = 10;
          const tabs = tabRects()[0];
          const loX = hw + pad, hiX = W - hw - pad;
          const loY = hudTop() + hh + pad, hiY = tabs.y - tabs.h / 2 - hh - pad;
          const x0 = loX > hiX ? W / 2 : Math.max(loX, Math.min(hiX, at.x));
          const y0 = loY > hiY ? (loY + hiY) / 2 : Math.max(loY, Math.min(hiY, at.y));
          g.translate((x0 - at.x) / k, (y0 - at.y) / k);
        }
        g.fillStyle = 'rgba(14,22,12,.9)';
        const good = isWell ? wellGainAt(ghost.c, ghost.r, 1).n > 0
          : isCharm ? (usefulCharm(selKey) > 0 || selKey === 'path') : !empty && eff > 0.66;
        g.strokeStyle = cantAfford ? '#e59a86' : (isWell || isCharm) ? (good ? '#9fe86b' : '#e59a86')
          : empty ? '#e59a86' : eff > 0.66 ? '#9fe86b' : eff > 0.42 ? '#e8c98a' : '#e59a86';
        g.lineWidth = 2.5;
        g.beginPath(); g.roundRect(-w2 / 2, -ph / 2, w2, ph, 17); g.fill(); g.stroke();
        g.fillStyle = cantAfford ? '#f0a583' : (isWell || isCharm) ? (good ? '#b6f58a' : '#f0a583')
          : empty ? '#f0a583' : eff > 0.66 ? '#b6f58a' : eff > 0.42 ? '#f0d89a' : '#f0a583';
        lines.forEach((l, i) => g.fillText(l, 0, 1 + (i - (lines.length - 1) / 2) * 26));
        g.restore();
        };
      }
    }
  }
  /* One depth-sorted pass over everything that stands on the ground, so a
     villager can walk behind a house and in front of the next one. */
  const ents = [];
  for (const p of placed) { const b = B(p.key);
    if (b.flat) continue;                      // already drawn with the ground
    ents.push({ y: tileToWorld(p.c + b.w - 1, p.r + b.h - 1).y,
      d: () => { drawPlaced(p, 1); if (!b.decor) drawStatus(p); } }); }
  for (const o of SCENERY) { if (occSet.has(o.c + ',' + o.r)) continue;
    ents.push({ y: tileToWorld(o.c, o.r).y, d: () => drawScenery(o) }); }
  for (const v of villagers) ents.push({ y: v.y, d: () => drawVillager(v) });
  if (season().key === 'winter') seasonTiles(occSet, SNOWMEN, 90).forEach((o, i) => ents.push({ y: tileToWorld(o.c, o.r).y, d: () => drawSnowman(o, i) }));
  pumpkinTiles = season().key === 'autumn' ? seasonTiles(occSet, PUMPKINS, 91, 3) : [];
  for (const o of pumpkinTiles) ents.push({ y: tileToWorld(o.c, o.r).y, d: () => drawPumpkin(o) });
  ents.sort((a, b2) => a.y - b2.y);
  badgeQueue = [];
  for (const e of ents) e.d();
  /* The badges are QUEUED here and painted in draw(), after the night wash.
     See the note beside that call: they are information, not scenery. */
  /* The well's reach again, outline only, so the far side of the circle is not
     lost behind whatever is standing in it. */
  /* OVER the village, not on the ground under it.

     Drawn under the buildings first, which is where a line describing the
     ground belongs, and in a village of fifty-two buildings not one pixel of
     it could be seen -- the island is roofs. The village that most needs to
     be told where its people walk is exactly the village dense enough to hide
     the answer. The well's reach is drawn twice for this reason and the note
     below says so; a route has the same problem and takes the same answer. */
  drawRoutes();
  const ringOf = p => p && B(p.key).boost ? p : null;
  const ring = ringOf(panel != null ? byId(panel) : null)
    || (ghost && ghost.ok && ghostKey() === 'well' ? { c: ghost.c, r: ghost.r } : null);
  if (ring) {
    const bw = B('well'), w = tileToWorld(ring.c + (bw.w - 1) / 2, ring.r + (bw.h - 1) / 2);
    const rx = bw.boostR * TW / Math.SQRT2, ry = bw.boostR * TH / Math.SQRT2;
    g.save();
    g.setLineDash([14, 10]);
    /* Dark underneath, light on top. Half of this circle crosses roofs and the
       other half crosses grass, and a single colour disappears into one of
       them whichever one you pick. */
    g.strokeStyle = 'rgba(10,24,34,.55)'; g.lineWidth = 6;
    g.beginPath(); g.ellipse(w.x, w.y, rx, ry, 0, 0, 7); g.stroke();
    g.strokeStyle = 'rgba(196,238,255,.95)'; g.lineWidth = 2.5;
    g.beginPath(); g.ellipse(w.x, w.y, rx, ry, 0, 0, 7); g.stroke();
    g.restore();
  }
  drawSmoke();
  // after the entities, so the trees out in the wild are dimmed with the ground
  // they stand on rather than glowing against it
  drawFrontier();
  /* The spot being chosen, outlined over everything standing in front of it.
     The preview fill is painted on the ground, so a spot behind the hall or a
     lumber camp was entirely hidden -- a well's reach circle and label floating
     over a building, and no sign of which tile they belonged to. Outline only,
     so what is in front is still seen; dashed when the spot is refused, so it
     does not rest on colour. */
  const footprint = (c, r, b) => {
    const top = tileToWorld(c, r), rt = tileToWorld(c + b.w - 1, r);
    const bot = tileToWorld(c + b.w - 1, r + b.h - 1), lf = tileToWorld(c, r + b.h - 1);
    g.beginPath();
    g.moveTo(top.x, top.y - TH / 2); g.lineTo(rt.x + TW / 2, rt.y);
    g.lineTo(bot.x, bot.y + TH / 2); g.lineTo(lf.x - TW / 2, lf.y); g.closePath();
  };
  /* And which building is being moved. "Tap where it should go" named nothing:
     the building looked like every other one until a destination was tapped. */
  /* The building whose panel is open. Nothing on the map said which one it
     was: in a row of farms and camps, or with a mill tucked behind the hall,
     the panel described a building the player could not find. Solid, where a
     move is dashed. */
  const panelP = panel != null && moving == null ? byId(panel) : null;
  if (panelP) {
    const b = B(panelP.key);
    g.save(); g.lineJoin = 'round';
    footprint(panelP.c, panelP.r, b); g.strokeStyle = 'rgba(10,16,8,.65)'; g.lineWidth = 7; g.stroke();
    footprint(panelP.c, panelP.r, b); g.strokeStyle = '#f4ecd0'; g.lineWidth = 3.5; g.stroke();
    g.restore();
  }
  const movingP = moving != null ? byId(moving) : null;
  if (movingP) {
    const b = B(movingP.key);
    g.save(); g.lineJoin = 'round'; g.setLineDash([6, 8]);
    footprint(movingP.c, movingP.r, b); g.strokeStyle = 'rgba(10,16,8,.65)'; g.lineWidth = 7; g.stroke();
    footprint(movingP.c, movingP.r, b); g.strokeStyle = '#f4ecd0'; g.lineWidth = 3.5; g.stroke();
    g.restore();
  }
  if (ghost && ghostKey()) {
    const b = B(ghostKey());
    g.save();
    g.lineJoin = 'round';
    if (!ghost.ok) g.setLineDash([14, 10]);
    footprint(ghost.c, ghost.r, b); g.strokeStyle = 'rgba(10,16,8,.65)'; g.lineWidth = 7; g.stroke();
    footprint(ghost.c, ghost.r, b); g.strokeStyle = ghost.ok ? '#b6f58a' : '#f0a583'; g.lineWidth = 3.5; g.stroke();
    g.restore();
  }
  /* Last of all. It was drawn before the frontier and the delivery pops, so
     "+8" floated over the first word of "lifts 3 workplaces", and a label
     hanging out over unclaimed ground was dimmed along with it -- the one
     number the player is choosing a spot by, under passing decoration. */
  if (pendingGhost) pendingGhost();
}

/* ---------- HUD ---------- */
/* The bar shows what the hall has unlocked, and nothing else. The town hall is
   never on it -- there is exactly one and it is founded for you. */
let barMode = 'build';                 // 'build' | 'decor' | 'orders'
/* Each tray on its own, because the band they share has to be tall enough for
   the biggest of them whichever one is showing. */
const buildList = () => BUILDINGS.filter(b => b.key !== 'hall' && !b.decor && unlocked(b.key));
const decorList = () => BUILDINGS.filter(b => b.decor && !b.found);
const barList = () => barMode === 'decor' ? decorList()
  : barMode === 'orders' ? [] : buildList();

/* ---------- the strip, and how many rows of cards it needs ----------

   The strip divides a fixed 1024 between however many cards are on it, and
   for most of this game's life that was seven kinds of building. Every figure
   ever written down about a card was measured against seven: a 118.4 pixel
   budget for a price, "no spare" at 103.1, a shortfall at 99.2. The beacon
   made eight kinds, a second market makes five trade stalls, and nobody
   measured again.

   At eight kinds, on a 360 phone, a build card is 40.8 CSS pixels across
   against the 44 both platforms ask of anything you tap, and the beacon's own
   shortfall -- the widest string the tray ever prints -- fills it from border
   to border. At five stalls "to the neighbours" is 205 logical pixels in a
   170 pixel stall, and that is the line a FINISHED village reads on every
   card on the board.

   None of it was ever going to be found by looking. A price that runs out of
   its button lands on the GAP between buttons, so no two words overlap and
   nothing goes near the edge of the screen; and the widest strings only exist
   in a village with everything unlocked, which is a state no drawing check
   had ever put the orders tray into.

   So the strip takes as many ROWS as it needs, and how many it needs is
   MEASURED rather than chosen: one while one will do, another as soon as a
   card would be too small to hit or too small for its own words. Nine kinds
   over two rows gives a card 191 logical pixels where one row gives 102.

   The band is the same height in every mode and every tray fills it, because
   the tabs sit on top of it -- a tab that jumps out from under the finger
   pressing it gets pressed twice -- and because three short stalls under the
   tabs with a hole beneath them is not a layout.

   The guess here is deliberately the conservative half of the job: it works
   out the widest thing a card MIGHT have to print, at the smallest size and
   the heaviest face that row can come out in. cardSweep in tools/fuzz.js then
   reads what the cards actually drew and measures that against the cards they
   were drawn into, so anything wider than the lists below expect is reported
   rather than hidden. */
const STRIP_H = 118, STRIP_PAD = 8, STRIP_GAP = 22, STRIP_MAX = 3;
const CARD_W = 190, STALL_W = 250;
/* The smallest a row started at `px` can come out at. fitLines will not shrink
   past TEXT_MIN, and it will not GROW -- so a row started under the floor
   never shrinks at all and its start size IS its floor. A fit test that
   assumed everything could get down to 26 would call a row that fits at 26
   and spills at 20 a fit. */
const lowPx = px => Math.min(px, TEXT_MIN);
/* Everything a build or decoration card may have to print: the text, the room
   that row is given, the smallest it can come out at, and whether it is bold.
   Shortfalls rather than prices -- a shortfall carries a minus the price does
   not, and is the wider of the two. */
function cardStrings(b, u) {
  const small = lowPx(20 * u);
  const out = [[b.short || b.name, 12 * u, small, true]];
  const cost = Object.entries(b.cost || {});
  for (const [k, v] of cost) out.push(['−' + (RES_ICON[k] || '') + v, 14 * u, small, false]);
  if (b.charm && cost.length) {
    const [k, v] = cost[cost.length - 1];
    out.push([(RES_ICON[k] || '') + v + ' ✨' + b.charm, 14 * u, small, false]);
  }
  /* The two lines that replace a price, which are the same on every card. */
  out.push(['no spare', 14 * u, small, false], ['99/99 🔒', 14 * u, small, false], ['hall ' + HALL_MAX + ' 🔒', 14 * u, small, false], ['bigger 📦', 14 * u, small, false]);
  return out;
}
/* And everything a trade stall may have to print. The numbers on one are
   bounded by the barns, so the ceiling is the thing to measure. */
function stallStrings(u) {
  const big = Math.max(9999, ...RES.map(k => Math.ceil(caps[k] || 0)));
  const out = [];
  for (const verb of ['give', 'get'])
    for (const k of Object.keys(RES_ICON))
      out.push([verb + '  ' + RES_ICON[k] + ' ' + big, 18 * u, lowPx(26 * u), true]);
  for (const t of ['to the neighbours', 'tap to trade', 'best rate', 'no room',
                   'next trader', 'empty stall'])
    out.push([t, 16 * u, lowPx(20 * u), false]);
  out.push(['need ' + RES_ICON.wood + big, 16 * u, lowPx(20 * u), false]);
  return out;
}
/* Does a strip of these cards fit on `rows` rows?

   Only things a row count can CHANGE belong in here. The card's height is
   118 units whatever happens, and asking whether that clears the touch floor
   -- which it does not at a HUD scale of 1, where 118 logical is under the
   128 the floor is written in -- made this answer no for every row count
   there is. The strip then fell through to its maximum and drew three rows
   on a desktop window where two were plenty: a quarter of the screen given
   to a tray, on the one shape I had not looked at.

   The height is not a thing wrapping can fix, and on the shapes this app
   ships in -- portrait, where the HUD scale is 1.185 or more -- a card is 140
   logical pixels tall and clears the floor anyway. roomSweep measures the
   card that actually got drawn, on those shapes, and is where that question
   belongs. */
function stripFits(cards, rows, u, cap) {
  const n = cards.length;
  const per = Math.ceil(n / rows), pad = STRIP_PAD * u;
  const w = Math.min(cap * u, (W - pad * (per + 1)) / per);
  if (w < TOUCH_MIN) return false;
  const keep = g.font;
  let ok = true;
  for (const rowsOf of cards) {
    for (const [t, inset, px, bold] of rowsOf) {
      g.font = `${bold ? 'bold ' : ''}${Math.round(px)}px Segoe UI, sans-serif`;
      if (g.measureText(t).width > w - inset) { ok = false; break; }
    }
    if (!ok) break;
  }
  g.font = keep;
  return ok;
}
/* Measured once per shape of strip: it is a few dozen measureText calls, and
   the rects are asked for several times a frame. */
const stripCache = new Map();
function rowsNeeded(id, cards, cap) {
  const u = US(), n = cards.length;
  if (n < 2) return 1;
  const key = id + '|' + n + '|' + u.toFixed(3);
  const hit = stripCache.get(key);
  if (hit !== undefined) return hit;
  let rows = STRIP_MAX;
  for (let i = 1; i < STRIP_MAX; i++) if (stripFits(cards, i, u, cap)) { rows = i; break; }
  stripCache.set(key, rows);
  return rows;
}
function stripRows() {
  const u = US();
  const build = buildList(), decor = decorList(), stalls = Math.max(1, orderSlots());
  return Math.max(
    rowsNeeded('build|' + build.map(b => b.key).join(','), build.map(b => cardStrings(b, u)), CARD_W),
    rowsNeeded('decor|' + decor.map(b => b.key).join(','), decor.map(b => cardStrings(b, u)), CARD_W),
    rowsNeeded('stall|' + RES.map(k => Math.round(caps[k] || 0)).join(','),
      Array.from({ length: stalls }, () => stallStrings(u)), STALL_W));
}
const stripH = () => { const u = US(), r = stripRows(); return r * STRIP_H * u + (r - 1) * STRIP_PAD * u; };
const stripBot = () => hudBot() - STRIP_GAP * US();
const stripTop = () => stripBot() - stripH();
/* One layout for all three trays: n cards at most `cap` units wide, wrapped
   into the band in index order so a progression still reads left to right and
   then down. The FIRST card is on the top row, which is the one the tabs are
   anchored to; a short last row is centred like a full one. */
function stripLay(n, cap) {
  const u = US(), h = STRIP_H * u, pad = STRIP_PAD * u;
  const rows = Math.max(1, Math.min(stripRows(), n));
  const per = Math.ceil(n / rows);
  const w = Math.min(cap * u, (W - pad * (per + 1)) / per);
  const bot = stripBot() - h / 2;
  return Array.from({ length: n }, (_, i) => {
    const row = Math.floor(i / per), col = i - row * per;
    const inRow = Math.min(per, n - row * per);
    const total = inRow * w + (inRow - 1) * pad;
    return { x: (W - total) / 2 + w / 2 + col * (w + pad),
             y: bot - (rows - 1 - row) * (h + pad), w, h };
  });
}

/* Order cards occupy the same strip as the build bar, laid out on the same
   geometry so the two cannot drift apart. */
/* Every stall on the board, filled or not. The cards are laid out for all of
   them, so drawing only the filled ones put a lone offer in the left-hand
   third of the screen beside an empty row. */
function orderSlotRects() {
  return stripLay(Math.max(1, orderSlots()), STALL_W);
}
function orderRects() {
  seatOrders();
  const slots = orderSlotRects();
  return orders.filter(o => o.slot < slots.length).map(o => ({ o, ...slots[o.slot] }));
}
// seconds until the next trader arrives, or null when the board is full
const nextTraderIn = () => orders.length >= orderSlots() ? null : Math.max(0, orderEvery() - orderT);

/* The two tabs above the bar. One definition, used to draw and to hit-test. */
/* On the BAND rather than on the first card. They used to hang off
   barRects()[0], with a fallback for the orders tray because that one has no
   cards at all -- harmless while every tray was one row of 118, and a tab
   that slid 169 pixels down the screen the moment the build tray needed two. */
function tabRects() {
  const u = US();
  const w = 152 * u, h = 46 * u, pad = 8 * u;
  const y = stripTop() - h / 2 - 10 * u;
  const step = w + pad;
  return [
    { mode: 'build',    label: 'Build',    x: W / 2 - step, y, w, h },
    { mode: 'decor',    label: 'Decorate', x: W / 2,        y, w, h },
    { mode: 'orders',   label: 'Orders',   x: W / 2 + step, y, w, h },
  ];
}
// vertical centres on a build card, in HUD units from its middle (it is 118 tall)
const TRAY_ICON = -35, TRAY_NAME = -8, TRAY_ONE = 26, TRAY_ROWS = [15, 37];
function barRects() {
  const list = barList();
  if (!list.length) return [];
  return stripLay(list.length, CARD_W).map((r, i) => ({ b: list[i], ...r }));
}
/* ---------- the chips along the top ----------

   Two pills and a charm pill, at 24, 250 and 476 HUD units. Three numbers
   written out by hand, and they were written when there were two kinds of
   goods. A third kind puts the charm pill at 702 units, which on a tall
   phone is 1195 logical pixels of a 1024 screen: through the speaker button
   and off the side.

   Same answer as the strip along the bottom. Lay them out rather than write
   them down, and wrap when a row is full. The first row stops short of the
   mute button, which lives in the top right and is not one of them; the rows
   under it have the whole width. Everything below the chips -- the goal
   strip, the hint, the warning about a save that would not write -- hangs
   off the bottom of the block rather than off a number that assumed one
   row. */
const CHIP_W = 210, CHARM_W = 190, CHIP_H = 76, CHIP_GAP = 16, CHIP_X = 24, CHIP_DROP = 10;
/* A kind of goods gets its pill once the village has some of it or can make
   it -- the rule the charm pill has always kept.

   Stone had a pill from the first second of a new village: "0/300 idle", on a
   row of its own because three pills and the speaker button do not fit on
   one, pushing the first hint down beneath it. A new player can neither make
   stone nor spend it until the hall allows a quarry, so the first screen
   anyone ever sees spent a whole row saying nothing about a thing they could
   not do anything with. It arrives the moment a quarry can be built, or the
   moment any turns up in the barn. */
const chipKinds = () => RES.filter(k => res[k] >= 1
  || BUILDINGS.some(b => b.makes && b.makes[k] && unlocked(b.key)));
function chipRects() {
  const u = US(), gap = CHIP_GAP * u, x0 = CHIP_X * u;
  /* The charm pill only exists once there is charm to report. */
  const kinds = charmTotal() > 0 ? [...chipKinds(), 'charm'] : chipKinds();
  const M = muteRect();
  const out = [];
  let row = 0, x = x0;
  for (const k of kinds) {
    const w = (k === 'charm' ? CHARM_W : CHIP_W) * u;
    const lim = row === 0 ? M.x - M.r - 10 * u : W - x0;
    if (x > x0 && x + w > lim) { row++; x = x0; }
    out.push({ k, x, row, w, h: CHIP_H * u, y: 0 });
    x += w + gap;
  }
  const ry = hudTop() + 52 * u;
  for (const c of out) c.y = ry + c.row * (CHIP_H + CHIP_DROP) * u;
  return out;
}
const chipsBot = () => {
  const u = US(), cs = chipRects();
  return cs.length ? Math.max(...cs.map(c => c.y + c.h / 2)) : hudTop() + 90 * u;
};
/* The interface's panels are carved wood with a gold rim -- the logo's
   material and the title screen's button -- where they were translucent dark
   green. Kept dark on purpose: every colour of writing on them was chosen for
   contrast against a dark backing, the selected card was once lightened and
   lost its gold price to it, and the contrast sweeps measure exactly this.
   What says "selected" is the rim, brighter and thicker, not the fill. */
const WOOD_RIM = 'rgba(214,170,88,.80)', WOOD_ON = '#f3d27a';
function woodPanel(x, y, w, h, r, rim, rimW, warm) {
  const gr = g.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, warm ? 'rgba(84,36,24,.94)' : 'rgba(74,47,24,.93)');
  gr.addColorStop(1, warm ? 'rgba(52,20,14,.94)' : 'rgba(42,26,13,.93)');
  g.fillStyle = gr;
  g.beginPath(); g.roundRect(x, y, w, h, r); g.fill();
  g.save(); g.clip();                    // the bevel catching the light, inside the rim
  g.strokeStyle = 'rgba(255,222,160,.14)'; g.lineWidth = 2;
  g.beginPath(); g.roundRect(x + 3, y + 3, w - 6, h - 6, Math.max(0, r - 3)); g.stroke();
  g.restore();
  g.strokeStyle = rim || WOOD_RIM; g.lineWidth = rimW || 2.5;
  g.beginPath(); g.roundRect(x, y, w, h, r); g.stroke();
}
function drawHUD() {
  const u = US();
  // resources
  const ry = hudTop() + 52 * u;
  g.save();
  g.font = `bold ${Math.round(34 * u)}px Segoe UI, sans-serif`; g.textBaseline = 'middle';
  /* Two lines inside the pill: the amount, and beneath it what the village is
     really achieving. The second number is measured from actual deliveries, not
     summed from the buildings' rated output -- the gap between the two is
     walking time, and it is easily half. */
  /* What the village WOULD deliver, for the chips to quote when a barn is full.
     The measured rate reads zero then -- every load is being thrown away, which
     is the one moment the player most needs a number and the only moment the
     interface stopped giving them one. Worked out once for both chips, off the
     cached workforce plan. */
  const wasting = RES.some(isFull)
    ? potentialRate() : null;
  const chip = (c, icon, k, val, cap, col, rate, lost) => {
    const x = c.x, ry = c.y, wch = c.w, h = c.h, full = isFull(k);
    woodPanel(x, ry - h / 2, wch, h, h / 2, full ? 'rgba(235,150,110,.85)' : null, full ? 3 : 2.5);
    g.textAlign = 'left'; g.font = `${Math.round(28 * u)}px Segoe UI, sans-serif`;
    g.fillStyle = '#fff'; g.fillText(icon, x + 16 * u, ry - 1 * u);
    /* The most-looked-at number in the game, and it was spilling out of its own
       pill for most of a playthrough: "1800 / 1800" is 201 logical pixels wide
       in the 185 the chip leaves it, and every cap from hall three onwards is
       four digits. Tightened around the slash, and fitted as a backstop -- at
       eight thousand of each it comes down a size rather than running into the
       chip beside it. */
    const amount = Math.floor(val) + '/' + cap;
    const amountFit = fitLines(amount, wch - 58 * u - 14 * u, 27 * u, 18 * u, 1);
    g.fillStyle = col;
    g.fillText(amountFit.lines[0], x + 58 * u, ry - 12 * u);
    /* Fitted to the pill, like everything else. The first version of the
       wasting line ran straight out of the chip and into the one beside it --
       and the screen-edge sweep could not see it, because a chip is not the
       edge of the screen. */
    const sub = (text, colour) => {
      const fit = fitLines(text, wch - 72 * u, 21 * u, 12 * u, 1);
      g.fillStyle = colour;
      g.fillText(fit.lines[0], x + 58 * u, ry + 18 * u);
    };
    /* A decimal only while it still says something. "wasting 28.3/s" is 143
       logical pixels wide in the 138 the chip allows, and it cannot shrink: the
       chip asks fitLines for 21u, which is already under the readable floor, so
       the fitter returns the line untouched rather than smaller. The string has
       to be the thing that gives. Dropping the decimal at ten takes it to 126,
       and three figures -- "wasting 999/s" -- lands exactly on 138. */
    /* A finished village is not wasting anything; its surplus is going next
       door. Same number, calm colour, true word. */
    /* "ships", the word the goal and the hall use for the same goods. It said
       "sharing" here after both had been settled on shipped -- three names
       for one tally on one screen. Not "shipping": "shipping 9.5/s" is 140
       logical pixels in the 138 this line has, and cannot shrink. */
    if (full) sub(lost > 0.05
      ? (villageFinished() ? 'ships ' : 'wasting ') + (lost >= 10 ? Math.round(lost) : lost.toFixed(1)) + '/s'
      : 'storage full', villageFinished() ? '#9fd6a0' : '#f0a583');
    // "/s", as every other rate in the game is written
    else sub(rate > 0.02 ? '+' + rate.toFixed(1) + '/s' : 'idle',
      rate > 0.02 ? '#8fd06a' : DIM);
  };
  /* "idle" means nobody is making it -- not that the five second window has
     not caught up yet. That read "idle" for the first EIGHTEEN seconds of a
     new player's first lumber camp while the wood above it climbed.

     And the measurement is only worth showing once a window holds several
     loads. Wood arrives eight at a time, so a small village's window catches
     none or one: the same camp read +0.4, +1.2, +0.6, +1.1 against a true
     0.89. Below four loads a window the rate the hands at work should give is
     the better number; above it, what actually arrived. Decided on the
     expected figure, which is steady, so the chip does not flip between them. */
  const expect = expectedRate();
  /* rateNow counts what reached the barn, so it already leaves out the
     beacon's half; the expected rate and the sharing figure are worked out
     from what the hands produce, so they are cut to the same half. */
  const cut = beaconCut();
  const shown = k => expect[k] <= 0.02 ? 0
    : expect[k] * RATE_WINDOW >= 4 * CARRY && rateNow[k] > 0.02 ? rateNow[k] : expect[k] * cut;
  const ch = charmTotal();
  for (const c of chipRects()) {
    if (c.k !== 'charm') {
      chip(c, RES_ICON[c.k], c.k, res[c.k], caps[c.k], RES_CHIP[c.k], shown(c.k), wasting && wasting[c.k] * cut);
      continue;
    }
    const x = c.x, ry = c.y, wch = c.w, hh = c.h;
    woodPanel(x, ry - hh / 2, wch, hh, hh / 2);
    g.textAlign = 'left'; g.font = `${Math.round(28 * u)}px Segoe UI, sans-serif`;
    g.fillStyle = '#fff'; g.fillText('✨', x + 16 * u, ry - 1 * u);
    const cd = charmDelivered();
    g.font = `bold ${Math.round(27 * u)}px Segoe UI, sans-serif`; g.fillStyle = '#cbb6f0';
    g.fillText(cd > 0.005 ? '+' + cd.toFixed(2) + '/s' : 'charm ' + ch, x + 58 * u, ry - 12 * u);
    // 3.25 over bright water before; see the note on the idle colour above
    g.font = `bold ${Math.round(19 * u)}px Segoe UI, sans-serif`; g.fillStyle = '#b5aec9';
    /* "No workplaces yet" was shown for any gain too small to print, which
       covers a village full of working farms whose three charm is worth a
       thousandth of a load a second. Two different things, and only one of them
       is the player's to fix by building something. */
    const anyWork = placed.some(q => established(q) && B(q.key).makes && B(q.key).jobs && workersAt(q.id));
    g.fillText(cd > 0.005 ? 'charm ' + ch
      : anyWork ? 'too little to count yet' : 'no workplaces yet', x + 58 * u, ry + 18 * u);
  }
  g.restore();

  // build bar
  for (const r of barRects()) {
    const full = atLimit(r.b.key), can = !full && affordable(r.b.key), sel = selBuild === r.b.key;
    g.save();
    /* The selected green was light enough that the gold price on it measured
       4.09, and a red shortfall (a card can be picked before it is affordable)
       about 4.2 -- on the one card the player is looking at. Never measured,
       because no sweep had a card selected. Darker, still plainly green, and
       the bright border is what says "selected" anyway. */
    woodPanel(r.x - r.w / 2, r.y - r.h / 2, r.w, r.h, 16,
      sel ? WOOD_ON : can ? WOOD_RIM : 'rgba(200,110,90,.6)', sel ? 4 : 2.5, !sel && !can);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.globalAlpha = full ? 0.55 : 1;
    /* Laid out in measured bands, not fractions of the card. With two costs
       the name reached 15 below centre and the first cost row began at 12, so
       "Lumber" and "Store" were printed through their own prices -- on the
       first screen a new player sees. Glyph extents at these sizes (from
       measureText): icon 32 is -18..+13, a name at 20 is -9.5..+5.5 (+2 for a
       descender), a cost row at 20 is -12.5..+8.5. The card is -59..+59. */
    g.font = `${Math.round(32 * u)}px Segoe UI, sans-serif`;
    g.fillText(r.b.icon, r.x, r.y + TRAY_ICON * u);
    /* Shrunk like the price beneath it. The buttons divide a fixed 1024 across
       however many kinds there are, while the font grows with the HUD scale --
       so on a tall phone "Lumber Camp" came out 158 wide in a 134 button and ran
       into its neighbours. Another failure that only appears on the shape of
       screen the game is actually for. */
    const nameFit = fitLines(r.b.short || r.b.name, r.w - 12 * u, 20 * u, 11 * u, 1);
    g.fillStyle = '#fff'; g.fillText(nameFit.lines[0], r.x, r.y + TRAY_NAME * u);
    g.globalAlpha = 1;
    /* Shrunk to fit the button. Two costs and a charm value at the largest HUD
       scale is wider than the tile it sits in, and a price that runs into its
       neighbour is worse than a small one. */
    /* One line, or two when there are two resources to name.

       An emoji is about twice as wide as a digit at the same size, so "60 wood
       and 20 food" wants 135 logical pixels in a button 115 wide -- and every
       two-resource cost in the game was quietly spilling over its button onto
       the sea and its neighbours. The old fitter hid that by shrinking it until
       it fitted, which is how it ended up at five CSS pixels on a phone; giving
       the text a floor made the overflow visible, and this is the fix for it.

       Stacked, each line carries one icon and one number and fits with room. */
    const trayRow = (text, colour, at) => {
      const fit = fitLines(text, r.w - 14 * u, 20 * u, 11 * u, 1, '');
      g.fillStyle = colour;
      g.fillText(fit.lines[0], r.x, r.y + at * u);
    };
    /* Charm goes on the LAST cost line. It was beside the name for a while and
       "Flowerbed ✨5" is 193 logical pixels in a 139 pixel button -- one
       overflow traded for another. The cost lines have the room. */
    const costRows = (entries, colour, tail, lead) => {
      const parts = entries.map(([k, v]) => (lead || '') + (RES_ICON[k] || '') + v);
      if (tail) parts[parts.length - 1] += ' ' + tail;   // one space: two put it 3px over
      if (parts.length < 2) { trayRow(parts.join(''), colour, TRAY_ONE); return; }
      trayRow(parts[0], colour, TRAY_ROWS[0]);
      trayRow(parts[1], colour, TRAY_ROWS[1]);
    };
    if (full) {
      // the cost is irrelevant when the hall will not allow another one, and
      // "1/1 · upgrade hall" needed five CSS pixels to fit; the lock says it
      trayRow(isDecor(r.b.key) ? decorCount() + '/' + DECOR_MAX
        : countOf(r.b.key) + '/' + allowedOf(r.b.key) + ' 🔒', '#e5b28a', TRAY_ONE);
    } else if (can && noSpareHands(r.b.key)) {
      /* At the readable floor: "no one spare" is 157 logical wide in a 115
         button and "none free" is 117 -- over it, and saying the wrong thing
         besides. "no spare" is 104 and true. */
      trayRow('no spare', '#e5b28a', TRAY_ONE);   // allowed, affordable, nobody to spare
    } else if (can) {
      costRows(Object.entries(r.b.cost), '#e8c98a',
        r.b.charm ? (charmRoom() > 0 ? '✨' + usefulCharm(r.b.key) : '✨full') : '');
    } else {
      /* What is still missing, not what it costs -- and marked as such, because
         the two were the same shape in the same place and told apart only by
         being gold or salmon. A player who cannot separate those two hues, or
         is outdoors, read the shortfall as the price; and since a shortfall is
         always SMALLER than the price, the card made a building it could not
         afford look cheaper than it is.

         Everywhere else that names a shortfall says the word: "Need X more" on
         the upgrade button, "need 🪵40" on a trade card, "need N more" on the
         claim card. The tray cannot have the word -- measured at the phone
         aspect, "need 🪵195" is 147.6 logical pixels in a 118.4 budget, while
         "no spare" already sits at 103.1 -- so it takes the mark the game
         already uses for a figure being taken away: a leading minus, 99.2, the
         same width class as the label beside it. Colour as well, not instead. */
      /* Except a shortfall nobody can close. A statue is on the decorate
         tray from the first minute -- ornaments are not rationed by the hall
         -- and it costs eighty stone, which a village cannot make until its
         hall allows a quarry. The card said "−🪨80": short of a thing with no
         pill, no building and no way to get it, which reads as a fault. It
         says what unlocks it instead, in the lock the tray already uses for
         "you cannot have another". */
      const stuck = blockedBy(r.b.cost);
      if (stuck && hallFor(stuck[0])) trayRow('hall ' + hallFor(stuck[0]) + ' 🔒', '#e5b28a', TRAY_ONE);
      /* And a price bigger than the barns can hold is the same kind of
         shortfall: no amount of saving reaches it. The beacon costs 2,500 wood
         and 1,600 stone, and a finished village with one storehouse holds 700
         of each -- its card read "−🪵2150 −🪨1250". The upgrade button and the
         claim card already say "needs another storehouse" in this state; the
         card says the short form of the same thing. */
      else if (overCaps(r.b.cost)) trayRow(atLimit('store') ? 'bigger 📦' : 'more 📦', '#e5b28a', TRAY_ONE);
      else {
        const short = Object.entries(r.b.cost)
          .map(([k, v]) => [k, Math.max(0, Math.ceil(v - res[k]))]).filter(([, v]) => v > 0);
        costRows(short, '#f0a583', '', '−');   // #e59a86 measured 4.45 on a selected card
      }
    }
    g.restore();
  }
  if (barMode === 'orders') {
    const rs = orderRects();
    /* The stalls with nobody at them, as stalls: an outline where the next
       offer will appear, and WHEN. "A trader will be along shortly" was the
       whole of what an empty board said, and a half-empty one said nothing --
       with a new trader only every 75 seconds, how long is the one thing worth
       knowing before deciding whether to wait or go and build. */
    const slots = orderSlotRects(), wait = nextTraderIn();
    const taken = new Set(orders.map(o => o.slot)), firstFree = slots.findIndex((_, i) => !taken.has(i));
    for (let i = 0; i < slots.length; i++) {
      if (taken.has(i)) continue;
      const r = slots[i];
      g.save();
      // near-opaque: at .80 a bright sea prop behind the board took the label under 4.5:1
      g.fillStyle = 'rgba(16,26,14,.88)'; g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 2;
      g.setLineDash([10, 8]);
      g.beginPath(); g.roundRect(r.x - r.w / 2, r.y - r.h / 2, r.w, r.h, 16); g.fill(); g.stroke();
      g.setLineDash([]);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      const first = i === firstFree && wait !== null;
      const secs = first ? Math.ceil(wait) : 0;
      const when = secs >= 60 ? Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0') : secs + 's';
      const top = first ? 'next trader' : 'empty stall', bottom = first ? 'in ' + when : '';
      const f1 = fitLines(top, r.w - 20 * u, 21 * u, 12 * u, 1);
      g.font = `${Math.round(f1.px)}px Segoe UI, sans-serif`; g.fillStyle = DIM;
      g.fillText(f1.lines[0], r.x, bottom ? r.y - 16 * u : r.y);
      if (bottom) {
        g.font = `bold ${Math.round(24 * u)}px Segoe UI, sans-serif`; g.fillStyle = '#e8e2c8';
        g.fillText(bottom, r.x, r.y + 17 * u);
      }
      g.restore();
    }
    /* Which stall on the board trades best. Nothing on the card would otherwise
       say so -- comparing 105-for-99 against 345-for-341 in your head is not a
       decision anyone should be asked to make while the numbers are already
       there to be compared for them.

       Asked of the TRADE, not of the size label on it. This used to pick the
       highest tier on the board, on the reasoning that the rate rises with the
       size -- true of an offer the moment it is written, and the tier is only
       ever a note about how big it was. The numbers are what the player is
       being told about, and the two can come apart: an order saved before
       tiers existed is given one on load by its size against the CURRENT
       ceiling, so a small, nearly-even trade written when the barns held four
       hundred comes back labelled as the smallest size in a village holding
       four and a half thousand. Measured on exactly that board: 🪵92 for 🌾91,
       which is 0.989, sitting under "tap to trade" while 🪵555 for 🌾525 --
       0.946, thirty food worse -- wore the gold border and the words "best
       rate".

       Both sides as a share of their own ceiling, which is the same comparison
       makeOrder uses to keep every offer below even; the two ceilings can
       differ. */
    const worth = o => (o.getN / Math.max(1, caps[o.getK]))
      / Math.max(1e-9, o.giveN / Math.max(1, caps[o.giveK]));
    const bestWorth = rs.reduce((n, r) => Math.max(n, worth(r.o)), 0);
    for (const r of rs) {
      const ok = canFill(r.o);
      const best = ok && rs.length > 1 && worth(r.o) >= bestWorth - 1e-9
        && rs.some(q => worth(q.o) < bestWorth - 1e-9);
      g.save();
      g.fillStyle = ok ? 'rgba(22,32,20,.92)' : 'rgba(40,22,20,.92)';
      g.strokeStyle = best ? 'rgba(240,216,148,.9)'
        : ok ? 'rgba(159,232,107,.75)' : 'rgba(200,110,90,.5)';
      g.lineWidth = ok ? 3 : 2.5;
      g.beginPath(); g.roundRect(r.x - r.w / 2, r.y - r.h / 2, r.w, r.h, 16); g.fill(); g.stroke();
      g.textAlign = 'center'; g.textBaseline = 'middle';
      /* Which way the goods go. "🌾42 for 🪵39" reads either way round -- is
         that 42 food for their 39 wood, or 42 food they want for 39 of yours?
         The card said it only by making the lower figure green. */
      const side = (verb, k, n, at, colour) => {
        const fit = fitLines(verb + '  ' + RES_ICON[k] + ' ' + n, r.w - 18 * u, 26 * u, 14 * u, 1, 'bold ');
        g.font = `bold ${Math.round(fit.px)}px Segoe UI, sans-serif`;
        g.fillStyle = colour;
        g.fillText(fit.lines[0], r.x, r.y + r.h * at);
      };
      side('give', r.o.giveK, r.o.giveN, -0.26, ok ? '#fff' : '#d8b3a6');
      g.font = `${Math.round(20 * u)}px Segoe UI, sans-serif`;
      // say WHY a card cannot be taken, rather than just greying it
      /* How much is missing, as everywhere else in the game says it. "not enough"
         left the player to subtract 400 from 670 across a card and a chip. */
      const short = Math.ceil(r.o.giveN - res[r.o.giveK]);
      /* Before it is tapped, not after. A card that pays into a barn with no
         room in it is doing something different from every other card on the
         board, and the player is entitled to know which one they are taking. */
      const why = short > 0 ? 'need ' + RES_ICON[r.o.giveK] + short
        : willShip(r.o) ? 'to the neighbours'
        : !hasRoom(r.o) ? 'no room' : best ? 'best rate' : 'tap to trade';
      g.fillStyle = why === 'tap to trade' ? DIM
        : short <= 0 && hasRoom(r.o) ? '#f0d894' : '#e59a86';
      const whyFit = fitLines(why, r.w - 16 * u, 20 * u, 13 * u, 1);
      g.font = `${Math.round(whyFit.px)}px Segoe UI, sans-serif`;
      g.fillText(whyFit.lines[0], r.x, r.y);
      side('get', r.o.getK, r.o.getN, 0.26, ok ? '#9fe86b' : '#a2907f');
      g.restore();
    }
  }
  for (const t of tabRects()) {
    const on = barMode === t.mode;
    g.save();
    woodPanel(t.x - t.w / 2, t.y - t.h / 2, t.w, t.h, t.h / 2, on ? WOOD_ON : null, on ? 3.5 : 2.5);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `bold ${Math.round(22 * u)}px Segoe UI, sans-serif`;
    g.fillStyle = on ? '#fff3d6' : '#cdb894';
    g.fillText(t.label, t.x, t.y);
    /* Trading is where surplus food turns back into wood -- at a full village
       it is 30% of wood income -- but only if you go and look. A count on the
       tab means you never have to. */
    if (t.mode === 'orders') {
      const n = orders.filter(canFill).length;
      if (n) {
        const bx = t.x + t.w / 2 - 6 * u, by = t.y - t.h / 2 + 4 * u, r2 = 15 * u;
        g.fillStyle = '#e8b44a'; g.strokeStyle = 'rgba(20,30,16,.9)'; g.lineWidth = 3;
        g.beginPath(); g.arc(bx, by, r2, 0, 7); g.fill(); g.stroke();
        g.fillStyle = '#2a1f08';
        g.font = `bold ${Math.round(19 * u)}px Segoe UI, sans-serif`;
        g.fillText(String(n), bx, by + 1 * u);
      }
    }
    g.restore();
  }
  if (selBuild || moving != null) {
    /* On a pill, like every other piece of HUD text.

       This one was painted straight onto the world: no background, just pale
       green letters wherever the camera happened to be pointing. Over water it
       looked fine, which is why it survived every check I ran -- over a sandy
       path it came out at 1.33 against the 4.5 it needs, on the single
       instruction the player reads during every placement they ever make.

       Fitted as well as backed, because the two cancel strings are the longest
       instructions in the game and the pill has to hold them. */
    /* And why a tap was refused. A blocked tile got red stripes and a buzz --
       and the buzz is nothing at all with the sound off -- so a new player
       tapping the dark ground beside the hall, the most natural first try, was
       told only "no". The reason goes HERE, on the pill that stays put, rather
       than under the finger where it would flicker across every blocked tile. */
    const refused = ghost && !ghost.fits && ghost.why;
    const txt = armed ? 'Tap the same spot again to confirm'
      : refused === 'land' ? (landTier >= LAND_MAX ? 'Buildings have to go on the island'
                              : 'That ground is not yours yet  ·  build on the lighter grass')
      : refused === 'taken' ? 'Something is already standing there'
      : moving != null
        ? 'Tap where it should go  ·  tap a tab to cancel'
        : 'Tap a tile to try it  ·  tap the icon again to cancel';
    g.save(); g.textAlign = 'center'; g.textBaseline = 'middle';
    const fit = fitLines(txt, W - 80 * u, 24 * u, 14 * u, 1, 'bold ');
    g.font = `bold ${Math.round(fit.px)}px Segoe UI, sans-serif`;
    const pw = Math.min(W - 24 * u, g.measureText(fit.lines[0]).width + 44 * u);
    const ph = fit.px * 1.7;
    /* Sat on its own height, not a fixed 16 above the tabs: the pill is 41
       tall, so half of it is 20, and its bottom covered the top of the tabs. */
    const y = tabRects()[0].y - tabRects()[0].h / 2 - ph / 2 - 6 * u;
    woodPanel(W / 2 - pw / 2, y - ph / 2, pw, ph, ph / 2);
    g.fillStyle = refused ? '#f0c79a' : '#cfe0a8';
    g.fillText(fit.lines[0], W / 2, y);
    g.restore();
  }
  drawShow();
  drawMute();
  drawPanel();
  drawWho();
  drawGoal();
  drawSaveState();
  drawHint();
  drawClaim();
  drawAway();
  drawFinished();
}

/* The standing goal, and the flash when one is finished. Both live in the same
   strip under the resource pills, and a first-time hint outranks them: a hint
   is only ever shown once, a goal is always there. */
/* Two things the player must be told, because neither is visible otherwise:
   that the village could not be written down, and that it was restored from the
   older copy so the last minute is missing. */
function drawSaveState() {
  if (!saveFailed && !loadedFromBackup && !otherBuild) return;
  const u = US(), y = chipsBot() + 100 * u;
  /* Not "storage", which in this village means the barns. The resource bar
     says "storage full" when a barn is at its ceiling and the trade card says
     "no room" for the same reason, and both have an answer the player can act
     on -- build a storehouse, spend something. This has nothing to do with any
     of that and no answer inside the game, so it must not arrive wearing the
     same words. Measured together on one screen: "storage full" over the bar
     and "storage is full or blocked" across the middle, which reads as one
     problem with one fix and is two problems with none. */
  const txt = saveFailed
    ? 'The village cannot be saved — this device is full or blocking it'
    : otherBuild && !loadedFromBackup
      ? 'A village from another version of the game is saved on this device — it has been kept, not overwritten'
      : 'Restored from a backup — the last minute of play was lost';
  g.save();
  /* Through the fitter, like every other pill. This one clamped its own WIDTH
     to the screen and then drew the text at a fixed size regardless, which is
     the failure the goal strip and the hint pills were fixed for: the box stops
     at the edge and the sentence carries on past it. It fitted only because the
     sentence was short enough, which is not a property anybody can rely on
     while editing the sentence. */
  const fit = fitLines(txt, W - 96 * u, 21 * u, 13 * u, 2, 'bold ');
  g.font = `bold ${Math.round(fit.px)}px Segoe UI, sans-serif`;
  const tw = Math.max(...fit.lines.map(l => g.measureText(l).width));
  const w = Math.min(W - 40 * u, tw + 52 * u), h = Math.max(50 * u, fit.lines.length * fit.px * 1.24 + 22 * u);
  g.fillStyle = saveFailed ? 'rgba(58,20,16,.94)' : 'rgba(46,38,14,.94)';
  g.strokeStyle = saveFailed ? 'rgba(240,140,110,.9)' : 'rgba(230,200,110,.85)';
  g.lineWidth = 2.5;
  g.beginPath(); g.roundRect(W / 2 - w / 2, y - h / 2, w, h, h / 2); g.fill(); g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = saveFailed ? '#ffb9a0' : '#f0d89a';
  pillLines(fit, W / 2, y);
  g.restore();
}

/* For a goal that is one purchase -- a hall level, a ring of land -- how close
   it is. Measured on a full playthrough, raising the hall to five is eighteen
   minutes of saving and the fourth ring thirteen, and the strip showed only the
   reward for all of it: no sense of progress, and no signal that the moment to
   act had come. Now it counts the resources still short, says when it can be
   bought and where, and says so when the price is more than the stores hold. */
// one number to compare two prices by, so "cheapest" means something
const upSum = c => (c.wood || 0) + (c.food || 0);
function buyProgress(kind) {
  const h = hallOf();
  if (kind === 'hall' && h && h.t < 1) return 'building…';          // the upgrade is already paid for
  /* The cheapest workplace still to raise. Thirty-one building levels and
     twenty-seven minutes of saving, and the strip said only how many were
     done: the player had to open panels to find what the next step costs. */
  if (kind === 'workplace') {
    let best = null, building = false;
    for (const p of placed) {
      if (!B(p.key).jobs || p.key === 'hall' || lvlHeld(p) >= LVL_MAX) continue;
      /* Its own scaffolding, the same answer the hall gives for its own, and
         asked BEFORE upInfo. The last workplace of the goal is the one that
         leaves nothing else to quote, so tapping upgrade on it emptied the
         progress line for the length of the build -- at the end of the longest
         goal in the game, on the one step the player is watching. Asked after
         upInfo it never fired at all: the level is paid for the instant the
         player taps, so a workplace on its way to five already answers max. */
      if (p.t < 1) { building = true; continue; }
      const i = upInfo(p);
      if (i.max || i.gate) continue;
      if (!best || upSum(i.cost) < upSum(best)) best = i.cost;
    }
    if (!best) return building ? 'building…' : '';
    /* And a price past the ceiling, which the hall and the land have always
       said and this did not: a market's last step is 4075 wood, the dearest
       thing in the game, and a village that has sold storage down can hold
       three thousand. The strip counted out a figure that can never be
       reached while the building's own button said "Needs another
       storehouse". */
    if (overCaps(best)) return 'needs more storage';
    if (canAfford(best)) return 'ready — tap a workplace';
    return 'cheapest next ' + Object.entries(best).map(([k, v]) => RES_ICON[k] + v).join(' ');
  }
  /* Charm, which is the one goal a player can put out of their own reach.

     Roads are ornaments: they are laid from the same tray and they count
     against the same sixty slots. That is reasonable -- they are things
     standing on the ground -- but it means paving competes with charm for
     the same budget, and the player is given no reason to think so. The
     arithmetic is unforgiving: a statue is the best a slot can hold, the
     goal wants six hundred, so fourteen slots have to be kept for statues
     and anything past forty-seven roads makes the goal impossible. Paving
     the straight route from every workplace to its nearest store on the
     whole island takes thirty-nine, measured, so a player doing the sensible
     thing is already two thirds of the way to a cliff nothing mentions.

     It is recoverable -- a road comes up again and gives a slot back -- but
     only by somebody who has worked out what happened, and the strip said
     the same unchanging line either way. So it says which it is. */
  if (kind === 'charm') {
    if (charmTotal() >= CHARM_FULL) return '';
    const slots = Math.max(0, DECOR_MAX - decorCount());
    const reach = charmTotal() + BEST_CHARM * slots;
    if (reach < CHARM_FULL) {
      /* The remedy, and it has to be one that exists: a road is the cheapest
         slot to win back, being worth almost no charm itself. */
      const road = placed.find(p => isDecor(p.key) && (B(p.key).charm || 0) < BEST_CHARM / 4);
      return road ? 'no room left — remove a ' + B(road.key).name.toLowerCase()
        : 'no room left — remove an ornament';
    }
    const need = Math.ceil((CHARM_FULL - charmTotal()) / BEST_CHARM);
    const best = BUILDINGS.find(b => b.decor && (b.charm || 0) === BEST_CHARM);
    if (!best) return '';
    if (!canAfford(best.cost)) return Object.entries(best.cost).filter(([k, v]) => res[k] < v)
      .map(([k, v]) => RES_ICON[k] + Math.floor(res[k]) + '/' + v).join(' ');
    return need + ' more ' + best.name.toLowerCase() + (need === 1 ? '' : 's') + ' — ready';
  }
  const cost = kind === 'hall' ? (h ? upInfo(h).cost : null) : landNext();
  if (!cost) return '';
  if (overCaps(cost)) return 'needs more storage';
  // "darker", as the hint that taught it says
  if (canAfford(cost)) return kind === 'hall' ? 'ready — tap the town hall' : 'ready — tap the darker ground';
  return Object.entries(cost).filter(([k, v]) => res[k] < v)
    .map(([k, v]) => RES_ICON[k] + Math.floor(res[k]) + '/' + v).join(' ');
}
function drawGoal() {
  if (away) return;
  const u = US(), y = chipsBot() + 42 * u;
  if (goalDone) {
    const t = goalDone.age / GOAL_SHOW;
    const banked = goalDone.got || goalDone.g.give;
    const spilled = goalDone.lost || {};
    const icon = k => RES_ICON[k];
    /* Nothing fitted at all, which the card has always said. Naming the
       figures as well would only repeat the reward the player can read in
       the goal strip behind it. */
    /* A goal past the ladder has nothing to bank and says what it was for
       instead. Without this it would fall into the branch below and report
       "stores already full", which is true and is not what happened. */
    const parts = goalDone.g.after ? goalDone.g.praise
      : !Object.keys(banked).length ? 'stores already full'
      : Object.entries(banked).map(([k, v]) => icon(k) + ' +' + v).join('   ')
        + (Object.keys(spilled).length
            ? '   ·   ' + Object.entries(spilled).map(([k, v]) => icon(k) + v).join(' ')
              + ' spilled — stores full'
            : '');
    g.save();
    g.globalAlpha = Math.min(1, (1 - t) * 3);
    const txt = 'Goal complete!   ' + parts;
    const fit = fitLines(txt, W - 108 * u, 24 * u, 14 * u, 2);
    const tw = Math.max(...fit.lines.map(l => g.measureText(l).width));
    const w = Math.min(W - 40 * u, tw + 60 * u);
    const hh = Math.max(62 * u, fit.lines.length * fit.px * 1.22 + 30 * u);
    g.fillStyle = 'rgba(30,50,22,.95)'; g.strokeStyle = '#9fe86b'; g.lineWidth = 3;
    g.beginPath(); g.roundRect(W / 2 - w / 2, y - hh / 2, w, hh, Math.min(hh, 62 * u) / 2); g.fill(); g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#eaffd6';
    pillLines(fit, W / 2, y);
    g.restore();
    return;
  }
  if (currentHint()) return;          // a one-off hint takes the strip first
  const gl = currentGoal();
  g.save();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  /* There is no longer a state where the strip has nothing to say. It used to
     end on "Every goal done — the village is yours", once, for ever; the goals
     past the ladder replaced it, and a line that cannot be reached is not kept
     for sentiment. The completion CARD still marks the moment -- that is what
     it is for, and it is shown once rather than every frame after. */
  /* Named as a reward. Bare, it read as a price: 'Build a storehouse · 🪵70'
     over a storehouse costing 🪵60 🌾20, 'Build a farm · 🪵30 🌾20' over a farm
     costing 🪵45 -- the same icons-and-numbers the tray uses for what things cost. */
  /* Past the ladder there is no reward to name, so the clause names the
     running total instead -- which is the number the goal is actually about,
     and the only one in the game that never stops going up. Better than a
     blank: the line would otherwise read "reward" with nothing after it. */
  /* Only for the goals it measures. Past the ladder the goals alternate
     between shipping and trade orders, and every one of them carried the
     shipping total -- so the strip read "Fill 10 trade orders in all · 0/10 ·
     shipped nothing yet", a figure about something the goal does not ask for,
     which reads as a second thing to do. A goal with its own count needs
     nothing after it. */
  const reward = gl.after
    ? (gl.at ? '' : 'shipped ' + (sharedText() || 'nothing yet'))
    : 'reward ' + Object.entries(gl.give).map(([k, v]) => RES_ICON[k] + v).join(' ');
  /* How far along, for the goals that can count.

     "Raise every workplace to level 5" is thirty-one minutes and a hundred and
     eighty building levels, measured on a full playthrough -- and the strip said
     exactly the same thing on the first minute of it as on the last. The length
     is defensible; a long stretch with no sense of progress is not, and this is
     a game that shows what is happening everywhere else it can.

     Only where a count means something. "Raise the town hall to level 4" is one
     step, and "2/4" under it would be noise. */
  const prog = gl.at ? gl.at() : null;
  /* Asked for its ANSWER, not for whether the goal has something to buy.

     buyProgress returns nothing at all when there is nothing left to name, and
     the separator went on regardless, so the strip read "Raise every workplace
     to level 5   ·      ·   reward 🪵3400 🌾2200" -- a divider with a hole
     where a clause should be, on the one line that is always on screen.

     Reached by selling the workplaces: that goal asks about buildings the
     player may remove, and with none of them left there is no cheapest next
     step to quote. Every other clause on this line already asks what it is
     about to print; this one asked only whether it was allowed to print
     something. */
  const buy = gl.buy ? buyProgress(gl.buy) : '';
  const txt = gl.text
    + (prog && prog[0] < prog[1] ? '   ·   ' + prog[0] + '/' + prog[1] : '')
    + (buy ? '   ·   ' + buy : '')
    + (reward ? '   ·   ' + reward : '');
  const fit = fitLines(txt, W - 108 * u, 22 * u, 13 * u, 2);
  const tw = Math.max(...fit.lines.map(l => g.measureText(l).width));
  const w = Math.min(W - 40 * u, tw + 56 * u);
  const hh = Math.max(52 * u, fit.lines.length * fit.px * 1.22 + 28 * u);
  woodPanel(W / 2 - w / 2, y - hh / 2, w, hh, Math.min(hh, 52 * u) / 2);
  g.fillStyle = '#c8d9b8';
  pillLines(fit, W / 2, y);
  g.restore();
}

/* Text that fits inside a pill: shrink, then wrap, then shrink again.

   The pills clamped their own WIDTH to the screen and then drew the text at
   full size regardless, so a long line ran off both edges -- the storage hint
   lost its first and last words. It is the failure a narrow phone shows and a
   wide desktop never does, which is the worst kind to leave in.

   Leaves the fitted font selected, so the caller can measure the lines it gets
   back without setting it again. */
/* Below this, text is not small, it is gone.

   The canvas is a fixed 1024 across whatever the phone is, so on a 375-wide
   handset a logical pixel is 0.366 of a real one. Measured there, the fitter
   was solving overflow by shrinking labels to five and six CSS pixels -- "1/1 ·
   upgrade hall" at 5.1, a statue's price at 5.5 -- which is not a label, it is a
   smudge. Every floor the callers asked for was a fraction of the size they
   wanted rather than a size anyone can read.

   26 logical pixels is about 9.5 CSS on that phone and 11 on a tablet. Text
   that cannot fit at that size has to get shorter, and the sweep in
   tools/fuzz.js is what says which. */
const TEXT_MIN = 26;

/* "1 villagers".

   A fresh village has exactly one caretaker, and the hall's summary opened with
   that on the first screen anyone ever sees. Counted strings are written by
   hand all over the interface and most of them do handle it -- "1 post empty",
   "lifts 1 workplace" -- which is how the two that did not went unnoticed: the
   pattern looked solved. Written once so the next one cannot be got wrong. */
const count = (n, one, many) => n + ' ' + (n === 1 ? one : (many || one + 's'));

/* The muted colour. One of them, not three.

   Secondary text was #8d9a85, an idle rate was #9ca697 and a button you cannot
   afford was #9aa693 -- three colours within three points of each other, each
   arrived at separately, and all three below the 4.5 that small text needs.

   What they are measured against is the point. The pills are 80 to 95 per cent
   opaque and sit over a moving world, so the background is not the pill's own
   colour: sampled over 224 frames spanning every screen shape, four zooms and
   the whole island, the brightest thing behind one of these labels is
   rgb(34,66,54), bright water under an afternoon sky. Against that the three
   came out at 3.73, 4.37 and 4.34.

   This is the least lift that clears 5.0 against that background -- half a
   point of margin, so a frame slightly brighter than any of the 224 does not
   reopen it -- and it still reads as muted. */
const DIM = '#a8b2a2';
/* Remembered, because the same strings are fitted every frame.

   The goal strip and the hint are drawn sixty times a second with text that
   changes a few times a minute, and fitting a long one -- trying each size,
   breaking by clause and by word, then balancing the lines -- measured 0.57
   ms for the strip and 0.24 for a hint on a desktop, several times that on
   a phone, every frame, to arrive at the answer it gave the frame before.
   The answer depends only on the arguments and the font, so it is kept
   against them. A font arriving late changes every width, so the store is
   emptied when one does; and it is emptied when it grows large, because a
   strip counting "48/600" upwards is a new string every few seconds. The
   fitted font is still selected on the way out, which callers rely on. */
const fitMemo = new Map();
try { document.fonts.addEventListener('loadingdone', () => fitMemo.clear()); } catch (e) {}
function fitLines(text, maxW, px, minPx, maxLines, weight) {
  const key = text + '\u0001' + maxW + '\u0001' + px + '\u0001' + minPx + '\u0001' + maxLines + '\u0001' + weight;
  const hit = fitMemo.get(key);
  if (hit) {
    const w = weight === undefined ? 'bold ' : weight ? weight + ' ' : '';
    g.font = `${w}${Math.round(hit.px)}px Segoe UI, sans-serif`;
    return hit;
  }
  if (fitMemo.size > 400) fitMemo.clear();
  const fit = fitLinesNow(text, maxW, px, minPx, maxLines, weight);
  fitMemo.set(key, fit);
  return fit;
}
function fitLinesNow(text, maxW, px, minPx, maxLines, weight) {
  minPx = Math.max(TEXT_MIN, Math.min(minPx, px));
  const w = weight === undefined ? 'bold ' : weight ? weight + ' ' : '';
  /* A one-line fit must never come back as two, because every caller of it
     draws lines[0] and throws the rest away. That turned "20 wood, 15 food"
     into "20 wood" the moment the floor stopped it shrinking -- a price with
     half of itself missing, which is worse than a price that is too small.
     Overflowing is at least visible, and the sweep in tools/fuzz.js finds it. */
  if (maxLines === 1) {
    for (let size = px; ; size--) {
      g.font = `${w}${Math.round(size)}px Segoe UI, sans-serif`;
      if (size <= minPx || g.measureText(text).width <= maxW) return { lines: [text], px: size };
    }
  }
  /* Almost every string already fits: one measurement to find that out, rather
     than splitting it into words and measuring them one at a time. The tray
     alone runs this fourteen times a frame. */
  g.font = `${w}${Math.round(px)}px Segoe UI, sans-serif`;
  if (g.measureText(text).width <= maxW) return { lines: [text], px };
  /* Broken between clauses where it can be, and never beside a divider.

     The words were packed greedily with the divider counted as a word, so a
     two-line strip broke wherever the width ran out: "...cheapest next 🪵265
     🌾20 🪨130   ·" over "reward 🪵3400 🌾2200", a dot hanging off the end of
     the first line, and at the next size "...🌾185   ·   reward" over
     "🪵3400 🌾2200", the word cut off from the figure it names. Measured
     across a full playthrough of the goal strip. A line break already
     separates two clauses, so where it falls on a divider the divider goes;
     and where it can fall on one at this size, it does, before any clause is
     split down the middle. */
  const pack = (items, sep, width = maxW) => {
    const lines = [];
    let cur = '';
    for (const it of items) {
      const t = cur ? cur + sep + it : it;
      if (cur && g.measureText(t).width > width) { lines.push(cur); cur = it; } else cur = t;
    }
    lines.push(cur);
    return lines;
  };
  /* And balanced, once the size and the number of lines are settled.

     Packed greedily, the first line takes everything it can and the last
     gets the remainder, which is often a word or two: the first thing a new
     player reads was "Build a house first — villagers live there, and
     villagers do all" over "the work". The same number of lines at the same
     size, but the narrowest width that still needs no more of them, so the
     lines come out even. Searched by halving, so a two-line pill costs a
     dozen packings rather than one per pixel. */
  const balance = (items, sep, lines) => {
    if (lines.length < 2) return lines;
    let lo = Math.max(...items.map(it => g.measureText(it).width)), hi = maxW;
    for (let i = 0; i < 12 && hi - lo > 1; i++) {
      const mid = (lo + hi) / 2;
      if (pack(items, sep, mid).length <= lines.length) hi = mid; else lo = mid;
    }
    const even = pack(items, sep, hi);
    return even.length <= lines.length ? even : lines;
  };
  const fits = lines => lines.length <= maxLines && lines.every(l => g.measureText(l).width <= maxW);
  const clauses = text.split(ROW_SEP), words = text.split(' ');
  const tidy = l => l.trim().replace(/^·\s*/, '').replace(/\s*·$/, '');
  for (let size = px; ; size--) {
    g.font = `${w}${Math.round(size)}px Segoe UI, sans-serif`;
    if (clauses.length > 1) {
      const lines = pack(clauses, ROW_SEP);
      if (fits(lines)) return { lines: balance(clauses, ROW_SEP, lines), px: size };
    }
    const lines = pack(words, ' ').map(tidy).filter(Boolean);
    if (fits(lines)) return { lines: balance(words, ' ', lines).map(tidy).filter(Boolean), px: size };
    if (size <= minPx) return { lines, px: size };
  }
}
function pillLines(fit, cx, cy) {
  const lh = fit.px * 1.22;
  const top = cy - (fit.lines.length - 1) * lh / 2;
  fit.lines.forEach((l, i) => g.fillText(l, cx, top + i * lh));
}
/* One thing at a time -- and somebody there to read it.

   "On screen" was taken to mean "not covered by something else", which left
   out the plainest way of not being on screen: the app is not the thing the
   phone is showing. The village works on in the background and the tick works
   on with it, so the hints ran out behind the home screen. Measured on a fresh
   village: forty seconds hidden marked "tap", "house" and "hall" as seen, all
   three of them never drawn once. Those are the three that teach the game. */
const hintVisible = () => !(away || finished || goalDone || document.hidden);
function drawHint() {
  if (!hintVisible()) return;
  const h = currentHint(); if (!h) return;
  const u = US(), y = chipsBot() + 42 * u;
  g.save();
  const fit = fitLines(hintText(h), W - 108 * u, 23 * u, 13 * u, 2);
  const tw = Math.max(...fit.lines.map(l => g.measureText(l).width));
  const w = Math.min(W - 40 * u, tw + 56 * u);
  const hh = Math.max(58 * u, fit.lines.length * fit.px * 1.22 + 30 * u);
  g.globalAlpha = Math.min(1, tutT * 3);           // fades in rather than snapping
  g.fillStyle = 'rgba(20,32,18,.92)'; g.strokeStyle = 'rgba(159,232,107,.55)'; g.lineWidth = 2.5;
  g.beginPath(); g.roundRect(W / 2 - w / 2, y - hh / 2, w, hh, Math.min(hh, 58 * u) / 2); g.fill(); g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#dff0c8';
  pillLines(fit, W / 2, y);
  g.restore();
}

/* Tapping the dark ground offers it to you. Discovering the expansion by
   poking at the thing you want is better than a button in a menu, and it means
   the frontier itself is the affordance. */
function claimRects() {
  const u = US(), w = Math.min(W - 80 * u, 640 * u), h = 292 * u;
  const y = hudTop() + (hudBot() - hudTop()) / 2;
  return { u, x: W / 2, y, w, h,
    yes: { x: W / 2, y: y + h / 2 - 52 * u, w: w * 0.66, h: 66 * u },
    no:  { x: W / 2 + w / 2 - 34 * u, y: y - h / 2 + 34 * u, r: 27 * u } };
}
function drawClaim() {
  if (!claimAsk) return;
  const R = claimRects(), u = R.u, cost = landNext();
  g.save();
  g.fillStyle = 'rgba(6,10,6,.66)'; g.fillRect(0, screenTop(), W, screenBot() - screenTop());
  g.fillStyle = 'rgba(16,26,15,.98)'; g.strokeStyle = 'rgba(240,214,140,.55)'; g.lineWidth = 3;
  g.beginPath(); g.roundRect(R.x - R.w / 2, R.y - R.h / 2, R.w, R.h, 24 * u); g.fill(); g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `bold ${Math.round(32 * u)}px Segoe UI, sans-serif`; g.fillStyle = '#fff';
  g.fillText(cost ? 'Claim more land' : 'The whole island is yours', R.x, R.y - R.h / 2 + 54 * u);
  const L = LAND[Math.min(LAND_MAX, landTier + 1)], side = L.hi - L.lo + 1;
  /* How much room the village has RIGHT NOW, beside how much it would gain.
     Land is the second most expensive thing a player buys and the card said
     only what it would grow to -- so there was no way to tell a claim you need
     from one that buys forty tiles of grass you already had. */
  const here = landBounds(), now = (here.hi - here.lo + 1) ** 2;
  let used = 0;
  for (const p of placed) { const b = B(p.key); used += (b.w || 1) * (b.h || 1); }
  const spare = Math.max(0, now - used);
  g.font = `${Math.round(22 * u)}px Segoe UI, sans-serif`; g.fillStyle = '#a9bd9c';
  g.fillText(cost ? side + ' x ' + side + ' tiles, from ' + Math.sqrt(now) + ' x ' + Math.sqrt(now)
                  : 'there is nothing left to claim', R.x, R.y - R.h / 2 + 92 * u);
  if (cost) {
    g.font = `${Math.round(19 * u)}px Segoe UI, sans-serif`;
    g.fillStyle = spare > 24 ? '#e5b28a' : DIM;
    g.fillText(spare + ' of your ' + now + ' tiles are still empty', R.x, R.y - R.h / 2 + 124 * u);
  }
  if (cost) {
    const ok = canClaim();
    g.font = `bold ${Math.round(30 * u)}px Segoe UI, sans-serif`;
    g.fillStyle = ok ? '#e8c98a' : '#e59a86';
    g.fillText(Object.entries(cost).map(([k, v]) => (RES_ICON[k] + ' ') + v).join('     '),
      R.x, R.y + 14 * u);   // at +2 its emoji touched the descenders of the line above
    g.fillStyle = ok ? 'rgba(62,104,44,.98)' : 'rgba(40,44,36,.9)';
    g.strokeStyle = ok ? '#9fe86b' : 'rgba(255,255,255,.16)'; g.lineWidth = 3;
    g.beginPath(); g.roundRect(R.yes.x - R.yes.w / 2, R.yes.y - R.yes.h / 2, R.yes.w, R.yes.h, 16 * u);
    g.fill(); g.stroke();
    g.fillStyle = ok ? '#eaffd6' : DIM;
    g.font = `bold ${Math.round(26 * u)}px Segoe UI, sans-serif`;
    /* A later ring can cost more than the village is able to HOLD, and then
       "need 140 more" is a lie -- you can never accumulate it. The way out is a
       bigger hall or another storehouse, so say that instead. */
    const overCap = Object.entries(cost).some(([k, val]) => val > caps[k]);
    g.font = `bold ${Math.round((overCap ? 22 : 26) * u)}px Segoe UI, sans-serif`;
    g.fillText(ok ? 'Claim it'
      : overCap ? 'Your stores cannot hold this much yet'
      : 'Need ' + shortText(cost) + ' more', R.yes.x, R.yes.y);
  }
  g.fillStyle = 'rgba(255,255,255,.12)';
  g.beginPath(); g.arc(R.no.x, R.no.y, R.no.r, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.font = `bold ${Math.round(26 * u)}px Segoe UI, sans-serif`;
  g.fillText('×', R.no.x, R.no.y);
  g.restore();
}

/* Shown once on return, then dismissed by a tap anywhere. */
function awayRect() {
  const u = US(), w = Math.min(W - 80 * u, 620 * u), h = 300 * u;
  return { u, x: W / 2, y: hudTop() + (hudBot() - hudTop()) / 2, w, h };
}
/* "6.0 hours" read like a stopwatch; a whole number of hours is just hours. */
function duration(secs) {
  const mins = secs / 60;
  if (mins < 1) return 'moments';
  /* The unit is chosen from the ROUNDED figure, the same rule compact() keeps.
     Choosing it from the raw one printed "60 minutes" for anything from 59.5
     minutes up, which is not a thing anybody says about an hour -- on the
     welcome-back card, which is the one screen a returning player reads. */
  const m = Math.round(mins);
  if (m < 60) return count(m, 'minute');
  const hrs = Math.round(mins / 6) / 10;
  return hrs % 1 === 0 ? count(hrs, 'hour') : hrs + ' hours';
}
/* What selling p would take away, in the numbers its panel uses. */
const perSec = (k, v) => RES_ICON[k] + '−' + v.toFixed(2) + '/s';
function saleCost(p) {
  const b = B(p.key);
  if (b.pop) {
    const n = livedIn(p);
    if (!n) return null;
    const now = potentialRate(), after = potentialRate(p.id);
    const lost = RES.map(k => [k, now[k] - after[k]]).filter(([, v]) => v > 0.005);
    return 'Selling it sends ' + count(n, 'villager') + ' away   —   '
      + (lost.length ? lost.map(([k, v]) => perSec(k, v)).join('  ') : 'none of them were working');
  }
  if (b.jobs && b.makes && p.key !== 'hall') {
    const k = Object.keys(b.makes)[0], v = workersAt(p.id) * deliveringNow(p);
    return v > 0.005 ? 'Selling it stops ' + perSec(k, v).replace('−', '') + ' arriving' : null;
  }
  if (b.boost) {
    const wg = wellGain(p);
    /* "Takes" is already the loss. With a minus as well it read "takes
       −0.51/s", a double negative, beside rows that say "stops 🌾0.41/s
       arriving" and "— −0.39/s". */
    return wg.gain > 0.005 ? 'Selling it takes ' + wg.gain.toFixed(2) + '/s from ' + count(wg.n, 'workplace') : null;
  }
  /* A storehouse is capacity and nothing else, and its armed button said
     nothing at all unless the stores were over the line -- then the spoil
     row speaks. Half full, the second tap took nine hundred and sixty off
     every ceiling with not a word, so the player learned what they had sold
     the next time a barn filled early. The new ceilings, said the way the
     spoil row says them. */
  if (b.caps && !b.makes) {
    const room = capsWithout(p), vals = RES.map(k => room[k]);
    return 'Selling it drops storage to ' + (vals.every(v => v === vals[0]) ? vals[0] + ' each'
      : RES.map(k => RES_ICON[k] + room[k]).join('  '));
  }
  if (b.charm) {
    const now = deliveredAtMul(charmMul()), less = Math.max(0, charmSum - b.charm);
    /* A path is not only charm, and this was the one place in the game that
       said it was.

       A road is worth a single charm and it is not what a road is for: a
       villager walks it at better than twice the speed, so a paved route is
       half the reason a distant farm delivers at all. The label over a path
       about to be laid has always said so -- it tries the tile in the route
       and quotes the quicker walk, because 'charm alone understated a path by
       half or more'. This row, which is the LAST thing a player reads before
       the second tap takes the road up again, changed the charm total and
       left the paving exactly where it was. So it subtracted one charm from a
       village of sixteen, found the difference under half a hundredth of a
       unit, and dropped the figure entirely.

       Measured on a thirty-building village with every workplace's route
       paved: sixteen road tiles, not one of which quoted a rate, together
       worth 1.07 goods a second with the hands held still. The dearest single
       tile cost 0.21/s -- two thirds of what a whole farm delivers -- and the
       game had offered that same figure, out of this same sum, at the moment
       the player laid it.

       Only the path needs the second set: every other decoration is charm and
       nothing else, and for those the two calls are the same call. */
    let after;
    if (p.key === 'path') {
      const gone = new Set(pathSet); gone.delete(p.c + ',' + p.r);
      after = deliveredWithPaths(gone, less);
    } else after = deliveredAtMul(mulFor(less));
    const lost = Math.max(0, now - after);
    return 'Selling it takes ✨' + b.charm + ' charm' + (lost > 0.005 ? '   —   −' + lost.toFixed(2) + '/s' : '');
  }
  return null;
}
function drawAway() {
  if (!away) { if (awayClip && !awayClip.paused) awayClip.pause(); return; }
  const R = awayRect(), u = R.u;
  g.save();
  g.fillStyle = 'rgba(6,10,6,.66)'; g.fillRect(0, screenTop(), W, screenBot() - screenTop());
  drawAwayPic(R);
  g.fillStyle = 'rgba(16,26,15,.98)'; g.strokeStyle = 'rgba(159,232,107,.5)'; g.lineWidth = 3;
  g.beginPath(); g.roundRect(R.x - R.w / 2, R.y - R.h / 2, R.w, R.h, 24 * u); g.fill(); g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `bold ${Math.round(34 * u)}px Segoe UI, sans-serif`; g.fillStyle = '#fff';
  g.fillText('While you were away', R.x, R.y - R.h / 2 + 52 * u);
  const span = duration(away.secs);
  g.font = `${Math.round(22 * u)}px Segoe UI, sans-serif`; g.fillStyle = '#a9bd9c';
  g.fillText('your villagers kept working for ' + span
    + (away.capped ? ', as long as a village can keep' : ''),
    R.x, R.y - R.h / 2 + 92 * u);
  const parts = Object.entries(away.got).map(([k, v]) => (RES_ICON[k] + ' +') + v);
  g.font = `bold ${Math.round(40 * u)}px Segoe UI, sans-serif`; g.fillStyle = '#e8c98a';
  g.fillText(parts.length ? parts.join('     ') : 'nothing would fit', R.x, R.y + 6 * u);
  const sharedParts = away.shared ? Object.entries(away.shared)
    .filter(([, v]) => v >= 1).map(([k, v]) => RES_ICON[k] + compact(v)) : [];
  if (sharedParts.length) {
    /* Fitted, because a finished village away for twelve hours shares amounts
       in the millions and the line length is not knowable when it is written. */
    const fit = fitLines('and ' + sharedParts.join(' ') + ' shipped to the neighbours',
      R.w - 56 * u, 20 * u, 14 * u, 1);
    g.font = `${Math.round(fit.px)}px Segoe UI, sans-serif`; g.fillStyle = '#9fd6a0';
    g.fillText(fit.lines[0], R.x, R.y + 46 * u);
  } else if (away.spilled) {
    /* WHEN the stores filled is the part a player can act on. "The rest spilled"
       said the same thing about three minutes of loss as about five hours and
       fifty-seven -- six hours away at 0.9 a second is nineteen thousand wood,
       and three hundred of it was kept. */
    /* And only a time that is a time. A village left with its stores at the
       ceiling filled them after nothing at all, and the card read "nothing
       would fit" over "stores full after moments — the rest spilled": not a
       moment anyone could point to, and a "rest" of nothing. With nothing
       banked the line says what actually happened, and a fill time is only
       quoted once it is a minute or more. */
    const when = !parts.length ? 'your stores were already full when you left'
      : away.fullAfter != null && away.fullAfter >= 60 && away.fullAfter < away.secs - 60
      ? 'stores full after ' + duration(away.fullAfter) + ' — the rest spilled'
      : 'the rest spilled — your stores were full';
    const fit = fitLines(when, R.w - 56 * u, 20 * u, 14 * u, 1);
    g.font = `${Math.round(fit.px)}px Segoe UI, sans-serif`; g.fillStyle = '#f0a583';
    g.fillText(fit.lines[0], R.x, R.y + 46 * u);
  }
  /* What the beacon did with its half, because the haul above is the barn's
     half only -- without this line a returning player sees the earnings of a
     beacon village come back halved and nothing to say where the rest went. */
  if (away.beacon) {
    const b = away.beacon;
    const line = b.to > b.from
      ? (b.to >= BEACON_STAGES ? 'and the beacon is finished' : 'and the beacon rose to stage ' + b.to + ' of ' + BEACON_STAGES)
      : 'and the beacon took its half · stage ' + b.to + ' of ' + BEACON_STAGES;
    const fit = fitLines(line, R.w - 56 * u, 20 * u, 14 * u, 1);
    g.font = `${Math.round(fit.px)}px Segoe UI, sans-serif`; g.fillStyle = '#9fd6a0';
    g.fillText(fit.lines[0], R.x, R.y + 78 * u);
  }
  g.font = `bold ${Math.round(24 * u)}px Segoe UI, sans-serif`; g.fillStyle = '#9fe86b';
  g.fillText('tap to continue', R.x, R.y + R.h / 2 - 40 * u);
  g.restore();
}

/* The village is finished. Same shape as the away card on purpose: the player
   already knows a full-width card with "tap to continue" at the bottom is
   something to read and dismiss, and a new pattern for a screen seen once would
   have to teach itself. */
/* The finished island celebrating, framed above the card: a painting, and a
   loop of it come to life once the clip is actually playing. Neither is loaded
   until the card first goes up -- nobody pays for a 1 MB clip they may never
   reach -- and a missing file just leaves the painting, or nothing. */
let finaleStill = null, finaleClip = null;
function drawFinale(R) {
  const u = R.u;
  if (!finaleStill) {
    finaleStill = new Image(); finaleStill.src = 'art/finale_art.webp';
    if (!reduceMotion) {
      finaleClip = document.createElement('video');
      Object.assign(finaleClip, { muted: true, loop: true, playsInline: true, preload: 'auto' });
      finaleClip.onerror = () => { finaleClip = null; };
      finaleClip.src = 'art/finale_loop.mp4';
      finaleClip.play().catch(() => {});
    }
  }
  const live = finaleClip && finaleClip.readyState >= 2 && !finaleClip.paused;
  const pic = live ? finaleClip : finaleStill.complete && finaleStill.naturalWidth ? finaleStill : null;
  if (pic) cardPicture(R, pic, 'rgba(232,201,138,.65)');
}
/* A picture framed above a card, the finale's and the away card's.
   As wide as the card, or as tall as the room between the HUD and the card --
   and below the save warning when one is up: a finished village that cannot
   be saved drew the warning straight across the picture. */
function cardPicture(R, pic, rim) {
  const u = R.u;
  const warned = saveFailed || loadedFromBackup || otherBuild;
  const ceiling = Math.max(hudTop() + 96 * u, warned ? chipsBot() + 150 * u : 0);
  const gap = 22 * u, bot = R.y - R.h / 2 - gap, room = bot - ceiling;
  let w = R.w, h = w * 2 / 3;
  if (h > room) { h = room; w = h * 3 / 2; }
  if (h < 120 * u) return;
  const x = R.x - w / 2, y = bot - h;
  g.save();
  g.beginPath(); g.roundRect(x, y, w, h, 18 * u); g.clip();
  // the clip is 16:9 and the painting 3:2: both cover the frame from its middle
  const sw = pic.videoWidth || pic.naturalWidth, sh = pic.videoHeight || pic.naturalHeight;
  const s = Math.max(w / sw, h / sh);
  g.drawImage(pic, R.x - sw * s / 2, y + h / 2 - sh * s / 2, sw * s, sh * s);
  g.restore();
  g.strokeStyle = rim; g.lineWidth = 3;
  g.beginPath(); g.roundRect(x, y, w, h, 18 * u); g.stroke();
}
function stopFinale() { if (finaleClip) finaleClip.pause(); }

/* And the away card's: a day going by over the village, played once from
   the top each time the card comes up and left on its last frame -- evening,
   the windows lit -- for as long as the card is read. Loaded the first time
   the card is; under reduced motion it is the first frame. The day is one of
   the season's, as the title painting is: summer is the original. */
let awayStill = null, awayClip = null, awayClipFor = null;
function drawAwayPic(R) {
  if (!awayStill) {
    const k = season().key, name = k === 'summer' ? 'away_day' : 'away_' + k;
    awayStill = new Image(); awayStill.src = 'art/' + name + '.webp';
    if (!reduceMotion) {
      awayClip = document.createElement('video');
      Object.assign(awayClip, { muted: true, playsInline: true, preload: 'auto' });
      awayClip.onerror = () => { awayClip = null; };
      awayClip.src = 'art/' + name + '.mp4';
    }
  }
  if (awayClip && awayClipFor !== away) {
    awayClipFor = away; awayClip.currentTime = 0; awayClip.play().catch(() => {});
  }
  const live = awayClip && awayClip.readyState >= 2 && awayClip.currentTime > 0;
  const pic = live ? awayClip : awayStill.complete && awayStill.naturalWidth ? awayStill : null;
  if (pic) cardPicture(R, pic, 'rgba(159,232,107,.5)');
}

/* The big moments, filmed: the hall raised a level, a ring of land claimed,
   the beacon lit. Each is the most expensive thing on offer at the time, and
   the only sign one was done was the scaffolding coming down or the grass
   getting wider. A short clip of it plays under the goal strip -- confetti
   and doves for the hall, mist leaving the shore, the lamp catching -- and
   fades by itself. It takes no taps: a player in the middle of placing
   something keeps placing it. Each clip is loaded the first time its moment
   comes, never before; under reduced motion it is the clip's first frame. */
const SHOW_TIME = 7;                  // seconds on screen, the clips are 6.6
const showArt = {};                   // name -> { still, clip }
let show = null;                      // { name, caption, t }
let showNext = null;                  // [name, caption] waiting for the one on screen
function celebrate(name, caption) {
  let a = showArt[name];
  if (!a) {
    a = showArt[name] = { still: new Image(), clip: null };
    a.still.src = 'art/' + name + '.webp';
    if (!reduceMotion) {
      const v = a.clip = document.createElement('video');
      Object.assign(v, { muted: true, playsInline: true, preload: 'auto' });
      v.onerror = () => { a.clip = null; };
      v.src = 'art/' + name + '.mp4';
    }
  }
  if (show && show.name !== name && showArt[show.name].clip) showArt[show.name].clip.pause();
  if (a.clip) { a.clip.currentTime = 0; a.clip.play().catch(() => {}); }
  show = { name, caption, t: 0 };
}
/* Each level has its own: the bell and doves for the first, the new clock tower
   by morning, then by dusk with fireworks, and the confetti for the last. */
const celebrateHall = lvl => celebrate(lvl < HALL_MAX ? 'hall_up_' + lvl + '_clip' : 'hall_up',
                                       'Town hall · level ' + lvl);
/* The first of each working building is a moment too: the first roof, the
   first field, the first wood coming in, then what opens stone, or doubles
   the bread, or brings the traders. Only the first -- a third mill is just
   more flour. The decorations that make a place of it get one as well; the
   path, fence and hedge do not, being laid by the dozen. */
const FIRST_CLIP = { house: 'A first home', farm: 'The fields are sown',
                     lumber: 'The woodcutters are in', well: 'The well is dug',
                     quarry: 'The quarry is open', store: 'The storehouse is ready',
                     mill: 'The mill is turning', market: 'The market is open',
                     flowers: 'The first flowers', bench: 'A bench to sit on',
                     lamp: 'A light for the evening', banner: 'The village colours',
                     statue: 'A statue for the square' };
function celebrateFirst(p) {
  if (!FIRST_CLIP[p.key] || lvlOf(p) !== 1) return;
  if (placed.some(q => q !== p && q.key === p.key && q.t >= 1)) return;
  celebrate('first_' + p.key + '_clip', FIRST_CLIP[p.key]);
}
// as celebrate, but never cutting into a clip already playing
function celebrateAfter(name, caption) {
  if (show) showNext = [name, caption];
  else celebrate(name, caption);
}
function stepShow(dt) {
  if (!show) return;
  show.t += dt;
  if (show.t >= SHOW_TIME) {
    const c = showArt[show.name].clip; show = null; if (c) c.pause();
    if (showNext) { const n = showNext; showNext = null; celebrate(...n); }
  }
}
function drawShow() {
  if (!show) return;
  const u = US(), { still, clip } = showArt[show.name];
  const live = clip && clip.readyState >= 2 && clip.currentTime > 0;
  const pic = live ? clip : still.complete && still.naturalWidth ? still : null;
  if (!pic) return;
  const t = show.t;
  const a = Math.min(1, t / 0.35, (SHOW_TIME - t) / 0.6);
  // below the goal strip, and below the save warning when one is up
  const warned = saveFailed || loadedFromBackup || otherBuild;
  const top = chipsBot() + (warned ? 150 : 84) * u;
  const w = Math.min(W - 48 * u, 560 * u), h = w * 9 / 16, x = W / 2 - w / 2;
  const y = top + (1 - a) * 14 * u;
  g.save();
  g.globalAlpha = a;
  g.beginPath(); g.roundRect(x, y, w, h, 16 * u); g.save(); g.clip();
  g.drawImage(pic, x, y, w, h);
  g.restore();
  g.strokeStyle = 'rgba(232,201,138,.75)'; g.lineWidth = 3; g.stroke();
  const txt = show.caption;
  g.font = `bold ${Math.round(22 * u)}px Segoe UI, sans-serif`;
  const pw = g.measureText(txt).width + 44 * u, ph = 40 * u, py = y + h - ph / 2;
  woodPanel(W / 2 - pw / 2, py - ph / 2, pw, ph, ph / 2);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#e8c98a';
  g.fillText(txt, W / 2, py);
  g.restore();
}

function drawFinished() {
  /* One card at a time, and this one waits for all of them.

     Finish the village, leave the card up, put the phone down for an hour and
     come back: grantAway raises the away card on top of this one and both drew
     at once -- two dimmed screens, two "tap to continue", and the text of each
     straight through the other. A tap cleared only the away card, so it was
     recoverable, but the frame was a mess.

     It yields rather than pre-empts: the goal banner says what was just
     finished, the away card says what was missed while you were gone, and the
     claim dialogue is a question waiting for an answer. This is the one that
     will still be true afterwards. */
  if (!finishedUp()) return;
  const R = awayRect(), u = R.u;
  g.save();
  g.fillStyle = 'rgba(6,10,6,.66)'; g.fillRect(0, screenTop(), W, screenBot() - screenTop());
  drawFinale(R);
  g.fillStyle = 'rgba(16,26,15,.98)'; g.strokeStyle = 'rgba(232,201,138,.65)'; g.lineWidth = 3;
  g.beginPath(); g.roundRect(R.x - R.w / 2, R.y - R.h / 2, R.w, R.h, 24 * u); g.fill(); g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `bold ${Math.round(34 * u)}px Segoe UI, sans-serif`; g.fillStyle = '#fff';
  g.fillText('Your village is finished', R.x, R.y - R.h / 2 + 52 * u);
  g.font = `${Math.round(22 * u)}px Segoe UI, sans-serif`; g.fillStyle = '#a9bd9c';
  g.fillText('every goal done, the whole island yours', R.x, R.y - R.h / 2 + 92 * u);
  /* Counts rather than a score: the village IS the score, and these are the
     four numbers that say how far it came.

     Two lines of two, not one line of four. All four on one line came to 1031
     logical pixels on a tall phone -- off both edges of a 1024 screen -- and it
     could not shrink, because the floor I handed fitLines was the size I started
     it at. The sweep caught it on the first run, which is the whole reason the
     finished card is one of the states it walks. */
  const pairs = [count(finished.villagers, 'villager') + '   ·   ' + count(finished.buildings, 'building'),
                 count(finished.trades, 'trade') + ' filled   ·   ' + finished.charm + ' charm'];
  g.fillStyle = '#e8c98a';
  pairs.forEach((line, i) => {
    const fit = fitLines(line, R.w - 56 * u, 27 * u, 18 * u, 1, 'bold ');
    g.font = `bold ${Math.round(fit.px)}px Segoe UI, sans-serif`;
    g.fillText(fit.lines[0], R.x, R.y - 2 * u + i * 38 * u);
  });
  g.font = `${Math.round(20 * u)}px Segoe UI, sans-serif`; g.fillStyle = '#a9bd9c';
  g.fillText('the villagers will keep at it for as long as you like', R.x, R.y + 74 * u);
  g.font = `bold ${Math.round(24 * u)}px Segoe UI, sans-serif`; g.fillStyle = '#9fe86b';
  g.fillText('tap to continue', R.x, R.y + R.h / 2 - 40 * u);
  g.restore();
}

/* Sound you cannot switch off is worse than no sound, so the toggle sits in the
   HUD rather than in a settings screen this game does not have. */
function muteRect() {
  const u = US();
  return { x: W - 52 * u, y: hudTop() + 52 * u, r: 34 * u };
}
function drawMute() {
  const R = muteRect(), u = US();
  g.save();
  woodPanel(R.x - R.r, R.y - R.r, R.r * 2, R.r * 2, R.r);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `${Math.round(30 * u)}px Segoe UI, sans-serif`;
  g.fillStyle = muted ? '#8d9487' : '#fff';
  g.fillText(muted ? '🔇' : '🔊', R.x, R.y + 1 * u);
  g.restore();
}

/* ---------- building panel ----------
   One definition drives both the drawing and the hit-testing, the same
   discipline as the build bar, so what you can tap cannot drift from what you
   can see. */
function panelRects() {
  const u = US(), tabs = tabRects();
  const p = panel == null ? null : byId(panel);
  const btn = !!p;                             // every building has an upgrade button
  // 268 not 232: the efficiency line and the hall's village summary sit between
  // the blurb and the buttons, and at the old height they touched the buttons
  /* The panel is as wide as the screen lets it be, and the screen is 1024
     logical pixels wide on every device there is -- the shape of a phone
     changes the HEIGHT, never the width.

     This was 720 * u, which tied the panel's width to the scale that exists to
     make TEXT bigger on a tall screen. On a tall phone that came to 960; on a
     tablet or a desktop it came to 720, so the widest screens got the narrowest
     panel and the market's line ran out of the side of it. */
  const w = Math.min(W - 48 * u, 960), h = (btn ? 268 : 152) * u;
  const y = tabs[0].y - tabs[0].h / 2 - 14 * u - h / 2;
  const dec = !!(p && isDecor(p.key)), by = y + h / 2 - 44 * u, bh = 60 * u, gap = 10 * u;
  // a decoration has no upgrade, so its two buttons share the width differently
  const mw = dec ? w * 0.34 : w * 0.24, sw = dec ? w * 0.54 : w * 0.24;
  const uw = w - mw - sw - gap * 2 - 40 * u;
  let bx = W / 2 - (mw + sw + (dec ? 0 : uw + gap) + gap) / 2;
  const move = { x: bx + mw / 2, y: by, w: mw, h: bh }; bx += mw + gap;
  const sell = { x: bx + sw / 2, y: by, w: sw, h: bh }; bx += sw + gap;
  const up   = dec ? null : { x: bx + uw / 2, y: by, w: uw, h: bh };
  return { u, x: W / 2, y, w, h, btn, dec, move, sell, up,
    close: { x: W / 2 + w / 2 - 34 * u, y: y - h / 2 + 34 * u, r: 27 * u } };
}
/* What a well is really worth where it stands.

   It advertises "+35% faster", which is true of the RATE and not of what
   arrives: a villager still has to walk the same distance, so a well beside a
   good producer returned 20% and beside a distant one 9%. Same fault as the
   upgrade panel quoting rated output. This counts the delivered difference the
   well actually makes to everything in reach, which also says plainly when one
   has been put somewhere it helps nothing. */
/* What this well would lift at another level. The well is set to that level
   for the length of the sum and put back, so boostAt answers for it the way it
   answers for every other well -- one formula, not a second copy of it. */
function wellGainAtLevel(w, lvl) {
  const keep = { lvl: w.lvl, t: w.t };
  w.lvl = lvl; w.t = 1;
  try { return wellGain(w); } finally { w.lvl = keep.lvl; w.t = keep.t; }
}
function wellGain(w) {
  let n = 0, gain = 0;
  for (const p of placed) {
    if (!established(p) || !B(p.key).makes || !B(p.key).jobs) continue;
    const withIt = boostAt(p), without = boostAt(p, w.id);
    if (withIt === without) continue;
    n++;
    const hands = workersAt(p.id);
    /* Nor a shed standing in scaffolding, which produces nothing to speed up.
       It still counts towards the reach above -- the spot will lift it once the
       work is done, and that is what the count is about -- but it adds nothing
       to the figure. Measured with a farm in reach mid-upgrade: the well's
       panel claimed +0.158/s where the village gained 0.100. */
    if (!hands || p.t < 1) continue;       // boosting an unstaffed shed adds nothing
    const k = Object.keys(B(p.key).makes)[0], r = rateOf(p, k) * charmMul();
    gain += hands * (deliveredWith(p, r * withIt) - deliveredWith(p, r * without));
  }
  return { n, gain };
}

/* What a well put HERE would add. wellGain answers the same question for one
   that already exists, by taking it away again; this one has nothing to take
   away, so it adds the boost on instead.

   Placing a well was the last blind decision left in the game: forty wood on a
   building whose entire worth is which workplaces happen to fall inside a
   radius the player cannot see. */
/* The working places a well standing here would reach. The count the badge
   gives, and the one thing a new well and a move have always agreed about --
   so it is written once rather than twice. */
function wellReachAt(c, r) {
  const bw = B('well'), out = [];
  for (const p of placed) {
    const b = B(p.key);
    if (!established(p) || !b.makes || !b.jobs) continue;
    const dx = (c + (bw.w - 1) / 2) - (p.c + (b.w - 1) / 2);
    const dy = (r + (bw.h - 1) / 2) - (p.r + (b.h - 1) / 2);
    if (Math.hypot(dx, dy) <= bw.boostR) out.push(p);
  }
  return out;
}
function wellGainAt(c, r, lvl) {
  const bw = B('well'), near = wellReachAt(c, r);
  let gain = 0;
  for (const p of near) {
    const b = B(p.key);
    const hands = workersAt(p.id);
    // in reach, but nobody there to speed up -- or nothing yet to speed up,
    // because the scaffolding is still on it. Same rule as wellGain above.
    if (!hands || p.t < 1) continue;
    const without = boostAt(p), withIt = without + bw.boost * outMul(lvl);
    const base = rateOf(p, Object.keys(b.makes)[0]) * charmMul();
    gain += hands * (deliveredWith(p, base * withIt) - deliveredWith(p, base * without));
  }
  return { n: near.length, gain };
}
/* And what MOVING a well that already exists would do to the village.

   wellGainAt answers for a well that is not there yet, and every term in it
   says so: the baseline is boostAt(p), the village exactly as it stands, and
   the level is the level a new well is built at. Pointed at a well being
   moved, all three are wrong at once. The well is still standing at its old
   spot, so its own lift is already inside the baseline and the badge quotes
   the marginal worth of a SECOND well; the level is taken as one, so a level
   four well is priced at under half its strength; and nothing anywhere
   subtracts what the old spot is about to stop lifting.

   Measured on a level four well lifting two workplaces by 0.52/s: every
   figure the badge gave for moving it was wrong, and three of the four were
   wrong in their SIGN. Two tiles over read '+0.13/s' where the village lost
   0.17. A shuffle that changed nothing at all read '+0.18/s'. Carrying it
   off to a far corner read 'reaches no workplace', which sounds merely
   useless while quietly throwing the whole 0.52/s away. A green pill
   promising a gain, over a move that costs.

   There is no sum to get right here. What a move asks is what the village
   would deliver with this well over there instead of here, and that is one
   subtraction: stand it at the new spot, ask, put it back -- the same trick
   wellGainAtLevel already plays with the level. Nothing cached needs
   clearing: a well is not a store and moving one changes no route, which is
   the whole of what travelCache holds. */
function wellMoveGain(w, c, r) {
  const near = wellReachAt(c, r), now = deliveredAtMul(charmMul());
  const keep = { c: w.c, r: w.r };
  w.c = c; w.r = r;
  try { return { n: near.length, gain: deliveredAtMul(charmMul()) - now }; }
  finally { w.c = keep.c; w.r = keep.r; }
}
/* The reach, drawn on the ground. A circle in GRID space, which is an ellipse
   on screen -- the same two-to-one squash everything else lives in. */
/* The ground a workplace's villagers actually cover, and which of it is paved.

   The village has been telling the player about walking time for a while
   now. A badge on a workplace losing more than half of itself to the carry.
   A round-trip row on its panel. A delivered figure that quotes what ARRIVES
   rather than what the building is rated for. And, on the card of any
   villager, the seconds they spend walking each load.

   Every one of those is a NUMBER, and the fix for all of them is a place.
   The badge says a farm is losing 47 per cent and the honest advice under it
   is 'a storehouse or a road' -- and then the player is on their own, because
   nothing in the game has ever shown them where the walk goes. Roads went
   unlaid not because the saving was hidden but because the ROUTE was: you
   cannot pave a line you cannot see.

   So: the line itself. It is a straight one, because a villager walks
   straight at the thing they are walking to -- see step1 -- which is the same
   assumption routeOf prices the journey with, so the picture and the
   arithmetic cannot disagree. Sampled in the same way, and each stretch drawn
   in the colour of what it is: pale where the ground is paved and the walk is
   quick, amber where it is not and a road would pay. */
const ROUTE_STEPS = 56;
function routeLine(p) {
  if (!established(p) || storesItself(p.key)) return null;
  const b = B(p.key);
  if (!b.makes || !b.jobs) return null;
  const c = centreOf(p), st = nearestStore(c.x, c.y);
  if (!st) return null;
  const d = centreOf(st);
  return { from: c, to: { x: d.x, y: d.y + DROP_Y }, store: st };
}
function drawRoute(p, alpha) {
  const line = routeLine(p);
  if (!line) return;
  const { from, to } = line;
  /* A fixed width ON SCREEN, so the camera cannot decide whether this can be
     read. Drawn inside the world transform, a flat line width is a width in
     WORLD pixels: at the zoom the village is usually looked at -- 0.56, the
     whole island in frame, which is exactly when somebody is thinking about
     where a road should go -- a four pixel line came out at 2.2 on the canvas
     and under one on the glass of a phone. It was being drawn the whole time
     and could not be seen. The badges above are in screen units for the same
     reason, and the note beside them calls them information rather than
     scenery; this is information. */
  const sc = camScale();
  g.save();
  g.globalAlpha = alpha;
  g.lineCap = 'round';
  /* A dark stroke under the whole run first. Half of any route crosses roofs
     and the other half crosses grass, and one colour is lost in one of them
     whichever is picked -- the same thing the well's ring had to solve. */
  g.strokeStyle = 'rgba(8,18,26,.75)'; g.lineWidth = 17 / sc;
  g.beginPath(); g.moveTo(from.x, from.y); g.lineTo(to.x, to.y); g.stroke();
  for (let i = 0; i < ROUTE_STEPS; i++) {
    const f0 = i / ROUTE_STEPS, f1 = (i + 1) / ROUTE_STEPS;
    const mx = from.x + (to.x - from.x) * (f0 + f1) / 2;
    const my = from.y + (to.y - from.y) * (f0 + f1) / 2;
    g.strokeStyle = onPath(mx, my) ? 'rgba(190,240,255,.95)' : 'rgba(255,200,110,.95)';
    g.lineWidth = 10 / sc;
    g.beginPath();
    g.moveTo(from.x + (to.x - from.x) * f0, from.y + (to.y - from.y) * f0);
    g.lineTo(from.x + (to.x - from.x) * f1, from.y + (to.y - from.y) * f1);
    g.stroke();
  }
  g.restore();
}
/* Which routes the player is being shown, and why.

   One when a workplace's panel is open: that building's walk, because its
   panel is already quoting the round trip in seconds and this is where those
   seconds go.

   All of them while a road is in hand, which is the state the whole thing is
   for. A player holding a path has exactly one question -- where do I put it
   -- and the answer is the amber. Dimmer, because fifteen lines at full
   strength is a cat's cradle rather than a village. */
function routesShown() {
  /* The moment the road is PICKED UP, not the moment a tile is first touched.

     This asked for a ghost to exist, and a ghost does not exist until the
     player has already tapped somewhere -- there is no hovering on a phone.
     So the lines would have appeared after the first guess, which is after
     the decision they are there to inform. A road in hand IS the question. */
  if (ghostKey() === 'path') return { list: placed, alpha: 0.5 };
  if (panel != null) { const p = byId(panel); return p ? { list: [p], alpha: 0.95 } : null; }
  return null;
}
function drawRoutes() {
  const r = routesShown();
  if (!r) return;
  for (const p of r.list) drawRoute(p, r.alpha);
}
function drawWellReach(c, r, alpha) {
  const bw = B('well'), w = tileToWorld(c + (bw.w - 1) / 2, r + (bw.h - 1) / 2);
  const rx = bw.boostR * TW / Math.SQRT2, ry = bw.boostR * TH / Math.SQRT2;
  g.save();
  g.globalAlpha = alpha;
  g.fillStyle = 'rgba(120,190,240,.16)';
  g.strokeStyle = 'rgba(150,215,255,.85)'; g.lineWidth = 3;
  g.setLineDash([14, 10]);
  g.beginPath(); g.ellipse(w.x, w.y, rx, ry, 0, 0, 7); g.fill(); g.stroke();
  g.restore();
}

/* What charm is really adding, in goods per second rather than as a percentage
   of a rate nobody receives. Same treatment as the well: with minus without. */
/* What the working village delivers with charm multiplying its rates by m. */
function deliveredAtMul(m) {
  let total = 0;
  for (const p of placed) {
    const b = B(p.key);
    /* p.t, not established. established asks whether a building has ever
       finished, which is the right question for a storehouse keeping its
       capacity and the wrong one here: a workplace under scaffolding delivers
       nothing, first build or upgrade alike, and counting it put a bonus on
       goods that never arrive.

       Measured over 900 simulated seconds with one of a village's two
       workplaces held under scaffolding: the charm chip read +0.0798/s against
       a real 0.0533/s -- charm on minus charm off -- overstating by half. The
       same sum is behind the figure over a decoration before it is bought and
       the one on the panel when it is sold, so all three were out by the same
       amount. p.t >= 1 implies established, so this is the narrower test and
       the whole of the old one. */
    if (p.t < 1 || !b.makes || !b.jobs) continue;
    const hands = workersAt(p.id);
    if (!hands) continue;
    total += hands * deliveredWith(p, rateOf(p, Object.keys(b.makes)[0]) * boostAt(p) * m);
  }
  return total;
}
const mulFor = sum => 1 + Math.min(CHARM_CAP, sum / CHARM_FULL * CHARM_CAP);
/* The same question asked of a village whose roads are not the ones it has:
   what would it deliver with THESE paved tiles and THIS much charm.

   Laying a path and taking one up are the same sum pointing opposite ways,
   and they were written twice -- once here, correctly, for the label over a
   path about to go down, and once in saleCost, where the paving was simply
   left out. One function now, because a figure quoted to buy something and
   a figure quoted to sell the same thing have to come from the same place
   or they will disagree, and they did. */
function deliveredWithPaths(set, sum) {
  const keepSet = pathSet, keepCache = travelCache;
  pathSet = set; travelCache = new Map();
  try { return deliveredAtMul(mulFor(sum)); }
  finally { pathSet = keepSet; travelCache = keepCache; }
}
function charmDelivered() {
  const m = charmMul();
  return m <= 1 ? 0 : deliveredAtMul(m) - deliveredAtMul(1);
}
/* And what ONE more decoration would add, before it is bought. The placement
   label said nothing at all for a decoration -- a 150-wood statue went down
   with no number over it, where every building showed what its spot was worth,
   and the only reason to buy one is that number. */
function charmGainFrom(extra) {
  const now = charmMul(), then = mulFor(charmSum + extra);
  return then <= now ? 0 : deliveredAtMul(then) - deliveredAtMul(now);
}
/* Everything placing this decoration HERE would add: its charm, and for a path
   the quicker walk over it as well -- charm alone understated a path by half or
   more, and the path is the one decoration whose spot matters. The tile is
   tried in the route calculation and then taken out again. */
/* The label asks every frame, and for a path the answer re-walks every
   workplace's route: 1.6 ms of a 5 ms frame on a desktop, several times that on
   a phone, for a number that only changes when the finger moves to another tile
   or the village changes under it. Held for a quarter of a second per tile. */
let decorMemo = null;
function decorGainCached(key, c, r) {
  const now = performance.now(), id = key + ',' + c + ',' + r;
  if (decorMemo && decorMemo.id === id && now - decorMemo.at < 250) return decorMemo.v;
  decorMemo = { id, at: now, v: decorGainAt(key, c, r) };
  return decorMemo.v;
}
function decorGainAt(key, c, r) {
  const add = usefulCharm(key);
  if (key !== 'path') return charmGainFrom(add);
  const now = deliveredAtMul(charmMul());
  return Math.max(0, deliveredWithPaths(new Set(pathSet).add(c + ',' + r), charmSum + add) - now);
}

/* How the village is doing as a whole, shown on the hall.

   Everything the player needs to improve a village has been per-building until
   now, so nothing ever said "you have three villagers standing about" or "your
   workplaces average 48%" -- which are the two facts that actually tell you
   what to do next. Idle villagers mean build a workplace; a low average means
   move a storehouse or lay a road. */
/* What the player can actually DO about a shortage, right now.

   The hall said "1 post empty -- build a house" directly above a House card
   reading 2/2 and locked, and "idle -- build a workplace" with every workplace
   at its limit. Advice the tray refuses is worse than none. So: build one if
   the hall allows another; otherwise improve one, if that adds what is short
   and the hall allows the level; otherwise raise the hall. */
function remedy(short) {
  const kinds = BUILDINGS.filter(b => b.key !== 'hall' && !b.decor
    && (short === 'people' ? b.pop : b.jobs && b.makes));
  const noun = short === 'people' ? 'a house' : 'a workplace';
  if (kinds.some(b => permitted(b.key))) return 'build ' + noun;
  const gains = p => { const i = upInfo(p);
    if (i.max || i.gate || p.t < 1) return false;
    const next = { ...p, lvl: lvlOf(p) + 1 };
    return short === 'people' ? popOf(next) > popOf(p) : jobsOf(next) > jobsOf(p); };
  if (placed.some(p => kinds.some(b => b.key === p.key) && gains(p))) return 'improve ' + noun;
  const h = hallOf();
  if (h && !upInfo(h).max) return 'raise the town hall';
  return short === 'people' ? 'no more houses possible' : 'no more workplaces possible';
}
function villageStats() {
  const prod = placed.filter(p => established(p) && B(p.key).jobs && B(p.key).makes && p.key !== 'hall');
  let working = 0;
  for (const p of placed) if (B(p.key).jobs) working += workersAt(p.id);
  const idle = Math.max(0, villagers.length - working);
  // measured against what each would give in a good spot -- see reachOf
  const effs = prod.map(p => reachOf(p)).filter(e => e !== null);
  const avg = effs.length ? effs.reduce((a, b) => a + b, 0) / effs.length : null;
  const slots = placed.reduce((n, p) => n + (established(p) ? jobsOf(p) : 0), 0);
  return { villagers: villagers.length, working, idle, avg, slots, workplaces: prod.length };
}

/* A single row of panel text, shrunk until it fits the card.

   The panel sets a size and draws, and the strings on it carry counts, costs,
   rates and advice whose length is not knowable when the layout is written --
   the same way the banners did before they started running off the screen. The
   village summary is the worst of them: "18 villagers - 8 posts with nobody in
   them - build or improve a house - workplaces at 74% of their best" is half
   again as wide as the card it sits on. */
/* One row of the panel, on one line, inside the panel.

   fitLines shrinks, but it will not go below the readable floor, so a row that
   is too long at that floor is simply drawn past the side of the panel -- the
   market's line ran 32 logical pixels over its budget, because a market is the
   one building that both produces and stores and so collects every clause the
   panel knows how to add.

   These rows are a list of facts joined by a middle dot, written most important
   first, so the honest way to lose the width is to lose the last fact rather
   than the right-hand edge of all of them. The first clause is always kept: a
   row that cannot fit even its opening is a string that needs rewriting, and
   the sweep still reports it. */
const ROW_SEP = '   ·   ';
/* What selling storage costs, in the order it matters.

   Written for two kinds, "Selling it drops storage to 🪵1500  🌾1500  —  🪵230
   would spoil" fitted; the third kind made it 1062 logical pixels on a 1024
   screen, off the glass and out of its panel on every phone shape -- and it
   joined its clauses with a dash, so the row could not shed one to fit. The
   goods that would be lost come first, because that is the warning; the new
   ceiling follows as a clause the row may drop, and when every kind's ceiling
   is the same number, which it nearly always is, it is said once. */
function spoilText(room, spoiling) {
  const vals = RES.map(k => room[k]);
  const ceiling = vals.every(v => v === vals[0]) ? vals[0] + ' each'
    : RES.map(k => RES_ICON[k] + room[k]).join('  ');
  return 'Selling it spoils ' + spoiling.map(([k, v]) => RES_ICON[k] + v).join(' ')
    + ROW_SEP + 'storage drops to ' + ceiling;
}
/* A row sheds from the RIGHT, so the clauses have to be in order of what the
   player would miss most -- and for a long time they were in the order they
   were written in.

   Every row about a building under construction said "under scaffolding"
   first and what the work will make it last, so the promise the player had
   just paid for was the first thing thrown away. On a 360-wide phone -- the
   only shape this game ships to -- a storehouse going up read "Holds 🪵400
   🌾400 🪨400   ·   under scaffolding" and never said what it would hold,
   and a well being improved never said what it would lift. Measured: the
   full storehouse row is 925 logical pixels against the 885 the panel has
   at that size, and the promise alone is the 190 that do not fit.

   The state is the clause to lose. A building under scaffolding is already
   saying so in three other places -- the scaffolding is drawn on it, the
   upgrade button reads "Building...", and the plot shows the work -- while
   the figure it will reach is written down exactly once, here. This file
   has been here before: the workplace row lost "stores full, nobody working
   it" the same way, and that was fixed by taking the arrow out rather than
   by putting the clauses in the right order.

   So: promise first, state last, in every row that has both. */
function panelRow(text, x, y, maxW, px, colour, weight) {
  let parts = String(text).split(ROW_SEP);
  let fit = fitLines(parts.join(ROW_SEP), maxW, px, px * 0.62, 1, weight);
  while (parts.length > 1 && g.measureText(fit.lines[0]).width > maxW) {
    parts.pop();
    fit = fitLines(parts.join(ROW_SEP), maxW, px, px * 0.62, 1, weight);
  }
  g.fillStyle = colour;
  g.fillText(fit.lines[0], x, y);
}
/* One villager's card.

   Deliberately not pinned to the villager: they walk, and a label that walks
   with them is a label nobody can read. It sits where the building panel
   sits, and the person it belongs to gets a ring round their feet so there
   is no doubt which of seventy-two it is. */
function drawWho() {
  if (modalUp()) return;
  const v = whoIs();
  if (!v) { who = null; return; }
  const u = US(), tabs = tabRects();
  const w = Math.min(W - 48 * u, 960), h = 152 * u;
  const y = tabs[0].y - tabs[0].h / 2 - 14 * u - h / 2;
  g.save();
  g.fillStyle = 'rgba(14,22,13,.95)'; g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 2.5;
  g.beginPath(); g.roundRect(W / 2 - w / 2, y - h / 2, w, h, 20 * u); g.fill(); g.stroke();
  g.textAlign = 'left'; g.textBaseline = 'middle';
  const lx = W / 2 - w / 2 + 26 * u, tw = w - 56 * u;
  const trade = tradeOf(v);
  const head = villagerName(v) + ROW_SEP + trade.name
    + (trade.at ? ' at the ' + B(trade.at.key).name.toLowerCase() : '');
  panelRow(head, lx, y - h / 2 + 38 * u, tw, 30 * u, '#fff');
  panelRow(doingOf(v), lx, y - h / 2 + 80 * u, tw, 22 * u, '#bccfae', '');
  const trip = roundTripOf(v);
  panelRow(!trip ? 'No post, so nowhere to walk'
    : trip.here ? 'Works where the goods are kept, so barely walks at all'
    : 'Walks ' + trip.secs.toFixed(1) + 's to the ' + B(trip.store.key).name.toLowerCase() + ' and back, every load',
    lx, y - h / 2 + 118 * u, tw, 22 * u, DIM, '');
  g.restore();
}
function drawPanel() {
  if (panel == null || modalUp()) return;
  const p = byId(panel); if (!p) { panel = null; return; }
  const b = B(p.key), R = panelRects(), u = R.u;
  g.save();
  g.fillStyle = 'rgba(14,22,13,.95)'; g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 2.5;
  g.beginPath(); g.roundRect(R.x - R.w / 2, R.y - R.h / 2, R.w, R.h, 20 * u); g.fill(); g.stroke();
  g.textAlign = 'left'; g.textBaseline = 'middle';
  const lx = R.x - R.w / 2 + 26 * u;
  g.font = `bold ${Math.round(30 * u)}px Segoe UI, sans-serif`; g.fillStyle = '#fff';
  /* The beacon has stages, not levels -- it is never upgraded, it fills --
     and its own row says "Stage 3 of 5". The header said "Level 3" over it,
     one number under two names. */
  g.fillText(b.icon + '  ' + b.name + (B(p.key).decor || p.key === BEACON ? '' : '  ·  Level ' + lvlOf(p)),
    lx, R.y - R.h / 2 + 38 * u);
  /* The hall has three things to say -- what it allows, what the next level
     adds, and how the village is doing -- and two rows to say them in. Its
     blurb is the least useful line on the panel, so the summary takes that
     place and the allowance gets a row to itself with the additions beneath. */
  /* A find says where it came from, in two sentences, and it gets the room
     for them. Its description was written for this panel and never drawn on
     it -- no find was placed until its picture existed -- and at 1008 to 1176
     logical pixels against the 885 a phone's panel has, one line could not
     hold it at any readable size. A find cannot be sold or improved, so the
     row a sale warning would take is always free: the description takes two
     lines and its charm row moves down into that space. */
  const twoLine = isFound(p.key);
  if (twoLine) {
    const fit = fitLines(b.blurb, R.w - 56 * u, 22 * u, 22 * u * 0.62, 2, '');
    g.fillStyle = '#bccfae';
    fit.lines.forEach((l, i) => g.fillText(l, lx, R.y - R.h / 2 + 76 * u + i * fit.px * 1.22));
  } else if (p.key !== 'hall')
    panelRow(b.blurb, lx, R.y - R.h / 2 + 78 * u, R.w - 56 * u, 22 * u, '#bccfae', '');

  /* What this sale would destroy, worked out before any row is drawn.

     A storehouse gets a row of its own for this, because its whole purpose is
     capacity. A MARKET holds just as much and its row is taken by the trading
     stalls, and a hall or a farm can be over the line too. So once the sell
     button is armed -- the moment the player is actually about to do it -- the
     warning takes that row whatever the building is. It does not take it before
     then, or a market would permanently stop saying what a market is for. */
  const sellRoom = canSell(p) ? capsWithout(p) : null;
  const spoiling = sellRoom
    ? RES.map(k => [k, Math.max(0, Math.floor(res[k] - sellRoom[k]))]).filter(([, v]) => v > 0)
    : [];
  const armedHere = sellArm && sellArm.id === p.id;
  const spoilRow = (armedHere && spoiling.length) ? spoilText(sellRoom, spoiling) : null;
  /* And what a sale costs that is NOT storage. Only a storehouse ever said:
     selling a house sent its villagers away and stopped whatever they worked,
     selling a well dropped the lift to everything in reach, and the button just
     said "Tap again to sell". The row the storage warning uses, the moment Sell
     is armed, for every kind of building. */
  // and only for a building that can be sold: a find cannot, and its charm
  // row sits where a sale warning would go
  const saleRow = spoilRow || (armedHere && canSell(p) ? saleCost(p) : null);


  /* What this building does at its CURRENT level, and what the next one would
     make it -- the number is the whole reason to spend, so it is spelled out
     rather than left to the player to infer from a rising counter. */
  const nl = Math.min(p.key === 'hall' ? HALL_MAX : LVL_MAX, lvlOf(p) + 1);
  const at = (n, f) => f({ ...p, lvl: n });
  let line = '';
  if (b.jobs && b.makes) {
    const k = Object.keys(b.makes)[0], icon = RES_ICON[k];
    const n = workersAt(p.id);
    /* What ARRIVES, not what the building is rated for.

       A villager fills a load and then walks it to a store, so the throughput
       is CARRY / (fill time + travel), and that flattens hard once the rate is
       high and the walk is long. A farm seven tiles out goes from 1.40 to 6.72
       rated across its upgrades -- and from 0.22 to 0.25 delivered. Advertising
       the rated figure sold the player a fivefold improvement for two thousand
       wood and handed them fourteen percent. */
    /* Times the staff, because the panel is about the building, not about one
       villager. It quoted a single pair of hands while a two-worker farm was
       delivering nearly three times the figure. The next level is quoted with
       the hands it would REALLY get -- the ones it has plus whoever is idle --
       so a new post is never priced in before anyone can fill it. */
    /* Nothing is delivered while the scaffolding is up, and this row said
       otherwise -- on the same card whose button reads "Building…".

       An upgrade is paid for before the work is done, so the new level is in
       force the moment the player taps, and the row quoted it as though it
       were already arriving. Measured on a farm one frame after the tap:
       "🌾 1.42/s delivered", with 0.00/s reaching the granary for the next ten
       seconds. The resource chip had the same fault and was fixed; this is the
       one place the player goes to ASK what a building is doing, so it is the
       worse of the two.

       The figure the row was showing is not wasted: it is exactly what the
       building WILL deliver, which is the reason the player paid. It moves to
       the end and says so.

       And the level after this one is not quoted while this one is unbuilt.
       The row already refuses to quote a next level for an idle building --
       nought to nought is noise -- and a building that has not finished the
       step it is on has no business being sold the step beyond it. */
    const up = p.t < 1;
    line = icon + ' ' + (up ? 0 : n * deliveredOf(p)).toFixed(2) + '/s delivered';
    /* Why it is zero comes SECOND, not last.

       panelRow drops clauses from the end when the row will not fit, and on a
       tall phone the row does not fit -- so the reason a building is producing
       nothing, which is the only thing on the panel worth reading when it is
       producing nothing, was the first thing thrown away. The player was left
       with "0.00/s delivered → 0.00/s" and no explanation at either end.

       The next level is not quoted for an idle building either. Nought becomes
       nought, and the arrow between them is noise dressed as information. */
    if (up) {
      line += (n ? '   ·   ' + (n * deliveredOf(p)).toFixed(2) + '/s when it is done' : '')
        + '   ·   under scaffolding';
    } else if (!n) {
      line += '   ·   ' + (!hasRoomFor(k) ? 'stores full, nobody working it'
        : 'no villagers');
    } else if (nl > lvlOf(p)) {
      line += '  →  ' + (handsFor(p, nl) * deliveredOf(p, nl)).toFixed(2) + '/s';
    }
    /* And whether the next level opens another post, because that is where the
       jump comes from. Measured across a farm's whole ladder, the steps that add
       a pair of hands are worth three to eight times the steps that only raise
       the rate -- so "workers 3 / 3" alone makes the good upgrades and the dull
       ones look alike. */
    const nextPosts = nl > lvlOf(p) ? jobsOf({ ...p, lvl: nl }) : jobsOf(p);
    line += '   ·   workers ' + n + ' / ' + jobsOf(p)
      + (nextPosts > jobsOf(p) ? '  →  ' + nextPosts : '');
    /* A market makes something AND holds something, so it came through the
       producer branch and the storehouse branch never ran -- and it holds eight
       hundred of each, twice what a storehouse does, which is most of what the
       three hundred and twenty it costs is buying. Nothing on the panel said
       so.

       It goes BEFORE the well bonus because panelRow drops from the end when
       the row will not fit, and a market is the one building whose row runs
       long. What it holds is most of what it costs; the well bonus is on the
       well's own panel. */
    // what it is holding, for the same reason -- and the row already says why
    if (b.caps) line += '   ·   holds ' + RES.map(k => RES_ICON[k] + capsHeld(p, k)).join(' ');
    const boost = boostAt(p);
    if (boost > 1 && n) line += '   ·   +' + Math.round((boost - 1) * 100) + '% from wells';
    /* And WHO they are. Last on the row on purpose: panelRow drops clauses
       from the end when the row will not fit, and on a narrow phone the names
       are the right thing to lose -- they are the only clause here that tells
       the player nothing they need in order to decide anything. */
    if (n) line += '   ·   ' + nameList(workersOf(p.id));
    /* Skipped for a building that is its own store; otherwise the placement
       gets a line of its own, stated as the counterfactual rather than as a
       score. "Efficiency 39%" is a number the player has to interpret, and
       interpreting it wrongly is easy because it falls as a building improves.
       What it would deliver in a good spot, against what it delivers here,
       needs no interpretation at all -- and the round trip in seconds says
       where the difference goes.

       Distances used to be given in tiles, which read as a fair comparison and
       were not one: two stores both "2.0 tiles" away are a 128px walk and a
       256px walk depending on which way they lie. */
    /* A market delivers to itself, so its figure is always 100% and the row is
       better spent. So does the HALL, which counts as a store -- that is why a
       village works at all before the first storehouse is built -- and it was
       printing "0.0s round trip to the nearest store" straight through the
       village summary that shares this row. Two lines of text on top of each
       other, for as long as the panel has existed. */
    const reach = storesItself(p.key) ? null : reachOf(p);
    /* Not for a market: it makes something AND holds something, so it comes
       through here and through the market block below, and both wanted this
       row. It was drawing the same warning twice in the same place. */
    if (saleRow && p.key !== 'market')
      panelRow(saleRow, lx, R.y - R.h / 2 + 148 * u, R.w - 56 * u, 20 * u, '#e59a86', '');
    else if (reach !== null) {
      const walk = travelSecondsOf(p);
      const snug = n * bestDeliveredOf(p);
      /* Roads are the other half of the answer and the cheapest one -- five
         wood a tile against a whole building moved -- so a badly served
         workplace on bare ground is told about them. */
      const bare = routeOf(p).paved < 0.5;
      panelRow(walk.toFixed(1) + 's round trip'
        + (reach > 0.85 || !n ? '  —  well placed'
          : '  —  beside a store it would deliver ' + snug.toFixed(2) + '/s'
            + (bare ? ', or pave the route' : '')),
        lx, R.y - R.h / 2 + 148 * u, R.w - 56 * u, 20 * u,
        reach > 0.7 ? '#8fd06a' : reach > 0.45 ? '#e8c98a' : '#e59a86', '');
    }
  } else if (b.caps) {
    /* What it is holding, not what it has been paid to hold. An upgrade is
       bought before the work is done, so the level lands the instant the player
       taps -- and this row read "Holds 820" the moment a level three storehouse
       was sent to four, with 680 of it counted towards the ceiling and the other
       140 arriving when the scaffolding comes down. Measured, with the village's
       own capsSum disagreeing with the panel by exactly that much.

       The same fault the delivered row had, and the same shape of answer: what
       it holds now, why that is low, and what the work will make it -- with no
       arrow to the level beyond, because a building that has not finished the
       step it is on has no business being sold the step after it. */
    const up = p.t < 1;
    line = 'Holds ' + RES.map(k => RES_ICON[k] + capsHeld(p, k)).join('  ');
    /* Every kind it holds, and not the two it was written for.

       The Holds line above has counted all of them through RES since the
       third resource arrived. These two clauses were written when there were
       two and went on naming two, so a storehouse that holds wood, food and
       stone said it would hold wood and food -- and the row contradicted
       itself in the same breath, because the spoil warning beside it DID
       count stone: "drops storage to 🪵700  🌾700   —   🪵400 🌾255 🪨300
       would spoil", storage that will not admit to the stone it is about to
       destroy. Unfiltered, like the line it has to agree with: the only two
       buildings with a cap hold all three kinds.

       It fits because the promise now comes before the state: three kinds
       and the words is 827 logical pixels against the 885 a phone panel has,
       where three kinds behind "under scaffolding" was 1075 and was dropped
       at every size, this one included. */
    if (up) line += '   ·   ' + RES.map(k => RES_ICON[k] + capsOf(p, k)).join('  ')
      + ' when it is done   ·   under scaffolding';
    else if (nl > lvlOf(p)) line += '  →  '
      + RES.map(k => RES_ICON[k] + at(nl, q => capsOf(q, k))).join('  ');
    /* Selling storage takes its capacity with it, and anything the village is
       holding above the new ceiling is gone. That used to happen in silence --
       the goods sat there looking fine until the next delivery clamped them
       away. A storehouse has no efficiency line, so the row it would have used
       says what the sale would actually cost. */
    if (sellRoom && spoiling.length)
      panelRow(spoilText(sellRoom, spoiling), lx, R.y - R.h / 2 + 148 * u, R.w - 56 * u, 20 * u, '#e59a86', '');
    else if (saleRow)
      panelRow(saleRow, lx, R.y - R.h / 2 + 148 * u, R.w - 56 * u, 20 * u, '#e59a86', '');
  } else if (b.pop) {
    /* And who lives here, which livedIn has always answered correctly for the
       village and this row asked popOf instead: a level three house sent to four
       said "Houses 5 villagers" with four living in it and the fifth still to
       arrive. The count is worth getting right on a first house too, where the
       row used to promise three residents to a village that had none yet. */
    const up = p.t < 1;
    line = 'Houses ' + count(livedIn(p), 'villager');
    if (up) line += '   ·   ' + popOf(p) + ' when it is done   ·   under scaffolding';
    else if (nl > lvlOf(p)) line += '  →  ' + at(nl, popOf);
  } else if (b.boost) {
    /* A well that has never finished lifts nothing YET, which is not the same
       thing as a well that reaches nothing -- and the row could only say the
       second. boostAt skips a well that is not established, so the first one
       the player ever digs answered "Reaching no workplace — move it beside
       one" from the moment the hole was dug. Measured: the badge over the
       ghost promised "lifts 1 workplace · +0.36/s", the player put it exactly
       there, and its own panel told them to move it. Advice that is not merely
       useless but backwards, on the one building whose entire value is where
       it stands.

       Asked at the level it is PAYING for, through the same wellGainAtLevel
       the next-level quote uses -- it stands the well up for the length of the
       sum and puts it back, so boostAt answers for it the way it answers for
       every other well. The same shape as the delivered row and the two
       beside it: what it is worth, why that is nothing yet, and what the work
       will make it.

       Only the FIRST build. A well being improved still lifts what it lifted,
       because boostAt reads the level it is holding, and the row should go on
       saying so. lvlHeld below one is exactly "not a well yet", which is the
       test capsHeld uses for the same question about storage. */
    const up = p.t < 1, first = lvlHeld(p) < 1;
    /* What it lifts now, and what the work in hand will make it. The second
       scan only happens while the scaffolding is up, which is seconds. */
    const live = first ? { n: 0, gain: 0 } : wellGain(p);
    const grown = up ? wellGainAtLevel(p, lvlOf(p)) : live;
    const reach = first ? grown.n : live.n;
    /* And what the NEXT level would lift. Every other panel says what an
       upgrade buys; the well asked for its price with no number beside it.

       Not while this one is unbuilt, which is the rule the delivered row, the
       storage row and the house row all keep and this one did not: a well
       halfway to its second level quoted its third. A level is paid for the
       instant the player taps, so lvlOf has already moved and the arrow
       pointed one step past the step being watched. */
    const nx = !up && nl > lvlOf(p) && live.gain > 0.005 ? wellGainAtLevel(p, nl).gain : 0;
    line = !reach ? 'Reaching no workplace — move it beside one'
      : 'Lifting ' + count(reach, 'workplace') + '   ·   '
        + (up
            ? (first ? '' : '+' + live.gain.toFixed(2) + '/s delivered   ·   ')
              + (grown.gain > live.gain + 0.005 ? '+' + grown.gain.toFixed(2) + '/s when it is done   ·   ' : '')
              + 'under scaffolding'
          : live.gain > 0.005 ? '+' + live.gain.toFixed(2) + '/s delivered'
              + (nx > live.gain + 0.005 ? '  →  +' + nx.toFixed(2) + '/s' : '')
          : 'none of them worked yet');
  } else if (b.charm) {
    /* The percentage was a rate figure, and the walk does not speed up with it.
       This is the goods per second the village's decorations are really adding. */
    const cd = charmDelivered();
    line = '✨ ' + b.charm + ' charm   ·   village total ' + charmTotal()
      + (charmRoom() > 0 ? '' : ' (full)')
      + (cd > 0.005 ? '   ·   adding +' + cd.toFixed(2) + '/s delivered' : '');
  }
  if (p.key === 'hall') {
    /* What the village is allowed NOW -- and while the scaffolding is up that
       is still the OLD level, because hallLevel reads what the hall is
       HOLDING, the same rule livedIn and capsHeld follow.

       The three branches above this one each say so and then quote the step
       being built. The hall said neither. Its allowance row went up unqualified
       while the work was on, and the row beneath it quoted the level after the
       one being paid for, measured against an allowance two steps back: a hall
       halfway through level 3 read "level 4 adds 🏠+5 🌾+2 🪵+2 📦+2 ⛲+2 🌬️+2
       🏪+1" where level 4 really adds three houses and one of everything else.
       Every figure but the market overstated, and the mill introduced as new by
       the level that does not introduce it -- level 3 does, and the player had
       just bought it.

       It is the most expensive thing in the game and the six seconds of
       scaffolding are exactly when its panel gets opened, because that is the
       moment a player wants to see what nine hundred wood just bought. So
       while the work is on, the row below names the level being BUILT and what
       it will allow; once it is done, the level that could be bought next. */
    const a = HALL[hallLevel()].allow;
    const up = p.t < 1;
    line = Object.keys(a).map(k => B(k).icon + a[k]).join('  ')
      + (up ? '   ·   under scaffolding' : '');
    /* What that level adds, which is the entire reason to buy it. The hall is
       the most expensive thing in the game -- two thousand wood for the last
       step -- and its panel showed only what the village is allowed NOW, so the
       player was asked to spend that on a promise nothing stated. The mill and
       the market are not even visible in the build tray until the hall unlocks
       them, which makes it worse: the best part of the upgrade is the part you
       cannot see coming. */
    const show = up ? lvlOf(p) : (nl > lvlOf(p) ? nl : null);
    const nx = show !== null && HALL[show] ? HALL[show].allow : null;
    if (nx) {
      const add = Object.keys(nx)
        .filter(k => (nx[k] || 0) > (a[k] || 0))
        .map(k => B(k).icon + '+' + ((nx[k] || 0) - (a[k] || 0)));
      if (add.length) panelRow('level ' + show + ' adds   ' + add.join(' ')
        + (up ? ' when it is done' : ''),
        lx, R.y - R.h / 2 + 148 * u, R.w - 56 * u, 20 * u, '#a9bd9c', '');
    } else {
      /* And at the top, what is still allowed and not yet built, in the row
         the next level used to fill. A finished hall left that row blank --
         a band of nothing between the allowance and the buttons -- while the
         goal strip asked the player to "Build everything your hall allows"
         and nothing on the hall said what that still meant. */
      const left = Object.keys(a).filter(k => a[k] > countOf(k))
        .map(k => B(k).icon + '+' + (a[k] - countOf(k)));
      panelRow(left.length ? 'still to build   ' + left.join(' ') : 'every building it allows is standing',
        lx, R.y - R.h / 2 + 148 * u, R.w - 56 * u, 20 * u, '#a9bd9c', '');
    }
  }
  panelRow(line, lx, R.y - R.h / 2 + (twoLine ? 146 : 116) * u, R.w - 56 * u, 22 * u, '#e8c98a', '');
  // houses, wells and decorations have nothing else on that row
  if (saleRow && !(b.jobs && b.makes) && !b.caps && p.key !== 'market')
    panelRow(saleRow, lx, R.y - R.h / 2 + 148 * u, R.w - 56 * u, 20 * u, '#e59a86', '');

  if (p.key === 'market') {
    // its real worth is the trade it unlocks, which no number on this panel
    // would otherwise show
    if (saleRow) panelRow(saleRow, lx, R.y - R.h / 2 + 148 * u, R.w - 56 * u, 20 * u, '#e59a86', '');
    else panelRow(count(orderSlots(), 'trading stall') + '   ·   a new offer every '
      + Math.round(orderEvery()) + 's', lx, R.y - R.h / 2 + 148 * u, R.w - 56 * u, 20 * u, '#cbb6f0', '');
  }
  if (p.key === 'hall') {
    const st = villageStats();
    const empty = Math.max(0, st.slots - st.working);
    /* Which way the village is short, and what to do about it. "All at work"
       was the message whenever nobody was idle, and it reads as good news while
       usually meaning the opposite: every villager is employed, posts are
       standing empty, and another farm would do nothing. Idle villagers and
       empty posts are the two bottlenecks and they want opposite answers. */
    /* A full barn outranks both of them.

       "5 posts empty -- build a house" is sound arithmetic and terrible advice
       when the granary is already at the ceiling: the villagers that house
       brings would produce goods that are destroyed on arrival. The village
       said it anyway, for ever, because the only warning about full stores is a
       first-time hint the player has long since dismissed.

       So the hall names the BINDING constraint, and nothing binds harder than
       having nowhere to put anything. What to do about it depends on whether
       the hall still allows a storehouse; when it does not, the honest answers
       are spending and trading. */
    const full = RES.filter(isFull);
    /* Joined with the row separator, so a phone sheds the trailing clauses --
       the workplace average first -- instead of the whole row running out of
       the panel. Joined with a narrower dot, panelRow could find nothing to
       drop: with stone counted as shipped, "6 villagers · 🪵7.4k 🌾8.7k 🪨1.2k
       shared with neighbours · workplaces at …" came out 934 logical wide in
       a 922 panel on every phone shape. */
    const SEP = ROW_SEP;
    let s2 = count(st.villagers, 'villager');
    /* A finished village has no binding constraint left to name -- it has
       nothing it needs -- so the hall reports what it has given instead. */
    if (villageFinished()) s2 += SEP + (sharedText()
      ? sharedText() + ' shipped'
      : 'every goal done');
    /* "stores" only when it is all of them. Written when there were two kinds,
       it said "🪵 store full" with all three barns full and "stores full" with
       any two -- the first naming one barn of three, the second all three. */
    else if (full.length) s2 += SEP + (full.length === RES.length ? 'stores'
      : full.map(k => RES_ICON[k]).join(' ') + (full.length > 1 ? ' stores' : ' store'))
      + ' full — ' + (permitted('store') ? 'build a storehouse' : 'spend or trade');
    else if (st.idle) s2 += SEP + st.idle + ' idle — ' + remedy('jobs');
    else if (empty) s2 += SEP + count(empty, 'post') + ' empty — ' + remedy('people');
    else s2 += SEP + 'every post filled';
    if (st.avg !== null) s2 += SEP + 'workplaces at ' + Math.round(st.avg * 100) + '%';
    panelRow(s2, lx, R.y - R.h / 2 + 78 * u, R.w - 56 * u, 20 * u,
      villageFinished() ? '#a9bd9c'
      : (full.length || st.idle || empty) ? '#f0c88a'
        : (st.avg !== null && st.avg < 0.6 ? '#f0c88a' : '#a9bd9c'), '');
  }

  // close
  g.fillStyle = 'rgba(255,255,255,.12)';
  g.beginPath(); g.arc(R.close.x, R.close.y, R.close.r, 0, 7); g.fill();
  g.textAlign = 'center'; g.fillStyle = '#fff';
  g.font = `bold ${Math.round(26 * u)}px Segoe UI, sans-serif`; g.fillText('×', R.close.x, R.close.y);

  const dec = isDecor(p.key);
  /* Not a second answer to "can this be upgraded". upInfo settles the
     decoration case itself -- "a decoration has no levels" -- and canUpgrade is
     built on upInfo, so asking dec here only gave the two a way to disagree. */
  const i = upInfo(p);
  const ok = canUpgrade(p);
  const busy = p.t < 1;

  const btnFace = (r2, on, text, small, warn) => {
    g.fillStyle = warn ? 'rgba(122,58,38,.98)' : on ? 'rgba(62,104,44,.98)' : 'rgba(40,44,36,.9)';
    g.strokeStyle = warn ? '#f0a07a' : on ? '#9fe86b' : 'rgba(255,255,255,.16)'; g.lineWidth = 3;
    g.beginPath(); g.roundRect(r2.x - r2.w / 2, r2.y - r2.h / 2, r2.w, r2.h, 16 * u); g.fill(); g.stroke();
    g.fillStyle = warn ? '#ffe4d6' : on ? '#eaffd6' : DIM;
    g.textAlign = 'center';
    /* Shrink to fit rather than spill into the neighbouring button. These
       labels carry costs, shortfalls and warnings whose length is not knowable
       up front -- "Sell 77 60 (stores full)" ran clean across the Upgrade
       button next to it.

       Through the same fitter as every other string, rather than the hand-rolled
       loop that used to live here. That one tested the width AFTER setting the
       next size down, so it stopped one step early: the Upgrade label went out
       at 32px and 403 logical pixels wide in 397, which is how the contrast
       checker found it -- sampling beside the text landed on the button's own
       border. Two shrink implementations, one of them tested. */
    btnText(text, r2, (small ? 21 : 24) * u);
  };
  /* One line if it fits, and the words over the goods if it does not.

     The fitter will not shrink below the readable floor, so a label wider than
     its button at that size simply spills -- and three kinds of goods made the
     prices long enough to: on the narrowest phone a mill's "Sell  🪵470 🌾30
     🪨232" was 287 logical pixels in a 230 button and its "Upgrade to 4   🪵1165
     🪨580  🌾85" 435 in 419, running into each other in the middle of the card.
     The buttons are 80 tall, room for two lines at the size they already use,
     so nothing has to be dropped: the action on one line, what it costs or pays
     on the next. */
  function btnText(text, r2, px) {
    const maxW = r2.w - 16 * u;
    const one = fitLines(text, maxW, px, 11 * u, 1);
    const i = text.search(RES.map(k => RES_ICON[k]).join('|'));
    if (g.measureText(one.lines[0]).width <= maxW + 0.5 || i <= 0) { g.fillText(one.lines[0], r2.x, r2.y); return; }
    const parts = [text.slice(0, i).trim(), text.slice(i).trim().replace(/\s{2,}/g, ' ')];
    const size = Math.min(...parts.map(t => fitLines(t, maxW, px, 11 * u, 1).px));
    g.font = `bold ${Math.round(size)}px Segoe UI, sans-serif`;
    const lh = size * 1.12;
    g.fillText(parts[0], r2.x, r2.y - lh / 2);
    g.fillText(parts[1], r2.x, r2.y + lh / 2);
  }
  btnFace(R.move, true, 'Move', true);
  const sv = canSell(p) ? sellValue(p) : null;
  /* Show what you would ACTUALLY receive, not the nominal refund. A refund is
     clamped to the storage cap like every other grant, and on full stores the
     honest figure is zero -- which says "you would get nothing for this" far
     more plainly than a warning tacked onto the end, and fits the button. */
  /* Against the capacity that will exist AFTER the sale, which for a storehouse
     is lower than the one on screen right now. Quoting the current ceiling
     promised a refund the village would have nowhere to put. */
  const room = capsWithout(p);
  const netSell = sv && Object.fromEntries(
    Object.entries(sv).map(([k, v]) => [k, Math.max(0, Math.min(v, Math.floor(room[k] - res[k])))]));
  const backTotal = netSell ? Object.values(netSell).reduce((a, b) => a + b, 0) : 0;
  btnFace(R.sell, !!sv, !sv ? 'Cannot sell'
    /* Armed, the button stops quoting the refund and states the consequence.
       The refund is what you decide on; the second tap is what you confirm. */
    : armedHere ? (dec ? 'Tap again to remove' : 'Tap again to sell')
    /* A refund is clamped to storage like every other grant, so on full stores
       the honest figure is nothing -- and saying so plainly beats a row of
       zeroes, which reads like the label failed to fill itself in. */
    /* "Sell · nothing back" is 233 logical wide in a 209 button even at the
       readable floor, and "Remove · nothing back" is 287. Shorter says it. */
    : backTotal === 0 ? (dec ? 'Remove · none' : 'Sell · nothing')
    : (dec ? 'Remove  ' : 'Sell  ') + Object.entries(netSell)
        .filter(([, v]) => v > 0).map(([k, v]) => RES_ICON[k] + v).join(' '),
    true, armedHere);
  /* A decoration has no third button -- panelRects gives it a wider Move and
     Remove instead -- so everything below this line is about an upgrade.

     There used to be a decoration branch down there: a "Remove 🪵75 back"
     label, quoting HALF THE PRICE with no clamp on it, on a button the layout
     has never created and which would have denied the tap if it had. A second
     answer to "what do I get back", differing from the one beside it -- the
     Remove button clamps to the room the village will have, and says "Remove ·
     none" when that is nothing. It is the second removeDecor: unreachable, and
     wrong where it was reachable from. */
  if (!R.up) { g.restore(); return; }
  /* A late upgrade can cost more than the village can physically hold, and then
     the button would sit grey for ever with no hint why. Storage being a real
     constraint is the point -- it just has to say so. */
  const overCap = !canAfford(i.cost || {}) && overCaps(i.cost);
  /* What the beacon is doing, which is never "nothing".

     It comes through here as max:true, because there is no price to show and
     no button to press -- and the label for that is "Highest level", which on
     a beacon at stage two of five is simply false. It is the one building in
     the game that is always working on something, so it says what it is
     working on, and how far along, in the place the others name a cost. */
  const label = busy ? 'Building…'
    : p.key === BEACON ? beaconLabel(p)
    : i.max ? 'Highest level'
    : i.gate ? 'Needs town hall level ' + i.gate
    /* Which of the two is actually open to them. A player with all four
       storehouses the hall allows was told to get a bigger one, with no way to
       build another -- the same impossible advice the hall panel used to give.
       Storehouse LEVELS raise the ceiling as well as storehouse count, so at
       the limit there is still an answer, and it is a different one. */
    : overCap ? (atLimit('store') ? 'Needs a bigger storehouse' : 'Needs another storehouse')
    : !canAfford(i.cost) ? 'Need ' + shortText(i.cost) + ' more'
    : 'Upgrade to ' + (lvlOf(p) + 1) + '   ' + Object.entries(i.cost).map(([k, v]) => RES_ICON[k] + v).join('  ');
  g.fillStyle = ok ? 'rgba(62,104,44,.98)' : 'rgba(40,44,36,.9)';
  g.strokeStyle = ok ? '#9fe86b' : 'rgba(255,255,255,.16)'; g.lineWidth = 3;
  g.beginPath(); g.roundRect(R.up.x - R.up.w / 2, R.up.y - R.up.h / 2, R.up.w, R.up.h, 16 * u); g.fill(); g.stroke();
  /* Through the fitter, like every other label. This button was drawn by its
     own code rather than by btnFace beside it, at a fixed size with no shrinking
     at all -- so EVERY upgrade label overflowed its button, by six logical
     pixels on a well and forty-three on a market. Two buttons on the same card,
     drawn two different ways, and only one of them fitted. */
  g.fillStyle = ok ? '#eaffd6' : DIM;
  btnText(label, R.up, 24 * u);
  g.restore();
}

function draw() {
  glowsDrawn = 0;
  stepAmbience();
  fitCanvas();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#0e1410'; g.fillRect(0, 0, W, VH);
  g.save(); g.translate(0, OY);
  g.save(); camApply(); drawWorld(); g.restore();
  drawSky();                                   // dusk and night wash over the world
  /* Neither over lamplight, nor over the badges.

     The badges are the only writing in the world -- the hall's level, the
     amber "!" for a post with nobody at it, the "-N%" for one losing itself
     to the walk, the tick that says a building can grow -- and they were
     painted under the wash along with the roofs they label. Measured off
     finished frames: "Lv 3" reads 9.7 against its pill at noon and 4.34 at
     midnight, "-51%" 9.8 and 4.44, both under the 4.5 this game holds text
     to. Nothing had ever looked, because every contrast check in the harness
     samples at the moment the glyph is drawn and the wash goes on afterwards.

     The same reasoning as the lamps, and with more force: a lamp that gets
     dimmed by the night is merely wrong, a warning you cannot read at 2am is
     the thing the source already calls a bug however pretty it looks.

     The delivery pops used to stay under the wash, on their own near-black
     outline. The ink check caught them at 3.2 to 3.7 at midnight in some runs,
     over a warm lit patch -- probably a carried lantern, though that was never
     pinned down. They now go over the lamps too, on an outline wide enough to
     back each letter right through, and measure 13. */
  drawAmbient();                                // the season in the air, in front of the world
  g.save(); camApply(); drawLamps(); drawBoatLights(); drawPumpkinLights(); drawPops(); flushBadges(); g.restore();
  drawHUD();
  g.restore();
}

/* ---------- input ---------- */
/* How far a finger may move and still be a tap.

   Measured in the units a finger actually moves in, the way TOUCH_MIN was: the
   canvas is a fixed 1024 across, so on a 360-wide handset one logical pixel is
   0.352 CSS pixels. At 16 this threshold was 5.6 CSS -- and Android gives up on
   a tap at 8dp, iOS at about 10pt. The game was abandoning taps after LESS
   finger movement than the platform does, so a tap with a little roll in it
   panned the camera instead of opening the building under it.

   24 lands between the two on every phone: 8.4 CSS on a 360, 8.8 on a 375, 9.6
   on a 412. */
const DRAG_SLOP = 24;
/* How long a pointer may go quiet before it is assumed lost.

   This is a last resort, and it was behaving like a first one. Four recovery
   paths already run ahead of it -- pointerup, pointercancel, lostpointercapture
   and window blur, which clears every pointer at once -- so the only thing left
   for the sweep is a touch whose release was genuinely never delivered. That is
   rare. A hand resting on the glass is not.

   At four seconds it was throwing away real fingers: rest one on the screen
   while looking at something, bring a second down to pinch, and the pinch does
   not happen -- the first was swept on the second one's arrival, so two fingers
   became one and the gesture panned instead of zoomed. Measured: it worked at
   three seconds of rest and failed at five.

   Thirty gives a hand all the time it wants and still clears a pointer that
   really is gone, long before it could be mistaken for part of a new gesture. */
const PTR_STALE = 30000;
const PTRS = new Map();
/* The baseline a pinch is measured against: the finger separation and zoom when
   it began, and the WORLD point that was under the midpoint of the fingers.

   That last one is the whole gesture. Zoom was applied to CAM.z and nothing
   else, so the camera scaled about the centre of the screen while the player's
   fingers were somewhere else entirely -- the thing being pinched slid away
   from under them. And the two-finger branch returned before the pan, so moving
   both fingers together did nothing at all.

   Holding the world point under the midpoint fixes both at once: it is what
   "anchored zoom" means, and a midpoint that has moved is a pan. */
let pinchD0 = 0, pinchZ0 = 1, pinchW = null;
/* Re-taken whenever the PAIR changes, not only when the second finger lands. A
   third finger, or the first of two lifting while a third is down, leaves two
   pointers that are not the two the baseline was measured from -- and the camera
   jumped. */
function pinchBase() {
  if (PTRS.size < 2) { pinchW = null; return; }
  const m = ptrMid();
  pinchD0 = m.d; pinchZ0 = CAM.z; pinchW = camUnproject(m.x, m.y);
}
/* Where on the board a touch landed -- or nothing, because a canvas with no
   size has no positions in it.

   b.width is zero whenever the page is laid out at nothing: a WebView still
   being measured at launch, a container that is not displayed yet, the moment
   a split-screen divider is dragged. The division then gives NaN or Infinity,
   and that does not stay in the event -- it poisons the CAMERA, permanently.
   Measured, with two fingers on a 0x0 canvas: the midpoint comes out NaN and
   the pinch distance Infinity, so the pinch passes its own sanity check
   (Infinity > 4), asks for a zoom of Infinity/Infinity, and CAM.z goes from
   1.25 to NaN. Every clamp afterwards preserves it -- Math.min(ZMAX, NaN) is
   NaN -- so camApply scales by NaN and the game draws an empty screen for the
   rest of the session, with no tap able to fix it because every tap is NaN too.

   A touch with no position is not a touch. The three handlers that read one
   drop the event rather than carry the poison inwards. */
const evPos = ev => { const b = cv.getBoundingClientRect();
  if (!(b.width > 0) || !(b.height > 0)) return null;
  return { x: (ev.clientX - b.left) / b.width * W, y: (ev.clientY - b.top) / b.height * VH - OY }; };
const ptrMid = () => { const a = [...PTRS.values()];
  return { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2, d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) }; };
function ptrSweep() { const now = Date.now(); for (const [id, r] of PTRS) if (now - r.tLast > PTR_STALE) PTRS.delete(id); }

cv.addEventListener('pointerdown', ev => {
  /* A mouse's right or middle button is not a tap. It opened panels and armed
     sales in the browser version, with the page's context menu on top. */
  if (ev.pointerType === 'mouse' && ev.button !== 0) return;
  const p = evPos(ev); if (!p) return;
  camTouched = true;
  audioOn();                          // must happen inside a gesture
  ptrSweep();
  camGlide = null; camFling = null;      // the player's hand outranks the camera
  PTRS.set(ev.pointerId, { x: p.x, y: p.y, x0: p.x, y0: p.y, moved: 0, drag: false, pinch: false, tLast: Date.now() });
  try { cv.setPointerCapture(ev.pointerId); } catch (e) {}
  /* A second finger makes it a gesture, whether or not anything moves. Only a
     move used to mark a pinch, so two fingers down and up in place fired TWO
     taps, one under each -- opening a panel, or arming a placement spot. */
  if (PTRS.size >= 2) { for (const r of PTRS.values()) r.pinch = true; pinchBase(); }
});
cv.addEventListener('pointermove', ev => {
  const rec = PTRS.get(ev.pointerId); if (!rec) return;
  const p = evPos(ev); if (!p) return;
  const dx = p.x - rec.x, dy = p.y - rec.y;
  rec.x = p.x; rec.y = p.y; rec.tLast = Date.now();
  rec.moved = Math.max(rec.moved, Math.hypot(p.x - rec.x0, p.y - rec.y0));
  if (PTRS.size >= 2) { const m = ptrMid(); for (const r of PTRS.values()) r.pinch = true;
    // the world point that was between the fingers goes back between them
    if (pinchD0 > 4 && pinchW) zoomHolding(pinchZ0 * (m.d / pinchD0), m.x, m.y, pinchW);
    return; }
  if (rec.moved > DRAG_SLOP) {
    rec.drag = true;
    const wx = -dx / camScale(), wy = -dy / camScale();
    CAM.x += wx; CAM.y += wy; camClamp();
    /* Smoothed over the last few moves. A single frame's delta is noisy enough
       that a flick and a stop can look the same, and the last event before a
       finger lifts is very often a short one. */
    const now = performance.now(), gap = Math.max(1, now - (rec.tMove || now - 16));
    rec.tMove = now;
    const vx = wx * 1000 / gap, vy = wy * 1000 / gap, mix = 0.4;
    rec.vx = rec.vx === undefined ? vx : rec.vx + (vx - rec.vx) * mix;
    rec.vy = rec.vy === undefined ? vy : rec.vy + (vy - rec.vy) * mix;
  }
  if (selBuild || moving != null) updateGhost(p.x, p.y);
});
function ptrEnd(ev) {
  const rec = PTRS.get(ev.pointerId); if (!rec) return;
  /* Cancelled is not lifted. The system takes a touch when the notification
     shade comes down, a back swipe starts or a call arrives, and treating that
     as a finger lifting fired a tap wherever the touch began -- a panel, a
     placement, the second tap of a sale. */
  if (ev.type === 'pointercancel') {
    PTRS.delete(ev.pointerId);
    try { cv.releasePointerCapture(ev.pointerId); } catch (e) {}
    pinchBase();
    return;
  }
  PTRS.delete(ev.pointerId);
  try { cv.releasePointerCapture(ev.pointerId); } catch (e) {}
  /* Two fingers left after a third lifts is a different pair, and a stale
     baseline moves the camera for nothing. */
  pinchBase();
  /* A drag that was still moving when it ended keeps going. Only from a
     one-finger drag: letting go of a pinch should settle, not sail off, and the
     two fingers rarely lift together anyway. Stale is thrown away -- a finger
     held still for a moment before lifting is a stop, whatever it was doing
     before that. */
  if (rec.drag && !rec.pinch && PTRS.size === 0 && rec.vx !== undefined
    && performance.now() - (rec.tMove || 0) < 90
    && Math.hypot(rec.vx, rec.vy) > FLING_MIN * 3 && !reduceMotion) {
    camGlide = null;
    camFling = { x: rec.vx, y: rec.vy };
  }
  if (!rec.drag && !rec.pinch && rec.moved <= DRAG_SLOP) tap(rec.x0, rec.y0);
}
/* A mouse had no way to zoom at all.

   The game is a web page before it is an app, and on a laptop the only camera
   control was dragging: a player could pan across an island they had no way to
   pull back from. Anchored at the cursor, like the pinch, so the tile under the
   pointer is the one that stays put.

   deltaMode is normalised because Firefox reports wheel movement in LINES and
   everything else in pixels -- unnormalised, one notch there is three pixels
   and the zoom barely moves. passive:false because this has to preventDefault,
   or the page scrolls behind the canvas. */
cv.addEventListener('wheel', ev => {
  camTouched = true;
  ev.preventDefault();
  camGlide = null; camFling = null;     // the player's hand outranks the camera
  const step = ev.deltaY * (ev.deltaMode === 1 ? 16 : ev.deltaMode === 2 ? 100 : 1);
  const p = evPos(ev); if (!p) return;
  zoomHolding(CAM.z * Math.exp(-step * 0.0015), p.x, p.y, camUnproject(p.x, p.y));
  if (selBuild || moving != null) updateGhost(p.x, p.y);
}, { passive: false });
cv.addEventListener('pointerup', ptrEnd);
cv.addEventListener('contextmenu', ev => ev.preventDefault());
cv.addEventListener('pointercancel', ptrEnd);
cv.addEventListener('lostpointercapture', ev => PTRS.delete(ev.pointerId));
window.addEventListener('blur', () => PTRS.clear());
/* Coming back to a page that was never unloaded.

   This is the ordinary case on a phone: the player swipes the game away, does
   something else for an hour, and taps the icon again -- and the WebView is
   still there, so nothing reloads and collectAway never runs. The village
   produced nothing for that hour and was told nothing about it. An hour of a
   village's work, gone, on the most common way there is to play an idle game.

   The tick is not stopped while hidden, only throttled, and its dt is capped at
   a tenth of a second -- so a backgrounded hour still simulates a few minutes.
   Those are counted and taken off, or the same minutes would be paid twice. */
let hiddenAt = 0, hiddenSim = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // a backgrounded tab may never come back, so bank the progress now
    PTRS.clear(); save();
    /* And let go of the audio output. A running context keeps the device's
       audio path awake behind the home screen; the next touch resumes it. */
    if (actx && actx.state === 'running') actx.suspend().catch(() => {});
    hiddenAt = Date.now(); hiddenSim = 0;
  } else if (hiddenAt) {
    grantAway((Date.now() - hiddenAt) / 1000 - hiddenSim);
    hiddenAt = 0; hiddenSim = 0;
    save();
  }
});
window.addEventListener('pagehide', save);
window.addEventListener('resize', () => { fitCanvas(); readSafeArea(); });
// rotating a phone changes which edge the cutout is on, and may not resize
window.addEventListener('orientationchange', () => setTimeout(() => { fitCanvas(); readSafeArea(); }, 60));

/* ---------- the Android back button ----------

   With nothing listening, back leaves the app. On a phone that means a player
   who opens a building, reads it, and presses back the way they would in any
   other Android app is thrown out of the game instead of back to the village.

   Done without a plugin, because the back button reaches a WebView as ordinary
   history: an entry is pushed while something is open, and popping it closes
   that thing instead of the app. Nothing is pushed while the village is just
   sitting there, so back still leaves -- it takes the press that closed the
   last panel plus one, which is the Android convention anyway.

   Deliberately NOT a stack. Back closes the top-most thing and the next press
   closes the next one down, in the order they overlap on screen. */
let backArmed = false;
/* What the back gesture has to close, which is the same list backClose
   works through. The completion card counts only while it is actually up:
   armed on merely being set, the gesture had a press pushed for a card that
   backClose then refused to touch, and the player's next back press did
   nothing at all. */
function backOpen() {
  return !!(away || finishedUp() || claimAsk || panel != null || who != null || moving != null || selBuild || barMode !== 'build');
}
function backClose() {
  if (away) { away = null; return true; }
  if (finishedUp()) { closeFinished(); return true; }
  if (claimAsk) { claimAsk = false; return true; }
  if (panel != null) { panel = null; sellArm = null; return true; }
  if (who != null) { who = null; return true; }
  if (moving != null) { moving = null; ghost = null; armed = null; return true; }
  if (selBuild) { selBuild = null; ghost = null; armed = null; return true; }
  if (barMode !== 'build') { barMode = 'build'; return true; }
  return false;
}
function armBack() {
  if (backArmed) return;
  try { history.pushState({ v: 1 }, ''); backArmed = true; } catch (e) {}
}
/* A panel closed with its own x, a card tapped away, a placement cancelled from
   the tray: the entry pushed for it stayed behind, so the next back press
   closed nothing -- a dead press that looked broken -- and only the one after
   left the app. It is taken out as soon as nothing is open. The pop this
   causes is ours, so it must not close whatever happens to be open by then. */
let ownPop = false;
function disarmBack() {
  backArmed = false;
  try { ownPop = true; history.back(); } catch (e) { ownPop = false; }
}
window.addEventListener('popstate', () => {
  backArmed = false;
  if (ownPop) { ownPop = false; return; }
  // re-armed only while something is still open, or closing the last thing left a dead press
  if (backClose()) { SFX.tap(); if (backOpen()) armBack(); }
});

function ghostKey() {
  if (moving != null) { const p = byId(moving); return p ? p.key : null; }
  return selBuild;
}
function updateGhost(sx, sy) {
  const key = ghostKey();
  if (!key) { ghost = null; armed = null; return; }
  const w = camUnproject(sx, sy), t = tileAt(w.x, w.y);
  const c = t.c, r = t.r;
  // a building being moved must not be blocked by the ground it is standing on
  const occ = occupied(moving == null ? undefined : moving);
  /* Two different refusals wearing the same red. A tile can be illegal -- off
     the claimed land, under something else -- or perfectly good and simply
     unaffordable, and the preview painted both the same and said nothing. fits
     is the tile alone, so the label can tell them apart. */
  const why = placeProblem(key, c, r, occ), fits = why === null;
  ghost = { c, r, fits, why, ok: fits && (moving != null || buildable(key)) };
}
/* Which placed building a screen point is ON, as the player sees it.

   It used to ask only which building's ground tiles the point was over. The
   paintings stand well above their plots -- the hall's roof and tower are the
   upper half of what you see -- so a tap on the top of a building landed on
   the ground BEHIND it: another building, nothing, or, at the edge of the
   claim, the "Claim more land" card. The most natural place to tap the hall
   was the one place that did not open it.

   So the paintings are asked first, front to back in the order they are
   drawn, and only where they are actually painted (a coarse alpha mask per
   image, so the sky beside a roof is not the roof). Then the ground, for
   decorations and anything drawn without art. */
const HIT_MASK = new Map();                   // image -> { w, h, a: Uint8Array }
const HIT_STEP = 4;                           // source pixels per mask cell
function hitMask(art) {
  if (HIT_MASK.has(art)) return HIT_MASK.get(art);
  let m = null;
  try {
    const w = Math.max(1, Math.ceil(art.width / HIT_STEP)), h = Math.max(1, Math.ceil(art.height / HIT_STEP));
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(art, 0, 0, w, h);
    const d = cx.getImageData(0, 0, w, h).data, a = new Uint8Array(w * h);
    for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3];
    m = { w, h, a };
  } catch (e) { m = null; }                   // unreadable: fall back to the rectangle
  HIT_MASK.set(art, m);
  return m;
}
function paintedAt(p, wx, wy) {
  const R = artRect(p);
  if (!R || wx < R.left || wx >= R.left + R.wid || wy < R.top || wy >= R.top + R.hgt) return false;
  const m = hitMask(R.art);
  if (!m) return true;
  const u = Math.min(m.w - 1, Math.floor((wx - R.left) / R.wid * m.w));
  const v = Math.min(m.h - 1, Math.floor((wy - R.top) / R.hgt * m.h));
  return m.a[v * m.w + u] > 96;
}
const depthOf = p => { const b = B(p.key); return tileToWorld(p.c + b.w - 1, p.r + b.h - 1).y; };
/* The villager under the thumb, if any.

   Measured on SCREEN rather than in the world, because a thumb is a fixed
   size and the world is not: at the far zoom out a villager is eleven pixels
   tall, and no world-space box around them could ever be hit.

   Two boxes, and the difference between them is the whole design. `pad` off
   is the drawn figure: where the villager actually IS. `pad` on grows that
   to a fingertip, TOUCH_MIN across, the same allowance padHit gives every
   other control in the game.

   They are separate because a thumb is 128 logical pixels and a villager is
   about 36 across, so one padded box covers a great deal of ground that has
   a building under it. Used as the only test, it made a village of seventy-
   two people into a village where you cannot tap a house. See tap(), which
   asks for the figure first, the building next, and the fingertip last.

   Nearest the camera wins, the same rule buildingAt uses, so tapping into a
   crowd picks the one in front -- which is the one drawn over the others. */
function villagerAt(sx, sy, pad) {
  const sc = camScale();
  let best = null, bestY = -Infinity;
  for (const v of villagers) {
    const pt = camProject(v.x, v.y);
    const fw = VILLAGER_H * 0.3 * sc, fh = VILLAGER_H * sc;
    const hw = pad ? Math.max(fw, TOUCH_MIN / 2) : fw;
    const hh = pad ? Math.max(fh, TOUCH_MIN) : fh;
    if (Math.abs(sx - pt.x) > hw) continue;
    if (sy > pt.y + hh * 0.18 || sy < pt.y - hh) continue;
    if (v.y >= bestY) { best = v; bestY = v.y; }
  }
  return best;
}
/* Everything standing under one finger, nearest the eye first.

   A village is a stack of overlapping sprites with the tallest drawn last, so
   a building behind the hall is only the sliver of itself the hall does not
   cover -- and that sliver is the only way to its panel, which is the only way
   to upgrade it, move it or sell it. Measured on a real 53-building village at
   360x780, camera centred on each building and tried at every zoom the game
   allows: one farm could not be opened at all, 24 of 39 never reached the 128
   pixels this file calls a thumb, and the thinnest that could be opened was a
   lumber camp at twelve -- four CSS pixels. Zooming in does not help, because
   the neighbour grows with it.

   TOUCH_MIN was written for exactly this, and padHit gives it to every control
   in the HUD; villagerAt pads a villager to a fingertip for the same reason,
   in the same words, a few lines below. The buildings had neither.

   The list keeps the order the eye reads: whatever is painted here, deepest
   first, and then -- last -- whoever actually owns the ground, who may be
   painted over entirely. So the FIRST of them is what buildingAt always
   answered and what a first tap still opens; the rest are what a second tap on
   the same spot can reach. Nothing about what you see has changed; what was
   added is a way down through it. */
function buildingsAt(sx, sy) {
  const w = camUnproject(sx, sy), t = tileAt(w.x, w.y);
  const out = placed.filter(p => !B(p.key).flat && paintedAt(p, w.x, w.y))
    /* The order buildingAt chose by: deepest wins, and a later building wins a
       tie with an earlier one because it is drawn over it. */
    .sort((a, b) => depthOf(b) - depthOf(a) || placed.indexOf(b) - placed.indexOf(a));
  const plot = placed.find(p => { const b = B(p.key);
    return t.c >= p.c && t.c < p.c + b.w && t.r >= p.r && t.r < p.r + b.h; });
  if (plot && out.indexOf(plot) < 0) out.push(plot);
  return out;
}
/* What the eye sees there, which is the first of them. Written through the
   list rather than beside it so the two can never drift apart. */
function buildingAt(sx, sy) { return buildingsAt(sx, sy)[0] || null; }
function tap(sx, sy) {
  if (away) { away = null; return; }
  if (finishedUp()) { closeFinished(); return; }
  if (claimAsk) {
    const R = claimRects();
    if (Math.hypot(sx - R.no.x, sy - R.no.y) < Math.max(R.no.r * 1.3, TOUCH_MIN / 2)) { claimAsk = false; return; }
    if (landNext() && Math.abs(sx - R.yes.x) < R.yes.w / 2
      && Math.abs(sy - R.yes.y) < Math.max(R.yes.h / 2, TOUCH_MIN / 2)) {
      if (!claimLand()) SFX.deny();
      return;
    }
    if (Math.abs(sx - R.x) < R.w / 2 && Math.abs(sy - R.y) < R.h / 2) return;
    claimAsk = false; return;         // a tap outside the card closes it
  }
  {
    const M = muteRect();
    if (Math.hypot(sx - M.x, sy - M.y) < Math.max(M.r * 1.15, TOUCH_MIN / 2)) {
      muted = !muted; save();
      if (!muted) SFX.tap();
      return;
    }
  }
  // HUD first, exactly as in Gatestorm: the bar must always win over the world
  if (panel != null) {
    const R = panelRects(), p = byId(panel);
    if (Math.hypot(sx - R.close.x, sy - R.close.y) < Math.max(R.close.r * 1.3, TOUCH_MIN / 2)) {
      panel = null; sellArm = null; return; }
    const hit = r2 => r2 && Math.abs(sx - r2.x) < r2.w / 2
      && Math.abs(sy - r2.y) < padHit(r2.h / 2, 20 * R.u);
    if (p && hit(R.move)) { moving = p.id; panel = null; who = null; selBuild = null; ghost = null; armed = null; sellArm = null; SFX.tap(); return; }
    if (p && hit(R.sell)) {
      if (!canSell(p)) { SFX.deny(); return; }
      if (!sellArm || sellArm.id !== p.id) { sellArm = { id: p.id, t: SELL_ARM }; SFX.tap(); return; }
      sellArm = null;
      if (!sellBuilding(p)) SFX.deny();
      return;
    }
    if (p && hit(R.up))   { sellArm = null; if (!upgradeBuilding(p)) SFX.deny(); return; }
    // anywhere else inside the panel is swallowed, so a stray tap on it does
    // not fall through and place a building underneath
    if (Math.abs(sx - R.x) < R.w / 2 && Math.abs(sy - R.y) < R.h / 2) return;
  }
  for (const t of tabRects()) {
    if (Math.abs(sx - t.x) < t.w / 2 && Math.abs(sy - t.y) < padHit(t.h / 2, 12 * US())) {
      barMode = t.mode; selBuild = null; moving = null; ghost = null; armed = null; SFX.tap(); return;
    }
  }
  if (barMode === 'orders') {
    for (const r of orderRects()) {
      if (Math.abs(sx - r.x) < r.w / 2 && Math.abs(sy - r.y) < r.h / 2) {
        if (!fillOrder(r.o)) SFX.deny();
        return;
      }
    }
    // an empty stall is part of the board, not a hole through it to the world
    for (const r of orderSlotRects())
      if (Math.abs(sx - r.x) < r.w / 2 && Math.abs(sy - r.y) < r.h / 2) return;
  }
  for (const r of barRects()) {
    if (Math.abs(sx - r.x) < r.w / 2 && Math.abs(sy - r.y) < r.h / 2) {
      moving = null; armed = null;         // picking something new abandons a move
      if (atLimit(r.b.key)) {
        SFX.deny();
        if (!isDecor(r.b.key)) panel = (hallOf() || {}).id ?? null;
        selBuild = null; ghost = null; return;
      }
      SFX.tap();
      selBuild = (selBuild === r.b.key) ? null : r.b.key;
      panel = null; ghost = null; armed = null;
      return;
    }
  }
  if (moving != null || selBuild) {
    updateGhost(sx, sy);
    if (!ghost || !ghost.ok) { SFX.deny(); return; }
    // first tap arms the spot, second tap on the SAME spot commits it
    if (!armed || armed.c !== ghost.c || armed.r !== ghost.r) {
      armed = { c: ghost.c, r: ghost.r }; SFX.tap(); return;
    }
    if (moving != null) {
      const p = byId(moving);
      if (p) { p.c = ghost.c; p.r = ghost.r; rebuildStores(); save(); SFX.place(); }
      moving = null;
    } else {
      place(selBuild, ghost.c, ghost.r);
      selBuild = null;
    }
    ghost = null; armed = null;
    return;
  }
  if (catchVisitor(sx, sy)) return;
  /* Three questions in order, and the order is the design.

     A villager where they are DRAWN comes first. They stand on the building
     they work at, so asking the building first would make the only things in
     the village worth tapping the only things you cannot tap.

     The building comes second, before the fingertip allowance, because that
     allowance is 128 logical pixels around a figure 36 across -- enough to
     blanket the house behind. Giving villagers the padded box outright turned
     a crowded village into one where no building could be opened at all.

     The fingertip comes last, over open ground, which is where it is worth
     having: a villager at the far zoom out is eleven pixels tall and nobody
     hits that, so a near miss onto grass still opens the person aimed at. */
  const on = villagerAt(sx, sy, false);
  if (on) { SFX.tap(); who = on.seed; panel = null; return; }
  /* The first tap opens what is drawn here; tapping the same place again goes
     to whatever is standing under it, and round again. That is the whole of
     the fix for a buried building: the patch you have to hit is the COVERING
     building's, which is large, and the one underneath is two taps away
     instead of unreachable. A spot with nothing beneath cycles to itself and
     behaves exactly as it did. */
  const under = buildingsAt(sx, sy);
  if (under.length) {
    const i = under.findIndex(p => p.id === panel);
    const next = under[(i + 1) % under.length];
    SFX.tap(); panel = next.id; who = null; return;
  }
  const near = villagerAt(sx, sy, true);
  if (near) { SFX.tap(); who = near.seed; panel = null; return; }
  who = null;
  panel = null;
  const w = camUnproject(sx, sy), t = tileAt(w.x, w.y);
  const tc = t.c, tr = t.r;
  if (tc >= 0 && tr >= 0 && tc < GW && tr < GH && !inLand(tc, tr)) { claimAsk = true; SFX.tap(); }
}

/* ---------- boot ---------- */
load();
ensureHall();
coverPlaced();
landTransit();                        // what the villagers were holding, back where it was going
collectAway();
fitCanvas();
CAM.x = W / 2; CAM.y = tileToWorld(GW / 2, GH / 2).y; camFit(true); camClamp();
/* The village keeps working while the page is hidden; nobody watches it do
   it. Painting a frame no one can see costs 2.1ms of a built-up village on
   this machine and rather more on a phone, several times a second, for as
   long as the app sits on the home screen -- and buys nothing, because the
   canvas is not composited and the first visible tick repaints it within a
   thirtieth of a second anyway. The simulation still runs: what it manages is
   counted, and the rest is credited as time away. */
let last = performance.now();
function tick() {
  const now = performance.now(), dt = Math.min(0.1, Math.max(0, (now - last) / 1000)); last = now;
  try { step(dt); if (!document.hidden) draw(); } catch (e) { console.error(e); }
}
setInterval(tick, 1000 / 30);

/* Ask for every sprite at once, rather than the first time each is drawn.

   artFor() starts the download on first use and draws the procedural stand-in
   until it arrives, which is the right behaviour for a missing file and the
   wrong one for a file that is simply not needed yet: on a cold start the
   village appeared as flat coloured boxes and swapped to painted art a moment
   later, and the same flash came back whenever a kind of building was drawn for
   the first time -- the first mill, the first statue, the first pan to a corner
   with a rock in it. They all ship inside the app; there is nothing to save by
   waiting. The stand-in stays for a file that genuinely will not load. */
// a kind drawn from a set of stages (the beacon) has no single picture to ask for
for (const b of BUILDINGS) if (!SET_ART[b.key]) artFor(b.key);
/* And frame the village again once its paintings are in. The opening fit runs
   before any image has loaded, so it measured every building as a tile either
   side of its centre -- narrower than the art -- and a returning player's first
   view cropped the buildings on the edges. Once, and only if they have not
   already taken hold of the camera. */
{
  const keys = [...new Set(placed.map(p => p.key))].filter(k => !isDecor(k));
  let left = 0;
  const done = () => { if (--left === 0 && !camTouched) camFit(true); };
  for (const k of keys) {
    const im = ART[k];
    if (!im || ready(im)) continue;
    left++;
    im.addEventListener('load', done, { once: true });
    im.addEventListener('error', done, { once: true });
  }
}
for (const v of [...VILLAGERS, STONECUTTER, TRADER, MILLER]) artFor(v);
/* Asked for once, here, rather than on the first frame somebody walks: a
   villager with no cycle drawn for him would otherwise send six requests
   the moment he set off, and artFor remembers a miss, so doing it at boot
   costs the same misses at a moment when nothing is moving yet. */
for (const v of [...VILLAGERS, STONECUTTER, TRADER, MILLER]) for (let i = 1; i <= WALK_STEPS; i++) artFor(v + '_walk' + i);
/* The beacon's five, asked for here for the same reason the walk frames are:
   a village with none of them drawn would otherwise send five requests the
   moment it finished, and artFor remembers a miss. */
for (let i = 1; i <= BEACON_STAGES; i++) { beaconArt(i); artFor(BEACON + '_stage' + i + '_winter'); artFor(BEACON + '_stage' + i + '_autumn'); artFor(BEACON + '_stage' + i + '_spring'); }
for (const k of ['ground', 'water', 'tree_pine', 'tree_spruce', 'tree_oak', 'tree_willow', 'tree_poplar', 'tree_cherry', 'tree_birch', 'rock', 'rock_moss', 'bush', 'bush_hydrangea', 'stump', 'log_mushroom', 'flowers_wild', 'flowers_meadow', 'sheep', 'sheep_rest', 'sheep_lambs', 'skeps', 'snowman', 'goat', 'cow', ...Object.values(SEASON_LOOK).flatMap(Object.values)]) artFor(k);
for (const set of Object.values(LOOKS)) for (const k of set) artFor(k);
for (const k of WINTER_LOOKS) artFor(k + '_winter');
for (const k of AUTUMN_LOOKS) artFor(k + '_autumn');
for (const [, k] of HALL_STAGES) artFor(k);
for (const s of SEA_PROPS) { artFor(s.key); if (s.glow) artFor(s.key + '_glow'); for (const sk of ['spring', 'autumn', 'winter']) if (s[sk]) artFor(s.key + '_' + sk); }

/* test hooks */
window.__v = { res, RES, RES_SET, RES_ICON, RES_TINT, get placed() { return placed; }, B, BUILDINGS, tileToWorld, worldToTile,
  camProject, camUnproject, canPlace, placeProblem, occupied, place, step, draw, barRects, barList, tileAt,
  camClamp, worldBounds,
  FINDS, FIND_KEYS, isFound, placeFinds, findSpot, LAND, LAND_MAX, DECOR_MAX, decorCount, BEST_CHARM, BUILDINGS, rebuildCharm, claimLand, ensureHall, rebuildStores, coverPlaced, charmTotal, canSell, ART,
  routeLine, routesShown, drawRoutes, routeOf, onPath, nearestStore, storesItself, ROUTE_STEPS, DROP_Y, PATH_SPEED, VIL_SPD, rebuildPaths, established, get ghost() { return ghost; }, set ghost(v) { ghost = v; },
  get sel() { return selBuild; }, set sel(v) { selBuild = v; },
  tap, CAM, save, load, get caps() { return caps; },
  HALL, hallOf, hallLevel, allowedOf, countOf, atLimit, unlocked, buildable, permitted, hintText,
  canUpgrade, upgradeBuilding, upInfo, upCostOf, lvlOf, popOf, capsOf, capsHeld, rateOf, outMul, LVL_MAX,
  shortfall, shortText, overCaps, remedy, villageStats, wellGain, wellGainAtLevel, wellGainAt, wellMoveGain, wellReachAt, charmDelivered, deliveredOf, deliveringNow, deliveredWith, travelSecondsOf, handsFor,
  bestDeliveredOf, reachOf, snugWalkOf,
  panelRects, TOUCH_MIN, padHit, TEXT_MIN, buildingsAt, get panel() { return panel; }, set panel(v) { panel = v; },
  get who() { return who; }, set who(v) { who = v; }, whoIs, villagerAt, tradeOf, doingOf, roundTripOf, drawWho,
  get villagers() { return villagers; }, workersAt, workersOf, villagerName, nameList, NAMES, freeSeed, boostAt, producers, stores,
  assignJobs, desiredJobs, computeJobs, invalidateJobs, established, lvlHeld, buildingAt, ensureHall, jobsOf, VILLAGER_MAX, rebuildStores, nearestStore,
  artRect, paintedAt, isDecor, decorCount, DECOR_MAX, charmTotal, charmMul, charmGainFrom, decorGainAt, deliveredAtMul, charmRoom, usefulCharm, CHARM_FULL,
  // the size of a load: the finest difference any delivery measurement can see
  CARRY,
  tabRects, modalUp, chipRects, chipsBot, buildList, decorList, stripRows, stripH, stripTop, stripBot, cardStrings, stallStrings, US, drawDecor, grant, deliver, flushBadges, get lastBadges() { return lastBadges; }, badgeScale, BADGE_TEXT_PX, POP_PX, camScale, ZMIN, ZMAX, VILLAGER_H, centreOf, get W() { return W; }, get H() { return H; },
  sparePeople, outOfRoom, noSpareHands, peopleComing, livedIn,
  sellBuilding, canSell, sellValue, investedIn, capsWithout, get moving() { return moving; }, set moving(v) { moving = v; },
  get armed() { return armed; }, set armed(v) { armed = v; },
  get ghost() { return ghost; }, set ghost(v) { ghost = v; },
  get sellArm() { return sellArm; }, set sellArm(v) { sellArm = v; }, SELL_ARM,
  collectAway, grantAway, celebrate, celebrateHall, get show() { return show; }, landTransit, duration, saleCost, get actx() { return actx; }, potentialRate, expectedRate, currentHint, get away() { return away; }, set away(v) { away = v; },
  get hiddenAt() { return hiddenAt; }, set hiddenAt(v) { hiddenAt = v; },
  get hiddenSim() { return hiddenSim; }, set hiddenSim(v) { hiddenSim = v; }, AWAY_MIN, AWAY_MAX,
  GOALS, currentGoal, buyProgress, FINISH_ID, currentHint,
  BEACON, SET_ART, BEACON_STAGES, BEACON_NEED, BEACON_SHARE, beaconCut, beaconOf, beaconStage, beaconSet, beaconOpen,
  shareMul, buildingArt, get goalIdx() { return goalIdx; }, set goalIdx(v) { goalIdx = v; },
  afterGoal, shipped, AFTER_SHIP, AFTER_ORDERS, AFTER_MAX,
  get afterMark() { return afterMark; }, set afterMark(v) { afterMark = v; },
  get orders() { return orders; }, set orders(v) { orders = v; },
  makeOrder, fillOrder, canFill, hasRoom, willShip, shipsSpare, orderRects, orderSlotRects, nextTraderIn, seatOrders, freeStall, ORDER_EVERY, ORDER_SLOTS, orderSlots, orderEvery, marketCount, TRAY_ICON, TRAY_NAME, TRAY_ONE, TRAY_ROWS,
  get ordersDone() { return ordersDone; }, set ordersDone(v) { ordersDone = v; },
  get orderT() { return orderT; }, set orderT(v) { orderT = v; },
  get goalDone() { return goalDone; }, set goalDone(v) { goalDone = v; },
  SFX, muteRect, audioOn, get master() { return master; }, get muted() { return muted; }, set muted(v) { muted = v; }, get beds() { return beds; }, get glintsDrawn() { return glintsDrawn; }, get smokeDrawn() { return smokeDrawn; }, get ringsDrawn() { return ringsDrawn; }, moonFull, mistNow, rainbowNow, batsNow, visitors, catchVisitor, podNow, kitesNow, balloonNow, whaleNow, gustNow, dovesNow, get umbrellasDrawn() { return umbrellasDrawn; }, festivalNow, auroraNow, stormNow, flashAt, get leapsDrawn() { return leapsDrawn; },
  /* Read through getters. Captured by value these went stale the moment the
     harness moved them, and a sweep would have cleaned up the key the game
     was no longer using. */
  get KEY() { return KEY; }, get KEY_BAK() { return KEY_BAK; }, get KEY_OTHER() { return KEY_OTHER; },
  setSaveKeys, SAVE_KEYS,
  BACKUP_EVERY, SAVE_V, usableSave, readSave,
  get otherBuild() { return otherBuild; }, set otherBuild(v) { otherBuild = v; },
  get saveFailed() { return saveFailed; }, set saveFailed(v) { saveFailed = v; },
  get loadedFromBackup() { return loadedFromBackup; }, set loadedFromBackup(v) { loadedFromBackup = v; },
  sky, dayPhase, DAY_MS, camFit, get camFling() { return camFling; },
  SEASONS, SEASON_OF, SEASON_LEAF, seasonIdx, season, seasonSkin, drawGround, drawScenery, SCENERY,
  GW, GH, tileToWorld, deliveredOf,
  get seasonForced() { return seasonForced; }, set seasonForced(v) { seasonForced = v; },
  get reduceMotion() { return reduceMotion; }, set reduceMotion(v) { reduceMotion = !!v; }, landFitZoom, landWorldBounds, builtBounds, artFor, winterArt, ART, villagerArt, glowKey, get glowsDrawn() { return glowsDrawn; },
  hudTop, hudBot, screenTop, screenBot, readSafeArea, get SAFE() { return SAFE; }, set SAFE(v) { SAFE = v; },
  get safeKnown() { return safeKnown; }, set safeKnown(v) { safeKnown = !!v; },
  fitLines, fitLinesNow, TUT, GOALS, get finished() { return finished; }, set finished(v) { finished = v; },
  hasStore, onPath, PATH_SPEED, rebuildPaths, routeOf, get pathSet() { return pathSet; },
  LAND, LAND_MAX, inLand, landNext, canClaim, claimLand, landBounds, coverPlaced,
  get landTier() { return landTier; }, set landTier(v) { landTier = v; },
  get claimAsk() { return claimAsk; }, set claimAsk(v) { claimAsk = v; }, claimRects,
  get tutSeen() { return tutSeen; }, set tutSeen(v) { tutSeen = v; },
  get savedAt() { return savedAt; }, set savedAt(v) { savedAt = v; },
  get pops() { return pops; }, get rateNow() { return rateNow; },
  get sharedTotal() { return sharedTotal; }, set sharedTotal(v) { sharedTotal = v; },
  villageFinished, compact,
  get barMode() { return barMode; }, set barMode(v) { barMode = v; },
  tick, backOpen, backClose, armBack, disarmBack, get backArmed() { return backArmed; } };
