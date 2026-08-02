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
SPICE_ENV=""
[ -n "${SPICE:-}" ] && SPICE_ENV="SPICE=$SPICE"
FACTION_ENV=""
[ -n "${FACTION:-}" ] && FACTION_ENV="FACTION=$FACTION"
cd "$(dirname "$0")"
rsync -a sim.js policy.js tune.js tuner-results.json "$HOST:$DIR/"
ssh "$HOST" "cd $DIR && env JOBS=$JOBS $SPICE_ENV $FACTION_ENV node tune.js $*"
rsync -a "$HOST:$DIR/tuner-results.json" .
