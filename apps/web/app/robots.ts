import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://h1tmicro.vn";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/explore",
          "/explore/coaches",
          "/explore/leaderboard",
          "/explore/meals",
          "/foods",
          "/signin",
          "/signup",
          "/terms",
          "/privacy",
        ],
        disallow: [
          "/admin",
          "/admin/*",
          "/auth",
          "/auth/*",
          "/settings",
          "/settings/*",
          "/entry",
          "/entry/*",
          "/add",
          "/add/*",
          "/setup",
          "/setup/*",
          "/dev",
          "/dev/*",
          "/paywall",
          "/paywall/*",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
