import { describe, expect, it } from "vitest";
import { MAX_TOUR_STEPS, RELEASES, joinedTour, latestRelease, shouldShowWhatsNew, tourStepAfter, unseenReleases, type Release } from "../releases";

const show = (over: Partial<Parameters<typeof shouldShowWhatsNew>[0]> = {}) =>
  shouldShowWhatsNew({ seenId: null, latestId: "2026-10-17", firstRun: false, busy: false, ...over });

describe("RELEASES", () => {
  it("is newest first with unique ids", () => {
    const ids = RELEASES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort().reverse()).toEqual(ids);
  });

  it("starts with the fourth 18/10 release (2026-10-18d): Ghi món theo cách bạn quen, with a 3-step tour", () => {
    const r = latestRelease();
    expect(r?.id).toBe("2026-10-18d");
    expect(r?.date).toBe("18/10");
    expect(r?.items.map((i) => i.title)).toEqual(["Ghi món theo cách bạn quen"]);
    expect(r?.tour?.length).toBe(3);
  });

  it("then the third 18/10 release (2026-10-18c): cc-51's five items, Món của tôi được lưu, Ghi thực phẩm bổ sung theo viên, Ghi theo quả, viên", () => {
    const r = RELEASES[1];
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

  it("2026-10-18c carries the tour for everything from 17/10 to 18c: five steps on Hôm nay's real controls", () => {
    const tour = RELEASES[1]?.tour ?? [];
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
    const r = RELEASES[2];
    expect(r?.id).toBe("2026-10-18b");
    expect(r?.date).toBe("18/10");
    expect(r?.items.map((i) => i.title)).toEqual(["Thực phẩm bổ sung", "Gia vị", "Thêm cà phê"]);
    expect(r?.tour).toBeUndefined();
  });

  it("then the first 18/10 release (cc-49): only Đồng bộ ổn định hơn", () => {
    const r = RELEASES[3];
    expect(r?.id).toBe("2026-10-18");
    expect(r?.items.map((i) => i.title)).toEqual(["Đồng bộ ổn định hơn"]);
    expect(r?.tour).toBeUndefined();
  });

  it("then the 17/10 release: 6 items and a 3-step tour", () => {
    const r = RELEASES[4];
    expect(r?.id).toBe("2026-10-17");
    expect(r?.items.map((i) => i.title)).toEqual(["Trang chủ mới", "Chọn nhiều món", "Mục tiêu đa lượng", "Bữa ăn dễ đọc hơn", "Thanh vi chất 4 màu", "Ảnh chia sẻ rõ hơn"]);
    expect(r?.tour?.map((s) => s.title)).toEqual(["Giữ để chọn nhiều món", "Đổi bữa hoặc xóa", "Mục tiêu đa lượng"]);
    expect(r?.tour?.[0].advanceOn).toBe("long-press");
  });
});

describe("unseenReleases (what Có gì mới lists)", () => {
  const ids = (seen: string | null) => unseenReleases(seen).map((r) => r.id);

  it("every release newer than the last one seen, newest first", () => {
    expect(ids("2026-10-18b")).toEqual(["2026-10-18d", "2026-10-18c"]);
    expect(ids("2026-10-17")).toEqual(["2026-10-18d", "2026-10-18c", "2026-10-18b", "2026-10-18"]);
  });

  it("seen 18c: only 18d; seen the newest: nothing", () => {
    expect(ids("2026-10-18c")).toEqual(["2026-10-18d"]);
    expect(ids("2026-10-18d")).toEqual([]);
  });

  it("an account that has seen none gets the newest only", () => {
    expect(ids(null)).toEqual(["2026-10-18d"]);
  });
});

describe("joinedTour (what Thử ngay runs)", () => {
  const titles = (seen: string) => joinedTour(unseenReleases(seen).map((r) => r.id)).map((s) => s.title);
  const T18C = ["Món chưa lưu", "Kéo xuống để tải lại", "Chạm vi chất để xem nguồn", "Gần đây và Như hôm qua", "Thực phẩm bổ sung và Gia vị"];
  const T18D = ["Chọn đơn vị", "Chọn kích cỡ", "Nhập số lượng"];

  it("seen 18b: the 18c tour, then the 18d tour (oldest first), 8 steps", () => {
    expect(titles("2026-10-18b")).toEqual([...T18C, ...T18D]);
  });

  it("seen 18c: only the 18d tour", () => {
    expect(titles("2026-10-18c")).toEqual(T18D);
  });

  it("releases without a tour add nothing", () => {
    expect(titles("2026-10-17")).toEqual([...T18C, ...T18D]);
  });

  it(`at most ${MAX_TOUR_STEPS} steps: the later steps of the oldest release go first`, () => {
    const step = (t: string) => ({ target: "x", title: t, body: "" });
    const fake: Release[] = [
      { id: "c", date: "", items: [], tour: ["c1", "c2", "c3", "c4"].map(step) },
      { id: "b", date: "", items: [], tour: ["b1", "b2", "b3"].map(step) },
      { id: "a", date: "", items: [], tour: ["a1", "a2", "a3"].map(step) },
    ];
    expect(joinedTour(["a", "b", "c"], fake).map((s) => s.title)).toEqual(["a1", "b1", "b2", "b3", "c1", "c2", "c3", "c4"]);
    expect(joinedTour(["b", "c"], fake).map((s) => s.title)).toEqual(["b1", "b2", "b3", "c1", "c2", "c3", "c4"]);
    const long: Release[] = [{ id: "z", date: "", items: [], tour: Array.from({ length: 10 }, (_, i) => step(`z${i}`)) }, ...fake];
    expect(joinedTour(["a", "z"], long).map((s) => s.title)).toEqual(["z0", "z1", "z2", "z3", "z4", "z5", "z6", "z7"]);
  });
});

describe("tourStepAfter (moving through the Có gì mới tour)", () => {
  const joined = joinedTour(["2026-10-18c", "2026-10-18d"]);
  const r17 = RELEASES.find((r) => r.id === "2026-10-17")?.tour ?? [];

  it("the joined tour runs end to end with Tiếp: 18c's five steps, then 18d's three, then it ends", () => {
    const seen: number[] = [];
    let i: number | null = 0;
    while (i !== null) {
      seen.push(i);
      i = tourStepAfter(joined, i, "next");
    }
    expect(seen).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it("a step whose target is not on screen is skipped, and a missing last step ends the tour", () => {
    expect(tourStepAfter(joined, 0, "missing")).toBe(1);
    expect(tourStepAfter(joined, 5, "missing")).toBe(6);
    expect(tourStepAfter(joined, 7, "missing")).toBe(null);
  });

  it("a tap on Chưa lưu moves step 1 on; a tap or long press elsewhere in the tour does nothing", () => {
    expect(tourStepAfter(joined, 0, "tap")).toBe(1);
    expect(tourStepAfter(joined, 0, "long-press")).toBe(0);
    expect(tourStepAfter(joined, 1, "tap")).toBe(1);
  });

  it("the 17/10 tour still moves on a long press on step 1 only", () => {
    expect(tourStepAfter(r17, 0, "long-press")).toBe(1);
    expect(tourStepAfter(r17, 1, "long-press")).toBe(1);
    expect(tourStepAfter(r17, 2, "next")).toBe(null);
  });

  it("a step that is gone ends it", () => {
    expect(tourStepAfter([], 0, "next")).toBe(null);
    expect(tourStepAfter(joined, 9, "next")).toBe(null);
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
  it("seen 18b or 18c: shows (18c and 18d, or 18d alone, are newer); seen 18d: not", () => {
    expect(show({ seenId: "2026-10-18b", latestId: "2026-10-18d" })).toBe(true);
    expect(show({ seenId: "2026-10-18c", latestId: "2026-10-18d" })).toBe(true);
    expect(show({ seenId: "2026-10-18d", latestId: "2026-10-18d" })).toBe(false);
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
