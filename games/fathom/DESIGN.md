# FATHOM

Idle / tower-defence hybrid. You lower The Line - a powered cable of stations -
into an ocean trench. Defend it, feed it, push it deeper. When the deep finally
wins, scuttle, surface, and come back as the next expedition - your old wreck
is down there waiting to be salvaged.

Decided: mobile-first web PWA on wclarke.net · thin server (deterministic sim,
server stores save + timestamp) · idle-first with live play as accelerator ·
light logistics · in-game clock · lore drip · vector + bioluminescence art ·
soft-forced run end · hobby first, architecture product-ready.

## Design pillars

1. **Planning is the skill.** The threat schedule is published in advance.
   Reacting is optional; reading the forecast and setting up well is the game.
2. **Obvious combat.** Creatures swim at the Line, turrets shoot them. Every
   threat has one readable counter. No hidden math needed to play well.
3. **Graceful failure.** Breaches cost position and time, never core progress.
   No unfair overnight wipes.
4. **Risk is geographic.** Rich stuff is deep and exposed; safe stuff is
   shallow and poor. Economy vs defence vs offence compete for the same slots,
   crew, and power.
5. **The reset is diegetic.** Prestige isn't a menu button - it's the next
   expedition finding the last one's wreck.
6. **No dark patterns.** No build timers, no pay-to-skip, no loss-on-raid.
   Check-ins are motivated by genuine curiosity (forecast, report, salvage).

## The four nested loops

```
CHECK-IN (3-8 min, 2-4x/day)
  harvest -> night report -> spend -> re-tune nodes -> read 36h forecast -> set orders
    v
SESSION (20-40 min, optional)
  play a migration or leviathan live "at the Conn" -> tap abilities, 2-3x salvage
    v
RUN / EXPEDITION (2-4 days casual)
  push the Line down through biomes until pressure debt dooms it -> scuttle & surface
    v
META (~1 week casual / 12-18h active to "true ending"; no hard win state)
  surface institute upgrades + your wrecks accumulating in the trench
```

## World & UX

- One vertical column, portrait, thumb-scrollable. Pinch/zoom between trench
  overview and node detail. Bottom sheet for building. Forecast ribbon pinned
  at top. That's the whole UI.
- **Biomes by depth** (one new threat + one new resource + one new mechanic each):
  - Sunlit (0-200m) - tutorial economics, kelp, shimmer swarms
  - Twilight (200-1,000m) - divers, light mechanics begin
  - Midnight (1,000-4,000m) - thermal vents (local power!), armoured shellbacks
  - Abyss (4,000-6,000m) - siphons, lanternjaws, wreck fields
  - Hadal (6,000-11,000m) - leviathan territory
  - Below (fictional depth) - the Signal; endgame mystery
- **The clock:** 1 in-game day = 8 real hours (~3 cycles per real day, so each
  daily check-in lands in a different phase). Fully deterministic and visible.

## Threat schedule (the offline-TD unlock)

Diel vertical migration: the swarm layer rises at (in-game) night and sinks at
dawn - a published intensity curve, like a tide table. The 36h forecast ribbon
shows: migration curve, storms, leviathan warnings, whale-falls (loot events).
Everything is deterministic from the seed; the forecast never lies, it just
gets vaguer past ~24h.

## Systems

### Power (the spine)
- Generated at the surface (solar - weaker at in-game night) and, from
  Midnight zone on, at thermal vents (strong, local, contested).
- Transmitted down the cable with per-metre loss; relay nodes reduce it.
- Every node has upkeep scaling with depth. Batteries store power so a node
  can fight through the night swarm on its own.
- Strategic arc of each run: early = long fragile tail fed from surface;
  mid = vents unlock deep self-sufficient bastions; the shape of your Line
  inverts.

### Nodes & building
- Each node: 4-6 slots on left/right trench walls.
- Buildables: turrets (nets/flak, arc coils, harpoons), harvesters (kelp,
  pearl beds, vent taps, wreck cranes), lights, batteries, relays, crew
  quarters.
- Lights are a placement puzzle: they buff accuracy nearby but attract
  lanternjaws. Bait or shield - player's choice.

### Threat roster (each with one obvious counter)
| Threat | Behaviour | Counter |
|---|---|---|
| Shimmer swarm | many, weak, rises at night | nets / flak |
| Diver | fast, dives past shallow defences | arc coils (chain hits) |
| Shellback | slow, armoured | harpoons (pierce) |
| Lanternjaw | hunts light sources | light placement, blackout orders |
| Siphon | latches, drains power | batteries + burst weapons |
| Leviathan | forecast boss event | everything + live play strongly encouraged |

### Offence: the sub
- Crew it by pulling crew from stations (defence measurably weakens while out).
- Missions: strike nests (reduce future wave intensity locally), hunt
  (big loot, risk), salvage (your old wrecks, and beyond the Line).
- Deeper targets pay exponentially more. Sub still out when the migration
  rises = trouble.

### Breach model (graceful failure)
- A node overwhelmed = the Line severs there. Everything below goes dark:
  stops producing, stops defending, doesn't get destroyed.
- Re-splice for a cost; creatures may nest on dark segments (clearing is
  content, not punishment).

### Run end (soft-forced)
- Pressure debt: below a depth threshold, global upkeep ramps steadily until
  the run is economically doomed.
- The player picks the scuttle moment. Orderly scuttle > collapse: bonus
  Findings and a more intact wreck for the next run.

### Prestige & meta
- Prestige currency: **Findings** (expedition data). Spent at the surface
  institute: hull tech (start deeper), cable efficiency, blueprints, crew
  training, forecast range.
- Diegetic layer: every past run leaves a physical wreck at its death depth.
  Next run salvages it (head start scaled by how orderly the scuttle was) and
  recovers a log fragment.
- Roguelite flavour: per-run modifiers (currents, blooms, unusual fauna) from
  the run seed, so each expedition asks for a different build.

## Narrative (lore drip)
- 40-60 short log fragments on wrecks: what happened to Expedition One, what
  the Signal is. Every expedition finds logs that shouldn't be possible.
- No characters on screen, no dialogue trees. The trench speaks.
- "True ending" buried at an absurd depth; the game continues past it.

## Live play ("the Conn")
- Optional, never gated. Taking the Conn during a migration/leviathan grants
  2-3x salvage from kills.
- Verbs: target-priority pings, depth charges, emergency power reroute,
  blackout order, sub recall. Tap/hold only - one thumb.

## Server & tech
- Sim = pure deterministic `advance(state, seconds)`; identical code client
  and server (TypeScript both sides). Client plays optimistically; server is
  authority for saves, timestamps, and (v2) ghosts.
- Sync via anonymous account code first; real accounts only if it grows.
- v2 hooks kept in the data model from day one: player wrecks in others'
  trenches (ghost salvage), deepest-line leaderboard.

## Art direction
- Vector, flat shapes, very dark backgrounds, bioluminescent accent glow.
- Depth = palette: warm sunlit blues -> teal -> ink -> black with neon fauna.
- OLED-friendly; UI chrome minimal, diagrammatic, high-contrast.

## Balance targets (v1 tuning goals, not promises)
- First run: reach Twilight in one evening. First prestige inside 48h.
- 4-6 runs to Hadal / true-ending depth: ~1 week casual, 12-18h active.
- A check-in should always contain >=1 meaningful decision (not just taxes).
- Live play ~2.5x idle rate: nice, never necessary.

## Open questions
- Exact slot/upkeep/damage numbers - needs a spreadsheet + sim harness.
- Crew as a distinct resource vs folded into power. Currently distinct (sub
  tradeoff needs it) - revisit if it's one dial too many.
- Whale-fall / storm event details.
- How vague the >24h forecast gets (determinism vs surprise).
- First-playable scope cut (suggest: Sunlit+Twilight, 3 threats, no sub,
  no prestige - prove the check-in loop feels good first).
