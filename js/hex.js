/* hex.js - the honeycomb homepage.

   A pannable field of big hexagons. A cluster of thirteen special hexes sits at
   the centre: five are live "toys" (js/toys.js) that expand into a large hex
   when you open them; the other eight are doors (links). The rest of the field
   is quiet texture that fades toward the edges.

   The field looks around as the mouse moves (a gentle parallax) and can be
   dragged; both just translate one #world layer, so the toys ride along without
   redrawing. Every hex position comes from one axial-coordinate formula, so the
   tiling is correct by construction at any size. */
(function () {
  var REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // thirteen special hexes on an axial grid (q, r) centred on (0, 0):
  // the middle, its six neighbours, and six corners of the ring beyond.
  var TILES = [
    { toy: "poly",    q: 0,  r: 0,  name: "polyhedra", accent: "#8c6bd6", href: "/games/polyhedra/",              blurb: "shapes from a seed" },
    { toy: "neural",  q: 1,  r: 0,  name: "neural",    accent: "#d84f9a", href: null,                              blurb: "position → colour" },
    { toy: "fractal", q: -1, r: 0,  name: "fractal",   accent: "#1f9fce", href: "https://intuition.wclarke.net",   blurb: "a julia set" },
    { toy: "life",    q: -1, r: 1,  name: "life",      accent: "#2fae63", href: null,                              blurb: "it just evolves" },
    { toy: "recurse", q: 2,  r: 0,  name: "recursion", accent: "#e0912a", href: null,                              blurb: "hexes in hexes" },

    { q: 1,  r: -1, name: "games",     accent: "#8f4222", href: "/games/",                       blurb: "puzzle games" },
    { q: 0,  r: -1, name: "intuition", accent: "#2f8f8a", href: "https://intuition.wclarke.net", blurb: "maths, poked" },
    { q: 0,  r: 1,  name: "writing",   accent: "#556071", href: "/writing.html",                 blurb: "occasional notes" },
    { q: 0,  r: -2, name: "museum",    accent: "#b8791f", href: "/museum/",                       blurb: "sites since 2014" },
    { q: 2,  r: -2, name: "github",    accent: "#5a6270", href: "https://github.com/will-clarke", blurb: "the code" },
    { q: 0,  r: 2,  name: "about",     accent: "#a1633f", href: "/about.html",                    blurb: "hello" },
    { q: -2, r: 2,  name: "cinema",    accent: "#c0435a", href: "https://classiccult.pages.dev/", blurb: "london film listings" },
    { q: -2, r: 0,  name: "projects",  accent: "#7d4bcf", href: "/projects.html",                 blurb: "the full cabinet" },
  ];

  var field = document.getElementById("field");
  var world = document.createElement("div");
  world.id = "world";
  field.appendChild(world);

  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var vw, vh, w, H, stepX, rowStep, panMax = { x: 0, y: 0 };
  var live = [];                 // toy tiles: {toy, canvas, ctx, w, h, last, accent, name}

  // ---- layout ----------------------------------------------------------
  function build() {
    world.textContent = "";
    live = [];
    vw = window.innerWidth; vh = window.innerHeight;

    w = Math.max(112, Math.min(230, vw / 5.2));
    H = w * 1.1547;                          // regular pointy-top hexagon
    var gap = w * 0.07;
    stepX = w + gap;
    rowStep = H * 0.75 + gap * 0.5;
    panMax = { x: Math.min(vw * 0.2, stepX * 1.6), y: Math.min(vh * 0.2, rowStep * 2) };

    var tileAt = {};
    TILES.forEach(function (t) { tileAt[t.q + "," + t.r] = t; });

    var HX = vw / 2 + panMax.x + stepX;
    var HY = vh / 2 + panMax.y + rowStep;
    var maxR = Math.hypot(HX, HY) * 0.92;
    var frag = document.createDocumentFragment();
    var rLim = Math.ceil(HY / rowStep) + 1;

    for (var r = -rLim; r <= rLim; r++) {
      var qMid = -r / 2;
      var qLim = Math.ceil(HX / stepX) + 1;
      for (var q = Math.floor(qMid - qLim); q <= Math.ceil(qMid + qLim); q++) {
        var px = (q + r / 2) * stepX, py = r * rowStep;
        if (Math.abs(px) > HX || Math.abs(py) > HY) continue;
        frag.appendChild(makeHex(tileAt[q + "," + r], px, py, maxR));
      }
    }
    world.appendChild(frag);
    sizeToys();
  }

  function makeHex(tile, px, py, maxR) {
    var el = document.createElement(tile ? (tile.href && !tile.toy ? "a" : "button") : "div");
    el.className = "hex";
    el.style.width = w + "px";
    el.style.height = H + "px";
    el.style.left = (vw / 2 + px - w / 2) + "px";
    el.style.top = (vh / 2 + py - H / 2) + "px";

    if (!tile) {                              // quiet texture, faded by distance
      el.className = "hex cell";
      var d = Math.hypot(px, py) / maxR;
      el.style.opacity = Math.max(0.06, 0.8 - d * 1.0).toFixed(3);
      return el;
    }

    el.classList.add("hex", "tile");
    el.style.setProperty("--hex-accent", tile.accent);
    if (tile.toy) {
      el.classList.add("toy");
      el.type = "button";
      var canvas = document.createElement("canvas");
      canvas.className = "toycanvas";
      el.appendChild(canvas);
      el.insertAdjacentHTML("beforeend", '<span class="name">' + tile.name + "</span>");
      var inst = window.HexToys[tile.toy](tile.accent);
      var rec = { tile: tile, canvas: canvas, ctx: canvas.getContext("2d"),
        inst: inst, w: 0, h: 0, last: 0 };
      live.push(rec);
      el.addEventListener("click", function (e) {
        if (dragMoved) return;
        e.preventDefault();
        openFocus(tile, inst, el);
      });
    } else {
      el.classList.add("door");
      el.href = tile.href;
      el.innerHTML = '<span class="name">' + tile.name +
        '</span><span class="blurb">' + tile.blurb + "</span>";
    }
    return el;
  }

  function sizeToys() {
    live.forEach(function (rec) {
      rec.w = w; rec.h = H;
      rec.canvas.width = Math.round(w * dpr);
      rec.canvas.height = Math.round(H * dpr);
      rec.canvas.style.width = w + "px";
      rec.canvas.style.height = H + "px";
      rec.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      rec.last = 0;
    });
  }

  // ---- panning: parallax from the mouse, plus drag -----------------------
  var pan = { x: 0, y: 0 }, target = { x: 0, y: 0 };
  var base = { x: 0, y: 0 }, par = { x: 0, y: 0 };
  var dragging = false, dragMoved = false, dragStart = null;

  function clamp(v, m) { return v < -m ? -m : v > m ? m : v; }

  function retarget() {
    target.x = clamp(base.x + par.x, panMax.x);
    target.y = clamp(base.y + par.y, panMax.y);
  }

  if (!REDUCED) {
    window.addEventListener("pointermove", function (e) {
      if (dragging || e.pointerType === "touch") return;
      par.x = -(e.clientX / vw * 2 - 1) * panMax.x * 0.85;
      par.y = -(e.clientY / vh * 2 - 1) * panMax.y * 0.85;
      retarget();
    });
  }

  field.addEventListener("pointerdown", function (e) {
    dragging = true; dragMoved = false;
    dragStart = { x: e.clientX, y: e.clientY, bx: base.x, by: base.y };
    field.setPointerCapture(e.pointerId);
  });
  field.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    var dx = e.clientX - dragStart.x, dy = e.clientY - dragStart.y;
    if (!dragMoved && Math.hypot(dx, dy) > 6) { dragMoved = true; field.classList.add("dragging"); }
    if (dragMoved) {
      base.x = clamp(dragStart.bx + dx, panMax.x);
      base.y = clamp(dragStart.by + dy, panMax.y);
      par.x = par.y = 0;
      retarget();
    }
  });
  function endDrag() { dragging = false; field.classList.remove("dragging"); }
  field.addEventListener("pointerup", endDrag);
  field.addEventListener("pointercancel", endDrag);
  // a drag must never fire a link/toy click
  field.addEventListener("click", function (e) {
    if (dragMoved) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  // ---- focus overlay: a toy opened large --------------------------------
  var focus = { open: false, inst: null, ptr: null };
  var overlay, fcanvas, fctx, fname, fhint, fvisit, fbox, fw = 0, fh = 0;

  function buildOverlay() {
    overlay = document.createElement("div");
    overlay.className = "hexfocus";
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="focus-backdrop"></div>' +
      '<div class="focus-box"><canvas class="focus-canvas"></canvas>' +
      '<div class="focus-cap"><span class="focus-name"></span>' +
      '<span class="focus-hint"></span>' +
      '<a class="focus-visit" hidden>visit →</a></div>' +
      '<button class="focus-close" aria-label="close">✕</button></div>';
    document.body.appendChild(overlay);
    fbox = overlay.querySelector(".focus-box");
    fcanvas = overlay.querySelector(".focus-canvas");
    fctx = fcanvas.getContext("2d");
    fname = overlay.querySelector(".focus-name");
    fhint = overlay.querySelector(".focus-hint");
    fvisit = overlay.querySelector(".focus-visit");

    overlay.querySelector(".focus-backdrop").addEventListener("click", closeFocus);
    overlay.querySelector(".focus-close").addEventListener("click", closeFocus);
    fcanvas.addEventListener("pointermove", function (e) {
      var r = fcanvas.getBoundingClientRect();
      focus.ptr = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
    });
    fcanvas.addEventListener("pointerleave", function () { focus.ptr = null; });
    window.addEventListener("keydown", function (e) { if (e.key === "Escape") closeFocus(); });
  }

  function openFocus(tile, inst, el) {
    if (!overlay) buildOverlay();
    focus.open = true; focus.inst = inst; focus.ptr = null;

    var size = Math.min(vw * 0.82, vh * 0.72, 560);
    fw = size; fh = size * 1.1547;
    if (fh > vh * 0.78) { fh = vh * 0.78; fw = fh / 1.1547; }
    fcanvas.width = Math.round(fw * dpr);
    fcanvas.height = Math.round(fh * dpr);
    fcanvas.style.width = fw + "px";
    fcanvas.style.height = fh + "px";
    fctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    fname.textContent = tile.name;
    fhint.textContent = inst.hint || tile.blurb;
    if (tile.href) {
      fvisit.hidden = false; fvisit.href = tile.href;
      fvisit.textContent = "visit " + tile.name + " →";
    } else { fvisit.hidden = true; }
    overlay.style.setProperty("--focus-accent", tile.accent);

    overlay.hidden = false;
    // grow from the clicked hex
    var rect = el.getBoundingClientRect();
    var dx = rect.left + rect.width / 2 - vw / 2;
    var dy = rect.top + rect.height / 2 - vh / 2;
    if (REDUCED) {
      overlay.classList.add("open");
    } else {
      fbox.style.transition = "none";
      fbox.style.transform = "translate(" + dx + "px," + dy + "px) scale(0.18)";
      requestAnimationFrame(function () {
        fbox.style.transition = "";
        fbox.style.transform = "translate(0,0) scale(1)";
        overlay.classList.add("open");
      });
    }
  }

  function closeFocus() {
    if (!focus.open) return;
    focus.open = false; focus.inst = null; focus.ptr = null;
    overlay.classList.remove("open");
    var done = function () { overlay.hidden = true; };
    if (REDUCED) { done(); }
    else {
      fbox.style.transform = "scale(0.9)";
      setTimeout(done, 240);
    }
  }

  // ---- one animation loop for every live toy ----------------------------
  function loop(t) {
    if (!document.hidden) {
      pan.x += (target.x - pan.x) * (REDUCED ? 1 : 0.09);
      pan.y += (target.y - pan.y) * (REDUCED ? 1 : 0.09);
      world.style.transform = "translate3d(" + pan.x.toFixed(1) + "px," + pan.y.toFixed(1) + "px,0)";

      if (focus.open && focus.inst) {
        fctx.clearRect(0, 0, fw, fh);
        focus.inst.draw(fctx, fw, fh, t, focus.ptr);
      }
      if (!REDUCED || !previewDrawn) {
        for (var i = 0; i < live.length; i++) {
          var rec = live[i];
          var fps = Math.min(rec.inst.fps || 30, 30);
          if (t - rec.last < 1000 / fps) continue;
          rec.last = t;
          rec.ctx.clearRect(0, 0, rec.w, rec.h);
          rec.inst.draw(rec.ctx, rec.w, rec.h, t, null);
        }
        previewDrawn = true;      // under reduced motion, a single static frame
      }
    }
    requestAnimationFrame(loop);
  }
  var previewDrawn = false;

  build();
  requestAnimationFrame(loop);

  var rt;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      previewDrawn = false;
      build();
      if (focus.open) closeFocus();
    }, 150);
  });
})();
