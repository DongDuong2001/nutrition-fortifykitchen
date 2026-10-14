import { apiClient } from "./api-client";
import { isDemo } from "./demo";
import { clearOnboardingStorage } from "./onboarding";
import {
  SIGN_IN_FAILED,
  WRONG_CURRENT_PASSWORD,
  validateEmail,
  validateNewPassword,
  type AccountInfo,
  type AuthProvider,
  type AuthResult,
} from "./auth-actions";

// The local mock behind lib/auth-actions.ts (NEXT_PUBLIC_API_MODE unset or "mock", see lib/api-mode.ts): nothing
// leaves the browser and the accounts live in localStorage. Live mode uses Supabase Auth instead. Both share the
// validators and messages of auth-actions, so the screens read the same either way.
// Delete this file together with the mock mode when the app only runs live.

// MOCK store. Missing or unreadable storage starts from the sample account (no password yet) in demo mode only
// (lib/demo.ts). Outside demo mode a new visitor has no account until they sign up.
const STORE_KEY = "h1t_mock_auth_v1";
const SAMPLE_EMAIL = "ban@email.com";
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
export async function mockCurrentAccount(): Promise<AccountInfo | null> {
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
export function mockCurrentAccountId(): string | null {
  const store = readStore();
  return store.current && store.accounts[store.current] ? store.current : null;
}

const RETRY_LATER = "Chưa kết nối được máy chủ. Bạn thử lại sau ít phút nhé.";

/** An unexpected failure (hashing unavailable, storage broken) becomes a message on the form, never a stuck button. */
async function guarded(run: () => Promise<AuthResult>): Promise<AuthResult> {
  try {
    return await run();
  } catch {
    return { ok: false, error: RETRY_LATER };
  }
}

export function mockSignInWithPassword(email: string, password: string): Promise<AuthResult> {
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

export function mockSignUpWithPassword(email: string, password: string): Promise<AuthResult> {
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
export async function mockSendPasswordReset(email: string): Promise<AuthResult> {
  const emailError = validateEmail(email);
  return emailError ? { ok: false, error: emailError } : { ok: true };
}

// The mock request itself signs the email in: a new email gets an account (no password), an existing account
// keeps its password and id and gets the magic_link provider. Nothing else in the app knows this is a mock.
/** Requests a magic link for the email and makes that account the signed-in one. */
export function mockRequestMagicLink(email: string): Promise<AuthResult> {
  return guarded(async () => {
    const emailError = validateEmail(email);
    if (emailError) return { ok: false, error: emailError };

    // The request goes to the API client first, then the MOCK sign-in below runs
    await apiClient.requestMagicLink(email);

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

/**
 * Sets the signed-in account's password. The current password is checked only when one is given
 * (the change screen passes it when the account has a password; the reset screen does not).
 */
export function mockUpdatePassword(newPassword: string, currentPassword?: string): Promise<AuthResult> {
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
export async function mockSignInSampleAccount(): Promise<void> {
  const store = readStore();
  const account = store.accounts[SAMPLE_EMAIL] ?? { hash: null, providers: ["google" as const] };
  writeStore({ current: SAMPLE_EMAIL, accounts: { ...store.accounts, [SAMPLE_EMAIL]: account } });
}

/**
 * Đăng xuất: clears the signed-in account. The accounts stay, so signing in again works, and the diary stays
 * under the account's storage keys (lib/storage-keys), so it is there again when the same account signs in.
 */
export async function mockSignOut(): Promise<void> {
  clearOnboardingStorage();
  writeStore({ ...readStore(), current: null });
}
