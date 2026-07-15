/* hex.js - the honeycomb homepage.

   Thirteen special hexes sit at the centre of a pannable field (js/hexfield.js).
   Each is a plain accent-coloured hex with a label. Dwell on one (hover, or
   scroll it to the centre on touch) and it slowly swells until it fills the
   screen and becomes that hex's page - here a small demo panel. This file just
   describes the thirteen hexes and their demo pages, then hands them to the
   field with grow mode on. */
(function () {
  // {q,r} on an axial grid centred on (0,0). name/accent style the hex; blurb +
  // body are the demo page copy; href points at the real thing.
  var TILES = [
    { q: 0,  r: 0,  name: "polyhedra", accent: "#8c6bd6", href: "/games/polyhedra/",              blurb: "shapes from a seed",     body: "A rotating wireframe polyhedron grown from a single seed number - nudge the seed and the whole solid reforms." },
    { q: 1,  r: 0,  name: "neural",    accent: "#d84f9a", href: null,                              blurb: "position → colour",       body: "A tiny neural network paints a colour for every point on the plane, and you watch the field settle as it learns." },
    { q: -1, r: 0,  name: "fractal",   accent: "#1f9fce", href: "https://intuition.wclarke.net",   blurb: "a julia set",             body: "A Julia set you can steer: drag the constant and the whole basin of the fractal reshapes around your cursor." },
    { q: -1, r: 1,  name: "life",      accent: "#2fae63", href: null,                              blurb: "it just evolves",         body: "Conway's Game of Life, left to its own devices - gliders, blinkers and the occasional glider gun." },
    { q: 2,  r: 0,  name: "recursion", accent: "#e0912a", href: null,                              blurb: "hexes in hexes",          body: "Hexagons packed inside hexagons inside hexagons, all the way down until the pixels give up." },

    { q: 1,  r: -1, name: "games",     accent: "#8f4222", href: "/games/",                       blurb: "puzzle games",            body: "A cabinet of small puzzle games - Sokoban variants, a paint machine and other daft little contraptions." },
    { q: 0,  r: -1, name: "intuition", accent: "#2f8f8a", href: "https://intuition.wclarke.net", blurb: "maths, poked",            body: "Interactive maths toys: poke a theorem until the intuition behind it falls out." },
    { q: 0,  r: 1,  name: "writing",   accent: "#556071", href: "/writing-hex.html",             blurb: "occasional notes",        body: "Notes on vim, unix and git, plus a handful of short stories - arranged as their own honeycomb." },
    { q: 0,  r: -2, name: "museum",    accent: "#b8791f", href: "/museum/", portal: true,          blurb: "sites since 2014",        body: "Every version of this site since 2014, rebuilt and preserved - watch the taste change over a decade." },
    { q: 2,  r: -2, name: "github",    accent: "#5a6270", href: "https://github.com/will-clarke", blurb: "the code",                body: "The source behind all of this, warts and terse commit messages included." },
    { q: 0,  r: 2,  name: "about",     accent: "#a1633f", href: "/about.html",                    blurb: "hello",                   body: "Hello - I'm Will. I build small things for fun and every so often write about them." },
    { q: -2, r: 2,  name: "cinema",    accent: "#c0435a", href: "https://classiccult.pages.dev/", blurb: "london film listings",    body: "What's on at London's repertory cinemas this week, scraped and sorted so you don't have to." },
    { q: -2, r: 0,  name: "projects",  accent: "#7d4bcf", href: "/projects.html",                 blurb: "the full cabinet",        body: "The full cabinet - everything above, plus the odds and ends that never got their own hex." },
  ];

  function esc(s) {
    return s.replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
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

  var specials = TILES.map(function (t) {
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
})();
