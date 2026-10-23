/**
 * The course the user was last in, so the library can offer "Học tiếp" for it. Per account, in this browser only: it is a shortcut,
 * the real place in a lesson is the server's progress.
 */
import { currentAccountId } from "./auth-actions";

const key = () => `h1t_course_recent_${currentAccountId() ?? "guest"}`;

export function rememberCourse(id: string): void {
  try {
    localStorage.setItem(key(), id);
  } catch {
    // Storage blocked: the library offers the first course in progress instead
  }
}

export function recentCourse(): string | null {
  try {
    return localStorage.getItem(key());
  } catch {
    return null;
  }
}
