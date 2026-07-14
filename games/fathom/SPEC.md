# FATHOM - v0 Spec ("First Two Minutes")

This document is the single source of truth for v0. If TASKS.md or code
disagrees with this file, this file wins. All tuning numbers live in
section 5 and must be transcribed into `src/sim/constants.ts` exactly once -
no magic numbers anywhere else in the codebase.

## 1. What v0 is

A mobile-first web game (portrait, one-thumb) proving that the first two
minutes hook, and that the idle check-in loop works. Scope:

- Sunlit zone only: 6 node positions, 0 to -200m.
- 4 buildings: Kelp Harvester, Pearl Diver, Net Launcher, Battery.
- 2 creatures: Shimmer, Diver.
- Global power pool with day/night solar and batteries.
- Deterministic wave schedule + forecast ribbon.
- Scripted onboarding (the exact 2-minute timeline in section 10).
- Save to localStorage, offline progress up to 72h, Surface Report on return.
- PWA installable. No server, no prestige, no sub, no lore in v0.

Explicitly NOT in v0: prestige/meta, the sub/offence, per-node power
transmission, crew, biomes below -200m, leviathans, story logs, pinch zoom,
accounts, sound settings menu.

## 2. Rules for the implementer

1. TypeScript strict mode. No frameworks, no runtime dependencies. Dev deps
   only: vite, typescript, vitest.
2. The simulation (`src/sim/**`) is PURE: no `Date.now()`, no `Math.random()`,
   no DOM, no imports from `render/` or elsewhere. All randomness via the
   seeded PRNG stored in state. Time enters only as a `dtSeconds` argument.
3. All tuning values come from `src/sim/constants.ts` (transcribed from
   section 5). Never inline a tuning number.
4. Every task must end with `npm run check` passing (tsc --noEmit + vitest).
5. Do only what the current task says. Do not refactor other files, rename
   things, add abstractions, or "improve" adjacent code. Small functions,
   plain data, no classes unless the task says so.
6. Comments: only where a constraint is invisible in the code. No banner
   comments, no restating the code.
7. No em-dashes in any user-facing copy; use hyphens.

## 3. Tech and file layout

```
games/fathom/
  index.html            single page, <canvas id="game">, UI overlay divs
  package.json          see TASKS T01 for exact contents
  tsconfig.json         strict, ES2022, moduleResolution bundler
  vite.config.ts        base './'
  public/
    manifest.webmanifest
    icons/              192 and 512 png (generated, simple glyph)
    sw.js               cache-first app shell
  src/
    main.ts             boot, rAF loop, fixed-step accumulator, wiring
    input.ts            pointer events: drag-scroll, tap, hit-testing
    camera.ts           vertical camera: y offset, inertia, clamps, worldToScreen
    save.ts             load/save/version/offline-elapsed handling
    audio.ts            WebAudio synth blips (no asset files)
    onboarding.ts       beat director for the 2-minute script (section 10)
    sim/
      types.ts          all interfaces (section 4)
      constants.ts      all tuning (section 5)
      prng.ts           mulberry32 + helpers
      clock.ts          run clock, day fraction, solar factor
      schedule.ts       deterministic wave schedule + forecast data
      advance.ts        advanceTick(state) - the live sim, fixed 250ms steps
      offline.ts        advanceOffline(state, seconds) - coarse analytic sim
      actions.ts        player actions: lowerLine, build, costs
    render/
      renderer.ts       frame draw: background, world, entities
      sprites.ts        one draw function per entity kind (vector, no images)
      particles.ts      pooled particles: pops, loot pips, bubbles
      ui.ts             HUD: salvage counter, power bar, depth meter,
                        forecast ribbon, build sheet, surface report modal
```

Game loop: `requestAnimationFrame`; accumulate real elapsed time; run
`advanceTick` in fixed 250ms sim steps (max 40 steps per frame, then defer
the remainder to `advanceOffline`); render every frame with interpolation of
creature/projectile positions between ticks.

## 4. Core types (transcribe into src/sim/types.ts)

```ts
export type BuildingKind = 'kelp' | 'pearl' | 'net' | 'battery';
export type CreatureKind = 'shimmer' | 'diver';

export interface Building {
  kind: BuildingKind;
  powered: boolean;        // recomputed each tick by the power system
  charge?: number;         // battery only, 0..BATTERY_CAP
  cooldown?: number;       // net only, seconds until next shot
}

export interface LineNode {
  depthM: number;                          // from NODE_DEPTHS
  slots: [Building | null, Building | null]; // 0 = left, 1 = right
}

export interface Creature {
  id: number;
  kind: CreatureKind;
  xM: number;              // horizontal offset from cable, metres, -60..60
  depthM: number;          // current depth (larger = deeper)
  hp: number;
  state: 'rising' | 'latched' | 'fleeing';
  targetNode: number;      // index into nodes, -1 if none
  targetSlot: number;      // 0 | 1, valid when latched
  eaten: number;           // salvage consumed while latched
}

export interface Projectile {
  id: number;
  xM: number; depthM: number;
  vxM: number; vDepthM: number;  // metres/second
  ttl: number;                   // seconds
}

export interface WaveEvent {
  atRunAgeS: number;
  shimmers: number;
  divers: number;
  scripted: boolean;       // true for onboarding waves
}

export interface RunStats {
  wavesRepelled: number;   // wave fully killed, nothing latched
  wavesLeaked: number;     // at least one creature latched
  salvageEarned: number;   // lifetime this run
  salvageLostToNibbles: number;
  kills: number;
}

export interface OfflineReport {
  awayS: number;
  salvageEarned: number;
  salvageLost: number;
  waves: number;
  wavesRepelled: number;
  wavesLeaked: number;
  largestWave: number;
}

export interface GameState {
  version: 1;
  seed: number;            // run seed, set once at new game
  rng: number;             // mulberry32 state, mutated by sim only
  runAgeS: number;         // sim-seconds since run start
  salvage: number;
  deepestM: number;        // record depth reached (max node depth ever)
  nodes: LineNode[];       // index 0 shallowest; length 0 before first lower
  creatures: Creature[];
  projectiles: Projectile[];
  nextId: number;          // id counter for creatures/projectiles
  stats: RunStats;
  onboardingStep: number;  // index into the beat list, -1 when finished
  lastReport: OfflineReport | null; // set by offline advance, cleared on dismiss
}
```

## 5. Constants (transcribe into src/sim/constants.ts, exact names)

```ts
// -- time --
export const TICK_S = 0.25;                 // fixed sim step
export const DAY_REAL_S = 28_800;           // 1 in-game day = 8 real hours
export const RUN_START_DAYFRAC = 0.25;      // runs start at 06:00 in-game
export const NIGHT_START = 20 / 24;         // 20:00
export const NIGHT_END = 6 / 24;            // 06:00
export const SOLAR_RAMP_DAYFRAC = 30 / (24 * 60); // 30 in-game minutes

// -- economy --
export const START_SALVAGE = 0;
export const KELP_RATE = 0.8;               // salvage/sec
export const PEARL_RATE = 2.0;              // salvage/sec, nodes[2]+ only
export const NODE_DEPTHS = [30, 60, 90, 120, 160, 200];   // metres
export const NODE_COSTS  = [0, 5, 25, 60, 150, 400];      // salvage
export const BUILD_BASE_COST = { kelp: 8, pearl: 30, net: 12, battery: 60 };
export const BUILD_COST_GROWTH = 1.35;      // cost = base * growth^ownedSameKind
export const PEARL_MIN_NODE_INDEX = 2;      // pearl beds exist from -90m down

// -- power (global pool) --
export const SOLAR_DAY = 10;                // power generated during day
export const SOLAR_NIGHT = 3.5;
export const POWER_USE = { kelp: 1, pearl: 2, net: 2, battery: 0 };
export const BATTERY_CAP = 40;
export const BATTERY_CHARGE_RATE = 2;       // per second, from surplus only

// -- creatures --
export const SHIMMER = { hp: 3, riseSpeed: 6, fleeSpeed: 9, eatRate: 0.5,
                         eatMax: 8, dropDay: 2, dropNight: 3 };
export const DIVER   = { hp: 6, riseSpeed: 10, fleeSpeed: 12, eatRate: 1.0,
                         eatMax: 12, dropDay: 6, dropNight: 6 };
export const LATCH_RANGE_M = 10;            // creature latches when this close
export const SPAWN_BELOW_M = 40;            // spawn this far below deepest node
export const SPAWN_X_SPREAD_M = 45;         // uniform -x..x

// -- net launcher --
export const NET = { rangeM: 25, periodS: 0.7, damage: 1, aoeM: 4,
                     projectileSpeed: 60 };

// -- wave schedule --
export const DAY_PULSE_HOURS = [9, 13, 17]; // in-game hours, each +- jitter
export const DAY_PULSE_JITTER_H = 0.66;     // +- 40 in-game minutes
export const NIGHT_WAVE_PERIOD_H = 25 / 60; // every 25 in-game minutes
export const NIGHT_WAVE_START = 20.5 / 24;  // 20:30
export const NIGHT_WAVE_END = 5.5 / 24;     // 05:30
export const NIGHT_BASE_SIZE = 6;
export const NIGHT_PEAK_MULT = 3;           // intensity peaks x3 at 01:00
export const PULSE_SIZE_BASE = 4;
export const PULSE_SIZE_PER_DAY = 2;        // + floor(runAgeDays) * this
export const PULSE_SIZE_PER_NODE = 1;
export const WAVE_SIZE_CAP = 20;
export const DIVERS_AFTER_FIRST_NIGHT = true; // divers only from day 2
export const DIVER_CHANCE = 0.2;            // per wave, then 1-2 divers
export const ONBOARDING_END_S = 600;        // scheduled waves suppressed before
export const SCRIPTED_WAVES: [number, number][] = // [runAgeS, shimmers]
  [[40, 5], [100, 8], [240, 10], [420, 12]];

// -- offline (coarse sim) --
export const OFFLINE_CAP_S = 72 * 3600;
export const OFFLINE_ENGAGE_S = 20;         // seconds a wave is under fire
export const OFFLINE_NET_DPS = 2.2;         // effective dmg/sec per powered net

// -- render --
export const PX_PER_M = 3;                  // at zoom 1 (v0: zoom fixed at 1)
export const SLOT_X_M = 22;                 // slots at +-22m from cable
```

## 6. Sim behaviour

### 6.1 Clock (sim/clock.ts)

- `dayFraction(runAgeS) = (RUN_START_DAYFRAC + runAgeS / DAY_REAL_S) % 1`.
- `isNight(f)`: f >= NIGHT_START or f < NIGHT_END.
- `solarFactor(f)`: SOLAR_DAY normally, SOLAR_NIGHT at night, linear ramp over
  SOLAR_RAMP_DAYFRAC on both sides of each boundary. Continuous, no jumps.

### 6.2 Power (inside advanceTick, order matters)

Each tick: generation = solarFactor. Demand = sum of POWER_USE for all
buildings. If generation >= demand: all buildings powered; surplus charges
batteries (split evenly, capped by BATTERY_CHARGE_RATE and BATTERY_CAP).
If deficit: drain batteries first (evenly). If still short, disable buildings
until demand fits, in this order: harvesters deepest-first, then nets
deepest-first. Disabled = `powered: false` (produces nothing, doesn't fire).
Battery placement node does not matter in v0.

### 6.3 Production

Each powered kelp adds KELP_RATE * dt to salvage; pearl adds PEARL_RATE * dt.
A harvester with a latched creature on its slot produces 0 and instead loses
`eatRate * dt` salvage from the player total (floor at 0), credited to the
creature's `eaten` and to `stats.salvageLostToNibbles`.

### 6.4 Wave schedule (sim/schedule.ts)

`waveEventsBetween(seed, fromS, toS): WaveEvent[]` - pure, deterministic,
sorted by time. Composition:

- Scripted waves from SCRIPTED_WAVES (shimmers only, `scripted: true`).
- Scheduled waves start only at runAgeS >= ONBOARDING_END_S.
- Day pulses: for each in-game day d (0-based), for each hour h in
  DAY_PULSE_HOURS: time = day start + (h + jitter) hours, where jitter is
  drawn from `mulberry32(hash(seed, d, h))` in [-JITTER, +JITTER]. Size =
  min(CAP, PULSE_SIZE_BASE + d * PULSE_SIZE_PER_DAY + nodeCount *
  PULSE_SIZE_PER_NODE). nodeCount is read at spawn time, not schedule time -
  so the schedule stores only the time; size resolves when the wave fires.
- Night waves: every NIGHT_WAVE_PERIOD_H from NIGHT_WAVE_START to
  NIGHT_WAVE_END. Size = round(NIGHT_BASE_SIZE * intensity), where
  `intensity(f) = 1 + (NIGHT_PEAK_MULT - 1) * sin(pi * p)` and p is progress
  through the night window (0 at 20:30, 1 at 05:30; peak at 01:00).
- Divers: only if the run is past its first night. Per scheduled wave, with
  probability DIVER_CHANCE (seeded per-wave hash), add 1-2 divers.

Forecast data for the UI is the same function: next 12 real hours of events
plus the intensity curve sampled every 10 in-game minutes.

### 6.5 Creatures

Spawn: at wave time, spawn creatures at depth = deepest node + SPAWN_BELOW_M,
x uniform in +-SPAWN_X_SPREAD_M (seeded). If no nodes exist, skip the wave.

Movement (per tick):
- `rising`: move up at riseSpeed toward the cable line (x eases toward its
  target slot x). Shimmer target: the shallowest powered harvester it has not
  passed; recompute when its target dies/changes. Diver target: the DEEPEST
  powered harvester (divers ignore everything above it). When within
  LATCH_RANGE_M of the target slot, become `latched`.
- `latched`: sit on the slot, eat (see 6.3). When `eaten >= eatMax`, become
  `fleeing`. If the target building becomes unpowered or a better target is
  irrelevant - stay latched anyway (keep it simple).
- `fleeing`: move down at fleeSpeed; despawn 60m below deepest node.
- If a wave's creatures all die before any latch, `stats.wavesRepelled++`,
  else `wavesLeaked++` (track per-wave via a wave id on creatures, or
  simplest: mark the wave leaked the first time any of its creatures latches).

Kills: hp <= 0 removes the creature, adds drop (dropDay/dropNight by current
clock) to salvage and to `stats.salvageEarned`, `stats.kills++`, spawns a
loot pip (render event, see 8.4).

### 6.6 Net launcher

Per tick per powered net: cooldown -= dt. If cooldown <= 0 and any creature
(not fleeing) is within rangeM of the net's slot position: fire at the
nearest, reset cooldown to periodS. Projectile flies at projectileSpeed
toward the target's position at fire time (dumb-fire, no homing); on
reaching the target point (or ttl 1.5s expiry), deal damage to ALL creatures
within aoeM of the impact point.

### 6.7 Player actions (sim/actions.ts)

- `lowerLine(state)`: append the next node from NODE_DEPTHS if affordable
  (NODE_COSTS[index]); deduct; update deepestM. Max 6 nodes.
- `buildCost(state, kind)`: BUILD_BASE_COST[kind] *
  BUILD_COST_GROWTH^(count of same kind across all nodes), rounded.
- `build(state, nodeIndex, slot, kind)`: validate empty slot, affordability,
  and pearl rule (pearl only on nodeIndex >= PEARL_MIN_NODE_INDEX); deduct;
  place. Batteries start at charge 0. Onboarding's free kelp is granted by
  the director calling build with a `free: true` flag (skips the deduction).

### 6.8 Offline advance (sim/offline.ts)

`advanceOffline(state, elapsedS)`: cap at OFFLINE_CAP_S. Then, walking the
wave schedule between now and now+elapsed in order:

1. Production between events, analytically: for each segment, compute the
   fraction of the segment that is night vs day (from the clock). Day: all
   buildings powered (assume generation covers demand; if day demand exceeds
   SOLAR_DAY, disable per 6.2 order and recompute rates). Night: compute
   night deficit = demand - SOLAR_NIGHT; batteries cover
   `totalBatteryCharge / deficit` seconds of it (assume batteries enter each
   night full if day surplus * day length >= capacity, else proportionally);
   after batteries run dry, disable per 6.2 order for the remainder. Sum
   production accordingly.
2. Each wave: totalDamage = powered nets * OFFLINE_NET_DPS * OFFLINE_ENGAGE_S
   (nets count as powered per the same night logic at that timestamp).
   kills = min(waveSize, floor(totalDamage / hpPerCreature)) - resolve
   shimmers first, then divers. Killed creatures pay drops. Each survivor
   eats eatMax salvage (floored at available). Update stats and the report.
3. Set `state.runAgeS += elapsedS`, write `state.lastReport`.

Accuracy bar: over a 24h test with a fixed mid-game state, offline salvage
must land within 15% of the live sim run for the same period (vitest test,
live sim run in chunked ticks - slow test, mark it accordingly).

## 7. UX structure

One screen. From top to bottom:

- **Forecast ribbon** (fixed top): 12-real-hour horizon. A horizontal strip:
  time axis with in-game day/night shading, migration intensity curve as a
  filled area, dots for pulse waves, a "now" cursor. Tapping it expands a
  larger version with labels ("Night rises 20:00", wave sizes as dot size).
- **HUD row** (below ribbon): salvage counter (tweens, never jumps), income
  rate ("+2.4/s"), power "7/10" with a tiny bar, depth record ("-90m").
- **World canvas** (the rest): the trench column. Drag up/down to scroll,
  inertia, rubber-band at ends. Camera clamps from surface to deepest node
  + 80m. Tap a slot to select it.
- **Build sheet** (bottom, slides up when a slot is selected): horizontal
  cards, one per buildable kind: name, one-line effect ("+0.8/s", "Stops
  swarms"), cost. Unaffordable = dimmed with cost in red. Invalid (pearl too
  shallow) = hidden. One tap builds. Sheet hides on scroll or background tap.
- **"Lower the Line" button**: floats at the bottom of the built column in
  the world (at the next node's ghost position), showing cost. The next
  node's ghost also previews its resource ("Pearl bed" glyph from node 3).
- **Surface report modal**: on load with lastReport present and awayS > 120:
  dark card, "SURFACE REPORT", rows: time away, salvage earned (counts up),
  waves repelled / leaked, largest wave. One button: "Back to the Line".

Interaction rules: every tap responds visually within 100ms. The camera may
auto-pan (onboarding, first wave) but user drag ALWAYS interrupts and wins.
No tooltips-on-hover anywhere; everything readable from labels.

## 8. Visual language

### 8.1 Palette

```
background gradient by depth:
  0m   #0a1c2c     (sunlit)
  100m #06121e
  200m #030b14
night: multiply the three stops toward #010508 by nightness (0..1)
cable/nodes:   #2c4a5c stroke, #0f2230 fill
biolume cyan:  #46f0d2  (accents, projectiles, UI highlights)
kelp green:    #3fae6a
pearl:         #e8f4f0
warning amber: #ffb454
danger red:    #ff5470
text:          #cfe9f2 on rgba(8,20,30,0.85) panels, 12px radius,
               1px stroke rgba(120,200,220,0.15)
font: system-ui stack; headings 600 weight; numbers tabular-nums
```

### 8.2 Entities (all vector draws in sprites.ts, no image assets)

- Station: wide low trapezoid on the waterline, small mast, bobbing +-2px
  on a 3s sine. Waterline: two translucent sine-wave strips drifting.
- Cable: 2px vertical line, slight sway (1-2px sine by depth and time).
- Node: rounded hexagonal capsule across the cable, 2 stub arms to slots.
- Kelp harvester: 3-5 bezier fronds waving on offset sines, green, with a
  slow stream of tiny bubble particles.
- Pearl diver: small dome + a glowing pearl dot that brightens as it "fills".
- Net launcher: stubby turret, rotates to face its current target, cyan tip
  glow when charged (cooldown ready).
- Battery: small canister; fill level = charge; pulses gently while charging.
- Shimmer: 8px teardrop, biolume cyan-white, slight wiggle; swarm reads as a
  drifting cloud of sparks. Latched: dims and vibrates subtly.
- Diver: 16px arrow-fish, amber-tinted, fast.
- Unpowered building: 40% opacity + small amber lightning glyph.

### 8.3 Motion rules

- Nothing teleports. Every state change animates 150-300ms with ease-out.
- Cable unspool when lowering: node drops with the cable paying out over
  0.8s, slight overshoot bounce, bubble burst on arrival.
- Camera auto-pans use 400ms ease-in-out.

### 8.4 Particles and juice (particles.ts)

- Kill pop: expanding 12px ring + 4 spark particles in biolume cyan.
- Loot pip: "+2" text sprite that arcs from the kill toward the salvage
  counter, accelerating; counter pulses 1.1x scale on arrival. Batch: max 6
  pips in flight; further kills merge into the nearest pip (its label sums).
- Build bloom: soft radial flash + 6 bubbles.
- Warning ping: amber expanding ring at the incoming wave's depth edge of
  screen, 3s before spawn, with a soft sonar blip.
- Haptics: `navigator.vibrate?.(10)` on build, node arrival, and first kill
  of each wave. Never longer than 15ms.

## 9. Audio (audio.ts, WebAudio synth only)

Tiny synth: one function per event, all built from oscillators + gain
envelopes, master volume 0.4, everything under 150ms except ambience.
Events: tap tick (880Hz, 30ms), build bloom (rising two-note), cable unspool
(filtered noise sweep down), kill pop (short square blip; consecutive kills
within 1s rise in pitch, resetting after), loot arrival (soft high ping),
warning (low sonar pulse 220Hz), night onset (slow dark pad swell, 2s).
Ambience: very quiet filtered brown noise "underwater room tone" once the
user has interacted (autoplay rules). No audio files.

## 10. THE FIRST TWO MINUTES (the product)

Implemented in `onboarding.ts` as a data-driven beat list; each beat has a
trigger (time reached, action done, wave cleared), optional camera pan,
optional prompt (text + anchor + pulsing highlight), and optional grant.
`onboardingStep` advances through it. All copy verbatim below. Player can
outrun prompts (build early etc.); beats whose condition is already met skip.

```
0:00  Boot to black. "FATHOM" fades in (600ms), holds 900ms, fades out
      while the surface scene fades in underneath. No menu. No buttons.
0:02  Scene: station bobbing, waterline, empty dark below. One pulsing
      circle on the winch + label: "Lower the Line".
      BLOCKED: nothing else is tappable yet.
0:03  TAP -> cable unspools 0.8s, Node 1 lands at -30m, camera follows,
      bubbles, unspool sound. Salvage counter fades in at 0.
0:06  Node 1 left slot pulses green. Prompt: "Build a Kelp Harvester - free".
      Build sheet slides up with only Kelp visible, cost struck through: FREE.
0:08  TAP -> kelp blooms, fronds wave, income starts: counter ticks up,
      "+0.8/s" appears. Toast (2s): "Salvage flows up the Line."
0:14  The "Lower the Line" ghost appears below at -60m with cost "5".
      Prompt: "Go deeper."
~0:20 TAP (affordable ~0:14 + anticipation) -> Node 2 lands. Camera follows.
      Build sheet now shows Kelp (8) and Net Launcher (12).
0:32  Warning ping below Node 2 + sonar blip. Toast: "Movement below."
      If no net built yet, prompt on a free slot: "Shimmers eat kelp.
      Build a Net Launcher." (12 salvage is affordable by ~0:30 if the
      player built nothing extra; if they can't afford it, the wave still
      comes - see failure path.)
0:40  WAVE 1: 5 shimmers rise. Net fires: pops, pips, pitch-rising blips.
      Camera nudges to frame the fight if the player is elsewhere.
      Cleared ~0:52. Toast: "+10 salvage. The Line holds."
      FAILURE PATH: no net -> shimmers latch, kelp dims, counter visibly
      drains. Prompt persists. They leave after eating 8 each. No
      permanent damage. The lesson teaches itself; the next beat waits
      until a net exists.
1:05  Forecast ribbon slides down from the top edge (it did not exist
      until now). The next night is shaded on it. Toast (3.5s):
      "Night comes at 20:00. The swarm rises with it."
1:15  Camera auto-pans down 40m into the gloom: a faint pearl-bed glow
      below the Node 3 ghost. Prompt: "Pearl beds below. Richer.
      Deeper. Exposed." Then pans back. (Skip the pan if the user is
      mid-drag; show the toast anyway.)
1:40  WAVE 2: 8 shimmers. With one net this is a scrappy hold - a couple
      latch briefly. Intended reading: one net is not enough.
2:00  Beat fires when wave 2 is resolved: Battery card appears in the
      build sheet, dimmed (60). Toast: "Solar fades at night. Batteries
      keep the nets firing."
      Final toast (persists as a small banner until dismissed):
      "Come back before nightfall."
      Onboarding ends (onboardingStep = -1). Scripted waves at 4:00 and
      7:00 keep an active session lively; the schedule takes over at 10:00.
```

Design intent, so the implementer protects it: by 2:00 the player has tapped
6-10 times, watched numbers go up, killed two waves, seen something glowing
deeper, and been given a reason to return at a specific time. Every beat is
either a reward or a tease; there is no beat that is only instruction.

## 11. Save, load, offline

- Autosave to `localStorage["fathom.save.v1"]` every 5s and on
  `visibilitychange` (hidden) and `pagehide`. Format:
  `{ version: 1, savedAtEpochMs, state }` (state serialized as-is; creatures
  and projectiles are stripped - they are transient).
- On boot: if no save -> new game (seed = crypto.getRandomValues 32-bit).
  If save exists: elapsed = (now - savedAtEpochMs)/1000; if elapsed > 30s,
  run `advanceOffline`; if > 120s also show the Surface Report.
- Version mismatch: discard the save (v0 only; real migrations later).

## 12. Acceptance bar for v0 as a whole

1. The full section 10 script plays out on a real phone, in order, with all
   copy, without dev tools.
2. 60fps on a mid-range phone during wave 2 (throttled CPU x4 in devtools as
   proxy: no frame > 33ms).
3. Kill a shimmer with sound on: pop + pip + blip land within 100ms of each
   other. It should feel like popping bubble wrap.
4. Close the tab at 2:30, reopen after 10 minutes: Surface Report shows
   plausible numbers; salvage within 15% of what staying open would earn.
5. `npm run check` green; determinism test green (same seed + same actions
   at same tick = identical state hash after 1 sim-hour).
6. Lighthouse PWA installable pass; works offline after first load.
