import { beforeAll, describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { PortionPanel } from "../portion-panel";
import { MOCK_FOODS } from "@/lib/mock/foods";
import { DiaryProvider } from "@/lib/diary-store";
import { loadFoodRows } from "@/lib/food-rows";

// The raw / cooked data (the Sống | Chín switch) loads after the first paint (lib/food-rows)
beforeAll(() => loadFoodRows());

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
  // Lean beef with raw numbers: cooked weight converts by the meat factor 0.7
  const beef = MOCK_FOODS.find((f) => f.id === "food-thit-bo-nac")!;
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

  it("cooked meat with raw data: Sống | Chín, the amount set, and what it stands for raw", () => {
    const html = render(beef, "Đã nấu chín · 150 g", "214,3");
    expect(html).toContain("Bạn cân lúc nào?");
    expect(html).toContain("Cân sống");
    expect(html).toContain("Đã nấu chín");
    expect(html).toContain("150 g đã nấu chín");
    expect(html).toContain("bằng khoảng 214 g sống");
    expect(html).not.toContain("Bấm + để nhân");
  });

  it("Red Bull keeps its lon tabs and the unit stepper (coach rule 5)", () => {
    const html = render(redBull, "1,5 lon", "375");
    expect(html).toContain("Đơn vị khẩu phần");
    expect(html).toContain("Tăng số lượng");
    expect(html).not.toContain("Nhân khẩu phần nhanh");
  });
});

describe("PortionPanel size chips (cc-61)", () => {
  const dish = (servings: Array<{ label: string; grams: number }>) =>
    ({ id: "food-test-dish", nameVi: "Món thử", category: "mon_viet", source: "USDA", servings, nutrients: { energy: 100 } }) as unknown as (typeof MOCK_FOODS)[number];
  const render = (food: (typeof MOCK_FOODS)[number], label: string, grams: string) =>
    renderToString(
      <DiaryProvider>
        <PortionPanel food={food} gramsInput={grams} setGramsInput={vi.fn()} selectedServingLabel={label} setSelectedServingLabel={vi.fn()} mealSlot="lunch" onAdd={vi.fn()} />
      </DiaryProvider>
    );

  it("one size (Phở bò: Tô | Gam) has the toggle and no lone size chip", () => {
    const html = render(dish([{ label: "1 tô", grams: 500 }, { label: "100 g", grams: 100 }]), "1 tô", "500");
    expect(html).toContain('aria-label="Đơn vị khẩu phần"');
    expect(html).not.toContain('aria-label="Kích cỡ"');
  });

  it("several sizes keep the chip row with one chip each", () => {
    const html = render(dish([{ label: "1 tô nhỏ", grams: 350 }, { label: "1 tô vừa", grams: 500 }, { label: "1 tô lớn", grams: 650 }, { label: "100 g", grams: 100 }]), "1 tô vừa", "500");
    expect(html).toContain('aria-label="Kích cỡ"');
    expect(html.match(/aria-pressed/g)?.length).toBeGreaterThanOrEqual(5);
    for (const size of ["Nhỏ", "Vừa", "Lớn"]) expect(html).toContain(`>${size}</button>`);
  });
});

describe("PortionPanel buttons (fix/polish-1020 item 4)", () => {
  const render = () =>
    renderToString(
      <DiaryProvider>
        <PortionPanel food={MOCK_FOODS[0]} gramsInput="100" setGramsInput={vi.fn()} selectedServingLabel="100 g" setSelectedServingLabel={vi.fn()} mealSlot="lunch" onAdd={vi.fn()} />
      </DiaryProvider>
    );

  it("has no Close of its own: the + sheet's portion step (components/ui/sheet-view) holds ‹ and ✕", () => {
    expect(render()).not.toContain('aria-label="Đóng"');
  });

  it("the primary buttons may wrap to two lines (min-h-14, not h-14) so a long label never clips at 360 px and 150 % text", () => {
    const html = render();
    expect(html).toMatch(/data-testid="portion-add"[^>]*class="[^"]*min-h-14/);
    expect(html).not.toMatch(/data-testid="portion-add"[^>]*class="[^"]*(?<![-\w])h-14\b/);
  });
});
