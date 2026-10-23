import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildShareModel } from "@/lib/share-card";
import { groupMeals, type HomeEntry } from "@/lib/home";
import { LEVELS, type Level } from "@/lib/coaching-link";
import { countedForLevel } from "@/lib/level-nutrients";
import { SAMPLE_DAY } from "@/lib/mock/sample-day";
import { ShareDay } from "../share-day";

// Share.dc.html + ShareHeaders.dc.html (Hao 23/10): the new badge, static, in the share header at every Level; Level 5's gold frame.

const entry = (id: string, slot: HomeEntry["slot"], name: string): HomeEntry => ({
  id, name, qty: "100 g", grams: 100, slot, kcal: 100, protein: 1, carbs: 1, fat: 1, fiber: 1, nutrients: {}, quick: false,
});

function html(level: Level) {
  const entries = [entry("a", "breakfast", "Yến mạch")];
  const model = buildShareModel({
    day: { ...SAMPLE_DAY, date: "2026-10-23" },
    entries,
    meals: groupMeals(entries),
    finished: false,
    now: new Date("2026-10-23T10:00:00+07:00"),
    displayName: "Gabe",
    level,
    nutrientIds: countedForLevel(level),
  });
  return renderToStaticMarkup(<ShareDay model={model} />);
}

describe("share image header", () => {
  it("every Level, 0 included, shows its badge at the share size", () => {
    for (const level of LEVELS) expect(html(level), `L${level}`).toMatch(new RegExp(`data-level-badge="${level}"[^>]*font-size:1\\.625rem`));
  });

  it("is static: no shine, no pip fill, nothing that html-to-image cannot draw", () => {
    for (const level of LEVELS) expect(html(level)).not.toMatch(/data-shine|lv-pip|backdrop-filter|mask-image/);
  });

  it("aligns its items to the top (the tag on the name line, the pips on the date line)", () => {
    expect(html(2)).toMatch(/data-share-header[^>]*class="[^"]*items-start/);
  });

  it("L4–5 take back the frame's top air, so the tag stays on the name line", () => {
    expect(html(4)).toMatch(/data-level-badge="4"[^>]*class="[^"]*-mt-\[0\.3em\]/);
    expect(html(3)).not.toContain("-mt-[0.3em]");
  });
});

describe("Level 5's reward", () => {
  it("a 5 px gold frame round the whole image and a gold MICRO", () => {
    const top = html(5);
    expect(top).toContain("data-share-gold-frame");
    expect(top).toMatch(/text-gold[^"]*">MICRO/);
  });

  it("not below Level 5", () => {
    const four = html(4);
    expect(four).not.toContain("data-share-gold-frame");
    expect(four).toMatch(/text-cobalt-on-dark[^"]*">MICRO/);
  });
});
