// Simulation: nodes, pipes, particles, back-pressure. No DOM/canvas here.
// Every node is {inputs, outputs, rate} shaped: source = outputs only,
// sink = inputs only, converter = both. See SPEC §5.

const Sim = {
  nodes: [], pipes: [], nodeById: {},
  time: 0, currency: 0, totalEarned: 0,
  incomeEMA: 0, peakIncome: 0,
  upgrades: { flow: 0, source: 0, converter: 0 },
  ended: false,
  _pipeSeq: 0, _earnAcc: 0,
};

// --- derived rates -----------------------------------------------------------

function flowSpeed() { return CONFIG.baseFlowSpeed * Math.pow(CONFIG.upgrades.flow.mult, Sim.upgrades.flow); }
function sourceRate() { return CONFIG.baseSourceRate * Math.pow(CONFIG.upgrades.source.mult, Sim.upgrades.source); }
function converterRate(recipe) { return recipe.baseRate * Math.pow(CONFIG.upgrades.converter.mult, Sim.upgrades.converter); }
function upgradeCost(key) { const u = CONFIG.upgrades[key]; return Math.round(u.base * Math.pow(u.growth, Sim.upgrades[key])); }
function laneCost(pipe) { return Math.round(CONFIG.laneCostBase * Math.pow(CONFIG.laneCostGrowth, pipe.lanes - 1)); }

// --- nodes -------------------------------------------------------------------

function spawnNode(def) {
  const n = {
    id: def.id, kind: def.kind, element: def.element, fx: def.fx, fy: def.fy,
    x: 0, y: 0, acc: 0, rr: 0, spawnT: 0, blocked: false,
  };
  if (n.kind === 'sink') {
    n.buf = 0; n.level = 0; n.consumed = 0; n.consumedTotal = 0;
    n.demand = CONFIG.sink.baseDemand; n.valueMult = 1;
    n.levelNeed = CONFIG.sink.levelBase; n.starve = 0; n.levelPulse = 0;
  }
  Sim.nodes.push(n);
  Sim.nodeById[n.id] = n;
  return n;
}

function placeConverter(node, recipeId) {
  const r = RECIPES[recipeId];
  node.kind = 'converter'; node.recipe = recipeId;
  node.buffers = {}; for (const el in r.inputs) node.buffers[el] = 0;
  node.outBuf = 0; node.prog = 0; node.firePulse = 0; node.rr = 0;
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
  if (node.kind === 'sink') return node.element === el;
  if (node.kind === 'converter') return !!RECIPES[node.recipe].inputs[el];
  return false;
}

// runtime: is there buffer space right now?
function nodeAccepts(node, el) {
  if (node.kind === 'sink') return node.element === el && node.buf < CONFIG.sinkBufCap;
  if (node.kind === 'converter') {
    const ratio = RECIPES[node.recipe].inputs[el];
    return !!ratio && node.buffers[el] < ratio * CONFIG.stubCapMult;
  }
  return false;
}

function deliverTo(node, el) {
  if (node.kind === 'sink') node.buf++;
  else if (node.kind === 'converter') node.buffers[el]++;
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

function addPipe(from, to) {
  const path = makePath(from, to);
  const pipe = {
    id: 'p' + (++Sim._pipeSeq), from: from.id, to: to.id,
    element: nodeOutputElement(from), lanes: 1, laneP: [[]], rr: 0,
    segs: path.segs, length: path.length,
    delivered: 0, rateEMA: 0, jamF: 0, bornT: Sim.time,
  };
  Sim.pipes.push(pipe);
  return pipe;
}

function removePipe(pipe) {
  const i = Sim.pipes.indexOf(pipe);
  if (i >= 0) Sim.pipes.splice(i, 1);
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

// recompute pipe geometry after layout change, preserving relative particle positions
function reflowPipes() {
  for (const pipe of Sim.pipes) {
    const from = Sim.nodeById[pipe.from], to = Sim.nodeById[pipe.to];
    const old = pipe.length;
    const path = makePath(from, to);
    pipe.segs = path.segs; pipe.length = path.length;
    if (old > 0.01) {
      const k = pipe.length / old;
      for (const lane of pipe.laneP) for (const p of lane) p.pos *= k;
    }
  }
}

// --- economy -----------------------------------------------------------------

function earn(v) {
  Sim.currency += v;
  Sim.totalEarned += v;
  Sim._earnAcc += v;
}

function spend(v) {
  if (Sim.currency < v) return false;
  Sim.currency -= v;
  return true;
}

// --- tick --------------------------------------------------------------------

function simStep(dt) {
  Sim.time += dt;
  const v = flowSpeed();

  // 1. move particles (front to back, spacing-clamped) and deliver at pipe ends
  for (const pipe of Sim.pipes) {
    const to = Sim.nodeById[pipe.to];
    let stuck = 0, total = 0;
    for (const lane of pipe.laneP) {
      for (let i = 0; i < lane.length; i++) {
        const p = lane[i];
        const cap = i === 0 ? pipe.length : lane[i - 1].pos - CONFIG.spacing;
        const want = p.pos + v * dt;
        const np = Math.min(want, cap);
        p.stuck = want - np > v * dt * 0.5;
        p.pos = Math.max(p.pos, np);
        total++; if (p.stuck) stuck++;
      }
      if (lane.length && lane[0].pos >= pipe.length - 0.5 && nodeAccepts(to, pipe.element)) {
        deliverTo(to, pipe.element);
        lane.shift();
        pipe.delivered++;
      }
    }
    pipe.jamF = total ? stuck / total : 0;
    const inst = pipe.delivered / dt; pipe.delivered = 0;
    pipe.rateEMA += (inst - pipe.rateEMA) * Math.min(1, dt / 2);
  }

  // 2. nodes produce / react / consume
  for (const n of Sim.nodes) {
    if (n.spawnT < 1) n.spawnT = Math.min(1, n.spawnT + dt * 2.5);

    if (n.kind === 'source') {
      n.acc = Math.min(n.acc + sourceRate() * dt, 2);
      while (n.acc >= 1 && tryEmit(n)) n.acc -= 1;
      n.blocked = n.acc >= 1;

    } else if (n.kind === 'converter') {
      const r = RECIPES[n.recipe];
      const ready = () => n.outBuf < CONFIG.outBufCap &&
        Object.entries(r.inputs).every(([el, q]) => n.buffers[el] >= q);
      if (ready()) {
        n.prog += converterRate(r) * dt;
        while (n.prog >= 1 && ready()) {
          for (const [el, q] of Object.entries(r.inputs)) n.buffers[el] -= q;
          n.outBuf++; n.prog -= 1; n.firePulse = 1;
        }
        if (n.prog >= 1) n.prog = 1;
      }
      while (n.outBuf >= 1 && tryEmit(n)) n.outBuf -= 1;
      if (n.firePulse > 0) n.firePulse = Math.max(0, n.firePulse - dt * 3);

    } else if (n.kind === 'sink') {
      n.acc = Math.min(n.acc + n.demand * dt, 1.5);
      while (n.acc >= 1 && n.buf >= 1) {
        n.acc -= 1; n.buf -= 1; n.consumed++; n.consumedTotal++;
        earn(ELEMENTS[n.element].value * n.valueMult);
        if (n.consumed >= n.levelNeed) {
          n.consumed = 0; n.level++;
          n.demand *= CONFIG.sink.demandGrowth;
          n.valueMult *= CONFIG.sink.valueGrowth;
          n.levelNeed = Math.round(CONFIG.sink.levelBase * Math.pow(CONFIG.sink.levelGrowth, n.level));
          n.levelPulse = 1;
        }
      }
      n.starve = n.buf === 0
        ? Math.min(1, n.starve + dt / 1.5)
        : Math.max(0, n.starve - dt * 2);
      if (n.levelPulse > 0) n.levelPulse = Math.max(0, n.levelPulse - dt * 1.5);
    }
  }

  // 3. income EMA + peak
  const inst = Sim._earnAcc / dt; Sim._earnAcc = 0;
  Sim.incomeEMA += (inst - Sim.incomeEMA) * Math.min(1, dt / 1.5);
  if (Sim.incomeEMA > Sim.peakIncome) Sim.peakIncome = Sim.incomeEMA;
}

// --- misc --------------------------------------------------------------------

function fmt(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + 'k';
  if (n >= 100) return Math.round(n).toString();
  if (n >= 10) return n.toFixed(1).replace(/\.0$/, '');
  return n.toFixed(1).replace(/\.0$/, '');
}
