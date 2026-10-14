import type { NextConfig } from "next";
import path from "path";
import { loadEnvConfig } from "@next/env";
import { PERMANENT_REDIRECTS } from "./lib/redirects";

// Automatically load the monorepo root .env.local if present
loadEnvConfig(path.resolve(process.cwd(), "../.."));

const nextConfig: NextConfig = {
  async redirects() {
    return PERMANENT_REDIRECTS.map((r) => ({ ...r }));
  },
};

export default nextConfig;
