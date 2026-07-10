# wclarke.net

A hand-written static site. Everything is plain HTML/CSS in a flat repo root -
no build step, no generator, no dependencies. To change something, edit the
file; to add a post, drop an `.html` file in `posts/` and add a link to
`posts.html` (and `index.xml` if you care about RSS).

I've no idea what I write here. Or why. ¯\_(ツ)_/¯

## Layout

```
index.html        landing (intro + featured); hosts the "✦ FRACTALS" button
projects.html     the cabinet (games, live toys, meta, website history)
about.html
404.html
css/style.css     one shared, restyleable stylesheet
js/trippy.js      cursor-driven recursive-fractal canvas (homepage only)
writing.html      hub linking both posts and stories (in the top nav)
posts/            the blog
posts.html        blog index (still live; not in nav - reached via writing.html)
stories/          short fiction (indexed from writing.html)
tags/ tags.html   per-tag pages + index
choosetwo/        self-hosted static copy of choosetwo.org (domain lapsed)
games/<name>/      games at /games/<name>/: 5 sokoban WASM builds + the
                  ../games strategy set (imported via `make sync`)
Makefile          `make sync` imports web content from sibling repos
museum/           every dead version of this site since 2014, raw HTML
stats.html        commit stats
index.xml sitemap.txt robots.txt
```

## Run it locally

```fish
cd ~/code/wclarke.net; and python3 -m http.server 8000
# → http://localhost:8000
```

## Deploy

Served verbatim by **Cloudflare Pages** (Framework preset: None, Build command:
empty, Build output directory: `/` - the repo root). Every push to `master`
redeploys automatically. `.assetsignore` keeps repo-only files (this README,
`.gitignore`) off the web.

WASM on a static host is fine: the games are single-threaded (no COOP/COEP
headers needed) and `.wasm` serves as `application/wasm`.

Note: the `tags/` pages are re-included via `.gitignore` (`!/tags/`) because the
global ctags ignore would otherwise silently drop them.

## Importing from sibling repos (`make sync`)

The site has no build step, but some content is built and maintained in sibling
repos. `make sync` runs their builds/copies and drops the web-servable output
into the tree; you then review the diff and commit to deploy.

- **`../games`** (self-contained HTML/JS games) → `/games/`. Relative links, so
  it's a straight copy. The 6 sokoban WASM dirs (sourced from `wclarke-gems`,
  not `../games`) are excluded from `--delete`, so the sync never prunes them.
  `make sync PULL=0` skips the `git pull` of the source repo.
- **intuition** is *not* synced. It hand-codes absolute (`/…`) links, so it
  can't be served under a subpath; it runs as its own Cloudflare Pages project
  (built from the `intuition` repo) at **intuition.wclarke.net**, linked from
  `projects.html`.

## The games

5 WASM sokoban variants, each with a redesigned, solver-verified level set
(rebuilt 2026-07-08, expanded 2026-07-09). Source lives in the sokoban repo's
`improve-<game>` branches (`~/code/wclarke-gems/_sokoban-variants/*`, `make web`
emcc target, needs `source ~/code/emsdk/emsdk_env.sh`; fuller detail in that
repo's `STATUS.md`).

- **worm-division** - 36 levels in 7 sets incl. `07_time` (rewind pill spawns a
  ghost replaying your moves); every level replay-verified through the real
  engine, the 7 time levels provably require time travel.
- **paint-machine** - 30 levels; rainbow/gradient showcases + big machine
  levels; solver links the real engine.
- **recursive-sokoban** - 20 levels: enter/exit/smuggle, twin rooms, decoy
  copies, mutual recursion; BFS-solved AND solutions replayed in-engine.
- **slime-teleports** - 21 levels (classic → slime → portals → [Master]).
- **functional-sokoban** - 25 levels (machines, currying, clone, ifzero);
  goal tiles now show their expected value, menu shows level names.

Known gaps (solver-verified, but only lightly human-playtested):

- worm-division levels 30-36 need a feel pass (ghost timing is unforgiving).
- Browser progress doesn't persist across reloads (saves go to wasm MEMFS).

## Also here

- [The museum](museum/) - every dead version of this site since 2014, restored
  and served as raw HTML (2014-rails, 2014-jekyll, 2020-org, 2021-ssssg).
  Trackers/Disqus stripped; phone number in the "CV in Pure Ruby" post redacted.
- [Stats](stats.html) - twelve and a half years of commits across 68 repos.

## Backlog / next ideas

- **Museum "deleted scenes" wing** - resurrect content that only exists in git
  history: the 16 deleted short stories (`73e8ff5^:src/stories/`, plot outlines
  in HTML comments), the `/funky/` easter-egg pages ("Yoloolo") and the
  `¯\_(ツ)_/¯` 404 (`6836c89^`). Cheapest high-value follow-up.
- **CV exhibit** - one page tracing the CV's decade: pure Ruby → org-mode →
  pandoc PDF → JSON Resume → "just use Google Docs", with the deleted PDFs from
  the cv repo's history. Redact the phone number in the old `cv.rb` first.
- **Commit-message hall of fame** - a ranked list ("commit images - no idea if
  this is a good idea ¯\_(ツ)_/¯", "Add node_modules 😱", "tweak skills - am I
  bad at ANYTHING??").
- **chip8 → WASM** - ncurses→canvas shim; 36 real ROMs; highest-value port.
- **hex-game → WASM** - same raylib recipe as the sokobans; low risk.
- **Crossword / wordsearch → browser** - JS rewrite of the core (grid → HTML
  table, typeable cells, clue lists, check/reveal); `dict.rb` → JSON is trivial.
- **shortstories self-host** - extract the survivors from `stories.db` → static
  HTML rather than running the (heavy) generator model live.
- **t8r8r deleted potato photos** if the potato ELO ever gets a write-up.
- **asteroids** - debug/recompile the Elm 0.18 build (crashes in modern
  browsers: `Set.fromList` runtime error) to bring it back.
- **gifs/screenshots** per game card (currently text-only).
- Decide whether a tiny layout/include step is worth it once header/footer
  repetition across the hand-written pages starts to bite.
