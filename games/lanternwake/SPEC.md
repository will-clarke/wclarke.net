# LANTERNWAKE - draft spec v0.1

A light-and-shadow tower defense. The dark is full of shades; they are invulnerable
in darkness and burn in light. You are the last Lamplighter. Sculpt the darkness
into a maze with lanterns, occluders, and mirrors, then focus the light you placed
into weapons.

- Platform: mobile-first web (PWA), portrait, one-thumb play. Desktop works too.
- Session: one run = 5-6 minutes (8 waves + boss). Full roguelite.
- Pillar: ONE system (the light field) drives routing, vulnerability, and damage.
- Aesthetic: lush by construction - the entire game is rendered lighting.
  Warm amber lanterns vs deep blue-black dark, dust motes in beams, moth swarms.

---

## 1. Core loop (one run)

1. A cavern map generates: a descending space ~6 cells wide, 12-14 tall, with
   rock pillars in roguelite-random positions. Pillars cast real shadows, so
   every run's light geometry is different.
2. Your Hearth sits at the bottom (thumb zone). It holds 10 Flames (lives).
3. Shades spawn at the top and descend. They pathfind toward the Hearth
   preferring darkness (see 3.1). They can only be damaged while lit.
4. Between waves: draft 1 of 3 cards (lantern species / infusion / relic),
   plus an optional Pact (curse next wave for a reward).
5. Survive 8 waves + boss to win. Winning unlocks Long Night (endless) for
   that run's build, for leaderboard chasing.

## 2. The light field

- The map is a grid overlaid with a continuous 2D light field computed by
  real shadow-casting (visibility polygons from each source, occluded by
  pillars and occluder towers).
- Each cell has a lux value, 0 to 3+ (sources stack, soft cap via falloff).

| Lux | Shade effect |
|-----|--------------|
| 0   | Invulnerable. Full speed. |
| 1   | Vulnerable to towers. 15% slow. |
| 2   | + burn DoT from the light itself. 30% slow. |
| 3+  | + burn doubled. 40% slow (cap). |

- Light is a SOFT wall: shades will cross lit ground if the dark detour is
  too expensive, so full walling is impossible by design. You bend, not block.

### 2.1 Pathfinding (the mazing engine)

- Weighted flow field toward the Hearth. Cell cost = base + K * lux.
- K is high enough that shades take meaningful detours to stay dark, low
  enough that a fully lit map just means slow, burning, direct marchers.
- Live re-routing: when the field changes (lantern snuffed, placed, occluder
  rotated), shades re-path within ~200ms. This makes mid-wave light switching
  a real-time tactic, not just build-phase planning.

## 3. Player verbs (all one-thumb)

- Drag from tray to place a tower (ghost preview shows the new light field
  and the predicted shade route BEFORE you commit - crucial for maze play).
- Tap a lantern: snuff / relight (instant, free, ~2s cooldown). This is the
  moment-to-moment skill: opening and closing shadow-gates under a live wave.
- Drag on a beam lamp or shutter: rotate it.
- Hold on the Hearth: FLARE (limited use) - whole map to lux 2 for 3s. Panic
  button, also a deliberate "everything is vulnerable NOW" combo trigger.

## 4. Towers

Two families. Light makes shades slow + vulnerable; focusers convert that
light into kills. Occluders make darkness on purpose (a maze needs corridors,
not just walls).

### 4.1 Light sources
- Wick lantern - basic radial light, cheap. The bread and butter.
- Beam lamp - directional cone, rotatable. Long corridors of light.
- Lighthouse - slow-rotating beam, huge reach. Periodic vulnerability
  everywhere; rhythm play (time your focusers to its sweep).
- Mirror - free-standing, redirects any beam that hits it. Cheap. Lets one
  beam lamp light three corridors. Skill ceiling lives here.
- Candle stub - tiny, dirt cheap, 1-lux dot. For micro-adjusting routes.

### 4.2 Focusers (damage - only hit LIT targets, need line of sight)
- Burning glass - single target beam. DPS = base * target's current lux.
  Brightening the kill zone literally is your damage upgrade.
- Prism - splits into 3 weaker beams; multiplies with lux the same way.
- Sun kettle - AoE pulse centered on itself, radius = its own cell's lux.
  Wants to sit INSIDE your brightest zone (placement tension: your brightest
  zone is usually where shades are not).

### 4.3 Shapers (darkness and control)
- Shutter - blocks light, rotatable. Carve a dark corridor exactly where you
  want shades to walk (into the kill-box).
- Moth lure - a lone candle decoy that pulls moth-type enemies away from your
  real lanterns.
- Tar wick - amber flame; its light also coats the ground, stacking slow.

## 5. Enemies (all defined by their relationship to light)

- Shade - basic. Avoids light, dies fast when lit.
- Moth - ATTRACTED to the brightest source; attacks lanterns to snuff them.
  Forces you to defend your own infrastructure or bait with lures.
- Umbra - carries a darkness aura that locally suppresses 1 lux. Stacks in
  packs (a pack of 3 walks its own invulnerability bubble down the map).
  Kill priority mechanic.
- Gloomweaver - leaves a shadow trail behind it that other shades hide in.
  Turns one leaker into a highway.
- Blinker - teleports between dark patches within range. Long lit gaps hard
  counter it; a stingy light layout gets shredded by it.
- Ashen brute - slow tank; takes damage only at lux 2+. Demands focused,
  overlapping light, not thin coverage.
- Pale king (boss) - The Eclipse: global dimming aura, periodically snuffs
  your lanterns (tap to relight under pressure), must be funneled through
  your single brightest choke to take damage at all.

The roster maps 1:1 onto light strategies: wide-thin vs narrow-bright vs
mobile switching. Wave composition is the puzzle; the draft is your answer.

## 6. Roguelite structure

### 6.1 Drafts (between waves, pick 1 of 3)
- New tower species (from a per-run pool, so builds differ run to run)
- Infusion - socket into one lantern, permanent for the run:
  - Ember oil: its light's burn DoT +100%
  - Frost oil: its slow doubled
  - Silver flame: its light pierces Umbra suppression
  - Violet glass: its lux counts double for focuser damage
  - Ghost wick: when snuffed, leaves 2s of afterglow light
- Relic - run-wide rule benders:
  - Afterglow: ALL snuffed lanterns leave 2s ghost light
  - Waxbound pact: moths that touch a lure fight for you 10s
  - Deep reserves: +2 Flares
  - Tallow economy: burn-DoT kills pay double oil

### 6.2 Pacts (optional risk dial, before a wave)
- "The dark hungers": +1 Umbra per pack -> reward: rare infusion
- "New moon": your lux capped at 2 this wave -> reward: +40% oil
- "Swarm": double moths -> reward: free lantern

### 6.3 Economy
- Oil = single currency. Earned per kill + small trickle. Spend to place.
- No fuel upkeep in v1 (upkeep exists only as a Pact curse). Snuff/relight
  is free but on cooldown - the interesting cost is tactical, not economic.

## 7. Meta progression (between runs)

- Essence (earned per run, more for deeper clears) lights the Constellation:
  a star chart where each star = a new lantern species, infusion, starting
  loadout, or map biome. Widens the possibility space; minimal raw power
  creep so the daily seed stays fair.
- Biomes (later): Mine, Drowned City (water reflects beams!), Star-eaten
  Forest. Each changes occluder geometry rules.
- Daily seed: same map + same draft offers for everyone, one attempt,
  shareable score card.

## 8. Scoring

- Score = waves cleared, then Long Night depth, with multipliers for Pacts
  taken and Flares unused. Post-run card: your final light-map silhouette as
  a shareable image (the constellation you built).

## 9. Look and feel

- Rendering IS the game: WebGL, 2D shadow-casting (visibility polygons),
  bloom on flames, dust motes drifting through beams, shades as ink-black
  silhouettes with pinprick eyes that catch the light when lit.
- Audio: darkness is near-silent; each lantern adds a soft harmonic layer,
  so a bright map literally sounds fuller. Snuffing is a felt "whumpf".
- Palette: 90% of the screen is deep blue-black; warm ambers, one accent
  per infusion color. High contrast = readable on small screens in daylight.

## 10. Tech sketch

- TypeScript + WebGL2 (or wasm core if it joins the existing games setup),
  portrait canvas, PWA manifest, offline-capable.
- Light field: visibility polygons per source -> rendered to a lux texture ->
  same texture sampled by gameplay (CPU mirror grid at cell resolution for
  pathfinding + damage checks). One source of truth.
- Flow-field pathfinding on the cell grid, recomputed on light change
  (debounced ~200ms), shades steer smoothly along it.
- Determinism: seeded RNG end to end for the daily.

## 11. Decisions (locked for v0)

1. Placement: snap-to-grid. Free placement is a possible v2 experiment.
2. Pure "light is ammo": focusers are the ONLY damage. Build variety comes
   from infusions and relics, not conventional towers.
3. Map shape: open cavern with roguelite-random rock pillars. The maze is
   entirely player-made; pillar RNG refreshes the shadow geometry every run.
4. Theme skin: underground cavern (mine) for v0.
5. Name: Lanternwake.

Implementation details, exact tuning numbers, and the build order live in
IMPLEMENTATION.md. For v0 scope questions, that file wins over this one.
