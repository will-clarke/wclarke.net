// Simulation: nodes, pipes, particles, back-pressure, paint economy.
// No DOM/canvas here. Every node is {inputs, outputs, rate} shaped:
// spring (source) = outputs only, the Vat (kind 'hub') = inputs only (banks
// everything), mixer (converter) = both. See SPEC §5.

const _zeroPaints = () => Object.fromEntries(Object.keys(PAINTS).map(k => [k, 0]));

const TRACK_BY_ID = Object.fromEntries(TRACKS.map(t => [t.id, t]));
const TOTAL_LEVELS = TRACKS.reduce((a, t) => a + t.max, 0);

const Sim = {
  nodes: [], pipes: [], nodeById: {},
  time: 0,
  bank: _zeroPaints(),       // spendable
  lifetime: _zeroPaints(),   // total ever banked, never decreases
  pipeStock: CONFIG.pipeStockStart,
  up: {},                    // trackId -> owned level
  pinned: null,              // trackId chosen as the current goal
  intakeEMA: 0, peakIntake: 0,
  ended: false,              // magnum opus bought
  _pipeSeq: 0, _intakeAcc: 0,
};

// --- upgrade tracks ----------------------------------------------------------

function trackLevel(id) { return Sim.up[id] || 0; }
function trackMaxed(t) { return trackLevel(t.id) >= t.max; }
function trackVisible(t) { return (t.requires || []).every(r => trackLevel(r) >= 1); }
function ownedLevels() { return Object.values(Sim.up).reduce((a, b) => a + b, 0); }

// cost of the NEXT level of a track
function trackCost(t) {
  const level = trackLevel(t.id);
  let tier = t.tiers[0];
  for (const ti of t.tiers) if (ti.at <= level) tier = ti;
  const g = tier.growth || 1;
  const out = {};
  for (const el in tier.cost) out[el] = Math.round(tier.cost[el] * Math.pow(g, level - tier.at));
  return out;
}

function buyTrack(t) {
  if (trackMaxed(t) || !payCost(trackCost(t))) return false;
  Sim.up[t.id] = trackLevel(t.id) + 1;
  if (t.grantPipes) Sim.pipeStock += t.grantPipes;
  if (t.id === 'opus') Sim.ended = true;
  if (Sim.pinned === t.id) Sim.pinned = null; // goal achieved
  return true;
}

// pinned goal helpers (the self-directed mini-level)
function pinnedTrack() { return Sim.pinned ? TRACK_BY_ID[Sim.pinned] : null; }
function pinnedCost() {
  const t = pinnedTrack();
  return t && !trackMaxed(t) ? trackCost(t) : null;
}

// --- derived rates -----------------------------------------------------------

function flowSpeed() { return CONFIG.baseFlowSpeed * Math.pow(CONFIG.flowMult, trackLevel('flow')); }
function sourceRate(el) { return CONFIG.baseSourceRate * Math.pow(CONFIG.rateMult, trackLevel('rate-' + el)); }
function converterRate(recipe) { return recipe.baseRate * Math.pow(CONFIG.mixMult, trackLevel('mixspeed')); }
function maxLanes() { return CONFIG.baseMaxLanes + trackLevel('lanecap'); }
function recipeAt(r) {
  return r.ratios[Math.min(trackLevel('ratio-' + r.id), r.ratios.length - 1)];
}
function recipeInputs(r) { return recipeAt(r).in; }
function recipeOut(r) { return recipeAt(r).out; }
function outBufCapOf(r) { return Math.max(CONFIG.outBufCap, recipeOut(r) * 2); }
function unlockedRecipes() { return Object.values(RECIPES).filter(r => trackLevel(r.unlock) >= 1); }

// --- resource costs ----------------------------------------------------------

function scaleCost(cost, growth, level) {
  const out = {};
  for (const el in cost) out[el] = Math.round(cost[el] * Math.pow(growth, level));
  return out;
}
function laneCost(pipe) { return scaleCost(CONFIG.laneCost, CONFIG.laneCostGrowth, pipe.lanes - 1); }
function canAfford(cost) { return Object.entries(cost).every(([el, n]) => Sim.bank[el] >= n); }
function payCost(cost) {
  if (!canAfford(cost)) return false;
  for (const el in cost) Sim.bank[el] -= cost[el];
  return true;
}

// --- nodes -------------------------------------------------------------------

function spawnNode(def) {
  const n = {
    id: def.id, kind: def.kind, element: def.element, fx: def.fx, fy: def.fy,
    x: 0, y: 0, acc: 0, rr: 0, spawnT: 0, blocked: false, emitPulse: 0,
  };
  if (n.kind === 'hub') n.blips = [];
  Sim.nodes.push(n);
  Sim.nodeById[n.id] = n;
  return n;
}

function placeConverter(node, recipeId) {
  const r = RECIPES[recipeId];
  node.kind = 'converter'; node.recipe = recipeId;
  node.buffers = {}; for (const el in r.ratios[0].in) node.buffers[el] = 0;
  node.outBuf = 0; node.prog = 0; node.firePulse = 0; node.rr = 0;
}

// swap recipe in place: keep pipes that still make sense, refund the rest
function swapConverter(node, recipeId) {
  const r = RECIPES[recipeId];
  for (const p of Sim.pipes.slice()) {
    if (p.from === node.id) removePipe(p); // output colour changes
    else if (p.to === node.id && !r.ratios[0].in[p.element]) removePipe(p);
  }
  placeConverter(node, recipeId);
}

function removeConverter(node) {
  for (const p of Sim.pipes.slice()) {
    if (p.from === node.id || p.to === node.id) removePipe(p);
  }
  node.kind = 'slot';
  delete node.recipe; delete node.buffers; delete node.outBuf; delete node.prog;
}

function nodeOutputElement(node) {
  if (node.kind === 'source') return node.element;
  if (node.kind === 'converter') return RECIPES[node.recipe].out;
  return null;
}

// structural: does this node type ever take this element?
function structuralAccepts(node, el) {
  if (node.kind === 'hub') return true;
  if (node.kind === 'converter') return !!recipeInputs(RECIPES[node.recipe])[el];
  return false;
}

// runtime: is there space right now? (the hub always swallows - decision 20)
function nodeAccepts(node, el) {
  if (node.kind === 'hub') return true;
  if (node.kind === 'converter') {
    const ratio = recipeInputs(RECIPES[node.recipe])[el];
    return !!ratio && node.buffers[el] < ratio * CONFIG.stubCapMult;
  }
  return false;
}

function deliverTo(node, el) {
  if (node.kind === 'hub') {
    Sim.bank[el]++; Sim.lifetime[el]++; Sim._intakeAcc++;
    node.blips.push({ t: 0, color: PAINTS[el].color });
    if (node.blips.length > 6) node.blips.shift();
  } else if (node.kind === 'converter') {
    node.buffers[el]++;
  }
}

// --- pipes -------------------------------------------------------------------

// 45° metro path: diagonal segment first, then axis-aligned remainder.
function makePath(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, adx = Math.abs(dx), ady = Math.abs(dy);
  const pts = [{ x: a.x, y: a.y }];
  if (adx > 0.5 && ady > 0.5 && Math.abs(adx - ady) > 0.5) {
    if (adx > ady) pts.push({ x: a.x + Math.sign(dx) * ady, y: b.y });
    else pts.push({ x: b.x, y: a.y + Math.sign(dy) * adx });
  }
  pts.push({ x: b.x, y: b.y });
  const segs = []; let cum = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const sx = pts[i].x, sy = pts[i].y, ex = pts[i + 1].x, ey = pts[i + 1].y;
    const len = Math.hypot(ex - sx, ey - sy);
    if (len < 0.01) continue;
    segs.push({ ax: sx, ay: sy, ux: (ex - sx) / len, uy: (ey - sy) / len, len, cum });
    cum += len;
  }
  return { pts, segs, length: cum };
}

function pipePointAt(pipe, d) {
  const segs = pipe.segs;
  let s = segs[segs.length - 1];
  for (const seg of segs) { if (d <= seg.cum + seg.len) { s = seg; break; } }
  const t = Math.max(0, d - s.cum);
  return { x: s.ax + s.ux * t, y: s.ay + s.uy * t, ux: s.ux, uy: s.uy };
}

function canConnect(from, to) {
  if (!from || !to || from === to) return false;
  const el = nodeOutputElement(from);
  if (!el || !structuralAccepts(to, el)) return false;
  return !Sim.pipes.some(p => p.from === from.id && p.to === to.id);
}

function addPipe(from, to, opts) {
  const free = opts && opts.free;
  if (!free && Sim.pipeStock < 1) return null;
  if (!free) Sim.pipeStock--;
  const pipe = {
    id: 'p' + (++Sim._pipeSeq), from: from.id, to: to.id,
    element: nodeOutputElement(from), lanes: 1, laneP: [[]], rr: 0,
    segs: [], length: 0,
    delivered: 0, rateEMA: 0, bornT: Sim.time,
  };
  Sim.pipes.push(pipe);
  reflowPipes();
  return pipe;
}

function removePipe(pipe) {
  const i = Sim.pipes.indexOf(pipe);
  if (i >= 0) { Sim.pipes.splice(i, 1); Sim.pipeStock++; reflowPipes(); }
}

function addLane(pipe) { pipe.lanes++; pipe.laneP.push([]); }

function outPipesOf(node) { return Sim.pipes.filter(p => p.from === node.id); }

// try to push one unit out of a node into any outgoing pipe (round-robin)
function tryEmit(node) {
  const pipes = outPipesOf(node);
  if (!pipes.length) return false;
  for (let i = 0; i < pipes.length; i++) {
    const p = pipes[(node.rr + i) % pipes.length];
    if (pipeAccept(p)) { node.rr = (node.rr + i + 1) % pipes.length; return true; }
  }
  return false;
}

// entry has space in some lane (round-robin across lanes)
function pipeAccept(pipe) {
  for (let i = 0; i < pipe.lanes; i++) {
    const li = (pipe.rr + i) % pipe.lanes;
    const lane = pipe.laneP[li];
    const last = lane[lane.length - 1];
    if (!last || last.pos >= CONFIG.spacing) {
      lane.push({ pos: 0, stuck: false });
      pipe.rr = (li + 1) % pipe.lanes;
      return true;
    }
  }
  return false;
}

// Recompute pipe geometry: endpoints spread across per-node ports so converging
// streams never visually merge (decision 19), then 45° paths rebuilt. Particle
// positions are preserved proportionally.
function reflowPipes() {
  // gather endpoints per node
  const at = {}; // nodeId -> [{pipe, end, angle}]
  for (const pipe of Sim.pipes) {
    const a = Sim.nodeById[pipe.from], b = Sim.nodeById[pipe.to];
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    (at[a.id] = at[a.id] || []).push({ pipe, end: 'a', angle: ang });
    (at[b.id] = at[b.id] || []).push({ pipe, end: 'b', angle: ang + Math.PI });
  }
  for (const id in at) {
    const list = at[id].sort((p, q) => p.angle - q.angle);
    list.forEach((e, k) => {
      const off = (k - (list.length - 1) / 2) * CONFIG.portSpread;
      if (e.end === 'a') e.pipe._aOff = off; else e.pipe._bOff = off;
    });
  }
  for (const pipe of Sim.pipes) {
    const a = Sim.nodeById[pipe.from], b = Sim.nodeById[pipe.to];
    const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const ux = (b.x - a.x) / d, uy = (b.y - a.y) / d; // perp = (-uy, ux)
    const aOff = pipe._aOff || 0, bOff = pipe._bOff || 0;
    const old = pipe.length;
    const path = makePath(
      { x: a.x - uy * aOff, y: a.y + ux * aOff },
      { x: b.x - uy * bOff, y: b.y + ux * bOff });
    pipe.segs = path.segs; pipe.length = path.length;
    if (old > 0.01) {
      const k = pipe.length / old;
      for (const lane of pipe.laneP) for (const p of lane) p.pos *= k;
    }
  }
}

// --- pinned goal auto-buy ------------------------------------------------------

// once the bank covers the pinned upgrade, it buys itself (the payoff moment);
// returns the just-bought track for UI celebration, else null
function autoBuyPinned() {
  const t = pinnedTrack();
  if (!t) return null;
  if (trackMaxed(t)) { Sim.pinned = null; return null; }
  if (!canAfford(trackCost(t))) return null;
  buyTrack(t);
  return t;
}

// --- tick --------------------------------------------------------------------

function simStep(dt) {
  Sim.time += dt;
  const v = flowSpeed();

  // 1. move particles (front to back, spacing-clamped) and deliver at pipe ends
  for (const pipe of Sim.pipes) {
    const to = Sim.nodeById[pipe.to];
    for (const lane of pipe.laneP) {
      for (let i = 0; i < lane.length; i++) {
        const p = lane[i];
        const cap = i === 0 ? pipe.length : lane[i - 1].pos - CONFIG.spacing;
        const want = p.pos + v * dt;
        const np = Math.min(want, cap);
        p.stuck = want - np > v * dt * 0.5;
        p.pos = Math.max(p.pos, np);
      }
      if (lane.length && lane[0].pos >= pipe.length - 0.5 && nodeAccepts(to, pipe.element)) {
        deliverTo(to, pipe.element);
        lane.shift();
        pipe.delivered++;
      }
    }
    const inst = pipe.delivered / dt; pipe.delivered = 0;
    pipe.rateEMA += (inst - pipe.rateEMA) * Math.min(1, dt / 2);
  }

  // 2. nodes produce / react
  for (const n of Sim.nodes) {
    if (n.spawnT < 1) n.spawnT = Math.min(1, n.spawnT + dt * 2.5);
    if (n.emitPulse > 0) n.emitPulse = Math.max(0, n.emitPulse - dt * 2.5);

    if (n.kind === 'source') {
      n.acc = Math.min(n.acc + sourceRate(n.element) * dt, 2);
      while (n.acc >= 1 && tryEmit(n)) { n.acc -= 1; n.emitPulse = 1; }
      n.blocked = n.acc >= 1;

    } else if (n.kind === 'converter') {
      const r = RECIPES[n.recipe];
      const inputs = recipeInputs(r);
      const outN = recipeOut(r);
      const ready = () => n.outBuf < outBufCapOf(r) &&
        Object.entries(inputs).every(([el, q]) => n.buffers[el] >= q);
      if (ready()) {
        n.prog += converterRate(r) * dt;
        while (n.prog >= 1 && ready()) {
          for (const [el, q] of Object.entries(inputs)) n.buffers[el] -= q;
          n.outBuf += outN; n.prog -= 1; n.firePulse = 1;
        }
        if (n.prog >= 1) n.prog = 1;
      }
      while (n.outBuf >= 1 && tryEmit(n)) n.outBuf -= 1;
      if (n.firePulse > 0) n.firePulse = Math.max(0, n.firePulse - dt * 3);

    } else if (n.kind === 'hub') {
      for (const b of n.blips) b.t += dt;
      n.blips = n.blips.filter(b => b.t < 0.8);
    }
  }

  // 3. intake EMA + peak (total paint/s reaching the vat)
  const inst = Sim._intakeAcc / dt; Sim._intakeAcc = 0;
  Sim.intakeEMA += (inst - Sim.intakeEMA) * Math.min(1, dt / 1.5);
  if (Sim.intakeEMA > Sim.peakIntake) Sim.peakIntake = Sim.intakeEMA;
}

// --- misc --------------------------------------------------------------------

function fmt(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + 'k';
  if (n >= 100) return Math.round(n).toString();
  if (n >= 10) return n.toFixed(1).replace(/\.0$/, '');
  return n.toFixed(1).replace(/\.0$/, '');
}
