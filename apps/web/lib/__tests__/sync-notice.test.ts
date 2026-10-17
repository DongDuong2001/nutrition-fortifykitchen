import { describe, expect, it } from "vitest";
import { isLocalOnly, pastDayMessage, syncNotice, unsavedMessage } from "../sync-notice";

// Review 05:30 M1: a refused write ends in a state the user can understand, and the app does not nag.

const held = (over: Partial<{ id: string; status: number; message: string; date: string; final: boolean }> = {}) => ({
  id: "a", status: 400, message: "bad", date: "2026-10-18", final: false, ...over,
});

describe("syncNotice", () => {
  it("a write refused for good (past day): one notice with its day, no Thử lại", () => {
    expect(syncNotice([held({ status: 409, date: "2026-10-17", final: true })], false)).toEqual({
      kind: "notice",
      message: "Món ngày 17/10 chưa lưu lên máy chủ vì ngày đã qua; món vẫn còn trên máy này.",
    });
  });
  it("two held writes in one run: one toast", () => {
    expect(syncNotice([held({ id: "a" }), held({ id: "b", status: 422 })], false)).toEqual({ kind: "unsaved", message: unsavedMessage(400, "bad") });
  });
  it("at most one unsaved toast per app open", () => {
    expect(syncNotice([held()], true)).toBeNull();
  });
  it("nothing held: nothing", () => expect(syncNotice([], false)).toBeNull());
});

describe("pastDayMessage", () => {
  it("dd/MM", () => expect(pastDayMessage("2026-09-05")).toBe("Món ngày 05/09 chưa lưu lên máy chủ vì ngày đã qua; món vẫn còn trên máy này."));
});

describe("isLocalOnly", () => {
  it("a food without a server row (a recipe made in the app) stays on this device; quick kcal and catalogue foods do not", () => {
    expect(isLocalOnly({ kind: undefined, foodId: "recipe-1729" })).toBe(true);
    expect(isLocalOnly({ kind: "quick", foodId: "" })).toBe(false);
    expect(isLocalOnly({ kind: undefined, foodId: "22222222-2222-4222-8222-222222222222" })).toBe(false);
  });
});
