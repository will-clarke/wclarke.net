# SHIPSHAPE - implementation tasks

Read `DESIGN.md` once before starting. This file is the build order. Do the
tasks **strictly in order**, one at a time.

---

## Golden rules (read before every task)

1. **Never edit frozen files.** `src/core/types.ts`, `src/core/params.ts`
   (structure), `src/core/shapes.ts`, `src/core/prng.ts`, and every function
   signature marked FROZEN. If a contract seems wrong or ambiguous: **STOP**,
   write the question in `NOTES.md` under "Contract questions", skip that bit,
   and continue with what is unambiguous.
2. **Never edit an existing test assertion.** Pre-written tests ARE the spec.
   If a test seems wrong, treat it as rule 1.
3. **Tests define done.** Each task says which `describe.skip` blocks to
   activate (change `describe.skip` → `describe`). A task is finished only
   when `npm test` is fully green AND you have added at least 3 edge-case
   tests of your own for the new code.
4. **No randomness except the injected Prng. No wall-clock time in src/core.**
   `tests/guardrails.test.ts` enforces this; if it goes red, your change is
   wrong, not the guardrail.
5. **All params in natural units** (seconds, per-second, scrap). Convert with
   `TICKS_PER_SECOND` inside core code. Never add a per-tick value to params.
6. **Do not refactor, rename, reformat, or "improve" code outside the files
   your task lists.** No new dependencies, ever, without asking.
7. **Determinism is sacred.** Iterate Maps only in insertion order or over
   sorted keys when order affects outcomes (it does for targeting, refining,
   damage). When in doubt, sort by cell key string.
8. **Ids come only from `state.nextId++`.** Never invent another counter.
9. Commit after each accepted task: `git commit -m "shipshape: T<n> <name>"`.
10. Keep functions small and boring. Match existing style. No comments that
    restate code.

Commands: `npm test` · `npm run typecheck` · `npm run dev` · `npm run sim` ·
`npm run sweep` · `npm run balance`

File map:

```
src/core/     pure deterministic sim - NO DOM, NO node builtins
  types.ts    ⛔ frozen contracts (read it fully before T1)
  params.ts   ⛔ frozen structure; values tunable only in T13
  shapes.ts   ⛔ frozen, implemented
  prng.ts     ⛔ frozen, implemented
  grid.ts     T1    pieces.ts  T2    sim.ts  T3
  waves.ts    T4    combat.ts  T5    economy.ts  T6
  repair.ts   T7    tray.ts    T8    veterancy.ts  T9
harness/      node-only test/tuning rig (T11-T13)
src/ui/       browser only (T14-T16)
tests/        vitest; guardrails must stay green forever
```

---

## T1 - Grid geometry

**Files:** `src/core/grid.ts` (bodies only). **Activate:** both `T1` blocks in
`tests/grid.test.ts`.

Implement `computeExposure`, `shipMass`, `shipBounds` exactly per their doc
comments. Algorithm for `computeExposure`:

1. If the ship is empty, return empty structures.
2. Compute bounding box of all ship cells; inflate by 1 in every direction.
3. BFS/DFS from any inflated-border cell over EMPTY cells inside the inflated
   box, orthogonal moves only. Everything reached = "outside". (Cells beyond
   the box are trivially outside; the border is all-empty so the fill reaches
   the whole perimeter.)
4. Empty cells inside the box never reached → `interiorEmpty`.
5. For each ship cell, `exposedEdges` = count of its 4 orthogonal neighbours
   that are OUTSIDE cells (empty AND reached). Interior-empty neighbours
   contribute 0.

Performance: O(area of bounding box). No recursion (stack overflow risk on
big ships) - use an explicit queue/stack array.

**Accept:** `npm test` green with T1 blocks active; +3 own tests (suggested:
donut with 2 separate pockets; ship far from origin, e.g. all coords > 500;
single row of 10).

---

## T2 - Placement, welds, demolish

**Files:** `src/core/pieces.ts` (bodies only). **Activate:** `T2
checkPlacement` in `tests/pieces.test.ts`; replace the `it.todo` block
`T2 applyPlacement essentials` with real tests you write (same names, real
assertions).

`checkPlacement`: follow the precedence order in its doc comment EXACTLY -
the tests check which reason wins when several apply. Target cells =
`orientedCells(offer.shape, rotation)` offset by `(x, y)`. Weld counting:
for each target cell, count orthogonal neighbours present in `cells`; sum.

`applyPlacement` (per its doc comment) and `applyDemolish` (whole piece via
`pieceId`; skip cells already destroyed; core never demolishable; refund uses
`floor`). `applyDemolish` must also clamp: if the cell at (x,y) doesn't exist
or is core → return null, change nothing.

**Accept:** T2 tests green; your `applyPlacement` tests cover every bullet in
the doc comment; +3 edge cases (demolish a partly-destroyed piece; placing
with exactly enough scrap; weld count against two disjoint ship regions).

---

## T3 - Sim shell, tick order, determinism

**Files:** `src/core/sim.ts`; create empty-bodied subsystem files
`src/core/waves.ts`, `combat.ts`, `economy.ts`, `repair.ts`, `tray.ts`,
`veterancy.ts` each exporting the update function the shell calls (you choose
these internal signatures - they are NOT frozen, but each takes
`(state, params, unlocks, prng, events)` at minimum and pushes SimEvents).
**Activate:** `T3 determinism` in `tests/determinism.test.ts`.

`createSim(params, seed, unlocks)`:
- Build starting cells from `params.starting.cells` + `unlocks.startingCells`
  (pieceId 0, weldCount 0, xp 0, hp = maxHp = block hp + unlocks.bonusHp).
- Initial state: tick 0, scrap from params, lure = params.lure.start, wave 1,
  tray = array of `unlocks.traySlots` nulls, trayRefreshAtTick 0 (i.e. first
  refresh happens on the first step), rerollsThisWave 0, empty rocks/chunks/
  hopper, peakMass = starting mass, gameOver false, result null, zeroed
  stats, nextId 1.

`step(commands)` - THIS ORDER IS FROZEN. Subsystems not yet built are no-op
stubs that you fill in T4-T10:

```
 0. if state.gameOver: return []  (sim is inert after death)
 1. Commands, in the order given: place / reroll / setLure / demolish
 2. Tray: auto-refresh if tick >= trayRefreshAtTick          (T8)
 3. Rocks: spawn from pressure budget                        (T4)
 4. Rocks: move, collide, damage cells, split                (T4)
 5. Turrets: acquire targets, fire, kill rocks → scrap/chunks(T5)
 6. Chunks: pull, collect, expire                            (T6)
 7. Refining: hopper → scrap                                 (T6)
 8. Repair: sealed regen + nanite plating                    (T7)
 9. Veterancy: apply XP thresholds → levelUp events          (T9)
10. Housekeeping: recompute exposure ONCE if cells changed this tick
    (cache it on a dirty flag - T4/T5 read it), emit sealed/breached
    diffs vs previous tick, update peakMass, wave counter
    (wave = floor(tick / (wave.length * TICKS_PER_SECOND)) + 1,
    emit waveStarted + reset rerollsThisWave on change),
    check death: any core cell destroyed → gameOver, build RunResult,
    emit gameOver
11. tick++
```

`snapshot(state)`: JSON.stringify of a plain object where `cells` is
`[...state.cells.entries()].sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0)`,
arrays kept in order, `result`/`stats` included. No floating-point rounding.

**Accept:** determinism tests green (they exercise place/reroll via the
scripted commands - tray must produce at least deterministic nulls/offers, so
implement T8's refresh as "fill with null" placeholder ONLY if you must; better:
do T3 and T8 refresh together if the scripted `place` at tick 101 needs a real
offer. The test only requires determinism, not successful placement - a
deterministic `placeRejected` is fine). +3 own tests (gameOver inertness;
snapshot stability across two structurally-equal states built in different
insertion orders; wave counter increments at exactly tick 1200 with defaults).

---

## T4 - Rocks: spawner, movement, impact

**Files:** `src/core/waves.ts`. **Write:** `tests/waves.test.ts`.

Spawner (step 3): maintain `pressureCredit` (float, in state? NO - keep it
inside a closure? NO - it must survive snapshots: add nothing to SimState;
instead derive budget arithmetic per tick statelessly as follows). Each tick:

```
mult   = lullMultiplier if tick is in the last lullFraction of the wave else 1
budget = (pressure.base + pressure.perMass * shipMass) * lure * mult / TICKS_PER_SECOND
credit = state.pressureCredit + budget      // ⚠ see below
while credit >= cheapest pressureCost:
    size   = weighted pick among affordable sizes (weights from params)
    credit -= size.pressureCost
    spawn rock: angle = prng.range(0, 2π);
      pos = ship centre + (bounds.radius + rocks.spawnDistance) * (cos, sin)
      velocity = unit vector toward a uniformly-picked ship cell centre,
                 times rocks[size].speed
state.pressureCredit = credit
```

⚠ `pressureCredit` is not in the frozen SimState. This is the ONE approved
contract addition: add `pressureCredit: number` to `SimState` (init 0) and
note it in NOTES.md under "Approved contract additions: T4".

Movement/impact (step 4), per rock: advance `speed/TICKS_PER_SECOND` along
velocity. After moving, if the grid cell containing (x, y) (i.e.
`(floor(x), floor(y))`) is a ship cell: emit rockImpact, damage the cell by
`rocks[size].damage` (emit cellDamaged; if hp <= 0 delete it, emit
cellDestroyed, count stats.cellsLost, reactor → T9 explosion hook), then:
small/medium rocks die (no scrap, no chunks, emit rockDestroyed by:'impact');
large rocks die only if the cell SURVIVED; if the cell was destroyed the rock
continues with hp reduced by 10. Rocks further than
`2 * (radius + spawnDistance)` from the ship centre are silently culled
(protects the harness from runaways).

Iterate rocks in array order; damage resolution strictly in that order.

**Accept:** your tests cover: budget math at lure min/max, lull window
boundaries, deterministic spawn positions for a fixed seed, impact kills
small rock + damages cell, large rock tunnels through a destroyed cell,
cull radius. All green.

---

## T5 - Turrets & targeting

**Files:** `src/core/combat.ts`. **Write:** `tests/combat.test.ts`.

Turret cells = laser/harvester/cannon. A turret OPERATES this tick iff
`exposedEdges(cell) >= requiredExposedEdges` (from the cached exposure).
Cooldowns: store per-cell next-fire tick in a `Map<string, number>` INSIDE
SimState - approved contract addition #2: `turretReadyAt: Map<string, number>`
(note in NOTES.md). A turret whose cooldown elapsed and which operates picks a
target: nearest rock (Euclidean, centre-to-centre) within range; tie-break by
lower rock id. No target = stays ready (does not waste the shot).

Damage per shot = `dps * cooldown * outputMult(cell)` where

```
outputMult(cell) = (1 + weld.outputPerEdge * weldCount)
                 * (1 + veterancy bonus)                      // T9, 0 until then
                 * (1 + synergy.reactorOutput if any orth neighbour is a reactor)
```

Fire-rate synergy (laser only): effective cooldown = base cooldown /
`(1 + min(laserAdjacency * adjacentLasers, laserAdjacencyCap))`.
Range synergy (cannon only): range + `min(cannonHullRange * adjacentHulls,
cannonHullRangeCap)`.

Rock killed (hp <= 0): attribute to the turret type that fired the killing
shot. laser/cannon → scrap += `round(value * instantScrapFraction)`, emit
rockDestroyed with scrapGained, stats.scrapEarned += same. harvester → spawn
`ceil(value / chunkValue)` chunks at the rock position, each value
`chunkValue`, velocity = prng.range(-1,1) each axis, expiry = tick +
chunkExpiry seconds, bonus=false, collected=false; emit rockDestroyed with
chunksSpawned. Large rocks ALSO split into `largeSplitsInto` medium rocks at
the death position with fresh prng velocities toward the ship (same rule as
spawner) - splitting happens on ANY death, including laser kills.

Turrets fire in sorted-cell-key order (determinism, rule 7).

**Accept:** tests cover: mothballed turret holds fire; wakes when a
neighbouring cell is destroyed (do it via exposure recompute, not special
code); cannon needs 2 edges (corner cell fires, flush cell doesn't); nearest-
target tie-break; weld/reactor multipliers change damage; harvester kill
spawns correct chunk count; large split. All green.

---

## T6 - Chunks, tractors, refining

**Files:** `src/core/economy.ts`. **Write:** `tests/economy.test.ts`.

Collectors = tractor cells (range `tractorRange`) + the four core cells
(range `coreTractorRange`). Per chunk per tick (array order):
1. If expired (`tick >= expiresAtTick`) and not collected: remove, emit
   chunkExpired, stats.chunksExpired++.
2. Else find nearest collector cell centre in range. If none: drift
   (position += velocity / TICKS_PER_SECOND), done.
3. If a collector is in range: set velocity toward it at `chunkPullSpeed`,
   advance. If distance to it < 0.5: collected - remove from `state.chunks`,
   push into `state.hopper` with `bonus = true` iff the collector is a
   tractor orthogonally adjacent to any refinery. Emit chunkCollected
   (by: 'tractor' | 'core'), stats.chunksCollected++, award tractor XP (T9).

Refining (step 7): total refine rate = sum over refinery cells of
`(1/refinerySecondsPerChunk) * outputMult(cell)` + core's
`1/coreSecondsPerChunk` (core has no multipliers). Track fractional progress
in `state.refineProgress` (approved contract addition #3 - note in NOTES.md,
init 0). Each whole unit of progress consumes the OLDEST hopper chunk:
scrap += `round(chunk.value * (1 + tractorRefineryYield if chunk.bonus))`,
emit refined, stats.scrapEarned += same, refinery XP split: the refinery cell
with lowest sorted key gets the XP (keep it simple and deterministic).

**Accept:** tests cover: expiry, pull-then-collect over several ticks, core
collects without tractors, bonus flag set only when tractor adjacent to
refinery, refine throughput math (e.g. 2 refineries + core = 1/2+1/2+1/4
chunks/s), hopper FIFO. All green.

---

## T7 - Repair & nanite plating

**Files:** `src/core/repair.ts`. **Write:** `tests/repair.test.ts`.

Using cached exposure:
- Every ship cell with `exposedEdges == 0` and `hp < maxHp` heals
  `sealedHpPerSecond / TICKS_PER_SECOND` (cap at maxHp).
- Every `interiorEmpty` cell accumulates plating progress; after
  `nanitePlateSeconds` of CONTINUOUS enclosure it becomes a fresh hull cell
  (pieceId 0, weldCount 0, hp = maxHp = hull hp + bonusHp), emit
  nanitePlated. Track progress in `state.platingProgress: Map<string,
  number>` (approved contract addition #4). A cell that leaves interiorEmpty
  loses its progress (delete from the map).

**Accept:** tests cover: sealed cell heals, exposed cell doesn't, plating
completes after exactly `nanitePlateSeconds * TICKS_PER_SECOND` ticks,
breach resets plating progress, plated hull can later be welded against
(weld counting sees it like any cell). All green.

---

## T8 - Draft tray

**Files:** `src/core/tray.ts`. **Write:** `tests/tray.test.ts`.

Offer generation (used by auto-refresh and reroll - identical logic):
each slot independently: shape = prng.pick(unlocks.shapes), orientation =
prng.int(4) as Rotation, block = prng.pick(unlocks.blocks), cost =
cellCount(shape) * blocks[block].costPerCell. THEN pity rules, applied to the
freshly generated tray in this order:
1. If no offer is affordable (cost <= scrap): regenerate slot 0 as the
   cheapest possible offer (D2 hull) - even if still unaffordable.
2. If any ship cell is damaged or any turret is mothballed ("breach open"
   heuristic: exposure changed a sealed→exposed cell this run - keep it
   simpler: if stats.cellsLost > 0 since last refresh) and no offer is hull:
   regenerate slot with the highest index as (random unlocked shape, hull).
Record what pity did ONLY via prng consumption - no events.

Auto-refresh (step 2): when `tick >= trayRefreshAtTick`: regenerate ALL slots
(replacing unbought offers), `trayRefreshAtTick = tick + refreshEvery *
TICKS_PER_SECOND`, emit trayRefreshed(wasReroll: false).

Reroll command: cost = `(rerollBaseCost + rerollCostIncrement *
rerollsThisWave) * unlocks.rerollCostMult`, floor it. If scrap < cost:
ignore silently (no event). Else deduct, rerollsThisWave++, regenerate all
slots, reset `trayRefreshAtTick` as above, emit trayRefreshed(wasReroll:
true). stats.scrapSpent += cost.

Place command consumes the offer (slot = null) - already wired in T2/T3.

**Accept:** tests cover: refresh cadence, reroll price escalation + wave
reset, pity rule 1 and 2 firing and NOT firing, offers always from unlocks
only, determinism (same seed same offers). All green.

---

## T9 - Veterancy, reactor explosion, XP wiring

**Files:** `src/core/veterancy.ts` + small hooks in combat/economy where XP
is awarded (turret kills +1, tractor collect +1, refinery refine +1).
**Write:** `tests/veterancy.test.ts`.

`veterancyBonus(xp)`: 0 below lv2Xp, lv2Bonus from lv2Xp, lv3Bonus from
lv3Xp. Step 9 scans cells whose xp crossed a threshold this tick and emits
levelUp (track last-seen level in the cell? No - derive: emit when xp crosses
exactly; simplest deterministic approach: store nothing, emit levelUp when
`xp - gained < threshold <= xp`). `outputMult` (T5/T6) reads
`veterancyBonus`.

Reactor explosion: when a reactor cell is destroyed BY ANY CAUSE (rock
impact, chain explosion, demolish does NOT count - demolish is deliberate
removal): deal `explosionDamage` to all 8 neighbours, emit reactorExploded,
resolve chains in sorted-key order (a queue; each reactor explodes at most
once).

**Accept:** tests cover: bonus thresholds exact, levelUp emitted once per
level, chain of two adjacent reactors, demolished reactor doesn't explode.
All green.

---

## T10 - Death & run result

**Files:** finish the death branch in `sim.ts` step 10. **Write:**
`tests/death.test.ts`.

Any core cell destroyed → gameOver = true, result = RunResult with
`techPoints = floor(peakMass / tp.massDivisor) + wavesSurvived` where
wavesSurvived = wave - 1 (completed waves). Emit gameOver. Every later
step() returns [] and mutates nothing (already specced in T3 step 0).

**Accept:** tests cover: TP formula, inert after death, result frozen (deep
equal across later steps). All green. **Also unskip nothing - instead run a
smoke check:** a 3000-tick run with empty commands at seed 1 must complete in
< 2s and end either alive or dead without throwing.

---

## T11 - Harness runner

**Files:** `harness/run.ts` (+ `harness/metrics.ts` if you want). **Write:**
`tests/harness.test.ts`.

`runOne(policy, config)`: createSim; loop until gameOver or maxTicks; each
tick call `policy.decide(state, ctx)` then `sim.step(commands)`; collect
events to build RunMetrics (fields per harness/types.ts - mountUtilisation
uses the T5 operating rule against the final state). `ctx.prng` =
`createPrng(config.seed ^ 0x5eed)` (decouples policy randomness from sim
randomness). wallClockMs via performance.now() is allowed HERE (harness is
not core).

CLI per the doc comment in run.ts. Parse argv by hand (no dep).

**Accept:** tests: runOne with a do-nothing policy is deterministic
(identical RunMetrics for same seed, minus wallClockMs); maxTicks cap works.
Plus a PERF test: a do-nothing 18000-tick run in < 3s (generous; tighten
later).

---

## T12 - Bot policies

**Files:** `harness/policies/*.ts` + fill `POLICIES` in `index.ts`.
**Write:** `tests/policies.test.ts` (each bot places ≥1 piece in its first
600 ticks on seed 1..3 with ALL_UNLOCKS).

All bots: only act when they have commands (return [] otherwise); never
throw; place using checkPlacement to pre-validate (import from core - allowed
in harness); scan candidate positions in a deterministic order (sorted ship
cell keys, then the 4 neighbours of each). Exact behaviour specs:

- `random`: every tick with prob 0.02 (ctx.prng): try up to 20 random
  (slot, position, rotation) combos, place the first legal one. Lure: leave
  at start value.
- `turtle`: buys ONLY hull, places it at the legal position minimising ship
  perimeter (recompute via computeExposure on a trial map, pick min total
  exposed edges; tie-break lowest cell key). Lure always min. Rerolls never.
- `greed`: buys ONLY harvester/tractor/refinery (hull never), placement =
  first legal position by sorted scan. Lure always max.
- `balanced`: keeps ratios by cell count: ~40% hull, ~30% turrets (laser
  preferred), ~30% economy (harvester/tractor/refinery). Each refresh: buy
  the affordable offer that best moves current ratios toward target
  (placement = highest weldCount among legal positions found in scan; cap
  scan at 200 candidates). Lure: 1.0; raise to 1.5 when scrap > 100, drop to
  min when any core-adjacent cell is damaged.
- `batteryRusher`: buys lasers whenever affordable, placed to maximise
  adjacent-laser count (then weldCount). Hull only if a core cell's
  neighbour is empty. Lure 1.0.
- `crenellator`: like balanced but placement maximises total exposed edges
  (perimeter-greedy) instead of welds; prefers cannons when unlocked.

**Accept:** policy smoke tests green + determinism (same seed → same
RunMetrics) for every bot.

---

## T13 - Sweep, balance invariants, first tuning pass

**Files:** `harness/sweep.ts`, `tests/balance/invariants.test.ts`. Values in
`params.ts` MAY be changed in this task only (structure still frozen).

Sweep CLI per the doc comment in sweep.ts. Aggregate with median (not mean)
for survival stats.

`tests/balance/invariants.test.ts` (runs via `npm run balance`; use 20 seeds
per policy, BASE_UNLOCKS for turtle/greed, ALL_UNLOCKS for the rest;
maxTicks 18000):

1. `turtle` median deathTick < `balanced` median deathTick (turtling loses).
2. `greed` median wavesSurvived between 2 and 6 (greed dies fast but not instantly).
3. `balanced` median wavesSurvived >= 6 (a sensible strategy gets somewhere).
4. No policy pair among {balanced, batteryRusher, crenellator} differs in
   median wavesSurvived by more than 35% (no dominant archetype).
5. `balanced` mean avgWeld > `random` mean avgWeld (welds are chaseable).
6. Perf: full 6-policy × 20-seed suite completes in < 120s.

Then tune `params.ts` VALUES until all six pass. Record every value change +
one-line rationale in NOTES.md under "Tuning log". If an invariant seems
unachievable, write why in NOTES.md and stop - do not weaken the test.

**Accept:** `npm test` and `npm run balance` both green.

---

## T14 - Renderer (read-only)

**Files:** `src/ui/` (new files as needed; main.ts replaced). Manual accept.

Canvas renderer at fixed 60fps rAF, sim stepped on a 100ms accumulator.
Draw: starfield-ish flat bg, ship cells (colour per block type + icon glyph +
weld seams as brighter cell borders when weldCount >= 4 + veterancy pips +
mothballed = desaturated + sealed = darker tint), rocks (grey polygons by
size), chunks (small gold dots), status strip (scrap, wave), tray cards with
price, lure slider (drawn, non-functional until T15), reroll chip.
Director camera: ease toward fitting ship bounds + 8 cells margin; lerp
factor 0.05/frame. DPR-aware. Colours/sizes in one `theme.ts`.

**Accept (manual):** `npm run dev` on a phone-sized viewport shows the
starting ship being pummelled by rocks with turrets firing back (sim runs
with empty commands). No console errors. 60fps on desktop.

---

## T15 - Input

**Files:** `src/ui/input.ts` + wiring. Manual accept.

Exactly the gesture map in DESIGN.md §9: drag-from-tray with ghost offset
80px above the finger, sticky snap (nearest legal position within 1.2 cells -
enumerate legal positions by scanning ship-adjacent empties), green/red
ghost, live weld-count label, release places (send Command) or returns,
bullet time (sim accumulator multiplier 0.15 while dragging), lure slider,
reroll tap, pinch zoom + pan + recenter chip, camera locked during drag,
long-press (500ms) inspect/demolish bubble. Rotation button + two-finger tap
ONLY when unlocks.rotation.

**Accept (manual):** all gestures work with touch emulation + a real phone if
available; placing feels instant; no gesture conflicts (pinch never places).

---

## T16 - Meta: death screen, tech tree, saves, PWA

**Files:** `src/ui/` + `src/meta/` (new: tech tree defs + save codec).
Manual accept + `tests/meta.test.ts` for the save codec.

- Death screen: run stats, TP earned, [Evolve] button → tech tree screen.
- Tech tree: the 4 branches / ~14 nodes from DESIGN.md §10 as a simple
  scrollable list grouped by branch; nodes cost TP; bought nodes modify the
  TechUnlocks passed to the next createSim. Node data lives in
  `src/meta/tech.ts` as plain data (id, branch, name, cost, apply(unlocks)).
  Costs: first node per branch 10, then 20/40/80 along each branch.
- Saves: localStorage (ui layer!), stores TP, bought node ids, and nothing
  else (runs are not saved in MVP; a closed app = run over, result banked
  as if died at close - use pagehide to bank).
- PWA: manifest + minimal service worker (cache-first for the built assets).

**Accept:** save codec round-trip test green; manual: die → earn → buy →
next run reflects unlocks; app installs and launches offline.

---

## Backlog (do NOT start): aliens, blueprints, offer-lock, venting, second
core, drift mode - see DESIGN.md §13.
