# LANTERNWAKE v0 - Implementation notes

Read SPEC.md first for the design intent. This file is the single source of
truth for v0 scope, algorithms, and tuning; where they disagree, this file
wins. It follows the same conventions as `games/fathom/` (SPEC + tasks,
pure sim, Vite + strict TS).

## 0. Rules for the implementer

1. TypeScript strict mode. No frameworks, no runtime dependencies. Dev deps
   only: vite, typescript, vitest.
2. The simulation (`src/sim/**`) is PURE: no `Date.now()`, no
   `Math.random()`, no DOM, no imports from `render/` or `ui/`. All
   randomness via the seeded PRNG carried in state. Time enters only as the
   fixed tick. This is what makes the daily seed and the balance harness work.
3. Every tuning value in section 5 is transcribed ONCE into
   `src/sim/constants.ts`. Never inline a tuning number anywhere else.
4. Every task ends with `npm run check` (tsc --noEmit + vitest) green.
5. Do only what the current task says. No refactors, renames, extra files,
   or "improvements" to earlier tasks.
6. Comments only where a constraint is invisible in the code. No banners.
7. No em-dashes in any user-facing copy; use hyphens.

## 1. v0 scope

IN: one biome (cavern), 8 waves + boss, 7 tower kinds, 6 enemy kinds + boss,
draft system (12 cards), pacts (fixed slots at waves 4 and 7), flare, Long
Night endless mode, daily seed + free play, localStorage best scores, sound,
mobile portrait + desktop.

OUT (post-v0, do not build): meta constellation/unlocks, mirrors and
lighthouse towers, biomes 2-3, share-image card, PWA/offline, settings menu,
pinch zoom, accounts.

## 2. Tech and file layout

```
games/lanternwake/
  index.html            single page: <canvas id="game">, UI overlay divs
  package.json          name lanternwake; scripts dev/build/preview/check/test
  tsconfig.json         strict, ES2022, moduleResolution bundler
  vite.config.ts        base './'
  src/
    main.ts             boot, rAF loop, fixed-step accumulator, wiring
    input.ts            pointer events: tap, drag-from-tray, hold; hit-testing
    save.ts             best scores + daily-completion flag in localStorage
    audio.ts            WebAudio synth, no asset files (section 9)
    sim/
      types.ts          all interfaces (section 4)
      constants.ts      all tuning (section 5)
      prng.ts           mulberry32 + int/pick/shuffle helpers
      mapgen.ts         pillar generation + connectivity guarantee
      light.ts          the lux field: static + dynamic layers (section 3.1)
      path.ts           Dijkstra flow field over lux-weighted cells (3.2)
      combat.ts         focuser targeting, LoS, burn (3.3)
      enemies.ts        per-kind movement/behavior state machines (3.4)
      waves.ts          spawn schedules, wave composition, Long Night (5.6)
      draft.ts          card pool, offer generation, apply-card (5.7)
      advance.ts        advanceTick(state): one 100ms step, orchestrates all
      actions.ts        player actions: place, snuff, relight, rotate, flare
    render/
      renderer.ts       frame composition (section 6)
      lightlayer.ts     luxel grid -> offscreen canvas -> darkness overlay
      sprites.ts        one vector draw function per tower/enemy kind
      particles.ts      pooled: motes, snuff puff, burn embers, hearth loss
    ui/
      hud.ts            oil counter, flame count, wave banner, flare button
      tray.ts           bottom tower tray + drag ghost + route preview
      draftui.ts        between-wave draft modal + pact modal
      screens.ts        title / run-over / long-night-entry screens
```

Game loop: `requestAnimationFrame`; accumulate elapsed real time; run
`advanceTick` in fixed 100 ms steps (cap 30 steps/frame, drop the excess -
this is a live game, no offline sim); render every frame, interpolating
enemy positions between ticks.

## 3. Core algorithms

### 3.1 The lux field (`sim/light.ts`)

Two-layer design so we never recompute more than needed:

- Resolution: the map is CELLS_X x CELLS_Y cells; light is computed on a
  "luxel" grid at LUX_RES subdivisions per cell (so luxels =
  (CELLS_X*LUX_RES) x (CELLS_Y*LUX_RES) = 28 x 48 at the section-5 numbers).
  A cell's lux (for pathfinding/combat) = mean of its luxels.
- STATIC layer: contributions of all placed, currently-lit sources.
  Recomputed only on placement, removal, snuff, relight, or beam rotation.
- DYNAMIC layer: per-tick contributions that move - umbra/boss suppression
  auras, gloomweaver trails, flare, afterglow (ghost wick). Cheap: few
  sources, simple radial stamps, no occlusion.
- `lux(luxel) = clamp(static + dynamic, 0, LUX_CAP)`; dynamic suppression
  is a negative stamp.

Radial sources (candle, wick, sun-kettle glow): for each luxel within
radius, contribution = `intensity * max(0, 1 - dist/radius)` IF the luxel is
visible from the source. Visibility: Bresenham/DDA line from source luxel to
target luxel; blocked if it crosses a pillar or shutter cell. At 28x48
luxels and a handful of sources this brute force is well under budget; do
not build anything cleverer (no visibility polygons - that idea from SPEC
section 10 is superseded by this luxel design).

Beam sources (beam lamp): DDA march from the source cell in the facing
direction (4 directions, N/E/S/W), width 1 cell, up to BEAM_LEN cells, stop
at pillar/shutter/map edge; stamp lux BEAM_LUX on every luxel of the swept
cells with linear falloff along the last cell.

Expose `version: number` on the static layer, bumped on every recompute;
path.ts uses it to know when to rebuild the flow field.

### 3.2 Pathfinding (`sim/path.ts`)

- Dijkstra from the hearth cell outward over the 7x12 cell grid (4-neighbor).
  Entering a cell costs `PATH_BASE + PATH_LUX_K * cellLux`. Pillar and
  shutter cells are impassable. Store per-cell `next` direction = downhill
  neighbor; that is the flow field.
- Rebuild whenever: static light version changed, OR every PATH_REBUILD_MS
  of sim time (to track dynamic lux from umbras/trails). 84 cells; trivial.
- Enemies steer toward the center of their current cell's `next` neighbor,
  with smooth velocity (no snapping) - see 3.4.
- Soft-wall guarantee holds automatically: lux costs are finite, so a route
  always exists (mapgen guarantees pillar connectivity, and towers never
  block cells except shutters - see actions rule in 3.5).
- Ghost preview: `previewField(state, hypotheticalTower)` runs the same
  Dijkstra with the candidate's light stamped into a scratch copy and
  returns the polyline from the spawn rows for the tray UI to draw. Pure
  function, no state mutation.

### 3.3 Combat (`sim/combat.ts`)

- An enemy is TARGETABLE iff its cell lux >= LIT_MIN and unobstructed line
  of sight (cell-grid Bresenham vs pillars/shutters) from the focuser.
- Burning glass: pick targetable enemy with the greatest path progress
  (lowest remaining Dijkstra distance) in range; damage per second =
  `GLASS_DPS * targetCellLux`, applied per tick.
- Prism: same rule, up to 3 distinct targets, `PRISM_DPS * lux` each.
- Sun kettle: every KETTLE_PERIOD s, pulse radius `KETTLE_R0 + KETTLE_RK *
  ownCellLux` damaging all targetable enemies in radius for
  `KETTLE_DMG * ownCellLux`.
- Ambient burn from light itself: per tick, an enemy standing at lux >= 1.5
  takes BURN_DPS_1 per second; at lux >= 2.5, BURN_DPS_2. (These are the
  "lux 2 / lux 3" bands of SPEC section 2, expressed on the continuous
  field.)
- Slows: speed multiplier by lux band: <0.5 -> 1.0, else 0.85 / 0.70 / 0.60
  for the three bands. Ashen brute and boss: damageable only at lux >= 1.5.

### 3.4 Enemy behaviors (`sim/enemies.ts`)

All enemies share: spawn at a top-row cell, follow the flow field, on
reaching the hearth cell subtract `flameCost` flames and despawn. Kinds
override movement/extras:

- shade: nothing extra.
- moth: if any lit lantern exists, path toward the brightest one (ignore
  flow field), gnaw for MOTH_GNAW_S seconds, then that lantern is snuffed
  (player can relight, normal cooldown) and the moth resumes toward the
  hearth. A moth lure within MOTH_LURE_R of the moth overrides brightness
  and is consumed (lure has LURE_HP "bites").
- umbra: dynamic suppression stamp, radius UMBRA_R, strength UMBRA_SUPPRESS.
- gloomweaver: stamps its current cell with a -TRAIL_SUPPRESS dynamic
  contribution for TRAIL_S seconds (refreshing as it moves).
- blinker: every BLINK_PERIOD s, teleport to the cell BLINK_CELLS further
  along its own flow path IF that cell's lux < LIT_MIN, else walk.
- ashen brute: nothing extra beyond the lux >= 1.5 damage gate.
- pale king (boss): umbra aura at KING_R/KING_SUPPRESS; every KING_SNUFF_S
  snuffs the brightest lantern (fires the same event as a moth finishing);
  damage gate lux >= 1.5; reaching the hearth = instant run loss.

State machine per enemy: `walking | gnawing | despawned` (+ blink timer).
Keep it an enum + fields on the Enemy struct, not classes.

### 3.5 Player actions (`sim/actions.ts`)

- place(kind, cell): rejected if cell occupied by pillar/tower/hearth, or
  oil < cost. Towers do NOT block enemy movement except the shutter (the
  only impassable tower; mapgen + a placement check must refuse a shutter
  that would fully disconnect spawn rows from hearth - run a scratch
  Dijkstra before accepting).
- snuff(towerId) / relight(towerId): instant, free, per-lantern cooldown
  SNUFF_CD_S. Bumps static light version.
- rotate(towerId, dir): beam lamp and shutter only; bumps light version.
- flare(): if charges remain: dynamic layer gets +FLARE_LUX globally for
  FLARE_S seconds. Charges per run: FLARE_CHARGES.
- No selling in v0 (removes a whole UI surface; revisit post-v0).

## 4. Core types (transcribe into `src/sim/types.ts`)

```ts
export type TowerKind =
  'candle' | 'wick' | 'beam' | 'shutter' | 'lure' |
  'glass' | 'prism' | 'kettle';
export type EnemyKind =
  'shade' | 'moth' | 'umbra' | 'gloom' | 'blinker' | 'brute' | 'king';
export type InfusionKind = 'ember' | 'frost' | 'silver' | 'violet' | 'ghost';
export type Dir = 0 | 1 | 2 | 3; // N E S W

export interface Tower {
  id: number;
  kind: TowerKind;
  cx: number; cy: number;        // cell coords
  lit: boolean;                  // lanterns only; snuffed = false
  snuffCd: number;               // seconds until snuff/relight allowed
  dir: Dir;                      // beam + shutter
  infusion: InfusionKind | null;
  lureHp?: number;               // lure only
  pulseCd?: number;              // kettle only
}

export interface Enemy {
  id: number;
  kind: EnemyKind;
  x: number; y: number;          // world units (cells, fractional)
  hp: number; maxHp: number;
  state: 'walking' | 'gnawing';
  gnawTargetId: number;          // tower id, -1 none
  timer: number;                 // blink / gnaw / king-snuff shared timer
}

export interface RunState {
  seed: number; prng: number;    // prng = mulberry32 state word
  mode: 'daily' | 'free';
  wave: number;                  // 1-based; 9 = boss; 10+ = Long Night
  phase: 'build' | 'combat' | 'draft' | 'pact' | 'over' | 'won';
  oil: number; flames: number; flares: number;
  time: number;                  // sim seconds elapsed this run
  pillars: boolean[];            // CELLS_X*CELLS_Y
  towers: Tower[]; enemies: Enemy[];
  spawnQueue: SpawnEvent[];      // built by waves.ts at wave start
  ownedRelics: RelicId[];
  draftOffer: CardId[] | null;
  score: number; kills: number;
  lightVersion: number;          // static layer version
}

export interface SpawnEvent { at: number; kind: EnemyKind; col: number; }
export type RelicId =
  'afterglow' | 'waxbound' | 'reserves' | 'tallow';
export type CardId = string;     // 'tower:beam', 'inf:ember', 'relic:tallow'
```

(`LuxField` lives in light.ts as `Float32Array` luxel buffers + version,
kept OUTSIDE RunState serialization; it is derived state, rebuilt on load.)

## 5. Tuning constants (transcribe into `src/sim/constants.ts`)

### 5.1 Board and loop
| const | value | note |
|---|---|---|
| CELLS_X / CELLS_Y | 7 / 12 | portrait |
| LUX_RES | 4 | luxels per cell side |
| TICK_S | 0.1 | fixed sim step |
| PATH_REBUILD_MS | 200 | dynamic-lux repath cadence |
| PILLARS_MIN / MAX | 6 / 9 | rows 2..8 only, never adjacent to hearth |
| HEARTH_CELL | (3, 11) | |
| SPAWN_ROW | 0 | spawn col from wave table |
| START_OIL | 40 | |
| OIL_TRICKLE | 0.5/s | combat phase only |
| FLAMES | 10 | |
| FLARE_CHARGES / FLARE_LUX / FLARE_S | 2 / 2.0 / 3 | |
| SNUFF_CD_S | 2 | |

### 5.2 Light
| const | value |
|---|---|
| LUX_CAP | 3.0 |
| LIT_MIN | 0.5 |
| BAND_2 / BAND_3 | 1.5 / 2.5 |
| SLOW_1 / SLOW_2 / SLOW_3 | 0.85 / 0.70 / 0.60 |
| BURN_DPS_1 / BURN_DPS_2 | 2 / 4 |
| PATH_BASE / PATH_LUX_K | 10 / 25 |

### 5.3 Towers (cost oil / light / notes)
| kind | cost | light | notes |
|---|---|---|---|
| candle | 6 | r 1.5, int 1.0 | |
| wick | 12 | r 2.5, int 2.0 | the workhorse |
| beam | 18 | BEAM_LEN 5, BEAM_LUX 2.0 | rotatable |
| shutter | 8 | blocks light AND movement | rotation cosmetic in v0 |
| lure | 10 | r 1.0, int 0.5 | LURE_HP 3 bites, MOTH_LURE_R 3 |
| glass | 20 | none | GLASS_DPS 6 (x lux), range 3.5 |
| prism | 28 | none | PRISM_DPS 2.5 x3 beams, range 3 |
| kettle | 26 | r 1.0, int 0.5 (its own glow) | KETTLE_PERIOD 1.5, KETTLE_DMG 8, KETTLE_R0 1, KETTLE_RK 0.5 |

### 5.4 Enemies (hp / speed cells/s / oil bounty / flameCost)
| kind | hp | spd | oil | flames | extras |
|---|---|---|---|---|---|
| shade | 20 | 1.0 | 4 | 1 | |
| moth | 12 | 1.6 | 5 | 1 | MOTH_GNAW_S 3 |
| umbra | 40 | 0.7 | 8 | 2 | UMBRA_R 1.5, UMBRA_SUPPRESS 1.2 |
| gloom | 25 | 1.1 | 7 | 1 | TRAIL_SUPPRESS 0.8, TRAIL_S 4 |
| blinker | 18 | 0.9 | 7 | 1 | BLINK_PERIOD 2.5, BLINK_CELLS 3 |
| brute | 120 | 0.45 | 15 | 3 | dmg gate lux >= BAND_2 |
| king | 600 | 0.35 | 100 | loss | KING_R 3, KING_SUPPRESS 1.0, KING_SNUFF_S 8 |

Wave HP scaling: `hp * (1 + 0.15 * (wave - 1))`. Long Night (wave 10+):
`hp * (1 + 0.15 * 8) * 1.25^(wave - 9)`, speed +3%/wave (cap 2x).

### 5.5 Infusions (socket into ONE lantern, permanent)
| id | effect |
|---|---|
| ember | that lantern's light: BURN_DPS doubled inside its radius |
| frost | its slow band shifts one step stronger (0.85->0.70 etc) |
| silver | its light ignores suppression (umbra/king/trail) in its radius |
| violet | focuser damage vs targets in its light: lux counts x2 |
| ghost | when snuffed, leaves its full light for 2 s (afterglow) |

Implementation: per-luxel effect flags are overkill; store per-lantern and
resolve per-enemy per-tick by checking "which infused lanterns' radii am I
inside and lit by" (few lanterns, few enemies; brute force).

### 5.6 Waves (spawnQueue built at wave start; `at` seconds from wave start)

Spacing: spawn one enemy every `waveLen / count`, jittered +-20% via PRNG.
Columns: PRNG-pick per spawn from {1..5} (avoid extreme corners).

| wave | length | composition |
|---|---|---|
| 1 | 30 s | 6 shade |
| 2 | 30 s | 10 shade |
| 3 | 35 s | 8 shade, 3 moth |
| 4 | 35 s | 10 shade, 2 umbra |
| 5 | 40 s | 12 shade, 4 moth, 1 brute |
| 6 | 40 s | 8 shade, 3 gloom, 4 blinker |
| 7 | 45 s | 14 shade, 3 umbra, 2 brute |
| 8 | 45 s | 20 shade, 6 moth, 2 brute, 2 gloom |
| 9 | boss | 1 king + 2 shade every 6 s until king dies |

Wave ends when queue empty AND no enemies alive; then draft phase (waves
1-8), pact phase first if wave is 4 or 7. After wave 9: 'won' screen with
Long Night button. Long Night wave N: `8 + N` enemies, kind mix drawn by
PRNG weighted toward heavies as N grows; no more drafts, score attack only.

### 5.7 Draft cards (offer 3, pick 1; pool below; no duplicate relics,
tower cards repeatable, each infusion appears once per run)

Towers: `tower:beam`, `tower:prism`, `tower:kettle`, `tower:lure` (a card
grants ONE free instance placed from the tray at zero cost; the kind also
becomes purchasable in the tray thereafter if it wasn't). Candle, wick,
shutter, glass are in the tray from the start.
Infusions: `inf:ember`, `inf:frost`, `inf:silver`, `inf:violet`,
`inf:ghost` (picking prompts "tap a lantern" to socket).
Relics: `relic:afterglow` (ALL lanterns get ghost-wick 1 s),
`relic:waxbound` (moth that eats a lure fights for you 10 s: 12 hp, 6 dps,
walks up the flow field), `relic:reserves` (+2 flares now),
`relic:tallow` (burn-DoT kills pay 2x oil).

Offer generation: shuffle eligible pool with run PRNG, take 3. Daily mode:
identical seed => identical map, offers, spawn jitter for everyone.

### 5.8 Pacts (waves 4 and 7, modal before build phase, skippable)
| id | curse (next wave) | reward on surviving it |
|---|---|---|
| hunger | +2 umbra | random unowned infusion |
| newmoon | LUX_CAP 2.0 that wave | +40 oil |
| swarm | +6 moth | a free wick lantern card |

### 5.9 Score
`score = 1000 * wavesCleared + 10 * kills + 50 * flaresUnused +
250 * pactsSurvived`, Long Night kills count double. Best per mode + date
stored in localStorage (`lanternwake:best:daily:YYYY-MM-DD`,
`lanternwake:best:free`). Daily seed: `hashDateUTC('YYYY-MM-DD')` via fnv1a.

## 6. Rendering (`render/`)

Painter's order, one main canvas + one offscreen luxel canvas:

1. Cavern floor: near-black blue (#070a12), faint rock texture via seeded
   hash noise, pillars as slightly lighter slabs with an edge highlight.
2. Entities: towers (warm vector shapes; lit lanterns get a radial-gradient
   glow sprite drawn ADDITIVELY, `globalCompositeOperation='lighter'`),
   enemies as ink-black blobs - crucially DARKER than the floor, with two
   pinprick eyes that only render when their cell lux >= LIT_MIN.
3. Darkness overlay: write the luxel buffer into a 28x48 ImageData where
   alpha = `DARK_MAX * (1 - lux/LUX_CAP)` (DARK_MAX ~0.82 so the floor is
   never 100% unreadable), put on the offscreen canvas, then drawImage
   scaled to full size with `imageSmoothingEnabled = true` (the smoothing IS
   the soft light falloff - do not hand-blur).
4. Warm tint: same luxel buffer drawn again as amber (#ffb43a) with
   `'overlay'`-ish low alpha, composite `'lighter'`, so lit areas feel warm
   not just bright.
5. Particles: dust motes spawn only in luxels above BAND_2 (drift upward),
   snuff puff, burn embers on burning enemies, flame-loss burst at hearth.
6. UI overlay: DOM divs (tray, HUD, modals), not canvas.

Canvas sizing: fit 7:12 cell aspect into the viewport, letterbox with the
floor color; `devicePixelRatio` aware. Interpolate enemy x/y between the
last two sim ticks for render.

Performance budget: light recompute is the only hot path. Static layer
recompute (worst case ~12 sources x 1344 luxels x ~20-step DDA) must stay
under 2 ms on a mid phone; memoize per-source stamps keyed by
(kind, cell, dir, litOccludersVersion) if needed, but measure first.

## 7. Input (`input.ts`)

- Tap tower: lanterns -> snuff/relight toggle (respect cooldown, show radial
  cooldown arc). Beam/shutter -> rotate 90 deg clockwise per tap. Focusers
  and lures -> show range ring for 2 s.
- Drag from tray onto grid: ghost tower + live lux preview + predicted
  enemy route polyline (from `previewField`, throttled to every other
  frame). Red ghost when unaffordable/invalid. Release to place.
- Hold hearth 400 ms: flare (with a filling ring; haptic `navigator.vibrate`
  if present).
- During draft/pact modals the sim is paused (phase machine handles it).
- Desktop: mouse maps to same gestures; hover previews are a free bonus.

## 8. Phase machine (in `advance.ts`)

`build` (pre-wave, no timer in v0 - "Start wave" button) -> `combat` ->
(`pact` at 4/7) -> `draft` -> `build` ... wave 9 kill -> `won` -> optional
Long Night loops `combat` only. `flames <= 0` or king reaches hearth ->
`over`. Placing towers is allowed in BOTH build and combat phases (mid-wave
placement is core to the fantasy); drafts/pacts only between waves.

## 9. Audio (`audio.ts`)

WebAudio, all synthesized: each lit lantern contributes one voice to a
quiet additive drone chord (root + fifth + octave, detuned; cap 8 voices) -
the map literally sounds fuller when brighter. Snuff = filtered noise
"whumpf" + drone voice drops. Burn tick = soft crackle. Moth gnaw = papery
flutter. Hearth loss = low bell. Flare = rising shimmer. Master gain saved
in localStorage; a single mute button in the HUD is the only audio UI.

## 10. Testing (vitest, `src/sim/**` only)

- prng: known-answer test for mulberry32 sequence.
- mapgen: 1000 seeds -> always connected spawn->hearth, pillar count in range.
- light: single wick on empty map -> known lux at sampled luxels; occlusion
  behind pillar = 0; beam stops at shutter; cap respected.
- path: lux detour chosen when cheaper; soft wall crossed when detour too
  long (construct both fixtures explicitly).
- combat: glass DPS scales with lux; brute untouchable below BAND_2; burn
  bands correct.
- enemies: moth retargets brightest; blinker refuses lit destination; umbra
  suppression actually flips a cell below LIT_MIN.
- waves/draft: same seed -> identical spawnQueue and offers (determinism
  test - serialize two runs' first 200 ticks and diff).
- balance harness (see T15): scripted baseline strategies vs full runs.

## 11. Task order

Keep each task shippable; `npm run check` green at every step.

- T01 scaffold: package.json, tsconfig, vite, index.html, empty canvas +
  rAF fixed-step loop, letterboxed board rect drawn.
- T02 sim skeleton: types.ts, constants.ts, prng.ts + tests.
- T03 mapgen + pillars rendered; connectivity test.
- T04 light.ts static layer (radial + beam + occlusion) + tests; debug
  render of raw luxels behind a query-param flag (`?debuglux`).
- T05 darkness/tint overlay rendering (the game suddenly looks like itself).
- T06 path.ts flow field + tests; debug arrows under `?debugflow`.
- T07 actions: place/snuff/relight/rotate; tray UI + drag ghost + route
  preview; oil HUD.
- T08 enemies: shade walking end to end, flames, run-over screen.
- T09 combat: glass/prism/kettle + ambient burn + slows; oil bounties.
- T10 waves.ts: waves 1-5 playable start to finish; wave banner; "Start
  wave" button; combat-phase trickle.
- T11 remaining enemies (moth+lure, umbra, gloom, blinker, brute) with the
  dynamic lux layer; waves 6-8.
- T12 draft.ts + draft UI; infusion socketing; relics.
- T13 pacts, flare, boss (king) + won screen.
- T14 Long Night + scoring + save.ts + daily/free title screen.
- T15 balance harness: headless vitest that plays 3 scripted strategies
  (greedy-wicks, beam-corridor, kettle-stack) across 50 seeds; assert
  wave-reached distributions inside target bands (baseline greedy clears
  wave 4-6, never 9; tuned play must be required for the boss). Adjust
  constants.ts if outside bands, rerun.
- T16 audio + particles + polish pass: cooldown arcs, damage flashes,
  hearth animation.
- T17 acceptance: play on a real phone; register in `games/games.json`
  (slug `lanternwake`, accent `#ffc457`, tagline TBD at that point); check
  `games/index.html` picks it up like the other entries.

## 12. Design intents worth protecting (for whoever tunes)

- Never let light become a hard wall: if a change makes full-blocking
  possible, PATH_LUX_K is too high or LUX_CAP stacking is broken.
- The snuff/relight toggle is the skill expression; anything that makes
  mid-wave toggling pointless (too-long cooldown, instant repath exploits
  being patched too hard) kills the game's second layer.
- Focuser damage scaling with lux is the economy's heart: players must feel
  "brighter kill-zone = harder hitting", so keep GLASS_DPS low enough that
  lux 1 feels weak and lux 3 feels triple-plus.
- Moths must genuinely threaten infrastructure (players should sometimes
  lose a wave to snuffed lanterns, not just leaked shades) or the roster
  collapses into pure DPS-checks.
