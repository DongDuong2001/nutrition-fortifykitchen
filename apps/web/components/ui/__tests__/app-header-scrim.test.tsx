import { describe, expect, it } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { AppHeader } from "../app-header";

const css = readFileSync(path.join(__dirname, "../../../app/globals.css"), "utf8");
const block = (name: string) => {
  const start = css.indexOf(`@utility ${name} {`);
  expect(start, `@utility ${name}`).toBeGreaterThan(-1);
  let depth = 0;
  for (let i = css.indexOf("{", start); i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}" && --depth === 0) return css.slice(start, i + 1);
  }
  throw new Error("unclosed block");
};

describe("the status-bar scrim (fix/status-bar-scrim)", () => {
  const scrim = () => block("glass-scrim");

  it("is the tab bar's glass: the same fill and blur, as tall as the safe area plus a short fade", () => {
    expect(scrim()).toContain("background-color: var(--color-glass-tab)");
    expect(scrim()).toContain("backdrop-filter: blur(24px) saturate(180%)");
    expect(scrim()).toContain("env(safe-area-inset-top)");
    expect(scrim()).toMatch(/mask-image:\s*linear-gradient\(/);
  });

  it("is solid under reduced transparency and more contrast, and still fades", () => {
    const reduced = /@media \(prefers-reduced-transparency: reduce\) \{([^}]*)\}/.exec(scrim())?.[1] ?? "";
    expect(reduced).toContain("background-color: var(--color-card)");
    expect(reduced).toContain("backdrop-filter: none");
    const contrast = /@media \(prefers-contrast: more\) \{([^}]*)\}/.exec(scrim())?.[1] ?? "";
    expect(contrast).toContain("background-color: var(--color-card)");
    expect(contrast).toContain("backdrop-filter: none");
  });

  it("collapses to nothing when there is no safe area (a browser tab, a phone with no notch), so no band shows there", () => {
    expect(scrim()).toMatch(/--scrim-fade:\s*min\(12px,\s*calc\(var\(--scrim-inset\) \* 100\)\)/);
  });

  const phone = (props: React.ComponentProps<typeof AppHeader>) => renderToStaticMarkup(<AppHeader {...props} />);
  const scrimOf = (html: string) => /<div[^>]*data-status-scrim[^>]*>/.exec(html)?.[0] ?? "";

  it.each([
    ["a tab root", { variant: "tab" as const, title: "Khám phá" }],
    ["Hôm nay", { variant: "daily" as const, title: "Hôm nay", wordmark: true }],
    ["a push screen", { variant: "sub" as const, title: "Chất béo", backHref: "/micros" }],
  ])("%s has one scrim, on phones only, that never takes a tap", (_name, props) => {
    const html = phone(props);
    const el = scrimOf(html);
    expect(el).toContain("glass-scrim");
    expect(el).toContain("fixed");
    expect(el).toContain("lg:hidden");
    expect(el).toContain("pointer-events-none");
    expect(el).toContain('aria-hidden="true"');
    expect(html.match(/data-status-scrim/g)).toHaveLength(1);
  });

  it("replaces the 24 px page-colour fade of the push screens", () => {
    const html = phone({ variant: "sub", title: "Chất béo", backHref: "/micros" });
    expect(html).not.toContain("from-page to-transparent");
    expect(html).not.toMatch(/fixed inset-x-0 top-0 z-sticky h-6/);
  });
});
