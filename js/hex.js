/* hex.js - the honeycomb homepage.
   Fills the viewport with a tessellating field of hexagons. Six of them,
   clustered in the centre, are the doors (the only links); the rest are quiet
   texture that fades out toward the edges. Every hex position comes from one
   formula with a parity-based half-column offset, so rows cannot drift out of
   alignment - the tiling is correct by construction, at any screen size. */
(function () {
  var DOORS = [
    { name: "games",     href: "/projects.html",                  accent: "#8f4222", blurb: "11 puzzle games" },
    { name: "polyhedra", href: "/games/polyhedra/",               accent: "#8c6bd6", blurb: "shapes from a seed" },
    { name: "intuition", href: "https://intuition-2i1.pages.dev", accent: "#2f8f8a", blurb: "maths, poked" },
    { name: "cinema",    href: "https://classiccult.pages.dev/",  accent: "#c0435a", blurb: "london listings" },
    { name: "writing",   href: "/writing.html",                   accent: "#556071", blurb: "occasional notes" },
    { name: "museum",    href: "/museum/",                        accent: "#b8791f", blurb: "sites since 2014" },
  ];

  // disco palette - bright, borrowed from the door accents plus a few extra
  var PALETTE = [
    "#8f4222", "#8c6bd6", "#2f8f8a", "#c0435a", "#b8791f",
    "#57e08a", "#3ad9ff", "#ff7ac2", "#ffb43a", "#b98cff",
  ];

  // points of a regular n-gon inscribed in radius r, first vertex pointing up
  function ngon(n, r) {
    var p = [];
    for (var i = 0; i < n; i++) {
      var a = -Math.PI / 2 + i * 2 * Math.PI / n;
      p.push((Math.cos(a) * r).toFixed(1) + "," + (Math.sin(a) * r).toFixed(1));
    }
    return p.join(" ");
  }

  // a tumbling nested-polygon "solid" for one empty hex, dressed with random
  // colour / axis / speed so a field of them reads as a disco of spinning shapes
  function shapeFor(rand) {
    var sides = 3 + Math.floor(rand() * 6);           // 3..8
    var col = PALETTE[Math.floor(rand() * PALETTE.length)];
    var dur = (5 + rand() * 11).toFixed(1);           // 5..16s
    var delay = (-rand() * 16).toFixed(1);            // desync the start
    var dir = rand() < 0.5 ? "normal" : "reverse";
    var ax = (rand() * 2 - 1).toFixed(2);
    var ay = (rand() * 2 - 1).toFixed(2);
    var svg =
      '<svg viewBox="-50 -50 100 100">' +
      '<polygon points="' + ngon(sides, 42) + '" fill="' + col + '22" stroke="' + col + '" stroke-width="3"/>' +
      '<polygon points="' + ngon(sides, 23) + '" fill="none" stroke="' + col + '" stroke-width="2" opacity="0.6"/>' +
      "</svg>";
    return '<span class="shape" style="--dur:' + dur + 's;--delay:' + delay +
      's;--dir:' + dir + ';--ax:' + ax + ';--ay:' + ay + '">' + svg + "</span>";
  }

  var field = document.getElementById("field");

  function build() {
    field.textContent = "";
    var vw = window.innerWidth, vh = window.innerHeight;

    // hex size scales with the screen; smaller on phones, always 3-doors-wide
    var w = Math.max(78, Math.min(150, vw / 7));
    var h = w * 1.1547;            // regular pointy-top hexagon
    var gap = Math.round(w * 0.05);
    var colStep = w + gap;
    var rowStep = h * 0.75 + gap * 0.5;

    var cols = Math.ceil(vw / colStep) + 3;
    var rows = Math.ceil(vh / rowStep) + 3;
    var cr = Math.round(rows / 2);
    var cc = Math.round(cols / 2);

    // the six doors form an interlocked 3-over-3 cluster around the centre
    var order = [
      [cr, cc - 1], [cr, cc], [cr, cc + 1],
      [cr + 1, cc - 1], [cr + 1, cc], [cr + 1, cc + 1],
    ];
    var doorAt = {};
    order.forEach(function (rc, i) { doorAt[rc[0] + ":" + rc[1]] = DOORS[i]; });

    function xy(r, c) {
      return {
        x: c * colStep + (r % 2 ? colStep / 2 : 0),
        y: r * rowStep,
      };
    }

    // centre the door cluster in the viewport, then shift the whole field to it
    var first = xy(order[0][0], order[0][1]);
    var last = xy(order[5][0], order[5][1]);
    var dx = vw / 2 - (first.x + last.x + w) / 2;
    var dy = vh / 2 - (first.y + last.y + h) / 2 - h * 0.28;

    var cx = vw / 2, cy = vh / 2;
    var maxD = Math.hypot(vw, vh) / 2;
    var frag = document.createDocumentFragment();

    for (var r = -1; r <= rows; r++) {
      for (var c = -1; c <= cols; c++) {
        var door = doorAt[r + ":" + c];
        var p = xy(r, c);
        var left = p.x + dx, top = p.y + dy;

        var el = document.createElement(door ? "a" : "div");
        el.className = "hex";
        el.style.width = w + "px";
        el.style.height = h + "px";
        el.style.left = left + "px";
        el.style.top = top + "px";

        if (door) {
          el.classList.add("door");
          el.href = door.href;
          el.style.setProperty("--hex-accent", door.accent);
          el.innerHTML = '<span class="name">' + door.name +
            '</span><span class="blurb">' + door.blurb + '</span>';
        } else {
          el.classList.add("cell");
          // fade cells out toward the edges so the doors stay the focus
          var d = Math.hypot(left + w / 2 - cx, top + h / 2 - cy) / maxD;
          el.style.opacity = Math.max(0.12, 0.85 - d * 1.05).toFixed(3);
          el.innerHTML = shapeFor(Math.random);   // hidden until disco mode
        }
        frag.appendChild(el);
      }
    }
    field.appendChild(frag);
  }

  build();
  var t;
  window.addEventListener("resize", function () {
    clearTimeout(t);
    t = setTimeout(build, 150);
  });

  // 🕺 disco: spin a shape inside every empty hex (CSS handles the motion)
  window.toggleDisco = function (btn) {
    var on = document.body.classList.toggle("disco");
    if (btn) btn.setAttribute("aria-pressed", on ? "true" : "false");
  };
})();
