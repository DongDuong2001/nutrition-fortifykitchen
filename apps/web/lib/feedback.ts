/**
 * Góp ý & hỗ trợ (feedback-mailto, Hao 22/10): the app writes the email, the user sends it from Gmail or their Mail app.
 * Front end only. The body carries what helps to answer (app version, screen, the food or the search words, the device, a
 * short account code, the time) and never the email address, weight, diary or any health data.
 */

/** Where every feedback email goes. One constant, so it is easy to change. */
export const FEEDBACK_EMAIL = "kermythemenace@gmail.com";

export type FeedbackType = "bug" | "data" | "food" | "idea" | "complaint";

export interface FeedbackTypeInfo {
  id: FeedbackType;
  title: string;
  description: string;
}

/** The five kinds, in the order of the type sheet (board 2). */
export const FEEDBACK_TYPES: readonly FeedbackTypeInfo[] = [
  { id: "bug", title: "Báo lỗi", description: "App chạy sai, bị đứng hoặc hiện lạ" },
  { id: "data", title: "Sai số liệu", description: "Kcal, đạm, vi chất của một món chưa đúng" },
  { id: "food", title: "Yêu cầu thêm món", description: "Món bạn hay ăn mà chưa có trong app" },
  { id: "idea", title: "Góp ý", description: "Ý tưởng để app dễ dùng hơn" },
  { id: "complaint", title: "Khiếu nại", description: "Điều gì đó làm bạn không hài lòng" },
];

export const feedbackTypeInfo = (type: FeedbackType): FeedbackTypeInfo => FEEDBACK_TYPES.find((t) => t.id === type)!;

/** Where the email was started from, and what that screen knew. */
export interface FeedbackContext {
  /** The screen in the user's words: "Cài đặt", "Món ăn", "Thêm món" */
  screen: string;
  food?: { name: string; id: string };
  /** The search words of an empty search */
  search?: string;
  /** sw.js VERSION (NEXT_PUBLIC_APP_VERSION) */
  version: string;
  /** "iPhone · Safari", "Android · Chrome" */
  device: string;
  /** The first 8 characters of the account's user id, or "" when nobody is signed in */
  accountCode: string;
  at: Date;
}

/** The body stays under this many characters, so every mail app opens it whole. */
export const FEEDBACK_BODY_MAX = 1800;
// A food name or the search words longer than this are cut (a pasted paragraph must not crowd out the rest)
const FIELD_MAX = 120;

const clip = (text: string, max: number) => {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

const pad = (n: number) => String(n).padStart(2, "0");
/** 23/10/2026 01:30 in Vietnam time, whatever the device's zone. */
export function feedbackTime(at: Date): string {
  const vn = new Date(at.getTime() + 7 * 3600_000);
  return `${pad(vn.getUTCDate())}/${pad(vn.getUTCMonth() + 1)}/${vn.getUTCFullYear()} ${pad(vn.getUTCHours())}:${pad(vn.getUTCMinutes())}`;
}

export function buildFeedback({ type, context }: { type: FeedbackType; context: FeedbackContext }): { subject: string; body: string } {
  const food = context.food ? { name: clip(context.food.name, FIELD_MAX), id: clip(context.food.id, 60) } : null;
  const search = context.search ? clip(context.search, FIELD_MAX) : "";
  const about = food?.name || search;
  const subject = `[H1T MICRO] ${feedbackTypeInfo(type).title}${about ? `: ${about}` : ""}`;

  const info = [
    "— Thông tin để hỗ trợ (đừng xoá) —",
    `Phiên bản ${context.version} · Màn: ${context.screen}`,
    food ? `Món: ${food.name} (id ${food.id})` : search ? `Tìm: ${search}` : null,
    `Thiết bị: ${context.device}${context.accountCode ? ` · Mã TK: ${context.accountCode}` : ""}`,
    `Lúc: ${feedbackTime(context.at)}`,
  ].filter(Boolean);
  const body = `Bạn mô tả giúp mình nhé:\n\n\n${info.join("\n")}`;
  return { subject, body: body.length > FEEDBACK_BODY_MAX ? body.slice(0, FEEDBACK_BODY_MAX) : body };
}

/** Gmail's compose window with everything filled in (opens the Gmail app on a phone that has it). */
export function gmailUrl({ subject, body }: { subject: string; body: string }): string {
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(FEEDBACK_EMAIL)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** The device's own Mail app. encodeURIComponent, not URLSearchParams: a mail app reads "+" as a plus, not a space. */
export function mailtoUrl({ subject, body }: { subject: string; body: string }): string {
  return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * "iPhone · Safari", "Android · Chrome", "Mac · Chrome": the platform and the browser from a user agent. iPadOS sends a Mac user
 * agent: a "Mac" with a touch screen (`touchPoints` > 1) is an iPad.
 */
export function deviceName(ua: string, touchPoints = 0): string {
  const os = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Macintosh|Mac OS X/.test(ua)
          ? "Mac"
          : /Windows/.test(ua)
            ? "Windows"
            : /Linux/.test(ua)
              ? "Linux"
              : "Khác";
  const browser = /SamsungBrowser/.test(ua)
    ? "Samsung Internet"
    : /Edg\//.test(ua)
      ? "Edge"
      : /CriOS|Chrome\//.test(ua)
        ? "Chrome"
        : /FxiOS|Firefox\//.test(ua)
          ? "Firefox"
          : /Safari\//.test(ua)
            ? "Safari"
            : "trình duyệt khác";
  return `${os} · ${browser}`;
}

/** The first 8 characters of the signed-in account's user id, from the local session (no network). "" otherwise. */
export async function accountCode(): Promise<string> {
  try {
    const { isLiveMode } = await import("./api-mode");
    if (!isLiveMode()) return "demo";
    const { createClient } = await import("./supabase-client");
    const { data } = await createClient().auth.getSession();
    return data.session?.user.id.slice(0, 8) ?? "";
  } catch {
    return "";
  }
}

// "Mới" on the Cài đặt row until the sheet has been opened once
const SEEN_KEY = "h1t_feedback_seen_v1";
export function feedbackSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true;
  }
}
export function markFeedbackSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Private mode: the badge just stays
  }
}

/** What a shortcut opens: the type sheet (no `type`) or straight to Gửi qua… with the type and what the screen knew. */
export interface FeedbackRequest {
  type?: FeedbackType;
  screen: string;
  food?: { name: string; id: string };
  search?: string;
  /** Opened over another sheet (the add sheet): the lighter scrim */
  stacked?: boolean;
}

// One sheet for the app (FeedbackHost in the (app) layout); the shortcuts only say what to open
let request: FeedbackRequest | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
export function openFeedback(next: FeedbackRequest): void {
  request = next;
  emit();
}
export function closeFeedback(): void {
  request = null;
  emit();
}
export const currentFeedback = (): FeedbackRequest | null => request;
export function subscribeFeedback(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
