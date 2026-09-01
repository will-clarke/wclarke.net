// Canvas rendering. Reads Sim + Input state, never mutates game state.

const Render = {
  canvas: null, ctx: null, w: 0, h: 0, dpr: 1,
  field: { x: 0, y: 0, w: 0, h: 0 },
  stars: [],
};

function renderInit(canvas) {
  Render.canvas = canvas;
  Render.ctx = canvas.getContext('2d');
  renderResize();
}

function renderResize() {
  const c = Render.canvas;
  const r = c.parentElement.getBoundingClientRect();
  Render.dpr = Math.min(window.devicePixelRatio || 1, 2);
  Render.w = r.width; Render.h = r.height;
  c.width = Math.round(r.width * Render.dpr);
  c.height = Math.round(r.height * Render.dpr);
  c.style.width = r.width + 'px';
  c.style.height = r.height + 'px';
  Render.field = {
    x: 14, y: CONFIG.topPad,
    w: Render.w - 28, h: Render.h - CONFIG.topPad - CONFIG.bottomPad,
  };
  for (const n of Sim.nodes) layoutNode(n);
  reflowPipes();
  // static starfield, deterministic
  Render.stars = [];
  let s = 12345;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 46; i++) {
    Render.stars.push({ x: rnd() * Render.w, y: rnd() * Render.h, r: 0.6 + rnd() * 1.1, a: 0.05 + rnd() * 0.12 });
  }
}

function layoutNode(n) {
  n.x = Render.field.x + n.fx * Render.field.w;
  n.y = Render.field.y + n.fy * Render.field.h;
}

// --- main draw ---------------------------------------------------------------

function renderDraw() {
  const ctx = Render.ctx, t = Sim.time;
  ctx.setTransform(Render.dpr, 0, 0, Render.dpr, 0, 0);
  ctx.fillStyle = CONFIG.colors.bg;
  ctx.fillRect(0, 0, Render.w, Render.h);

  drawGoalGlow(ctx, t);

  for (const st of Render.stars) {
    ctx.globalAlpha = st.a;
    ctx.fillStyle = '#cdd6e4';
    ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (const p of Sim.pipes) drawPipeBody(ctx, p);
  if (Input.drag && Input.drag.active) drawPreview(ctx);
  for (const p of Sim.pipes) drawParticles(ctx, p, t);
  for (const n of Sim.nodes) drawNode(ctx, n, t);
  for (const p of Sim.pipes) drawRateLabel(ctx, p);
}

// --- goal glow (feedback v2: "the whole background goes red") -------------------

// soft radial wash around the Vat in the pinned goal's most-missing colour
function drawGoalGlow(ctx, t) {
  const cost = pinnedCost();
  const hub = Sim.nodeById.hub;
  if (!cost || !hub) return;
  let el = null, worst = 0;
  for (const c in cost) {
    const deficit = 1 - Math.min(1, Sim.bank[c] / cost[c]);
    if (deficit > worst) { worst = deficit; el = c; }
  }
  if (!el) return;
  const rad = Math.max(Render.w, Render.h) * 0.55;
  const g = ctx.createRadialGradient(hub.x, hub.y, CONFIG.hubR, hub.x, hub.y, rad);
  g.addColorStop(0, PAINTS[el].color);
  g.addColorStop(1, 'transparent');
  ctx.globalAlpha = 0.10 + 0.025 * Math.sin(t * 1.4);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, Render.w, Render.h);
  ctx.globalAlpha = 1;
}

// --- pipes -------------------------------------------------------------------

function tracePipe(ctx, pipe) {
  ctx.beginPath();
  const s0 = pipe.segs[0];
  ctx.moveTo(s0.ax, s0.ay);
  for (const s of pipe.segs) ctx.lineTo(s.ax + s.ux * s.len, s.ay + s.uy * s.len);
}

function drawPipeBody(ctx, pipe) {
  const col = PAINTS[pipe.element].color;
  const born = Math.min(1, (Sim.time - pipe.bornT) * 4); // snap-in
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.globalAlpha = 0.20 * born;
  ctx.strokeStyle = col;
  ctx.lineWidth = 6 + (pipe.lanes - 1) * CONFIG.laneOffset;
  tracePipe(ctx, pipe); ctx.stroke();
  ctx.globalAlpha = 0.35 * born;
  ctx.lineWidth = 1.5;
  tracePipe(ctx, pipe); ctx.stroke();
  ctx.globalAlpha = 1;
}

function laneOffsetFor(pipe, li) {
  return (li - (pipe.lanes - 1) / 2) * CONFIG.laneOffset;
}

function drawParticles(ctx, pipe, t) {
  const col = PAINTS[pipe.element].color;
  const v = flowSpeed();
  const streak = v > CONFIG.streakSpeed;
  const streakLen = Math.min(12, v * 0.05);
  ctx.fillStyle = col; ctx.strokeStyle = col;
  for (let li = 0; li < pipe.laneP.length; li++) {
    const off = laneOffsetFor(pipe, li);
    for (const p of pipe.laneP[li]) {
      const pt = pipePointAt(pipe, p.pos);
      const x = pt.x - pt.uy * off, y = pt.y + pt.ux * off;
      if (streak && !p.stuck) {
        ctx.lineWidth = CONFIG.particleR * 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x - pt.ux * streakLen, y - pt.uy * streakLen);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(x, y, CONFIG.particleR, 0, 7); ctx.fill();
        if (p.stuck) { // jam shimmer
          ctx.globalAlpha = 0.25 + 0.15 * Math.sin(t * 5 + p.pos);
          ctx.beginPath(); ctx.arc(x, y, CONFIG.particleR + 2.5, 0, 7); ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    }
  }
}

function drawRateLabel(ctx, pipe) {
  if (pipe.rateEMA < 3) return;
  const mid = pipePointAt(pipe, pipe.length / 2);
  ctx.font = '600 10px system-ui, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = PAINTS[pipe.element].color;
  ctx.globalAlpha = 0.85;
  ctx.fillText(fmt(pipe.rateEMA) + '/s', mid.x - mid.uy * 14, mid.y + mid.ux * 14);
  ctx.globalAlpha = 1;
}

function drawPreview(ctx) {
  const d = Input.drag;
  const from = d.fromNode;
  const end = d.targetNode ? { x: d.targetNode.x, y: d.targetNode.y } : { x: d.x, y: d.y };
  const path = makePath(from, end);
  const col = d.valid ? PAINTS[nodeOutputElement(from)].color : CONFIG.colors.bad;
  ctx.save();
  ctx.setLineDash([7, 7]);
  ctx.lineDashOffset = -Sim.time * 30;
  ctx.strokeStyle = col; ctx.globalAlpha = d.valid ? 0.9 : 0.45;
  ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(path.pts[0].x, path.pts[0].y);
  for (const pt of path.pts.slice(1)) ctx.lineTo(pt.x, pt.y);
  ctx.stroke();
  ctx.restore();
}

// --- nodes -------------------------------------------------------------------

function popScale(n) { // easeOutBack spawn pop
  const t = n.spawnT, c = 1.70158;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
}

function drawNode(ctx, n, t) {
  ctx.save();
  ctx.translate(n.x, n.y);
  const sc = popScale(n);
  ctx.scale(sc, sc);
  const R = CONFIG.nodeR;

  if (n.kind === 'source') {
    const col = PAINTS[n.element].color;
    // emit ripple: a ring that grows outward each time a dot leaves
    if (n.emitPulse > 0) {
      ctx.strokeStyle = col;
      ctx.globalAlpha = n.emitPulse * 0.5;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, R + (1 - n.emitPulse) * 10, 0, 7); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = col;
    ctx.globalAlpha = n.blocked ? 0.55 : 1;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;

  } else if (n.kind === 'hub') {
    // the Vat: a dark swirling pit that swallows paint
    const HR = CONFIG.hubR;
    // arrival blips: coloured rings collapsing inward
    for (const b of n.blips) {
      const ph = b.t / 0.8;
      ctx.strokeStyle = b.color;
      ctx.globalAlpha = (1 - ph) * 0.6;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, HR + 14 - ph * 14, 0, 7); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#0a0d13';
    ctx.beginPath(); ctx.arc(0, 0, HR, 0, 7); ctx.fill();
    ctx.strokeStyle = CONFIG.colors.ink;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, HR, 0, 7); ctx.stroke();
    // slow inward swirl
    ctx.strokeStyle = CONFIG.colors.dim;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const a0 = -t * 0.9 + i * (Math.PI * 2 / 3);
      ctx.globalAlpha = 0.55 - i * 0.13;
      ctx.beginPath(); ctx.arc(0, 0, HR - 6 - i * 6, a0, a0 + 1.9); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // goal donut: what the pinned upgrade needs, arc per colour, fill = banked
    const cost = pinnedCost();
    if (cost) {
      const entries = Object.entries(cost);
      const total = entries.reduce((a, [, n]) => a + n, 0);
      const gap = entries.length > 1 ? 0.16 : 0.001;
      let a0 = -Math.PI / 2;
      ctx.lineWidth = 4.5; ctx.lineCap = 'butt';
      for (const [el, n] of entries) {
        const span = (n / total) * Math.PI * 2 - gap;
        ctx.strokeStyle = PAINTS[el].color;
        ctx.globalAlpha = 0.22;
        ctx.beginPath(); ctx.arc(0, 0, HR + 9, a0, a0 + span); ctx.stroke();
        const frac = Math.min(1, Sim.bank[el] / n);
        if (frac > 0) {
          ctx.globalAlpha = 1;
          ctx.beginPath(); ctx.arc(0, 0, HR + 9, a0, a0 + span * frac); ctx.stroke();
        }
        a0 += span + gap;
      }
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = CONFIG.colors.dim;
    ctx.font = '700 8.5px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('THE VAT', 0, HR + 20);

  } else if (n.kind === 'slot') {
    ctx.strokeStyle = CONFIG.colors.slot;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 6]);
    ctx.lineDashOffset = -t * 8;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = CONFIG.colors.slot;
    ctx.font = '400 18px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('+', 0, 1);

  } else if (n.kind === 'converter') {
    const r = RECIPES[n.recipe];
    const outCol = PAINTS[r.out].color;
    ctx.fillStyle = '#1a212c';
    ctx.strokeStyle = outCol;
    ctx.lineWidth = 2;
    roundRect(ctx, -R - 2, -R - 2, (R + 2) * 2, (R + 2) * 2, 8);
    ctx.fill(); ctx.stroke();
    if (n.firePulse > 0) {
      ctx.globalAlpha = n.firePulse * 0.35;
      ctx.fillStyle = outCol;
      roundRect(ctx, -R - 2, -R - 2, (R + 2) * 2, (R + 2) * 2, 8);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // progress bar along bottom
    ctx.fillStyle = outCol;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(-R + 2, R - 4, (R - 2) * 2 * Math.min(1, n.prog), 2.5);
    ctx.globalAlpha = 1;
    // input stubs (a row per ingredient): pips for small ratios, have/need
    // counts for the big v2 batches (mixing is expensive by design)
    let row = 0;
    const inputs = recipeInputs(r);
    const els = Object.keys(inputs);
    for (const el of els) {
      const ratio = inputs[el];
      const y = -6 + row * 11 - (els.length - 1) * 2;
      const have = Math.min(ratio, Math.floor(n.buffers[el]));
      ctx.fillStyle = PAINTS[el].color;
      if (ratio <= 4) {
        for (let i = 0; i < ratio; i++) {
          ctx.globalAlpha = i < have ? 1 : 0.22;
          ctx.beginPath(); ctx.arc(-R + 8 + i * 8, y, 3.1, 0, 7); ctx.fill();
        }
        ctx.globalAlpha = 1;
      } else {
        ctx.beginPath(); ctx.arc(-R + 7, y, 3.1, 0, 7); ctx.fill();
        ctx.font = '700 8.5px system-ui, sans-serif';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.globalAlpha = have >= ratio ? 1 : 0.75;
        ctx.fillText(have + '/' + ratio, -R + 13, y + 0.5);
        ctx.globalAlpha = 1;
      }
      row++;
    }
    // output swatch + buffer pips
    ctx.fillStyle = outCol;
    ctx.beginPath(); ctx.arc(R - 8, -4, 4.2, 0, 7); ctx.fill();
    for (let i = 0; i < CONFIG.outBufCap; i++) {
      ctx.globalAlpha = i < n.outBuf ? 1 : 0.22;
      ctx.beginPath(); ctx.arc(R - 8 - i * 8, 8, 2.6, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // drag target highlight
  if (Input.drag && Input.drag.active && Input.drag.targetNode === n && Input.drag.valid) {
    ctx.strokeStyle = CONFIG.colors.good;
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, (n.kind === 'hub' ? CONFIG.hubR : R) + 8, 0, 7); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
