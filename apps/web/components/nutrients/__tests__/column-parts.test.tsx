import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NutrientColumn } from "@/components/home/nutrient-column";
import { TemplateMicros } from "@/components/templates/template-micros";
import { columnGroups } from "@/lib/level-nutrients";
import type { HomeValues } from "@/lib/home";
import { ExtraRow, GroupTitle, LevelSummary } from "../column-parts";

// Hôm nay's Vi chất column and the Ngày ăn mẫu builder show the same three pieces: "x/N đạt" with the lowest micros, a group title, and
// the Level 3 extras as an amount. They come from one place, so the two screens cannot drift apart.

const summary = { reached: 14, total: 22, lacking: ["Kẽm", "Vitamin D"] };

describe("the shared pieces", () => {
  it("LevelSummary: the count, đạt, and the lowest names; no line when nothing is lacking", () => {
    const html = renderToStaticMarkup(<LevelSummary summary={summary} />);
    expect(html).toContain("data-level-summary");
    expect(html).toContain("14/22");
    expect(html).toContain("Thiếu nhiều nhất:");
    expect(html).toContain("Kẽm, Vitamin D");
    expect(renderToStaticMarkup(<LevelSummary summary={{ reached: 22, total: 22, lacking: [] }} />)).not.toContain("Thiếu nhiều nhất");
  });

  it("GroupTitle: an h3 with the hairline; only a snapping column marks it as a row", () => {
    const plain = renderToStaticMarkup(<GroupTitle title="Khoáng chất" />);
    expect(plain).toMatch(/<h3[^>]*>Khoáng chất<\/h3>/);
    expect(plain).not.toContain("data-snap-row");
    expect(renderToStaticMarkup(<GroupTitle title="Khoáng chất" snap />)).toContain("data-snap-row");
  });

  it("ExtraRow: the name and the amount with its unit; a dash of words when unknown", () => {
    expect(renderToStaticMarkup(<ExtraRow name="Chất béo đơn" unit="g" amount={4.2} />)).toMatch(/data-extra[\s\S]*Chất béo đơn[\s\S]*4,2 g/);
    expect(renderToStaticMarkup(<ExtraRow name="Chất béo đơn" unit="g" amount={null} />)).toContain("chưa có dữ liệu");
  });
});

describe("both screens use them", () => {
  const groups = columnGroups(3);
  const targets: Record<string, number | null> = {};
  const extras: Record<string, number | null> = { monounsaturated_fat: 4.2 };
  const values: HomeValues = { kcal: 1200, protein: 60, carbs: 150, fat: 40, fiber: 18, nutrients: { calcium: 500, iron: 8 } };
  const column = renderToStaticMarkup(
    <NutrientColumn values={values} extras={extras} groups={groups} targets={targets} selected={false} microsHref="/micros" summary={summary} />,
  );
  const builder = renderToStaticMarkup(
    <TemplateMicros values={values} extras={extras} groups={groups} targets={targets} summary={summary} empty={false} />,
  );
  const strip = (s: string) => s.replace(/ data-snap-row="true"/g, "").replace(/ snap-start/g, "").replace(/ flex-none/g, "");
  const pick = (html: string, re: RegExp) => (html.match(re) ?? []).map(strip);

  it("the same summary", () => {
    const re = /<p data-level-summary[\s\S]*?<\/p>/g;
    expect(pick(column, re)).toHaveLength(1);
    expect(pick(builder, re)).toEqual(pick(column, re));
  });

  it("the same group titles", () => {
    const re = /<h3[\s\S]*?<\/h3>/g;
    expect(pick(builder, re).length).toBeGreaterThan(1);
    expect(pick(builder, re)).toEqual(pick(column, re));
  });

  it("the same extras rows", () => {
    const re = /<div[^>]*data-extra[\s\S]*?<\/div>/g;
    expect(pick(builder, re).length).toBeGreaterThan(0);
    expect(pick(builder, re)).toEqual(pick(column, re));
  });
});
