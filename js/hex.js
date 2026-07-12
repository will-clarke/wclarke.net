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
    t = setTimeout(function () {
      build();
      window.dispatchEvent(new Event("hexrebuilt"));
    }, 150);
  });
})();
