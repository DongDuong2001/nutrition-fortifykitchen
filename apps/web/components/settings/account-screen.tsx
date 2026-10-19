"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthNotice } from "@/components/auth/auth-notice";
import { useAccount } from "@/components/settings/use-account";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { FormRow } from "@/components/ui/form-row";
import { Row } from "@/components/ui/row";
import { useDiary } from "@/lib/diary-store";
import { currentAccountId, signOut } from "@/lib/auth-actions";
import { isLiveMode } from "@/lib/api-mode";
import { callEngine, syncOfflineOutbox } from "@/lib/api-client";
import { useSaveDisplayName } from "@/hooks/use-save-display-name";
import { cleanDisplayName, limitDisplayName, validateDisplayName } from "@/lib/display-name";

// Only a person who signs out with writes waiting ever sees it: its chunk is not part of the page
const SignOutConfirm = dynamic(() => import("@/components/settings/sign-out-confirm").then((m) => m.SignOutConfirm), { ssr: false });

/** Tên hiển thị. It saves on blur or Enter. A name is required (it is on the share image): a blank or unusable one stays on screen with its error. */
function DisplayNameRow() {
  const { profile } = useDiary();
  const saveName = useSaveDisplayName();
  const [value, setValue] = useState(profile.displayName);
  const [error, setError] = useState<string | undefined>();

  async function save() {
    const message = validateDisplayName(value);
    setError(message ?? undefined);
    if (message) return;
    const name = cleanDisplayName(value);
    setValue(name);
    if (name === profile.displayName) return;
    if (!(await saveName(name))) setError("Đã lưu trên máy này, chưa gửi lên máy chủ được. Thử lại sau.");
  }

  return (
    <FormRow
      label="Tên hiển thị"
      htmlFor="account-display-name"
      hint="Hiện trên ảnh chia sẻ"
      error={error}
      data-align-group="account-row"
      className="py-3"
    >
      <input
        id="account-display-name"
        type="text"
        autoComplete="nickname"
        value={value}
        onChange={(e) => {
          const next = limitDisplayName(e.target.value);
          setValue(next);
          if (error) setError(validateDisplayName(next) ?? undefined);
        }}
        onBlur={() => void save()}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        aria-invalid={error ? true : undefined}
        className={`h-[52px] w-full rounded-xl border-2 bg-surface px-4 text-base text-text outline-none focus:border-blue ${
          error ? "border-destructive" : "border-grabber"
        }`}
      />
    </FormRow>
  );
}

/** The account-screen message when nobody is signed in. Shared with the password screen. */
export function SignedOutCard() {
  return (
    <Card as="section" aria-label="Tài khoản" className="flex flex-col gap-3">
      <p className="m-0 text-[15px] text-secondary">Bạn chưa đăng nhập.</p>
      <Link
        href="/signin"
        className="inline-flex min-h-[44px] items-center self-start font-semibold text-blue"
      >
        Đăng nhập
      </Link>
    </Card>
  );
}

/** Tài khoản, pushed from Cài đặt: the name, the email (read only), the password and Đăng xuất. */
export function AccountScreen() {
  const { hydrated } = useDiary();
  const { loaded, account } = useAccount();
  const router = useRouter();
  const ready = hydrated && loaded;

  // cc-68 (X8): Đăng xuất in a real account wipes what the device kept for it. With writes still waiting the person is asked first.
  const [waiting, setWaiting] = useState<{ count: number; busy: boolean; failed: boolean } | null>(null);

  async function leave(account: string | null, dropPending: boolean) {
    await signOut();
    if (account) await callEngine("wipeAccount", account, { dropPending });
    // A full load: nothing of this account stays in the page's memory (the foods it made, its diary)
    window.location.assign("/signin");
  }

  async function handleSignOut() {
    if (!isLiveMode()) {
      await signOut();
      router.push("/signin");
      return;
    }
    const account = currentAccountId();
    const count = account ? await callEngine("unsyncedCount", account) : 0;
    if (count > 0) setWaiting({ count, busy: false, failed: false });
    else await leave(account, false);
  }

  async function syncThenLeave() {
    const account = currentAccountId();
    setWaiting((w) => w && { ...w, busy: true, failed: false });
    await syncOfflineOutbox({ retryHeld: true }).catch(() => undefined);
    const count = account ? await callEngine("unsyncedCount", account) : 0;
    if (count === 0) await leave(account, false);
    else setWaiting({ count, busy: false, failed: true });
  }

  return (
    <AppShell alignContainer="account-page">
      <AppHeader variant="sub" title="Tài khoản" backHref="/settings" layout="wide" alignGroup="account-header" />

      <main className="mx-auto grid w-full max-w-[560px] grid-cols-1 items-start gap-4 px-4 pb-6 pt-4 lg:mx-0 lg:px-8 lg:pb-12 lg:pt-5">
        {!ready ? (
          <div aria-busy="true" aria-live="polite" className="h-[240px] rounded-[18px] bg-divider animate-pulse motion-reduce:animate-none" />
        ) : account ? (
          <Card as="section" aria-label="Thông tin tài khoản" className="flex flex-col gap-1">
            <DisplayNameRow />
            <div data-align-group="account-row">
              <Row label="Email" hint={account.email} showChevron={false} />
            </div>
            <div data-align-group="account-row">
              <Row label={account.hasPassword ? "Đổi mật khẩu" : "Đặt mật khẩu"} href="/settings/account/password" />
            </div>
            <div data-align-group="account-row">
              <Row label={<span className="text-destructive-text">Đăng xuất</span>} onClick={handleSignOut} showChevron={false} />
            </div>
          </Card>
        ) : (
          <SignedOutCard />
        )}
      </main>

      {waiting && (
        <SignOutConfirm
          open
          count={waiting.count}
          busy={waiting.busy}
          failed={waiting.failed}
          onSyncThenLeave={() => void syncThenLeave()}
          onLeave={() => void leave(currentAccountId(), true)}
          onClose={() => setWaiting(null)}
        />
      )}
      <AuthNotice />
    </AppShell>
  );
}
