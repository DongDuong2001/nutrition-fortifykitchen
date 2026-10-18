import { describe, expect, it } from "vitest";
import { RELEASES, latestRelease, shouldShowWhatsNew } from "../releases";

const show = (over: Partial<Parameters<typeof shouldShowWhatsNew>[0]> = {}) =>
  shouldShowWhatsNew({ seenId: null, latestId: "2026-10-17", firstRun: false, busy: false, ...over });

describe("RELEASES", () => {
  it("is newest first with unique ids", () => {
    const ids = RELEASES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort().reverse()).toEqual(ids);
  });

  it("starts with the second 18/10 release: Món của tôi được lưu, Thực phẩm bổ sung, Gia vị, Thêm cà phê, no tour", () => {
    const r = latestRelease();
    expect(r?.id).toBe("2026-10-18b");
    expect(r?.date).toBe("18/10");
    expect(r?.items.map((i) => i.title)).toEqual(["Món của tôi được lưu", "Thực phẩm bổ sung", "Gia vị", "Thêm cà phê"]);
    expect(r?.tour).toBeUndefined();
  });

  it("then the first 18/10 release: Đồng bộ ổn định hơn, no tour", () => {
    const r = RELEASES[1];
    expect(r?.id).toBe("2026-10-18");
    expect(r?.items.map((i) => i.title)).toEqual(["Đồng bộ ổn định hơn"]);
    expect(r?.tour).toBeUndefined();
  });

  it("then the 17/10 release: 6 items and a 3-step tour", () => {
    const r = RELEASES[2];
    expect(r?.id).toBe("2026-10-17");
    expect(r?.items.map((i) => i.title)).toEqual(["Trang chủ mới", "Chọn nhiều món", "Mục tiêu đa lượng", "Bữa ăn dễ đọc hơn", "Thanh vi chất 4 màu", "Ảnh chia sẻ rõ hơn"]);
    expect(r?.tour?.map((s) => s.title)).toEqual(["Giữ để chọn nhiều món", "Đổi bữa hoặc xóa", "Mục tiêu đa lượng"]);
    expect(r?.tour?.[0].advanceOn).toBe("long-press");
  });
});

describe("shouldShowWhatsNew", () => {
  it("shows a release the account has not seen", () => {
    expect(show()).toBe(true);
    expect(show({ seenId: "2026-01-01" })).toBe(true);
  });
  it("shows each release once", () => {
    expect(show({ seenId: "2026-10-17" })).toBe(false);
  });
  it("never on the first run (setup marks the latest release seen)", () => {
    expect(show({ firstRun: true })).toBe(false);
  });
  it("waits while something else is open", () => {
    expect(show({ busy: true })).toBe(false);
  });
  it("needs a release", () => {
    expect(show({ latestId: null })).toBe(false);
  });
});
