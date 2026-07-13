/* hex.js - the honeycomb homepage.

   Thirteen special hexes sit at the centre of a pannable field (js/hexfield.js):
   five are live "toys" (js/toys.js) that open into a large hex when dived into;
   the other eight are doors (links). Everything else is quiet texture. This file
   just describes those thirteen hexes and hands them to HexField. */
(function () {
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
    { q: 0,  r: 1,  name: "writing",   accent: "#556071", href: "/writing-hex.html", portal: true, blurb: "occasional notes" },
    { q: 0,  r: -2, name: "museum",    accent: "#b8791f", href: "/museum/",                       blurb: "sites since 2014" },
    { q: 2,  r: -2, name: "github",    accent: "#5a6270", href: "https://github.com/will-clarke", blurb: "the code" },
    { q: 0,  r: 2,  name: "about",     accent: "#a1633f", href: "/about.html",                    blurb: "hello" },
    { q: -2, r: 2,  name: "cinema",    accent: "#c0435a", href: "https://classiccult.pages.dev/", blurb: "london film listings" },
    { q: -2, r: 0,  name: "projects",  accent: "#7d4bcf", href: "/projects.html",                 blurb: "the full cabinet" },
  ];

  function esc(s) {
    return s.replace(/[&<>]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c];
    });
  }

  var specials = TILES.map(function (t) {
    if (t.toy) {                            // a live toy: a canvas that opens live
      var inst = window.HexToys[t.toy](t.accent);
      return {
        q: t.q, r: t.r, accent: t.accent, link: false, href: t.href, fps: inst.fps,
        preview: function (ctx, w, h, tm) { inst.draw(ctx, w, h, tm, null); },
        live: function (ctx, w, h, tm, ptr) { inst.draw(ctx, w, h, tm, ptr); },
        tile: function (el) {
          el.classList.add("toy"); el.type = "button";
          el.insertAdjacentHTML("beforeend", '<span class="name">' + esc(t.name) + "</span>");
        },
        focus: { cover: false, name: t.name, hint: inst.hint || t.blurb,
          visitText: "visit " + t.name + " →" },
      };
    }
    return {                                // a door: a link that opens a bold cover
      q: t.q, r: t.r, accent: t.accent, link: true, href: t.href,
      // a portal door skips the cover card and just navigates, so the browser's
      // cross-document view transition can zoom the hex into the next page.
      dive: t.portal ? false : true,
      tile: function (el) {
        el.classList.add("door");
        if (t.portal) el.classList.add("portal");
        el.innerHTML = '<span class="name">' + esc(t.name) +
          '</span><span class="blurb">' + esc(t.blurb) + "</span>";
      },
      focus: { cover: true, label: t.name, hint: t.blurb, visitText: "visit " + t.name + " →" },
    };
  });

  window.HexField(document.getElementById("field"), { specials: specials });
})();
