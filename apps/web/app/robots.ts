import type { MetadataRoute } from "next";
import { coachingAvailable } from "@/lib/coaching-link";
import { isLiveMode } from "@/lib/api-mode";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://h1tmicro.vn";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/explore",
          // Live mode has no coaches or ranking yet: those pages answer 404
          ...(coachingAvailable(isLiveMode()) ? ["/explore/coaches", "/explore/leaderboard"] : []),
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
          "/coach",
          "/coach/*",
          "/join",
          "/join/*",
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
