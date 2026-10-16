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
