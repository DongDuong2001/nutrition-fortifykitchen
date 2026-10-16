import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  KilnWordmarkFooter,
  clamp,
  glyphPath,
  layoutWord,
  leanTile,
  nextTile,
  supported,
  TILES,
} from "../kiln-wordmark-footer";

describe("KilnWordmarkFooter pure geometry and maths", () => {
  it("clamp restricts numbers to range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it("nextTile cycles through available tile compositions", () => {
    expect(nextTile(0)).toBe(1);
    expect(nextTile(3)).toBe(0);
    expect(nextTile(NaN)).toBe(1);
  });

  it("leanTile nudges the disc center coordinates", () => {
    const tile = TILES[0];
    const leaned = leanTile(tile, 1, 1);
    expect(leaned.cx).toBeGreaterThan(tile.cx);
    expect(leaned.cy).toBeGreaterThan(tile.cy);
  });

  it("supported correctly validates alphabet glyphs including digit 1 and uppercase", () => {
    expect(supported("H1T MICRO")).toBe(true);
    expect(supported("h1t micro")).toBe(true);
    expect(supported("nutrition")).toBe(true);
    expect(supported("vietnam-1")).toBe(true);
    expect(supported("@")).toBe(false);
  });

  it("layoutWord lays out letters with positive width", () => {
    const { letters, width } = layoutWord("H1T MICRO");
    expect(letters.length).toBe(9);
    expect(width).toBeGreaterThan(0);
  });

  it("glyphPath generates non-empty SVG path data for valid glyph", () => {
    const path = glyphPath("H", 1);
    expect(path).toContain("M");
    expect(path).toContain("Z");
  });
});

describe("KilnWordmarkFooter component rendering", () => {
  it("renders server-side with brand, motto and navigation columns", () => {
    const html = renderToString(
      <KilnWordmarkFooter
        brand="H1T MICRO"
        wordmark="H1T MICRO"
        motto={["22 VI CHẤT", "CHUẨN KHOA HỌC"]}
      />,
    );
    expect(html).toContain("H1T MICRO");
    expect(html).toContain("22 VI CHẤT");
    expect(html).toContain("CHUẨN KHOA HỌC");
    expect(html).toContain("Lên đầu trang");
    expect(html).toContain("Tính năng");
  });
});
