// Regenerate /sitemap.txt from the site's own data. Run from the repo root:
// `make sitemap`. Everything the comb can route to comes from three places:
// games/games.json (the games room), index.xml (the writing room, one URL per
// post), and the hand-written hrefs in js/content.js (culprit, stats, museum,
// choose two, the pinned sokoban set, polyhedra). Retired URLs handled by
// PAGE_ALIASES are deliberately left out - they are aliases, not pages.
import { readFileSync, writeFileSync } from 'node:fs';

const BASE = 'https://wclarke.net';
const OUT = 'sitemap.txt';

const decode = s => s.replace(/&(apos|quot|lt|gt|amp);/g,
  (_, e) => ({ apos: "'", quot: '"', lt: '<', gt: '>', amp: '&' }[e]));

const paths = new Set(['/']);

// games room: one entry per game, plus anything content.js links by hand
for (const g of JSON.parse(readFileSync('games/games.json', 'utf8')).games)
  paths.add(`/games/${g.slug}/`);

// content.js is a plain script of top-level consts, so node can just run it
const content = new Function(
  readFileSync('js/content.js', 'utf8') + '; return {SEED_CONTENT, PINNED_GAMES};')();
const walk = v => {
  if (Array.isArray(v)) return v.forEach(walk);
  if (v && typeof v === 'object') {
    // a trailing file extension means an asset (the evolution webm), not a page
    if (typeof v.href === 'string' && v.href.startsWith('/') && !/\.\w{2,4}$/.test(v.href))
      paths.add(v.href);
    Object.values(v).forEach(walk);
  }
};
walk(content.SEED_CONTENT);
walk(content.PINNED_GAMES);

// writing room: the RSS links still carry the old .html suffix; the comb's
// slug router serves them without it, so that is the canonical URL
for (const m of readFileSync('index.xml', 'utf8').matchAll(/<link>([^<]*)<\/link>/g)) {
  const p = decode(m[1]).replace(/^https?:\/\/[^/]+/, '').replace(/\.html$/, '');
  if (p.startsWith('/posts/')) paths.add(p);
}

const urls = [...paths].sort().map(p => BASE + p);
writeFileSync(OUT, urls.join('\n') + '\n');
console.log(`wrote ${OUT}: ${urls.length} urls`);
