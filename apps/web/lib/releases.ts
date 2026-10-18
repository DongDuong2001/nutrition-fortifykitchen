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
  /** What the user can do on the highlighted element to move on ("Tiếp" works too) */
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
    id: "2026-10-18c",
    date: "18/10",
    items: [
      { icon: "select", title: "Gần đây và Hay ăn", body: "Khi thêm món, món bạn hay ăn ở bữa đó hiện sẵn. Một chạm là thêm, đúng khẩu phần lần trước." },
      { icon: "home", title: "Như hôm qua", body: "Ở mỗi bữa hôm nay, chọn Như hôm qua để thêm lại các món của bữa đó hôm qua." },
      { icon: "bars", title: "Chạm vi chất để xem nguồn", body: "Chạm một vi chất ở Hôm nay để xem món nào đã góp vào, món nhiều nhất ở trên." },
      { icon: "target", title: "Rung khi chạm", body: "Trên Android, điện thoại rung nhẹ khi lưu, xóa hay hoàn tác. Tắt trong Cài đặt." },
      { icon: "home", title: "Kéo xuống để tải lại", body: "Ở Hôm nay, kéo danh sách món xuống rồi thả để lấy món vừa thêm trên máy khác." },
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

/** The sheet opens by itself once per release: not on the first run, and only when nothing else is open. */
export function shouldShowWhatsNew({ seenId, latestId, firstRun, busy }: { seenId: string | null; latestId: string | null; firstRun: boolean; busy: boolean }): boolean {
  return latestId !== null && seenId !== latestId && !firstRun && !busy;
}
