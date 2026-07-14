# FATHOM v0 - Implementation tasks

Read SPEC.md first. It is the single source of truth; section references
below (S5, S6.2, ...) point into it. Rules for every task:

- Do ONLY the task's listed work. No refactors, no renames, no extra files,
  no new dependencies, no "improvements" to earlier tasks.
- All tuning numbers come from `src/sim/constants.ts` (S5). Never inline one.
- Sim code (`src/sim/**`) never touches DOM, Date.now, or Math.random (S2).
- Finish every task with `npm run check` green before moving on.
- Tasks must be done in order unless the Depends line says otherwise.

---

## T01 - Scaffold and empty canvas loop

Depends: nothing.
Files: package.json, tsconfig.json, vite.config.ts, index.html, src/main.ts.

package.json, exactly:

```json
{
  "name": "fathom",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "check": "tsc --noEmit && vitest run"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "vitest": "^2.1.0"
  }
}
```

tsconfig: strict true, target/lib ES2022, module ESNext, moduleResolution
bundler, noEmit true, include src. vite.config.ts: `base: './'`.

index.html: `<meta name="viewport" content="width=device-width,
initial-scale=1, viewport-fit=cover, user-scalable=no">`, dark theme-color
(#06121e), a single full-viewport `<canvas id="game">`, an empty
`<div id="ui"></div>` overlay (absolute, inset 0, pointer-events none - UI
children re-enable), `overscroll-behavior: none` and `touch-action: none` on
the canvas, no scrollbars ever.

main.ts: get the canvas, size it to window * devicePixelRatio (resize
listener included), run a requestAnimationFrame loop that clears to a solid
#06121e and draws the current fps as small text (temporary, removed in T07).

Accept: `npm run dev` shows a full-screen dark canvas on desktop and in
mobile emulation; rotating/resizing never shows scrollbars or blur (canvas
backing store matches dpr); `npm run check` green (zero tests is fine).

## T02 - Camera and input

Depends: T01.
Files: src/camera.ts, src/input.ts, edit src/main.ts.

camera.ts: `{ yM: number, vyM: number }` - the world depth (metres) at the
top of the world view area. Export `worldToScreen(xM, depthM)` and
`screenToWorld(px, py)` using PX_PER_M (hardcode 3 here for now; T03 moves
it to constants and this file must then import it). `update(dt)`: apply
velocity with exponential friction (halve every 0.3s), clamp yM to
[-20, maxDepthM] with rubber-band (overscroll eases back). maxDepthM is a
setter, default 120.

input.ts: Pointer events only (pointerdown/move/up/cancel). Distinguish tap
(< 8px movement, < 300ms) from drag. Drag moves camera.yM directly and
records velocity for release inertia. Export a `onTap(handler)` registration
that gives world coordinates. While the user is dragging, set a
`userIsDragging` flag the camera and future auto-pan code must respect (S7).

Accept: on a phone (or emulation) you can flick-scroll a 400m-tall test
gradient smoothly with inertia and rubber-band at both ends; taps log world
coords; drags never fire taps.

## T03 - Sim skeleton: types, constants, PRNG

Depends: T01.
Files: src/sim/types.ts, src/sim/constants.ts, src/sim/prng.ts,
src/sim/prng.test.ts.

Transcribe S4 into types.ts and S5 into constants.ts verbatim. prng.ts:
mulberry32 (`next(state) -> [value01, newState]` pure form), plus
`hash2(a, b)` and `hash3(a, b, c)` integer hashes (use splitmix-style mixing)
for seeding per-day/per-wave streams (S6.4), and
`rangeFrom(state, min, max)` helper.

Accept: tests prove mulberry32 determinism (same seed = same first 5 values,
distinct seeds differ), value range [0,1), and hash stability (snapshot 3
known outputs so accidental changes fail the test).

## T04 - Clock

Depends: T03.
Files: src/sim/clock.ts, src/sim/clock.test.ts.

Implement S6.1 exactly: dayFraction, isNight, solarFactor (with the linear
ramps). Also export `formatClock(dayFraction)` -> "20:00" style string and
`nightProgress(f)` -> 0..1 through the NIGHT_WAVE_START..NIGHT_WAVE_END
window (handling the midnight wrap), used by schedule and ribbon.

Accept: tests: runAgeS=0 is 06:00; solarFactor continuous across both
boundaries (sample every in-game minute, max step < 0.2); isNight correct at
19:59/20:01/05:59/06:01; nightProgress(01:00) ~= 0.5.

## T05 - advanceTick core: production and actions

Depends: T03, T04.
Files: src/sim/advance.ts, src/sim/actions.ts, src/sim/advance.test.ts.

advance.ts: `newGame(seed): GameState` and `advanceTick(state): void`
(mutates in place; one TICK_S step). This task: advance runAgeS, run
production per S6.3 (no creatures yet, so no nibbles), and battery charge
placeholder (skip - power is T06). actions.ts: `lowerLine`, `build`,
`buildCost` per S6.7 including the `free` flag and the pearl depth rule.

Accept: tests: newGame has 0 nodes and START_SALVAGE; lowerLine respects
cost and order; buildCost growth formula matches S5 for 0/1/2 owned; a kelp
produces exactly KELP_RATE*60 salvage over 240 ticks; determinism - two
states from same seed with the same action script are deeply equal after
1000 ticks.

## T06 - Power system

Depends: T05.
Files: edit src/sim/advance.ts, src/sim/advance.test.ts.

Implement S6.2 inside advanceTick, before production, exactly in the stated
priority order. Buildings get `powered` recomputed every tick; batteries
charge from surplus and drain on deficit.

Accept: tests: day with demand < SOLAR_DAY keeps everything powered and
charges batteries at <= BATTERY_CHARGE_RATE; at night with deficit, battery
drains first, then the DEEPEST harvester unpowers before any net; a full
battery covers exactly BATTERY_CAP/deficit seconds (+- one tick); production
of unpowered kelp is 0.

## T07 - Render the world

Depends: T02, T05.
Files: src/render/renderer.ts, src/render/sprites.ts, edit src/main.ts.

Draw per S8.1/S8.2/S8.3: depth gradient (night-darkened via clock), waterline
strips, bobbing station, swaying cable down to the deepest node, nodes with
slot arms, and building sprites (kelp fronds waving, pearl dome, net turret,
battery canister; unpowered = 40% alpha + amber glyph). Camera from T02
drives everything; remove the T01 fps text. Also draw the next-node ghost
(dashed outline + cost + "pearl bed" glow from index 2 down) per S7.

Accept: with a hand-built test state (3 nodes, one of each building) the
scene matches S8's descriptions; scrolling stays at 60fps with devtools 4x
CPU throttle; night state (force runAgeS) visibly darkens the gradient.

## T08 - Build sheet and HUD

Depends: T07.
Files: src/render/ui.ts, edit src/main.ts, src/input.ts.

DOM (inside #ui), not canvas: HUD row (salvage counter with 300ms tween,
income/s, power "x/y" mini-bar, depth record) and the bottom build sheet per
S7: opens on slot tap (slot highlight ring in canvas), one card per legal
kind with name, effect line, cost; dim unaffordable; hide illegal; tap
builds via actions.build and closes. "Lower the Line" is a canvas-anchored
button at the ghost node (input.ts hit-tests it before generic taps).
Style per S8.1 (panels, radius, stroke, tabular numbers).

Accept: on a phone you can lower nodes and build all four kinds end to end
with one thumb; counter tweens; unaffordable cards do nothing but a small
shake; sheet closes on background tap or scroll; no layout shift of the HUD
when numbers grow.

## T09 - Wave schedule and forecast data

Depends: T03, T04.
Files: src/sim/schedule.ts, src/sim/schedule.test.ts.

Implement S6.4: `waveEventsBetween(seed, fromS, toS)` (pure; sizes for
scheduled waves resolved lazily - store hour-slot identity so per-wave
hashes are stable regardless of query window) and
`forecast(seed, nowS)` -> { points: intensity samples for 12 real hours,
events: WaveEvent[] } for the ribbon.

Accept: tests: same args = identical arrays; events sorted; querying
[0,4h] and [2h,6h] agree on the overlap; scripted waves appear at exactly
S5's times and nothing else before ONBOARDING_END_S; night wave sizes peak
~3x base near 01:00; divers never appear before the run's first night.

## T10 - Creatures

Depends: T05, T09.
Files: src/sim/creatures.ts (spawn + per-tick behaviour, called from
advance.ts), edit src/sim/advance.ts, src/sim/creatures.test.ts.

advanceTick consumes due waves from waveEventsBetween(lastTick, now) and
spawns per S6.5. Implement rising/latched/fleeing, shimmer vs diver
targeting, nibbles wired into production (S6.3), eatMax -> fleeing,
despawn, and wave repelled/leaked stats.

Accept: tests: a wave with no nets ends with 0 kills, wavesLeaked 1, salvage
drained by <= size*eatMax, all creatures eventually despawned; divers pass a
shallow kelp and latch the deepest; no creatures spawn with zero nodes.

## T11 - Net launcher combat

Depends: T10.
Files: src/sim/combat.ts, edit src/sim/advance.ts, src/sim/combat.test.ts.

Implement S6.6: cooldowns, nearest-target selection in range, dumb-fire
projectiles, AoE damage on arrival/ttl, kill handling (drops by day/night,
stats, creature removal). Emit sim events (plain array on state cleared each
tick, e.g. `events: SimEvent[]` - add the type) for kill/latch/spawn/build
so render and audio can react without the sim knowing about them.

Accept: tests: one net kills a 5-shimmer wave (spawned in range) in under
15 sim-seconds with correct salvage credited; AoE hits 3 clustered shimmers
with one projectile; fleeing creatures are never targeted; determinism test
from T05 still green with combat active.

## T12 - Particles and juice

Depends: T07, T11.
Files: src/render/particles.ts, edit renderer.ts, main.ts.

Implement S8.4 exactly: kill pops, arcing merging loot pips with counter
pulse, build blooms, warning pings (3s before each spawn - main.ts peeks at
the schedule), haptics. Pool everything (no per-frame allocation in steady
state; preallocate arrays and reuse).

Accept: killing a wave feels like S12.3 (pop + pip + counter pulse chain);
6+ simultaneous kills merge pips instead of spamming; devtools performance
recording during wave 2 shows no GC-driven long frames.

## T13 - Forecast ribbon

Depends: T08, T09.
Files: edit src/render/ui.ts.

Per S7: collapsed strip (canvas-drawn inside a DOM shell is fine) with
day/night shading, intensity area, wave dots sized by size, now-cursor;
tap expands a taller labelled version ("Night rises 20:00", next 12 real
hours) and tap again collapses. Hidden until onboarding reveals it (a
`ribbonVisible` flag main.ts owns; default true for saves past onboarding).

Accept: ribbon matches schedule.test fixtures visually (manual check with a
forced seed); expanded label times use formatClock; updates as time passes
(cursor moves, past events slide off).

## T14 - Onboarding director

Depends: T08, T11, T12, T13.
Files: src/onboarding.ts, edit src/main.ts, src/render/ui.ts (toast +
prompt + highlight primitives).

Implement S10 as a beat list: each beat { trigger, pan?, prompt?, toast?,
grant?, gate? }. Triggers: runAge reached, action performed, wave cleared.
Copy VERBATIM from S10. Gates: before the first tap only the winch is
tappable; kelp is free once; ribbon reveal at the 1:05 beat; the failure
path (no net) must work as written. Auto-pans respect userIsDragging.
onboardingStep persists in the save so a reload mid-onboarding resumes at
the right beat.

Accept: a fresh profile on a phone plays S10 start to finish, matching the
timeline within +-5s at every beat when following prompts promptly; the
failure path (build nothing) recovers as specced; a player who rushes ahead
(builds net before the prompt) skips satisfied beats without breakage.

## T15 - Save, load, offline advance, surface report

Depends: T09, T11 (T14 for the resume field).
Files: src/save.ts, src/sim/offline.ts, src/sim/offline.test.ts,
edit src/main.ts, src/render/ui.ts.

save.ts per S11 (strip creatures/projectiles; autosave triggers; version
discard). offline.ts per S6.8 exactly. Surface report modal per S7, shown
per S11's thresholds, "Back to the Line" dismisses and clears lastReport.

Accept: offline accuracy test per S6.8's 15% bar (mark as slow test);
tab-close/reopen manual test per S12.4; report numbers add up (earned -
lost consistent with salvage delta); corrupted JSON in localStorage starts
a clean new game instead of crashing.

## T16 - Audio

Depends: T11, T14.
Files: src/audio.ts, edit src/main.ts.

Implement S9. AudioContext created/resumed on first user gesture. Sim events
from T11 drive one-shots; night onset watches the clock; consecutive-kill
pitch ladder per S9. A single mute toggle button top-right (persisted in
localStorage, outside the save).

Accept: with sound on, S12.3's 100ms sync bar holds; no console warnings
about autoplay; mute persists across reloads; total added JS < 8KB (no
audio assets).

## T17 - PWA

Depends: T01 (do anytime after; last is fine).
Files: public/manifest.webmanifest, public/sw.js, public/icons/*,
edit index.html, src/main.ts (SW registration).

Manifest: name "Fathom", short_name "Fathom", display standalone, portrait,
background/theme #06121e, icons 192+512 (generate simple glyph: cyan cable
line + node dot on dark rounded square - a small node script or hand-drawn
canvas-to-png is fine, committed as png). sw.js: cache-first app shell of
the built assets, versioned cache name, activate cleans old caches.

Accept: Lighthouse PWA installable passes on the built preview; airplane
mode after first load still boots the game; a new deploy (bump cache name)
picks up on second load.

## T18 - Balance harness

Depends: T15.
Files: scripts/balance.ts (run via `npx vitest run scripts/` or plain
`npx tsx`? No - keep it a vitest "test" file scripts/balance.test.ts marked
skip-by-default, run with `npx vitest run scripts/balance.test.ts`).

Simulate 48 real hours (offline.ts fast path) for three scripted strategies
from a fresh game: A "greedy economy" (always cheapest harvester, one net),
B "turtle" (net+battery first, harvesters after), C "balanced" (alternate).
Print a table: final salvage, waves repelled/leaked, time each node was
reached. Assert sanity only: C >= 0.8 * max(A, B) on salvage (balanced play
must never feel dominated), and A must leak at least 3x more waves than B.

Accept: table prints; assertions green; if they fail, tune ONLY constants.ts
values and record the change in a "Tuning log" section appended to SPEC.md
(do not silently edit S5 - append the log entry with old -> new).

## T19 - Final acceptance pass

Depends: all.
Files: none new (fixes only, each traced to a spec section).

Walk S12's six acceptance points on a real phone and desktop. Record the
2-minute run (screen capture). Fix only what fails a listed criterion.

Accept: all six S12 points check off; capture attached to the PR/commit
message; `npm run build` output is deployable as static files.

---

Suggested commit granularity: one commit per task, message "fathom: T0X -
<title>".
