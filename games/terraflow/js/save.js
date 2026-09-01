// localStorage save/load. Particles and small buffers are not persisted.
// v5 format (V3 catalogue); older saves are ignored (different game).

let _saveCleared = false;

function saveGame() {
  if (_saveCleared) return; // reset in progress: don't resurrect the save on unload
  try {
    const data = {
      v: 5,
      time: Sim.time, bank: Sim.bank, lifetime: Sim.lifetime,
      pipeStock: Sim.pipeStock, up: Sim.up, pinned: Sim.pinned,
      peakIntake: Sim.peakIntake, ended: Sim.ended,
      hints: [...UI.shownHints],
      endShown: UI.endShown,
      nodes: Sim.nodes.map(n => ({ id: n.id, kind: n.kind, recipe: n.recipe })),
      pipes: Sim.pipes.map(p => ({ from: p.from, to: p.to, lanes: p.lanes })),
    };
    localStorage.setItem(CONFIG.saveKey, JSON.stringify(data));
  } catch (e) { /* storage unavailable: play sessions still work */ }
}

function loadGame() {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(CONFIG.saveKey)); } catch (e) { return false; }
  if (!data || data.v !== 5) return false;

  Sim.time = data.time;
  Object.assign(Sim.bank, data.bank);
  Object.assign(Sim.lifetime, data.lifetime);
  Sim.pipeStock = data.pipeStock;
  Sim.up = data.up || {};
  Sim.pinned = data.pinned && TRACK_BY_ID[data.pinned] ? data.pinned : null;
  Sim.peakIntake = data.peakIntake || 0;
  Sim.ended = !!data.ended;
  UI.shownHints = new Set(data.hints || []);
  UI.endShown = !!data.endShown;

  for (const sn of data.nodes) {
    const def = NODE_DEFS.find(d => d.id === sn.id);
    if (!def) continue;
    const n = spawnNode(def);
    n.spawnT = 1;
    if (sn.kind === 'converter') placeConverter(n, sn.recipe);
  }
  for (const n of Sim.nodes) layoutNode(n);
  for (const sp of data.pipes) {
    const from = Sim.nodeById[sp.from], to = Sim.nodeById[sp.to];
    if (!from || !to || !canConnect(from, to)) continue;
    const pipe = addPipe(from, to, { free: true }); // stock already reflects them
    while (pipe.lanes < Math.min(sp.lanes, maxLanes())) addLane(pipe);
    pipe.bornT = Sim.time - 1;
  }
  return true;
}

function clearSave() {
  _saveCleared = true;
  try { localStorage.removeItem(CONFIG.saveKey); } catch (e) { }
}
