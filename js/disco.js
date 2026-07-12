/* disco.js - the 🕺 button. Turns every empty hex into a spinning wireframe
   polyhedron: real 3D geometry (tetra, cube, octa, dodeca, icosa,
   cuboctahedron), rotated with matrices and drawn with perspective + hidden-
   edge depth shading. One full-viewport canvas, one rAF loop, ~160 solids -
   far cheaper than 160 WebGL contexts. Off by default; respects reduced motion. */
(function () {
  var PHI = (1 + Math.sqrt(5)) / 2;

  // signed permutations helper: every ± combination of the given coordinate,
  // optionally over its cyclic rotations (for the icosa/dodeca vertex sets)
  function signs(x, y, z) {
    var out = [];
    for (var a = -1; a <= 1; a += 2)
      for (var b = -1; b <= 1; b += 2)
        for (var c = -1; c <= 1; c += 2) {
          if (x === 0 && a < 0) continue;
          if (y === 0 && b < 0) continue;
          if (z === 0 && c < 0) continue;
          out.push([a * x, b * y, c * z]);
        }
    return out;
  }
  function concat() {
    var v = [];
    for (var i = 0; i < arguments.length; i++) v = v.concat(arguments[i]);
    return v;
  }

  var SOLIDS = [
    { name: "tetra", v: [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]] },
    { name: "cube", v: signs(1, 1, 1) },
    { name: "octa", v: concat(signs(1, 0, 0), signs(0, 1, 0), signs(0, 0, 1)) },
    { name: "cubocta", v: concat(signs(1, 1, 0), signs(1, 0, 1), signs(0, 1, 1)) },
    { name: "icosa", v: concat(signs(0, 1, PHI), signs(1, PHI, 0), signs(PHI, 0, 1)) },
    {
      name: "dodeca", v: concat(
        signs(1, 1, 1),
        signs(0, 1 / PHI, PHI), signs(1 / PHI, PHI, 0), signs(PHI, 0, 1 / PHI)),
    },
  ];

  // derive edges from vertices: connect every pair at (near) the minimum
  // distance. Works for these because each has a single edge length.
  function buildEdges(v) {
    var min = Infinity, i, j, d;
    for (i = 0; i < v.length; i++)
      for (j = i + 1; j < v.length; j++) {
        d = dist2(v[i], v[j]);
        if (d < min) min = d;
      }
    var edges = [], lim = min * 1.08;
    for (i = 0; i < v.length; i++)
      for (j = i + 1; j < v.length; j++)
        if (dist2(v[i], v[j]) <= lim) edges.push([i, j]);
    return edges;
  }
  function dist2(a, b) {
    var x = a[0] - b[0], y = a[1] - b[1], z = a[2] - b[2];
    return x * x + y * y + z * z;
  }

  // normalise each solid to unit radius and precompute its edges
  SOLIDS.forEach(function (s) {
    var r = 0;
    s.v.forEach(function (p) { r = Math.max(r, Math.hypot(p[0], p[1], p[2])); });
    s.v = s.v.map(function (p) { return [p[0] / r, p[1] / r, p[2] / r]; });
    s.e = buildEdges(s.v);
  });

  var PALETTE = [
    "#8f4222", "#8c6bd6", "#2f8f8a", "#c0435a", "#b8791f",
    "#57e08a", "#3ad9ff", "#ff7ac2", "#ffb43a", "#b98cff",
  ];

  var canvas, ctx, raf = 0, running = false, dpr = 1;
  var cells = [];          // one spinning solid per empty hex
  var vw = 0, vh = 0;

  function ensureCanvas() {
    if (canvas) return;
    canvas = document.createElement("canvas");
    canvas.id = "disco-canvas";
    document.body.appendChild(canvas);
    ctx = canvas.getContext("2d");
  }

  function sizeCanvas() {
    vw = window.innerWidth; vh = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(vw * dpr);
    canvas.height = Math.floor(vh * dpr);
    canvas.style.width = vw + "px";
    canvas.style.height = vh + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // read the empty hexes from the DOM and dress each with a random solid
  function scan() {
    var nodes = document.querySelectorAll(".hex.cell");
    cells = [];
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i], r = el.getBoundingClientRect();
      cells.push({
        cx: r.left + r.width / 2,
        cy: r.top + r.height / 2,
        rad: r.width * 0.34,
        dim: parseFloat(el.style.opacity) || 1,     // reuse the field's vignette
        solid: SOLIDS[(Math.random() * SOLIDS.length) | 0],
        color: PALETTE[(Math.random() * PALETTE.length) | 0],
        phase: Math.random() * Math.PI * 2,
        sx: 0.5 + Math.random() * 0.9,
        sy: (0.5 + Math.random() * 0.9) * (Math.random() < 0.5 ? -1 : 1),
      });
    }
  }

  function frame(ts) {
    ctx.clearRect(0, 0, vw, vh);
    var near = [], far = [];   // batch by depth so hidden edges draw dimmer

    for (var i = 0; i < cells.length; i++) {
      var c = cells[i];
      var ax = ts * 0.00035 * c.sx + c.phase;
      var ay = ts * 0.00035 * c.sy + c.phase * 0.6;
      var ca = Math.cos(ax), sa = Math.sin(ax);
      var cb = Math.cos(ay), sb = Math.sin(ay);
      var v = c.solid.v, P = c.proj || (c.proj = []);

      for (var k = 0; k < v.length; k++) {
        var x = v[k][0], y = v[k][1], z = v[k][2];
        var y1 = y * ca - z * sa, z1 = y * sa + z * ca;   // rotate X
        var x2 = x * cb + z1 * sb, z2 = -x * sb + z1 * cb; // rotate Y
        var s = 3.2 / (3.2 - z2);                          // perspective
        P[k] = [c.cx + x2 * s * c.rad, c.cy + y1 * s * c.rad, z2];
      }

      var e = c.solid.e;
      for (var m = 0; m < e.length; m++) {
        var a = P[e[m][0]], b = P[e[m][1]];
        var seg = [a[0], a[1], b[0], b[1], c.color, c.dim];
        ((a[2] + b[2]) * 0.5 >= 0 ? near : far).push(seg);
      }
    }

    stroke(far, 0.35, 1);
    stroke(near, 1, 1.4);
    if (running) raf = requestAnimationFrame(frame);
  }

  function stroke(segs, alphaMul, width) {
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    for (var i = 0; i < segs.length; i++) {
      var s = segs[i];
      ctx.globalAlpha = s[5] * alphaMul;
      ctx.strokeStyle = s[4];
      ctx.beginPath();
      ctx.moveTo(s[0], s[1]);
      ctx.lineTo(s[2], s[3]);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function start() {
    ensureCanvas();
    sizeCanvas();
    scan();
    running = true;
    document.body.classList.add("disco");
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    document.body.classList.remove("disco");
    if (ctx) ctx.clearRect(0, 0, vw, vh);
  }

  window.addEventListener("resize", function () {
    if (!running) return;
    sizeCanvas();
  });
  // hex.js rebuilds the grid after a resize settles - re-read the new cells
  window.addEventListener("hexrebuilt", function () { if (running) scan(); });

  window.toggleDisco = function (btn) {
    if (running) stop(); else start();
    if (btn) btn.setAttribute("aria-pressed", running ? "true" : "false");
  };
})();
