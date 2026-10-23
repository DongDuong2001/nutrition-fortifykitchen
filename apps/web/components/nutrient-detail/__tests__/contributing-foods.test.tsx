import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ContributingFoods } from "../contributing-foods";
import { nutrientSourcesIn } from "@/lib/nutrient-sources";
import { contribDay } from "@/lib/__tests__/contrib-day-fixture";

const text = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const rows = (html: string) => html.split('data-align-group="nutrient-source"').length - 1;

describe("ContributingFoods: the card adds up to the page (hotfix 23/10)", () => {
  const sources = nutrientSourcesIn(contribDay(), {}, "fat", []);
  const html = renderToStaticMarkup(<ContributingFoods sources={sources} unit="g" total={103} />);

  it("shows the five largest foods and one more row, Món khác, for the rest", () => {
    expect(rows(html)).toBe(6);
    expect(text(html)).toContain("Quả bơ · 196 g 29,4 g");
    expect(text(html)).toContain("Thịt bò nạc · 200 g · 2 lần 24 g");
    expect(text(html)).toContain("Món khác · 4 món 9,8 g");
    expect(text(html)).not.toContain("Cơm trắng");
  });

  it("makes the last row a button that is closed, names what it opens and is at least 48 px tall", () => {
    const button = /<button[^>]*>/.exec(html)?.[0] ?? "";
    expect(button).toContain('aria-expanded="false"');
    expect(button).toMatch(/aria-controls="[^"]+"/);
    expect(button).toContain("min-h-12");
    expect(button).toContain("text-cobalt"); // the row that opens in blue, so it reads as a control and not as a 6th food
    expect(button).toContain('type="button"');
    expect(html).toContain("m-chevron");
  });

  it("ends with the page's total, from the hero and not from the rounded rows", () => {
    expect(text(html)).toContain("Tổng 103 g từ 9 món");
  });

  it("with five foods or fewer there is no Món khác row", () => {
    const few = renderToStaticMarkup(<ContributingFoods sources={sources.slice(0, 5)} unit="g" total={93} />);
    expect(few).not.toContain("Món khác");
    expect(few).not.toContain("<button");
    expect(rows(few)).toBe(5);
    expect(text(few)).toContain("Tổng 93 g từ 5 món");
  });

  it("with no food keeps today's empty copy, and no total", () => {
    expect(text(renderToStaticMarkup(<ContributingFoods sources={[]} unit="g" total={null} />))).toBe("Chưa có món nào có chất này hôm nay.");
    expect(text(renderToStaticMarkup(<ContributingFoods sources={[]} unit="g" total={null} isToday={false} />))).toBe("Chưa có món nào có chất này.");
  });

  it("a past day reads the same", () => {
    const past = renderToStaticMarkup(<ContributingFoods sources={sources} unit="g" total={103} isToday={false} />);
    expect(text(past)).toContain("Món khác · 4 món 9,8 g");
    expect(text(past)).toContain("Tổng 103 g từ 9 món");
  });
});
