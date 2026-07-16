# Shipshape

Incremental tower-defence where packing your ship well is the strategy.
Mobile-first PWA. Pure deterministic sim core + headless tuning harness.

- **DESIGN.md** - what the game is and why. Read once, first.
- **TASKS.md** - the build order. Idiot-proof, do tasks strictly in sequence.
- **NOTES.md** - contract questions, approved state additions, tuning log.

```
npm install
npm test          # must be green before AND after every task
npm run dev       # browser dev server
npm run sim       # headless single run (after T11)
npm run sweep     # multi-run sweeps (after T13)
npm run balance   # balance invariant suite (after T13)
```

Frozen contracts live in `src/core/types.ts` and `src/core/params.ts` -
read their header comments before touching anything.
