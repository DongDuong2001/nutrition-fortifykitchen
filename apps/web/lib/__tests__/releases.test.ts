import { describe, expect, it } from "vitest";
import { RELEASES, latestRelease, releaseTourStepAfter, shouldShowWhatsNew } from "../releases";

const show = (over: Partial<Parameters<typeof shouldShowWhatsNew>[0]> = {}) =>
  shouldShowWhatsNew({ seenId: null, latestId: "2026-10-17", firstRun: false, busy: false, ...over });

describe("RELEASES", () => {
  it("is newest first with unique ids", () => {
    const ids = RELEASES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort().reverse()).toEqual(ids);
  });

  it("starts with the third 18/10 release (2026-10-18c): cc-51's five items, Món của tôi được lưu, Ghi thực phẩm bổ sung theo viên, Ghi theo quả, viên", () => {
    const r = latestRelease();
    expect(r?.id).toBe("2026-10-18c");
    expect(r?.date).toBe("18/10");
    expect(r?.items.map((i) => i.title)).toEqual([
      "Gần đây và Hay ăn", "Như hôm qua", "Chạm vi chất để xem nguồn", "Rung khi chạm", "Kéo xuống để tải lại", "Món của tôi được lưu", "Ghi thực phẩm bổ sung theo viên", "Ghi theo quả, viên",
    ]);
    expect(r?.items[7]).toEqual({ icon: "select", title: "Ghi theo quả, viên", body: "Trứng, trái cây và thực phẩm bổ sung có nút ×N: chọn khẩu phần rồi tăng giảm số lượng." });
    expect(r?.items[6]).toEqual({ icon: "meal", title: "Ghi thực phẩm bổ sung theo viên", body: "Thêm được viên, giọt, muỗng dù nhãn không ghi kcal." });
    expect(r?.items[5]).toEqual({ icon: "meal", title: "Món của tôi được lưu", body: "Món tự tạo giờ lưu vào tài khoản; danh sách nguyên liệu chỉ có trên máy này." });
    expect(r?.items[4]).toEqual({ icon: "home", title: "Kéo xuống để tải lại", body: "Ở Hôm nay, kéo danh sách món xuống rồi thả để lấy món vừa thêm trên máy khác." });
  });

  it("2026-10-18c carries the tour for everything since 17/10: five steps on Hôm nay's real controls", () => {
    const tour = latestRelease()?.tour ?? [];
    expect(tour.map((s) => [s.target, s.fallback ?? null])).toEqual([
      ["sync-status", "header-actions"],
      ["home-food-list", "meal-pill"],
      ["nutrient-column", null],
      ["meal-pill", null],
      ["nav-explore", null],
    ]);
    expect(tour.map((s) => s.title)).toEqual(["Món chưa lưu", "Kéo xuống để tải lại", "Chạm vi chất để xem nguồn", "Gần đây và Như hôm qua", "Thực phẩm bổ sung và Gia vị"]);
    // Chưa lưu stays tappable during its step (the tour never stands over a send), and the tap moves the tour on
    expect(tour[0].advanceOn).toBe("tap");
    expect(tour.slice(1).every((s) => s.advanceOn === undefined)).toBe(true);
    expect(tour[0].body).toContain("Chưa lưu");
    expect(tour[3].body).toContain("Như hôm qua");
    expect(tour[4].body).toContain("×N");
    // Short: one card, no scrolling at 390
    for (const s of tour) expect(s.body.length).toBeLessThanOrEqual(100);
  });

  it("then Thực phẩm bổ sung và Gia vị (2026-10-18b): three items, no tour", () => {
    const r = RELEASES[1];
    expect(r?.id).toBe("2026-10-18b");
    expect(r?.date).toBe("18/10");
    expect(r?.items.map((i) => i.title)).toEqual(["Thực phẩm bổ sung", "Gia vị", "Thêm cà phê"]);
    expect(r?.tour).toBeUndefined();
  });

  it("then the first 18/10 release (cc-49): only Đồng bộ ổn định hơn", () => {
    const r = RELEASES[2];
    expect(r?.id).toBe("2026-10-18");
    expect(r?.items.map((i) => i.title)).toEqual(["Đồng bộ ổn định hơn"]);
    expect(r?.tour).toBeUndefined();
  });

  it("then the 17/10 release: 6 items and a 3-step tour", () => {
    const r = RELEASES[3];
    expect(r?.id).toBe("2026-10-17");
    expect(r?.items.map((i) => i.title)).toEqual(["Trang chủ mới", "Chọn nhiều món", "Mục tiêu đa lượng", "Bữa ăn dễ đọc hơn", "Thanh vi chất 4 màu", "Ảnh chia sẻ rõ hơn"]);
    expect(r?.tour?.map((s) => s.title)).toEqual(["Giữ để chọn nhiều món", "Đổi bữa hoặc xóa", "Mục tiêu đa lượng"]);
    expect(r?.tour?.[0].advanceOn).toBe("long-press");
  });
});

describe("releaseTourStepAfter (the Có gì mới tour)", () => {
  const r18c = RELEASES.find((r) => r.id === "2026-10-18c") ?? null;
  const r17 = RELEASES.find((r) => r.id === "2026-10-17") ?? null;

  it("the 18c tour runs end to end with Tiếp: 1 → 2 → 3 → 4 → 5 → ends", () => {
    const seen: number[] = [];
    let i: number | null = 0;
    while (i !== null) {
      seen.push(i);
      i = releaseTourStepAfter(r18c, i, "next");
    }
    expect(seen).toEqual([0, 1, 2, 3, 4]);
  });

  it("a step whose target is not on screen is skipped, and a missing last step ends the tour", () => {
    expect(releaseTourStepAfter(r18c, 0, "missing")).toBe(1);
    expect(releaseTourStepAfter(r18c, 2, "missing")).toBe(3);
    expect(releaseTourStepAfter(r18c, 4, "missing")).toBe(null);
  });

  it("a tap on Chưa lưu moves step 1 on; a tap or long press elsewhere in the tour does nothing", () => {
    expect(releaseTourStepAfter(r18c, 0, "tap")).toBe(1);
    expect(releaseTourStepAfter(r18c, 0, "long-press")).toBe(0);
    expect(releaseTourStepAfter(r18c, 1, "tap")).toBe(1);
  });

  it("the 17/10 tour still moves on a long press on step 1 only", () => {
    expect(releaseTourStepAfter(r17, 0, "long-press")).toBe(1);
    expect(releaseTourStepAfter(r17, 1, "long-press")).toBe(1);
    expect(releaseTourStepAfter(r17, 2, "next")).toBe(null);
  });

  it("a release or step that is gone ends it", () => {
    expect(releaseTourStepAfter(null, 0, "next")).toBe(null);
    expect(releaseTourStepAfter(r18c, 9, "next")).toBe(null);
    expect(releaseTourStepAfter(RELEASES.find((r) => r.id === "2026-10-18b") ?? null, 0, "next")).toBe(null);
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
