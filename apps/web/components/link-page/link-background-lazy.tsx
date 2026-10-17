"use client";

import dynamic from "next/dynamic";

/**
 * cc-51: the link page's decorative background is drawn after the page is up, so its many SVG paths are not in the
 * first HTML. Nothing reads it (aria-hidden), and the page looks the same once it arrives.
 */
export const LinkBackgroundLazy = dynamic(() => import("./link-background").then((m) => m.LinkBackground), { ssr: false });
