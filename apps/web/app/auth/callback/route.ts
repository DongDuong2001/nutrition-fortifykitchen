import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  const baseOrigin = siteUrl || origin;

  // Sanitize next target to prevent open redirect vulnerabilities
  const rawNext = searchParams.get("next") ?? "/";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  // Handle OAuth cancellation or errors from identity provider
  const oauthError = searchParams.get("error_description") || searchParams.get("error");
  if (oauthError) {
    return NextResponse.redirect(`${baseOrigin}/signin?error=${encodeURIComponent(oauthError)}`);
  }

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

    if (supabaseUrl && supabaseAnonKey) {
      const forwardResponse = NextResponse.redirect(`${baseOrigin}${next}`);
      const cookieStore = await cookies();

      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                forwardResponse.cookies.set(name, value, {
                  ...options,
                  secure: process.env.NODE_ENV === "production",
                  sameSite: "lax",
                  path: "/",
                });
                cookieStore.set(name, value, {
                  ...options,
                  secure: process.env.NODE_ENV === "production",
                  sameSite: "lax",
                  path: "/",
                });
              });
            } catch {
              // Ignore in context where cookies cannot be set
            }
          },
        },
      });

      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && data?.session) {
        if (data.session.access_token) {
          forwardResponse.cookies.set("sb-access-token", data.session.access_token, {
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: data.session.expires_in ?? 60 * 60 * 24 * 7,
          });
        }
        return forwardResponse;
      }
    }
  }

  // Fallback to signin with error indicator
  return NextResponse.redirect(`${baseOrigin}/signin?error=auth_callback_failed`);
}
