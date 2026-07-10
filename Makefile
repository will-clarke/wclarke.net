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

GAMES_SRC := ../games
PORT      ?= 8000
PULL      ?= 1        # PULL=0 to skip the git pull (e.g. offline)

# Games already under games/ that come from elsewhere (the sokoban WASM set,
# rebuilt in wclarke-gems). Excluded from --delete so a sync never prunes them.
KEEP_GAMES := functional-sokoban paint-machine polyhedra recursive-sokoban \
              slime-teleports worm-division
KEEP_EXCLUDES := $(foreach g,$(KEEP_GAMES),--exclude=$(g))

.DEFAULT_GOAL := help

## sync: pull ../games and import it into games/
sync: pull sync-games
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

## sync-games: copy ../games (self-contained static games) -> games/
sync-games:
	@echo "==> games/  <- $(GAMES_SRC)  (keeping: $(KEEP_GAMES))"
	@rsync -a --delete $(KEEP_EXCLUDES) \
	  --exclude='.git' --exclude='.gitignore' --exclude='Makefile' \
	  --exclude='*.md' --exclude='_template' --exclude='scratch-*.js' \
	  --exclude='.playwright-mcp' --exclude='*.png' \
	  $(GAMES_SRC)/ games/

## serve: preview the site locally at http://localhost:$(PORT)
serve:
	@echo "Serving wclarke.net at http://localhost:$(PORT)  (Ctrl-C to stop)"
	@python3 -m http.server $(PORT)

## help: show available targets
help:
	@grep -E '^## ' $(MAKEFILE_LIST) | sed 's/## /  /'

.PHONY: sync pull sync-games serve help
