import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const ACCESS_TOKEN_COOKIE = "sb-access-token";

/** Supabase keeps the session in sb-<project>-auth-token (in chunks .0, .1 when it is long). The API token cookie is not it. */
const hasSupabaseSession = (request: NextRequest) =>
  request.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));

/** next/link prefetches a page in the background: nothing there needs a session refresh. */
const isPrefetch = (request: NextRequest) =>
  request.headers.has("next-router-prefetch") || request.headers.get("purpose") === "prefetch";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // cc-58: no Supabase call for a prefetch, or for a visitor with no session cookie. The API token cookie of a
  // session that is gone still goes (the same as the end of this function).
  if (isPrefetch(request)) return response;
  if (!hasSupabaseSession(request)) {
    if (request.cookies.has(ACCESS_TOKEN_COOKIE)) response.cookies.delete(ACCESS_TOKEN_COOKIE);
    return response;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes("dummy-project")) {
    try {
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, {
                ...options,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                path: "/",
              })
            );
          },
        },
      });

      // cc-58: the token is checked here against the project's signing keys (no round trip to the Auth server on most
      // projects), and a token about to expire is refreshed first. getUser() asked the server on every request.
      const { data: verified, error: claimsError } = await supabase.auth.getClaims();
      const claims = claimsError ? null : verified?.claims;

      // The API reads the access token from this httpOnly cookie, so no client script ever holds the token. It is
      // re-issued from the Supabase session on every request (a refreshed token replaces the old one) and removed
      // once there is no session. cc-63: only a token whose claims were verified is issued (a failed check mints
      // nothing), and it lives as long as its own exp.
      const exp = claims && typeof claims.exp === "number" ? claims.exp : null;
      const token = exp === null ? undefined : (await supabase.auth.getSession()).data.session?.access_token;
      if (token && exp !== null) {
        response.cookies.set(ACCESS_TOKEN_COOKIE, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: Math.max(0, exp - Math.floor(Date.now() / 1000)),
        });
      } else if (request.cookies.has(ACCESS_TOKEN_COOKIE)) {
        response.cookies.delete(ACCESS_TOKEN_COOKIE);
      }
    } catch {
      // Ignore background refresh errors
    }
  }

  return response;
}

export const config = {
  matcher: [
    // The public pages (landing, terms, privacy, offline, install) need no session: they skip it. The names are anchored
    // (the page itself or what is below it), so /installer and /terms-x still go through the middleware.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|(?:landing|terms|privacy|offline|install|icons)(?:/|$)|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
