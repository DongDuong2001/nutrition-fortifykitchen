import { apiClient } from "./api-client";
import { isLiveMode } from "./api-mode";
import {
  mockCurrentAccount,
  mockCurrentAccountId,
  mockRequestMagicLink,
  mockSendPasswordReset,
  mockSignInSampleAccount,
  mockSignInWithPassword,
  mockSignOut,
  mockSignUpWithPassword,
  mockUpdatePassword,
} from "./auth-mock";
import { createClient } from "./supabase-client";
import { isDemo } from "./demo";
import { clearOnboardingStorage, isValidEmail } from "./onboarding";

// The one interface the auth screens call. In live mode (NEXT_PUBLIC_API_MODE=live, lib/api-mode.ts) it is backed by
// Supabase Auth (lib/supabase-client.ts); otherwise by the local mock in lib/auth-mock.ts, so gates and demos run
// without a backend. The screens and their Vietnamese messages stay the same.

export type AuthProvider = "password" | "google" | "magic_link";

export interface AccountInfo {
  email: string;
  hasPassword: boolean;
  providers: AuthProvider[];
}

export type AuthResult = { ok: true } | { ok: false; error: string };

export const PASSWORD_MIN_LENGTH = 8;

/** A Vietnamese error for a field, or null when the value is fine. */
export function validateEmail(value: string): string | null {
  return isValidEmail(value) ? null : "Nhập email hợp lệ, ví dụ ban@email.com";
}

/** Sign-in and the current password only check that something was typed; the rules are for new passwords. */
export function validateRequiredPassword(value: string): string | null {
  return value.length > 0 ? null : "Nhập mật khẩu";
}

/** At least 8 characters with at least one letter and one digit. */
export function validateNewPassword(value: string): string | null {
  if (value.length === 0) return "Nhập mật khẩu";
  if (value.length < PASSWORD_MIN_LENGTH) return `Mật khẩu cần ít nhất ${PASSWORD_MIN_LENGTH} ký tự`;
  if (!/\p{L}/u.test(value) || !/\d/.test(value)) return "Mật khẩu cần có ít nhất một chữ và một số";
  return null;
}

export function validatePasswordConfirm(password: string, confirm: string): string | null {
  if (confirm.length === 0) return "Nhập lại mật khẩu";
  return confirm === password ? null : "Mật khẩu nhập lại chưa khớp";
}

export const SIGN_IN_FAILED = "Email hoặc mật khẩu không đúng";
export const WRONG_CURRENT_PASSWORD = "Mật khẩu hiện tại không đúng";
const RETRY_LATER = "Chưa kết nối được máy chủ. Bạn thử lại sau ít phút nhé.";
const NOTICE_KEY = "h1t-auth-notice";
const CURRENT_USER_KEY = "h1t_auth_current_email";
const SIGNED_OUT_KEY = "h1t_auth_signed_out";
const SAMPLE_EMAIL = "ban@email.com";

let inMemoryEmail: string | null | undefined = undefined;

export function getStoredEmail(): string | null {
  if (inMemoryEmail !== undefined) return inMemoryEmail;
  try {
    return globalThis.localStorage?.getItem(CURRENT_USER_KEY) ?? null;
  } catch {
    return null;
  }
}

function setStoredEmail(email: string | null): void {
  inMemoryEmail = email;
  try {
    if (email) {
      globalThis.localStorage?.setItem(CURRENT_USER_KEY, email);
      globalThis.localStorage?.removeItem(SIGNED_OUT_KEY);
    } else {
      globalThis.localStorage?.removeItem(CURRENT_USER_KEY);
      globalThis.localStorage?.setItem(SIGNED_OUT_KEY, "true");
    }
  } catch {
    // Storage blocked
  }
}

/** True after Đăng xuất until the next explicit sign-in: a Supabase session that survives is then not adopted. */
export function wasExplicitlySignedOut(): boolean {
  try {
    return globalThis.localStorage?.getItem(SIGNED_OUT_KEY) === "true";
  } catch {
    return false;
  }
}

/** An explicit sign-in (Google, a magic link) starts: its session may be adopted again, so the signed-out flag goes. */
function clearSignedOutFlag(): void {
  try {
    globalThis.localStorage?.removeItem(SIGNED_OUT_KEY);
  } catch {
    // Storage blocked
  }
}

/** A toast message for the next screen (for example "Đã đặt lại mật khẩu" after the reset). */
export function setAuthNotice(message: string): void {
  try {
    globalThis.sessionStorage?.setItem(NOTICE_KEY, message);
  } catch {
    // Storage blocked: the screen opens without the toast.
  }
}

/** Reads and clears the notice, so it shows once. */
export function takeAuthNotice(): string | null {
  try {
    const message = globalThis.sessionStorage?.getItem(NOTICE_KEY);
    globalThis.sessionStorage?.removeItem(NOTICE_KEY);
    return message;
  } catch {
    return null;
  }
}

function normaliseEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** An unexpected failure becomes a message on the form, never a stuck button. */
async function guarded(run: () => Promise<AuthResult>): Promise<AuthResult> {
  try {
    return await run();
  } catch {
    return { ok: false, error: RETRY_LATER };
  }
}

/**
 * The id the per-account storage keys use: the signed-in account's email (lower case), or null when nobody is
 * signed in. Synchronous, so a screen can scope its storage on first read.
 */
export function currentAccountId(): string | null {
  if (!isLiveMode()) return mockCurrentAccountId();
  const email = getStoredEmail();
  if (email) return email;
  if (!wasExplicitlySignedOut() && isDemo()) {
    return SAMPLE_EMAIL;
  }
  return null;
}

/** The signed-in account, or null when nobody is signed in. */
export async function currentAccount(): Promise<AccountInfo | null> {
  if (!isLiveMode()) return mockCurrentAccount();
  // After Đăng xuất a session that survived a failed sign-out is not adopted (no email stored, no flag cleared)
  if (wasExplicitlySignedOut()) return null;
  try {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user || !user.email) {
      if (!wasExplicitlySignedOut() && isDemo()) {
        return { email: SAMPLE_EMAIL, hasPassword: false, providers: ["google"] };
      }
      return null;
    }

    const email = normaliseEmail(user.email);
    setStoredEmail(email);

    const providers: AuthProvider[] = [];
    const appProviders = user.app_metadata?.providers as string[] | undefined;
    if (Array.isArray(appProviders)) {
      for (const p of appProviders) {
        if (p === "email" || p === "password") {
          if (!providers.includes("password")) providers.push("password");
        } else if (p === "google") {
          if (!providers.includes("google")) providers.push("google");
        } else if (p === "magic_link" || p === "otp") {
          if (!providers.includes("magic_link")) providers.push("magic_link");
        }
      }
    } else if (user.app_metadata?.provider) {
      const p = user.app_metadata.provider;
      if (p === "email") providers.push("password");
      else if (p === "google") providers.push("google");
      else if (p === "magic_link" || p === "otp") providers.push("magic_link");
    }

    if (user.identities && Array.isArray(user.identities)) {
      for (const id of user.identities) {
        if (id.provider === "email" && !providers.includes("password")) providers.push("password");
        if (id.provider === "google" && !providers.includes("google")) providers.push("google");
      }
    }

    if (providers.length === 0) {
      providers.push("password");
    }

    const hasPassword = providers.includes("password") || Boolean(user.user_metadata?.has_password);
    return { email, hasPassword, providers };
  } catch {
    if (!wasExplicitlySignedOut() && isDemo()) {
      return { email: SAMPLE_EMAIL, hasPassword: false, providers: ["google"] };
    }
    return null;
  }
}

export function signInWithPassword(email: string, password: string, captchaToken?: string): Promise<AuthResult> {
  if (!isLiveMode()) return mockSignInWithPassword(email, password);
  return guarded(async () => {
    const address = normaliseEmail(email);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: address,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    });
    if (error || !data.user) {
      return { ok: false, error: SIGN_IN_FAILED };
    }
    setStoredEmail(address);
    return { ok: true };
  });
}

export function signUpWithPassword(email: string, password: string, captchaToken?: string): Promise<AuthResult> {
  if (!isLiveMode()) return mockSignUpWithPassword(email, password);
  return guarded(async () => {
    const emailError = validateEmail(email);
    if (emailError) return { ok: false, error: emailError };
    const passwordError = validateNewPassword(password);
    if (passwordError) return { ok: false, error: passwordError };

    const address = normaliseEmail(email);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: address,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    });
    if (error) {
      return { ok: false, error: "Email này đã có tài khoản. Hãy đăng nhập." };
    }
    if (data.user) {
      setStoredEmail(address);
    }
    return { ok: true };
  });
}

/** Always ok for a valid email, so the screen never reveals whether an account exists. */
export async function sendPasswordReset(email: string): Promise<AuthResult> {
  if (!isLiveMode()) return mockSendPasswordReset(email);
  const emailError = validateEmail(email);
  if (emailError) return { ok: false, error: emailError };

  // The recovery link signs the user in on /reset-password: that is an explicit sign-in too
  clearSignedOutFlag();
  try {
    const address = normaliseEmail(email);
    const supabase = createClient();
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined;
    await supabase.auth.resetPasswordForEmail(address, { redirectTo });
  } catch {
    // Fail silently to avoid disclosing account existence
  }
  return { ok: true };
}

/**
 * Requests a magic link for the email. Does NOT sign in on request; the user is signed in
 * when the link is opened.
 */
export function requestMagicLink(email: string, captchaToken?: string): Promise<AuthResult> {
  if (!isLiveMode()) return mockRequestMagicLink(email);
  return guarded(async () => {
    const emailError = validateEmail(email);
    if (emailError) return { ok: false, error: emailError };

    // The API client is told first (a no-op until Dong's endpoint exists), then Supabase sends the link
    await apiClient.requestMagicLink(email);
    clearSignedOutFlag();

    const address = normaliseEmail(email);
    const supabase = createClient();
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/callback?next=/setup/profile` : undefined;
    const { error } = await supabase.auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: redirectTo, captchaToken },
    });
    if (error) {
      return { ok: false, error: RETRY_LATER };
    }
    return { ok: true };
  });
}

/** Initiates Google OAuth sign in flow via Supabase. */
export async function signInWithGoogle(): Promise<AuthResult> {
  // Mock mode never reaches Supabase: the sample account stands in for the Google account
  if (!isLiveMode()) return mockSignInSampleAccount().then(() => ({ ok: true }) as AuthResult);
  return guarded(async () => {
    clearSignedOutFlag();
    const supabase = createClient();
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/callback?next=/` : undefined;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) return { ok: false, error: RETRY_LATER };
    return { ok: true };
  });
}

/**
 * Sets the signed-in account's password. The current password is checked only when one is given
 * (the change screen passes it when the account has a password; the reset screen does not).
 */
export function updatePassword(newPassword: string, currentPassword?: string): Promise<AuthResult> {
  if (!isLiveMode()) return mockUpdatePassword(newPassword, currentPassword);
  return guarded(async () => {
    const passwordError = validateNewPassword(newPassword);
    if (passwordError) return { ok: false, error: passwordError };

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const currentMail = user?.email || getStoredEmail();
    if (!currentMail) {
      return { ok: false, error: "Đăng nhập lại để đổi mật khẩu" };
    }

    if (currentPassword !== undefined) {
      const { error: verifyErr } = await supabase.auth.signInWithPassword({
        email: currentMail,
        password: currentPassword,
      });
      if (verifyErr) {
        return { ok: false, error: WRONG_CURRENT_PASSWORD };
      }
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      return { ok: false, error: RETRY_LATER };
    }

    return { ok: true };
  });
}

/** Sample account sign-in for demo mode. */
export async function signInSampleAccount(): Promise<void> {
  if (!isLiveMode()) return mockSignInSampleAccount();
  setStoredEmail(SAMPLE_EMAIL);
}

/**
 * Đăng xuất: clears the signed-in session and local tokens.
 */
export async function signOut(): Promise<void> {
  clearOnboardingStorage();
  if (!isLiveMode()) return mockSignOut();
  setStoredEmail(null);
  // The server call (global scope) can fail on the network. The cookie must go anyway, or the sign-in page and the
  // gate would find the session again: fall back to a local sign-out, which only clears this browser's session.
  let supabase: ReturnType<typeof createClient>;
  try {
    supabase = createClient();
  } catch {
    return;
  }
  try {
    const { error } = await supabase.auth.signOut();
    if (!error) return;
  } catch {
    // Fall through to the local sign-out
  }
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Nothing more can be done; the signed-out flag still keeps this browser from adopting the session
  }
}
