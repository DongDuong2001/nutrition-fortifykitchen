import { describe, expect, it } from "vitest";
import { englishOn, formatNumberIn, translate } from "@/lib/i18n";
import { vi } from "@/lib/i18n/vi";
import { en } from "@/lib/i18n/en";

/**
 * Vietnamese must not move: every vi value, character for character, as it stood in the components before they read
 * from t() (settings-home-screen.tsx at 3f4e1cd; profile-cards.tsx AppCard, pwa/install-row.tsx and
 * sign-out-confirm.tsx at 72a9385, the branch's base). {x} is a template slot where the component had an
 * expression.
 */
const ORIGINAL_VI: Record<string, string> = {
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
  "settings.app.addToHome": "Thêm vào màn hình chính",
  "settings.app.install": "Cài ứng dụng lên điện thoại",
  "settings.app.terms": "Điều khoản dịch vụ",
  "settings.app.privacy": "Chính sách bảo mật",
  "settings.signOut.title": "Đăng xuất?",
  "settings.signOut.body": "Còn {count} món chưa đồng bộ. Đăng xuất bây giờ sẽ xóa chúng khỏi máy này.",
  "settings.signOut.progress": "Đang đồng bộ… {done}/{total}",
  "settings.signOut.syncing": "Đang đồng bộ…",
  "settings.signOut.failure": "Còn {count} món chưa đồng bộ được: {reason}.",
  "settings.signOut.syncThenLeave": "Đồng bộ rồi đăng xuất",
  "settings.signOut.seeItems": "Xem các món",
  "settings.signOut.leave": "Vẫn đăng xuất (mất {count} món)",
};

describe("i18n foundation", () => {
  it("fills placeholders and leaves unknown ones visible", () => {
    expect(translate("vi", "settings.coach.linked", { name: "Minh", level: 3 })).toBe("Minh · Level 3");
    expect(translate("en", "settings.hero.protein", { range: "120–150 g" })).toBe("protein 120–150 g");
    expect(translate("vi", "settings.hero.protein")).toBe("đạm {range}");
  });

  it("en has every vi key, none empty", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(vi).sort());
    for (const message of Object.values(en)) expect(typeof message === "string" ? message : message.other).not.toBe("");
  });

  it("the flag is off unless the build turns it on, or a demo build has the preview key", () => {
    expect(englishOn(false, false, "1")).toBe(false);
    expect(englishOn(false, true, null)).toBe(false);
    expect(englishOn(false, true, "1")).toBe(true);
    expect(englishOn(true, false, null)).toBe(true);
  });

  it("numbers follow the locale: 1.234,5 in vi, 1,234.5 in en", () => {
    expect(formatNumberIn("vi", 1234.5)).toBe("1.234,5");
    expect(formatNumberIn("en", 1234.5)).toBe("1,234.5");
  });

  it("every vi value is the Vietnamese the components showed before t(), and vi uses no plural forms", () => {
    expect(vi).toEqual(ORIGINAL_VI);
    for (const message of Object.values(vi)) expect(typeof message).toBe("string");
  });

  it("the sign-out sheet renders its original Vietnamese for any count", () => {
    for (const count of [0, 1, 2, 7, 21]) {
      expect(translate("vi", "settings.signOut.body", { count })).toBe(`Còn ${count} món chưa đồng bộ. Đăng xuất bây giờ sẽ xóa chúng khỏi máy này.`);
      expect(translate("vi", "settings.signOut.leave", { count })).toBe(`Vẫn đăng xuất (mất ${count} món)`);
      expect(translate("vi", "settings.signOut.failure", { count, reason: "mạng yếu" })).toBe(`Còn ${count} món chưa đồng bộ được: mạng yếu.`);
    }
    expect(translate("vi", "settings.signOut.progress", { done: 3, total: 8 })).toBe("Đang đồng bộ… 3/8");
  });

  it("English counts in the singular and the plural", () => {
    expect(translate("en", "settings.signOut.body", { count: 1 })).toBe("1 item hasn't synced yet. Signing out now will remove it from this device.");
    expect(translate("en", "settings.signOut.body", { count: 3 })).toBe("3 items haven't synced yet. Signing out now will remove them from this device.");
    expect(translate("en", "settings.signOut.leave", { count: 1 })).toBe("Sign out anyway (lose 1 item)");
    expect(translate("en", "settings.signOut.leave", { count: 0 })).toBe("Sign out anyway (lose 0 items)");
    expect(translate("en", "settings.signOut.failure", { count: 2, reason: "offline" })).toBe("2 items couldn't sync: offline.");
  });
});
