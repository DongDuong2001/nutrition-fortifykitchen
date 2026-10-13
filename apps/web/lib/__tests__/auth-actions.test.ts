import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  SIGN_IN_FAILED,
  currentAccount,
  currentAccountId,
  requestMagicLink,
  sendPasswordReset,
  signInSampleAccount,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  updatePassword,
  validateEmail,
  validateNewPassword,
  validatePasswordConfirm,
  validateRequiredPassword,
} from "../auth-actions";

// Demo mode decides whether the sample account exists. The flows below run in demo mode unless a test says otherwise.
const demo = vi.hoisted(() => ({ on: true }));
vi.mock("../demo", () => ({ isDemo: () => demo.on }));

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
    demo.on = true;
    vi.stubGlobal("localStorage", memoryStorage());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts as the sample account, which has no password yet", async () => {
    expect(await currentAccount()).toEqual({ email: "ban@email.com", hasPassword: false, providers: ["google"] });
  });

  it("starts with nobody signed in outside demo mode, and the sample account does not sign in", async () => {
    demo.on = false;
    expect(await currentAccount()).toBeNull();
    expect(await signInWithPassword("ban@email.com", "abcdef12")).toEqual({ ok: false, error: SIGN_IN_FAILED });
  });

  it("signs up on an empty store outside demo mode", async () => {
    demo.on = false;
    expect(await signUpWithPassword("cc19@example.com", "abcdef12")).toEqual({ ok: true });
    expect(await currentAccount()).toEqual({ email: "cc19@example.com", hasPassword: true, providers: ["password"] });
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

  it("currentAccountId follows the signed-in account and is null after Đăng xuất", async () => {
    expect(currentAccountId()).toBe("ban@email.com");
    await signUpWithPassword("B@Example.com", "abcdef12");
    expect(currentAccountId()).toBe("b@example.com");
    await signOut();
    expect(currentAccountId()).toBeNull();
    expect(await signInWithPassword("b@example.com", "abcdef12")).toEqual({ ok: true });
    expect(currentAccountId()).toBe("b@example.com");
  });

  it("Google sign-in (mock) signs the sample account back in after Đăng xuất", async () => {
    await signOut();
    await signInSampleAccount();
    expect(currentAccountId()).toBe("ban@email.com");
  });

  it("refuses a password change when nobody is signed in", async () => {
    await signOut();
    expect(await updatePassword("abcdef12")).toEqual({ ok: false, error: "Đăng nhập lại để đổi mật khẩu" });
  });
});

describe("magic link request (MOCK, signs in at once)", () => {
  beforeEach(() => {
    demo.on = true;
    vi.stubGlobal("localStorage", memoryStorage());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("a new email gets an account with magic_link and is signed in", async () => {
    demo.on = false;
    expect(await requestMagicLink("cc19new@example.com")).toEqual({ ok: true });
    expect(await currentAccount()).toEqual({ email: "cc19new@example.com", hasPassword: false, providers: ["magic_link"] });
    expect(currentAccountId()).toBe("cc19new@example.com");
  });

  it("an existing password account keeps its password, gets magic_link, and keeps its id", async () => {
    demo.on = false;
    expect(await signUpWithPassword("cc19old@example.com", "abcdef12")).toEqual({ ok: true });
    const idBefore = currentAccountId();
    await signOut();
    expect(await requestMagicLink("cc19old@example.com")).toEqual({ ok: true });
    expect(currentAccountId()).toBe(idBefore);
    expect(await currentAccount()).toEqual({ email: "cc19old@example.com", hasPassword: true, providers: ["password", "magic_link"] });
    await signOut();
    expect(await signInWithPassword("cc19old@example.com", "abcdef12")).toEqual({ ok: true });
  });

  it("does not bring the sample account back outside demo mode", async () => {
    demo.on = false;
    expect(await requestMagicLink("cc19other@example.com")).toEqual({ ok: true });
    await signOut();
    expect(await signInWithPassword("ban@email.com", "abcdef12")).toEqual({ ok: false, error: SIGN_IN_FAILED });
    expect(await currentAccount()).toBeNull();
  });

  it("refuses an email that is not valid, and signs nobody in", async () => {
    demo.on = false;
    expect(await requestMagicLink("not-an-email")).toEqual({ ok: false, error: EMAIL_ERROR });
    expect(await currentAccount()).toBeNull();
  });
});
