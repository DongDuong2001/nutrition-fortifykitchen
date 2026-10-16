import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const ACCESS_TOKEN_COOKIE = "sb-access-token";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

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

      await supabase.auth.getUser();

      // The API reads the access token from this httpOnly cookie, so no client script ever holds the token. It is
      // re-issued from the Supabase session on every request (a refreshed token replaces the old one) and removed
      // once there is no session.
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        response.cookies.set(ACCESS_TOKEN_COOKIE, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          // Seconds until this token expires (expires_in is the lifetime at issue, which is stale for an old session)
          maxAge: Math.max(0, (data.session?.expires_at ?? Math.floor(Date.now() / 1000) + 3600) - Math.floor(Date.now() / 1000)),
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
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
