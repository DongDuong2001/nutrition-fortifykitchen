import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { MOCK_FOODS } from "@/lib/mock/foods";
import type { FoodList as FoodListData } from "@/lib/food-categories";
import { ADD_LIST_LIMITS, DEFAULT_FOOD_LIST_LIMITS, FoodList } from "../food-list";

// fix/polish-1020 item 3: the add list draws a few rows of each category and "Xem thêm (n món)" adds more: Tab walks tens of controls,
// the sheet draws a few hundred nodes, not thousands. Every other list keeps its 50.

const foods = MOCK_FOODS.slice(0, 40);
const grouped: FoodListData = { grouped: true, foods, groups: [{ key: "trai_cay", label: "Trái cây", foods }] };
const flat: FoodListData = { grouped: false, foods, groups: [] };

const render = (list: FoodListData, limits?: typeof ADD_LIST_LIMITS) =>
  renderToString(
    <FoodList list={list} onPick={() => {}} getMeta={() => "meta"} categoryName={() => "nhóm"} empty={<p>trống</p>} limits={limits} />
  );
const rowsOf = (html: string) => (html.match(/data-food-row=/g) ?? []).length;

describe("the add list's limits", () => {
  it("a category shows 5 rows and says how many more", () => {
    const html = render(grouped, ADD_LIST_LIMITS);
    expect(rowsOf(html)).toBe(5);
    expect(html).toContain("Xem thêm (35 món)");
  });

  it("a flat (searched) list shows 30 and the rest behind Xem thêm", () => {
    const html = render(flat, ADD_LIST_LIMITS);
    expect(rowsOf(html)).toBe(30);
    expect(html).toContain("Xem thêm (10 món)");
  });

  it("every other list keeps the 50 it had (40 foods: all of them, no Xem thêm)", () => {
    const html = render(grouped, DEFAULT_FOOD_LIST_LIMITS);
    expect(rowsOf(html)).toBe(40);
    expect(html).not.toContain("Xem thêm");
  });

  it("each row carries its food's id, for the portion sheet to give focus back to it", () => {
    expect(render(grouped, ADD_LIST_LIMITS)).toContain(`data-food-id="${foods[0].id}"`);
  });
});
