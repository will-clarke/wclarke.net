#!/usr/bin/env bash
# run the tuning harness on the big machine: ./remote-tune.sh evolve 30 48
# tuner-results.json goes up first so remote evolve appends to the real
# history, then comes back - so never run a local and a remote evolve at once.
set -euo pipefail
HOST="${TUNE_HOST:-nixos}"
DIR="antwar-factions-tune"
# nixos logs in with fish, so resolve JOBS here and hand it over via env
JOBS="${JOBS:-20}"
# SPICE=spawnRate:0.01 ./remote-tune.sh evolve 15 24 grades a T6c paint flag;
# FACTION=rot:sandbox grades a cross-faction same-brain panel (T7a).
# ./remote-tune.sh panel 15 24 breeds+duels one champion per faction (T20) -
# it evolves K times, so budget K x the time of a single evolve.
# ./remote-tune.sh coevolve 3 15 24 (T22) evolves rounds x factions times, so
# budget 9 x a single evolve plus four duel grids.
# nohup ./remote-tune.sh sweep sweep-spec.example.json 2000 9 & is the overnight
# number search (T8); sweep-results.json comes back with it.
SPICE_ENV=""
[ -n "${SPICE:-}" ] && SPICE_ENV="SPICE=$SPICE"
FACTION_ENV=""
[ -n "${FACTION:-}" ] && FACTION_ENV="FACTION=$FACTION"
# SEED0=1 enables T21's gen-0 content seeding (off by default: measured harmful).
SEED0_ENV=""
[ -n "${SEED0:-}" ] && SEED0_ENV="SEED0=$SEED0"
cd "$(dirname "$0")"
# sweep takes a spec FILE: send it up and refer to it by basename over there,
# so ./remote-tune.sh sweep specs/paint.json 2000 works from anywhere.
SPEC=""
ARGS="$*"
if [ "${1:-}" = "sweep" ] && [ -n "${2:-}" ]; then
  SPEC="$2"
  shift 2
  ARGS="sweep $(basename "$SPEC") $*"
fi
rsync -a sim.js policy.js tune.js tuner-results.json ${SPEC:+"$SPEC"} "$HOST:$DIR/"
# Results come back on EXIT, not just on success: a killed multi-hour run
# (coevolve, sweep) has real champions/trials on disk over there, and the next
# run's up-sync would overwrite them with the stale local file. Champions are
# cached per tag, so a resumed coevolve then skips what already bred.
# sweep-results.json only exists once a sweep has run there, hence the || true.
trap 'rsync -a "$HOST:$DIR/tuner-results.json" . || true
      [ -n "$SPEC" ] && rsync -a "$HOST:$DIR/sweep-results.json" . || true' EXIT
ssh "$HOST" "cd $DIR && env JOBS=$JOBS $SPICE_ENV $FACTION_ENV $SEED0_ENV node tune.js $ARGS"
