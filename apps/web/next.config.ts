import type { NextConfig } from "next";
import path from "path";
import { loadEnvConfig } from "@next/env";
import { readFileSync } from "fs";
import { contentSecurityPolicy } from "./lib/csp";
import { PERMANENT_REDIRECTS } from "./lib/redirects";

const APP_VERSION = readFileSync(path.join(__dirname, "public/sw.js"), "utf8").match(/const VERSION = "([^"]+)"/)?.[1] ?? "unknown";

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
    value: contentSecurityPolicy({ development: process.env.NODE_ENV === "development", apiOrigin }),
  },
];

// perf/live-bundle: the sample modules of lib/mock and their live stand-ins in lib/mock/live (same exports, what they
// give outside demo mode). A live build never has a demo, so it gets the stand-ins and ships no sample day, food or course.
const LIVE_STUBS = /(?:^|[\\/])mock[\\/](sample-foods|sample-day|history|weight-log|dish-demo-foods|recent-seed|courses-mock)$/;

const nextConfig: NextConfig = {
  // check:live-bundle builds into its own folder, so the demo build a running server serves is left alone
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  // perf/server-image: the Docker image runs .next/standalone (server.js and only the traced node_modules), not the build tree
  output: "standalone",
  // No next/image anywhere, so nothing to optimise; sharp (and its @img binaries) is never loaded, so it stays out of the image
  images: { unoptimized: true },
  outputFileTracingExcludes: { "*": ["**/node_modules/sharp/**", "**/node_modules/@img/**"] },
  // Caddy compresses every web response (deploy/Caddyfile `encode zstd gzip`); the web container has no port of its own
  compress: false,
  productionBrowserSourceMaps: false,
  experimental: {
    // cc-58: the icon package is one big index; only the icons used are bundled
    optimizePackageImports: ["@mynaui/icons-react"],
    // Lower peak memory of `next build` on the VPS, for a slightly slower build
    webpackMemoryOptimizations: true,
  },
  // DEMO_BUILD=1 at build time keeps ?demo, ?as and ?level working in a production build (gates and probes only)
  // NEXT_PUBLIC_APP_VERSION: sw.js VERSION, one source for the app version (client error reports, cc-50)
  // DARK_MODE=1 at build time turns the dark mode flag on (lib/theme.ts), baked into the browser and the server code alike
  env: {
    NEXT_PUBLIC_DEMO_BUILD: process.env.DEMO_BUILD === "1" ? "1" : "",
    NEXT_PUBLIC_APP_VERSION: APP_VERSION,
    NEXT_PUBLIC_DARK_MODE: process.env.DARK_MODE === "1" ? "1" : "",
    // ENGLISH=1 at build time turns the English flag on (lib/i18n), the same way
    NEXT_PUBLIC_ENGLISH: process.env.ENGLISH === "1" ? "1" : "",
  },
  webpack(config, { webpack }) {
    if (process.env.NEXT_PUBLIC_API_MODE === "live") {
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(LIVE_STUBS, (resource: { request: string }) => {
          const name = LIVE_STUBS.exec(resource.request)?.[1];
          if (name) resource.request = path.join(__dirname, "lib/mock/live", `${name}.ts`);
        })
      );
    }
    return config;
  },
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
