/* games.js - the games cabinet as a honeycomb (js/hexfield.js).

   Every game in games.json is a hex, laid out as a spiral cluster from the
   centre outward and coloured by its own accent. Click a hex and it flies open
   (grow mode): the honeycomb dollies into the tile while a full-screen shot of
   the game zooms up to fill the screen, then hexfield navigates straight into
   the game (the `enter` hook). Shots live in games/shots/<slug>.png; a game
   without one just opens on its accent colour.

   The cabinet is built SYNCHRONOUSLY from the fallback below, then refreshed
   from games.json. Building up front (rather than inside the fetch) matters for
   cross-document view transitions: they capture /games/ the instant it renders,
   so the g-<slug> hexes must already exist or there is nothing to morph into.
   Keep FALLBACK in step with games.json (same order); the fetch corrects any
   drift in place. */
(function () {
  // mirrors games.json (order matters - it drives the spiral). The fetch below
  // refreshes accents/names in place, so this only needs to be roughly current.
  var FALLBACK = [
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

  // axial neighbour directions, in ring-traversal order (matches hexfield's grid)
  var DIR = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];

  // a hex spiral: centre, then each ring clockwise from the top. Adding a game to
  // games.json just extends the spiral - no hand-placed coordinates to maintain.
  function spiral(n) {
    var out = [{ q: 0, r: 0 }];
    for (var k = 1; out.length < n; k++) {
      var q = DIR[4][0] * k, r = DIR[4][1] * k;   // start of ring k, at the top
      for (var side = 0; side < 6 && out.length < n; side++) {
        for (var i = 0; i < k && out.length < n; i++) {
          out.push({ q: q, r: r });
          q += DIR[side][0]; r += DIR[side][1];
        }
      }
    }
    return out;
  }

  function esc(s) {
    return s.replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  // a clean full-bleed shot: it matches the live game it flies into, so the
  // navigation reads as the shot settling into the real board. A shot that fails
  // to load removes itself, leaving the bare accent hexagon - so a brand-new game
  // still opens before it has a screenshot.
  function shotHtml(slug) {
    return '<div class="grow-shot-wrap">' +
      '<img class="grow-shot" src="shots/' + slug + '.png" alt="" onerror="this.remove()"></div>';
  }

  function buildSpecials(games) {
    var cells = spiral(games.length);
    return games.map(function (g, i) {
      var cell = {
        q: cells[i].q, r: cells[i].r, accent: g.accent || "#3ad9ff",
        link: true, href: g.slug + "/", enter: true,     // grow, then dive into the game
        tile: function (el) {
          cell.el = el;                                  // kept so the fetch can refresh in place
          el.classList.add("game");
          el.innerHTML = '<span class="name">' + esc(g.name) + "</span>";
        },
        page: { title: g.name, html: shotHtml(g.slug) },
      };
      return cell;
    });
  }

  // build now, from the fallback, so the hexes exist for the fly-in capture
  var specials = buildSpecials(FALLBACK);
  FALLBACK.forEach(function (g) { new Image().src = "shots/" + g.slug + ".png"; });
  window.HexField(document.getElementById("field"), {
    specials: specials,
    grow: true,
    hexWidth: function (vw) { return Math.max(94, Math.min(172, vw / 6)); },
  });

  // then reconcile with the live data, updating each tile in place (no rebuild).
  // Extra games beyond the fallback are ignored until FALLBACK is topped up.
  fetch("games.json")
    .then(function (r) { return r.json(); })
    .then(function (data) {
      ((data && data.games) || []).forEach(function (g, i) {
        var cell = specials[i];
        if (!cell || !cell.el) return;
        cell.accent = g.accent || "#3ad9ff";
        cell.href = g.slug + "/";
        cell.page.html = shotHtml(g.slug);
        cell.el.style.setProperty("--hex-accent", cell.accent);
        cell.el.style.viewTransitionName = "g-" + g.slug;
        cell.el.href = cell.href;
        var name = cell.el.querySelector(".name");
        if (name) name.textContent = g.name;
        new Image().src = "shots/" + g.slug + ".png";
      });
    })
    .catch(function () {});
})();
