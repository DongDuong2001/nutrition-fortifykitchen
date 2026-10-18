/**
 * "Có gì mới" (cc-46): what each release brings, newest first. Every merge to main that users can see adds or
 * extends the top entry (Vietnamese, the user's words, no tech terms). Pure.
 */
export type ReleaseIcon = "home" | "select" | "target" | "meal" | "bars" | "share";

export interface ReleaseItem {
  icon: ReleaseIcon;
  title: string;
  body: string;
}

export interface ReleaseTourStep {
  /** The element to point at: data-tour="<target>" */
  target: string;
  /** Pointed at instead when the target is not on screen */
  fallback?: string;
  title: string;
  body: string;
  /** What the user can do on the highlighted element to move on ("Tiếp" works too). The element stays tappable. */
  advanceOn?: "long-press" | "tap";
}

export interface Release {
  /** The release day, YYYY-MM-DD, with a letter after it for a later release the same day (2026-10-18c) */
  id: string;
  /** dd/mm, as shown ("Cập nhật 17/10") */
  date: string;
  items: readonly ReleaseItem[];
  tour?: readonly ReleaseTourStep[];
}

export const RELEASES: readonly Release[] = [
  {
    id: "2026-10-18d",
    date: "18/10",
    items: [
      {
        icon: "select",
        title: "Ghi món theo cách bạn quen",
        body: "Chọn trái, chén, lon… và cỡ nhỏ, vừa, lớn, hoặc nhập gam. Cơm, mì, yến mạch mở sẵn ở Gam.",
      },
    ],
    tour: [
      {
        target: "unit-toggle",
        title: "Chọn đơn vị",
        body: "Chuyển giữa các đơn vị quen thuộc hoặc nhập gam.",
      },
      {
        target: "unit-size",
        title: "Chọn kích cỡ",
        body: "Chọn cỡ nhỏ, vừa, lớn hoặc lưng, đầy.",
      },
      {
        target: "unit-amount",
        title: "Nhập số lượng",
        body: "Chạm để gõ hoặc bấm cộng trừ để chỉnh số lượng.",
      },
    ],
  },
  {
    id: "2026-10-18c",
    date: "18/10",
    items: [
      { icon: "select", title: "Gần đây và Hay ăn", body: "Khi thêm món, món bạn hay ăn ở bữa đó hiện sẵn. Một chạm là thêm, đúng khẩu phần lần trước." },
      { icon: "home", title: "Như hôm qua", body: "Ở mỗi bữa hôm nay, chọn Như hôm qua để thêm lại các món của bữa đó hôm qua." },
      { icon: "bars", title: "Chạm vi chất để xem nguồn", body: "Chạm một vi chất ở Hôm nay để xem món nào đã góp vào, món nhiều nhất ở trên." },
      { icon: "target", title: "Rung khi chạm", body: "Trên Android, điện thoại rung nhẹ khi lưu, xóa hay hoàn tác. Tắt trong Cài đặt." },
      { icon: "home", title: "Kéo xuống để tải lại", body: "Ở Hôm nay, kéo danh sách món xuống rồi thả để lấy món vừa thêm trên máy khác." },
      { icon: "meal", title: "Món của tôi được lưu", body: "Món tự tạo giờ lưu vào tài khoản; danh sách nguyên liệu chỉ có trên máy này." },
      { icon: "meal", title: "Ghi thực phẩm bổ sung theo viên", body: "Thêm được viên, giọt, muỗng dù nhãn không ghi kcal." },
      { icon: "select", title: "Ghi theo quả, viên", body: "Trứng, trái cây và thực phẩm bổ sung có nút ×N: chọn khẩu phần rồi tăng giảm số lượng." },
    ],
    // Everything since 17/10 (18/10, 18b and 18c), on Hôm nay: "Có gì mới" shows only this release
    tour: [
      {
        target: "sync-status",
        fallback: "header-actions",
        title: "Món chưa lưu",
        body: "Khi đầu trang có chữ Chưa lưu, món vẫn nằm trên máy này. Chạm vào chữ đó để gửi ngay.",
        advanceOn: "tap",
      },
      { target: "home-food-list", fallback: "meal-pill", title: "Kéo xuống để tải lại", body: "Kéo danh sách món xuống rồi thả để lấy món vừa thêm trên máy khác." },
      { target: "nutrient-column", title: "Chạm vi chất để xem nguồn", body: "Chạm một vi chất để xem món nào cung cấp, món nhiều nhất ở trên." },
      { target: "meal-pill", title: "Gần đây và Như hôm qua", body: "Chạm + Thêm: Gần đây là món bạn ăn ở bữa này. Chạm tên bữa rồi ⋯ để chọn Như hôm qua." },
      { target: "nav-explore", title: "Thực phẩm bổ sung và Gia vị", body: "Tìm ở Khám phá. Trứng, trái cây và thực phẩm bổ sung ghi theo quả, viên với nút ×N." },
    ],
  },
  // Thêm Thực phẩm bổ sung và Gia vị
  {
    id: "2026-10-18b",
    date: "18/10",
    items: [
      { icon: "meal", title: "Thực phẩm bổ sung", body: "Thêm CanPrev, Webber Naturals, Codeage. Ghi theo viên, giọt hoặc muỗng như trên nhãn." },
      { icon: "bars", title: "Gia vị", body: "Gia vị, muối và giấm có mục Gia vị riêng." },
      { icon: "select", title: "Thêm cà phê", body: "Thêm cà phê phin, cà phê quán và cà phê gói." },
    ],
  },
  {
    id: "2026-10-18",
    date: "18/10",
    items: [
      {
        icon: "meal",
        title: "Đồng bộ ổn định hơn",
        body: "Món chưa lưu được sẽ có chữ Chưa lưu và được gửi lại tự động; máy khác thấy món mới trong vòng 1 phút.",
      },
    ],
  },
  {
    id: "2026-10-17",
    date: "17/10",
    items: [
      { icon: "home", title: "Trang chủ mới", body: "lehongkhanh.vn giờ là trang của HLV Khánh. Bấm Truy cập để vào app." },
      { icon: "select", title: "Chọn nhiều món", body: "Giữ một món để chọn nhiều món, rồi đổi bữa hoặc xóa cùng lúc." },
      { icon: "target", title: "Mục tiêu đa lượng", body: "Tự chia đạm, tinh bột, chất béo trong Cài đặt › Mục tiêu." },
      { icon: "meal", title: "Bữa ăn dễ đọc hơn", body: "Đầu bữa màu mực, nền trắng, chữ to hơn." },
      { icon: "bars", title: "Thanh vi chất 4 màu", body: "Đỏ là thiếu, vàng trung bình, xanh nhạt gần đủ, xanh lá đạt." },
      { icon: "share", title: "Ảnh chia sẻ rõ hơn", body: "Chữ trong ảnh chia sẻ không còn chồng lên nhau trên một số điện thoại." },
    ],
    tour: [
      {
        target: "home-food-list",
        title: "Giữ để chọn nhiều món",
        body: "Thử giữ một món một giây. Chọn thêm món khác, rồi đổi bữa hoặc xóa cùng lúc.",
        advanceOn: "long-press",
      },
      {
        target: "select-bar",
        fallback: "meal-pill",
        title: "Đổi bữa hoặc xóa",
        body: "Chọn Chuyển bữa để đổi bữa, Xóa để xóa. Luôn có nút hoàn tác.",
      },
      { target: "nav-settings", title: "Mục tiêu đa lượng", body: "Vào Cài đặt › Mục tiêu để tự chia đạm, tinh bột, chất béo." },
    ],
  },
];

export const latestRelease = (): Release | null => RELEASES[0] ?? null;

export const releaseById = (id: string): Release | null => RELEASES.find((r) => r.id === id) ?? null;

/**
 * "Có gì mới" shows every release newer than the last one the account has seen, newest first (ids sort by day, then
 * letter). An account that has seen none gets the newest only, not the whole history.
 */
export function unseenReleases(seenId: string | null, releases: readonly Release[] = RELEASES): Release[] {
  if (seenId === null) return releases.slice(0, 1);
  return releases.filter((r) => r.id > seenId);
}

/** The most steps "Thử ngay" runs in one go, however many releases it covers. */
export const MAX_TOUR_STEPS = 8;

/**
 * The tour "Thử ngay" runs for these releases: their tours one after another, oldest release first. Past
 * MAX_TOUR_STEPS the later steps of the oldest release are dropped first (the newest release is shown whole).
 */
export function joinedTour(releaseIds: readonly string[], releases: readonly Release[] = RELEASES): ReleaseTourStep[] {
  const parts = releases
    .filter((r) => releaseIds.includes(r.id))
    .reverse()
    .map((r) => [...(r.tour ?? [])]);
  let extra = parts.reduce((n, p) => n + p.length, 0) - MAX_TOUR_STEPS;
  for (const part of parts) {
    while (extra > 0 && part.length > 0) {
      part.pop();
      extra -= 1;
    }
  }
  return parts.flat();
}

/**
 * Where a running "Có gì mới" tour goes from step `index`: Tiếp and a target that is not on screen move one on, and so
 * does the step's own action (a long press, a tap on the element); the action of another step does nothing. Past the
 * last step the tour ends (null).
 */
export function tourStepAfter(steps: readonly ReleaseTourStep[], index: number, event: "next" | "missing" | "long-press" | "tap"): number | null {
  const step = steps[index];
  if (!step) return null;
  if ((event === "long-press" || event === "tap") && step.advanceOn !== event) return index;
  return index + 1 < steps.length ? index + 1 : null;
}

/** The sheet opens by itself when a release is newer than the last one seen: not on the first run, and only when nothing else is open. */
export function shouldShowWhatsNew({ seenId, latestId, firstRun, busy }: { seenId: string | null; latestId: string | null; firstRun: boolean; busy: boolean }): boolean {
  return latestId !== null && (seenId === null || seenId < latestId) && !firstRun && !busy;
}
