/* vt.js - directional cross-document view transitions between the homepage
   (js/hex.js) and the games cabinet (js/games.js).

   The gems already morph into the cabinet hexes on their own (shared
   view-transition-names). This tags each navigation with a direction -
   `to-cabinet` going in, `to-home` coming back - so the CSS can also zoom the
   whole scene: everything that ISN'T a gem (the surrounding hexes, captured as
   the `root` snapshot) scales up and flies past as the camera dives into the
   games hex, and back out again on Back.

   Loaded early (not deferred) on both pages so the `pagereveal` listener is in
   place before the browser reveals a transitioned page. Degrades to a plain
   cross-fade where view-transition types aren't supported. */
(function () {
  function path(url) {
    try { return new URL(url, location.href).pathname.replace(/index\.html$/, ""); }
    catch (_) { return ""; }
  }
  function dirType(from, to) {
    from = path(from); to = path(to);
    if (from === "/" && to === "/games/") return "to-cabinet";
    if (from === "/games/" && to === "/") return "to-home";
    return null;                                   // any other nav: leave untyped
  }
  addEventListener("pageswap", function (e) {       // leaving a page
    if (!e.viewTransition || !e.activation || !e.activation.entry) return;
    var t = dirType(location.href, e.activation.entry.url);
    if (t) e.viewTransition.types.add(t);
  });
  addEventListener("pagereveal", function (e) {     // arriving at a page
    if (!e.viewTransition) return;
    var nav = self["navigation"], a = nav && nav.activation;
    var t = dirType(a && a.from && a.from.url, location.href);
    if (t) e.viewTransition.types.add(t);
  });
})();
