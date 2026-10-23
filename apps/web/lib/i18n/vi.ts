/**
 * Vietnamese, the source: every key the app translates, in the words the app shows today. A plural message is
 * { one?, other } (Vietnamese has no plural, so vi uses other alone). {name} placeholders are filled by t().
 * Grouped by area with a prefix; the Cài đặt tab is the first area moved here (job 15's proof).
 */
export type Message = string | { one?: string; other: string };

export const vi = {
  // Cài đặt (components/settings/settings-home-screen.tsx)
  "settings.title": "Cài đặt",
  "settings.hero.targets": "Mục tiêu mỗi ngày",
  "settings.hero.protein": "đạm {range}",
  "settings.yours": "Của bạn",
  "settings.targets": "Mục tiêu mỗi ngày",
  "settings.coach": "Huấn luyện viên",
  "settings.coach.linked": "{name} · Level {level}",
  "settings.coach.none": "Nhập mã để HLV theo dõi bạn",
  "settings.clients": "Học viên",
  "settings.clients.hint": "Level và nhật ký của học viên",
  "settings.account": "Tài khoản",
  "settings.account.signedOut": "Chưa đăng nhập",
  "settings.pro.text": "Xem các gói và quyền lợi của tài khoản",
  "settings.pro.cta": "Xem gói",
  "settings.danger": "Vùng nguy hiểm",
  "settings.delete": "Xóa tài khoản",
  "settings.delete.hint": "Có bước xác nhận trước khi xóa",

  // Cài đặt › Ứng dụng (components/settings/profile-cards.tsx AppCard, components/pwa/install-row.tsx)
  "settings.app": "Ứng dụng",
  "settings.app.replay": "Xem lại hướng dẫn",
  "settings.app.replay.hint": "Ghi bữa ăn đầu tiên · 1 phút",
  "settings.app.new": "Mới",
  "settings.app.whatsNew": "Có gì mới",
  "settings.app.tips": "Mẹo trên từng màn hình",
  "settings.app.tips.hint": "Bật lại để xem mẹo lần đầu",
  "settings.app.haptics": "Rung khi chạm",
  "settings.app.haptics.hint": "Rung nhẹ khi lưu, xóa hay hoàn tác",
  "settings.app.language": "Ngôn ngữ",
  "settings.app.language.vi": "Tiếng Việt",
  "settings.app.language.en": "English",
  "settings.app.appearance": "Giao diện",
  "settings.app.reminders": "Nhắc nhở",
  "settings.app.reminders.on": "Đã bật",
  "settings.app.reminders.off": "Đã tắt",
  "settings.app.dataSources": "Nguồn dữ liệu",
  // Hỗ trợ card (feedback-mailto, #62): Góp ý & hỗ trợ, then Nguồn dữ liệu (settings.app.dataSources)
  "settings.support": "Hỗ trợ",
  "settings.support.feedback": "Góp ý & hỗ trợ",
  "settings.support.feedback.hint": "Báo lỗi, sai số liệu, yêu cầu thêm món",
  "settings.support.documents": "Tài liệu",
  "settings.support.documents.hint": "Quy tắc và tài liệu của app",
  "settings.app.addToHome": "Thêm vào màn hình chính",
  "settings.app.install": "Cài ứng dụng lên điện thoại",
  "settings.app.terms": "Điều khoản dịch vụ",
  "settings.app.privacy": "Chính sách bảo mật",

  // Đăng xuất with writes still waiting (components/settings/sign-out-confirm.tsx)
  "settings.signOut.title": "Đăng xuất?",
  "settings.signOut.body": "Còn {count} món chưa đồng bộ. Đăng xuất bây giờ sẽ xóa chúng khỏi máy này.",
  "settings.signOut.progress": "Đang đồng bộ… {done}/{total}",
  "settings.signOut.syncing": "Đang đồng bộ…",
  "settings.signOut.failure": "Còn {count} món chưa đồng bộ được: {reason}.",
  "settings.signOut.syncThenLeave": "Đồng bộ rồi đăng xuất",
  "settings.signOut.seeItems": "Xem các món",
  "settings.signOut.leave": "Vẫn đăng xuất (mất {count} món)",
} satisfies Record<string, Message>;

export type MessageKey = keyof typeof vi;
