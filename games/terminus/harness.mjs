#!/usr/bin/env node
/* terminus v2 authoring harness - node, no deps.
   Extracts the KERNEL and LEVELS blocks out of index.html (single source of
   truth), then checks every level.

   usage:
     node harness.mjs check            all levels: sol wins, budget honest, alt search
     node harness.mjs show <id>        ASCII board + intended paint
     node harness.mjs sim <id>         run the intended sol, print events
     node harness.mjs solve <id>       legs-DFS alt-solution search, metrics
*/
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const html = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'index.html'), 'utf8');
const block = (name) => {
  const m = html.match(new RegExp(`/\\* ===== ${name}[^]*?\\*/([^]*?)/\\* ===== END ${name}`, ''));
  if (!m) throw new Error(`no ${name} block in index.html`);
  return m[1];
};
const TK = new Function(block('KERNEL') + '; return TK;')();
const LEVELS = new Function(block('LEVELS') + '; return LEVELS;')();

const [, , cmd = 'check', ...args] = process.argv;
const byId = Object.fromEntries(LEVELS.map(l => [l.id, l]));

// ---- ascii -------------------------------------------------------------------
const SEGCH = { NS: '│', EW: '─', NE: '└', ES: '┌', SW: '┐', NW: '┘' };
function show(def) {
  const lv = TK.parse(def);
  const track = TK.paintSol(lv);
  const grid = [];
  for (let y = 0; y < lv.H; y++) {
    grid[y] = [];
    for (let x = 0; x < lv.W; x++) {
      const t = lv.ter(x, y);
      let ch = t === '#' ? '█' : t === ' ' ? ' ' : '·';
      const segs = track[TK.key(x, y)] || [];
      if (segs.length === 2) ch = '┼';
      else if (segs.length === 1) ch = SEGCH[segs[0]] || '?';
      const th = lv.at(x, y);
      if (th) ch = { entry: 'E', exit: 'X', fork: 'F', join: 'J', ball: 'o', gate: 'G' }[th.k];
      grid[y][x] = ch;
    }
  }
  console.log(`${def.id} "${def.name}"  ${lv.W}x${lv.H}  budget=${def.budget} sol=${TK.cost(track)}`);
  console.log(grid.map(r => r.join('')).join('\n'));
  for (const th of lv.things) console.log(' ', JSON.stringify(th));
}

// ---- sim ---------------------------------------------------------------------
function sim(def, verbose) {
  const lv = TK.parse(def);
  const track = TK.paintSol(lv);
  const w = TK.initWorld(lv, track);
  while (w.status === 'running') {
    const ev = [];
    TK.step(lv, w, ev);
    if (verbose) for (const e of ev) if (e.t !== 'move')
      console.log(`t=${w.tick}`, JSON.stringify(e));
  }
  return { status: w.status, ticks: w.tick, cost: TK.cost(track) };
}

// ---- legs-DFS alt-solution search ---------------------------------------------
// sources: entries + fork outs + join out; sinks: exits + fork in + join ins.
// Enumerate source->sink bijections, then DFS a simple path per leg, overlap
// allowed only as identical segments or NS/EW crossings, total cost <= budget.
// Simulate every complete painting.
function solve(lv, opts = {}) {
  const budget = lv.budget;
  const sources = [], sinks = [];
  for (const th of lv.things) {
    if (th.k === 'entry') sources.push({ x: th.x, y: th.y, p: th.p });
    else if (th.k === 'exit') sinks.push({ x: th.x, y: th.y, p: th.p });
    else if (th.k === 'fork') {
      sinks.push({ x: th.x, y: th.y, p: th.in });
      for (const [p] of th.outs) sources.push({ x: th.x, y: th.y, p });
    } else if (th.k === 'join') {
      sources.push({ x: th.x, y: th.y, p: th.out });
      for (const p of th.ins) sinks.push({ x: th.x, y: th.y, p });
    }
  }
  const nodeCap = opts.nodeCap || 6e7;
  let nodes = 0, sims = 0, capped = false;
  const wins = [];
  let minWin = Infinity;

  // all bijections sources -> sinks (sizes equal in well-formed levels)
  const perms = [];
  (function permute(rest, acc) {
    if (!rest.length) { perms.push(acc.slice()); return; }
    for (let i = 0; i < rest.length; i++)
      permute(rest.slice(0, i).concat(rest.slice(i + 1)), acc.concat([rest[i]]));
  })(sinks.map((_, i) => i), []);

  const tryTrack = (track) => {
    sims++;
    const { status } = TK.run(lv, track);
    if (status === 'win') {
      const c = TK.cost(track);
      wins.push(c);
      if (c < minWin) { minWin = c; if (opts.keep) opts.keep(track); }
    }
  };

  // DFS one leg: from source cell stepping out of port p, to sink cell via its port.
  // track is mutated in place with undo.
  const legDFS = (track, sx, sy, sp, tx, ty, tp, visited, done) => {
    if (capped || nodes++ > nodeCap) { capped = true; return; }
    const nx = sx + TK.DX[sp], ny = sy + TK.DY[sp];
    if (nx === tx && ny === ty) {
      if (TK.OPP[sp] === tp) done();
      return;
    }
    if (!lv.canPaint(nx, ny)) return;
    const k = TK.key(nx, ny);
    if (visited.has(k)) return;
    const inP = TK.OPP[sp];
    for (const outP of ['N', 'E', 'S', 'W']) {
      if (outP === inP) continue;
      const sg = TK.seg(inP, outP);
      const cur = track[k] || [];
      let next = null;
      if (cur.includes(sg)) next = cur;                     // shared identical segment
      else if (cur.length === 0) next = [sg];
      else if (cur.length === 1 &&
               ((cur[0] === 'NS' && sg === 'EW') || (cur[0] === 'EW' && sg === 'NS')))
        next = [cur[0], sg];
      else continue;
      const delta = next.length - cur.length;
      if (TK.cost(track) + delta > budget) continue;
      const prev = track[k];
      track[k] = next;
      visited.add(k);
      legDFS(track, nx, ny, outP, tx, ty, tp, visited, done);
      visited.delete(k);
      if (prev) track[k] = prev; else delete track[k];
    }
  };

  for (const perm of perms) {
    const track = {};
    const runLeg = (i) => {
      if (capped) return;
      if (i === sources.length) { tryTrack(track); return; }
      const s = sources[i], t = sinks[perm[i]];
      legDFS(track, s.x, s.y, s.p, t.x, t.y, t.p, new Set(), () => runLeg(i + 1));
    };
    runLeg(0);
  }
  return { wins: wins.length, minCost: wins.length ? minWin : null, sims, nodes, capped };
}

if (cmd === 'show') { show(byId[args[0]]); process.exit(0); }
if (cmd === 'sim') {
  const r = sim(byId[args[0]], true);
  console.log('->', r.status, `ticks=${r.ticks} cost=${r.cost}`);
  process.exit(0);
}
if (cmd === 'solve') {
  const def = byId[args[0]];
  const lv = args[1] ? TK.parse({ ...def, budget: Number(args[1]) }) : TK.parse(def);
  const t0 = Date.now();
  let best = null;
  const s = solve(lv, { keep: t => { best = TK.cloneTrack(t); } });
  console.log(`${def.id} wins=${s.wins} minCost=${s.minCost} budget=${lv.budget} ` +
              `sims=${s.sims} nodes=${s.nodes}${s.capped ? ' CAPPED' : ''} ${Date.now() - t0}ms`);
  if (best) {
    for (let y = 0; y < lv.H; y++) {
      let row = '';
      for (let x = 0; x < lv.W; x++) {
        const th = lv.at(x, y);
        const segs = best[TK.key(x, y)] || [];
        row += th ? { entry: 'E', exit: 'X', fork: 'F', join: 'J', ball: 'o', gate: 'G' }[th.k]
          : segs.length === 2 ? '┼' : segs.length === 1 ? (SEGCH[segs[0]] || '?')
          : lv.ter(x, y) === '#' ? '█' : '·';
      }
      console.log(row);
    }
    console.log(JSON.stringify(best));
  }
  process.exit(0);
}

// ---- check: the CI gate --------------------------------------------------------
let bad = 0;
const seen = new Set();
for (const def of LEVELS) {
  const label = `${def.id} ${def.name}`;
  if (seen.has(def.id)) { console.log(`FAIL ${label}: duplicate id`); bad++; continue; }
  seen.add(def.id);
  const lv = TK.parse(def);
  const errs = TK.validate(lv);
  if (errs.length) { console.log(`FAIL ${label}: ${errs.join('; ')}`); bad++; continue; }
  const problems = [];
  // intended solution
  if (!def.sol) problems.push('no sol');
  else {
    const track = TK.paintSol(lv);
    const c = TK.cost(track);
    const r = TK.run(lv, track);
    if (r.status !== 'win') problems.push(`sol -> ${r.status} @t${r.ticks}`);
    if (c > def.budget) problems.push(`sol cost ${c} > budget ${def.budget}`);
  }
  // empty paint must not win
  if (TK.run(lv, {}).status === 'win') problems.push('empty track wins');
  // alt search
  const s = solve(lv);
  if (!s.capped && !s.wins) problems.push('legs search found no solution');
  if (s.minCost != null && s.minCost < TK.cost(TK.paintSol(lv)) - 0)
    problems.push(`cheaper win exists: ${s.minCost} pieces (sol ${TK.cost(TK.paintSol(lv))})`);
  const slack = def.budget - (s.minCost != null ? s.minCost : TK.cost(TK.paintSol(lv)));
  if (problems.length) { console.log(`FAIL ${label}: ${problems.join('; ')}`); bad++; }
  else console.log(`ok   ${label}  sol=${TK.cost(TK.paintSol(lv))} budget=${def.budget} ` +
                   `minWin=${s.minCost ?? '?'} wins=${s.wins} slack=${slack}` +
                   `${s.capped ? ' (search capped)' : ''}`);
}
console.log(bad ? `\n${bad} failing` : `\nall ${LEVELS.length} levels pass`);
process.exit(bad ? 1 : 0);
