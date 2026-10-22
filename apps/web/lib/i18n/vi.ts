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
} satisfies Record<string, Message>;

export type MessageKey = keyof typeof vi;
