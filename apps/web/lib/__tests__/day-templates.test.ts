import { describe, expect, it } from "vitest";
import { MOCK_FOODS } from "../mock/foods";
import { createDeviceStore } from "../device-store";
import type { AddedDiaryEntry } from "../diary-edits";
import type { KeyValueStore } from "../storage-keys";
import { NO_ENERGY_MESSAGE } from "../diary-edits";
import {
  DAY_TEMPLATES_KEY,
  PILL_KEEP_DAYS,
  applyTemplate,
  buildDayTemplate,
  dayTemplateMeals,
  defaultTemplateName,
  defaultTemplateTag,
  fallbackTemplateName,
  hidePillFor,
  mealNamesLine,
  mealsKcalLine,
  templateSavedMessage,
  yesterdayCopyMessage,
  isPillHidden,
  parseDayTemplates,
  parsePillHidden,
  removeDayTemplate,
  removeTemplateItem,
  tagLabel,
  templateCopyMessage,
  templateEntries,
  templateMealKcal,
  templateSkipped,
  templateTotals,
  updateDayTemplate,
  yesterdayCopySlots,
  type DayTemplate,
  mergeDayTemplates,
  templateWrites,
  withUuidIds,
} from "../day-templates";

const oats = { foodId: "food-yen-mach", servingLabel: "60 g", grams: 60 };
const banana = { foodId: "food-chuoi", servingLabel: "1 quả", grams: 100 };

const tpl = (id: string, name = "Ngày tập"): DayTemplate => ({
  id,
  name,
  tag: "tap",
  meals: [
    { slot: "breakfast", items: [oats, banana] },
    { slot: "lunch", items: [oats] },
  ],
  createdAt: "2026-10-22T08:00:00.000Z",
});

function memory(initial: Record<string, string> = {}): KeyValueStore {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v;
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
}

describe("tags and names", () => {
  it("names the three tags", () => {
    expect(tagLabel("tap")).toBe("Ngày tập");
    expect(tagLabel("nghi")).toBe("Ngày nghỉ");
    expect(tagLabel("khac")).toBe("Khác");
  });

  it("prefills from the day's training state: Ngày tập on a training day, otherwise empty", () => {
    expect(defaultTemplateName(60)).toBe("Ngày tập");
    expect(defaultTemplateName(0)).toBe("");
    expect(defaultTemplateTag(60)).toBe("tap");
    expect(defaultTemplateTag(0)).toBe("nghi");
  });

  it("falls back to the tag, or to the day for Khác", () => {
    expect(fallbackTemplateName("tap", "2026-10-13")).toBe("Ngày tập");
    expect(fallbackTemplateName("nghi", "2026-10-13")).toBe("Ngày nghỉ");
    expect(fallbackTemplateName("khac", "2026-10-13")).toBe("Ngày 13/10");
  });
});

describe("dayTemplateMeals (save a day)", () => {
  it("takes the meals in the order of Hôm nay and leaves empty meals out", () => {
    const itemsFor = (slot: string) => (slot === "dinner" ? [banana] : slot === "breakfast" ? [oats] : []);
    const meals = dayTemplateMeals(itemsFor as Parameters<typeof dayTemplateMeals>[0]);
    expect(meals.map((m) => m.slot)).toEqual(["breakfast", "dinner"]);
    expect(meals[1].items).toEqual([banana]);
  });
});

describe("buildDayTemplate (save)", () => {
  const base = { id: "dt-1", tag: "tap" as const, fallbackName: "Ngày tập", createdAt: "2026-10-22T08:00:00.000Z" };

  it("keeps the trimmed name, the tag and the meals", () => {
    const t = buildDayTemplate({ ...base, name: "  Ngày tập nặng ", meals: tpl("x").meals });
    expect(t).toEqual({ id: "dt-1", name: "Ngày tập nặng", tag: "tap", meals: tpl("x").meals, createdAt: base.createdAt });
  });

  it("uses the fallback name for a blank name", () => {
    expect(buildDayTemplate({ ...base, name: "   ", meals: tpl("x").meals })?.name).toBe("Ngày tập");
  });

  it("does not save empty meals", () => {
    const t = buildDayTemplate({ ...base, name: "a", meals: [{ slot: "breakfast", items: [] }, { slot: "lunch", items: [oats] }] });
    expect(t?.meals.map((m) => m.slot)).toEqual(["lunch"]);
  });

  it("returns null when there is no food at all", () => {
    expect(buildDayTemplate({ ...base, name: "a", meals: [] })).toBeNull();
    expect(buildDayTemplate({ ...base, name: "a", meals: [{ slot: "lunch", items: [] }] })).toBeNull();
  });
});

describe("rename, tag, edit and delete", () => {
  const list = [tpl("a", "A"), tpl("b", "B")];

  it("renames one template and ignores a blank name", () => {
    expect(updateDayTemplate(list, "b", { name: " Bữa B " }).map((t) => t.name)).toEqual(["A", "Bữa B"]);
    expect(updateDayTemplate(list, "b", { name: "  " })).toEqual(list);
  });

  it("changes the tag", () => {
    expect(updateDayTemplate(list, "a", { tag: "nghi" })[0].tag).toBe("nghi");
  });

  it("changes the meals, drops empty ones, and refuses a template with no food left", () => {
    const next = updateDayTemplate(list, "a", { meals: [{ slot: "breakfast", items: [] }, { slot: "lunch", items: [banana] }] });
    expect(next[0].meals).toEqual([{ slot: "lunch", items: [banana] }]);
    expect(updateDayTemplate(list, "a", { meals: [{ slot: "lunch", items: [] }] })).toEqual(list);
  });

  it("leaves the others and an unknown id alone", () => {
    expect(updateDayTemplate(list, "zzz", { name: "x" })).toEqual(list);
    expect(updateDayTemplate(list, "a", { name: "x" })[1]).toBe(list[1]);
  });

  it("removes one template", () => {
    expect(removeDayTemplate(list, "a").map((t) => t.id)).toEqual(["b"]);
    expect(removeDayTemplate(list, "nope")).toEqual(list);
  });

  it("removes one food of a meal; a meal left with none goes too", () => {
    const meals = tpl("a").meals;
    expect(removeTemplateItem(meals, "breakfast", 0)[0].items).toEqual([banana]);
    expect(removeTemplateItem(meals, "lunch", 0).map((m) => m.slot)).toEqual(["breakfast"]);
    expect(removeTemplateItem(meals, "dinner", 0)).toEqual(meals);
  });
});

describe("parseDayTemplates (storage round-trip)", () => {
  it("reads a saved list", () => {
    expect(parseDayTemplates(JSON.stringify([tpl("a")]))).toEqual([tpl("a")]);
  });

  it("gives an empty list for missing or bad data", () => {
    expect(parseDayTemplates(null)).toEqual([]);
    expect(parseDayTemplates("{")).toEqual([]);
    expect(parseDayTemplates('{"a":1}')).toEqual([]);
  });

  it("drops a bad meal or item, and a template left with no food", () => {
    const raw = JSON.stringify([
      tpl("a"),
      { ...tpl("b"), meals: [{ slot: "weekend", items: [oats] }, { slot: "lunch", items: [{ foodId: "f", servingLabel: "1", grams: -3 }] }] },
      { ...tpl("c"), meals: [{ slot: "lunch", items: [oats, { foodId: 5 }] }] },
      { name: "no id", tag: "tap", meals: tpl("x").meals, createdAt: "x" },
    ]);
    const parsed = parseDayTemplates(raw);
    expect(parsed.map((t) => t.id)).toEqual(["a", "c"]);
    expect(parsed[1].meals).toEqual([{ slot: "lunch", items: [oats] }]);
  });

  it("an unknown tag reads as Khác", () => {
    const raw = JSON.stringify([{ ...tpl("a"), tag: "weird" }]);
    expect(parseDayTemplates(raw)[0].tag).toBe("khac");
  });

  it("goes through the device store and comes back equal", () => {
    const mem = memory();
    const store = createDeviceStore({ key: DAY_TEMPLATES_KEY, parse: parseDayTemplates, empty: [] as DayTemplate[], storage: () => mem });
    store.set([tpl("a"), tpl("b", "Ngày nghỉ")]);
    const again = createDeviceStore({ key: DAY_TEMPLATES_KEY, parse: parseDayTemplates, empty: [] as DayTemplate[], storage: () => mem });
    expect(again.get()).toEqual([tpl("a"), tpl("b", "Ngày nghỉ")]);
  });
});

describe("totals", () => {
  it("counts the foods a tap adds and their kcal from the foods' own values", () => {
    const { itemCount, kcal, skipped } = templateTotals(tpl("a"), MOCK_FOODS);
    expect(itemCount).toBe(3);
    expect(skipped).toBe(0);
    const entries = templateEntries(tpl("a"), MOCK_FOODS, "t", "now");
    expect(kcal).toBe(entries.reduce((n, e) => n + (e.calories ?? 0), 0));
    expect(kcal).toBeGreaterThan(0);
  });

  it("gives each meal's kcal, in the template's order", () => {
    const perMeal = templateMealKcal(tpl("a"), MOCK_FOODS);
    expect(perMeal.map((m) => m.slot)).toEqual(["breakfast", "lunch"]);
    expect(perMeal[0].kcal + perMeal[1].kcal).toBe(templateTotals(tpl("a"), MOCK_FOODS).kcal);
  });

  it("a food that is gone is left out of the count, and a food with no energy is counted as skipped", () => {
    const unknown = { ...MOCK_FOODS[0], id: "recipe-unknown", nutrients: { ...MOCK_FOODS[0].nutrients, energy: null } };
    const foods = [...MOCK_FOODS, unknown];
    const t: DayTemplate = { ...tpl("a"), meals: [{ slot: "lunch", items: [oats, { foodId: "recipe-unknown", servingLabel: "100 g", grams: 100 }, { foodId: "gone", servingLabel: "x", grams: 1 }] }] };
    expect(templateSkipped(t, foods)).toBe(1);
    expect(templateTotals(t, foods).itemCount).toBe(1);
    expect(templateEntries(t, foods, "t", "now").map((e) => e.foodId)).toEqual(["food-yen-mach"]);
  });
});

describe("applyTemplate (the entries that go through the existing add path)", () => {
  it("makes one entry per food in its own meal, with the saved portion and distinct ids", () => {
    const { entries, message } = applyTemplate(tpl("a"), MOCK_FOODS, { idPrefix: "dt-9", addedAt: "2026-10-22T12:00:00.000Z" });
    expect(entries.map((e: AddedDiaryEntry) => [e.foodId, e.mealSlot, e.grams, e.displayQty])).toEqual([
      ["food-yen-mach", "breakfast", 60, "60 g"],
      ["food-chuoi", "breakfast", 100, "1 quả"],
      ["food-yen-mach", "lunch", 60, "60 g"],
    ]);
    expect(new Set(entries.map((e) => e.id)).size).toBe(3);
    expect(entries.every((e) => e.addedAt === "2026-10-22T12:00:00.000Z")).toBe(true);
    expect(message).toBe("Đã chép Ngày tập · 3 món");
  });

  it("says how many foods could not be added", () => {
    const unknown = { ...MOCK_FOODS[0], id: "recipe-unknown", nutrients: { ...MOCK_FOODS[0].nutrients, energy: null } };
    const t: DayTemplate = { ...tpl("a"), meals: [{ slot: "lunch", items: [oats, { foodId: "recipe-unknown", servingLabel: "100 g", grams: 100 }] }] };
    const { entries, message } = applyTemplate(t, [...MOCK_FOODS, unknown], { idPrefix: "p", addedAt: "t" });
    expect(entries).toHaveLength(1);
    expect(message).toBe("Đã chép Ngày tập · 1 món. 1 món chưa có kcal nên chưa chép");
  });

  it("with nothing to add the message says why", () => {
    const unknown = { ...MOCK_FOODS[0], id: "recipe-unknown", nutrients: { ...MOCK_FOODS[0].nutrients, energy: null } };
    const t: DayTemplate = { ...tpl("a"), meals: [{ slot: "lunch", items: [{ foodId: "recipe-unknown", servingLabel: "100 g", grams: 100 }] }] };
    expect(applyTemplate(t, [...MOCK_FOODS, unknown], { idPrefix: "p", addedAt: "t" })).toMatchObject({ entries: [], message: NO_ENERGY_MESSAGE });
    const gone: DayTemplate = { ...tpl("a"), meals: [{ slot: "lunch", items: [{ foodId: "gone", servingLabel: "x", grams: 1 }] }] };
    expect(applyTemplate(gone, MOCK_FOODS, { idPrefix: "p", addedAt: "t" }).entries).toEqual([]);
  });

  it("the copy toast names the template and the count", () => {
    expect(templateCopyMessage("Ngày tập", 7, 0)).toBe("Đã chép Ngày tập · 7 món");
  });
});

describe("yesterdayCopySlots (what Chép hôm qua copies by default)", () => {
  const entry = (slot: AddedDiaryEntry["mealSlot"]) => ({ mealSlot: slot }) as AddedDiaryEntry;

  it("is every meal with food but the snack, as the copy sheet ticks them", () => {
    expect(yesterdayCopySlots([entry("breakfast"), entry("snack"), entry("dinner"), entry("breakfast")])).toEqual(["breakfast", "dinner"]);
  });

  it("copies the snack when it is all there is, so the card never copies nothing", () => {
    expect(yesterdayCopySlots([entry("snack")])).toEqual(["snack"]);
  });

  it("nothing logged, nothing to copy", () => {
    expect(yesterdayCopySlots([])).toEqual([]);
  });
});

describe("the pill's × (per date)", () => {
  it("reads a stored list of dates and drops anything that is not one", () => {
    expect(parsePillHidden('["2026-10-22","x",5]')).toEqual(["2026-10-22"]);
    expect(parsePillHidden(null)).toEqual([]);
    expect(parsePillHidden("{")).toEqual([]);
  });

  it("hides one date only", () => {
    const list = hidePillFor([], "2026-10-22", "2026-10-22");
    expect(isPillHidden(list, "2026-10-22")).toBe(true);
    expect(isPillHidden(list, "2026-10-21")).toBe(false);
    expect(isPillHidden(list, "2026-10-23")).toBe(false);
  });

  it("does not list a date twice", () => {
    expect(hidePillFor(["2026-10-22"], "2026-10-22", "2026-10-22")).toEqual(["2026-10-22"]);
  });

  it(`forgets dates more than ${PILL_KEEP_DAYS} days back, so the list stays short`, () => {
    const list = hidePillFor(["2026-10-01", "2026-10-20"], "2026-10-22", "2026-10-22");
    expect(list).toEqual(["2026-10-20", "2026-10-22"]);
  });
});

describe("the words of the cards and toasts", () => {
  it("names the meals of a template or a day, short, in Hôm nay's words", () => {
    expect(mealNamesLine([{ slot: "breakfast" }, { slot: "lunch" }, { slot: "pre_workout" }])).toBe("Sáng · Trưa · Trước tập");
  });

  it("lists each meal with its kcal", () => {
    expect(mealsKcalLine([{ slot: "breakfast", kcal: 459 }, { slot: "lunch", kcal: 1488 }, { slot: "pre_workout", kcal: 94 }])).toBe("Sáng 459 · Trưa 1.488 · Trước tập 94");
  });

  it("the save toast names the template, its foods and its kcal", () => {
    expect(templateSavedMessage("Ngày tập", 6, 936)).toBe("Đã lưu Ngày tập · 6 món · 936 kcal");
  });

  it("the Hôm qua copy toast is the one the copy sheet has always said", () => {
    expect(yesterdayCopyMessage(3, true)).toBe("Đã chép 3 bữa từ hôm qua");
    expect(yesterdayCopyMessage(2, false)).toBe("Đã chép 2 bữa từ hôm kia vào hôm qua");
  });
});

// backend-sync-1022: the list follows the account through /day-templates
describe("following the account", () => {
  const T = (id: string, createdAt: string, name = id): DayTemplate => ({
    id,
    name,
    tag: "tap",
    meals: [{ slot: "breakfast", items: [{ foodId: "f-1", servingLabel: "1 tô", grams: 500 }] }],
    createdAt,
  });
  const A = T("aaaaaaaa-0000-4000-8000-000000000001", "2026-10-20T08:00:00.000Z");
  const B = T("aaaaaaaa-0000-4000-8000-000000000002", "2026-10-21T08:00:00.000Z");
  const C = T("aaaaaaaa-0000-4000-8000-000000000003", "2026-10-22T08:00:00.000Z");
  const none = new Map<string, "put" | "delete">();

  it("templateWrites: a new or changed template is sent, a removed one deleted, an unchanged one left alone", () => {
    expect(templateWrites([A, B], [C, { ...A, name: "Đổi" }])).toEqual({ put: [C, { ...A, name: "Đổi" }], remove: [B.id] });
    expect(templateWrites([A, B], [A, B])).toEqual({ put: [], remove: [] });
    expect(templateWrites([], [])).toEqual({ put: [], remove: [] });
  });

  it("withUuidIds: an old dt- id gets a uuid, uuids are kept, the list is the same object when nothing changes", () => {
    const old = T("dt-1729-abcde", "2026-10-19T08:00:00.000Z");
    const out = withUuidIds([A, old], () => "bbbbbbbb-0000-4000-8000-000000000009");
    expect(out.map((t) => t.id)).toEqual([A.id, "bbbbbbbb-0000-4000-8000-000000000009"]);
    expect(out[1]).toMatchObject({ name: old.name, meals: old.meals, createdAt: old.createdAt });
    const list = [A, B];
    expect(withUuidIds(list, () => "x")).toBe(list);
  });

  it("first sync: the device's own templates are kept and uploaded, the server's added, newest first", () => {
    const { list, upload } = mergeDayTemplates([B], [A, C], none, true);
    expect(list.map((t) => t.id)).toEqual([C.id, B.id, A.id]);
    expect(upload.map((t) => t.id).sort()).toEqual([A.id, C.id]);
  });

  it("first sync of a template both have: the server's copy, nothing uploaded", () => {
    const { list, upload } = mergeDayTemplates([{ ...A, name: "Máy kia" }], [A], none, true);
    expect(list).toEqual([{ ...A, name: "Máy kia" }]);
    expect(upload).toEqual([]);
  });

  it("later syncs: the server's list is the truth; one it no longer has was deleted elsewhere and goes", () => {
    const { list, upload } = mergeDayTemplates([B, { ...C, name: "Sửa ở máy kia" }], [A, B, C], none, false);
    expect(list.map((t) => [t.id, t.name])).toEqual([[C.id, "Sửa ở máy kia"], [B.id, B.name]]);
    expect(upload).toEqual([]);
  });

  it("a write still waiting wins over the server's list: a save keeps the device's copy, a delete removes it", () => {
    const pending = new Map<string, "put" | "delete">([
      [A.id, "put"],
      [B.id, "delete"],
      [C.id, "put"],
    ]);
    const { list, upload } = mergeDayTemplates([B, { ...C, name: "Cũ" }], [A, { ...C, name: "Mới" }], pending, false);
    expect(list.map((t) => [t.id, t.name])).toEqual([[C.id, "Mới"], [A.id, A.name]]);
    expect(upload).toEqual([]);
    // On the first sync a waiting save is not uploaded twice, and a waiting delete is not brought back
    const first = mergeDayTemplates([], [A, B], new Map([[A.id, "put" as const], [B.id, "delete" as const]]), true);
    expect(first.list.map((t) => t.id)).toEqual([A.id]);
    expect(first.upload).toEqual([]);
  });

  it("orders by time even when the server writes another offset", () => {
    const fromServer = { ...B, createdAt: "2026-10-21T15:30:00+07:00" }; // 08:30Z, after B's local 08:00Z
    const { list } = mergeDayTemplates([fromServer], [A], none, true);
    expect(list.map((t) => t.id)).toEqual([B.id, A.id]);
  });
});
