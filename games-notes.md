# Games overhaul notes (2026-07-08)

All 5 wasm games rebuilt with redesigned, solver-verified level catalogues.
Source: the sokoban repo branches, built from worktrees at
`~/code/wclarke-gems/_sokoban-variants/*` (each has a `make web` emcc target;
needs `source ~/code/emsdk/emsdk_env.sh`). Deploy = copy `build/web/*` into
`static/games/<game>/` (and `dst/games/<game>/` for a live preview).
Work is committed on local `improve-<game>` branches in those worktrees
(not pushed - GitHub SSH auth is broken). Fuller detail:
`~/code/wclarke-gems/_sokoban-variants/STATUS.md`.

## What changed
- worm-division: 29 curated levels in 6 sets, all BFS-verified (old set had 9
  unsolvable + ~14 placeholder levels); solver repaired (segfault, missing DOWN).
- paint-machine: 15 new levels (20 of 27 old ones had no target = unwinnable);
  solver links the real engine; small win/lose banner polish.
- recursive-sokoban: 12 new levels teaching enter/exit/smuggle/self-reference.
- slime-teleports: 15 new levels (classic -> slime -> portals; 3 old ones were
  provably unwinnable).
- functional-sokoban: 18 new levels (machines, currying, clone, ifzero);
  removed debug printf spam that flooded the browser console.

## Next time (in rough priority order)
1. Playtest each game in a browser - solvers verified logic, nobody has checked
   feel/UX yet. `python3 -m http.server -d dst` after `make build`.
2. functional-sokoban: goal tiles don't render their expected value - the
   biggest UX gap; menu shows filenames not level names.
3. recursive-sokoban: no next-level flow after "LEVEL COMPLETE" (ESC only),
   R-reset is a stub.
4. worm-division: levels not re-titled; no portal/time-machine levels shipped
   (solver can't verify those mechanics - would need hand-verified traces).
5. Fix GitHub SSH auth, push the improve-* branches, merge into their branches.
6. paint-machine: one pre-existing stale unit test fails (test_block_falls).
