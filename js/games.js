/* games.js - the games cabinet as a honeycomb (js/hexfield.js).

   Every game in games.json is a hex, laid out as a spiral cluster from the
   centre outward and coloured by its own accent. Click a hex and it flies open
   (grow mode): the honeycomb dollies into the tile while a full-screen shot of
   the game zooms up to fill the screen, then hexfield navigates straight into
   the game (the `enter` hook). Shots live in games/shots/<slug>.png; a game
   without one just opens on its accent colour. */
(function () {
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

  fetch("games.json")
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var games = (data && data.games) || [];
      var cells = spiral(games.length);

      var specials = games.map(function (g, i) {
        var accent = g.accent || "#3ad9ff";
        var href = g.slug + "/";
        return {
          q: cells[i].q, r: cells[i].r, accent: accent,
          link: true, href: href, enter: true,        // grow, then dive into the game
          tile: function (el) {
            el.classList.add("game");
            // pair this hex with its gem on the homepage crystal (js/hex.js): the
            // shared name morphs one into the other across the navigation.
            el.style.viewTransitionName = "g-" + g.slug;
            el.innerHTML = '<span class="name">' + esc(g.name) + "</span>";
          },
          page: {
            title: g.name,
            // a clean full-bleed shot: it matches the live game it flies into, so
            // the navigation reads as the shot settling into the real board. A shot
            // that fails to load removes itself, leaving the bare accent hexagon -
            // so a brand-new game still opens before it has a screenshot.
            html: '<div class="grow-shot-wrap">' +
              '<img class="grow-shot" src="shots/' + g.slug + '.png" alt="" ' +
              'onerror="this.remove()"></div>',
          },
        };
      });

      // warm the shot cache so the dive hero is sharp the instant a hex opens
      games.forEach(function (g) { new Image().src = "shots/" + g.slug + ".png"; });

      window.HexField(document.getElementById("field"), {
        specials: specials,
        grow: true,
        hexWidth: function (vw) { return Math.max(94, Math.min(172, vw / 6)); },
      });
    });
})();
