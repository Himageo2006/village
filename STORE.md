# Store listing — Village

`com.himageo.village` · Google Play, and the same copy serves the App Store
with the field names changed.

Everything below is written to be pasted. Nothing in it is a claim the game
does not keep — see **What we are allowed to say** at the bottom, which lists
each promise against the line of code that makes it true. If any of those
change, this file changes with them.

---

## Why this listing leads with what the game does NOT have

The category survey (`DESIGN-SURVEY.md`, §3) found one complaint underneath
almost every bad review in this genre, and it is not about content. It is
energy: you tap a tree, it costs energy, the energy refills on a clock, and
the clock is the product.

The cleanest piece of evidence is on a competitor's own channel. Sunrise
Village's most-watched video is not a trailer or a chapter reveal — it is
**"How to get more Energy", at 101,000 views**, against 8,500 for their
chapter-11 content trailer. A thing the developers made to explain their own
bottleneck outdraws everything they made to sell the game, twelve to one.

Village has no energy system and never needs one. It was already on the right
side of the largest complaint in its category and had never said so anywhere.
That is the whole of this listing.

---

## Title (30 characters max)

```
Village: Island Builder
```

## Short description (80 characters max)

```
Build an island village. No energy, no timers, no ads. Play as long as you like.
```

79 characters.

## Full description (4000 characters max)

```
Build a village on a small island, at your own pace, for as long as you like.

NO ENERGY. NO TIMERS. NO ADS. NO PURCHASES.

Every other game in this corner of the store stops you after five minutes and
asks you to wait or to pay. Village does not have the mechanism to do that. There
is no energy bar, so there is nothing to run out. There is no timer gating your
next tap. There are no adverts, no shop, no currency to buy, and nothing is
locked behind money — because there is no money in it at all. You tap, and the
village carries on.

It works with the aeroplane mode on. It works in a tunnel, on a train, in a
waiting room with no signal. Nothing phones home, nothing needs an account, and
nothing you build is kept on somebody else's computer.

WHAT YOU DO

Fell timber, grow food, and lay out a village that works. Houses bring
villagers; villagers work the farms, the lumber camps and the mill, and carry
what they make to a storehouse. Every one of them walks. That is the game: a
farm placed seven tiles from a store delivers a fraction of what it is rated
for, so WHERE you put things matters more than how many you own.

Raise the town hall to unlock the mill, the market and more land. Claim the
island one ring at a time. Decorate it — flowerbeds, statues, paths — and the
charm you build lifts the whole village's output. Trade with the neighbours
over the water. And when the island is finished, raise the beacon: a lighthouse
that drinks the surplus a full village throws away, and rises, stage by stage,
until its lamp is lit.

Tap any villager and they have a name, a trade, somewhere they are going, and
the number of seconds they spend walking there and back.

- 23 goals, and more after them that never run out
- 72 villagers, 60 decorations, five levels on every building
- A whole island to claim, four rings at a time
- Day and night over the water
- Plays in one hand, portrait, on a phone

AND NOTHING ELSE

No account. No sign-in. No permissions — the app asks for nothing, because it
needs nothing. No analytics. No notifications nagging you back. No season pass,
no battle pass, no limited-time event you will miss. The game does not want
your attention on a schedule. It is there when you open it.

Your village is saved on your own device, with a backup slot in case a save
goes wrong.
```

## What's new (500 characters max) — 1.0.0

```
First release.

Build an island village with no energy bar, no timers, no adverts and no
purchases. Villagers you can name and follow. A lighthouse to raise once the
island is full. Plays offline, in one hand, for as long as you like.
```

---

## Graphics checklist

| Asset | Size | Status |
|---|---|---|
| App icon | 512×512 PNG, 32-bit | `resources/` — check it is full-bleed |
| Feature graphic | 1024×500 | `store/feature-graphic.png` ✅ |
| Phone screenshots | min 2, 1080×1920 | `store/1-village.jpg` … `5-claim.jpg` ✅ |
| Tablet screenshots | optional | — |

The five shots are the five below, in that order, and they are frames the
game actually drew rather than mock-ups: the canvas was asked for a 1080×1920
phone, which makes it 1024×1820, and each frame came off `toDataURL` and was
scaled up to 1080×1920. JPEG at quality 92, which is indistinguishable from
the PNG on this art down to the HUD text and a fifth of the size.

The feature graphic is the one picture here that is painted rather than
captured: a wide golden-hour painting of the village (`art/original/
feature_art.png`, PROMPTS.md group 42) cut to 1024x500, with the game's logo
over its open sea and the four promises under it. It is the same island,
buildings and logo as the title screen, so the listing and the first thing
the app shows are one picture. Rebuilt by compositing, not by hand: the
painting, a soft shade behind the lettering, the trimmed logo at 430 wide,
two lines of Georgia in cream with a brown outline.

**They will want redoing once the quarry has a picture.** Every shot of a
finished village now contains a quarry drawn by the procedural stand-in, and
the build tray in shots 1, 2 and 3 shows its card. The scenes to rebuild:

```
1  the full allowance at level 5, four rings, 10 statues, camFit x1.42,
   0.29 of the day, build tray
2  the same frame with who = a villager who has a post
3  the beacon seated and set to stage 3 at 45% of its stock, z 1.00 on it,
   0.75 of the day -- which is as dark as this game gets
4  the same village, orders tray, the board filled
5  tier 1, goal 11, three of each kind, camFit wide -- the unclaimed rings
   read as the darker ground, and the goal strip says what to do about it
F  the houses' centre of mass at z 1.55, band y 380..880 -- high enough to
   miss the delivery pops, low enough to miss the goal strip
```

Shot list, in the order that argues the case:

1. **A full village at midday.** The thing itself, busy, with the resource
   chips reading healthy numbers. Caption: *No energy. No timers. Play as long
   as you like.*
2. **A villager's card open.** Name, trade, and the walk in seconds. Caption:
   *Everyone has a name, a job, and a walk to work.*
3. **The beacon part-built, at dusk.** Caption: *A lighthouse that drinks what
   a finished village throws away.*
4. **The trade board.** Caption: *Trade over the water. Nothing costs money,
   because there is no money.*
5. **The island mid-claim**, the next ring showing. Caption: *Claim the island,
   one ring at a time.*

---

## Content rating

Answer the Play questionnaire as: no violence, no sexual content, no profanity,
no gambling or simulated gambling, no user interaction, no sharing of location
or personal information, no purchases, no adverts. The expected outcome is
PEGI 3 / ESRB Everyone.

## Data safety

Declare: **no data collected, no data shared.** The app has no analytics, no
account, no network calls and no Android permissions — `npm run check:android`
asserts the permission list is empty on every build, so this declaration is
checked rather than remembered.

---

## What we are allowed to say

Each promise in the copy above, against the thing in the repo that makes it
true. This table is the reason the listing can be this blunt.

| The claim | Why it is true |
|---|---|
| No energy | There is no energy value, cap or regeneration anywhere in `game.js`. The mechanism does not exist, so it cannot be added by a config change. |
| No timers gating play | Buildings take time to raise and traders arrive on a cycle, and neither stops you doing anything else. Nothing in the game refuses an action until a clock runs down. |
| No ads | No ad SDK, no network code. `npm run check:android` fails the build if the app requests any permission, and an ad SDK needs INTERNET. |
| No purchases | No billing library, no store, no premium currency. |
| Works offline / on a plane | Capacitor shell over local files. No fetch, no XHR, no websocket in the shipped bundle. |
| No account, no sign-in | There is no auth code and no server. |
| No permissions | `scripts/check-android.js` asserts the manifest's permission list is empty, and runs on every `npm run sync`. |
| Saved on your own device | `localStorage`, with `vil_save` and a `vil_save_bak` backup slot. |
| 23 goals, then more | `GOALS` has 23 entries; past the last one `afterGoal()` generates them indefinitely. |
| 72 villagers | `VILLAGER_MAX = 72`. |
| 60 decorations | `DECOR_MAX = 60`. |
| Five levels on every building | `LVL_MAX = 5` (the hall goes to `HALL_MAX = 5`). |
| Four rings of land | `LAND_MAX = 4`. |
| Tap a villager for name, trade and walk | `drawWho()` — name, trade, what they are doing, and the round trip in seconds. |
| A lighthouse in stages | `BEACON_STAGES = 5`, with five painted stages in `art/`. |
| Placement matters more than count | Delivery is `CARRY / (fill time + travel)`; the panel quotes what ARRIVES, not the rated figure. |

Two things the copy deliberately does not claim: that the game is finished
content-wise, and any number of hours of play. Both would be guesses.
