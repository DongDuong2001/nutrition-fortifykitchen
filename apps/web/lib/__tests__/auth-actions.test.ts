import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  currentAccount,
  sendPasswordReset,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  updatePassword,
  validateEmail,
  validateNewPassword,
  validatePasswordConfirm,
  validateRequiredPassword,
} from "../auth-actions";

// Messages are fixed Vietnamese copy (Hao's 13/10 decisions); the tests check the exact text.
const EMAIL_ERROR = "Nhập email hợp lệ, ví dụ ban@email.com";
const PASSWORD_SHORT = "Mật khẩu cần ít nhất 8 ký tự";
const PASSWORD_MIX = "Mật khẩu cần có ít nhất một chữ và một số";

describe("validateEmail", () => {
  it("accepts an address with an @ and a domain", () => {
    expect(validateEmail("ban@email.com")).toBeNull();
  });

  it("ignores spaces around the address", () => {
    expect(validateEmail("  ban@email.com ")).toBeNull();
  });

  it("rejects an empty value and a value without @ or a domain", () => {
    expect(validateEmail("")).toBe(EMAIL_ERROR);
    expect(validateEmail("ban.email.com")).toBe(EMAIL_ERROR);
    expect(validateEmail("ban@email")).toBe(EMAIL_ERROR);
  });
});

describe("validateNewPassword", () => {
  it("accepts 8 or more characters with at least one letter and one digit", () => {
    expect(validateNewPassword("abcdef12")).toBeNull();
    expect(validateNewPassword("Mat khau 2026")).toBeNull();
  });

  it("asks for at least 8 characters", () => {
    expect(validateNewPassword("abc123")).toBe(PASSWORD_SHORT);
    expect(validateNewPassword("")).toBe("Nhập mật khẩu");
  });

  it("asks for at least one letter and one digit", () => {
    expect(validateNewPassword("abcdefgh")).toBe(PASSWORD_MIX);
    expect(validateNewPassword("12345678")).toBe(PASSWORD_MIX);
  });
});

describe("validatePasswordConfirm", () => {
  it("passes when the confirm matches", () => {
    expect(validatePasswordConfirm("abcdef12", "abcdef12")).toBeNull();
  });

  it("asks to retype when empty and reports a mismatch", () => {
    expect(validatePasswordConfirm("abcdef12", "")).toBe("Nhập lại mật khẩu");
    expect(validatePasswordConfirm("abcdef12", "abcdef13")).toBe("Mật khẩu nhập lại chưa khớp");
  });
});

describe("validateRequiredPassword", () => {
  it("only checks that something was typed (sign-in does not re-apply the rules)", () => {
    expect(validateRequiredPassword("x")).toBeNull();
    expect(validateRequiredPassword("")).toBe("Nhập mật khẩu");
  });
});

// The mock keeps its accounts in localStorage. A small in-memory stand-in lets the flows run under node.
function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key: string) => data.get(key) ?? null,
    key: (index: number) => Array.from(data.keys())[index] ?? null,
    removeItem: (key: string) => void data.delete(key),
    setItem: (key: string, value: string) => void data.set(key, String(value)),
  } as Storage;
}

describe("mock account flows (MOCK, no network)", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", memoryStorage());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts as the sample account, which has no password yet", async () => {
    expect(await currentAccount()).toEqual({ email: "ban@email.com", hasPassword: false, providers: ["google"] });
  });

  it("signs up with a password and then signs in with it", async () => {
    expect(await signUpWithPassword("cc18@example.com", "abcdef12")).toEqual({ ok: true });
    await signOut();
    expect(await currentAccount()).toBeNull();
    expect(await signInWithPassword("cc18@example.com", "abcdef12")).toEqual({ ok: true });
    expect(await currentAccount()).toEqual({ email: "cc18@example.com", hasPassword: true, providers: ["password"] });
  });

  it("gives one generic message for a wrong password and for an unknown email", async () => {
    await signUpWithPassword("cc18@example.com", "abcdef12");
    await signOut();
    const generic = { ok: false, error: "Email hoặc mật khẩu không đúng" };
    expect(await signInWithPassword("cc18@example.com", "wrong1234")).toEqual(generic);
    expect(await signInWithPassword("nobody@example.com", "abcdef12")).toEqual(generic);
  });

  it("refuses a second sign-up on the same email", async () => {
    await signUpWithPassword("cc18@example.com", "abcdef12");
    expect(await signUpWithPassword("CC18@example.com", "abcdef12")).toEqual({
      ok: false,
      error: "Email này đã có tài khoản. Hãy đăng nhập.",
    });
  });

  it("sets a first password on the sample account without a current password", async () => {
    expect(await updatePassword("abcdef12")).toEqual({ ok: true });
    expect(await currentAccount()).toEqual({ email: "ban@email.com", hasPassword: true, providers: ["google", "password"] });
  });

  it("changes a password only when the current one is right", async () => {
    await updatePassword("abcdef12");
    expect(await updatePassword("abcdef34", "wrong1234")).toEqual({ ok: false, error: "Mật khẩu hiện tại không đúng" });
    expect(await updatePassword("abcdef34", "abcdef12")).toEqual({ ok: true });
    await signOut();
    expect(await signInWithPassword("ban@email.com", "abcdef34")).toEqual({ ok: true });
  });

  it("applies the password rules to a new password", async () => {
    expect(await updatePassword("short1")).toEqual({ ok: false, error: PASSWORD_SHORT });
  });

  it("accepts a reset email without saying whether the account exists", async () => {
    expect(await sendPasswordReset("nobody@example.com")).toEqual({ ok: true });
    expect(await sendPasswordReset("not-an-email")).toEqual({ ok: false, error: EMAIL_ERROR });
  });

  it("answers with a retry message, not a stuck form, when hashing is unavailable", async () => {
    await signUpWithPassword("cc18@example.com", "abcdef12");
    await signOut();
    vi.stubGlobal("crypto", undefined);
    expect(await signInWithPassword("cc18@example.com", "abcdef12")).toEqual({
      ok: false,
      error: "Chưa xử lý được. Thử lại sau ít phút.",
    });
  });

  it("refuses a password change when nobody is signed in", async () => {
    await signOut();
    expect(await updatePassword("abcdef12")).toEqual({ ok: false, error: "Đăng nhập lại để đổi mật khẩu" });
  });
});
