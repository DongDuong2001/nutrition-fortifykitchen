import type { OnboardingFlags } from "./onboarding-flags";
import { HOME_ROUTE } from "./nav";

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
  /** A round 44 px hole centred on the target (a small icon button) instead of the rounded box around it */
  round?: boolean;
  /** A primary button that closes the tip and does what it explains ("Thử ngay"); "Đã hiểu" then stays as a text button */
  tryLabel?: string;
  /** The usage events that mean the user already knows this feature */
  used: readonly string[];
  /** It explains something inside an open sheet: the only tips that may show while one is open */
  inSheet?: boolean;
  /** Whether the tip belongs to the screen the user is on */
  when: (ctx: TipContext) => boolean;
}

export interface TipContext extends PortionControls {
  pathname: string;
  /** Hôm nay is showing an earlier day (?date=) */
  pastDay: boolean;
  /** Foods logged on the day shown */
  foodsToday: number;
  /** Chọn nhiều món is open on Hôm nay */
  selectMode?: boolean;
  /** Entries of today the server has not saved yet (cc-49: the Chưa lưu marker) */
  unsaved?: number;
  /** A touch screen (pointer: coarse): pull to refresh exists only there (cc-51) */
  touch?: boolean;
  /** The phone can vibrate (Android): the Rung khi chạm switch exists only there (cc-51) */
  vibrate?: boolean;
  /** A sheet the user opened is up (not Có gì mới or the install pop-up): only sheet tips then */
  sheetOpen?: boolean;
  /** No network: the header says Ngoại tuyến */
  offline?: boolean;
}

/**
 * Portion controls on screen (lib/tour-bus Presence): the unit stepper (supplements, món Việt, cans), and cc-53b's ×N
 * row, Sống | Chín switch, egg Quả | Gam and the tray's rows.
 */
export type PortionControls = Partial<Record<"stepper" | "multiply" | "cook" | "egg" | "tray", boolean>>;

/** The share tip waits until today holds this many foods. */
export const SHARE_TIP_MIN_FOODS = 3;

const home = (c: TipContext) => c.pathname === HOME_ROUTE;
const today = (c: TipContext) => home(c) && !c.pastDay && !c.selectMode && c.foodsToday > 0;

export const TIPS: readonly Tip[] = [
  {
    id: "sheet-drag",
    target: "sheet-handle",
    title: "Kéo xuống để đóng",
    body: "Kéo thanh nhỏ ở đầu bảng này xuống để đóng. Chạm ra ngoài bảng cũng được.",
    used: ["sheet-drag"],
    inSheet: true,
    when: (c) => c.sheetOpen === true && c.touch === true,
  },
  {
    id: "sync-offline",
    target: "sync-status",
    title: "Đang ngoại tuyến",
    body: "Món bạn thêm vẫn lưu trên máy này và tự gửi khi có mạng. Chữ ở đầu trang cho biết món đã lưu chưa.",
    used: ["retry-unsaved"],
    when: (c) => home(c) && !c.pastDay && !c.selectMode && c.offline === true,
  },
  {
    id: "unsaved",
    target: "unsaved-marker",
    title: "Món chưa lưu",
    body: "Món có chữ Chưa lưu vẫn nằm trên máy này. App tự gửi lại khi có mạng và mỗi lần mở app; chạm Chưa lưu ở đầu trang để gửi ngay.",
    used: ["retry-unsaved"],
    when: (c) => today(c) && (c.unsaved ?? 0) > 0,
  },
  {
    id: "home-logged",
    target: "home-food-list",
    title: "Sửa nhanh",
    body: "Chạm một món để sửa. Giữ một món để chọn nhiều món, rồi đổi bữa hoặc xóa.",
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
    id: "home-share",
    target: "home-share",
    round: true,
    tryLabel: "Thử ngay",
    title: "Chia sẻ ngày ăn của bạn",
    body: "Chạm biểu tượng chia sẻ để tạo ảnh tóm tắt ngày: tên, Level, kcal và vi chất. Chia sẻ cho HLV hoặc đăng lên mạng xã hội nhanh chóng.",
    used: ["share-day"],
    when: (c) => today(c) && c.foodsToday >= SHARE_TIP_MIN_FOODS,
  },
  {
    id: "pull-refresh",
    target: "meal-pill",
    title: "Kéo xuống để tải lại",
    body: "Ở đầu danh sách món, kéo xuống rồi thả để lấy món vừa thêm trên máy khác.",
    used: ["pull-refresh"],
    when: (c) => today(c) && c.touch === true,
  },
  {
    id: "nutrient-sources",
    target: "nutrient-column",
    title: "Món nào góp phần?",
    body: "Chạm một vi chất để xem món nào hôm nay góp vào con số đó, món nhiều nhất ở trên.",
    used: ["nutrient-sources"],
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
    id: "add-shortlists",
    target: "add-recents",
    title: "Gần đây và Hay ăn",
    body: "Món bạn ăn ở bữa này gần đây, và món hay ăn nhất 14 ngày qua. Chạm + để thêm ngay với khẩu phần lần trước.",
    used: ["shortlist-add"],
    when: (c) => c.pathname === "/add",
  },
  {
    id: "haptics",
    target: "haptics-switch",
    title: "Rung khi chạm",
    body: "Điện thoại rung nhẹ khi bạn lưu, xóa hay hoàn tác một món. Không thích thì tắt ở đây.",
    used: ["haptics-switch"],
    when: (c) => c.pathname === "/settings" && c.vibrate === true,
  },
  {
    id: "food-detail",
    target: "food-favourite",
    title: "Lưu món hay ăn",
    body: "Chạm trái tim để thêm vào Yêu thích, lần sau thêm chỉ một chạm. Nhãn Ước tính: số liệu vi chất được ước tính từ món tương tự.",
    used: ["favourite"],
    when: (c) => /^\/foods\/(?!new$|compare$)[^/]+$/.test(c.pathname),
  },
  // cc-53b: the portion sheet's own controls, in the order they come in the sheet, then the tray's rows
  {
    id: "cook-state",
    target: "cook-state",
    title: "Cân sống hay đã nấu chín",
    body: "Cân lúc nào thì chọn đúng lúc đó. App tự đổi ra số liệu khớp với món.",
    used: ["cook-state"],
    inSheet: true,
    when: (c) => c.cook === true,
  },
  {
    id: "egg-mode",
    target: "egg-mode",
    title: "Trứng ghi theo quả",
    body: "Chọn cỡ ghi trên hộp rồi chọn mấy quả. Muốn cân thì chuyển qua Gam.",
    used: ["egg-mode"],
    inSheet: true,
    when: (c) => c.egg === true,
  },
  {
    id: "portion-multiply",
    target: "portion-multiply",
    title: "Nhân khẩu phần nhanh",
    body: "Gõ số gam hoặc chọn 100 g, rồi bấm + để nhân lên. 100 g × 3 là 300 g.",
    used: ["portion-multiply"],
    inSheet: true,
    when: (c) => c.multiply === true,
  },
  {
    id: "tray-row",
    target: "tray-row",
    title: "Chỉnh từng món trong khay",
    body: "Chạm một món để đổi khẩu phần, xong thì chọn Xong. Cả khay thêm vô bữa một lần.",
    used: ["tray-row"],
    inSheet: true,
    when: (c) => c.tray === true,
  },
  {
    id: "quantity-stepper",
    target: "unit-stepper",
    // Only the foods that keep their unit: supplements by the pill, món Việt by the dish, cans
    title: "Tăng giảm số lượng",
    body: "Thực phẩm bổ sung ghi theo viên, món Việt theo phần. Chạm + hoặc − để ghi 2, 3 viên.",
    used: ["quantity-step"],
    inSheet: true,
    when: (c) => c.stepper === true && !c.selectMode,
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
    body: "Chọn nguyên liệu có sẵn trong app và nhập số gram. Kcal và đủ 22 vi chất được tính tự động. Món lưu vào tài khoản, máy khác cũng thấy. Món đóng gói có nhãn? Chọn Tự nhập ở trên.",
    note: "Danh sách nguyên liệu của món chỉ có trên máy này.",
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
  // cc-52: the Bự / Bé chip and + Thêm món are on today's Ngày tập only (a past day is view-only)
  {
    id: "training-size",
    target: "training-size",
    title: "Nhóm Bự / Bé",
    body: "Liều muối và tinh bột nhanh được điền theo nhóm của bạn: Bé lấy mức thấp, Bự mức cao. Chạm để đổi nhóm.",
    used: ["training-size"],
    when: (c) => c.pathname === "/training" && !c.pastDay,
  },
  {
    id: "training-add-item",
    target: "training-add-item",
    title: "Thêm món riêng",
    body: "Thêm món bạn hay dùng khi tập, như nước dừa hay cam. Món ở lại cho mọi ngày tập; đánh dấu là ghi vào Bữa phụ.",
    used: ["training-add-item"],
    when: (c) => c.pathname === "/training" && !c.pastDay,
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

/** design-floor: at most one tip in this long (V3, 22/10). */
export const TIP_GAP_MS = 24 * 3600_000;

/**
 * The one tip to show on this visit, or null. A tip shows when tips are on, no tour is running, the user has not seen
 * it and has never used what it explains. At most one: the first of the table that fits (the next fits next visit).
 * While a sheet is open only the sheet's own tips can show (the page's would point under it). Given `now`, nothing
 * shows within TIP_GAP_MS of the last tip shown (without it the pick is as before).
 */
export function pickTip({ ctx, flags, tourActive, now }: { ctx: TipContext; flags: OnboardingFlags; tourActive: boolean; now?: number }): Tip | null {
  if (tourActive || flags.tipsOff) return null;
  if (now !== undefined && flags.tipShownAt != null && now - flags.tipShownAt < TIP_GAP_MS) return null;
  return TIPS.find((t) => tipDue(t, ctx, flags)) ?? null;
}

/** This tip fits the screen and the user has neither seen it nor used what it explains. */
export function tipDue(tip: Tip, ctx: TipContext, flags: OnboardingFlags): boolean {
  if (ctx.sheetOpen && !tip.inSheet) return false;
  return tip.when(ctx) && !flags.seen.includes(tip.id) && !tip.used.some((u) => flags.used.includes(u));
}
