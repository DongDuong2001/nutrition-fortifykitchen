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

describe("PortionPanel for a food with unit servings (e.g. Trứng gà)", () => {
  const eggFood = {
    id: "food-egg",
    nameVi: "Trứng gà",
    category: "dam",
    servings: [
      { label: "1 quả", grams: 55 },
      { label: "2 quả", grams: 110 },
      { label: "100 g", grams: 100 },
    ],
    nutrients: { energy: 142, protein: 12.6, fat: 9.5, carbs: 0.7 },
  } as unknown as (typeof MOCK_FOODS)[number];

  it("renders segmented toggle and QuantityStepper when a unit chip is active", () => {
    const html = renderToString(
      <DiaryProvider>
        <PortionPanel
          food={eggFood}
          gramsInput="55"
          setGramsInput={vi.fn()}
          selectedServingLabel="1 quả"
          setSelectedServingLabel={vi.fn()}
          mealSlot="breakfast"
          onAdd={vi.fn()}
        />
      </DiaryProvider>
    );

    // Toggle tabs are present: Quả and Gam
    expect(html).toContain("Quả");
    expect(html).toContain("Gam");
    // QuantityStepper is present on unit tab
    expect(html).toContain("Số lượng");
    expect(html).toContain("×1");
  });

  it("shows ×2 when 2 quả is selected", () => {
    const html = renderToString(
      <DiaryProvider>
        <PortionPanel
          food={eggFood}
          gramsInput="110"
          setGramsInput={vi.fn()}
          selectedServingLabel="2 quả"
          setSelectedServingLabel={vi.fn()}
          mealSlot="breakfast"
          onAdd={vi.fn()}
        />
      </DiaryProvider>
    );

    expect(html).toContain("Số lượng");
    expect(html).toContain("×2");
  });

  it("hides QuantityStepper when a gram serving (100 g) is active", () => {
    const html = renderToString(
      <DiaryProvider>
        <PortionPanel
          food={eggFood}
          gramsInput="100"
          setGramsInput={vi.fn()}
          selectedServingLabel="100 g"
          setSelectedServingLabel={vi.fn()}
          mealSlot="breakfast"
          onAdd={vi.fn()}
        />
      </DiaryProvider>
    );

    expect(html).toContain("Số gam");
    expect(html).not.toContain("Số lượng");
    expect(html).not.toContain("Tăng số lượng");
  });
});
