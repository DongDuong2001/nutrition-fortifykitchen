import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LevelBar } from "../level-bar";

const render = (pct: number | null) => renderToStaticMarkup(<LevelBar label="Canxi" pct={pct} heightClass="h-[9px]" />);

describe("LevelBar (cc-57, cc-58)", () => {
  it("always draws its fill: a bar at 0 sits off the track at translateX(-100%), so 0 → value can grow", () => {
    const zero = render(0);
    expect(zero).toContain("m-bar");
    expect(zero).toContain("translateX(-100%)");
    expect(render(40)).toContain("translateX(-60%)");
    expect(render(150)).toContain("translateX(0%)");
  });

  it("says the level in words as well as the percentage (the colour alone is not enough)", () => {
    expect(render(30)).toContain('aria-valuetext="30% · Thiếu"');
    expect(render(65)).toContain('aria-valuetext="65% · Trung bình"');
    expect(render(90)).toContain('aria-valuetext="90% · Gần đủ"');
    expect(render(120)).toContain('aria-valuetext="120% · Đạt"');
    expect(render(null)).toContain('aria-valuetext="Chưa có dữ liệu"');
  });
});
