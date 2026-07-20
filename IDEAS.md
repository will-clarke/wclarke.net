# IDEAS.md - backlog for wclarke.net

Rewritten 2026-07-20. The old version of this file was the "5 hero tiles"
pitch from before the honeycomb existed; most of it either shipped or got
overruled, so it's gone. The full cell-by-cell copy spec lives in the notes
repo (`organised/ideas/wclarke-net-honeycomb-content.md`).

## Decisions that override older versions of this file

- The sokoban variants live **in the games room**, not at the top level.
  Only recurr, drip and polyhedra are promoted out of their rooms.
- classiccult is a top-level tile at `(2,-2)` - it earned it by being alive.
- No war-stories room in the homelab: one throwaway "things die on a rota"
  cell. Lots dies; no ceremonies.
- The films canon is the 17 in `FILMS`; no comfort-films room (not a
  rewatcher), no context-free film recommendation egg.
- Every ring-≤2 top-level cell now has content, so easter eggs live inside
  section rooms on isDeep-verified paths. **Adding content onto an egg's
  ancestor path orphans it** - see README before touching cells.

## Shipped 2026-07-20 (stop re-proposing these)

Interests branch (films / books / listening / games-i-play), the workshop
(firewood, someday shelf, 3d printing), the lab (evolution + clip, t8r8r,
shortstories plaque, half-finished shelf), the archive (museum front,
morgue, early stuff), the armchair (consciousness, ai, the ledger), threads
(cross-room deep links), classiccult promotion, new generated bach
(`music` repo `20260718-160954-0`), evolution brain-probe clip at
`/video/evolution.webm`, all 15 easter eggs re-placed and verified.

## Next builds - plaques are already live, pages are missing

1. **CV exhibit** - pure ruby → org-mode → pandoc → json → google docs,
   with the deleted PDFs from the cv repo's history. Redact the phone
   number in the old `cv.rb` first. Plaque: archive `-2,1|0,1`.
2. **Commit-message hall of fame** - the trawl ("add node_modules 😱",
   "commit images - no idea if this is a good idea ¯\_(ツ)_/¯", "tweak
   skills - am I bad at ANYTHING??"). Plaque: archive `-2,1|-1,1`.
3. **Deleted scenes wing** - resurrect from git history: the 16 deleted
   short stories (`73e8ff5^:src/stories/`), the `/funky/` pages ("Yoloolo"),
   the `¯\_(ツ)_/¯` 404 (`6836c89^`). Plaque: archive `-2,1|0,-1`.
4. **shortstories static export** - pull the survivors out of `stories.db`
   into static HTML; then add an href to the lab plaque `-2,0|-1,0`.

## Ports

- **chip8 → WASM** - ncurses→canvas shim; 36 real ROMs. The games-room
  plaque is drafted in a comment next to `PINNED_GAMES`. Highest-value port.
- **hex-game → WASM** - same raylib recipe as the sokobans; low risk.
- **crossword / wordsearch → browser** - JS rewrite of the core (grid →
  HTML table, typeable cells, clue lists, check/reveal); `dict.rb` → JSON.
- **asteroids** - debug the Elm 0.18 build (`Set.fromList` runtime crash).
  Its morgue epitaph is live; resurrection would be a good joke.

## Polish / known gaps

- worm-division levels 30-36 need a feel pass (ghost timing unforgiving).
- WASM game progress doesn't survive reloads (MEMFS) - a localStorage
  bridge would fix all five at once.
- gifs/screenshots per game card (currently text-only).
- intuition custom domain: `intuition.wclarke.net` was never wired up in
  Cloudflare; it still serves from `intuition-2i1.pages.dev`.
- Museum "deleted scenes" overlaps build #3 above - same job.

## New ideas (2026-07-20)

- **The shed's setlist** - `~/code/music/out/` already has scarlatti,
  handel, chopin and mozart runs alongside the bach. Swap the single music
  cell for a small room: one composer per cell, tap to play. Or keep one
  top-level cell and rotate the track each deploy - quieter, probably
  better.
- **More clips like evolution's** - the playwright recordVideo recipe is
  proven (fresh context, scripted interaction, ~25s, keep the vp8). Best
  candidates: a worm-division time-travel level solving itself; paint
  machine's biggest factory running with play/rewind. One per plaque, no
  autoplay, same `/video/` dir.
- **Photos for the workshop** - the actual spaghetti photo, a printed
  polyhedron, the log pile. The in-comb reader can render an image page,
  so each photo can be a same-site href with `inline: true`.
- **Egg verifier in tools/** - a small node script replicating
  hash32/isDeep that checks every easter-egg path against SEED_CONTENT
  (each ancestor a section or hash-deep, no packed-room collisions). The
  logic exists from the 2026-07-20 re-placement; committing it stops the
  next content edit from silently orphaning eggs.
- **t8r8r write-up** - the potato ELO story plus the deleted potato photos
  from its history. Goes in the lab or as a post; the plaque already jokes
  that the product is finished.
- Rejected on ethos grounds, recorded so they stay rejected: a search box
  (the site has a shape instead), a build step for freshness badges, and
  any kind of easter-egg map.
