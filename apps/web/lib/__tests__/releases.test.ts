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

  it("starts with Ngày tập ghi vào nhật ký (2026-10-18e, cc-52): one item and a 3-step tour that falls back to the Ngày tập pill on Hôm nay", () => {
    const r = latestRelease();
    expect(r?.id).toBe("2026-10-18e");
    expect(r?.date).toBe("18/10");
    expect(r?.items).toEqual([
      { icon: "meal", title: "Ngày tập ghi vào nhật ký", body: "Đánh dấu một món ở Ngày tập để ghi vào Bữa phụ. Liều theo nhóm Bự/Bé của bạn. Thêm món riêng như nước dừa, cam." },
    ]);
    expect(r?.tour?.map((s) => s.target)).toEqual(["training-size", "training-checklist", "training-add-item"]);
    expect(r?.tour?.every((s) => s.fallback === "training-pill")).toBe(true);
  });

  it("then the fourth 18/10 release (2026-10-18d, cc-53): Ghi món theo cách bạn quen, with a 3-step tour", () => {
    const r = RELEASES[1];
    expect(r?.id).toBe("2026-10-18d");
    expect(r?.date).toBe("18/10");
    expect(r?.items.map((i) => i.title)).toEqual(["Ghi món theo cách bạn quen"]);
    expect(r?.tour?.length).toBe(3);
  });

  it("then the third 18/10 release (2026-10-18c): cc-51's five items, then Món của tôi được lưu and Ghi thực phẩm bổ sung theo viên, no tour", () => {
    const r = RELEASES.find((x) => x.id === "2026-10-18c");
    expect(r?.id).toBe("2026-10-18c");
    expect(r?.date).toBe("18/10");
    expect(r?.items.map((i) => i.title)).toEqual(["Gần đây và Hay ăn", "Như hôm qua", "Chạm vi chất để xem nguồn", "Rung khi chạm", "Kéo xuống để tải lại", "Món của tôi được lưu", "Ghi thực phẩm bổ sung theo viên"]);
    expect(r?.items[6]).toEqual({ icon: "meal", title: "Ghi thực phẩm bổ sung theo viên", body: "Thêm được viên, giọt, muỗng dù nhãn không ghi kcal." });
    expect(r?.items[5]).toEqual({ icon: "meal", title: "Món của tôi được lưu", body: "Món tự tạo giờ lưu vào tài khoản; danh sách nguyên liệu chỉ có trên máy này." });
    expect(r?.items[4]).toEqual({ icon: "home", title: "Kéo xuống để tải lại", body: "Ở Hôm nay, kéo danh sách món xuống rồi thả để lấy món vừa thêm trên máy khác." });
    expect(r?.tour).toBeUndefined();
  });

  it("then Thực phẩm bổ sung và Gia vị (2026-10-18b): three items, no tour", () => {
    const r = RELEASES.find((x) => x.id === "2026-10-18b");
    expect(r?.id).toBe("2026-10-18b");
    expect(r?.date).toBe("18/10");
    expect(r?.items.map((i) => i.title)).toEqual(["Thực phẩm bổ sung", "Gia vị", "Thêm cà phê"]);
    expect(r?.tour).toBeUndefined();
  });

  it("then the first 18/10 release (cc-49): only Đồng bộ ổn định hơn", () => {
    const r = RELEASES.find((x) => x.id === "2026-10-18");
    expect(r?.id).toBe("2026-10-18");
    expect(r?.items.map((i) => i.title)).toEqual(["Đồng bộ ổn định hơn"]);
    expect(r?.tour).toBeUndefined();
  });

  it("then the 17/10 release: 6 items and a 3-step tour", () => {
    const r = RELEASES.find((x) => x.id === "2026-10-17");
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
