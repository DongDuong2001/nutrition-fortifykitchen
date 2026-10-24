import { describe, expect, it } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { LEVELS, type Level } from "@/lib/coaching-link";
import { LevelBadge, badgeColours, pipColour } from "../level-badge";

// Badge.dc.html (Hao, 23/10): the tag's colours by Level, five pips under it, the L4–5 gold frame, the mini variant.

/** The light :root tokens of globals.css, so the contrast test reads the colours the app really ships. */
const TOKENS = (() => {
  const css = readFileSync(join(__dirname, "../../../app/globals.css"), "utf8");
  const out: Record<string, string> = {};
  for (const m of css.matchAll(/(--color-[\w-]+):\s*(#[0-9A-Fa-f]{6})\b/g)) out[m[1]] ??= m[2];
  return out;
})();

type Rgba = [number, number, number, number];

/** A badge colour: var(--color-x), or color-mix(in srgb, var(--color-x) P%, transparent). */
function resolve(value: string): Rgba {
  const mix = value.match(/^color-mix\(in srgb, var\((--color-[\w-]+)\) (\d+)%, transparent\)$/);
  const token = mix ? mix[1] : value.match(/^var\((--color-[\w-]+)\)$/)?.[1];
  const hex = token && TOKENS[token];
  if (!hex) throw new Error(`no token for ${value}`);
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, mix ? Number(mix[2]) / 100 : 1];
}

const over = ([r, g, b, a]: Rgba, [br, bg, bb]: Rgba): Rgba => [r * a + br * (1 - a), g * a + bg * (1 - a), b * a + bb * (1 - a), 1];
const lum = ([r, g, b]: Rgba) => {
  const c = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
};
const contrast = (fg: string, bg: string) => {
  const b = resolve(bg);
  const [l1, l2] = [lum(over(resolve(fg), b)), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

// The full badge (share image, celebration) unless a test asks for the mini one
const html = (props: Partial<React.ComponentProps<typeof LevelBadge>> & { level: Level }) => renderToStaticMarkup(<LevelBadge size="share" {...props} />);
const count = (s: string, needle: string) => s.split(needle).length - 1;

describe("LevelBadge colours (Badge.dc.html)", () => {
  it("the table: bg / label / number / shadow per Level", () => {
    expect(badgeColours(0, false)).toEqual({ bg: "var(--color-paper-dark)", label: "var(--color-secondary-strong)", number: "var(--color-ink)", shadow: "var(--color-level-edge)" });
    expect(badgeColours(1, false)).toEqual({ bg: "var(--color-sky)", label: "var(--color-ink)", number: "var(--color-ink)", shadow: "var(--color-cobalt)" });
    expect(badgeColours(2, false)).toMatchObject({ bg: "var(--color-cobalt)", number: "var(--color-on-dark)", shadow: "var(--color-ink)" });
    expect(badgeColours(2, true).shadow).toBe("var(--color-sky)");
    expect(badgeColours(3, false)).toEqual({ bg: "var(--color-ink)", label: "var(--color-sky)", number: "var(--color-on-dark)", shadow: "var(--color-cobalt)" });
    expect(badgeColours(4, false)).toEqual({ bg: "var(--color-ink)", label: "var(--color-sky)", number: "var(--color-gold)", shadow: "var(--color-gold)" });
    expect(badgeColours(5, false)).toEqual({ bg: "var(--color-gold)", label: "var(--color-ink)", number: "var(--color-ink)", shadow: "var(--color-ink)" });
    expect(badgeColours(5, true).shadow).toBe("var(--color-gold-light)");
  });

  it("L2's label is white at 88 % (the board's 85 % is 4.48:1 on cobalt, under 4.5)", () => {
    expect(badgeColours(2, false).label).toBe("color-mix(in srgb, var(--color-on-dark) 88%, transparent)");
  });

  for (const onDark of [false, true])
    for (const level of LEVELS)
      it(`Level ${level}${onDark ? " on dark" : ""}: label and number are at least 4.5:1 on the tag`, () => {
        const c = badgeColours(level, onDark);
        expect(contrast(c.label, c.bg)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(c.number, c.bg)).toBeGreaterThanOrEqual(4.5);
      });
});

describe("LevelBadge pips", () => {
  it("five pips, filled to the Level", () => {
    for (const level of LEVELS) {
      const s = html({ level });
      expect(count(s, "data-pip=")).toBe(5);
      expect(count(s, 'data-pip="on"')).toBe(level);
    }
  });

  it("the accent: cobalt on light / sky on dark for L1–3, gold for L4–5", () => {
    expect(pipColour(2, false)).toBe("var(--color-cobalt)");
    expect(pipColour(3, true)).toBe("var(--color-sky)");
    expect(pipColour(4, false)).toBe("var(--color-gold)");
    expect(pipColour(5, true)).toBe("var(--color-gold)");
  });

  it("they sit outside the layout box (absolute under the tag), so the tag stays the centre", () => {
    expect(html({ level: 3 })).toMatch(/data-pips="true"[^>]*class="[^"]*absolute[^"]*top-full/);
  });

  it("the mini badge has none", () => {
    expect(html({ level: 3, size: "mini" })).not.toContain("data-pip");
  });

  it("the celebration fills the new ones (pipsFrom): only the pips above `from` animate", () => {
    const s = html({ level: 3, pipsFrom: 1 });
    expect(count(s, "data-pip-fill")).toBe(2);
  });
});

describe("LevelBadge frame, mini, outline and shine", () => {
  it("L4–5: one gold frame round the tag; L0–3: none. No crown, no second ring", () => {
    for (const level of LEVELS) expect(count(html({ level }), "data-level-frame"), `L${level}`).toBe(level >= 4 ? 1 : 0);
    expect(html({ level: 5 })).not.toMatch(/crown|data-level-frame2/);
  });

  it("inside the frame the tag drops its hard bottom shadow for a soft drop", () => {
    expect(html({ level: 4 })).not.toContain("0 0.12em 0 var(--color-gold)");
    expect(html({ level: 3 })).toContain("0 0.12em 0 var(--color-cobalt)");
  });

  it("L5 glows gold", () => {
    expect(html({ level: 5 })).toContain("0 0 0.7em");
  });

  it("mini L4–5: no frame, a thin gold edge on the tag instead", () => {
    for (const level of [4, 5] as const) {
      const s = html({ level, size: "mini" });
      expect(s).not.toContain("data-level-frame");
      expect(s).toContain("0 0 0 0.08em var(--color-gold)");
    }
  });

  it("ink tags (L3, L4) get a 1 px sky / gold outline on dark surfaces only", () => {
    expect(html({ level: 3, onDark: true })).toContain("0 0 0 1px color-mix(in srgb, var(--color-sky) 50%, transparent)");
    expect(html({ level: 4, onDark: true })).toContain("0 0 0 1px color-mix(in srgb, var(--color-gold) 55%, transparent)");
    expect(html({ level: 3 })).not.toContain("0 0 0 1px");
  });

  it("static: the shine sweep only when asked", () => {
    expect(html({ level: 4 })).not.toContain("data-shine");
    expect(html({ level: 4, shine: true })).toContain("data-shine");
  });

  it("sized in rem, everything else in em, so it follows the phone's text size", () => {
    expect(html({ level: 2, size: "mini" })).toContain("font-size:0.875rem");
    expect(html({ level: 2, size: "share" })).toContain("font-size:1.625rem");
    expect(html({ level: 2, size: "hero" })).toContain("font-size:2.75rem");
    expect(html({ level: 2 })).not.toMatch(/(font-size|padding|width|height):[^;"]*\dpx/);
  });

  it("its box covers the slant: the row pads the tag's overhang, the frame insets by its own (same air round the tag)", () => {
    // skewX(−14°) pushes each side out by height × tan 14° / 2: 1.52em → 0.19em for the tag, 2.12em → 0.26em for the frame
    expect(html({ level: 2 })).toContain("padding:0 0.19em");
    expect(html({ level: 2, size: "mini" })).toContain("padding:0 0.19em");
    expect(html({ level: 4 })).toContain("padding:0.3em 0.68em");
    expect(html({ level: 4 })).toMatch(/data-level-frame[^>]*class="[^"]*inset-x-\[0\.26em\]/);
  });

  it("reads as one image: Level n", () => {
    expect(html({ level: 4 })).toMatch(/role="img" aria-label="Level 4"/);
  });
});
