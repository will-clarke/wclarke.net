# SHIPSHAPE
### an incremental tower-defence where packing your ship well IS the strategy

**One-liner:** *Build a scrapheap spaceship out of awkward pieces, in real time, while the
asteroid belt tries to take it apart - and every piece you socket in snugly makes it hum.*

**Platform:** mobile-first PWA (portrait, one thumb). Desktop works but is never the design
target.

**Tone:** industrial salvage - welds, rivets, gun spurs, scorched metal. No biology in the
MVP presentation. (The systems still produce organic-looking ships; we let players notice
that themselves. See §13.)

---

## 1. Pillars

1. **Packing is the game.** Finding a piece that sockets perfectly into a pocket must be
   rewarding *mechanically* (welds, synergies) and *sensorially* (thunk, sparks, number).
   Every unlock and upgrade should change what "packed well" means, so the puzzle never
   finishes.
2. **Build during the wave.** No build phase / defend phase split. The tension is dragging a
   piece into a gap while a rock is inbound. Bullet time keeps it fair, not calm.
3. **One thumb, zero chrome.** Every interaction in the bottom 40% of the screen. A mechanic
   that needs a new button pays rent or dies. All ship state renders *on the blocks*, never
   in panels.
4. **Simple rules, deep consequences.** ≤ 6 rules before first death. Depth from rule
   interaction, not rule count. Every rule must be **discrete and checkable at placement
   time** - no continuous fields the player has to mentally simulate. (This clause is why
   heat was cut; see §14.)
5. **Tune by simulation.** The sim core is headless, deterministic, and brutally fast from
   day one. Balance claims are tested claims (§15) - never vibes.

---

## 2. The loops

```
 20 seconds   ─ Draft: 3 priced pieces → afford? fit? need? → drag one in, feel the weld
 ~2 minutes   ─ Wave cycle: pressure spikes → breach → seal, repair, repack, push lure up
 5-30 minutes ─ The run: grow → perimeter can't keep up with mass → architecture fails → die
 Forever      ─ Tech tree: new shapes & blocks & upgrades → new best packings → rebuild better
```

---

## 3. Resources & trade-offs (the economy, nailed down)

Three resources: **Scrap** is money, **Perimeter** is capacity, **Time** is pressure.

### Scrap (money)
The only spendable currency in a run. Earned through the **ore pipeline**:

```
 rock ──carve──▶ chunks ──tractor──▶ refinery ──▶ SCRAP
   │              (drift, expire 20s)   (throughput-limited)
   └──vaporise──▶ 25% value as instant scrap, no logistics
```

- **Carve** (Harvester): slow kill, rock breaks into chunks worth 100% value - but chunks
  must be collected (Tractor range) and refined (Refinery throughput) before they expire.
- **Vaporise** (Laser): fast kill, 25% value, zero logistics. Safety you pay for.
- The Core has a built-in weak tractor (r4) and slow refinery (1 chunk/4s), so run 1 works
  without either block. Dedicated Tractor/Refinery blocks are what an economy *build* looks
  like.

### Perimeter (the constrained spatial resource)
Everything that touches the outside world needs an **exposed cell** (≥1 orthogonal empty
neighbour), and exposed cells are scarce:

- Turrets only fire while exposed. Heavy turrets need **2+ exposed edges** (a corner or a
  fin tip) - hardpoints are rarer than mounts.
- Every exposed cell is also a cell that can be shot. Perimeter is simultaneously your
  weapon capacity and your attack surface.
- **The square-cube doom clock:** wave pressure scales with mass (~area), but mount points
  scale with perimeter (~√area). Defence-per-mass *mathematically must* decline as you grow.
  Death isn't a difficulty spike we script - it's geometry. Fins and spurs fight the curve
  (more perimeter per mass) at the cost of more surface to defend and repair.

Perimeter needs no meter, no overlay, no tutorial: you can *see* it. It is the answer to
"why not just blob up?" and it is fully legible at placement time.

### Time (pressure)
Tray refreshes every 25s and replaces unbought offers - use it or lose it. Waves don't wait.
Chunks expire. Bullet time (§9) lets you *think*, never *stall*.

### The trade-off inventory
Every interesting decision in the game should reduce to one of these six:

| # | Tension | Pulled by |
|---|---|---|
| 1 | **Exposure vs enclosure** | Everything useful wants to be on the dangerous side of the hull. Sealing protects and auto-repairs, but spends perimeter and mothballs turrets. *The central tension.* |
| 2 | **Compact vs crenellated** | Convex ships are cheap to defend but mount-starved; finned ships bristle with hardpoints but present more surface and stretch repair. Both must be viable (§15 tests this). |
| 3 | **Greed vs safety** | Carve vs vaporise; the lure dial; letting rocks inside harvest range. |
| 4 | **Throughput vs capacity** | Harvest rate vs tractor coverage vs refinery throughput. Over-mine and chunks expire uncollected - factory balance in miniature. |
| 5 | **Growth vs pressure** | Wave budget scales with mass; mounts scale with perimeter. Every block is a bigger target and a worse mount ratio. |
| 6 | **Now vs later** | Take the ×4 weld now, or keep the pocket open for the perfect piece? Small pieces cheap and surgical, big pieces scrap-efficient. Reroll or wait 25s. |

**Rejected resources** (each considered seriously):
- **Heat (diffusion sim)** - cut after design review. It did two jobs: punish density and
  make upgrades reshape layouts. Perimeter + exposure-counts do both jobs discretely and
  legibly, with none of the tuning surface or mental-model cost. Full reasoning in §14;
  a discrete vestige ("venting") is parked in v2 with an evidence trigger.
- **Global power/energy** - a bookkeeping number with no spatial texture.
- **Crew/population** - theme drift, second bookkeeping number.
- **Research as a run currency** - front-loads a third economy; deferred to v2.

---

## 4. The grid & the three spatial rules

Square grid, unbounded. You start as a 2×2 **Core** plus a few starter cells. Pieces are
polyominoes (single block-type per piece) placed edge-adjacent to the existing ship, paid in
scrap on placement.

### Rule 1 - Exposure (perimeter is capacity)
Turrets only operate while **exposed**. Standard turrets need 1 exposed edge; heavy turrets
need 2+ (corners, fin tips). Sealed turrets are **mothballed** - dormant, safe, and they
*wake up* the instant a breach re-exposes them. Buried veteran guns become an emergency
reserve exactly where the wound is. We don't code that behaviour; it falls out of the rule.

### Rule 2 - Enclosure
Cells unreachable from open space (flood-fill) are **sealed**: they can't be hit, damaged
sealed cells self-repair (1 HP/s), and empty sealed gaps are slowly plated over with free
Hull by repair nanites (30s). Sealing a ring gives a pulse + heavy haptic - the line-clear
moment.

Nanite plating quietly solves "a 1-cell hole no piece can patch" and thickens old ships
automatically. Enclosure gives protection and repair *only* - no output bonus. Defence comes
from geometry, economy comes from packing. Clean split.

### Rule 3 - Welds (the packing reward)
When a piece is placed, count the edges it shares with pre-existing ship cells. Each welded
edge grants that piece a **permanent +3% output and +3 max HP**. A 4-cell piece dropped onto
flat hull welds ~4 edges; the same piece socketed into a matching pocket welds 7-9.

- Placement popup: **"WELD ×8"** + sparks + rising haptic. Finding the perfect socket must
  feel like clearing a Tetris line.
- Counted at placement only, so *build order is strategy*: leave the pocket open, wait for
  the piece that fills it, decide whether the tray will ever offer it. That gamble is the
  20-second loop's best decision.
- Welds vs perimeter is a genuine dilemma: max welds = filled pockets = shrinking perimeter.
  The two reward systems pull against each other by construction.
- Legibility: high-weld pieces get visible weld-seams. You can read a well-built ship at a
  glance.

Three rules, all discrete, all checkable the moment your thumb hovers a ghost. Gun spurs,
crenellated battleships, mothballed reserves, pocket-keeping - all emergent (§12).

---

## 5. Blocks (MVP: 6 + Core)

Single block-type per piece; colour + icon + cell pattern = function, readable at phone size.

| Block | Role | HP | Exposure | Notes | Scrap/cell |
|---|---|---|---|---|---|
| **Core** | lose it = run over | 50×4 | - | innate tractor r4, refines 1 chunk/4s; not draftable | - |
| **Hull** | armour | 30 | - | no function is the function | 2 |
| **Laser** | vaporise turret | 12 | needs 1 edge | 360°, 1 dps, r6; 25% instant scrap | 4 |
| **Harvester** | carve turret | 12 | needs 1 edge | 0.5 dps, r4; 100% value as chunks | 4 |
| **Cannon** | heavy turret | 14 | **needs 2 edges** | 3 dps, r8, slow; the hardpoint block - reshapes hull design around corners/fins | 7 |
| **Tractor** | chunk collection | 10 | works sealed | pulls chunks r5 | 4 |
| **Refinery** | chunk → scrap | 10 | works sealed | 1 chunk/2s throughput | 5 |
| **Reactor** | amplifier | 8 | works sealed | +50% output to orthogonal neighbours (non-stacking); **explodes 15 AoE on death** | 8 |

*(That's 7 draftable - Cannon is listed but tech-gated; at any point in run 1 the player has
seen at most 4 block types.)*

Adjacency synergies (MVP - exactly four, one per interesting pair):
- **Reactor ▸ neighbour:** +50% output
- **Tractor ▸ Refinery:** +20% yield on directly-routed chunks
- **Laser ▸ Laser:** +10% fire rate per adjacent laser, cap +30% - batteries want to
  cluster, but clustered guns eat scarce perimeter. One synergy line creates a named
  structure ("battery") with a built-in cost.
- **Hull ▸ Cannon:** +1 range per adjacent Hull, cap +2 - "reinforced mount"; heavy guns
  want armour collars, gluing defence and offence together spatially.

**Run 1 kit:** Hull, Laser, Harvester. Tractor, Refinery, Cannon, Reactor are early tech
unlocks - the tree doubles as tutorial pacing.

**Rejected for MVP:** Radiator (died with heat), mixed-type pieces (kills glanceability),
shield blocks (enclosure is the defence mechanic; don't duplicate), conveyor/logistics
blocks (tractor radius + refinery adjacency give 80% of factory feel for 5% of UI).

---

## 6. Shapes & upgrades: the axes that reopen the puzzle

Shapes are tech-tree content, separate from blocks. Every new shape changes what's packable;
every upgrade changes what *should* be packed. The puzzle never settles.

- **Run 1 pool:** domino, both trominoes, O- and L-tetromino. Small pool = learnable pockets.
- **Tech unlocks:** S/Z, T, I tetrominoes → then pentominoes (U first - it's the
  pocket-maker - then P, W, ...).
- **Design rule for every shape unlock:** it must enable at least one *nameable* new
  structure. U-pentomino + Reactor in the notch = "power socket" (reactor welded on 3 sides,
  buffing 3 neighbours). If we can't name the combo it enables, the unlock isn't ready.
- Bigger shapes are cheaper per cell and weld more edges - late-game pieces are better in
  skilled hands and clumsier in unskilled ones. The right kind of power.
- **Upgrades reshuffle layouts via exposure-counts and synergy weights**, both discrete:
  Laser Mk2 = +60% dps but needs 2 exposed edges (bigger barrel) - yesterday's flush-mounted
  laser row is obsolete; the meta moves to crenellated hulls. Reactor Mk2 buffs diagonals
  too - dense cores get better. Each Mk changes *where* a block wants to live, not just a
  number. This is "upgrades change the most efficient structures" as a rule, not a hope.

---

## 7. Threat: rocks are food and target both

- Rocks spawn on a **pressure budget**: `P/s = 0.8 + 0.02 × ship_mass`, spent on small/
  medium/large rocks (large split when killed). Roughly aimed at the ship, with scatter.
- **Growth is the doom clock** - and the square-cube curve (§3) means the clock is built
  into geometry. You are never punished for playing, only for becoming big and magnificent:
  the emotion the prestige button rides on.
- **Lure dial** (0.5×-2.0× pressure *and* ore value): one thumb slider. Risk appetite as a
  gesture. Crank it when sealed and gunned; drop it while wounded. Replaces zones in the MVP.
- Impact: rock hits the first cell on its path, deals damage, dies (small/med) or continues
  with remaining HP (large). No pathing, no swarm AI in MVP. Aliens are v2.

---

## 8. Veterancy (in-run scaling, zero UI)

Blocks level through use - turrets by kills, tractors by chunks, refineries by scrap
processed. Lv2 (+30%) at 20, Lv3 (+60%) at 100. Shown as pips on the cell.

- Replaces an in-run upgrade shop entirely.
- Loss aversion payoff: a breach threatening the veteran battery is drama no HP bar can buy,
  and mothballed veterans make burying a levelled gun a real decision.

---

## 9. Mobile UX spec

### Layout (portrait)

```
┌─────────────────────────┐
│ scrap ▪ 1,284   wave 7  │  ← status strip, read-only, thin
│                         │
│        [ SHIP ]         │  ← canvas: pinch/pan, director
│      auto-framed        │     camera auto-fits ship+threats;
│                         │     welds = seams, levels = pips,
│                         │     mothballed = grey, sealed = tint
│  ◐ lure ────────○────   │  ← slider, bottom-left arc
│ ┌─────┐ ┌─────┐ ┌─────┐ │
│ │ ▓▓  │ │ ░░░ │ │  ▓  │ │  ← draft tray: 3 offers,
│ │ ▓   │ │   ░ │ │ ▓▓▓ │ │     price on each card
│ │ 12⚡ │ │  6▣ │ │  8✚ │ │
│ └─────┘ └─────┘ └─────┘ │           (reroll ↻ 5)
└─────────────────────────┘
```

All state (welds, exposure, veterancy, sealed/mothballed) renders **on the blocks**.
There are no panels to open during play.

### Placement: drag with offset ghost + sticky snap
1. Touch a tray card → piece lifts, ghost rendered **~80px above the finger** (never
   occluded).
2. Ghost sticky-snaps to the nearest legal position (edge-adjacent to ship) within ~1.2
   cells. Legal positions hug the hull, so the candidate set is small and snap can be
   generous at any zoom. Green = legal, red = not. **Live previews on the ghost:** weld
   count ("×7") and, for turrets, whether the mount requirement is met - shopping for the
   socket is visible before you commit.
3. Release on green → placed, scrap deducted, weld popup, haptic. Release on red → piece
   returns to tray. No confirm step; ghost + snap + preview *is* the confirmation.
4. **Bullet time:** while holding a piece, the sim runs at 0.15×. Real-time stays honest
   (rocks creep) but placement is thoughtful. This single trick is what makes "build during
   the wave" work on a phone.

### Rotation: none at first - then a tech unlock
The Blockudoku lesson: fixed orientations *add* decision weight per offer (an L and its
mirror are different offers) and delete an entire control surface. Run 1 has two controls:
drag, and one slider.

**Gyro Servos** (tech tree, cheap - target run 2-3) unlocks rotation: while dragging, a ↻
button appears over the vacated tray slot; second-finger tap anywhere is the power-user
shortcut. Rotation is objectively powerful (placement freedom ≈ weld count ≈ scrap
efficiency), so gating it turns a UI feature into a felt reward. If playtests say the gate
frustrates, the fix is a cost tweak, not a redesign.

### Camera
- Director camera auto-fits ship + threat margin; growth reads as automatic zoom-out.
- Pinch/pan overrides; ⌖ recenter chip appears when overridden.
- Camera locks during drag - the aim point never moves under the thumb.

### Full gesture map (the whole game)
| Gesture | Action |
|---|---|
| drag from tray | place piece (bullet time active, live weld + mount preview) |
| ↻ button / second-finger tap while dragging | rotate (post-Gyro) |
| drag slider | lure |
| pinch / pan / tap ⌖ | camera |
| long-press a cell | inspect card + demolish (50% refund, confirm bubble) |
| tap tray card | tooltip only |

Six gestures, two optional. A feature needing gesture seven is presumed guilty.

### Feel & accessibility
- Haptics: tick on snap, thunk + sparks on weld, heavy pulse on seal.
- Screen-shake budget: breaches and reactor chains only.
- Colour-blind safe: block identity = colour + icon + cell pattern.
- Short-scale numbers (1.2k) from day one.

---

## 10. Death & tech tree (prestige)

Death = Core destroyed. Slow-mo break-apart, then the salvage counter rolls.

**Tech Points:** `TP = floor(peak_mass / 10) + waves_survived`. Simple enough to compute
mid-run ("one more wave = 3 TP").

### Tech tree (MVP, ~14 nodes)
| Branch | Nodes |
|---|---|
| **Blocks** | Tractor → Refinery → Cannon → Reactor → block Mk2s (see §6) |
| **Shapes** | S/Z → T → I → U-pentomino → P/W pentominoes |
| **Fitting** | **Gyro Servos (rotation)** → cheaper rerolls → 4th tray slot |
| **Chassis** | +HP all cells → starting layout: begin with a saved 10-cell design |

The starting-layout node is the seed of v2 blueprints - "your design is your inheritance".

---

## 11. Numbers (first pass - tuning targets, to be settled by the harness in §15)

| Parameter | Value |
|---|---|
| Starting scrap | 30 |
| Tray refresh / reroll | 25s / 5 scrap, +5 per use within a wave |
| Rock value (chunks) | small 5 / med 15 / large 40 |
| Rock HP / impact dmg | 3/10/30 · 5/15/40 |
| Chunk expiry | 20s |
| Pressure | `0.8 + 0.02 × mass`, × lure (0.5-2.0) |
| Weld bonus | +3% output, +3 HP per welded edge |
| Sealed repair / nanite plating | 1 HP/s / empty sealed cell → Hull in 30s |
| Expected run 1 / run 5 | 6-8 min / 20-30 min |
| First TP haul | ~15 (first node costs 10) |

Balance invariants (each becomes an automated test in the harness):
- Pure-turtle (all Hull) starves; pure-greed (all Harvester) dies by wave ~4.
- Compact and crenellated archetypes both reach wave 10 in skilled (bot) hands - neither
  dominates by more than ~20% median survival.
- Vaporise-everything is viable but visibly poorer - a floor strategy, not a trap.
- Lure 2.0× kills any ship not specifically built for it.
- Median weld count for surviving bots trends up over a run - if it doesn't, welds aren't
  worth chasing and the bonus needs retuning.

---

## 12. Emergence checklist

Structures we expect to see **without coding or hinting them**. If playtests and bot runs
don't surface most of these, the three rules are mistuned:

- [ ] **Gun spurs** - hull fins built to manufacture corners for Cannons
- [ ] **Crenellated battleships vs compact ironclads** - perimeter-maximisers vs
      perimeter-minimisers, both viable
- [ ] **Batteries with armour collars** - laser clusters, cannon+hull mounts
- [ ] **Mothballed reserves** - deliberately buried veteran turrets as breach insurance
- [ ] **Pocket-keeping** - players leaving a notch open for the right piece, and the tray
      gamble that follows
- [ ] Lure rhythm: crank after sealing, drop while wounded
- [ ] Deaths described as "I got greedy", not "that was unfair"

---

## 13. Roadmap

**MVP:** everything above. One screen + death screen + 14-node tree. Rocks only.

**v2 - the ecosystem:**
- Aliens (strafing wasps - the first threat that splits defence from economy)
- **Section blueprints**: select a region → save as a stamp → place as one grouped unit
  next run
- Offer-lock (hold a tray card through refresh); research currency if the tree needs a
  second axis
- **Venting** (heat's discrete ghost): high-output blocks want an adjacent exposed edge or
  run at -25%. *Trigger:* only if playtests/bot runs show shapeless blob-ships winning -
  i.e. if perimeter alone isn't enough counter-pressure against density.

**v3 - the fleet / the drift:**
- Second Core: the ship splits management - each section gets a defence/economy slider and
  auto-drafts its own pieces. The player graduates from placing pieces to directing
  sections: the incremental "game plays itself" arc, delivered spatially.
- Idle **drift mode**: park in a dead zone - no threats, trickle income, safe to close the
  app. (Idle is deferred here because live threats + offline time are fundamentally at odds.)
- *The biology, quietly:* by v3 the ships already look like organisms - finned, lobed,
  self-healing, veterans waking at wounds. If we ever lean into it, it's a cosmetic skin
  and renamed tooltips, not a system. The mechanics were the biology all along.

---

## 14. Design history: why heat was cut

Recorded so we don't re-litigate it (or so we can, honestly, if evidence changes).

Heat (per-block generation, diffusion to neighbours, escape at exposed cells/radiators,
throttling when hot) was in the v2 draft of this doc as the "constrained resource". It was
cut on review:

1. **Wrong genre of rule.** Exposure, enclosure and welds are discrete and checkable the
   moment a ghost hovers. Heat is a continuous field the player must mentally simulate -
   a violation of pillar 4 that no amount of glow-rendering fixes.
2. **Illegible punishment.** Throttling means "your numbers quietly got worse" - the worst
   feedback mode on a phone screen.
3. **Tuning surface.** Gen/capacity/diffusion per block × every upgrade × veterancy would
   have eaten the entire tuning budget.
4. **It was redundant.** Both its jobs are done better by discrete mechanisms already in
   the design: *punishing blind density* → perimeter scarcity + the welds-vs-perimeter
   dilemma; *upgrades reshaping layouts* → exposure-count requirements and synergy-weight
   changes per Mk.

What heat uniquely offered - a slow rhythmic in-wave pressure ("redlining") - is the one
loss. If runs feel static between rocks, revisit via v2 Venting (discrete, placement-time),
never via the diffusion sim.

---

## 15. Headless simulation & AI-in-the-loop tuning

A day-one architecture requirement, not a later tool. **The sim core is the game**; the UI
is a subscriber.

### Architecture
```
core/
  params.ts      every tunable in ONE flat, typed object (costs, HP, pressure curve,
                 weld %, synergy weights, tray timing...) - no magic numbers elsewhere
  sim.ts         pure TS, zero DOM/canvas imports, fixed 100ms tick,
                 seeded PRNG (mulberry32) - same seed + same inputs = same run, always
  types.ts       ship grid, rocks, chunks, tray, events
harness/         (node, never shipped)
  policies/      bot archetypes that play the game via the same API a thumb uses:
                 turtle · greed · balanced · battery-rusher · crenellator · random
  run.ts         run(policy, params, seed) → RunMetrics
  sweep.ts       grid/random search over param ranges, N seeds per point
  report.ts      aggregate → JSON/CSV + terminal summary
ui/              renderer + input only; imports core/, owns nothing simulated
```

### Speed target
≥ 50k ticks/sec/core headless (no rendering, sparse grid, object pooling). A 20-minute run
is 12k ticks → **under a second**. A 1000-run sweep across 5 policies finishes over a
coffee. If the sim can't hit this, it's too complicated - the speed target is itself a
design constraint keeping mechanics lean.

### Metrics per run
Death wave & cause, run length, scrap curve (income/sec over time), perimeter utilisation
(mounts used / mounts available), mean weld count, block-type census over time, lure
profile, TP earned.

### Invariants as tests
Every §11 balance invariant becomes an assertion over sweep output
(`greed policy: median death wave in [3,5]`, `no archetype >20% median survival advantage`,
...). `npm run balance` = red/green balance state. Changing a param and seeing which
archetype breaks is a test failure, not a playtester anecdote three days later.

### The AI tuning loop
The harness is built for an AI collaborator to drive:
1. Propose param change (or a new bot policy to probe a suspected degenerate strategy)
2. Sweep thousands of seeded runs
3. Read aggregated metrics, not gameplay
4. Adjust, repeat - and commit params only when the invariant suite is green

Bots deliberately include *exploit-seekers* (e.g. a policy that only builds Hull+1 laser,
or max-lure rushers): the cheapest way to find degenerate strategies before players do.
What bots can't measure - fun, feel, drama - stays human: playtests answer "is it fun",
the harness answers "is it fair and do the curves hold".

---

## 16. Tech note

TypeScript + Canvas2D (WebGL only if profiling demands), installable PWA, localStorage
saves with export string, Vite, no engine. Sim/UI split as §15 - the renderer subscribes to
sim state and forwards inputs; nothing else. The hard part is feel, not compute - test
sticky-snap and bullet time on a real mid-range Android phone in week one.
