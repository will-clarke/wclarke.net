// Keep /js/* out of the browser cache's four-hour blind spot.
//
// Nothing here is fingerprinted -- content.js is served under that one name
// forever -- and Cloudflare Pages stamps static assets `max-age=14400`, so an
// edit stays invisible for four hours unless you force-reload. A `_headers`
// file cannot fix this: Pages applies custom headers from it but overrides
// Cache-Control on assets (verified -- a probe header from the same rule block
// landed while its Cache-Control was ignored). A Function response, though, is
// ours to set.
//
// Scoped to this directory on purpose: middleware under functions/js/ only runs
// for /js/*, so the rest of the site (museum/, audio/, video/) stays a plain
// static asset the CDN can cache properly.
export const onRequest = async ({ next }) => {
  const res = await next();
  const out = new Response(res.body, res);
  out.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
  return out;
};
