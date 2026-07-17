# wclarke.net

A hand-written static site. Everything is plain HTML/CSS in a flat repo root -
no build step, no generator, no dependencies. To change something, edit the
file; to add a post, drop an `.html` file in `posts/` and add a link to
`posts.html` (and `index.xml` if you care about RSS).

I've no idea what I write here. Or why. ¯\_(ツ)_/¯

## Layout

```
index.html        THE HONEYCOMB: the whole homepage is one self-contained
                  canvas app - an infinitely recursive hex grid with the
                  site's content embedded in it (see section below)
projects.html     the cabinet (games, live toys, meta, website history)
about.html
404.html
css/style.css     one shared, restyleable stylesheet
writing.html      hub linking both posts and stories
writing-hex.html  the old hex-grid writing index (kept; linked from the lab)
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

## The honeycomb homepage (index.html)

The homepage is a single self-contained file: an infinite recursive
honeycomb (zoom in forever, zoom out forever) with the site's content
living at fixed cell addresses. No dependencies, no build.

**How content works.** Everything is in the `CONTENT` registry near the
top of the `<script>`. Keys are cell paths from the origin comb:
`'1,0'` is a cell of the home comb, `'1,0|0,1'` is a cell inside that
cell's comb, and so on. Three item shapes:

```js
// a labelled room whose interior comb holds more items
'0,-1|2,0': { section: true, glyph: '🎬', title: 'films' },
// a plaque: glyph -> title -> blurb + pill as you zoom; click-click opens href
'0,-1|2,0|0,1': { glyph: '🎞', title: 'classiccult', act: 'visit',
                  href: 'https://…', blurb: 'one line about it.' },
// a prose note: the text IS the cell (href/act optional)
'0,-1|2,0|1,0': { note: 'a short fact rendered right in the grid.', glyph: '🍿' },
```

Add entries to `SEED_CONTENT` (three lines = a new room). Any same-site
`href` with `inline: true` opens in the in-comb reader overlay instead
of navigating (it fetches the page and renders its `<main>`). Cells
without content stay procedural honey - leave gaps on purpose.

**Data sources.** At load it fetches `/games/games.json` (games room)
and `/index.xml` (writing room; every RSS item becomes a plaque).
`fillSection(baseKey, items, …)` lays a list out in a comb and spills
overflow into a recursive "more" room at the comb's centre - that is
how 64 posts paginate through the fractal.

**Navigation contract.** Every room is a hash URL (`/#0,0/0,0` is the
homelab). Dives push history entries, so the browser back button is
undo-dive; the in-comb reader pushes one entry, so back folds it away
first. Esc rises a level (or closes the reader). The ⬡ crumb flies
home from any depth.

**Useful cells to know.** `'0,0'` = the about room (with `'0,0|0,0'` =
the shed/homelab and `'0,0|1,1'` = the CV inside it); `'1,0'` games;
`'-1,1'` writing; `'0,-1'` lab; top-level features: `'0,1'` intuition,
`'-1,0'` paint machine, `'1,-1'` shipshape. Tunables (`ZF`, `DIVE_FRAC`,
easing rates) sit at the top of the script. Test with `make serve` -
content fetches need http, not file://.

**Party mode.** The 🕺 button (bottom right) drops a mirror ball into
the hive on a chain; the synthesized disco loop (WebAudio, four bars of
Dm7-G7-Cmaj7-Am7) starts the frame the ball first lands. Beams, sweep
dots and confetti all render on the main canvas; the same 🕺 winds it
all back up. No assets, no libraries.

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
