import { isDemo } from "./demo";
import { isValidEmail } from "./onboarding";

// The one interface the auth screens call. It is a MOCK for now: nothing leaves the browser, and the
// accounts live in localStorage. Dong swaps the bodies for Supabase (lib/supabase-client.ts) later;
// the screens and their messages stay the same.

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

// MOCK store. Missing or unreadable storage starts from the sample account (no password yet) in demo mode only
// (lib/demo.ts). Outside demo mode a new visitor has no account until they sign up.
const STORE_KEY = "h1t_mock_auth_v1";
const SAMPLE_EMAIL = "ban@email.com";
/** The one message for a failed sign-in: it never says which of email or password was wrong. */
export const SIGN_IN_FAILED = "Email hoặc mật khẩu không đúng";
export const WRONG_CURRENT_PASSWORD = "Mật khẩu hiện tại không đúng";
const NOTICE_KEY = "h1t-auth-notice";

/** A toast message for the next screen (for example "Đã đặt lại mật khẩu" after the reset). */
export function setAuthNotice(message: string): void {
  try {
    globalThis.sessionStorage.setItem(NOTICE_KEY, message);
  } catch {
    // Storage blocked: the screen opens without the toast.
  }
}

/** Reads and clears the notice, so it shows once. */
export function takeAuthNotice(): string | null {
  try {
    const message = globalThis.sessionStorage.getItem(NOTICE_KEY);
    globalThis.sessionStorage.removeItem(NOTICE_KEY);
    return message;
  } catch {
    return null;
  }
}

interface MockAccount {
  /** SHA-256 of the password, null until one is set. The password itself is never stored. */
  hash: string | null;
  providers: AuthProvider[];
}

interface MockStore {
  /** Signed-in email, or null after Đăng xuất. */
  current: string | null;
  accounts: Record<string, MockAccount>;
}

/** The store before anything is saved: the sample account in demo mode, nobody otherwise. */
function startStore(): MockStore {
  if (!isDemo()) return { current: null, accounts: {} };
  return { current: SAMPLE_EMAIL, accounts: { [SAMPLE_EMAIL]: { hash: null, providers: ["google"] } } };
}

function readStore(): MockStore {
  try {
    const parsed = JSON.parse(globalThis.localStorage.getItem(STORE_KEY) ?? "null") as MockStore | null;
    if (parsed && typeof parsed === "object" && parsed.accounts && typeof parsed.accounts === "object") return parsed;
  } catch {
    // Storage blocked or not JSON: fall through to the start store.
  }
  return startStore();
}

function writeStore(store: MockStore): void {
  try {
    globalThis.localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    // Storage blocked: the mock lasts for this visit only.
  }
}

async function hashPassword(password: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function normaliseEmail(value: string): string {
  return value.trim().toLowerCase();
}

function accountInfo(email: string, account: MockAccount): AccountInfo {
  return { email, hasPassword: account.hash !== null, providers: account.providers };
}

/** The signed-in account, or null when nobody is signed in. */
export async function currentAccount(): Promise<AccountInfo | null> {
  const store = readStore();
  if (!store.current) return null;
  const account = store.accounts[store.current];
  return account ? accountInfo(store.current, account) : null;
}

/**
 * The id the per-account storage keys use: the signed-in account's email (lower case), or null when nobody is
 * signed in. Synchronous, so a screen can scope its storage on first read. The one place that knows how the
 * current account is found; Dong's real session replaces the body, nothing else changes.
 */
export function currentAccountId(): string | null {
  const store = readStore();
  return store.current && store.accounts[store.current] ? store.current : null;
}

const RETRY_LATER = "Chưa xử lý được. Thử lại sau ít phút.";

/** An unexpected failure (hashing unavailable, storage broken) becomes a message on the form, never a stuck button. */
async function guarded(run: () => Promise<AuthResult>): Promise<AuthResult> {
  try {
    return await run();
  } catch {
    return { ok: false, error: RETRY_LATER };
  }
}

export function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  return guarded(async () => {
    const address = normaliseEmail(email);
    const store = readStore();
    const account = store.accounts[address];
    if (!account || account.hash === null || account.hash !== (await hashPassword(password))) {
      return { ok: false, error: SIGN_IN_FAILED };
    }
    writeStore({ ...store, current: address });
    return { ok: true };
  });
}

export function signUpWithPassword(email: string, password: string): Promise<AuthResult> {
  return guarded(async () => {
    const emailError = validateEmail(email);
    if (emailError) return { ok: false, error: emailError };
    const passwordError = validateNewPassword(password);
    if (passwordError) return { ok: false, error: passwordError };

    const address = normaliseEmail(email);
    const store = readStore();
    if (store.accounts[address]) return { ok: false, error: "Email này đã có tài khoản. Hãy đăng nhập." };

    const account: MockAccount = { hash: await hashPassword(password), providers: ["password"] };
    writeStore({ current: address, accounts: { ...store.accounts, [address]: account } });
    return { ok: true };
  });
}

/** Always ok for a valid email, so the screen never reveals whether an account exists. */
export async function sendPasswordReset(email: string): Promise<AuthResult> {
  const emailError = validateEmail(email);
  return emailError ? { ok: false, error: emailError } : { ok: true };
}

// MOCK: real Supabase sign-in happens when the link is opened; replace this block with the session from Dong's client.
// Until then the request itself signs the email in: a new email gets an account (no password), an existing account
// keeps its password and id and gets the magic_link provider. Nothing else in the app knows this is a mock.
/** Requests a magic link for the email and makes that account the signed-in one. */
export function requestMagicLink(email: string): Promise<AuthResult> {
  return guarded(async () => {
    const emailError = validateEmail(email);
    if (emailError) return { ok: false, error: emailError };

    const address = normaliseEmail(email);
    const store = readStore();
    const existing = store.accounts[address];
    const account: MockAccount = existing
      ? { ...existing, providers: existing.providers.includes("magic_link") ? existing.providers : [...existing.providers, "magic_link"] }
      : { hash: null, providers: ["magic_link"] };
    writeStore({ current: address, accounts: { ...store.accounts, [address]: account } });
    return { ok: true };
  });
}
// END MOCK magic link

/**
 * Sets the signed-in account's password. The current password is checked only when one is given
 * (the change screen passes it when the account has a password; the reset screen does not).
 */
export function updatePassword(newPassword: string, currentPassword?: string): Promise<AuthResult> {
  return guarded(() => changePassword(newPassword, currentPassword));
}

async function changePassword(newPassword: string, currentPassword?: string): Promise<AuthResult> {
  const passwordError = validateNewPassword(newPassword);
  if (passwordError) return { ok: false, error: passwordError };

  const store = readStore();
  const address = store.current;
  const account = address ? store.accounts[address] : undefined;
  if (!address || !account) return { ok: false, error: "Đăng nhập lại để đổi mật khẩu" };

  if (currentPassword !== undefined && account.hash !== null && account.hash !== (await hashPassword(currentPassword))) {
    return { ok: false, error: WRONG_CURRENT_PASSWORD };
  }

  const providers = account.providers.includes("password") ? account.providers : [...account.providers, "password" as const];
  writeStore({ ...store, accounts: { ...store.accounts, [address]: { hash: await hashPassword(newPassword), providers } } });
  return { ok: true };
}

/**
 * MOCK Google sign-in: the sample account (ban@email.com) becomes the signed-in one, so the diary of the
 * account that signed out is there again. Dong's real session replaces this with the OAuth result.
 */
export async function signInSampleAccount(): Promise<void> {
  const store = readStore();
  const account = store.accounts[SAMPLE_EMAIL] ?? { hash: null, providers: ["google" as const] };
  writeStore({ current: SAMPLE_EMAIL, accounts: { ...store.accounts, [SAMPLE_EMAIL]: account } });
}

/**
 * Đăng xuất: clears the signed-in account. The accounts stay, so signing in again works, and the diary stays
 * under the account's storage keys (lib/storage-keys), so it is there again when the same account signs in.
 */
export async function signOut(): Promise<void> {
  writeStore({ ...readStore(), current: null });
}
