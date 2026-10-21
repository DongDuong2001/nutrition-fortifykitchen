import { describe, expect, it } from "vitest";
import { MAX_TOUR_STEPS, RELEASES, joinedTour, latestRelease, shouldShowWhatsNew, tourStepAfter, tourSteps, unseenReleases, type Release } from "../releases";
import { whatsNewSteps } from "../tour-bus";

const show = (over: Partial<Parameters<typeof shouldShowWhatsNew>[0]> = {}) =>
  shouldShowWhatsNew({ seenId: null, latestId: "2026-10-17", firstRun: false, busy: false, ...over });

describe("RELEASES", () => {
  it("is newest first with unique ids", () => {
    const ids = RELEASES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort().reverse()).toEqual(ids);
  });

  it("then cc-67's simple, fast food logging (2026-10-19a)", () => {
    const r = RELEASES.find((x) => x.id === "2026-10-19a");
    expect(r?.id).toBe("2026-10-19a");
    expect(r?.date).toBe("19/10");
    expect(r?.items.map((i) => i.title)).toEqual(["Tìm món gọn hơn", "Trái cây chỉ tính phần ăn được", "Phở thêm thịt? Chỉnh được", "Mục tiêu vi chất theo khuyến nghị"]);
    for (const i of r?.items ?? []) expect(i.body).not.toContain(":");
    // Hôm nay's controls, with a fallback for the one that is not always there; one step is the editable parts of a dish
    expect(r?.tour?.map((s) => [s.target, s.fallback ?? null])).toEqual([
      ["meal-add", "nav-add"],
      ["dish-parts", "meal-add"],
    ]);
    for (const s of r?.tour ?? []) {
      expect(s.body.length).toBeLessThanOrEqual(100);
      expect(s.body).not.toContain(":");
    }
  });

  it("then the portion model (2026-10-18f, cc-53b, plus cc-54's Thành phần and cc-57's smoother tabs): six items and a 4-step tour on Hôm nay's controls", () => {
    const r = RELEASES.find((x) => x.id === "2026-10-18f");
    expect(r?.id).toBe("2026-10-18f");
    expect(r?.date).toBe("18/10");
    expect(r?.items.map((i) => i.title)).toEqual(["Khẩu phần theo gam", "Cân sống hay đã nấu chín", "Trứng ghi theo quả", "Khay gọn hơn", "Thành phần của món Việt", "Chuyển tab mượt hơn"]);
    expect(r?.tour?.map((s) => [s.target, s.fallback ?? null])).toEqual([
      ["meal-add", "nav-add"],
      ["home-food-list", "meal-pill"],
      ["meal-pill", null],
      ["dish-parts", "meal-add"],
    ]);
    // AGENTS.md › Tutorials and the copy rules: 2–5 steps, 1–2 short sentences, no colon inside a sentence
    for (const s of r?.tour ?? []) {
      expect(s.body.length).toBeLessThanOrEqual(100);
      expect(s.body).not.toContain(":");
    }
    for (const i of r?.items ?? []) expect(i.body).not.toContain(":");
  });

  it("then Ngày tập ghi vào nhật ký (2026-10-18e, cc-52) and cc-55's smoother screens: two items and a 3-step tour that falls back to the Ngày tập pill on Hôm nay", () => {
    const r = RELEASES.find((x) => x.id === "2026-10-18e");
    expect(r?.id).toBe("2026-10-18e");
    expect(r?.date).toBe("18/10");
    expect(r?.items).toEqual([
      { icon: "meal", title: "Ngày tập ghi vào nhật ký", body: "Đánh dấu một món ở Ngày tập để ghi vào Bữa phụ. Liều theo nhóm Bự/Bé của bạn. Thêm món riêng như nước dừa, cam." },
      // cc-55: an improvement on the same release, no tour of its own
      { icon: "home", title: "Mở và đóng màn hình mượt hơn", body: "Thêm món trượt lên trên Hôm nay và trượt xuống khi đóng. Trang chi tiết trượt vào từ bên phải, quay lại thì trượt ra." },
    ]);
    expect(r?.tour?.map((s) => s.target)).toEqual(["training-size", "training-checklist", "training-add-item"]);
    expect(r?.tour?.every((s) => s.fallback === "training-pill")).toBe(true);
    expect(r?.tour?.[1].body).toBe("Đánh dấu một món ở Ngày tập, xem lại khẩu phần rồi chọn Thêm. Món sẽ vào Bữa phụ.");
    // AGENTS.md › Tutorials: 2–5 steps, short enough for one card at 390
    expect(r?.tour?.length).toBeGreaterThanOrEqual(2);
    expect(r?.tour?.length).toBeLessThanOrEqual(5);
    for (const s of r?.tour ?? []) expect(s.body.length).toBeLessThanOrEqual(100);
  });

  it("then the fourth 18/10 release (2026-10-18d, cc-53): units for the foods that keep them, its unit tour retired (cc-53b)", () => {
    const r = RELEASES.find((x) => x.id === "2026-10-18d");
    expect(r?.date).toBe("18/10");
    expect(r?.items.map((i) => i.title)).toEqual(["Ghi theo lon, viên, phần"]);
    expect(r?.tour).toBeUndefined();
  });

  it("then the third 18/10 release (2026-10-18c): cc-51's five items, Món của tôi được lưu, Ghi thực phẩm bổ sung theo viên, Ghi theo viên", () => {
    const r = RELEASES.find((x) => x.id === "2026-10-18c");
    expect(r?.id).toBe("2026-10-18c");
    expect(r?.date).toBe("18/10");
    expect(r?.items.map((i) => i.title)).toEqual([
      "Gần đây và Hay ăn", "Như hôm qua", "Chạm vi chất để xem nguồn", "Rung khi chạm", "Kéo xuống để tải lại", "Món của tôi được lưu", "Ghi thực phẩm bổ sung theo viên", "Ghi theo viên",
    ]);
    // cc-53b: fruit and eggs no longer go by a ×N of units
    expect(r?.items[7]).toEqual({ icon: "select", title: "Ghi theo viên", body: "Thực phẩm bổ sung có nút + và − để ghi 2, 3 viên." });
    expect(r?.items[6]).toEqual({ icon: "meal", title: "Ghi thực phẩm bổ sung theo viên", body: "Thêm được viên, giọt, muỗng dù nhãn không ghi kcal." });
    expect(r?.items[5]).toEqual({ icon: "meal", title: "Món của tôi được lưu", body: "Món tự tạo giờ lưu vào tài khoản; danh sách nguyên liệu chỉ có trên máy này." });
    expect(r?.items[4]).toEqual({ icon: "home", title: "Kéo xuống để tải lại", body: "Ở Hôm nay, kéo danh sách món xuống rồi thả để lấy món vừa thêm trên máy khác." });
  });

  it("2026-10-18c carries the tour for everything from 17/10 to 18c: five steps on Hôm nay's real controls", () => {
    const tour = RELEASES.find((x) => x.id === "2026-10-18c")?.tour ?? [];
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
    expect(tour[4].body).toContain("viên");
    // Short: one card, no scrolling at 390
    for (const s of tour) expect(s.body.length).toBeLessThanOrEqual(100);
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

describe("unseenReleases (what Có gì mới lists)", () => {
  const ids = (seen: string | null) => unseenReleases(seen).map((r) => r.id);

  it("every release newer than the last one seen, newest first", () => {
    expect(ids("2026-10-18b")).toEqual(["2026-10-21c", "2026-10-21b", "2026-10-21a", "2026-10-20b", "2026-10-20a", "2026-10-19b", "2026-10-19a", "2026-10-18f", "2026-10-18e", "2026-10-18d", "2026-10-18c"]);
    expect(ids("2026-10-17")).toEqual(["2026-10-21c", "2026-10-21b", "2026-10-21a", "2026-10-20b", "2026-10-20a", "2026-10-19b", "2026-10-19a", "2026-10-18f", "2026-10-18e", "2026-10-18d", "2026-10-18c", "2026-10-18b", "2026-10-18"]);
  });

  it("seen 18c: 21b, 21a, 20b, 20a, 19b, 19a, 18f, 18e and 18d; … seen 20a: 21b, 21a and 20b; seen 20b: 21b and 21a; seen 21a: only 21b; seen the newest: nothing", () => {
    expect(ids("2026-10-18c")).toEqual(["2026-10-21c", "2026-10-21b", "2026-10-21a", "2026-10-20b", "2026-10-20a", "2026-10-19b", "2026-10-19a", "2026-10-18f", "2026-10-18e", "2026-10-18d"]);
    expect(ids("2026-10-18e")).toEqual(["2026-10-21c", "2026-10-21b", "2026-10-21a", "2026-10-20b", "2026-10-20a", "2026-10-19b", "2026-10-19a", "2026-10-18f"]);
    expect(ids("2026-10-18f")).toEqual(["2026-10-21c", "2026-10-21b", "2026-10-21a", "2026-10-20b", "2026-10-20a", "2026-10-19b", "2026-10-19a"]);
    expect(ids("2026-10-19a")).toEqual(["2026-10-21c", "2026-10-21b", "2026-10-21a", "2026-10-20b", "2026-10-20a", "2026-10-19b"]);
    expect(ids("2026-10-19b")).toEqual(["2026-10-21c", "2026-10-21b", "2026-10-21a", "2026-10-20b", "2026-10-20a"]);
    expect(ids("2026-10-20a")).toEqual(["2026-10-21c", "2026-10-21b", "2026-10-21a", "2026-10-20b"]);
    expect(ids("2026-10-20b")).toEqual(["2026-10-21c", "2026-10-21b", "2026-10-21a"]);
    expect(ids("2026-10-21a")).toEqual(["2026-10-21c", "2026-10-21b"]);
    expect(ids("2026-10-21b")).toEqual(["2026-10-21c"]);
    expect(ids("2026-10-21c")).toEqual([]);
  });

  it("an account that has seen none gets the newest only", () => {
    expect(ids(null)).toEqual(["2026-10-21c"]);
  });

  it("cc-73b: the newest release (2026-10-21b) is the upper-end targets and the DRI vitamins (two items, the words of the brief); a 2-step tour on Hôm nay (the kcal target, then the vitamins column)", () => {
    const r = RELEASES.find((x) => x.id === "2026-10-21b");
    expect(r?.date).toBe("21/10");
    expect(r?.items.map((i) => [i.icon, i.title, i.body])).toEqual([
      ["target", "Mục tiêu rõ ràng hơn", "Mỗi mục giờ chỉ còn một con số để hướng tới, lấy ở mức cao của công thức huấn luyện viên."],
      ["target", "Vi chất theo chuẩn DRI", "Canxi, sắt, kẽm, vitamin… giờ theo khuyến nghị DRI của Mỹ và Canada, đúng tuổi và giới tính. Ăn quá mức an toàn thì app nhắc nhẹ."],
    ]);
    for (const i of r?.items ?? []) expect(i.body).not.toContain(":");
    expect(r?.tour?.map((s) => [s.target, s.fallback ?? null, s.advanceOn ?? null, s.title])).toEqual([
      ["home-hero", null, null, "Một con số"],
      ["nutrient-column", "home-hero", null, "Vi chất theo DRI"],
    ]);
    for (const s of r?.tour ?? []) expect(s.body.length).toBeLessThanOrEqual(100);
  });

  it("the newest release (2026-10-21c) is the add sheet, Hoàn tác, the lighter list and the update notice: four items, plain words, and no tour (every control is a labelled button)", () => {
    const r = latestRelease();
    expect(r?.id).toBe("2026-10-21c");
    expect(r?.date).toBe("21/10");
    expect(r?.items.map((i) => i.title)).toEqual(["Thêm món mượt hơn", "Thêm nhầm thì Hoàn tác", "Danh sách món gọn hơn", "Thông báo có bản mới không che món"]);
    expect(r?.tour).toBeUndefined();
    for (const i of r?.items ?? []) expect(i.body).not.toContain(":");
  });

  it("19a no longer claims VN 2016 or the Bộ Y tế", () => {
    const r = RELEASES.find((x) => x.id === "2026-10-19a");
    const text = JSON.stringify(r?.items.find((i) => i.icon === "target"));
    expect(text).not.toContain("2016");
    expect(text).not.toContain("Bộ Y tế");
    expect(text).not.toContain("người Việt");
  });

  it("follow-ups 20/10: 2026-10-21a says the H1T MICRO wordmark goes back to Hôm nay and toasts swipe away; a 1-step tour on the wordmark (the date when it is missing)", () => {
    const r = RELEASES.find((x) => x.id === "2026-10-21a");
    expect(r?.id).toBe("2026-10-21a");
    expect(r?.date).toBe("21/10");
    expect(r?.items.map((i) => [i.icon, i.title])).toEqual([
      ["home", "Bấm chữ H1T MICRO để về Hôm nay"],
      ["select", "Vuốt ngang để tắt thông báo"],
    ]);
    for (const i of r?.items ?? []) expect(i.body).not.toContain(":");
    expect(r?.tour?.map((s) => [s.target, s.fallback ?? null, s.advanceOn ?? null, s.title])).toEqual([["home-logo", "day-date", null, "Về Hôm nay"]]);
    expect(r?.tour?.[0].body.length).toBeLessThanOrEqual(100);
  });

  it("overnight 20/10: 2026-10-20b is the date that opens the calendar, then two changes users notice (these three items only, Hao 20/10); a 1-step tour on the date (the day arrow when it is missing)", () => {
    const r = RELEASES.find((x) => x.id === "2026-10-20b");
    expect(r?.id).toBe("2026-10-20b");
    expect(r?.date).toBe("20/10");
    expect(r?.items.map((i) => [i.icon, i.title])).toEqual([
      ["home", "Bấm vào ngày để mở lịch"],
      ["meal", "Xóa bữa không cần hỏi lại"],
      ["home", "Chữ to theo máy bạn"],
    ]);
    expect(r?.items.map((i) => i.body)).toEqual([
      "Muốn xem lại ngày cũ thì bấm vào ngày ở đầu trang, chọn ngày bất kỳ trên lịch. Ngày có ghi món sẽ có chấm.",
      "Bấm Xóa bữa này là xóa liền. Lỡ tay thì bấm Hoàn tác trong 8 giây.",
      "Chỉnh chữ to trong cài đặt điện thoại thì chữ trong app cũng to theo, đọc đỡ mỏi mắt.",
    ]);
    for (const i of r?.items ?? []) expect(i.body).not.toContain(":");
    expect(r?.tour?.map((s) => [s.target, s.fallback ?? null, s.advanceOn ?? null, s.title])).toEqual([["day-date", "day-prev", null, "Mở lịch"]]);
    expect(r?.tour?.[0].body.length).toBeLessThanOrEqual(100);
  });

  it("cc-70: hold, then drag a food to another meal (2026-10-20a): one item and a 1-step tour on Hôm nay (the food list, falling back to the meal pill)", () => {
    const r = RELEASES.find((x) => x.id === "2026-10-20a");
    expect(r?.id).toBe("2026-10-20a");
    expect(r?.date).toBe("20/10");
    expect(r?.items.map((i) => [i.icon, i.title])).toEqual([["select", "Giữ rồi kéo món sang bữa khác"]]);
    expect(r?.items[0].body).not.toContain(":");
    expect(r?.tour?.map((s) => [s.target, s.fallback ?? null, s.advanceOn ?? null, s.title])).toEqual([["home-food-list", "meal-pill", null, "Thử kéo món"]]);
    expect(r?.tour?.[0].body.length).toBeLessThanOrEqual(100);
  });

  it("cc-68: yesterday, offline and the save status (2026-10-19b): five items and a 3-step tour on Hôm nay (the arrow that opens yesterday, + Thêm, the save status)", () => {
    const r = RELEASES.find((x) => x.id === "2026-10-19b");
    expect(r?.id).toBe("2026-10-19b");
    expect(r?.date).toBe("19/10");
    expect(r?.items.map((i) => [i.icon, i.title])).toEqual([
      ["home", "Quên ghi hôm qua? Ghi bù được rồi"],
      ["home", "Mất mạng vẫn ghi được"],
      ["home", "Nhìn góc trên là biết đã lưu chưa"],
      ["bars", "Điện thoại, máy tính thấy y nhau"],
      ["target", "Đăng xuất không lo mất món"],
    ]);
    for (const i of r?.items ?? []) expect(i.body).not.toContain(":");
    expect(r?.tour?.map((s) => [s.target, s.fallback ?? null, s.advanceOn ?? null])).toEqual([
      ["day-prev", "header-actions", null],
      ["meal-add", "nav-add", null],
      ["sync-status", "header-actions", "tap"],
    ]);
    for (const s of r?.tour ?? []) {
      expect(s.body.length).toBeLessThanOrEqual(100);
      expect(s.body).not.toContain(":");
    }
  });
});

describe("joinedTour (what Thử ngay runs)", () => {
  const titles = (seen: string) => joinedTour(unseenReleases(seen).map((r) => r.id)).map((s) => s.title);
  const T18C = ["Món chưa lưu", "Kéo xuống để tải lại", "Chạm vi chất để xem nguồn", "Gần đây và Như hôm qua", "Thực phẩm bổ sung và Gia vị"];
  const T18E = ["Nhóm Bự / Bé", "Đánh dấu để ghi", "+ Thêm món"];
  const T18F = ["Ghi theo gam", "Sống hay chín", "Khay xem lại", "Thành phần của món"];
  const T19A = ["Tìm món", "Chỉnh tô phở"];
  const T19B = ["Về hôm qua", "Ghi bù", "Đã lưu chưa?"];
  const T20A = ["Thử kéo món"];
  const T20B = ["Mở lịch"];
  const T21A = ["Về Hôm nay"];
  const T21B = ["Một con số", "Vi chất theo DRI"];
  // 22 steps from 18c on, 8 at most: the oldest releases give up their last steps first (18c, 18e, 18f and 19a go; 19b, 20a, 20b, 21a and 21b go whole)
  const CAPPED = [...T19B, ...T20A, ...T20B, ...T21A, ...T21B];

  it("seen 18b: 18c, 18e, 18f, 19a, 19b, then 20a (oldest first; 18d has no tour), cut to 8 steps from the end of the oldest tours (the newest tours are whole)", () => {
    expect(titles("2026-10-18b")).toEqual(CAPPED);
  });

  it("seen 18c: the 18e, 18f, 19a, 19b and 20a tours, cut to 8", () => {
    expect(titles("2026-10-18c")).toEqual(CAPPED);
  });

  it("seen 18e: the 18f, 19a, 19b and 20a tours, cut to 8", () => {
    expect(titles("2026-10-18e")).toEqual(CAPPED);
  });

  it("seen 18f: the 19a, 19b, 20a, 20b, 21a and 21b tours, cut to 8 (19a goes); … seen 20a: 20b, 21a and 21b; seen 20b: 21a and 21b; seen 21a: only 21b", () => {
    expect(titles("2026-10-18f")).toEqual(CAPPED);
    expect(titles("2026-10-19a")).toEqual(CAPPED); // exactly 8
    expect(titles("2026-10-19b")).toEqual([...T20A, ...T20B, ...T21A, ...T21B]);
    expect(titles("2026-10-20a")).toEqual([...T20B, ...T21A, ...T21B]);
    expect(titles("2026-10-20b")).toEqual([...T21A, ...T21B]);
    expect(titles("2026-10-21a")).toEqual(T21B);
  });

  it("releases without a tour add nothing", () => {
    expect(titles("2026-10-17")).toEqual(CAPPED);
    expect(titles("2026-10-21b")).toEqual([]);
  });

  // Hôm nay as "Thử ngay" sees it: 18c's, 18e's (through the Ngày tập pill), 18f's, 19b's and 20a's controls
  const ON_HOME = new Set(["sync-status", "header-actions", "home-food-list", "meal-pill", "meal-add", "nutrient-column", "nav-explore", "training-pill", "day-prev", "day-date", "home-logo", "home-hero"]);
  const onHome = (s: { target: string; fallback?: string }) => ON_HOME.has(s.target) || (s.fallback !== undefined && ON_HOME.has(s.fallback));

  it("seen 18b, on Hôm nay: every step is on the page, so the cap keeps the newest 8", () => {
    const ids = unseenReleases("2026-10-18b").map((r) => r.id);
    expect(ids).toEqual(["2026-10-21c", "2026-10-21b", "2026-10-21a", "2026-10-20b", "2026-10-20a", "2026-10-19b", "2026-10-19a", "2026-10-18f", "2026-10-18e", "2026-10-18d", "2026-10-18c"]);
    expect(joinedTour(ids, RELEASES, onHome).map((s) => s.title)).toEqual(CAPPED);
  });

  it("the keep test sees each step's place in the whole joined list, oldest release first, before the cap", () => {
    const seen: [string, number][] = [];
    joinedTour(unseenReleases("2026-10-18b").map((r) => r.id), RELEASES, (s, i) => (seen.push([s.title, i]), false));
    expect(seen.map(([t]) => t)).toEqual(tourSteps(["2026-10-21c", "2026-10-21b", "2026-10-21a", "2026-10-20b", "2026-10-20a", "2026-10-19b", "2026-10-19a", "2026-10-18f", "2026-10-18e", "2026-10-18d", "2026-10-18c"]).map((s) => s.title));
    expect(seen.map(([, i]) => i)).toEqual(Array.from({ length: 22 }, (_, i) => i));
    expect(seen.map(([t]) => t)).toEqual([...T18C, ...T18E, ...T18F, ...T19A, ...T19B, ...T20A, ...T20B, ...T21A, ...T21B]);
  });

  it("the cap still holds after the filter: more than 8 steps on the page drops the oldest release's last ones", () => {
    const step = (t: string) => ({ target: "x", title: t, body: "" });
    const fake: Release[] = [
      { id: "b", date: "", items: [], tour: ["b1", "b2", "b3", "b4", "b5"].map(step) },
      { id: "a", date: "", items: [], tour: ["a1", "a2", "a3", "a4", "a5"].map(step) },
    ];
    expect(joinedTour(["a", "b"], fake, (s) => s.title !== "a1").map((s) => s.title)).toEqual(["a2", "a3", "a4", "b1", "b2", "b3", "b4", "b5"]);
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

describe("whatsNewSteps (the running tour, as Thử ngay saved it)", () => {
  it("`only` holds places in the whole joined list; the cap comes after them: 18b's 18c + 18e on Hôm nay is all 8 steps", () => {
    const releaseIds = ["2026-10-18e", "2026-10-18d", "2026-10-18c"];
    const all = tourSteps(releaseIds);
    const only = all.flatMap((s, i) => (s.target.startsWith("unit-") ? [] : [i]));
    const steps = whatsNewSteps({ releaseIds, index: 0, only });
    expect(steps).toHaveLength(MAX_TOUR_STEPS);
    expect(steps.slice(0, 5).map((s) => s.target)).toEqual(["sync-status", "home-food-list", "nutrient-column", "meal-pill", "nav-explore"]);
    expect(steps.slice(5).map((s) => s.target)).toEqual(["training-size", "training-checklist", "training-add-item"]);
  });

  it("without `only` (a tour saved before it existed) it is the capped joined tour", () => {
    expect(whatsNewSteps({ releaseIds: ["2026-10-18d", "2026-10-18c"], index: 0 }).map((s) => s.title)).toEqual(joinedTour(["2026-10-18d", "2026-10-18c"]).map((s) => s.title));
  });
});

describe("tourStepAfter (moving through the Có gì mới tour)", () => {
  const joined = joinedTour(["2026-10-18c", "2026-10-18e"]);
  const r17 = RELEASES.find((r) => r.id === "2026-10-17")?.tour ?? [];

  it("the joined tour runs end to end with Tiếp: 18c's five steps, then 18e's three, then it ends", () => {
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
