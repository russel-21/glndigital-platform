// Shared CORS helper for Supabase Edge Functions in this project.
// Admin-only functions (like phase1-audit) are still called from the browser
// with the user's JWT, so the preflight response needs these headers even
// though the actual authorization check happens inside the function.
//
// STATUS (2026-08-31): Access-Control-Allow-Origin used to be a static "*".
// The real authorization boundary here was never CORS anyway — every
// function checks the caller's JWT via public.is_admin() regardless of
// where the request came from, and a bearer token in an Authorization
// header (unlike a cookie) is never attached automatically by the browser,
// so "*" was never actually exploitable as CSRF. Still, echoing back only a
// known origin is better hygiene than a blanket wildcard, so this is now an
// allowlist check instead of a static value.
// Exported so other functions that need a trusted app origin (not just a
// CORS header) — e.g. zernio-connect building an OAuth redirect_url — can
// reuse the same allowlist instead of duplicating it.
export const ALLOWED_ORIGINS = [
  "https://glndigital-platform.vercel.app",
  "http://localhost:8080",
];

/** Build CORS headers for one request. Echoes the caller's Origin back only
 * when it's in ALLOWED_ORIGINS; otherwise falls back to the primary prod
 * origin — a page on any other origin then gets a response whose
 * Access-Control-Allow-Origin doesn't match its own, so the browser blocks
 * it from reading the response, same practical effect as omitting the
 * header. `Vary: Origin` avoids caching one origin's CORS headers for another. */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  const allowOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}
