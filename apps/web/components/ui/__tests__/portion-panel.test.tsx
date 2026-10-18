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

describe("PortionPanel by the coach's portion model (cc-53b)", () => {
  const egg = {
    id: "food-egg",
    nameVi: "Trứng gà luộc",
    category: "dam",
    source: "USDA",
    servings: [
      { label: "1 quả vừa (trứng 50-55 g)", grams: 46.2 },
      { label: "1 quả nhỏ (trứng 45-50 g)", grams: 41.8 },
      { label: "1 quả lớn (trứng 55-60 g)", grams: 50.6 },
      { label: "1 quả rất lớn (trứng 60-65 g)", grams: 55 },
      { label: "100 g", grams: 100 },
    ],
    nutrients: { energy: 155, protein: 12.6, fat: 10.6, carbs: 1.1 },
  } as unknown as (typeof MOCK_FOODS)[number];
  const chicken = MOCK_FOODS.find((f) => f.id === "food-uc-ga")!;
  const redBull = {
    id: "food-red-bull",
    nameVi: "Red Bull",
    category: "do_uong",
    source: "label",
    servings: [{ label: "1 lon", grams: 250 }, { label: "100 g", grams: 100 }],
    nutrients: { energy: 45, carbs: 11 },
  } as unknown as (typeof MOCK_FOODS)[number];
  const render = (food: (typeof MOCK_FOODS)[number], label: string, grams: string) =>
    renderToString(
      <DiaryProvider>
        <PortionPanel food={food} gramsInput={grams} setGramsInput={vi.fn()} selectedServingLabel={label} setSelectedServingLabel={vi.fn()} mealSlot="lunch" onAdd={vi.fn()} />
      </DiaryProvider>
    );

  it("3 large eggs: Quả | Gam, the four box sizes, Mấy quả? and the summary", () => {
    const html = render(egg, "Cỡ lớn · 3 quả", "151,8");
    for (const text of ["Quả", "Gam", "Trứng cỡ nào?", "Nhỏ", "Vừa", "Lớn", "Rất lớn", "55–60 g", "Mấy quả?", "3 quả lớn", "app tự trừ vỏ"]) {
      expect(html, text).toContain(text);
    }
    expect(html).not.toContain("Số gam");
  });

  it("an egg in grams has the gram field, 100 g and ×N", () => {
    const html = render(egg, "120 g", "120");
    expect(html).toContain("Số gam");
    expect(html).toContain("100 g");
    expect(html).toContain("Nhân khẩu phần nhanh");
    expect(html).not.toContain("Mấy quả?");
  });

  it("cooked chicken: Sống | Chín, the amount set, and what it stands for raw", () => {
    const html = render(chicken, "Đã nấu chín · 150 g", "214,3");
    expect(html).toContain("Bạn cân lúc nào?");
    expect(html).toContain("Cân sống");
    expect(html).toContain("Đã nấu chín");
    expect(html).toContain("150 g đã nấu chín");
    expect(html).toContain("bằng khoảng 214 g sống");
    expect(html).toContain("Bấm + để nhân 150 g này lên");
  });

  it("Red Bull keeps its lon tabs and the unit stepper (coach rule 5)", () => {
    const html = render(redBull, "1,5 lon", "375");
    expect(html).toContain("Đơn vị khẩu phần");
    expect(html).toContain("Tăng số lượng");
    expect(html).not.toContain("Nhân khẩu phần nhanh");
  });
});
