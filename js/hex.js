/* hex.js - the honeycomb homepage.

   Thirteen special hexes sit at the centre of a pannable field (js/hexfield.js).
   Most swell into a small demo page on click.

   The "games" hex is different: it holds a spiral of faceted gem-hexes, one per
   game. Clicking it dives IN - a full-screen overlay (built once, in memory)
   grows straight out of the games hex so the game hexes fill the screen, with the
   neighbouring hexes framing the edges. It's one CSS transform, same document, no
   navigation - tap a game to play it, tap the edges / backdrop / Esc to zoom back
   out. (No-JS or a modifier-click still just opens /games/.) */
(function () {
  // {q,r} on an axial grid centred on (0,0). name/accent style the hex; blurb +
  // body are the demo page copy; href points at the real thing.
  var TILES = [
    { q: 0,  r: 0,  name: "polyhedra", accent: "#8c6bd6", href: "/games/polyhedra/",              blurb: "shapes from a seed",     body: "A rotating wireframe polyhedron grown from a single seed number - nudge the seed and the whole solid reforms." },
    { q: 1,  r: 0,  name: "neural",    accent: "#d84f9a", href: null,                              blurb: "position → colour",       body: "A tiny neural network paints a colour for every point on the plane, and you watch the field settle as it learns." },
    { q: -1, r: 0,  name: "fractal",   accent: "#1f9fce", href: "https://intuition.wclarke.net",   blurb: "a julia set",             body: "A Julia set you can steer: drag the constant and the whole basin of the fractal reshapes around your cursor." },
    { q: -1, r: 1,  name: "life",      accent: "#2fae63", href: null,                              blurb: "it just evolves",         body: "Conway's Game of Life, left to its own devices - gliders, blinkers and the occasional glider gun." },
    { q: 2,  r: 0,  name: "recursion", accent: "#e0912a", href: null,                              blurb: "hexes in hexes",          body: "Hexagons packed inside hexagons inside hexagons, all the way down until the pixels give up." },

    { q: 1,  r: -1, name: "games",     accent: "#8f4222", href: "/games/", crystal: true,          blurb: "puzzle games",            body: "A cabinet of small puzzle games - Sokoban variants, a paint machine and other daft little contraptions." },
    { q: 0,  r: -1, name: "intuition", accent: "#2f8f8a", href: "https://intuition.wclarke.net", blurb: "maths, poked",            body: "Interactive maths toys: poke a theorem until the intuition behind it falls out." },
    { q: 0,  r: 1,  name: "writing",   accent: "#556071", href: "/writing-hex.html",             blurb: "occasional notes",        body: "Notes on vim, unix and git, plus a handful of short stories - arranged as their own honeycomb." },
    { q: 0,  r: -2, name: "museum",    accent: "#b8791f", href: "/museum/", portal: true,          blurb: "sites since 2014",        body: "Every version of this site since 2014, rebuilt and preserved - watch the taste change over a decade." },
    { q: 2,  r: -2, name: "github",    accent: "#5a6270", href: "https://github.com/will-clarke", blurb: "the code",                body: "The source behind all of this, warts and terse commit messages included." },
    { q: 0,  r: 2,  name: "about",     accent: "#a1633f", href: "/about.html",                    blurb: "hello",                   body: "Hello - I'm Will. I build small things for fun and every so often write about them." },
    { q: -2, r: 2,  name: "cinema",    accent: "#c0435a", href: "https://classiccult.pages.dev/", blurb: "london film listings",    body: "What's on at London's repertory cinemas this week, scraped and sorted so you don't have to." },
    { q: -2, r: 0,  name: "projects",  accent: "#7d4bcf", href: "/projects.html",                 blurb: "the full cabinet",        body: "The full cabinet - everything above, plus the odds and ends that never got their own hex." },
  ];

  // the games, in cabinet order. A fallback so the gems + zoom render instantly;
  // the live games.json overwrites it. Keep roughly in step with that file.
  var GAMES = [
    { slug: "shipshape", name: "Shipshape", accent: "#7fd4ff" },
    { slug: "fathom", name: "Fathom", accent: "#2fe6c9" },
    { slug: "lumen", name: "Lumen", accent: "#ffb43a" },
    { slug: "cascade", name: "Cascade", accent: "#3ad9ff" },
    { slug: "fracture", name: "Fracture", accent: "#ff5a6e" },
    { slug: "selfie", name: "Selfie", accent: "#ff7ac2" },
    { slug: "seed", name: "Seed", accent: "#57e08a" },
    { slug: "loom", name: "Loom", accent: "#b98cff" },
    { slug: "echo", name: "Echo", accent: "#5cd6ff" },
    { slug: "debt", name: "Debt", accent: "#b48cff" },
  ];

  function esc(s) {
    return s.replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  // axial neighbour dirs, in ring order - same spiral as the cabinet (js/games.js).
  var DIR = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
  function spiral(n) {
    var out = [{ q: 0, r: 0 }];
    for (var k = 1; out.length < n; k++) {
      var q = DIR[4][0] * k, r = DIR[4][1] * k;
      for (var side = 0; side < 6 && out.length < n; side++) {
        for (var i = 0; i < k && out.length < n; i++) {
          out.push({ q: q, r: r });
          q += DIR[side][0]; r += DIR[side][1];
        }
      }
    }
    return out;
  }

  // mix a #rrggbb toward white (pct>0) or black (pct<0), pct in -100..100
  function mix(hex, pct) {
    var n = parseInt(hex.slice(1), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    var t = pct < 0 ? 0 : 255, p = Math.abs(pct) / 100;
    r = Math.round(r + (t - r) * p); g = Math.round(g + (t - g) * p); b = Math.round(b + (t - b) * p);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  // per-facet lightness (light from up-and-left) - a flat hexagon read as a gem.
  var FACET = [8, -6, -20, -24, -4, 22];

  // the resting games hex: a faceted gem cluster, laid out in the cabinet's spiral.
  function buildGems(games) {
    var cells = spiral(games.length), maxX = 0, maxR = 0;
    var pos = cells.map(function (c) {
      var x = c.q + c.r / 2;
      if (Math.abs(x) > maxX) maxX = Math.abs(x);
      if (Math.abs(c.r) > maxR) maxR = Math.abs(c.r);
      return { x: x, r: c.r };
    });
    var SX = 1.07, RY = 0.78;
    var gw = Math.min(0.47 / (maxX * SX + 0.5), 0.47 / (maxR * RY + 0.5));
    var half = gw * 50, side = (gw * 100).toFixed(2);
    return games.map(function (g, i) {
      var acc = g.accent || "#3ad9ff";
      var left = (50 + pos[i].x * SX * gw * 100 - half).toFixed(2);
      var top = (50 + pos[i].r * RY * gw * 100 - half).toFixed(2);
      var conic = "conic-gradient(from 0deg," + FACET.map(function (d, j) {
        return mix(acc, d) + " " + (j * 60) + "deg " + ((j + 1) * 60) + "deg";
      }).join(",") + ")";
      var spark = "radial-gradient(circle at 34% 22%,rgba(255,255,255,0.55),rgba(255,255,255,0) 38%)";
      return '<span class="cx-gem" style="left:' + left + "%;top:" + top +
        "%;width:" + side + "%;height:" + side + "%;background:" + spark + "," + conic + ';"></span>';
    }).join("");
  }

  function pageHtml(t) {
    var h = '<h1 class="grow-h">' + esc(t.name) + "</h1>" + '<div class="grow-rest">' +
      '<p class="grow-sub">' + esc(t.blurb) + "</p>" +
      '<p class="grow-body">' + esc(t.body) + "</p>";
    if (t.href) h += '<a class="grow-visit" href="' + esc(t.href) + '">open ' + esc(t.name) + " →</a>";
    h += '<p class="grow-demo">demo page · esc or ✕ to close</p></div>';
    return h;
  }

  // ---- the games zoom ----------------------------------------------------
  // A full-screen overlay, built once and kept in the DOM. Its .gz-stage holds
  // the game hexes (sharp, centred) plus the faded neighbour hexes (framing the
  // edges). Opening transforms the stage from "shrunk into the games hex" to
  // identity, so the whole scene grows out of that hex; closing reverses it.
  var gamesTileEl = null;        // the resting games hex, so the zoom knows where to grow from / back into
  var gamesList = GAMES.slice();
  var gz, gzStage, gzHexEls = [], clusterW = 0;
  var REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;

  var EDGES = [
    ["gz-edge-left", "intuition", "#2f8f8a"],
    ["gz-edge-tr", "github", "#5a6270"],
    ["gz-edge-br", "neural", "#d84f9a"],
    ["gz-edge-bl", "polyhedra", "#8c6bd6"],
  ];

  function buildOverlay() {
    gz = document.createElement("div");
    gz.id = "gz"; gz.hidden = true;
    gz.innerHTML = '<div class="gz-backdrop"></div><div class="gz-stage"></div>' +
      '<button class="gz-close" type="button" aria-label="close">✕</button>';
    gzStage = gz.querySelector(".gz-stage");
    EDGES.forEach(function (e) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "gz-edge " + e[0];
      b.style.setProperty("--a", e[2]);
      b.innerHTML = "<span>" + esc(e[1]) + "</span>";
      b.addEventListener("click", closeZoom);
      gzStage.appendChild(b);
    });
    document.body.appendChild(gz);
    gz.querySelector(".gz-backdrop").addEventListener("click", closeZoom);
    gz.querySelector(".gz-close").addEventListener("click", closeZoom);
    renderHexes();
  }

  function renderHexes() {
    gzHexEls.forEach(function (el) { el.remove(); });
    gzHexEls = [];
    gamesList.forEach(function (g) {
      var a = document.createElement("a");
      a.className = "gz-hex";
      a.href = "/games/" + g.slug + "/";
      a.style.setProperty("--a", g.accent || "#3ad9ff");
      a.innerHTML = "<span>" + esc(g.name) + "</span>";
      gzStage.appendChild(a);
      gzHexEls.push(a);
    });
  }

  // place the game hexes in the cabinet spiral, centred, sized to fit the viewport
  function layout() {
    var vw = window.innerWidth, vh = window.innerHeight;
    var cells = spiral(gamesList.length), maxX = 0, maxR = 0;
    var pos = cells.map(function (c) {
      var x = c.q + c.r / 2;
      if (Math.abs(x) > maxX) maxX = Math.abs(x);
      if (Math.abs(c.r) > maxR) maxR = Math.abs(c.r);
      return { x: x, r: c.r };
    });
    var hexW = Math.min(vw * 0.44 / (1.07 * maxX + 0.5), vh * 0.44 / (0.9 * maxR + 0.577));
    var hexH = hexW * 1.1547, stepX = hexW * 1.07, rowStep = hexW * 0.9;
    var cx = vw / 2, cy = vh / 2;
    gzHexEls.forEach(function (el, i) {
      el.style.width = hexW + "px"; el.style.height = hexH + "px";
      el.style.left = (cx + pos[i].x * stepX - hexW / 2) + "px";
      el.style.top = (cy + pos[i].r * rowStep - hexH / 2) + "px";
    });
    clusterW = 2 * (maxX * stepX + hexW / 2);
  }

  // the transform that shrinks the (full-viewport) stage into a hex's rect, so the
  // game cluster sits at that hex, roughly its size
  function stageInto(el) {
    var r = el.getBoundingClientRect(), vw = window.innerWidth, vh = window.innerHeight;
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var s = Math.max(0.05, r.width / (clusterW || vw));
    return "translate(" + (cx - vw / 2).toFixed(1) + "px," + (cy - vh / 2).toFixed(1) +
      "px) scale(" + s.toFixed(4) + ")";
  }

  function openZoom(fromEl) {
    if (!gz) buildOverlay();
    layout();
    gz.hidden = false;
    gzStage.style.transition = "none";
    gzStage.style.transformOrigin = "50% 50%";
    gzStage.style.transform = stageInto(fromEl);
    gzStage.style.opacity = "0.35";
    void gz.offsetWidth;                             // commit the start state before animating
    gz.classList.add("open");
    if (REDUCE) {
      gzStage.style.transform = "none"; gzStage.style.opacity = "1";
    } else {
      gzStage.style.transition = "transform 0.55s cubic-bezier(0.2,0.7,0.25,1), opacity 0.4s ease";
      gzStage.style.transform = "none";
      gzStage.style.opacity = "1";
    }
    document.addEventListener("keydown", onKey);
  }

  function closeZoom() {
    if (!gz || gz.hidden) return;
    document.removeEventListener("keydown", onKey);
    gz.classList.remove("open");
    if (REDUCE || !gamesTileEl) { gz.hidden = true; return; }
    gzStage.style.transition = "transform 0.5s cubic-bezier(0.4,0,0.2,1), opacity 0.4s ease";
    gzStage.style.transform = stageInto(gamesTileEl);
    gzStage.style.opacity = "0";
    var done = function (e) {
      if (e.target !== gzStage || e.propertyName !== "transform") return;
      gzStage.removeEventListener("transitionend", done);
      gz.hidden = true;
    };
    gzStage.addEventListener("transitionend", done);
  }

  function onKey(e) { if (e.key === "Escape") closeZoom(); }

  window.addEventListener("resize", function () { if (gz && !gz.hidden) layout(); });

  // ---- build the field ---------------------------------------------------
  var specials = TILES.map(function (t) {
    // the games hex: dives into the zoom overlay (href is a no-JS fallback).
    if (t.crystal) {
      return {
        q: t.q, r: t.r, accent: t.accent, link: true, href: t.href, dive: false,
        tile: function (el) {
          gamesTileEl = el;
          el.classList.add("crystal-tile");
          el.innerHTML = buildGems(gamesList) + '<span class="name">' + esc(t.name) + "</span>";
          el.addEventListener("click", function (e) {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;   // let a modifier-click open /games/
            e.preventDefault();
            openZoom(el);
          });
        },
      };
    }
    // a portal hex navigates via a cross-document view transition (see museum/).
    if (t.portal) {
      return {
        q: t.q, r: t.r, accent: t.accent, link: true, href: t.href, dive: false,
        tile: function (el) {
          el.classList.add("door");
          el.style.viewTransitionName = t.name + "-portal";
          el.innerHTML = '<span class="name">' + esc(t.name) + "</span>";
        },
      };
    }
    return {
      q: t.q, r: t.r, accent: t.accent, link: false,
      tile: function (el) {
        el.classList.add("door"); el.type = "button";
        el.innerHTML = '<span class="name">' + esc(t.name) + "</span>";
      },
      page: { title: t.name, html: pageHtml(t) },
    };
  });

  window.HexField(document.getElementById("field"), { specials: specials, grow: true });
  buildOverlay();

  // refresh the games from the live cabinet, so adding one to games.json shows up
  // here too (accent, name, count). Non-blocking: the fallback already drew.
  fetch("/games/games.json")
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var list = ((data && data.games) || []).map(function (g) {
        return { slug: g.slug, name: g.name, accent: g.accent || "#3ad9ff" };
      });
      if (!list.length) return;
      gamesList = list;
      if (gamesTileEl) gamesTileEl.innerHTML = buildGems(gamesList) + '<span class="name">games</span>';
      if (gz) renderHexes();
    })
    .catch(function () {});
})();
