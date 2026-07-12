/* toys.js - the living hexes for the homepage.
   Each factory returns a renderer with one method:

     draw(ctx, w, h, t, ptr)

   ctx is 2D, already scaled to devicePixelRatio, so draw in CSS pixels of the
   w x h hex box. t is milliseconds. ptr is {x, y} in 0..1 within the box when a
   pointer is over the toy (focus view), or null (ambient preview). Renderers
   keep their own state between frames and never touch the DOM - the engine
   (hex.js) owns the canvas, sizing, the rAF loop and the pointer.

   `fps` throttles the engine's loop for the two per-pixel toys; `hint` is the
   line shown under the toy when it opens big. */
(function () {
  var PI2 = Math.PI * 2;

  // small seeded PRNG so the neural net gets the same (nice) weights every load
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---- poly: a wireframe Platonic/Archimedean solid, spun with matrices and
     drawn with perspective + hidden-edge depth shading */
  var PHI = (1 + Math.sqrt(5)) / 2;
  function signs(x, y, z) {
    var out = [];
    for (var a = -1; a <= 1; a += 2)
      for (var b = -1; b <= 1; b += 2)
        for (var c = -1; c <= 1; c += 2) {
          if (x === 0 && a < 0) continue;
          if (y === 0 && b < 0) continue;
          if (z === 0 && c < 0) continue;
          out.push([a * x, b * y, c * z]);
        }
    return out;
  }
  function cat() {
    var v = [];
    for (var i = 0; i < arguments.length; i++) v = v.concat(arguments[i]);
    return v;
  }
  function dist2(a, b) {
    var x = a[0] - b[0], y = a[1] - b[1], z = a[2] - b[2];
    return x * x + y * y + z * z;
  }
  var SOLIDS = [
    { v: [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]] },        // tetra
    { v: signs(1, 1, 1) },                                            // cube
    { v: cat(signs(1, 0, 0), signs(0, 1, 0), signs(0, 0, 1)) },       // octa
    { v: cat(signs(1, 1, 0), signs(1, 0, 1), signs(0, 1, 1)) },       // cubocta
    { v: cat(signs(0, 1, PHI), signs(1, PHI, 0), signs(PHI, 0, 1)) }, // icosa
    { v: cat(signs(1, 1, 1), signs(0, 1 / PHI, PHI),                  // dodeca
        signs(1 / PHI, PHI, 0), signs(PHI, 0, 1 / PHI)) },
  ];
  SOLIDS.forEach(function (s) {
    var r = 0;
    s.v.forEach(function (p) { r = Math.max(r, Math.hypot(p[0], p[1], p[2])); });
    s.v = s.v.map(function (p) { return [p[0] / r, p[1] / r, p[2] / r]; });
    var min = Infinity, i, j;
    for (i = 0; i < s.v.length; i++)
      for (j = i + 1; j < s.v.length; j++) min = Math.min(min, dist2(s.v[i], s.v[j]));
    s.e = [];
    for (i = 0; i < s.v.length; i++)
      for (j = i + 1; j < s.v.length; j++)
        if (dist2(s.v[i], s.v[j]) <= min * 1.08) s.e.push([i, j]);
  });

  function makePoly(accent) {
    // favour the fuller solids (cubocta / icosa / dodeca) for the centrepiece
    var solid = SOLIDS[3 + ((Math.random() * 3) | 0)];
    var proj = [];
    return {
      hint: "one of five solids - drag to spin. more in the polyhedra playground.",
      draw: function (ctx, w, h, t, ptr) {
        var rad = Math.min(w, h) * 0.32;
        var cx = w / 2, cy = h / 2;
        // ambient spin, nudged by the pointer when the toy is open
        var ax = t * 0.00035 + (ptr ? (ptr.y - 0.5) * 3 : 0);
        var ay = t * 0.00045 + (ptr ? (ptr.x - 0.5) * 3 : 0);
        var ca = Math.cos(ax), sa = Math.sin(ax), cb = Math.cos(ay), sb = Math.sin(ay);
        var v = solid.v, k;
        for (k = 0; k < v.length; k++) {
          var x = v[k][0], y = v[k][1], z = v[k][2];
          var y1 = y * ca - z * sa, z1 = y * sa + z * ca;
          var x2 = x * cb + z1 * sb, z2 = -x * sb + z1 * cb;
          var s = 3.2 / (3.2 - z2);
          proj[k] = [cx + x2 * s * rad, cy + y1 * s * rad, z2];
        }
        ctx.lineCap = "round";
        for (var pass = 0; pass < 2; pass++) {
          var front = pass === 1;
          ctx.strokeStyle = accent;
          ctx.globalAlpha = front ? 1 : 0.32;
          ctx.lineWidth = (front ? 0.018 : 0.013) * Math.min(w, h);
          ctx.beginPath();
          for (var m = 0; m < solid.e.length; m++) {
            var a = proj[solid.e[m][0]], b = proj[solid.e[m][1]];
            if (((a[2] + b[2]) * 0.5 >= 0) !== front) continue;
            ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      },
    };
  }

  /* ---- life: Conway's Game of Life on a square grid. Reseeds when it stalls
     or dies out; the pointer paints new cells when the toy is open. */
  function makeLife(accent) {
    var cols = 0, rows = 0, grid, next, last = 0, still = 0, prevPop = -1;
    function seed() {
      grid = new Uint8Array(cols * rows);
      for (var i = 0; i < grid.length; i++) grid[i] = Math.random() < 0.32 ? 1 : 0;
      still = 0; prevPop = -1;
    }
    function step() {
      var pop = 0;
      for (var y = 0; y < rows; y++)
        for (var x = 0; x < cols; x++) {
          var n = 0;
          for (var dy = -1; dy <= 1; dy++)
            for (var dx = -1; dx <= 1; dx++) {
              if (!dx && !dy) continue;
              var xx = (x + dx + cols) % cols, yy = (y + dy + rows) % rows;
              n += grid[yy * cols + xx];
            }
          var a = grid[y * cols + x];
          next[y * cols + x] = (a && (n === 2 || n === 3)) || (!a && n === 3) ? 1 : 0;
          pop += next[y * cols + x];
        }
      var tmp = grid; grid = next; next = tmp;
      still = pop === prevPop ? still + 1 : 0;
      prevPop = pop;
      if (pop < 4 || still > 8) seed();
    }
    return {
      hint: "Conway's Game of Life - click to sprinkle live cells.",
      draw: function (ctx, w, h, t, ptr) {
        var want = Math.max(10, Math.round(w / 15));
        if (want !== cols) {
          cols = want; rows = Math.max(10, Math.round(h / 15));
          next = new Uint8Array(cols * rows); seed();
        }
        if (ptr) {                                   // paint under the pointer
          var px = Math.floor(ptr.x * cols), py = Math.floor(ptr.y * rows);
          for (var oy = -1; oy <= 1; oy++)
            for (var ox = -1; ox <= 1; ox++) {
              var gx = px + ox, gy = py + oy;
              if (gx >= 0 && gx < cols && gy >= 0 && gy < rows && Math.random() < 0.6)
                grid[gy * cols + gx] = 1;
            }
        }
        if (t - last > 150) { step(); last = t; }
        var cw = w / cols, ch = h / rows, r = Math.min(cw, ch) * 0.36;
        ctx.fillStyle = accent;
        for (var y = 0; y < rows; y++)
          for (var x = 0; x < cols; x++)
            if (grid[y * cols + x]) {
              ctx.globalAlpha = 0.55 + 0.45 * ((x * 7 + y * 13) % 5) / 4;
              ctx.beginPath();
              ctx.arc(x * cw + cw / 2, y * ch + ch / 2, r, 0, PI2);
              ctx.fill();
            }
        ctx.globalAlpha = 1;
      },
    };
  }

  /* ---- recurse: a hexagon of seven hexagons, each itself seven hexagons -
     a honeycomb fractal. Slowly rotates; the pointer nests it a level deeper. */
  function makeRecurse(accent) {
    function flower(ctx, cx, cy, rad, rot, depth, alpha) {
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      for (var i = 0; i < 6; i++) {
        var a = rot + i * Math.PI / 3;
        var x = cx + rad * Math.cos(a), y = cy + rad * Math.sin(a);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.stroke();
      if (depth <= 0) return;
      var cr = rad * 0.34, dist = rad * 0.62;     // seven children inside
      flower(ctx, cx, cy, cr, rot, depth - 1, alpha * 0.82);
      for (var k = 0; k < 6; k++) {
        var ang = rot + k * Math.PI / 3 + Math.PI / 6;
        flower(ctx, cx + dist * Math.cos(ang), cy + dist * Math.sin(ang),
          cr, rot, depth - 1, alpha * 0.82);
      }
    }
    return {
      hint: "a hexagon of hexagons of hexagons - move to nest deeper.",
      draw: function (ctx, w, h, t, ptr) {
        var rad = Math.min(w, h) * 0.47;
        var depth = ptr ? 3 : 2;
        ctx.strokeStyle = accent;
        ctx.lineWidth = Math.min(w, h) * 0.007;
        ctx.lineJoin = "round";
        flower(ctx, w / 2, h / 2, rad, t * 0.0001, depth, 0.95);
        ctx.globalAlpha = 1;
      },
    };
  }

  /* ---- fractal: an animated Julia set. Rendered at low resolution offscreen
     and scaled up (per-pixel escape-time is dear); the pointer steers c. */
  function makeFractal() {
    var off = document.createElement("canvas"), octx = off.getContext("2d");
    var iw = 0, ih = 0, img;
    return {
      fps: 24,
      hint: "a Julia set - move the mouse to reshape it.",
      draw: function (ctx, w, h, t, ptr) {
        var tw = Math.max(48, Math.round(w / 2.4)), th = Math.max(48, Math.round(h / 2.4));
        if (tw !== iw || th !== ih) {
          iw = off.width = tw; ih = off.height = th;
          img = octx.createImageData(iw, ih);
        }
        // c drifts on a gentle loop; the pointer takes over when the toy is open
        var cr = ptr ? (ptr.x - 0.5) * 1.4 : 0.7885 * Math.cos(t * 0.00013);
        var ci = ptr ? (ptr.y - 0.5) * 1.4 : 0.7885 * Math.sin(t * 0.00013);
        var d = img.data, ITER = 48, scale = 3.0 / iw;
        for (var py = 0; py < ih; py++)
          for (var px = 0; px < iw; px++) {
            var zx = (px - iw / 2) * scale, zy = (py - ih / 2) * scale, i = 0;
            for (; i < ITER; i++) {
              var x2 = zx * zx, y2 = zy * zy;
              if (x2 + y2 > 4) break;
              zy = 2 * zx * zy + ci; zx = x2 - y2 + cr;
            }
            var o = (py * iw + px) * 4;
            if (i === ITER) { d[o] = d[o + 1] = d[o + 2] = 12; d[o + 3] = 255; }
            else {
              var hlp = i / ITER, hue = (hlp * 320 + 200) % 360;
              var rgb = hsl(hue, 0.72, 0.28 + 0.42 * hlp);
              d[o] = rgb[0]; d[o + 1] = rgb[1]; d[o + 2] = rgb[2]; d[o + 3] = 255;
            }
          }
        octx.putImageData(img, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(off, 0, 0, w, h);
      },
    };
  }

  /* ---- neural: a tiny fixed random network (a CPPN). Feeds (x, y, radius,
     drifting bias) through two tanh layers to an RGB colour, painting a lush
     field. The pointer feeds two extra inputs, so it warps as you move. */
  function makeNeural() {
    var rnd = mulberry32(0x1234abcd);
    var NIN = 5, H1 = 10, H2 = 10;
    function mat(r, c) { var m = []; for (var i = 0; i < r * c; i++) m.push(rnd() * 2 - 1); return m; }
    var w1 = mat(H1, NIN), w2 = mat(H2, H1), w3 = mat(3, H2);
    var off = document.createElement("canvas"), octx = off.getContext("2d");
    var iw = 0, ih = 0, img;
    function sinAct(s) { return Math.sin(s * 2.4); }   // SIREN-ish: lush waves
    function layer(inp, wts, out, act) {
      var oc = out, ic = inp.length, res = [];
      for (var o = 0; o < oc; o++) {
        var s = 0;
        for (var i = 0; i < ic; i++) s += wts[o * ic + i] * inp[i];
        res.push(act(s));
      }
      return res;
    }
    return {
      fps: 20,
      hint: "a tiny neural net turning position into colour - move to warp it.",
      draw: function (ctx, w, h, t, ptr) {
        var tw = Math.max(36, Math.round(w / 3)), th = Math.max(36, Math.round(h / 3));
        if (tw !== iw || th !== ih) {
          iw = off.width = tw; ih = off.height = th;
          img = octx.createImageData(iw, ih);
        }
        var bias = Math.sin(t * 0.0004);
        var mx = ptr ? ptr.x * 2 - 1 : Math.cos(t * 0.00028);
        var my = ptr ? ptr.y * 2 - 1 : Math.sin(t * 0.00022);
        var d = img.data;
        for (var py = 0; py < ih; py++)
          for (var px = 0; px < iw; px++) {
            var nx = px / iw * 2 - 1, ny = py / ih * 2 - 1;
            var rr = Math.sqrt(nx * nx + ny * ny);
            var a = layer([nx, ny, rr, bias + mx, my], w1, H1, sinAct);
            var b = layer(a, w2, H2, sinAct);
            var c = layer(b, w3, 3, Math.tanh);
            var o = (py * iw + px) * 4;
            d[o] = (c[0] * 0.5 + 0.5) * 255;
            d[o + 1] = (c[1] * 0.5 + 0.5) * 255;
            d[o + 2] = (c[2] * 0.5 + 0.5) * 255;
            d[o + 3] = 255;
          }
        octx.putImageData(img, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(off, 0, 0, w, h);
      },
    };
  }

  function hsl(h, s, l) {
    h /= 360;
    function f(n) {
      var k = (n + h * 12) % 12;
      return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    }
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
  }

  window.HexToys = {
    poly: makePoly,
    life: makeLife,
    recurse: makeRecurse,
    fractal: makeFractal,
    neural: makeNeural,
  };
})();
