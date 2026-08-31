// localStorage save/load. Particles and small buffers are not persisted.

function saveGame() {
  try {
    const data = {
      v: 1,
      time: Sim.time, currency: Sim.currency, totalEarned: Sim.totalEarned,
      peakIncome: Sim.peakIncome, ended: Sim.ended,
      upgrades: Sim.upgrades,
      hints: [...UI.shownHints],
      nodes: Sim.nodes.map(n => ({
        id: n.id, kind: n.kind, recipe: n.recipe,
        level: n.level, consumed: n.consumed, consumedTotal: n.consumedTotal,
        demand: n.demand, valueMult: n.valueMult, levelNeed: n.levelNeed,
      })),
      pipes: Sim.pipes.map(p => ({ from: p.from, to: p.to, lanes: p.lanes })),
    };
    localStorage.setItem(CONFIG.saveKey, JSON.stringify(data));
  } catch (e) { /* storage unavailable: play sessions still work */ }
}

function loadGame() {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(CONFIG.saveKey)); } catch (e) { return false; }
  if (!data || data.v !== 1) return false;

  Sim.time = data.time; Sim.currency = data.currency; Sim.totalEarned = data.totalEarned;
  Sim.peakIncome = data.peakIncome || 0; Sim.ended = !!data.ended;
  Object.assign(Sim.upgrades, data.upgrades);
  UI.shownHints = new Set(data.hints || []);
  UI.endShown = Sim.ended;

  for (const sn of data.nodes) {
    const def = NODE_DEFS.find(d => d.id === sn.id);
    if (!def) continue;
    const n = spawnNode(def);
    n.spawnT = 1;
    if (sn.kind === 'converter') placeConverter(n, sn.recipe);
    if (n.kind === 'sink') {
      n.level = sn.level; n.consumed = sn.consumed; n.consumedTotal = sn.consumedTotal;
      n.demand = sn.demand; n.valueMult = sn.valueMult; n.levelNeed = sn.levelNeed;
    }
  }
  layoutAllNodes();
  for (const sp of data.pipes) {
    const from = Sim.nodeById[sp.from], to = Sim.nodeById[sp.to];
    if (!from || !to || !canConnect(from, to)) continue;
    const pipe = addPipe(from, to);
    while (pipe.lanes < Math.min(sp.lanes, CONFIG.maxLanes)) addLane(pipe);
    pipe.bornT = Sim.time - 1;
  }
  return true;
}

function clearSave() {
  try { localStorage.removeItem(CONFIG.saveKey); } catch (e) { }
}
