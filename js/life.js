/* life.js - Conway's Game of Life as a quiet ink-on-paper watermark.
   A full-viewport canvas behind the text; cells are faint dots in the page's
   ink colour. It's seeded from where your words actually sit (headings,
   paragraphs, cards) so it grows out of the writing and drifts into the
   margins. Slow generations, soft crossfade between them - meant to read as
   living paper, never as motion demanding attention.
   Standard B3/S23 rules, toroidal, with a rare sprinkle of noise so it never
   fully dies or freezes. Pauses when the tab is hidden or when the FRACTALS
   toy is running, and freezes to a single still frame under reduced-motion. */
(function () {
  var canvas, ctx, dpr = 1;
  var cols = 0, rows = 0, cell = 18;
  var vw = 0, vh = 0;
  var cur, nxt, alpha;          // grid state + per-cell fade
  var ink = [35, 37, 42];
  var raf = 0, running = false, lastStep = 0;
  var STEP = 820;               // ms between generations
  var gen = 0;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function readInk() {
    var c = getComputedStyle(document.documentElement).getPropertyValue("--fg").trim();
    if (c[0] === "#" && c.length === 7) {
      ink = [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
    }
  }

  function alive(g, r, c) {           // toroidal neighbour lookup
    r = (r + rows) % rows;
    c = (c + cols) % cols;
    return g[r * cols + c];
  }

  function step() {
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var n = alive(cur, r - 1, c - 1) + alive(cur, r - 1, c) + alive(cur, r - 1, c + 1)
              + alive(cur, r, c - 1)                             + alive(cur, r, c + 1)
              + alive(cur, r + 1, c - 1) + alive(cur, r + 1, c) + alive(cur, r + 1, c + 1);
        var i = r * cols + c;
        nxt[i] = (cur[i] ? (n === 2 || n === 3) : (n === 3)) ? 1 : 0;
      }
    }
    var t = cur; cur = nxt; nxt = t;
    gen++;
    if (gen % 44 === 0) {              // keep it gently alive forever
      for (var k = 0; k < cols * rows * 0.004; k++) {
        cur[(Math.random() * cols * rows) | 0] = 1;
      }
    }
  }

  // seed low-density noise everywhere, denser where the text sits
  function seed() {
    cur.fill(0);
    for (var i = 0; i < cur.length; i++) if (Math.random() < 0.08) cur[i] = 1;
    var sel = "h1, h2, h3, p, .card, .lede, header.site, footer.site, li";
    var els = document.querySelectorAll(sel);
    for (var e = 0; e < els.length; e++) {
      var b = els[e].getBoundingClientRect();
      if (b.bottom < 0 || b.top > vh || b.width === 0) continue;
      var c0 = Math.max(0, (b.left / cell) | 0), c1 = Math.min(cols - 1, (b.right / cell) | 0);
      var r0 = Math.max(0, (b.top / cell) | 0), r1 = Math.min(rows - 1, (b.bottom / cell) | 0);
      for (var r = r0; r <= r1; r++)
        for (var c = c0; c <= c1; c++)
          if (Math.random() < 0.4) cur[r * cols + c] = 1;
    }
  }

  function resize() {
    vw = document.documentElement.clientWidth;
    vh = document.documentElement.clientHeight;
    cell = vw < 560 ? 22 : 18;        // coarser grid on small screens
    cols = Math.ceil(vw / cell);
    rows = Math.ceil(vh / cell);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(vw * dpr);
    canvas.height = Math.floor(vh * dpr);
    canvas.style.width = vw + "px";
    canvas.style.height = vh + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cur = new Uint8Array(cols * rows);
    nxt = new Uint8Array(cols * rows);
    alpha = new Float32Array(cols * rows);
    gen = 0;
    seed();
  }

  function render() {
    ctx.clearRect(0, 0, vw, vh);
    var rad = cell * 0.32;
    var fill = "rgb(" + ink[0] + "," + ink[1] + "," + ink[2] + ")";
    ctx.fillStyle = fill;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var i = r * cols + c;
        var target = cur[i] ? 1 : 0;
        alpha[i] += (target - alpha[i]) * 0.1;   // soft crossfade between gens
        var a = alpha[i];
        if (a < 0.02) continue;
        ctx.globalAlpha = a * 0.07;              // faint ink watermark
        ctx.beginPath();
        ctx.arc(c * cell + cell / 2, r * cell + cell / 2, rad, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    if (now - lastStep >= STEP) { step(); lastStep = now; }
    render();
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    canvas.style.display = "block";
    lastStep = performance.now();
    if (reduce) {                       // no motion: settle a few gens, draw once
      for (var i = 0; i < 12; i++) step();
      for (var j = 0; j < cur.length; j++) alpha[j] = cur[j];
      render();
      running = false;
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    if (canvas) canvas.style.display = "none";
  }

  function init() {
    canvas = document.createElement("canvas");
    canvas.id = "life-canvas";
    document.body.insertBefore(canvas, document.body.firstChild);
    ctx = canvas.getContext("2d");
    readInk();
    resize();
    start();

    var to;
    addEventListener("resize", function () {
      clearTimeout(to);
      to = setTimeout(function () { readInk(); resize(); }, 200);
    });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop(); else if (!fractalsOn()) start();
    });
    // yield the background to the FRACTALS toy while it runs
    new MutationObserver(function () {
      readInk();
      if (fractalsOn()) stop(); else if (!document.hidden) start();
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });
  }

  function fractalsOn() {
    return document.documentElement.classList.contains("trippy");
  }

  if (document.readyState === "loading") addEventListener("DOMContentLoaded", init);
  else init();
})();
