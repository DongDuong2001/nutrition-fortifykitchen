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
import { apiClient } from "../api-client";

// The live path: Supabase Auth through a mocked client (the mock mode has its own file, auth-actions-mock.test.ts)
vi.stubEnv("NEXT_PUBLIC_API_MODE", "live");

// Demo mode decides whether the sample account exists. The flows below run in demo mode unless a test says otherwise.
const demo = vi.hoisted(() => ({ on: true }));
vi.mock("../demo", () => ({ isDemo: () => demo.on }));

interface UserRecord {
  id: string;
  email: string;
  password?: string;
  providers: string[];
}

const mockState = vi.hoisted(() => ({
  users: new Map<string, UserRecord>(),
  currentUser: null as UserRecord | null,
  failNextCall: false,
  // Email confirmation on: sign-up returns a user but no session
  confirmEmail: false,
  signUpError: null as (Error & { code?: string; status?: number }) | null,
  signInError: null as (Error & { code?: string; status?: number }) | null,
}));

vi.mock("../supabase-client", () => {
  return {
    createClient: () => ({
      auth: {
        getUser: vi.fn(async () => {
          if (mockState.failNextCall) throw new Error("network error");
          if (!mockState.currentUser) return { data: { user: null }, error: null };
          return {
            data: {
              user: {
                id: mockState.currentUser.id,
                email: mockState.currentUser.email,
                app_metadata: {
                  provider: mockState.currentUser.providers[0],
                  providers: mockState.currentUser.providers,
                },
                identities: mockState.currentUser.providers.map((p) => ({ provider: p })),
              },
            },
            error: null,
          };
        }),
        signInWithPassword: vi.fn(async ({ email, password }: { email: string; password: string }) => {
          if (mockState.failNextCall) throw new Error("network error");
          const user = mockState.users.get(email.toLowerCase().trim());
          if (mockState.signInError) return { data: { user: null }, error: mockState.signInError };
          if (!user || user.password !== password) {
            return { data: { user: null }, error: new Error("invalid_credentials") };
          }
          mockState.currentUser = user;
          return { data: { user }, error: null };
        }),
        signUp: vi.fn(async ({ email, password }: { email: string; password: string }) => {
          if (mockState.failNextCall) throw new Error("network error");
          const normalised = email.toLowerCase().trim();
          if (mockState.signUpError) return { data: { user: null, session: null }, error: mockState.signUpError };
          if (mockState.users.has(normalised)) {
            return { data: { user: null }, error: new Error("user_already_exists") };
          }
          const user: UserRecord = {
            id: `user-${Date.now()}`,
            email: normalised,
            password,
            providers: ["password"],
          };
          mockState.users.set(normalised, user);
          if (mockState.confirmEmail) return { data: { user, session: null }, error: null };
          mockState.currentUser = user;
          return { data: { user, session: { access_token: "t" } }, error: null };
        }),
        signInWithOtp: vi.fn(async ({ email }: { email: string }) => {
          if (mockState.failNextCall) throw new Error("network error");
          const normalised = email.toLowerCase().trim();
          if (!mockState.users.has(normalised)) {
            mockState.users.set(normalised, {
              id: `user-${Date.now()}`,
              email: normalised,
              providers: ["magic_link"],
            });
          }
          return { data: {}, error: null };
        }),
        signInWithOAuth: vi.fn(async () => {
          if (mockState.failNextCall) throw new Error("network error");
          return { data: {}, error: null };
        }),
        resetPasswordForEmail: vi.fn(async () => {
          if (mockState.failNextCall) throw new Error("network error");
          return { data: {}, error: null };
        }),
        updateUser: vi.fn(async ({ password }: { password?: string }) => {
          if (mockState.failNextCall) throw new Error("network error");
          if (!mockState.currentUser) {
            return { data: { user: null }, error: new Error("unauthorized") };
          }
          if (password) {
            mockState.currentUser.password = password;
            if (!mockState.currentUser.providers.includes("password")) {
              mockState.currentUser.providers.push("password");
            }
          }
          return { data: { user: mockState.currentUser }, error: null };
        }),
        signOut: vi.fn(async () => {
          mockState.currentUser = null;
          return { error: null };
        }),
      },
    }),
  };
});

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

describe("Supabase auth flows (mocked client, no network)", () => {
  beforeEach(() => {
    demo.on = true;
    mockState.users.clear();
    mockState.currentUser = null;
    mockState.failNextCall = false;
    mockState.confirmEmail = false;
    mockState.signUpError = null;
    mockState.signInError = null;
    vi.stubGlobal("localStorage", memoryStorage());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("email sign-up with confirmation on stores no email and signs nobody in", async () => {
    demo.on = false;
    mockState.confirmEmail = true;
    expect(await signUpWithPassword("new@example.com", "abcdef12")).toEqual({ ok: true, needsConfirmation: true });
    expect(currentAccountId()).toBeNull();
    expect(await currentAccount()).toBeNull();
  });

  it("shows a Vietnamese message for each Supabase sign-up error", async () => {
    const withCode = (code: string, status?: number) => Object.assign(new Error("English text from the server"), { code, status });
    const cases: Array<[Error, string]> = [
      [withCode("over_email_send_rate_limit", 429), "Bạn thử quá nhiều lần. Chờ ít phút rồi thử lại."],
      [withCode("weak_password", 422), "Mật khẩu quá yếu. Dùng mật khẩu dài hơn, có cả chữ và số."],
      [withCode("captcha_failed", 400), "Chưa xác minh được captcha. Thử lại nhé."],
      [withCode("email_exists", 422), "Email này đã có tài khoản. Hãy đăng nhập."],
      [withCode("unexpected_failure", 500), "Chưa kết nối được máy chủ. Bạn thử lại sau ít phút nhé."],
    ];
    for (const [error, message] of cases) {
      mockState.signUpError = error;
      expect(await signUpWithPassword("x@example.com", "abcdef12")).toEqual({ ok: false, error: message });
    }
  });

  it("sign-in says the email is not confirmed yet instead of a wrong password", async () => {
    mockState.signInError = Object.assign(new Error("Email not confirmed"), { code: "email_not_confirmed", status: 400 });
    expect(await signInWithPassword("x@example.com", "abcdef12")).toEqual({
      ok: false,
      error: "Bạn chưa xác nhận email. Mở liên kết trong email rồi đăng nhập.",
    });
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
    // In demo mode, sample account is simulated
    mockState.currentUser = {
      id: "sample-user",
      email: "ban@email.com",
      providers: ["google"],
    };
    expect(await updatePassword("abcdef12")).toEqual({ ok: true });
    expect(await currentAccount()).toEqual({ email: "ban@email.com", hasPassword: true, providers: ["google", "password"] });
  });

  it("changes a password only when the current one is right", async () => {
    await signUpWithPassword("ban@email.com", "abcdef12");
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

  it("answers with a retry message, not a stuck form, when client transport errors occur", async () => {
    await signUpWithPassword("cc18@example.com", "abcdef12");
    await signOut();
    mockState.failNextCall = true;
    expect(await signInWithPassword("cc18@example.com", "abcdef12")).toEqual({
      ok: false,
      error: "Chưa kết nối được máy chủ. Bạn thử lại sau ít phút nhé.",
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

describe("magic link request (does not sign in on request)", () => {
  beforeEach(() => {
    demo.on = true;
    mockState.users.clear();
    mockState.currentUser = null;
    mockState.failNextCall = false;
    vi.stubGlobal("localStorage", memoryStorage());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("a new email sends magic link successfully but is NOT signed in on request", async () => {
    demo.on = false;
    expect(await requestMagicLink("cc19new@example.com")).toEqual({ ok: true });
    expect(await currentAccount()).toBeNull();
    expect(currentAccountId()).toBeNull();
  });

  it("an existing password account sends magic link successfully without changing current session", async () => {
    demo.on = false;
    expect(await signUpWithPassword("cc19old@example.com", "abcdef12")).toEqual({ ok: true });
    await signOut();
    expect(await requestMagicLink("cc19old@example.com")).toEqual({ ok: true });
    expect(currentAccountId()).toBeNull();
    expect(await currentAccount()).toBeNull();
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

  it("asks the API client for the link first, and does not sign in until the link is opened", async () => {
    demo.on = false;
    const calls: string[] = [];
    const spy = vi.spyOn(apiClient, "requestMagicLink").mockImplementation(async (email: string) => {
      calls.push(`api:${email}`);
      expect(await currentAccount()).toBeNull();
      return { ok: true };
    });
    try {
      expect(await requestMagicLink("cc20@example.com")).toEqual({ ok: true });
    } finally {
      spy.mockRestore();
    }
    expect(calls).toEqual(["api:cc20@example.com"]);
    expect(await currentAccount()).toBeNull();
  });
});
