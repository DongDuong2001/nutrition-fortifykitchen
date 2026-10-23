import { describe, expect, it } from "vitest";
import { englishOn, translate } from "@/lib/i18n";
import { vi } from "@/lib/i18n/vi";
import { en } from "@/lib/i18n/en";

/**
 * Vietnamese must not move: every vi value of the proof area, character for character, as it stands in the components
 * on main 650687b before they read from t() (settings-home-screen.tsx, profile-cards.tsx AppCard, pwa/install-row.tsx,
 * sign-out-confirm.tsx, and the Hỗ trợ card from #62). {x} is a template slot where the component had an expression.
 * Keys added for later areas are not pinned here.
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
  "settings.support": "Hỗ trợ",
  "settings.support.feedback": "Góp ý & hỗ trợ",
  "settings.support.feedback.hint": "Báo lỗi, sai số liệu, yêu cầu thêm món",
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

  it("every en form keeps the vi message's {slots}", () => {
    const slots = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const [key, message] of Object.entries(en)) {
      const want = slots(vi[key as keyof typeof vi] as string);
      for (const form of typeof message === "string" ? [message] : Object.values(message)) expect(slots(form), key).toEqual(want);
    }
  });

  it("every vi value is the Vietnamese the components showed before t(), and vi uses no plural forms", () => {
    for (const [key, text] of Object.entries(ORIGINAL_VI)) expect(vi[key as keyof typeof vi], key).toBe(text);
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
