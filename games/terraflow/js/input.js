// Touch/mouse input on the map canvas. Two gestures: drag (draw pipe), tap (act).

const Input = {
  drag: null,      // {fromNode, x, y, active, valid, targetNode}
  _down: null,     // {x, y, node, pipe}
};

function inputInit(canvas) {
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', () => { Input.drag = null; Input._down = null; });
}

function canvasPos(e) {
  const r = Render.canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function nodeAt(x, y) {
  let best = null, bd = CONFIG.hitR;
  for (const n of Sim.nodes) {
    const d = Math.hypot(n.x - x, n.y - y);
    if (d < bd) { bd = d; best = n; }
  }
  return best;
}

function pipeAt(x, y) {
  let best = null, bd = CONFIG.pipeHitR;
  for (const p of Sim.pipes) {
    for (const s of p.segs) {
      const t = Math.max(0, Math.min(s.len, (x - s.ax) * s.ux + (y - s.ay) * s.uy));
      const d = Math.hypot(s.ax + s.ux * t - x, s.ay + s.uy * t - y);
      if (d < bd) { bd = d; best = p; }
    }
  }
  return best;
}

function onDown(e) {
  e.preventDefault();
  Render.canvas.setPointerCapture(e.pointerId);
  const { x, y } = canvasPos(e);
  const node = nodeAt(x, y);
  Input._down = { x, y, node, pipe: node ? null : pipeAt(x, y) };
  uiCloseMenus();
}

function onMove(e) {
  if (!Input._down) return;
  const { x, y } = canvasPos(e);
  const d = Input._down;
  if (!Input.drag && d.node && nodeOutputElement(d.node) && Math.hypot(x - d.x, y - d.y) > 8) {
    Input.drag = { fromNode: d.node, x, y, active: true, valid: false, targetNode: null };
  }
  if (Input.drag) {
    Input.drag.x = x; Input.drag.y = y;
    const target = nodeAt(x, y);
    Input.drag.targetNode = target !== Input.drag.fromNode ? target : null;
    Input.drag.valid = !!Input.drag.targetNode && Sim.pipeStock > 0
      && canConnect(Input.drag.fromNode, Input.drag.targetNode);
  }
}

function onUp(e) {
  const { x, y } = canvasPos(e);
  const d = Input._down;
  Input._down = null;

  if (Input.drag) {
    if (Input.drag.valid) {
      addPipe(Input.drag.fromNode, Input.drag.targetNode);
      uiHintDone('draw');
    }
    Input.drag = null;
    return;
  }
  if (!d) return;

  // tap
  if (d.node) {
    if (d.node.kind === 'slot') uiOpenRadial(d.node);
    else if (d.node.kind === 'converter') uiOpenConverterMenu(d.node);
  } else if (d.pipe) {
    uiOpenPipeChip(d.pipe, x, y);
  }
}
