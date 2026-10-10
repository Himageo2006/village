# Where this game stands in its category, and what would put it in front

A survey of the games Village competes with, what their players love and hate,
and a ranked list of changes. Written October 2026.

Nothing here proposes undoing anything. Every item is additive: the economy,
the art pipeline, the 57-sweep harness and the save format all stay as they
are, and each change is sized to be one commit with its own measurement.

---

## 1. How this was put together, and what it is worth

Read: store listings and reviews for Township, Hay Day, Family Island,
Klondike Adventures, Sunrise Village, SimCity BuildIt, Pocket City 2,
TheoTown, Village City, Cozy Town and Designer City 2; the Deconstructor of
Fun teardowns of Township, Hay Day and SimCity BuildIt; genre roundups;
developer replies to one-star reviews, which are often more informative than
the reviews.

Watched: YouTube search results and channel statistics rather than hours of
footage. That turned out to be the more useful measurement, for a reason set
out in §3.

Limits, stated plainly: no Reddit threads surfaced in any search, so the
player voice here is app-store reviews and YouTube, which skew to the angry
and the very keen. No revenue figures. Several sources are listicles, which
are worth little; the Deconstructor of Fun pieces and the store reviews are
worth most. Where a claim rests on something weak it says so.

---

## 2. The category is really two categories

Village is not competing with the games it looks like.

**League A — the free-to-play giants.** Township, Hay Day, Family Island,
Klondike Adventures, Sunrise Village, SimCity BuildIt. Hundreds of people,
live operations, an event every fortnight, servers, guilds, ads and in-app
purchases. Township alone carries 250+ craftable goods. Nothing here is a
realistic target.

**League B — the offline shelf.** Pocket City 2 (paid once, no timers, no
premium currency), TheoTown, Village City (Sparkling Society, ~200 buildings,
4.6 stars), Cozy Town, Designer City 2. These are small-team or one-person
games that sell on being calm, complete and playable on a plane.

Village is a League B game: offline, no permissions, no ads, no purchases, no
server. That is not a weakness to be apologised for. It is the entire
proposition, and §3 is why.

---

## 3. The one thing the whole category is hated for

Every League A game runs on **energy**. You tap a tree, it costs energy, the
energy refills on a clock, and the clock is the product.

The evidence is unusually clean:

- On Sunrise Village's **own official YouTube channel**, the most-watched
  video is not a trailer, a chapter reveal or a gameplay walkthrough. It is
  **"How to get more Energy", at 101,000 views**. The chapter-11 content
  trailer has 8,500. A thing the developers made to explain their own
  bottleneck outdraws everything they made to sell the game, twelve to one.
- Search YouTube for *why I quit Family Island* and the results are not
  reviews. They are energy hacks — 42,000 views on one, with a steady stream
  of new ones every month.
- App Store, Sunrise Village: you can play *"maybe 5-10 minutes at a time
  before energy runs out"*. Google Play: *"expect to pay money to actually
  play for an extended amount of time."*
- Google Play, Klondike Adventures: after about a week *"it becomes
  impossible to play for more than a few minutes at a time"*, with single
  objects costing 40 energy to collect.
- The developers reply to these. They list the free ways to get energy. The
  replies are polite and they do not land, because the complaint is not "I
  want more energy", it is "I want to keep playing".

**Village has no energy system and never needs one.** It is already on the
right side of the single largest complaint in its category, and it has never
said so anywhere — not in the store listing, not on the title screen, not in
the first minute of play. That is the marketing wedge and it is free.

The lesson for design is narrower and more useful than "don't add energy".
It is: **the failure state of this genre is being told you cannot play.**
Which brings us to the problem.

---

## 4. The honest verdict on the game as it stands

The village is finished and it is beautiful. Then this happens:

> **While you were away** — your villagers kept working for 6 minutes
> **nothing would fit**
> and 15k 🌾 14k shared with neighbours

and this, as the standing banner over a maxed island:

> Your stores are full — what villagers bring in now is thrown away.
> Spend it or trade it away.

Measured on the finished save:

| | |
|---|---|
| Buildings | **every kind locked**: house 12/12, farm 6/6, lumber 6/6, store 4/4, well 4/4, mill 3/3, market 2/2 |
| Resources | 8380/8380 wood, 8380/8380 food — both permanently at the ceiling |
| Goals | 23 of 23 done, none left |
| Charm | 630 against a CHARM_FULL of 600 — the multiplier is capped at 1.2 |
| Decorations | 14 of 60 placed, and the other 46 would do nothing |
| Trade board | five offers, all of the form *1135 food → 1065 wood*, between two resources that are both already full |
| Villagers | 72, of whom 69 are working, producing 41 wood and 39 food a second into a container that cannot hold them |

Every system in the game is simultaneously at its ceiling, and the game's own
copy tells the player their village's work is **thrown away**. The trade board
— the one system that should absorb a surplus — is offering to swap a capped
resource for a capped resource.

This is not a balance problem. The game has run out of game, and it says so
out loud. It is also, usefully, the *only* thing in this survey that is
urgent: the art is good, the economy is honest, the walk cycles are in, and
the harness is the best part of the project. What is missing is somewhere for
all of it to go.

**Content volume, for scale.** Village has 8 buildings and 6 decorations and
2 resources. Village City, its nearest League B competitor, ships ~200
buildings. Township carries 250+ goods. Nobody needs 200 buildings — but 8 is
the number that produces the table above.

---

## 5. What the giants actually do, stripped of the monetisation

From the Township teardown, the parts that are design rather than business:

- **The loop is a puzzle, not a tap.** An order is a question: what do I make,
  in what order, and when do I come back? Village's orders are not a question,
  because with two interchangeable resources there is nothing to work out.
- **Almost every action grants XP**, so there is never one blocked path. A
  player who does not want to do the thing the goal asks for can still move.
  Village has exactly one progression track, a linear ladder of 23, and when
  it ends, progression ends.
- **An unlock changes how the game is played**, not how big a number is.
  Levelling opens the Mine, then the Zoo, then ships and islands — each a new
  verb. Village's unlocks are *more of the same building*.
- **Events every 7–10 days with about two weeks between**, each with its own
  recipes, currency and cosmetics.
- **Collections.** Animal cards through orders, chests and mini-games — a
  collect-and-complete layer sitting on top of the economy.
- **Decorations and roads do nothing in Township.** The teardown says so
  explicitly: city layout does not affect outcomes. **Village is better than
  Township here**, and it is the one place where that is flatly true — roads
  really move villagers at 2.2×, wells really boost what is near them,
  storehouses really shorten real carrying trips. This is the game's actual
  design identity and it is currently under-used.

And from League B, the thing players praise most in Pocket City 2 is not a
system at all: it is **being able to walk around your own city** — enter
buildings, meet the people. The most-loved feature in the closest premium
competitor is *looking at the place you made, up close, with people in it.*

Village shipped painted walk cycles for three villagers this week.

---

## 6. What to change, in order

Ranked by (what it fixes) ÷ (what it costs). Each is one commit with its own
mutation-proven checks. Pick one; nothing below depends on anything above it
except where it says so.

### Tier 1 — stops the game ending

**1. Make the surplus mean something: the Wonder.**  ✅ DONE
A multi-stage landmark — a lighthouse, a cathedral, a harbour — that consumes
wood and food *without a ceiling*, in large stages, each stage changing the
island's skyline. It turns "thrown away" into "contributed", converts an
infinite income into an infinite sink, and gives the finished village a
visible reason to keep producing. The game already tracks `sharedTotal`
(5.4M wood, 5.1M food on the live save) — a number nobody can spend. Spend it.
*Touches:* a new building kind with stages, one goal entry, the away banner.

**2. Fix the trade board above the cap.**  ✅ DONE
Orders between two capped resources are noise. At the cap, traders should
want goods and offer **things that cannot be built**: decorations not in the
tray, a rare building skin, Wonder materials, a named villager. Keep the
existing order generator for the early game; add a late tier.
*Touches:* `makeOrder`, order tiers, the orders panel.

**3. Goals that do not run out.**  ✅ DONE
After goal 23, generate requests from the village's own state — "house 80
villagers", "reach 900 charm", "lay 40 road tiles", "ship 100k to the
neighbours". Not infinite difficulty, infinite *acknowledgement*. The strip at
the top of the screen is the game's pulse and it currently flatlines.
*Touches:* `GOALS`, `stepGoals`, the goal strip.

### Tier 2 — makes it a different game to play

**4. A third resource and one production chain.**
One intermediate good — stone from a quarry, or bread from a bakery taking
wood + food — is the smallest change that turns the economy into a puzzle.
Suddenly an order is a question, the storehouse layout matters, and a farm
and a mill are not interchangeable. This is the single biggest depth-per-line
change available, and it is also the riskiest: it touches the economy the
harness measures. Do it after Tier 1, with the sweeps extended first.
*Touches:* `BUILDINGS`, `res`, caps, orders, `deliveredAtMul`, several sweeps.

**5. Put something ON the new land.**  ✅ DONE
Claiming a ring of land is the game's best moment and it currently reveals
empty grass. Put a ruin to restore, a shipwreck, an overgrown orchard, a
standing stone on each tier — found, not bought. A reveal, not a rectangle.
*Touches:* `coverPlaced`/land tiers, a few art keys, one new interaction.

**6. Name the villagers.**  ✅ DONE
72 anonymous figures become 72 people the moment they have names and trades,
and the walk cycles just made them worth watching. Tap one: name, job, where
they are going, how far they walk each day. Near-zero economic risk, very high
affection per line of code — and it directly targets what Pocket City 2's
players say they love.
*Touches:* villager records, one panel.

### Tier 3 — makes it feel alive

**7. Seasons.**
The clock already drives light. Four palettes on a date-driven cycle — spring
green, summer gold, autumn rust, winter snow on the roofs — is enormous
perceived freshness for a small, offline, server-free change. It is the League
A "event" feeling without any of the League A machinery.
*Touches:* the palette/light path, the ground and roof tints.

**8. Lean into the thing Township gave up.**  ✅ DONE
Layout is this game's identity and the player used 14 decorations out of 60
and almost no roads. Make the spatial truth visible: show a villager's walking
time, show what a road saves before it is laid, show a well's radius while
placing. The system is already honest — the player simply cannot see it.
*Touches:* placement preview, the building panel.

**9. Say the quiet part in the store listing.**  ✅ DONE
"No energy. No timers. No ads. No purchases. Works on a plane." That sentence
is the whole of §3 and it is free.

---

## 7. What not to do

- **No energy, ever.** It is the category's defining mistake and the game's
  main advantage is not having it.
- **No timers as a wall.** Build times that give a village its rhythm are
  fine. Build times you are invited to skip are the same mistake wearing a
  hat.
- **No fake multiplayer.** No server, and a fake neighbour is worse than none.
  `sharedTotal` is the right shape of fiction: neighbours who exist only as a
  number the player's work flows into.
- **No prestige reset.** Players in other builders say plainly that a reset
  that only scales numbers *"does nothing but hold them back"*. A reset that
  changed the rules could work; one that re-runs the same 23 goals would not.
- **Don't trade the layout truth for content.** The fastest way to add
  buildings is to make them decorative. That would throw away the one thing
  this game does better than the billion-dollar one.

---

## Sources

Township teardown and Hay Day interview: Deconstructor of Fun. Player
complaints: App Store and Google Play review pages for Sunrise Village,
Klondike Adventures and Family Island. Energy-video view counts: the Sunrise
Village official YouTube channel and YouTube search results, read October
2026. Pocket City 2 reception: TouchArcade review and App Store reviews.
League B shelf: Google Play and App Store listings for Village City, Cozy
Town, TheoTown and Designer City 2.
