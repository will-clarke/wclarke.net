#!/usr/bin/env bash
# run the tuning harness on the big machine: ./remote-tune.sh evolve 30 48
# tuner-results.json goes up first so remote evolve appends to the real
# history, then comes back - so never run a local and a remote evolve at once.
set -euo pipefail
HOST="${TUNE_HOST:-nixos}"
DIR="antwar-factions-tune"
# nixos logs in with fish, so resolve JOBS here and hand it over via env
JOBS="${JOBS:-20}"
cd "$(dirname "$0")"
rsync -a sim.js policy.js tune.js tuner-results.json "$HOST:$DIR/"
ssh "$HOST" "cd $DIR && env JOBS=$JOBS node tune.js $*"
rsync -a "$HOST:$DIR/tuner-results.json" .
