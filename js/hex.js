/* hex.js - the honeycomb homepage.

   Thirteen special hexes sit at the centre of a pannable field (js/hexfield.js).
   Each is a plain accent-coloured hex with a label. Click one and it swells until
   it fills the screen and becomes that hex's demo page.

   The "games" hex is a little crystal: at rest it holds a spiral of faceted
   gem-hexes, one per game in the game's own accent, laid out exactly like the
   real cabinet (js/games.js). Each gem carries the view-transition-name
   `g-<slug>`, and the matching hex in /games/ carries the same name - so
   navigating either way morphs the gem cluster OUT into the full cabinet (and
   back again). The hexes match up because they are paired by slug. */
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

  // the games, in cabinet order (slug + accent). A fallback so the gems render
  // (and can morph on a cold Back) before games.json is fetched; the live file
  // overwrites it. Keep the slugs in step with games/games.json.
  var GAME_GEMS = [
    { slug: "shipshape", accent: "#7fd4ff" }, { slug: "fathom", accent: "#2fe6c9" },
    { slug: "lumen", accent: "#ffb43a" }, { slug: "cascade", accent: "#3ad9ff" },
    { slug: "fracture", accent: "#ff5a6e" }, { slug: "selfie", accent: "#ff7ac2" },
    { slug: "seed", accent: "#57e08a" }, { slug: "loom", accent: "#b98cff" },
    { slug: "echo", accent: "#5cd6ff" }, { slug: "debt", accent: "#b48cff" },
  ];

  function esc(s) {
    return s.replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  // ---- the games crystal -------------------------------------------------
  // axial neighbour dirs, in ring order - identical to games.js so the gems'
  // spiral matches the real cabinet hex-for-hex.
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

  // per-facet lightness (a light source up-and-left) - a flat hexagon read as a
  // cut gem. The six conic sectors line up with the pointy-top facets.
  var FACET = [8, -6, -20, -24, -4, 22];

  // The gem cluster: one clip-path hexagon per game, positioned in the same
  // spiral as the cabinet (as % of the tile so it stays put at any size), faceted
  // with a conic-gradient, and tagged g-<slug> so it morphs into its cabinet hex.
  function buildGems(gems) {
    var cells = spiral(gems.length), maxX = 0, maxR = 0;
    var pos = cells.map(function (c) {
      var x = c.q + c.r / 2;
      if (Math.abs(x) > maxX) maxX = Math.abs(x);
      if (Math.abs(c.r) > maxR) maxR = Math.abs(c.r);
      return { x: x, r: c.r };
    });
    // lay the gems out as a faithful, scaled-down replica of the cabinet: the
    // same column/row spacing ratios hexfield uses (stepX = 1.07w, rowStep =
    // 0.78w-of-tile-height). Because the cluster is just the cabinet shrunk, the
    // per-hex morph interpolates as one uniform scale-up - a zoom INTO the hex,
    // rather than the gems fanning out to scattered positions.
    var SX = 1.07, RY = 0.78;
    var gw = Math.min(0.47 / (maxX * SX + 0.5), 0.47 / (maxR * RY + 0.5));
    var half = gw * 50, side = (gw * 100).toFixed(2);
    return gems.map(function (g, i) {
      var acc = g.accent || "#3ad9ff";
      var left = (50 + pos[i].x * SX * gw * 100 - half).toFixed(2);
      var top = (50 + pos[i].r * RY * gw * 100 - half).toFixed(2);
      var conic = "conic-gradient(from 0deg," + FACET.map(function (d, j) {
        return mix(acc, d) + " " + (j * 60) + "deg " + ((j + 1) * 60) + "deg";
      }).join(",") + ")";
      var spark = "radial-gradient(circle at 34% 22%,rgba(255,255,255,0.55),rgba(255,255,255,0) 38%)";
      return '<span class="cx-gem" style="left:' + left + "%;top:" + top +
        "%;width:" + side + "%;height:" + side + "%;background:" + spark + "," + conic +
        ";view-transition-name:g-" + g.slug + ';"></span>';
    }).join("");
  }

  function pageHtml(t) {
    // the title is the still centre; everything else lives in .grow-rest, which
    // hexfield.js reveals (fade + rise) around it as you fly in.
    var h = '<h1 class="grow-h">' + esc(t.name) + "</h1>" + '<div class="grow-rest">' +
      '<p class="grow-sub">' + esc(t.blurb) + "</p>" +
      '<p class="grow-body">' + esc(t.body) + "</p>";
    if (t.href) h += '<a class="grow-visit" href="' + esc(t.href) + '">open ' + esc(t.name) + " →</a>";
    h += '<p class="grow-demo">demo page · esc or ✕ to close</p></div>';
    return h;
  }

  var gamesTileEl = null;                 // the resting games hex, re-skinned once games.json loads

  var specials = TILES.map(function (t) {
    // the games hex: a plain link whose gems morph straight into the cabinet
    // (view transitions, both directions) - no demo panel, no JS grow.
    if (t.crystal) {
      return {
        q: t.q, r: t.r, accent: t.accent, link: true, href: t.href, dive: false,
        tile: function (el) {
          gamesTileEl = el;
          el.classList.add("crystal-tile");
          el.innerHTML = buildGems(GAME_GEMS) + '<span class="name">' + esc(t.name) + "</span>";
        },
      };
    }
    // a portal hex doesn't grow into a demo panel; it navigates to a real page,
    // flying INTO it via a cross-document view transition (see museum/index.html).
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

  // refresh the gems from the live cabinet, so adding a game to games.json shows
  // up here too (accent, count, and the slug the morph pairs on). Non-blocking:
  // the fallback already drew.
  fetch("/games/games.json")
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var gems = ((data && data.games) || []).map(function (g) {
        return { slug: g.slug, accent: g.accent || "#3ad9ff" };
      });
      if (gems.length && gamesTileEl) {
        gamesTileEl.innerHTML = buildGems(gems) + '<span class="name">games</span>';
      }
    })
    .catch(function () {});
})();
