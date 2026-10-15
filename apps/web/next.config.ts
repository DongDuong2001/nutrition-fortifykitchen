import type { NextConfig } from "next";
import path from "path";
import { loadEnvConfig } from "@next/env";
import { PERMANENT_REDIRECTS } from "./lib/redirects";

// Automatically load the monorepo root .env.local if present
loadEnvConfig(path.resolve(process.cwd(), "../.."));

const apiOrigin = (() => {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) return "";
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
})();

const SECURITY_HEADERS = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://hcaptcha.com https://*.hcaptcha.com",
      "style-src 'self' 'unsafe-inline' https://hcaptcha.com https://*.hcaptcha.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      `connect-src 'self' ${apiOrigin ? apiOrigin + " " : ""}https://*.supabase.co wss://*.supabase.co https://hcaptcha.com https://*.hcaptcha.com http://localhost:* ws://localhost:*`,
      "frame-src 'self' https://hcaptcha.com https://*.hcaptcha.com",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async redirects() {
    return PERMANENT_REDIRECTS.map((r) => ({ ...r }));
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
