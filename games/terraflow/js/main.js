// Bootstrap and game loop. Fixed-timestep sim, rAF render.

const DT = 1 / 60;

function layoutAllNodes() {
  for (const n of Sim.nodes) layoutNode(n);
  reflowPipes();
}

function checkSpawns() {
  for (const def of NODE_DEFS) {
    if (Sim.nodeById[def.id]) continue;
    if (Sim.totalEarned >= def.gate.earned) {
      const n = spawnNode(def);
      layoutNode(n);
    }
  }
}

function init() {
  const canvas = document.getElementById('map');
  uiInit();
  renderInit(canvas);
  inputInit(canvas);

  if (!loadGame()) checkSpawns(); // fresh game: spawn gate-0 nodes
  layoutAllNodes();

  window.addEventListener('resize', () => { renderResize(); layoutAllNodes(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });
  setInterval(saveGame, CONFIG.autosaveSec * 1000);

  let last = performance.now(), acc = 0;
  function frame(now) {
    acc += Math.min((now - last) / 1000, 0.25); // cap catch-up (no offline sim)
    last = now;
    let steps = 0;
    while (acc >= DT && steps < 5) { simStep(DT); acc -= DT; steps++; }
    if (steps === 5) acc = 0;
    checkSpawns();
    uiCheckHints();
    uiUpdate();
    renderDraw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

window.addEventListener('load', init);
