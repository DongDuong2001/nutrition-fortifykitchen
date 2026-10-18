import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { PortionPanel } from "../portion-panel";
import { MOCK_FOODS } from "@/lib/mock/foods";
import { DiaryProvider } from "@/lib/diary-store";

describe("PortionPanel multi-add action", () => {
  const sampleFood = MOCK_FOODS[0];

  it("renders single button when onAddAndContinue is not provided", () => {
    const html = renderToString(
      <DiaryProvider>
        <PortionPanel
          food={sampleFood}
          gramsInput="100"
          setGramsInput={vi.fn()}
          selectedServingLabel="100 g"
          setSelectedServingLabel={vi.fn()}
          mealSlot="lunch"
          onAdd={vi.fn()}
        />
      </DiaryProvider>
    );

    expect(html).toContain("Thêm vào Bữa trưa");
    expect(html).not.toContain("Lưu &amp; chọn tiếp");
  });

  it("renders both 'Lưu & chọn tiếp' and 'Thêm vào...' when onAddAndContinue is provided", () => {
    const html = renderToString(
      <DiaryProvider>
        <PortionPanel
          food={sampleFood}
          gramsInput="100"
          setGramsInput={vi.fn()}
          selectedServingLabel="100 g"
          setSelectedServingLabel={vi.fn()}
          mealSlot="lunch"
          onAdd={vi.fn()}
          onAddAndContinue={vi.fn()}
        />
      </DiaryProvider>
    );

    expect(html).toContain("Lưu &amp; chọn tiếp");
    expect(html).toContain("Thêm vào Bữa trưa");
    expect(html).toContain('data-align-group="portion"');
  });
});

describe("PortionPanel for a supplement from a pack label", () => {
  const supplement = {
    id: "food-test-supplement",
    nameVi: "Vitamin D3 thử",
    category: "bo_sung",
    source: "label",
    servings: [{ label: "1 viên", grams: 1 }],
    nutrients: { energy: 5 },
  } as unknown as (typeof MOCK_FOODS)[number];
  const render = (label: string, grams: string) =>
    renderToString(
      <DiaryProvider>
        <PortionPanel food={supplement} gramsInput={grams} setGramsInput={vi.fn()} selectedServingLabel={label} setSelectedServingLabel={vi.fn()} mealSlot="lunch" onAdd={vi.fn()} />
      </DiaryProvider>
    );

  it("has no gram field, and a ×N stepper with 44 px buttons named in Vietnamese", () => {
    const html = render("1 viên", "1");
    expect(html).not.toContain("Số gam");
    expect(html).toContain("Tăng số lượng");
    expect(html).toContain("Giảm số lượng");
    expect(html).toContain("×1");
    expect(html.match(/h-11 w-11/g)?.length).toBe(2);
  });

  it("shows the count of the collapsed label", () => {
    expect(render("3 viên", "3")).toContain("×3");
  });
});
