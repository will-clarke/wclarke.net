# wclarke.net

A hand-written static site. Everything is plain HTML/CSS in a flat repo root -
no build step, no generator, no dependencies. To change something, edit the
file; to add a post, drop an `.html` file in `posts/` and add a link to
`posts.html` (and `index.xml` if you care about RSS).

I've no idea what I write here. Or why. ¯\_(ツ)_/¯

## Layout

```
index.html        landing (intro + featured)
projects.html     the cabinet (games, live toys, meta, website history)
about.html
404.html
css/style.css     one shared, restyleable stylesheet
posts/            the blog
posts.html        blog index
stories/          short fiction
tags/ tags.html   per-tag pages + index
choosetwo/        self-hosted static copy of choosetwo.org (domain lapsed)
games/<name>/      5 sokoban WASM builds, played at /games/<name>/
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

## The games

5 WASM sokoban variants, each with a redesigned, solver-verified level set
(rebuilt 2026-07-08). Source lives in the sokoban repo's `improve-<game>`
branches (`~/code/wclarke-gems/_sokoban-variants/*`, `make web` emcc target,
needs `source ~/code/emsdk/emsdk_env.sh`; fuller detail in that repo's
`STATUS.md`).

- **worm-division** - 29 levels in 6 sets, all BFS-verified.
- **paint-machine** - 15 levels; solver links the real engine.
- **recursive-sokoban** - 12 levels teaching enter/exit/smuggle/self-reference.
- **slime-teleports** - 15 levels (classic → slime → portals).
- **functional-sokoban** - 18 levels (machines, currying, clone, ifzero).

Known gaps (nobody's playtested for feel/UX yet):

- functional-sokoban: goal tiles don't render their expected value; menu shows
  filenames, not level names.
- recursive-sokoban: no next-level flow after "LEVEL COMPLETE" (ESC only);
  R-reset is a stub.
- worm-division: levels not re-titled; no portal/time-machine levels shipped.
- paint-machine: one pre-existing stale unit test fails (`test_block_falls`).

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
