# wclarke.net -- import web content from sibling repos into the site tree.
#
# The site itself has no build step: Cloudflare Pages serves the repo root
# verbatim. `make sync` pulls the source repos and copies their web-servable
# output in. Review the diff, then commit + push to deploy as usual.
#
# Only ../games is synced here: its games use relative links, so they drop
# straight into /games/. Intuition is NOT synced -- it hand-codes absolute
# links, so it lives as its own Cloudflare Pages project at
# https://intuition-2i1.pages.dev (linked from the site, not copied in).
# `make sync-intuition` regenerates /intuition.json (the honeycomb's
# intuition room) from ../intuition's post index.
#
# The sync only ever ships ../games' COMMITTED state, never its working tree:
# a game being edited over there must not land half-written on the site. HEAD
# is unpacked into $(SNAPSHOT) with `git archive`, and both the static copy and
# the dist builds come from that. Uncommitted work is listed as a warning and
# skipped -- to ship it, commit it in ../games first.
#
# Most games are self-contained static HTML. A few are build-based (see
# BUILD_GAMES): `make sync` builds them in the snapshot and copies only their
# built dist/ into games/<slug>/ -- never the source tree or node_modules.
# A build-based game is only rebuilt when its committed tree hash changes:
# the last-synced hash is stamped in $(STAMPS)/<slug>. `make sync FORCE=1`
# rebuilds them all. Games that commit their bundled index.html (hydra,
# allotmatic) are never built here -- the static sync ships what they
# committed.
#
# There is no games/index.html any more (the standalone hex cabinet was
# retired - the comb's own games room replaces it). The sync still excludes
# /index.html and /shots so ../games can never (re)introduce a games/ landing
# page or its screenshots. games.json still syncs in as data for the comb.

GAMES_SRC := ../games
SNAPSHOT  := /tmp/wclarke-net-games-snapshot
STAMPS    := .sync-stamps
PORT      ?= 8000
PULL      ?= 1        # PULL=0 to skip the git pull (e.g. offline)
FORCE     ?= 0        # FORCE=1 to rebuild build-based games regardless of stamps

# Games already under games/ that come from elsewhere (the sokoban WASM set,
# rebuilt in wclarke-gems). Excluded from --delete so a sync never prunes them.
KEEP_GAMES := functional-sokoban paint-machine polyhedra recursive-sokoban \
              slime-teleports worm-division
KEEP_EXCLUDES := $(foreach g,$(KEEP_GAMES),--exclude=$(g))

# Build-based games that emit a dist/: built in ../games, then only their dist/
# is copied in. Fully excluded from the generic static sync so their raw project
# tree never lands. (hydra is build-based too but bundles into a self-contained
# index.html at its root, so it rides the static sync -- SRC_EXCLUDES below keep
# its source out.)
BUILD_GAMES    := fathom shipshape lanternwake
BUILD_EXCLUDES := $(foreach g,$(BUILD_GAMES),--exclude=$(g))

# Source/tooling cruft that must never reach the site. Static games are single
# self-contained index.html files; anything below is build source (hydra's TS,
# node_modules, configs) or a dev-only test harness (harness.mjs). `worker`
# is mini-level's Cloudflare Worker (server-side deploy tooling - wrangler
# config, D1 schema, and .dev.vars secrets that must NEVER land on the site;
# the game talks to the deployed worker over https, nothing here serves it).
SRC_EXCLUDES := --exclude=node_modules --exclude=package.json \
                --exclude=package-lock.json --exclude=tsconfig.json \
                --exclude='*.ts' --exclude='*.mjs' \
                --exclude=src --exclude=test --exclude=tools \
                --exclude=web --exclude=public --exclude=scripts --exclude=dist \
                --exclude=worker

.DEFAULT_GOAL := help

## sync: pull ../games, snapshot HEAD, build, and import into games/
sync: pull snapshot sync-games sync-built drop-snapshot sitemap
	@echo
	@echo "== done. review + commit to deploy: =="
	@git status --short

## pull: fast-forward ../games (skipped when PULL=0)
pull:
ifeq ($(PULL),1)
	@echo "==> git pull --ff-only  ($(GAMES_SRC))"
	@git -C $(GAMES_SRC) pull --ff-only
else
	@echo "==> skipping git pull (PULL=0)"
endif

## snapshot: unpack ../games' committed state (HEAD) into $(SNAPSHOT)
snapshot:
	@rm -rf $(SNAPSHOT)
	@mkdir -p $(SNAPSHOT)
	@git -C $(GAMES_SRC) archive HEAD | tar -x -C $(SNAPSHOT)
	@echo "==> $(SNAPSHOT)  <- $(GAMES_SRC) @ $$(git -C $(GAMES_SRC) rev-parse --short HEAD)"
	@dirty=$$(git -C $(GAMES_SRC) status --porcelain); \
	 if [ -n "$$dirty" ]; then \
	   echo "    uncommitted in $(GAMES_SRC) -- NOT synced (commit it there to ship it):"; \
	   echo "$$dirty" | sed 's/^/      /'; \
	 fi

## drop-snapshot: remove $(SNAPSHOT)
drop-snapshot:
	@rm -rf $(SNAPSHOT)

## sync-games: copy the snapshot (self-contained static games) -> games/
sync-games: snapshot
	@echo "==> games/  <- snapshot  (keeping: $(KEEP_GAMES))"
	@rsync -a --delete $(KEEP_EXCLUDES) $(BUILD_EXCLUDES) $(SRC_EXCLUDES) \
	  --exclude='.gitignore' --exclude='Makefile' \
	  --exclude='*.md' --exclude='_template' --exclude='scratch-*.js' \
	  --include='icon-*.png' --include='apple-touch-icon.png' \
	  --exclude='*.png' --exclude='test.js' \
	  --exclude='tune.js' --exclude='tuner-results.json' \
	  --exclude='/index.html' --exclude='/shots' \
	  $(SNAPSHOT)/ games/

## sync-built: build each stale build-based game and copy its dist/ -> games/<slug>/
sync-built: snapshot
	@mkdir -p $(STAMPS)
	@for g in $(BUILD_GAMES); do \
	  want=$$(git -C $(GAMES_SRC) rev-parse HEAD:$$g); \
	  if [ "$(FORCE)" != "1" ] && [ "$$want" = "$$(cat $(STAMPS)/$$g 2>/dev/null)" ] \
	     && [ -e games/$$g/index.html ]; then \
	    echo "==> games/$$g/  unchanged, skipping build"; \
	    continue; \
	  fi; \
	  echo "==> building $$g"; \
	  (cd $(SNAPSHOT)/$$g && npm ci --no-audit --no-fund && npm run build) || exit 1; \
	  echo "==> games/$$g/  <- snapshot/$$g/dist/"; \
	  rsync -a --delete $(SNAPSHOT)/$$g/dist/ games/$$g/; \
	  printf '%s\n' "$$want" > $(STAMPS)/$$g; \
	done

## sync-intuition: regenerate intuition.json from ../intuition's post index
sync-intuition:
	@node tools/sync-intuition.mjs

## sitemap: regenerate sitemap.txt from games.json, index.xml and content.js
sitemap:
	@node tools/gen-sitemap.mjs

## serve: preview the site locally at http://localhost:$(PORT)
serve:
	@echo "Serving wclarke.net at http://localhost:$(PORT)  (Ctrl-C to stop)"
	@python3 -m http.server $(PORT)

## help: show available targets
help:
	@grep -E '^## ' $(MAKEFILE_LIST) | sed 's/## /  /'

.PHONY: sync pull snapshot drop-snapshot sync-games sync-built \
        sync-intuition sitemap serve help
