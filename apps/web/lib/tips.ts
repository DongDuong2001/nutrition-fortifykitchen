import type { OnboardingFlags } from "./onboarding-flags";

/**
 * The first-visit tips (cc-42): one card on a screen, shown once, and only if the user has never used what it
 * explains. The copy is final (design/onboarding-mockups). The rules are in pickTip.
 */
export interface Tip {
  id: string;
  /** The element to point at: data-tour="<target>" */
  target: string;
  title: string;
  body: string;
  /** A second paragraph, when the board has one */
  note?: string;
  /** The usage events that mean the user already knows this feature */
  used: readonly string[];
  /** Whether the tip belongs to the screen the user is on */
  when: (ctx: TipContext) => boolean;
}

export interface TipContext {
  pathname: string;
  /** Hôm nay is showing an earlier day (?date=) */
  pastDay: boolean;
  /** Foods logged on the day shown */
  foodsToday: number;
  /** Chọn nhiều món is open on Hôm nay */
  selectMode?: boolean;
}

const home = (c: TipContext) => c.pathname === "/";
const today = (c: TipContext) => home(c) && !c.pastDay && !c.selectMode && c.foodsToday > 0;

export const TIPS: readonly Tip[] = [
  {
    id: "home-logged",
    target: "home-food-list",
    title: "Sửa nhanh",
    body: "Giữ một món để sửa khẩu phần, đổi bữa hoặc xóa. Chạm tên bữa để xem riêng bữa đó.",
    used: ["long-press-edit"],
    when: today,
  },
  {
    id: "meal-add",
    target: "meal-add",
    title: "Thêm vào bữa bất kỳ lúc nào",
    body: "Chạm vào nút + Thêm ở dòng tên bữa để thêm món vào bữa ăn đó.",
    used: ["meal-add"],
    when: today,
  },
  {
    id: "past-day",
    target: "home-hero",
    title: "Ngày đã qua",
    body: "Ngày cũ chỉ để xem. Muốn ăn lại bữa này? Chọn món rồi chạm Chép vào hôm nay.",
    used: ["copy-to-today"],
    when: (c) => home(c) && c.pastDay,
  },
  {
    id: "multi-select",
    target: "select-bar",
    title: "Chọn nhiều món",
    body: "Chép sang ngày khác, chuyển bữa hoặc xóa nhiều món cùng lúc. Xóa xong vẫn hoàn tác được trong 5 giây.",
    used: ["multi-select-action"],
    when: (c) => home(c) && c.selectMode === true,
  },
  {
    id: "add-tray",
    target: "tray-toggle",
    title: "Chọn nhiều món cùng lúc",
    body: "Chạm dấu + ở từng món để thêm nhanh vào bữa. Chọn xong và thêm tất cả một lần. Chạm vào tên món nếu muốn chỉnh khẩu phần trước.",
    used: ["tray-add"],
    when: (c) => c.pathname === "/add",
  },
  {
    id: "food-detail",
    target: "food-favourite",
    title: "Lưu món hay ăn",
    body: "Chạm trái tim để thêm vào Yêu thích, lần sau thêm chỉ một chạm. Nhãn Ước tính: số liệu vi chất được ước tính từ món tương tự.",
    used: ["favourite"],
    when: (c) => /^\/foods\/(?!new$|compare$)[^/]+$/.test(c.pathname),
  },
  {
    id: "compare",
    target: "compare-table",
    title: "Đọc bảng so sánh",
    body: "Chấm xanh đánh dấu món cao nhất ở mỗi dòng. Chạm tên món để xem chi tiết.",
    used: ["compare-basis"],
    when: (c) => c.pathname === "/foods/compare",
  },
  {
    id: "food-new",
    target: "create-mode",
    title: "Món tự tính từ nguyên liệu có sẵn",
    body: "Chọn nguyên liệu có sẵn trong app và nhập số gram. Kcal và đủ 22 vi chất được tính tự động. Món đóng gói có nhãn? Chọn Tự nhập ở trên.",
    note: "Món ăn sẽ chỉ lưu trên máy này. Khi đổi điện thoại sẽ không còn.",
    used: ["create-food"],
    when: (c) => c.pathname === "/foods/new",
  },
  {
    id: "training",
    target: "training-minutes",
    title: "Chọn thời lượng tập",
    body: "Chọn số phút tập hôm nay. App tính lượng muối cần thêm và nhắc theo từng giai đoạn.",
    used: ["training-minutes"],
    when: (c) => c.pathname === "/training",
  },
  {
    id: "micros",
    target: "micros-groups",
    title: "Xem theo nhóm",
    body: "Chạm nhóm để lọc Vitamin hay Khoáng chất. Chạm một chất để xem món nào giàu chất đó.",
    used: ["micros-filter"],
    when: (c) => c.pathname === "/micros",
  },
  {
    id: "trends-micros",
    target: "trends-summary",
    title: "Trung bình cả kỳ",
    body: "Đây là trung bình 7 hoặc 30 ngày. Màn Vi chất ở Hôm nay chỉ tính riêng một ngày.",
    used: ["range-toggle"],
    when: (c) => c.pathname === "/trends/micros",
  },
  {
    id: "explore",
    target: "explore-rich",
    title: "Bù chất bạn còn thiếu",
    body: "Chọn một chất để xem món nào giúp bạn bổ sung chất đó nhanh nhất trên mỗi 100 g. Chạm món để thêm vào bữa.",
    used: ["rich-in"],
    when: (c) => c.pathname === "/explore",
  },
  {
    id: "overview",
    target: "trends-range",
    title: "Theo dõi chỉ số cả tuần qua",
    body: "Chuyển qua lại giữa 7 ngày và 30 ngày để xem bạn đã đều đặn tới đâu. Vạch đứt là mục tiêu của bạn đặt ra, cột nhạt là ngày ghi chưa đủ.",
    used: ["range-toggle"],
    when: (c) => c.pathname === "/trends",
  },
  {
    id: "leaderboard",
    target: "leaderboard-join",
    title: "Bạn đang ẩn danh",
    body: "Bật Tham gia thì tên bạn hiện công khai cho mọi người trong bảng. Tắt lại khi bạn muốn.",
    used: ["leaderboard-optin"],
    when: (c) => c.pathname === "/explore/leaderboard",
  },
];

/**
 * The one tip to show on this visit, or null. A tip shows when tips are on, no tour is running, the user has not seen
 * it and has never used what it explains. At most one: the first of the table that fits (the next fits next visit).
 */
export function pickTip({ ctx, flags, tourActive }: { ctx: TipContext; flags: OnboardingFlags; tourActive: boolean }): Tip | null {
  if (tourActive || flags.tipsOff) return null;
  return TIPS.find((t) => t.when(ctx) && !flags.seen.includes(t.id) && !t.used.some((u) => flags.used.includes(u))) ?? null;
}
