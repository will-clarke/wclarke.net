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
# Most games are self-contained static HTML. A few are build-based (see
# BUILD_GAMES): `make sync` builds them in ../games and copies only their
# built dist/ into games/<slug>/ -- never the source tree or node_modules.
#
# There is no games/index.html any more (the standalone hex cabinet was
# retired - the comb's own games room replaces it). The sync still excludes
# /index.html and /shots so ../games can never (re)introduce a games/ landing
# page or its screenshots. games.json still syncs in as data for the comb.

GAMES_SRC := ../games
PORT      ?= 8000
PULL      ?= 1        # PULL=0 to skip the git pull (e.g. offline)

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
# node_modules, configs) or a dev-only test harness (harness.mjs).
SRC_EXCLUDES := --exclude=node_modules --exclude=package.json \
                --exclude=package-lock.json --exclude=tsconfig.json \
                --exclude='*.ts' --exclude='*.mjs' \
                --exclude=src --exclude=test --exclude=tools \
                --exclude=web --exclude=public --exclude=scripts --exclude=dist

.DEFAULT_GOAL := help

## sync: pull ../games, build the build-based games, and import into games/
sync: pull build sync-games sync-built
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

## build: build the build-based games in ../games (-> each game's dist/)
build:
	@$(MAKE) -C $(GAMES_SRC) build

## sync-games: copy ../games (self-contained static games) -> games/
sync-games:
	@echo "==> games/  <- $(GAMES_SRC)  (keeping: $(KEEP_GAMES))"
	@rsync -a --delete $(KEEP_EXCLUDES) $(BUILD_EXCLUDES) $(SRC_EXCLUDES) \
	  --exclude='.git' --exclude='.gitignore' --exclude='Makefile' \
	  --exclude='*.md' --exclude='_template' --exclude='scratch-*.js' \
	  --exclude='.playwright-mcp' --exclude='*.png' --exclude='test.js' \
	  --exclude='/index.html' --exclude='/shots' \
	  $(GAMES_SRC)/ games/

## sync-built: copy each build-based game's dist/ -> games/<slug>/
sync-built:
	@for g in $(BUILD_GAMES); do \
	  echo "==> games/$$g/  <- $(GAMES_SRC)/$$g/dist/"; \
	  rsync -a --delete $(GAMES_SRC)/$$g/dist/ games/$$g/; \
	done

## sync-intuition: regenerate intuition.json from ../intuition's post index
sync-intuition:
	@node tools/sync-intuition.mjs

## serve: preview the site locally at http://localhost:$(PORT)
serve:
	@echo "Serving wclarke.net at http://localhost:$(PORT)  (Ctrl-C to stop)"
	@python3 -m http.server $(PORT)

## help: show available targets
help:
	@grep -E '^## ' $(MAKEFILE_LIST) | sed 's/## /  /'

.PHONY: sync pull build sync-games sync-built sync-intuition serve help
