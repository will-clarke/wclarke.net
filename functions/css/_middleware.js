// Same as functions/js/_middleware.js -- see there for why Pages needs a
// Function to set Cache-Control on an asset. style.css is unfingerprinted too.
export const onRequest = async ({ next }) => {
  const res = await next();
  const out = new Response(res.body, res);
  out.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
  return out;
};
