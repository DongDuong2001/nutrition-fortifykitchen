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
  // fix/rich-tabs (Hao 21/10, review 03:00): the "Giàu …" lists split into Thực phẩm and Thực phẩm bổ sung. 21b is live, so this
  // is the next release; #33 (fix/polish-1020) adds its own 21c, and whichever merges second puts both into this one entry. No
  // tour: the two tabs are in plain sight at the top of the list
  {
    id: "2026-10-21c",
    date: "21/10",
    items: [
      { icon: "bars", title: "Danh sách Giàu … giờ tách riêng thực phẩm và thực phẩm bổ sung", body: "Trong Khám phá, thực phẩm và thực phẩm bổ sung nằm ở hai thẻ riêng, nên viên uống không còn đứng đầu danh sách món ăn." },
    ],
  },
  // cc-73b (Hao 20/10): targets at the upper end of the coach's range, one number each; vitamins and minerals by the US DRI
  // with the safe upper limit. The tour is Hôm nay: the kcal target, then the vitamins and minerals column
  {
    id: "2026-10-21b",
    date: "21/10",
    items: [
      { icon: "target", title: "Mục tiêu rõ ràng hơn", body: "Mỗi mục giờ chỉ còn một con số để hướng tới, lấy ở mức cao của công thức huấn luyện viên." },
      { icon: "target", title: "Vi chất theo chuẩn DRI", body: "Canxi, sắt, kẽm, vitamin… giờ theo khuyến nghị DRI của Mỹ và Canada, đúng tuổi và giới tính. Ăn quá mức an toàn thì app nhắc nhẹ." },
    ],
    tour: [
      { target: "home-hero", title: "Một con số", body: "Con số sau dấu gạch chéo là mục tiêu kcal của bạn hôm nay." },
      { target: "nutrient-column", fallback: "home-hero", title: "Vi chất theo DRI", body: "Mỗi vi chất so với khuyến nghị đúng tuổi và giới tính của bạn." },
    ],
  },
  // Follow-ups 20/10: the H1T MICRO wordmark goes back to Hôm nay; toasts swipe away and repeated adds share one (cc-64).
  // The tour is the wordmark, on Hôm nay (the date when it
  // is missing, e.g. on a past day where "Về hôm nay" takes its place)
  {
    id: "2026-10-21a",
    date: "21/10",
    items: [
      { icon: "home", title: "Bấm chữ H1T MICRO để về Hôm nay", body: "Đang xem Tổng quan hay trang khác, bấm chữ H1T MICRO ở góc trên là về ngay Hôm nay." },
      { icon: "select", title: "Vuốt ngang để tắt thông báo", body: "Thông báo ở cuối màn hình vuốt sang một bên là tắt. Thêm mấy món liền tay thì chỉ hiện một thông báo đếm số món." },
    ],
    tour: [{ target: "home-logo", fallback: "day-date", title: "Về Hôm nay", body: "Bấm chữ H1T MICRO ở đây để về Hôm nay từ trang khác." }],
  },
  // Overnight 20/10: the date at the top of Hôm nay opens the calendar (cc-72), Xóa bữa with Hoàn tác only (cc-62), text
  // that follows the phone's text size (cc-66); these three only (Hao, 20/10). The tour is the date, on Hôm nay
  {
    id: "2026-10-20b",
    date: "20/10",
    items: [
      { icon: "home", title: "Bấm vào ngày để mở lịch", body: "Muốn xem lại ngày cũ thì bấm vào ngày ở đầu trang, chọn ngày bất kỳ trên lịch. Ngày có ghi món sẽ có chấm." },
      { icon: "meal", title: "Xóa bữa không cần hỏi lại", body: "Bấm Xóa bữa này là xóa liền. Lỡ tay thì bấm Hoàn tác trong 8 giây." },
      { icon: "home", title: "Chữ to theo máy bạn", body: "Chỉnh chữ to trong cài đặt điện thoại thì chữ trong app cũng to theo, đọc đỡ mỏi mắt." },
    ],
    tour: [{ target: "day-date", fallback: "day-prev", title: "Mở lịch", body: "Bấm vào ngày để chọn ngày khác trên lịch. Ngày có chấm là ngày có ghi món." }],
  },
  // cc-70: hold a food, then drag it to another meal (a finger or a pen). The tour stays on Hôm nay: the food list, or the
  // meal pill when the day has no food yet
  {
    id: "2026-10-20a",
    date: "20/10",
    items: [
      { icon: "select", title: "Giữ rồi kéo món sang bữa khác", body: "Trên điện thoại, giữ một món chừng nửa giây rồi kéo sang bữa khác. Kéo nhầm thì bấm Hoàn tác." },
    ],
    tour: [
      { target: "home-food-list", fallback: "meal-pill", title: "Thử kéo món", body: "Giữ một món cho tới khi nó nổi lên, rồi kéo sang bữa khác." },
    ],
  },
  // cc-68: yesterday can be edited, history is read from the account, offline logging and the sync status. The tour stays on
  // Hôm nay ("Thử ngay" runs there): the arrow that opens yesterday, + Thêm (yesterday has it too), then the save status
  {
    id: "2026-10-19b",
    date: "19/10",
    items: [
      { icon: "home", title: "Quên ghi hôm qua? Ghi bù được rồi", body: "Bấm mũi tên trái để quay về hôm qua, thêm, sửa hay xóa món như bình thường. Từ hôm kia trở về trước thì chỉ xem." },
      { icon: "home", title: "Mất mạng vẫn ghi được", body: "Sóng yếu hay lỡ tắt app cũng không sao. Món đã ghi vẫn nằm trong máy, có mạng là tự gửi lên." },
      { icon: "home", title: "Nhìn góc trên là biết đã lưu chưa", body: "Thấy Đã lưu là yên tâm. Nếu ghi Chưa lưu, bấm vào để gửi lại." },
      { icon: "bars", title: "Điện thoại, máy tính thấy y nhau", body: "Nhật ký các ngày trước giờ lấy từ tài khoản, đổi máy vẫn thấy đủ." },
      { icon: "target", title: "Đăng xuất không lo mất món", body: "Còn món chưa gửi thì app nhắc trước, gửi xong rồi hãy thoát." },
    ],
    tour: [
      { target: "day-prev", fallback: "header-actions", title: "Về hôm qua", body: "Bấm mũi tên này để mở hôm qua." },
      { target: "meal-add", fallback: "nav-add", title: "Ghi bù", body: "Bấm + Thêm như mọi ngày. Bấm vào món để sửa hoặc xóa." },
      { target: "sync-status", fallback: "header-actions", title: "Đã lưu chưa?", body: "Chữ ở đây cho biết món đã lên tài khoản chưa. Bấm vào để xem món đang chờ.", advanceOn: "tap" },
    ],
  },
  // cc-67: simple, fast food logging. The tour runs on Hôm nay: + Thêm, then the Thành phần of a dish (falls back to + Thêm)
  {
    id: "2026-10-19a",
    date: "19/10",
    items: [
      { icon: "select", title: "Tìm món gọn hơn", body: "Gõ khoai là ra khoai, không còn cả chục dòng sống, chín. Muốn đổi sống hay chín thì chọn trong khẩu phần." },
      { icon: "meal", title: "Trái cây chỉ tính phần ăn được", body: "Chuối, bơ, dưa hấu, cá hay gà có xương giờ cân phần ăn được thôi, bỏ vỏ, hạt, xương. Trứng vẫn ghi theo quả." },
      { icon: "select", title: "Phở thêm thịt? Chỉnh được", body: "Mở Thành phần của món Việt để bớt bánh, thêm thịt cho đúng tô bạn ăn. Nhật ký vẫn chỉ một dòng." },
      { icon: "target", title: "Mục tiêu vi chất theo khuyến nghị", body: "Canxi, sắt, vitamin… giờ theo khuyến nghị dinh dưỡng, đúng tuổi và giới tính của bạn. Muối, sắt ngày có kinh, kcal và đa lượng vẫn như cũ." },
    ],
    tour: [
      { target: "meal-add", fallback: "nav-add", title: "Tìm món", body: "Bấm + Thêm rồi gõ tên món. Mỗi món giờ chỉ một dòng." },
      { target: "dish-parts", fallback: "meal-add", title: "Chỉnh tô phở", body: "Ở món Việt, mở Thành phần để đổi gam hoặc thêm bún, thịt." },
    ],
  },
  // cc-53b: the coach's portion model. The tour runs on Hôm nay: + Thêm (or the + of the nav), the food list, a meal
  {
    id: "2026-10-18f",
    date: "18/10",
    items: [
      { icon: "select", title: "Khẩu phần theo gam", body: "Gõ số gam hoặc chọn 100 g, rồi bấm + để nhân lên. 100 g × 3 là 300 g." },
      { icon: "meal", title: "Cân sống hay đã nấu chín", body: "Thịt, cá, cơm, mì, khoai, đậu và yến mạch có nút Cân sống và Đã nấu chín. App tự đổi ra số liệu khớp." },
      { icon: "select", title: "Trứng ghi theo quả", body: "Chọn cỡ ghi trên hộp rồi chọn mấy quả. App tự trừ vỏ." },
      { icon: "home", title: "Khay gọn hơn", body: "Chạm từng món trong khay để chỉnh, rồi thêm cả khay vô bữa một lần." },
      // cc-54: premade Vietnamese dishes show what is inside, and take extras for one meal
      { icon: "meal", title: "Thành phần của món Việt", body: "Mở Thành phần để xem món có gì. Đổi gam hoặc chạm chip để thêm bún, thịt cho riêng bữa đó." },
      // cc-57: an improvement, no tour
      { icon: "home", title: "Chuyển tab mượt hơn", body: "Thanh bên dưới đứng yên khi bạn chạm qua lại giữa các tab. Nút bấm phản hồi liền, kéo bảng xuống không bị giật." },
    ],
    tour: [
      { target: "meal-add", fallback: "nav-add", title: "Ghi theo gam", body: "Chạm + Thêm rồi chọn món. Gõ số gam hoặc chọn 100 g, bấm + để nhân lên." },
      { target: "home-food-list", fallback: "meal-pill", title: "Sống hay chín", body: "Dòng món ghi rõ bạn cân lúc sống hay đã nấu chín. Trứng ghi theo cỡ và số quả." },
      { target: "meal-pill", title: "Khay xem lại", body: "Ở + Thêm, gom nhiều món vô khay. Chạm từng món trong khay để chỉnh rồi thêm một lần." },
      { target: "dish-parts", fallback: "meal-add", title: "Thành phần của món", body: "Món Việt có mục Thành phần. Mở ra xem trong tô có gì, đổi gam hoặc chạm chip để thêm bún, thịt." },
    ],
  },
  // cc-52. The tour runs on Hôm nay, where the Ngày tập controls are not: each step falls back to the Ngày tập pill
  {
    id: "2026-10-18e",
    date: "18/10",
    items: [
      {
        icon: "meal",
        title: "Ngày tập ghi vào nhật ký",
        body: "Đánh dấu một món ở Ngày tập để ghi vào Bữa phụ. Liều theo nhóm Bự/Bé của bạn. Thêm món riêng như nước dừa, cam.",
      },
      // cc-55: an improvement, no tour
      {
        icon: "home",
        title: "Mở và đóng màn hình mượt hơn",
        body: "Thêm món trượt lên trên Hôm nay và trượt xuống khi đóng. Trang chi tiết trượt vào từ bên phải, quay lại thì trượt ra.",
      },
    ],
    tour: [
      { target: "training-size", fallback: "training-pill", title: "Nhóm Bự / Bé", body: "Ở Ngày tập, chạm Bé · đổi hoặc Bự · đổi để chọn liều thấp hay liều cao." },
      { target: "training-checklist", fallback: "training-pill", title: "Đánh dấu để ghi", body: "Đánh dấu một món ở Ngày tập, xem lại khẩu phần rồi chọn Thêm. Món sẽ vào Bữa phụ." },
      { target: "training-add-item", fallback: "training-pill", title: "+ Thêm món", body: "Thêm món riêng như nước dừa, cam vào Trước tập hoặc Trong tập. Món ở lại cho mọi ngày tập." },
    ],
  },
  {
    id: "2026-10-18d",
    date: "18/10",
    // cc-53b: normal foods now go by grams; units stay for supplements, món Việt and cans. The unit tour is retired.
    items: [
      {
        icon: "select",
        title: "Ghi theo lon, viên, phần",
        body: "Red Bull ghi theo lon, thực phẩm bổ sung theo viên, món Việt theo phần. Chọn cỡ rồi chỉnh số lượng.",
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
      { icon: "select", title: "Ghi theo viên", body: "Thực phẩm bổ sung có nút + và − để ghi 2, 3 viên." },
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
      { target: "nav-explore", title: "Thực phẩm bổ sung và Gia vị", body: "Tìm ở Khám phá. Thực phẩm bổ sung ghi theo viên với nút + và −." },
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

const tourParts = (releaseIds: readonly string[], releases: readonly Release[]) =>
  releases
    .filter((r) => releaseIds.includes(r.id))
    .reverse()
    .map((r) => [...(r.tour ?? [])]);

/** Every tour step of these releases, oldest release first, with no cap: what `keep` and a saved tour's `only` count in. */
export function tourSteps(releaseIds: readonly string[], releases: readonly Release[] = RELEASES): ReleaseTourStep[] {
  return tourParts(releaseIds, releases).flat();
}

/**
 * The tour "Thử ngay" runs for these releases: their tours one after another, oldest release first. Steps that fail
 * `keep` (a control not on Hôm nay; `i` is the step's place in tourSteps) go first, then the cap: past MAX_TOUR_STEPS
 * the later steps of the oldest release are dropped first (the newest release is shown whole).
 */
export function joinedTour(
  releaseIds: readonly string[],
  releases: readonly Release[] = RELEASES,
  keep: (step: ReleaseTourStep, i: number) => boolean = () => true
): ReleaseTourStep[] {
  let i = 0;
  const parts = tourParts(releaseIds, releases).map((part) => part.filter((step) => keep(step, i++)));
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
