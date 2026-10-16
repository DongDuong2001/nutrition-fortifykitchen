// Middleware (middleware.ts) sets or clears the httpOnly sb-access-token cookie on every request. The browser calls
// this empty route (lib/server-session.ts) right after a sign-in or sign-out so the cookie is current before the
// next API call.
export function GET() {
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
