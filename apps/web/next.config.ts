import type { NextConfig } from "next";
import { PERMANENT_REDIRECTS } from "./lib/redirects";

const nextConfig: NextConfig = {
  async redirects() {
    return PERMANENT_REDIRECTS.map((r) => ({ ...r }));
  },
};

export default nextConfig;
