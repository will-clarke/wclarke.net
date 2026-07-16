# wclarke.net -- import web content from sibling repos into the site tree.
#
# The site itself has no build step: Cloudflare Pages serves the repo root
# verbatim. `make sync` pulls the source repos and copies their web-servable
# output in. Review the diff, then commit + push to deploy as usual.
#
# Only ../games is synced here: its games use relative links, so they drop
# straight into /games/. Intuition is NOT synced -- it hand-codes absolute
# links, so it lives as its own Cloudflare Pages project at
# intuition.wclarke.net (linked from the site, not copied in).
#
# Most games are self-contained static HTML. A few are build-based (see
# BUILD_GAMES): `make sync` builds them in ../games and copies only their
# built dist/ into games/<slug>/ -- never the source tree or node_modules.
#
# games/index.html is the honeycomb cabinet (js/games.js), a wclarke.net-native
# page that reuses this site's hex engine (/css, /js) - so it is owned here and
# EXCLUDED from the sync, not pulled from ../games. games/shots/ (the dive-in
# screenshots it shows) is excluded too. games.json still syncs in as data.

GAMES_SRC := ../games
PORT      ?= 8000
PULL      ?= 1        # PULL=0 to skip the git pull (e.g. offline)

# Games already under games/ that come from elsewhere (the sokoban WASM set,
# rebuilt in wclarke-gems). Excluded from --delete so a sync never prunes them.
KEEP_GAMES := functional-sokoban paint-machine polyhedra recursive-sokoban \
              slime-teleports worm-division
KEEP_EXCLUDES := $(foreach g,$(KEEP_GAMES),--exclude=$(g))

# Build-based games: built in ../games, then only their dist/ is copied in.
# Excluded from the generic static sync so the raw project tree never lands.
BUILD_GAMES    := fathom shipshape
BUILD_EXCLUDES := $(foreach g,$(BUILD_GAMES),--exclude=$(g))

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
	@rsync -a --delete $(KEEP_EXCLUDES) $(BUILD_EXCLUDES) \
	  --exclude='.git' --exclude='.gitignore' --exclude='Makefile' \
	  --exclude='*.md' --exclude='_template' --exclude='scratch-*.js' \
	  --exclude='.playwright-mcp' --exclude='*.png' \
	  --exclude='index.html' --exclude='shots' \
	  $(GAMES_SRC)/ games/

## sync-built: copy each build-based game's dist/ -> games/<slug>/
sync-built:
	@for g in $(BUILD_GAMES); do \
	  echo "==> games/$$g/  <- $(GAMES_SRC)/$$g/dist/"; \
	  rsync -a --delete $(GAMES_SRC)/$$g/dist/ games/$$g/; \
	done

## serve: preview the site locally at http://localhost:$(PORT)
serve:
	@echo "Serving wclarke.net at http://localhost:$(PORT)  (Ctrl-C to stop)"
	@python3 -m http.server $(PORT)

## help: show available targets
help:
	@grep -E '^## ' $(MAKEFILE_LIST) | sed 's/## /  /'

.PHONY: sync pull build sync-games sync-built serve help
