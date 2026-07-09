/* trippy.js - the "✦ FRACTALS" button on the homepage.
   A full-viewport canvas that grows recursive geometry (branching trees and
   nested rotating polygons) from the cursor. Everything fades on a slow trail,
   the palette drifts gently, and it calms down when the pointer sits still -
   alive and a bit nuts, but no strobing and nothing sick-inducing.
   The page chrome (headings shimmering, cards floating) is pure CSS, driven by
   the `trippy` class this toggles on <html>. */
(function () {
  var canvas, ctx, dpr = 1;
  var raf = 0, running = false, started = false;
  var sprouts = [];
  var hue = 0;                 // global palette drift, degrees
  var bg = [250, 248, 243];    // page background, read live for the trail fade
  var pointer = { x: 0, y: 0, seen: false };
  var lastMove = 0, lastSpawn = 0, lastMoveX = 0, lastMoveY = 0;
  var vw = 0, vh = 0;          // layout viewport, excluding scrollbars

  var MAX_SPROUTS = 80;
  var LIFE = 3800;             // ms a sprout lives
  var GROW = 1500;             // ms to reach full size

  function readBg() {
    var c = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
    // --bg is a #rrggbb hex
    if (c[0] === "#" && c.length === 7) {
      bg = [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
    }
  }

  function resize() {
    vw = document.documentElement.clientWidth;
    vh = document.documentElement.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(vw * dpr);
    canvas.height = Math.floor(vh * dpr);
    canvas.style.width = vw + "px";
    canvas.style.height = vh + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // repaint the backdrop so a resize doesn't flash transparent
    ctx.fillStyle = "rgb(" + bg[0] + "," + bg[1] + "," + bg[2] + ")";
    ctx.fillRect(0, 0, vw, vh);
  }

  function init() {
    canvas = document.createElement("canvas");
    canvas.id = "trippy-canvas";
    document.body.appendChild(canvas);
    ctx = canvas.getContext("2d");
    readBg();
    resize();
    addEventListener("resize", function () { if (running) resize(); });
    addEventListener("pointermove", onMove, { passive: true });
    addEventListener("pointerdown", function (e) {
      if (running) { for (var i = 0; i < 6; i++) spawn(e.clientX, e.clientY, true); }
    });
    started = true;
  }

  function onMove(e) {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.seen = true;
    if (!running) return;
    var now = performance.now();
    lastMove = now;
    var dx = e.clientX - lastMoveX, dy = e.clientY - lastMoveY;
    if (dx * dx + dy * dy > 26 * 26 && now - lastSpawn > 55) {
      spawn(e.clientX, e.clientY, false);
      lastSpawn = now;
      lastMoveX = e.clientX; lastMoveY = e.clientY;
    }
  }

  var TYPES = ["tree", "poly", "koch", "sierp", "pyth"];

  function spawn(x, y, burst) {
    if (sprouts.length >= MAX_SPROUTS) sprouts.shift();
    sprouts.push({
      x: x, y: y,
      born: performance.now(),
      hue: hue + (Math.random() * 60 - 30),
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.9,          // radians over full life
      size: 54 * (0.7 + Math.random() * 0.6) * (burst ? 1.25 : 1),
      type: TYPES[Math.floor(Math.random() * TYPES.length)],
      sides: 3 + Math.floor(Math.random() * 4),   // 3..6-gon
      spread: 0.4 + Math.random() * 0.5           // tree branch angle
    });
  }

  // recursive branching tree, drawn tip-first from the current transform origin
  function tree(len, depth, spread) {
    if (depth <= 0 || len < 3) return;
    ctx.lineWidth = Math.max(0.6, depth * 0.5);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -len);
    ctx.stroke();
    ctx.translate(0, -len);
    ctx.save(); ctx.rotate(-spread); tree(len * 0.72, depth - 1, spread); ctx.restore();
    ctx.save(); ctx.rotate(spread); tree(len * 0.72, depth - 1, spread); ctx.restore();
    if (depth % 2 === 0) { // occasional third shoot for a fuller canopy
      ctx.save(); ctx.rotate(spread * 0.15); tree(len * 0.5, depth - 2, spread); ctx.restore();
    }
  }

  // nested rotating polygon that spirals inward
  function poly(r, sides, depth) {
    if (depth <= 0 || r < 4) return;
    ctx.lineWidth = Math.max(0.6, depth * 0.4);
    ctx.beginPath();
    for (var i = 0; i <= sides; i++) {
      var a = (i / sides) * Math.PI * 2;
      var px = Math.cos(a) * r, py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.rotate(0.42);
    ctx.scale(0.8, 0.8);
    poly(r, sides, depth - 1);
  }

  // Koch snowflake: recursively bump each edge, collect points, stroke once
  function kochEdge(a, b, depth, pts) {
    if (depth <= 0) { pts.push(b); return; }
    var dx = (b[0] - a[0]) / 3, dy = (b[1] - a[1]) / 3;
    var p1 = [a[0] + dx, a[1] + dy];
    var p2 = [a[0] + 2 * dx, a[1] + 2 * dy];
    var ang = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) - Math.PI / 3;
    var len = Math.hypot(dx, dy);
    var apex = [p1[0] + Math.cos(ang) * len, p1[1] + Math.sin(ang) * len];
    kochEdge(a, p1, depth - 1, pts);
    kochEdge(p1, apex, depth - 1, pts);
    kochEdge(apex, p2, depth - 1, pts);
    kochEdge(p2, b, depth - 1, pts);
  }
  function koch(r, depth) {
    ctx.lineWidth = 1.1;
    var v = [], k;
    for (k = 0; k < 3; k++) {
      var a = -Math.PI / 2 + k * 2 * Math.PI / 3;
      v.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    var pts = [v[0]];
    kochEdge(v[0], v[1], depth, pts);
    kochEdge(v[1], v[2], depth, pts);
    kochEdge(v[2], v[0], depth, pts);
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]);
    ctx.closePath();
    ctx.stroke();
  }

  // Sierpinski triangle by recursive subdivision
  function sierp(a, b, c, depth) {
    if (depth <= 0) {
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]);
      ctx.closePath(); ctx.stroke();
      return;
    }
    var ab = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    var bc = [(b[0] + c[0]) / 2, (b[1] + c[1]) / 2];
    var ca = [(c[0] + a[0]) / 2, (c[1] + a[1]) / 2];
    sierp(a, ab, ca, depth - 1);
    sierp(ab, b, bc, depth - 1);
    sierp(ca, bc, c, depth - 1);
  }
  function sierpinski(r, depth) {
    ctx.lineWidth = 1;
    var v = [], k;
    for (k = 0; k < 3; k++) {
      var a = -Math.PI / 2 + k * 2 * Math.PI / 3;
      v.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    sierp(v[0], v[1], v[2], depth);
  }

  // Pythagoras tree: a square, then two scaled/rotated squares on its top edge
  function pyth(depth) {
    if (depth <= 0) return;
    ctx.lineWidth = Math.max(0.5, depth * 0.16);
    ctx.strokeRect(0, -1, 1, 1);
    var s = Math.SQRT1_2;
    ctx.save();
    ctx.translate(0, -1); ctx.rotate(-Math.PI / 4); ctx.scale(s, s);
    pyth(depth - 1);
    ctx.restore();
    ctx.save();
    ctx.translate(1, -1); ctx.rotate(Math.PI / 4); ctx.scale(s, s); ctx.translate(-1, 0);
    pyth(depth - 1);
    ctx.restore();
  }

  function drawSprout(s, now) {
    var age = now - s.born;
    var p = age / LIFE;                       // 0..1 lifetime
    var grow = Math.min(1, age / GROW);
    var ease = 1 - Math.pow(1 - grow, 3);     // easeOutCubic growth
    // fade in over first 12%, out over last 45%
    var alpha = p < 0.12 ? p / 0.12 : p > 0.55 ? (1 - p) / 0.45 : 1;
    if (alpha <= 0) return;

    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.angle + s.spin * p);
    ctx.globalAlpha = alpha * 0.85;
    ctx.strokeStyle = "hsl(" + (s.hue % 360) + ", 72%, 58%)";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    var sz = s.size * ease;
    if (s.type === "tree") tree(sz, 8, s.spread);
    else if (s.type === "poly") poly(sz, s.sides, 6);
    else if (s.type === "koch") koch(sz * 0.9, 3);
    else if (s.type === "sierp") sierpinski(sz, 5);
    else { var k = sz / 2.6; ctx.scale(k, k); ctx.translate(-0.5, 0.4); pyth(9); }
    ctx.restore();
  }

  function frame(now) {
    // trail fade: paint the page bg at low alpha so old strokes linger, not smear
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(" + bg[0] + "," + bg[1] + "," + bg[2] + ",0.07)";
    ctx.fillRect(0, 0, vw, vh);

    hue = (hue + 0.25) % 360;

    // gentle ambient life when the pointer is resting
    if (now - lastMove > 1100 && Math.random() < 0.03 && sprouts.length < 24) {
      spawn(Math.random() * vw, Math.random() * vh, false);
    }

    for (var i = sprouts.length - 1; i >= 0; i--) {
      if (now - sprouts[i].born > LIFE) { sprouts.splice(i, 1); continue; }
      drawSprout(sprouts[i], now);
    }
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (!started) init();
    readBg();
    resize();
    running = true;
    hue = Math.random() * 360;   // fresh palette each time
    document.documentElement.classList.add("trippy");
    canvas.style.display = "block";
    lastMove = performance.now();
    if (pointer.seen) { for (var i = 0; i < 5; i++) spawn(pointer.x, pointer.y, false); }
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    document.documentElement.classList.remove("trippy");
    if (canvas) canvas.style.display = "none";
    sprouts.length = 0;
  }

  window.toggleTrippy = function (btn) {
    if (running) {
      stop();
      if (btn) { btn.setAttribute("aria-pressed", "false"); btn.textContent = "✦ FRACTALS"; }
    } else {
      start();
      if (btn) { btn.setAttribute("aria-pressed", "true"); btn.textContent = "✦ STOP"; }
    }
  };

  // keep the trail colour correct if the theme is toggled mid-trip
  new MutationObserver(function () { if (running) readBg(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
})();
