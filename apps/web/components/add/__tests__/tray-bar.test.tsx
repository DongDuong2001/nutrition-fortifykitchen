import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TrayBar } from "../add-tray";

const render = (props: Partial<React.ComponentProps<typeof TrayBar>> = {}) =>
  renderToStaticMarkup(
    <TrayBar totals={{ count: 20, kcal: 12345, protein: 1, carbs: 1, fat: 1 }} mealName="Bữa sáng" canAdd onReview={() => {}} onAdd={() => {}} {...props} />,
  );

describe("TrayBar: Hai hàng (cc-63, B3)", () => {
  it("row 1 holds the count, the kcal and Xem lại; row 2 the full-width add", () => {
    const html = render();
    expect(html).toContain('data-tour="tray-bar"');
    expect(html).toContain('aria-label="20 món · 12.345 kcal"');
    expect(html).toMatch(/20 món · <span class="font-display[^"]*">12\.345<\/span> kcal/);
    expect(html.indexOf("Xem lại")).toBeGreaterThan(html.indexOf("12.345"));
    expect(html.indexOf("Thêm 20 món vào Bữa sáng")).toBeGreaterThan(html.indexOf("Xem lại"));
    expect(html).toContain("flex-col gap-1.5 rounded-card bg-ink p-2");
  });

  it("row 1 truncates and never wraps over a button; Xem lại keeps a 44 px hit area; the add is 48 px", () => {
    const html = render();
    expect(html).toContain("min-w-0 flex-1 truncate");
    expect(html).toMatch(/min-h-11 min-w-11 shrink-0[^"]*text-sky/);
    expect(html).toMatch(/h-12 w-full[^"]*bg-cobalt/);
  });

  it("shows — when the total is unknown, never 0 kcal", () => {
    const html = render({ totals: { count: 2, kcal: null, protein: null, carbs: null, fat: null } });
    expect(html).toContain('aria-label="2 món · — kcal"');
    expect(html).not.toContain(">0<");
  });

  it("the add names the count and the meal, and is off when nothing can be added", () => {
    const html = render({ totals: { count: 1, kcal: 130, protein: 1, carbs: 1, fat: 1 }, mealName: "Bữa tối", canAdd: false });
    expect(html).toContain("Thêm 1 món vào Bữa tối");
    expect(html).toMatch(/<button[^>]*disabled[^>]*>\s*<span class="[^"]*">Thêm 1 món/);
  });
});
