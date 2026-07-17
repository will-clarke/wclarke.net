// Regenerate /intuition.json from ../intuition's hand-maintained post
// index (src/pages/index.astro). Run from the repo root: `make sync-intuition`.
// The honeycomb's intuition room (cell 0,1) fetches the JSON at load.
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = '../intuition/src/pages/index.astro';
const OUT = 'intuition.json';
const BASE = 'https://intuition-2i1.pages.dev';

const GLYPHS = {
  'paper-fold': '🌕', bayes: '🩺', 'monty-hall': '🚪', fourier: '🌀',
  'soccer-ball': '⚽', 'tetra-octa': '🔻', 'platonic-five': '🎲',
  truncate: '🔪', hilbert: '🧶', dragon: '🐉', dandelin: '🍦', duals: '🔄',
  eratosthenes: '🌍', medians: '⚖', brachistochrone: '🛝', catenary: '⛓',
  gears: '⚙', doppler: '🚑', bezier: '✏', lissajous: '〰',
  'pendulum-wave': '🕰', reuleaux: '🪙', viviani: '📏', 'koch-snowflake': '❄',
  'chaos-game': '🎰', galton: '🫘', 'stella-octangula': '✴',
  'five-cubes': '🖐', 'golden-icosa': '💛', cardioid: '❤', morley: '🔱',
  napoleon: '🎩', 'triangle-angles': '📐', 'inscribed-angle': '∠',
  'pythagoras-leonardo': '🎨', 'pythagoras-perigal': '🧩',
  'pythagoras-similar': '🪞', 'pythagoras-windmill': '🌬',
  'pythagoras-garfield': '🐱', pascal: '🔺', fibonacci: '🐚',
  'missing-square': '🕳', 'golden-cut': '✂', pentagrams: '⭐',
  negatives: '➖', automaton: '🤖', tree: '🌳', tile: '⬠', sieve: '🧮',
  'sin-cos': '🌊', 'circle-area': '⭕', 'paper-sizes': '📄',
  'monte-carlo': '🎯', 'continued-fractions': '🪜', phyllotaxis: '🌻',
  cubed: '🧊', bases: '🔢', golden: '✨', stretch: '↔', pi: '🥧',
  'odd-squares': '🔳', pythagoras: 'a²',
};

const src = readFileSync(SRC, 'utf8');
const m = src.match(/const posts = (\[[\s\S]*?\n\]);/);
if (!m) throw new Error('could not find `const posts = [...]` in ' + SRC);
const posts = new Function('return ' + m[1])();

const missing = posts.filter(p => !GLYPHS[p.slug]).map(p => p.slug);
if (missing.length) console.warn('no glyph for (using 📐):', missing.join(', '));

const out = {
  base: BASE,
  posts: posts.map(p => ({
    slug: p.slug, title: p.title, blurb: p.blurb, date: p.date,
    glyph: GLYPHS[p.slug] || '📐',
  })),
};
writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
console.log(`wrote ${OUT}: ${out.posts.length} posts`);
