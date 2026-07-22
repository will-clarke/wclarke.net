# Agent notes for wclarke.net

Hand-written static site, no build step. Cloudflare Pages serves the repo
root verbatim; every push to `master` deploys. This repo is exempt from
branch-first rules: commit and push straight to `master`.

## The homepage is the honeycomb

`index.html` is a canvas app: an infinitely recursive honeycomb with
the site's content embedded at fixed cell addresses. The editorial
content (`SEED_CONTENT`, FILMS, BOOKS, PLAYED, …) lives in
`js/content.js`; the machinery stays in `index.html`. **Read the "The
honeycomb homepage" section of README.md before touching it** - it
documents the `CONTENT` registry (sections, plaques, prose notes), the
`inline` reader, `fillSection` overflow pagination, and the
hash/history contract.

Quick reference for adding content (in `SEED_CONTENT`, `js/content.js`):

```js
'0,-1|2,0':     { section: true, glyph: '🎬', title: 'films' },   // a room
'0,-1|2,0|0,1': { glyph: '🎞', title: 'thing', act: 'visit',
                  href: '/x.html', inline: true, blurb: '…' },    // a link plaque
'0,-1|2,0|1,0': { note: 'prose rendered in the cell.', glyph: '🍿' }, // a note
```

Keys are cell paths from the origin comb (`q,r` axial coords joined by
`|`). Existing rooms: `0,0` about me (contains `0,0|2,0` code and
`0,0|1,-1` interests), `1,0` games (auto-filled from
`/games/games.json`), `-1,1` writing (auto-filled from `/index.xml`),
`0,1` intuition (auto-filled from `/intuition.json`; regenerate with
`make sync-intuition`), `-1,-1` the workshop (contains `-1,-1|-1,1`
the shed), `-1,2` philosophical musings. Easter-egg cells hide at the
end of `SEED_CONTENT` - their paths are hash-verified deep (every
ancestor is a section or hashes below the `isDeep` threshold), so
don't move them casually.
`inline: true` on same-site hrefs opens the page in the in-comb reader
instead of navigating.

## Working on it

- Serve locally with `make serve` (content fetches need http).
- Verify changes in a real browser (Playwright MCP works well): dive,
  Esc, browser back/forward, the reader, and a phone-sized viewport.
- Watch float precision: any camera math that walks many levels must
  cancel shared lineage symbolically (see `goHome`) - a double cannot
  hold a 20-level position.
- `make sync` imports games from `../games`; the sokoban WASM dirs are
  protected from its `--delete`. Never edit `games/<slug>/` by hand for
  synced games - fix the source repo.

## Other pages

Posts are pandoc HTML in `posts/` (add to `posts.html` + `index.xml`;
the honeycomb's writing room reads `index.xml`). The museum, stats,
stories, tags are plain HTML - just edit them.
