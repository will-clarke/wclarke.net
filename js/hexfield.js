/* hexfield.js - a pannable honeycomb of hexagons, shared by the homepage
   (js/hex.js) and the writing archive (js/writing.js).

   A field of big hexagons on an axial grid. A set of "special" hexes carry
   content (a live toy, a door, a post); the rest are quiet texture that fades
   toward the edges. One #world layer is translated to pan, so nothing redraws
   as you move. Every position comes from one axial-coordinate formula, so the
   tiling is correct by construction at any size.

   Two ways to look around: a gentle mouse parallax and a drag. On touch there
   is no hover, so the CENTRE of the screen becomes the cursor - whichever
   special hex you scroll nearest to it blooms open (see the loop).

   HexField(mount, cfg) where cfg = {
     specials: [{                       // content hexes; everything else is texture
       q, r,                            // axial position
       accent,                          // --hex-accent / --focus-accent colour
       link,                            // true -> the tile is an <a> (href navigates)
       href,                            // link target + focus "visit" button
       enter,                           // grow mode: navigate to href once the hex fills
                                        //   the screen (the fly-in becomes the page entry)
       tile(el),                        // decorate the tile's inner (spans etc.)
       preview(ctx, w, h, t),           // optional: draw a live tile canvas (toys)
       live(ctx, w, h, t, ptr),         // optional: draw the focus canvas (toys)
       focus: { cover, label, name, hint, visitText },  // what the dived-in hex shows
     }],
     hexWidth(vw, vh),                  // optional: px width of one hex
     explore,                           // true -> a large pannable space (writing);
                                        // false -> a small parallax around the centre (home)
   } */
window.HexField = function (mount, cfg) {
  var REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // touch/coarse pointers have no hover, so they browse by scrolling the centre.
  var COARSE = matchMedia("(hover: none), (pointer: coarse)").matches;
  var AUTO = COARSE && !REDUCED;
  // grow mode: the highlighted hex swells into a large hexagonal "page"
  // (see the grow subsystem below).
  var GROW = !!cfg.grow;

  var field = typeof mount === "string" ? document.getElementById(mount) : mount;
  var world = document.createElement("div");
  world.id = "world";
  field.appendChild(world);

  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var vw, vh, w, H, stepX, rowStep, haloPx = Infinity, panMax = { x: 0, y: 0 };
  var live = [];                 // preview tiles: {cell, canvas, ctx, w, h, last}
  var cellByKey = {};            // "q,r" -> hex element, for finding neighbours
  var tiles = [];                // special hexes: {el, px, py} for centre auto-focus

  function hexWidth() {
    return cfg.hexWidth ? cfg.hexWidth(vw, vh)
      : Math.max(112, Math.min(230, vw / 5.2));
  }

  // ---- layout ----------------------------------------------------------
  function build() {
    world.textContent = "";
    live = []; cellByKey = {}; tiles = []; shrink();
    if (grower) { performDismiss(); grow.g = 0; grow.el = null; grower.hidden = true; }
    vw = window.innerWidth; vh = window.innerHeight;

    w = hexWidth();
    H = w * 1.1547;                          // regular pointy-top hexagon
    var gap = w * 0.07;
    stepX = w + gap;
    rowStep = H * 0.75 + gap * 0.5;

    var specialAt = {}, specialPts = [], reach = { x: 0, y: 0 };
    cfg.specials.forEach(function (c) {
      specialAt[c.q + "," + c.r] = c;
      var px = (c.q + c.r / 2) * stepX, py = c.r * rowStep;
      specialPts.push({ px: px, py: py });
      reach.x = Math.max(reach.x, Math.abs(px));
      reach.y = Math.max(reach.y, Math.abs(py));
    });
    // halo: only keep texture within this many hexes of a special, so scattered
    // clusters read as islands (and the field stays light). Infinity = full field.
    haloPx = cfg.halo ? cfg.halo * stepX : Infinity;
    function nearSpecial(px, py) {
      var m = Infinity;
      for (var i = 0; i < specialPts.length; i++) {
        var d = Math.hypot(specialPts[i].px - px, specialPts[i].py - py);
        if (d < m) m = d;
      }
      return m;
    }

    // explore: open the pan wide enough to scroll every special through the
    // centre. parallax home: a small throw, but touch still needs to reach the
    // outer ring, so touch uses the explore extent too.
    var exploreMax = { x: reach.x + w * 0.6, y: reach.y + H * 0.6 };
    panMax = (cfg.explore || AUTO) ? exploreMax
      : { x: Math.min(vw * 0.2, stepX * 1.6), y: Math.min(vh * 0.2, rowStep * 2) };

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
        var cell = specialAt[q + "," + r];
        var near = cell ? 0 : nearSpecial(px, py);
        if (!cell && near > haloPx) continue;       // outside every cluster halo
        frag.appendChild(makeHex(q, r, cell, px, py, maxR, near));
      }
    }
    world.appendChild(frag);
    sizeLive();
  }

  function makeHex(q, r, cell, px, py, maxR, near) {
    var el = document.createElement(cell ? (cell.link ? "a" : "button") : "div");
    el.className = "hex";
    el.style.width = w + "px";
    el.style.height = H + "px";
    el.style.left = (vw / 2 + px - w / 2) + "px";
    el.style.top = (vh / 2 + py - H / 2) + "px";
    el.dataset.q = q; el.dataset.r = r;
    cellByKey[q + "," + r] = el;

    if (!cell) {                              // quiet texture
      el.className = "hex cell";
      // halo mode: fade out from each cluster. otherwise: fade from the centre.
      var o = isFinite(haloPx)
        ? 0.5 - (near / haloPx) * 0.44
        : 0.8 - (Math.hypot(px, py) / maxR) * 1.0;
      el.style.opacity = Math.max(0.06, o).toFixed(3);
      return el;
    }

    el.classList.add("hex", "tile");
    el.__cell = cell; el.__px = px; el.__py = py;
    tiles.push({ el: el, px: px, py: py });
    el.style.setProperty("--hex-accent", cell.accent);

    if (cell.preview) {
      var canvas = document.createElement("canvas");
      canvas.className = "toycanvas";
      el.appendChild(canvas);
      live.push({ cell: cell, canvas: canvas, ctx: canvas.getContext("2d"), w: 0, h: 0, last: 0 });
    }
    if (cell.link) el.href = cell.href;
    if (cell.tile) cell.tile(el);

    if (GROW) {                                // click/tap opens a hex; pinch (touch) also grows it
      // a portal tile (dive:false) skips grow entirely: it's a plain <a> that
      // navigates, so a cross-document view transition zooms it into its page.
      if (cell.dive === false) return el;
      el.addEventListener("click", function (e) {
        if (dragMoved) return;
        // modifier/middle clicks on a real link keep normal navigation (open in a tab)
        if (cell.link && (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) return;
        e.preventDefault();
        // open a resting hex; a click mid-grow backs out (the window handler below).
        if (grow.g <= 0.02 || grow.committed) commitGrow(el, cell);
      });
      return el;
    }

    el.addEventListener("pointerenter", function (e) { if (e.pointerType !== "touch") enlarge(el); });
    el.addEventListener("pointerleave", function () { shrink(); });
    el.addEventListener("focusin", function () { enlarge(el); });
    el.addEventListener("focusout", function () { shrink(); });
    el.addEventListener("click", function (e) {
      if (dragMoved) return;
      // a "portal" tile (dive:false) just navigates, so a cross-document view
      // transition can zoom it into the next page.
      if (cell.dive === false) return;
      // modifier/middle clicks on a real link keep normal navigation
      if (cell.link && (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) return;
      e.preventDefault();
      openFocus(cell, el);
    });
    return el;
  }

  function sizeLive() {
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

  // ---- enlarge: grow the focused hex, shrink neighbours toward their far side
  // The focus scales up about its own centre. Each neighbour scales down about
  // the edge facing AWAY from the focus, so that far edge holds still and only
  // the near edge recedes - the most room freed for the least shrink.
  var NB = [[1, 0], [-1, 0], [0, -1], [0, 1], [1, -1], [-1, 1]];
  var ORIGIN = {                    // far edge of a neighbour in each direction
    "1,0": "100% 50%", "-1,0": "0% 50%", "0,-1": "25% 12.5%",
    "0,1": "75% 87.5%", "1,-1": "75% 12.5%", "-1,1": "25% 87.5%",
  };
  var focused = null, receded = [];

  function enlarge(el, auto) {
    // auto = driven by the centre-of-screen tracker, which must keep working
    // while the field is being dragged (that is the whole point on touch).
    if (focused === el || (dragging && !auto)) return;
    shrink();
    focused = el;
    el.style.transformOrigin = "";  // the focus grows about its own centre
    el.classList.add("enlarged");
    var q = +el.dataset.q, r = +el.dataset.r;
    NB.forEach(function (d) {
      var nb = cellByKey[(q + d[0]) + "," + (r + d[1])];
      if (!nb) return;
      nb.style.transformOrigin = ORIGIN[d[0] + "," + d[1]];
      nb.classList.add("receded");
      receded.push(nb);
    });
  }
  function shrink() {
    if (focused) focused.classList.remove("enlarged");
    receded.forEach(function (nb) {
      nb.classList.remove("receded");
      nb.style.transformOrigin = "";
    });
    receded = []; focused = null;
  }

  // the special hex nearest the middle of the screen (world is translated by
  // pan, so screen-centre lands on the tile whose offset ≈ -pan).
  function centreObj() {
    var best = null, bd = Infinity;
    for (var i = 0; i < tiles.length; i++) {
      var d = Math.hypot(tiles[i].px + pan.x, tiles[i].py + pan.y);
      if (d < bd) { bd = d; best = tiles[i]; }
    }
    return best;
  }
  function centreTile() { var o = centreObj(); return o ? o.el : null; }

  // ---- panning: parallax from the mouse, plus drag -----------------------
  var pan = { x: 0, y: 0 }, target = { x: 0, y: 0 };
  var base = { x: 0, y: 0 }, par = { x: 0, y: 0 };
  var down = false, dragging = false, dragMoved = false, dragStart = null;

  function clamp(v, m) { return v < -m ? -m : v > m ? m : v; }
  function retarget() {
    target.x = clamp(base.x + par.x, panMax.x);
    target.y = clamp(base.y + par.y, panMax.y);
  }

  if (!REDUCED) {
    window.addEventListener("pointermove", function (e) {
      if (dragging || e.pointerType === "touch") return;
      if (GROW && grow.g > 0.02) return;      // hold the field still while a hex is growing
      par.x = -(e.clientX / vw * 2 - 1) * panMax.x * 0.85;
      par.y = -(e.clientY / vh * 2 - 1) * panMax.y * 0.85;
      retarget();
    });
  }

  field.addEventListener("pointerdown", function (e) {
    down = true; dragging = false; dragMoved = false;
    dragStart = { x: e.clientX, y: e.clientY, bx: base.x, by: base.y, id: e.pointerId };
  });
  field.addEventListener("pointermove", function (e) {
    if (!down) return;
    var dx = e.clientX - dragStart.x, dy = e.clientY - dragStart.y;
    if (!dragMoved && Math.hypot(dx, dy) > 6) {
      // only now is it a drag - capture so it keeps tracking, and stop hover
      dragMoved = true; dragging = true;
      field.classList.add("dragging"); shrink();
      field.setPointerCapture(dragStart.id);
    }
    if (dragMoved) {
      base.x = clamp(dragStart.bx + dx, panMax.x);
      base.y = clamp(dragStart.by + dy, panMax.y);
      par.x = par.y = 0;
      retarget();
    }
  });
  function endDrag() { down = false; dragging = false; field.classList.remove("dragging"); }
  field.addEventListener("pointerup", endDrag);
  field.addEventListener("pointercancel", endDrag);
  // a drag must never fire a link/tile click
  field.addEventListener("click", function (e) {
    if (dragMoved) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  // click-to-cancel: while a hex is mid-grow (not yet a committed page), a click
  // anywhere backs it out - so poking a hex to peek never traps you. Capture phase
  // + stopPropagation so it wins over the tile's own click. suppressClick guards
  // against the synthetic click a finger-lift can fire at the end of a pinch.
  var suppressClick = false;
  window.addEventListener("click", function (e) {
    if (suppressClick || grow.committed || grow.g <= 0.02) return;
    e.preventDefault(); e.stopPropagation();
    cancelGrow();
  }, true);

  // ---- pinch to grow (touch) --------------------------------------------
  // Two fingers grow the centred hex directly: spread to open it, pinch back to
  // shrink (or, on a committed page, to go back). Listeners live on window so a
  // pinch-out still lands over a committed page.
  var ptrs = {}, pinch = null;

  function twoDist() {
    var k = Object.keys(ptrs);
    return Math.hypot(ptrs[k[0]].x - ptrs[k[1]].x, ptrs[k[0]].y - ptrs[k[1]].y);
  }
  function startPinch() {
    endDrag(); down = false;                     // a second finger cancels any drag
    pinch = { startDist: twoDist() };
    grow.pinching = true; grow.pinchG = 0;       // hold it alive at g=0 until the fingers spread
    var c = centreObj();
    if (c) startGrow(c.el, c.el.__cell);         // grow the hex nearest the centre
  }
  function movePinch() {
    if (!pinch || Object.keys(ptrs).length < 2) return;
    var s = twoDist() / pinch.startDist;
    if (grow.committed) {                        // pinch in on a page -> back up a level
      if (s < 0.85) { requestDismiss(); pinch = null; }
      return;
    }
    grow.pinching = true;
    grow.pinchG = clamp01((s - 1) / 0.9);        // spread ~1.9x to open fully
  }
  function endPinch() {
    pinch = null;
    grow.pinching = false;
    // a finger-lift can synthesize a click - don't let it trip click-to-cancel.
    suppressClick = true;
    setTimeout(function () { suppressClick = false; }, 350);
    if (grow.committed) return;
    if (grow.g >= LOCK) grow.opening = true;     // a decent pinch finishes opening on its own
    // else: not opening, not pinching -> it flies back out (grow.el kept until g<=0)
  }

  window.addEventListener("pointerdown", function (e) {
    ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (GROW && Object.keys(ptrs).length === 2) startPinch();
  });
  window.addEventListener("pointermove", function (e) {
    if (!ptrs[e.pointerId]) return;
    ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (pinch) movePinch();
  });
  function liftPointer(e) {
    if (!ptrs[e.pointerId]) return;
    delete ptrs[e.pointerId];
    if (pinch && Object.keys(ptrs).length < 2) endPinch();
  }
  window.addEventListener("pointerup", liftPointer);
  window.addEventListener("pointercancel", liftPointer);

  // ---- focus overlay: a hex dived into, filling most of the screen ------
  var focus = { open: false, live: null, ptr: null };
  var overlay, fhex, fcanvas, fctx, flabel, fname, fhint, fvisit, fbox, fw = 0, fh = 0;

  function buildOverlay() {
    overlay = document.createElement("div");
    overlay.className = "hexfocus";
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="focus-backdrop"></div>' +
      '<div class="focus-box">' +
      '<div class="focus-hex"><canvas class="focus-canvas"></canvas>' +
      '<span class="focus-label"></span></div>' +
      '<div class="focus-cap"><span class="focus-name"></span>' +
      '<span class="focus-hint"></span>' +
      '<a class="focus-visit" hidden>visit →</a></div>' +
      '<button class="focus-close" aria-label="close">✕</button></div>';
    document.body.appendChild(overlay);
    fbox = overlay.querySelector(".focus-box");
    fhex = overlay.querySelector(".focus-hex");
    fcanvas = overlay.querySelector(".focus-canvas");
    fctx = fcanvas.getContext("2d");
    flabel = overlay.querySelector(".focus-label");
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

  function openFocus(cell, el) {
    if (!overlay) buildOverlay();
    shrink();
    focus.open = true; focus.live = cell.live || null; focus.ptr = null;

    // fill most of the screen, leaving room below for the caption
    fw = Math.min(vw * 0.92, (vh - 170) / 1.1547);
    fh = fw * 1.1547;
    fcanvas.width = Math.round(fw * dpr);
    fcanvas.height = Math.round(fh * dpr);
    fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fctx.clearRect(0, 0, fw, fh);
    fhex.style.width = fw + "px";
    fhex.style.height = fh + "px";
    overlay.style.setProperty("--focus-accent", cell.accent);

    var f = cell.focus || {};
    var cover = !!f.cover;
    fbox.classList.toggle("cover", cover);
    flabel.textContent = cover ? (f.label || "") : "";
    fname.textContent = f.name || "";
    fname.style.display = f.name ? "" : "none";
    fhint.textContent = f.hint || "";
    fhex.onclick = cover && cell.href ? function () { window.location = cell.href; } : null;
    if (cell.href) {
      fvisit.hidden = false; fvisit.href = cell.href;
      fvisit.textContent = f.visitText || "visit →";
    } else { fvisit.hidden = true; }

    overlay.hidden = false;
    // dive out of the clicked hex
    var rect = el.getBoundingClientRect();
    var dx = rect.left + rect.width / 2 - vw / 2;
    var dy = rect.top + rect.height / 2 - vh / 2;
    if (REDUCED) {
      overlay.classList.add("open");
    } else {
      fbox.style.transition = "none";
      fbox.style.transform = "translate(" + dx + "px," + dy + "px) scale(0.12)";
      void fbox.offsetWidth;              // commit the start frame, so it animates
      fbox.style.transition = "";
      fbox.style.transform = "translate(0,0) scale(1)";
      overlay.classList.add("open");
    }
  }

  function closeFocus() {
    if (!focus.open) return;
    focus.open = false; focus.live = null; focus.ptr = null;
    lastCentre = null;               // re-announce the centre once we are back
    overlay.classList.remove("open");
    var done = function () { overlay.hidden = true; };
    if (REDUCED) { done(); }
    else {
      fbox.style.transform = "scale(0.9)";
      setTimeout(done, 240);
    }
  }

  // ---- grow-to-page (cfg.grow) ------------------------------------------
  // Click/tap (or pinch) flies into a hex: the honeycomb dollies in - scaling up
  // about the tile and sliding it to the centre - while a full-screen page fades in
  // on top, its hexagon clip opening out to a rectangle to reveal the corners and
  // its content rising in around a still central title. g runs 0..1; reach 1 and it
  // commits. `opening` drives it to full on its own (a click, or a pinch released
  // past halfway); a pinch sets g by hand.
  var grow = { el: null, cell: null, g: 0, px: 0, py: 0, pan0: { x: 0, y: 0 },
               opening: false, committed: false, pinching: false, pinchG: 0,
               pushed: false, prevT: 0 };
  var grower, growPageInner, growBack;
  var GROW_MS = 750, SHRINK_MS = 320, LOCK = 0.5;   // open/close durations; a pinch past LOCK finishes opening
  var FLY = 3;                                      // how far the honeycomb dollies in behind the page

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  function buildGrower() {
    grower = document.createElement("div");
    grower.className = "hexgrow";
    grower.hidden = true;
    grower.innerHTML = '<div class="grow-page"><div class="grow-page-inner"></div></div>';
    document.body.appendChild(grower);
    growPageInner = grower.querySelector(".grow-page-inner");
    // the close button lives OUTSIDE the grower - the grower grows past the screen
    // and has a filter, so a child can't be pinned to the viewport corner. This can.
    growBack = document.createElement("button");
    growBack.className = "grow-back";
    growBack.setAttribute("aria-label", "close");
    growBack.textContent = "✕";
    document.body.appendChild(growBack);
    growBack.addEventListener("click", function (e) { e.stopPropagation(); requestDismiss(); });
    window.addEventListener("keydown", function (e) { if (e.key === "Escape") requestDismiss(); });
  }

  function startGrow(el, cell) {               // stage a hex as the growth target
    if (grow.committed || grow.el === el) return;
    if (cell.dive === false) return;             // portals navigate; never grow (e.g. a centred pinch)
    if (!grower) buildGrower();
    grow.el = el; grow.cell = cell;
    el.classList.add("growing");                 // hide the tile's own label; the page title is the one stable word
    grow.px = el.__px || 0; grow.py = el.__py || 0;
    grow.pan0 = { x: pan.x, y: pan.y };          // freeze the camera; the fly-in starts here
    growPageInner.innerHTML = (cell.page && cell.page.html) || "";
    grower.style.setProperty("--grow-accent", cell.accent);
    grower.hidden = false;
  }
  // a click/tap opens deliberately: keep growing to full without further input.
  function commitGrow(el, cell) { startGrow(el, cell); grow.opening = true; }
  // a click on a growing hex backs out: stop opening so it flies back out.
  function cancelGrow() { grow.opening = false; }

  // retreat the page back into the honeycomb (the fly-in reverses as g -> 0). Every
  // "back" gesture funnels here: Esc, the ✕, a pinch-out and the browser/Android Back.
  function performDismiss() {
    grow.pushed = false;
    grow.committed = false; grow.opening = false; grow.pinching = false;
    if (grower) grower.classList.remove("committed");
    if (growBack) { growBack.style.opacity = "0"; growBack.style.pointerEvents = "none"; }
  }
  // user-initiated back: if opening the page pushed a history entry, pop it so the
  // URL/history stays honest - that popstate then runs performDismiss once.
  function requestDismiss() {
    if (!grow.committed && grow.g === 0) return;
    if (grow.pushed) history.back();
    else performDismiss();
  }
  window.addEventListener("popstate", function () {
    if (grow.committed || grow.g > 0) performDismiss();
  });

  function updateGrow(t) {
    if (!GROW) return;
    var dt = grow.prevT ? Math.min(50, t - grow.prevT) : 16;
    grow.prevT = t;
    // A pinch sets g by hand. Otherwise it advances while `opening` (a click, or a
    // pinch released past halfway) and recedes the moment that stops being true.
    if (grow.committed) { /* hold the page */ }
    else if (grow.pinching) grow.g = grow.pinchG;
    else if (grow.opening) grow.g += dt / GROW_MS;
    else grow.g -= dt / SHRINK_MS;

    if (grow.g <= 0 && !grow.pinching) {         // fully receded (and not mid-pinch) - put it away
      grow.g = 0; grow.opening = false;
      if (grow.el) grow.el.classList.remove("growing");
      if (grower && !grower.hidden) { grower.hidden = true; grow.el = null; }
      return;
    }
    if (grow.g < 0) grow.g = 0;
    if (grow.g >= 1 && !grow.committed) {
      grow.g = 1; grow.committed = true;
      grower.classList.add("committed");
      // an `enter` tile isn't a demo page you read - the fly-in IS the transition
      // into its own page, so once the hex fills the screen we navigate straight in.
      if (grow.cell && grow.cell.enter && grow.cell.href) { location.href = grow.cell.href; return; }
      if (!grow.pushed) { try { history.pushState({ hexgrow: 1 }, ""); grow.pushed = true; } catch (e) {} }
    }
    renderGrow();
  }

  function renderGrow() {
    var g = grow.g;
    var e = 1 - (1 - g) * (1 - g);               // easeOut, matching the world dive
    // a PERFECT regular hexagon (standard hex clip, ratio locked to 1:1.1547): scale
    // it up from the tile until it engulfs the whole screen, drifting to centre.
    // Because it only ever SCALES - never morphs - the angles stay a true hexagon the
    // whole way; by the end its edges are off-screen so it reads as a full-screen page.
    var endW = 1.06 * (0.5 * vw + 0.866 * vh);   // wide enough that the hexagon covers every corner
    var W = w + (endW - w) * e, Hh = W * 1.1547;
    var scx = vw / 2 + grow.px + grow.pan0.x, scy = vh / 2 + grow.py + grow.pan0.y;
    var cx = scx + (vw / 2 - scx) * e, cy = scy + (vh / 2 - scy) * e;
    grower.style.left = (cx - W / 2) + "px";
    grower.style.top = (cy - Hh / 2) + "px";
    grower.style.width = W + "px";
    grower.style.height = Hh + "px";
    grower.style.opacity = clamp01(g / 0.12).toFixed(3);
    // the central title holds still; the rest rises + fades in around it.
    growPageInner.style.setProperty("--title-op", clamp01((g - 0.35) / 0.2).toFixed(2));
    var bp = clamp01((g - 0.58) / 0.3);
    growPageInner.style.setProperty("--body-op", bp.toFixed(2));
    growPageInner.style.setProperty("--body-y", ((1 - bp) * 16).toFixed(1) + "px");
    growBack.style.opacity = grow.committed ? "1" : "0";
    growBack.style.pointerEvents = grow.committed ? "auto" : "none";
  }

  // ---- one animation loop for pan + every live preview ------------------
  var previewDrawn = false, lastCentre = null;
  function loop(t) {
    if (!document.hidden) {
      // a live drag tracks the finger 1:1 (no lag); the gentle easing is only for
      // the mouse-parallax drift and the settle after you let go.
      var k = (REDUCED || dragging) ? 1 : 0.18;
      pan.x += (target.x - pan.x) * k;
      pan.y += (target.y - pan.y) * k;
      if (GROW && grow.el && grow.g > 0.0005) {
        // fly the camera into the target hex: scale the honeycomb up about it and
        // slide it to the centre, so you dive in as the page forms on top. easeOut
        // so the dive rushes in early (you actually see it before the page covers).
        var a = 1 - (1 - grow.g) * (1 - grow.g), S = 1 + a * FLY;
        var tx = grow.pan0.x + a * (-(1 + FLY) * grow.px - grow.pan0.x);
        var ty = grow.pan0.y + a * (-(1 + FLY) * grow.py - grow.pan0.y);
        world.style.transform = "translate3d(" + tx.toFixed(1) + "px," + ty.toFixed(1) + "px,0) scale(" + S.toFixed(3) + ")";
      } else {
        world.style.transform = "translate3d(" + pan.x.toFixed(1) + "px," + pan.y.toFixed(1) + "px,0)";
      }

      // whichever special hex is under the middle of the screen is the "centred"
      // one: touch uses it as its cursor (blooms or grows it), and cfg.onCentre
      // is told so a page can react (the writing archive floats the cluster name).
      if (!focus.open) {
        var c = centreTile();
        if (c !== lastCentre) {
          lastCentre = c;
          if (cfg.onCentre) cfg.onCentre(c ? c.__cell : null);
          // grow is driven by hover (desktop) or pinch (touch), never by centring;
          // non-grow fields still bloom the centred hex on touch.
          if (!GROW && AUTO && c) enlarge(c, true);
        }
      }
      updateGrow(t);

      if (focus.open && focus.live) {
        fctx.clearRect(0, 0, fw, fh);
        focus.live(fctx, fw, fh, t, focus.ptr);
      }
      if ((!REDUCED || !previewDrawn) && live.length) {
        for (var i = 0; i < live.length; i++) {
          var rec = live[i];
          var fps = Math.min(rec.cell.fps || 30, 30);
          if (t - rec.last < 1000 / fps) continue;
          rec.last = t;
          rec.ctx.clearRect(0, 0, rec.w, rec.h);
          rec.cell.preview(rec.ctx, rec.w, rec.h, t);
        }
        previewDrawn = true;      // under reduced motion, a single static frame
      }
    }
    requestAnimationFrame(loop);
  }

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
};
