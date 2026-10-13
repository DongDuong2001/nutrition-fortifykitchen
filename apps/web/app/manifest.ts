import type { MetadataRoute } from "next";
import { INK_COLOR, PAPER_COLOR } from "@/lib/pwa";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "H1T MICRO",
    short_name: "H1T MICRO",
    lang: "vi",
    description: "Theo dõi 22 vi chất và dinh dưỡng mỗi ngày, ghi nhật ký ăn uống ngay cả khi ngoại tuyến.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: PAPER_COLOR,
    theme_color: INK_COLOR,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Thêm món", url: "/add", icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Nhật ký", url: "/diary", icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }] },
    ],
  };
}
