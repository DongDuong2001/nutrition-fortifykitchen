import { describe, expect, it } from "vitest";
import { contrast, token } from "./css-tokens";

// D-COL-01 (DESIGN.md) for the V3 palette: every text token on the surfaces it is used on is at least 4.5:1. The values
// are read from app/globals.css, so a token change that breaks a pair fails here. Glass is checked over its solid
// fallback (the card): the 0.72 fill over the worst content is the design-floor probe's job.
const PAIRS: [text: string, surface: string][] = [
  ["text", "page"],
  ["text", "card"],
  ["text", "surface"],
  ["text", "seg-track"],
  ["secondary", "page"],
  ["secondary", "card"],
  ["secondary", "surface"],
  ["cobalt", "page"],
  ["cobalt", "card"],
  ["cobalt", "cobalt-tint"],
  ["on-accent", "cobalt"],
  ["on-accent", "destructive"],
  ["on-accent", "ink"],
  // V3's red deep #E9152D is 4,1:1 on the grey page, so destructive text sits on a white card only (OPEN_QUESTIONS 22/10)
  ["destructive-text", "card"],
  ["success", "card"],
  ["amber", "card"],
  ["warning-text", "warning-bg"],
  ["on-dark", "ink"],
  ["on-dark", "surface-dark"],
  ["sky", "ink"],
  ["cobalt-on-dark", "ink"],
  ["muted-subtitle", "ink"],
  ["muted-on-dark", "ink"],
  ["glass-text", "card"],
  ["glass-tab-off", "card"],
  ["macro-kcal-text", "card"],
  ["macro-dam-text", "card"],
  ["macro-tinhbot-text", "card"],
  ["macro-beo-text", "card"],
  ["macro-xo-text", "card"],
  ["macro-muoi-text", "card"],
  ...["red", "orange", "yellow", "green", "mint", "teal", "cyan", "blue", "indigo", "purple", "pink", "brown"].map(
    (c) => [`deep-${c}`, "card"] as [string, string],
  ),
];

describe("text tokens against their surfaces (4.5:1)", () => {
  it.each(PAIRS)("%s on %s", (text, surface) => {
    const fg = token(text);
    const bg = token(surface);
    expect(fg, text).not.toBe("");
    expect(bg, surface).not.toBe("");
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
});
