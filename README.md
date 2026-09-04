# wclarke.net

A hand-written static site with no build step, no generator, no dependencies.
The whole thing is one canvas app (the honeycomb); to add a blog post, add an
`<item>` to `index.xml` and the writing room picks it up.

I've no idea what I write here. Or why. ¯\_(ツ)_/¯

The whole site is the honeycomb. There are no page templates: everything is
`index.html` plus the content it fetches. Retired in the July 2026 "everything
is hexagons" pass: `about/projects/writing/posts/tags/stats/culprit.html`, the
`posts/ stories/ tags/` trees, the `/games` hex cabinet (`games/index.html`,
`js/games.js`, `js/hexfield.js`, `games/shots/`) and `404.html`.

## Layout

```
index.html        THE HONEYCOMB: the whole site is one self-contained canvas
                  app - an infinitely recursive hex grid with the content
                  embedded in it (see section below)
js/content.js     the editorial content (SEED_CONTENT + shelves); culprit and
                  stats HTML live here as inline `html:` fields
_redirects        Cloudflare Pages catch-all: every non-asset path → the comb,
                  which routes it by slug (see the slug router below)
css/style.css     kept only for the museum's 2021-ssssg exhibit + choosetwo/
index.xml         RSS: also the source of the writing room's post bodies
stories.json      short fiction (html embedded per story)
choosetwo/        self-hosted static copy of choosetwo.org (domain lapsed)
games/<name>/     games at /games/<name>/: sokoban WASM builds + the
                  ../games strategy set (imported via `make sync`)
games/games.json  drives the comb's games room
Makefile          `make sync` imports web content from sibling repos
museum/           every dead version of this site since 2014, raw HTML,
                  full-page exhibits (not inline)
sitemap.txt robots.txt
```

## Clean URLs (the slug router)

`_redirects` (`/* /index.html 200`) hands every unmatched path to the comb;
real assets still win. Each content item with a `slug` registers `slug → cell`
in `SLUGS`, so `/culprit`, `/stats`, `/posts/<slug>` fly to their hex and open
inline. `PAGE_ALIASES` maps the retired page URLs (`/about`, `/writing`,
`/games`…) to a room. To confirm this locally you need a server that mimics the
catch-all (plain `python -m http.server` won't); otherwise it only takes effect
on Cloudflare Pages.

## The honeycomb homepage (index.html)

The homepage is a single self-contained file: an infinite recursive
honeycomb (zoom in forever, zoom out forever) with the site's content
living at fixed cell addresses. No dependencies, no build.

**How content works.** All editorial content (the `SEED_CONTENT`
registry plus the FILMS / BOOKS / PLAYED / etc arrays) lives in
`js/content.js`, a plain script loaded just before the comb script -
edit content there, machinery in `index.html`. Keys are cell paths
from the origin comb:
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

**Data sources.** At load it fetches `/games/games.json` (games room),
`/index.xml` (writing room; every RSS item becomes a plaque, with a
glyph picked from its title by `POST_GLYPHS`) and `/intuition.json`
(intuition room; regenerate with `make sync-intuition`).
`fillSection(baseKey, items, …)` lays a list out in a comb and spills
overflow into a recursive "more" room at the comb's centre - that is
how 64 posts paginate through the fractal.

**Navigation contract.** Every room is a hash URL (`/#-1,-1/-1,1` is
the shed). Dives push history entries, so the browser back button is
undo-dive; the in-comb reader pushes one entry, so back folds it away
first. Esc rises a level (or closes the reader). The ⬡ crumb flies
home from any depth.

**Useful cells to know.** `'0,0'` = the about room (inside it:
`'0,0|1,1'` the day jobs, `'0,0|2,0'` code (github + real projects),
`'0,0|-1,2'` unpopular opinions (all 18 slots full, so the overflow
sits in a "more opinions" sub-room at its centre cell; the retired
armchair sits commented out beside it in `js/content.js`), `'0,0|1,-1'` interests →
films / books / listening / games-i-play - the deepest curated
branch); `'1,0'` games (only `DECENT_SLUGS` games sit in the room; the rest sink
into a "rough games" sub-room at its centre cell, and the `WORST_SLUGS`
sink again into "unfinished concepts" at *that* room's centre);
`'-1,1'` the tech blog; `'0,1'` intuition (every post from the
sibling repo, via `/intuition.json`); `'-1,-1'` the workshop (inside
it: `'-1,-1|-1,1'` the shed, née homelab). Top-level plaques include
`'-1,0'` culprit, `'2,-2'` classiccult, `'2,0'` autograph, `'2,-1'`
recursive-levels, `'-2,1'` wallflower and `'0,-2'` the generated music (the
promoted games also appear in the games room - promotion here doesn't
remove them from it; `'0,-1'`, `'-2,0'` and `'-2,2'` stay procedural
because easter eggs hang off them). The FILMS / BOOKS / PLAYED arrays after `SEED_CONTENT` fill
their rooms via `fillSection` (called from `index.html`). Easter-egg cells hide in the procedural wilds (end of
`SEED_CONTENT`); their ancestor paths are hash-verified deep (every
ancestor is a section or hashes below the `isDeep` threshold), so don't
rename or move them casually - adding content onto an egg's ancestor
path orphans it. Tunables (`ZF`, `DIVE_FRAC`,
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

Cache-busting: none needed, and nothing in this repo does it. Pages serves every
asset `max-age=0, must-revalidate`, so an edit shows up on a plain reload - the
browser still caches, it just always revalidates and gets a 304. That only works
because the zone's **Browser Cache TTL** is set to *Respect Existing Headers*
(Caching → Configuration). On Cloudflare's 4-hour default it rewrote `.js`/`.css`
*after* the origin responded, so a `js/content.js` edit stayed invisible for four
hours - and neither a `_headers` file nor a Pages Function could override it
(Pages honours custom headers from `_headers` but ignores its `Cache-Control`;
either way the rewrite happened downstream). If stale JS ever returns, check that
setting first, and compare `wclarke-net.pages.dev` against `wclarke.net` to
confirm the origin is innocent.

WASM on a static host is fine: the games are single-threaded (no COOP/COEP
headers needed) and `.wasm` serves as `application/wasm`.

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
  (built from the `intuition` repo) at **https://intuition-2i1.pages.dev**
  (the `intuition.wclarke.net` custom domain was never wired up in
  Cloudflare). Its post list *is* imported: `make sync-intuition` runs
  `tools/sync-intuition.mjs`, which rebuilds `/intuition.json` from the
  source repo's `src/pages/index.astro`.

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
- [Stats](/stats) - twelve and a half years of commits across 68 repos (an
  inline hex now, not a page).

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
