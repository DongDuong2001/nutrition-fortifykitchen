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
  // overnight 22→23/10 (session B): one entry for the night's PRs, each adds its item (the entry is shared: whichever merges second keeps
  // both). feedback-mailto: Góp ý & hỗ trợ in Cài đặt, no tour (Hao: "No tour step").
  {
    id: "2026-10-23a",
    date: "23/10",
    items: [
      {
        icon: "home",
        title: "Góp ý & báo lỗi ngay trong app",
        body: "Cài đặt có mục Góp ý & hỗ trợ. Báo lỗi, báo sai số liệu hay yêu cầu thêm món, app soạn sẵn email cho bạn.",
      },
      { icon: "home", title: "Hôm nay dễ đọc hơn", body: "Số to hơn, chữ đậm hơn. Chất xơ có dòng riêng ở đầu cột vi chất, ngay dưới số vi chất đạt." },
      // feat/documents: Tài liệu in Cài đặt › Hỗ trợ. No tour, as this entry has none (its controls are text buttons, data-tour documents-edit and documents-upload are there for one)
      {
        icon: "home",
        title: "Tài liệu của app ngay trong Cài đặt",
        body: "Cài đặt › Tài liệu có các hướng dẫn và quy tắc HLV viết cho bạn. HLV gửi mã truy cập, nhập mã là đọc được ngay trong app.",
      },
      { icon: "home", title: "Dễ dùng hơn trên máy tính", body: "Rê chuột lên món là thấy sáng lên, các hàng Khám phá có nút xem tiếp, nút Thêm luôn hiện trong hộp thêm món, Esc thoát chọn nhiều món và thanh bên luôn ở yên khi cuộn." },
      { icon: "target", title: "Tự chọn thời gian tập", body: "Ngày tập có thêm nút Tùy chỉnh để chọn từ 30 đến 480 phút. Muối, tinh bột nhanh và natri tính theo số phút bạn chọn." },
      {
        icon: "meal",
        title: "Tự tạo ngày ăn mẫu",
        body: "Ở Khám phá › Ngày ăn mẫu, chạm Tạo ngày ăn mẫu rồi thêm món vào từng bữa. Không cần ghi vào nhật ký trước.",
      },
      { icon: "bars", title: "Kcal từ đạm, tinh bột, béo", body: "Chạm Tinh bột, Đạm hoặc Chất béo ở thẻ đen để xem số kcal từ nó và phần của nó trong tổng kcal. Chạm lần nữa để quay lại." },
      { icon: "select", title: "Món ăn có biểu tượng cho dễ tìm", body: "Mỗi món trong danh sách thêm món, ở Khám phá và trang món có biểu tượng, nhìn là nhận ra ngay." },
      { icon: "bars", title: "Thêm danh sách Giàu …", body: "Khám phá có thêm Giàu Zinc, Selenium, Phosphorus, Vitamin A, B6, B12, Folate, E và K, xếp theo lượng trong 100 g hoặc mỗi khẩu phần." },
      // feat/level-ui: the header badge and the celebration. No tour, as this entry has none (the badge is a labelled button that opens Level là gì?)
      {
        icon: "home",
        title: "Huy hiệu Level mới và màn chúc mừng khi lên Level",
        body: "Huy hiệu Level của bạn nằm ngay cạnh logo ở Hôm nay, chạm để xem Level là gì. Khi HLV nâng Level, app chúc mừng bạn và Hôm nay hiện thêm vi chất ngay.",
      },
      // feat/hero-sources (Job A, overnight 23→24/10)
      { icon: "bars", title: "Giữ Tinh bột, Đạm, Chất béo hoặc Chất xơ để xem món nào góp vào", body: "Giữ ngón tay trên một chất ở thẻ đen (hoặc dòng Chất xơ) là thấy những món nào góp vào, kèm phần trăm mục tiêu. Đang xem kcal của một chất thì chạm Món nào? cũng mở được." },
    ],
    tour: [{ target: "hero-macro", fallback: "home-hero", title: "Giữ để xem món nào góp vào", body: "Giữ Đạm, Tinh bột hoặc Chất béo thêm chút xíu là thấy các món góp vào. Chạm nhẹ một cái thì chỉ đổi sang kcal." }],
  },
  // Overnight 22→23/10 (the Chrome audit of main f13f64c), on top of 22b. PR 3, units and counts; PR 1 (one sheet in the + flow) adds its item
  // to this same entry, whichever merges second keeps both. No tour: no new control, and the one new hint, Xem riêng một bữa, is a tip
  // (lib/tips meal-focus) where Hôm nay's footnote used to say it.
  {
    id: "2026-10-22c",
    date: "22/10",
    items: [
      { icon: "meal", title: "Món ghi theo gam", body: "Danh sách món hiện kcal theo gam, không còn củ, bìa hay nắm. Trứng và chanh vẫn ghi theo quả." },
      { icon: "bars", title: "Tổng quan đếm vi chất như Hôm nay", body: "Số vi chất đạt ở Tổng quan tính theo các chất của Level bạn, giống Hôm nay. Đủ 22 vi chất vẫn xem được ngay bên dưới." },
      { icon: "bars", title: "Số trung bình ghi rõ", body: "Kcal và Đạm ở Tổng quan ghi TB/ngày, là trung bình mỗi ngày trong 7 hoặc 30 ngày." },
    ],
  },
  // backend-sync-1022 (Hao 22/10): the macro split and Ngày ăn mẫu are stored with the account (migrations 000015/000016), on top of
  // 22a, which is live. One item, as the brief asks, and no tour or tip: no new control, the same screens now follow the account.
  {
    id: "2026-10-22b",
    date: "22/10",
    items: [
      {
        icon: "target",
        title: "Chia macro và Ngày ăn mẫu giờ đồng bộ giữa các máy",
        body: "Cách chia đa lượng và các ngày ăn mẫu bạn đã lưu giờ đi theo tài khoản. Mở app trên máy khác là thấy ngay.",
      },
    ],
  },
  // feat/v3-redesign + feat/compare-in-add + feat/ngay-mau + feat/rename-labels (Hao 22/10): one entry for the stack, on top of 21c, which is live. The
  // tour points at Hôm nay controls: a meal's + (falls back to the + of the bar), the Ngày tập pill (falls back to the date), the Khám phá tab,
  // So sánh in the portion panel, the ⋯ of the day (where Lưu ngày này thành mẫu is; the hero when the day has no food yet) and the "Chép ngày ăn mẫu"
  // pill of an empty day (the meals' headers when the day already has food).
  // custom-food-nutrients (Hao 22/10): Tự nhập takes every nutrient on a label. The form is not on Hôm nay, so its step points at
  // + Thêm vi chất khác where it is on screen and at the + of the bar on Hôm nay (fallback).
  // share-spotlight (Hao 22/10): Hôm nay's share button says Chia sẻ; its step points at it (always in Hôm nay's header)
  {
    id: "2026-10-22a",
    date: "22/10",
    items: [
      { icon: "home", title: "Giao diện mới: sáng hơn, nhiều màu hơn", body: "Nền xám nhạt với thẻ trắng, chữ to rõ hơn. Mỗi vi chất và mỗi nhóm món có màu riêng, thanh dưới nổi lên và trong mờ." },
      { icon: "meal", title: "Nút + ở từng bữa", body: "Mỗi bữa ở Hôm nay có nút + màu xanh ngay dòng tên bữa, chạm là thêm món vào đúng bữa đó." },
      { icon: "bars", title: "Nhóm món có biểu tượng màu", body: "Khám phá có lưới Nhóm món với biểu tượng màu. Khi thêm món, mỗi chip nhóm cũng có biểu tượng, món Tinh bột, Đạm, Chất béo hiện luôn lượng của nhóm đó." },
      { icon: "home", title: "Mẹo không làm phiền", body: "Mỗi ngày hiện nhiều nhất một mẹo, và bước hướng dẫn nào cũng có nút Bỏ qua." },
      { icon: "bars", title: "So sánh món ngay khi đang thêm", body: "Chọn một món để thêm, chạm So sánh ngay dưới số kcal rồi chọn thêm món để xem cạnh nhau." },
      { icon: "meal", title: "Ngày ăn mẫu", body: "Lưu cả ngày thành mẫu ở nút ⋯ của Hôm nay. Ngày còn trống thì chạm Chép ngày ăn mẫu để chép lại bằng một chạm, Hoàn tác được." },
      { icon: "meal", title: "Đổi tên cho dễ hiểu", body: "Món ăn của tôi, Bữa ăn đã lưu, Ngày ăn mẫu." },
      {
        icon: "meal",
        title: "Nhập đủ vi chất trên nhãn",
        body: "Nhập đủ chất xơ, đường và mọi vi chất trên nhãn khi tự nhập món, theo đúng thứ tự trên nhãn. Chạm + Thêm vi chất khác để thêm vitamin và khoáng chất.",
      },
      {
        icon: "share",
        title: "Chia sẻ ngày ăn bằng một chạm",
        body: "Nút Chia sẻ ở đầu Hôm nay tạo ảnh tóm tắt ngày ăn, gửi ngay cho bạn bè hoặc HLV.",
      },
    ],
    tour: [
      { target: "meal-add", fallback: "nav-add", title: "Thêm vào từng bữa", body: "Mỗi bữa có nút + màu xanh ở dòng tên bữa. Chạm để thêm món vào đúng bữa đó." },
      { target: "training-pill", fallback: "day-date", title: "Ngày tập", body: "Nút Ngày tập nằm cạnh ngày, bên phải. Chạm để đổi số phút tập hôm nay." },
      { target: "nav-explore", title: "Nhóm món có màu", body: "Ở Khám phá, mỗi nhóm món có biểu tượng màu riêng. Chạm một nhóm để xem các món trong nhóm." },
      { target: "portion-compare", fallback: "portion-detail", title: "So sánh món", body: "Đang chọn khẩu phần, chạm So sánh để đặt món này cạnh món khác." },
      { target: "day-menu", fallback: "home-hero", title: "Lưu cả ngày thành mẫu", body: "Mở nút ⋯ trên thẻ kcal rồi chọn Lưu ngày này thành mẫu. Cần ngày đã có món." },
      { target: "day-template-pill", fallback: "meal-pill", title: "Chép ngày ăn mẫu", body: "Ngày còn trống thì chạm Chép ngày ăn mẫu ở đầu thẻ bữa ăn, chọn một mẫu hoặc Hôm qua." },
      { target: "add-nutrient", fallback: "nav-add", title: "Nhập đủ vi chất", body: "Tạo món mới, chọn Tự nhập rồi chạm + Thêm vi chất khác để nhập mọi chất trên nhãn." },
      { target: "home-share", title: "Chia sẻ ngày ăn", body: "Chạm Chia sẻ để tạo ảnh tóm tắt ngày ăn và gửi ngay." },
    ],
  },
  // swap-ingredients (Hao 21/10, in 21c because 21c is not live yet: no release 21d): in Thành phần a part with alternatives has "Đổi nguyên liệu"
  // (Bánh khoai nướng: sữa chua Hy Lạp or thường, bột hạnh nhân or bột mì, hạnh nhân lát or hạt bí, siro cây phong or mật ong). The select carries
  // its own label in plain sight, so no tip; its tour step points at Thành phần (the + Thêm button when no dish is open on Hôm nay).
  // fluid-add + polish-1020 + rich-tabs (Hao 21/10): the add sheet slides over the screen you are on, Hoàn tác after every add, a lighter add
  // list, the update notice above the bottom bar, and the "Giàu …" lists in two tabs, and (feat/minh-hao-tab) Đồ ăn của Minh Hào. One entry
  // for all of them. No tip, on purpose: every control here is a labelled button or a tab in plain sight (+, ✕, Xem thêm, Hoàn tác,
  // Thực phẩm / Thực phẩm bổ sung, Đồ ăn của Minh Hào). feat/glide adds "Chuyển nhóm, chuyển tab mượt hơn" (no control to learn, so no tour step). The first tour step is the Khám phá carousel, which is not on Hôm nay: it points at
  // the Khám phá tab there (fallback) and at the carousel itself wherever it is on screen
  {
    id: "2026-10-21c",
    date: "21/10",
    items: [
      { icon: "meal", title: "Thêm món mượt hơn", body: "Bấm dấu + thì bảng thêm món trượt lên ngay trên màn hình bạn đang xem. Thêm xong, bảng trượt xuống và món mới hiện ở Hôm nay." },
      { icon: "meal", title: "Thêm nhầm thì Hoàn tác", body: "Thêm xong bấm Hoàn tác trong vài giây là bỏ đúng những món vừa thêm, dù là một món hay cả khay." },
      { icon: "home", title: "Danh sách món gọn hơn", body: "Mỗi nhóm hiện vài món đầu, bấm Xem thêm để xem tiếp. Bảng chọn khẩu phần có nút ✕ để đóng." },
      { icon: "home", title: "Thông báo có bản mới không che món", body: "Khi có bản mới, thông báo nằm ngay trên thanh dưới và tự tắt sau vài giây. App tự cập nhật khi bạn thoát ra, không làm mất món đang chọn." },
      { icon: "bars", title: "Danh sách Giàu … có hai thẻ", body: "Danh sách Giàu … giờ tách riêng thực phẩm và thực phẩm bổ sung thành hai thẻ trong Khám phá, nên viên uống không còn đứng đầu danh sách món ăn." },
      { icon: "meal", title: "Tab Đồ ăn của Minh Hào", body: "Có tab Đồ ăn của Minh Hào để chọn nhanh các món của Fortify Kitchen. Khi thêm món, chip này nằm ngay sau Tất cả, và ở Khám phá có hàng thẻ riêng." },
      { icon: "home", title: "Chuyển nhóm, chuyển tab mượt hơn", body: "Đổi nhóm món, đổi thẻ hay chuyển tab ở thanh dưới thì nội dung trượt vào nhẹ nhàng, không còn đổi cái bụp. Mở danh sách Giàu … chỉ trượt một lần." },
      { icon: "meal", title: "Đổi nguyên liệu trong món", body: "Món có Thành phần cho đổi nguyên liệu, như sữa chua thường hay Hy Lạp, hạnh nhân hay hạt bí. Chọn ở dòng Đổi nguyên liệu, số gam giữ nguyên, và món ghi lại đúng theo bạn chọn." },
    ],
    tour: [
      { target: "explore-minh-hao", fallback: "nav-explore", title: "Đồ ăn của Minh Hào", body: "Ở Khám phá có hàng thẻ Đồ ăn của Minh Hào. Khi thêm món, chạm chip cùng tên để chọn nhanh." },
      { target: "dish-parts", fallback: "meal-add", title: "Đổi nguyên liệu", body: "Mở Thành phần của món. Nguyên liệu nào đổi được thì có dòng Đổi nguyên liệu, chọn loại bạn dùng." },
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
