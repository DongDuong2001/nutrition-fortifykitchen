import { describe, expect, it } from "vitest";
import { FEEDBACK_BODY_MAX, FEEDBACK_EMAIL, FEEDBACK_TYPES, buildFeedback, deviceName, feedbackTime, gmailUrl, mailtoUrl, type FeedbackContext } from "../feedback";

const AT = new Date("2026-10-22T18:30:00Z"); // 23/10 01:30 in Vietnam
const CONTEXT: FeedbackContext = { screen: "Món ăn", version: "2026-10-23.1", device: "Android · Chrome", accountCode: "3f9a21c0", at: AT };

describe("buildFeedback", () => {
  it("the five kinds, in the sheet's order and words", () => {
    expect(FEEDBACK_TYPES.map((t) => [t.title, t.description])).toEqual([
      ["Báo lỗi", "App chạy sai, bị đứng hoặc hiện lạ"],
      ["Sai số liệu", "Kcal, đạm, vi chất của một món chưa đúng"],
      ["Yêu cầu thêm món", "Món bạn hay ăn mà chưa có trong app"],
      ["Góp ý", "Ý tưởng để app dễ dùng hơn"],
      ["Khiếu nại", "Điều gì đó làm bạn không hài lòng"],
    ]);
  });

  it("subject: [H1T MICRO] <type>, with the food name or the search words after a colon", () => {
    expect(buildFeedback({ type: "bug", context: { ...CONTEXT, screen: "Cài đặt" } }).subject).toBe("[H1T MICRO] Báo lỗi");
    expect(buildFeedback({ type: "data", context: { ...CONTEXT, food: { name: "Khoai lang", id: "food-khoai-lang" } } }).subject).toBe("[H1T MICRO] Sai số liệu: Khoai lang");
    expect(buildFeedback({ type: "food", context: { ...CONTEXT, screen: "Thêm món", search: "  bánh đúc   nóng " } }).subject).toBe("[H1T MICRO] Yêu cầu thêm món: bánh đúc nóng");
  });

  it("body: the ask, two blank lines, then the support block (version, screen, food + id, device, account code, time)", () => {
    const { body } = buildFeedback({ type: "data", context: { ...CONTEXT, food: { name: "Khoai lang", id: "food-khoai-lang" } } });
    expect(body).toBe(
      [
        "Bạn mô tả giúp mình nhé:",
        "",
        "",
        "— Thông tin để hỗ trợ (đừng xoá) —",
        "Phiên bản 2026-10-23.1 · Màn: Món ăn",
        "Món: Khoai lang (id food-khoai-lang)",
        "Thiết bị: Android · Chrome · Mã TK: 3f9a21c0",
        "Lúc: 23/10/2026 01:30",
      ].join("\n")
    );
    const searched = buildFeedback({ type: "food", context: { ...CONTEXT, search: "bánh đúc" } }).body;
    expect(searched).toContain("Tìm: bánh đúc");
    expect(buildFeedback({ type: "idea", context: { ...CONTEXT, accountCode: "" } }).body).toContain("Thiết bị: Android · Chrome\n");
  });

  it("never carries the email address, weight, diary or any health number", () => {
    const { subject, body } = buildFeedback({ type: "complaint", context: { ...CONTEXT, food: { name: "Phở bò", id: "f1" } } });
    const all = subject + body;
    expect(all).not.toMatch(/@/);
    expect(all).not.toMatch(/\bkg\b|kcal|cân nặng|nhật ký/i);
    // The context type has no field for them either: only these keys
    expect(Object.keys(CONTEXT).sort()).toEqual(["accountCode", "at", "device", "screen", "version"]);
  });

  it("stays under 1.800 characters, however long the pasted words", () => {
    const long = "rất dài ".repeat(2000);
    const { subject, body } = buildFeedback({ type: "food", context: { ...CONTEXT, search: long, food: { name: long, id: long } } });
    expect(body.length).toBeLessThanOrEqual(FEEDBACK_BODY_MAX);
    expect(subject.length).toBeLessThan(160);
    expect(body).toContain("Lúc: 23/10/2026 01:30");
  });

  it("the time is Vietnam's, whatever the device's zone", () => {
    expect(feedbackTime(new Date("2026-12-31T17:05:00Z"))).toBe("01/01/2027 00:05");
  });
});

describe("the links", () => {
  const mail = buildFeedback({ type: "data", context: { ...CONTEXT, food: { name: "Cà phê sữa đá & bánh mì", id: "x?y" } } });

  it("Gmail: compose with to, su and body, every part encoded (Vietnamese marks, &, ?, new lines)", () => {
    const url = new URL(gmailUrl(mail));
    expect(url.origin + url.pathname).toBe("https://mail.google.com/mail/");
    expect(url.searchParams.get("view")).toBe("cm");
    expect(url.searchParams.get("fs")).toBe("1");
    expect(url.searchParams.get("to")).toBe(FEEDBACK_EMAIL);
    expect(url.searchParams.get("su")).toBe(mail.subject);
    expect(url.searchParams.get("body")).toBe(mail.body);
    expect(gmailUrl(mail)).toContain("%0A");
    expect(gmailUrl(mail)).not.toMatch(/[ \n]/);
  });

  it("mailto: %20 for spaces (never +), the subject and body round-trip", () => {
    const url = mailtoUrl(mail);
    expect(url.startsWith(`mailto:${FEEDBACK_EMAIL}?subject=`)).toBe(true);
    expect(url).not.toContain("+");
    const query = url.slice(url.indexOf("?") + 1).split("&").map((p) => p.split("="));
    expect(decodeURIComponent(query[0][1])).toBe(mail.subject);
    expect(decodeURIComponent(query[1][1])).toBe(mail.body);
    expect(query).toHaveLength(2);
  });
});

describe("deviceName", () => {
  it("names the platform and the browser", () => {
    expect(deviceName("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1")).toBe("iPhone · Safari");
    expect(deviceName("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1")).toBe("iPhone · Chrome");
    expect(deviceName("Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0 Mobile Safari/537.36")).toBe("Android · Samsung Internet");
    expect(deviceName("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36")).toBe("Android · Chrome");
    expect(deviceName("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 Edg/126.0")).toBe("Windows · Edge");
    expect(deviceName("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5; rv:128.0) Gecko/20100101 Firefox/128.0")).toBe("Mac · Firefox");
    // iPadOS asks for desktop sites with a Mac user agent; its touch screen gives it away
    const ipad = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";
    expect(deviceName(ipad, 5)).toBe("iPad · Safari");
    expect(deviceName(ipad, 0)).toBe("Mac · Safari");
  });
});
