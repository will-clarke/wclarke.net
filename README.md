# My blog

A hand-written static site. Everything lives in [`static/`](static/) as plain
HTML/CSS - no build step, no generator, no dependencies. To change something,
edit the file; to add a post, drop an `.html` file in `static/posts/` and add a
link to `static/posts.html` (and `static/index.xml` if you care about RSS).

I've no idea what I write here. Or why. ¯\_(ツ)_/¯

## Deploy

`static/` is served verbatim by **Cloudflare Pages** (Framework preset: None,
Build command: empty, Build output directory: `static`). Every push to `master`
redeploys automatically.

## Also here

- [The museum](static/museum/) - every dead version of this site since 2014,
  restored and served as raw HTML.
- [Stats](static/stats.html) - twelve and a half years of commits, counted by
  `scripts/stats-collect.py` (the one remaining script; run it by hand to
  refresh the numbers).

## Next ideas

- **Museum "deleted scenes" wing** - resurrect content that only exists in git
  history: the 16 deleted short stories (`73e8ff5^:src/stories/` in this repo's
  history, plot outlines still in HTML comments), the `/funky/` easter-egg pages
  ("Yoloolo") and the `¯\_(ツ)_/¯` 404 page (`6836c89^`).
- **CV exhibit** - one page tracing the CV's decade: pure Ruby → org-mode →
  pandoc PDF → JSON Resume → "Use Google Docs instead of anything fancy", with
  the deleted PDFs from the cv repo's history. Redact the phone number in the
  old `cv.rb` first.
- **Commit-message hall of fame** - a ranked list ("commit images - no idea if
  this is a good idea ¯\_(ツ)_/¯", "Add node_modules 😱", "tweak skills - am I
  bad at ANYTHING??").
- **t8r8r's deleted potato photos** if the potato ELO ever gets a write-up.
- Plus the standing ports: chip8 → WASM, hex-game → WASM, crossword/wordsearch
  in the browser, shortstories survivors as static HTML, asteroids Elm revival.
