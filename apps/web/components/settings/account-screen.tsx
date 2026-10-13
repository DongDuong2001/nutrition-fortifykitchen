"use client";

import { useState } from "react";
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
import { signOut } from "@/lib/auth-actions";
import { cleanDisplayName, displayNameError } from "@/lib/profile";

/** Tên hiển thị. It saves on blur or Enter. Empty means not set; a name over 40 characters stays on screen with its error. */
function DisplayNameRow() {
  const { profile, updateProfile } = useDiary();
  const [value, setValue] = useState(profile.displayName);
  const [error, setError] = useState<string | undefined>();

  function save() {
    const message = displayNameError(value);
    setError(message ?? undefined);
    if (message) return;
    const name = cleanDisplayName(value);
    setValue(name);
    if (name !== profile.displayName) updateProfile({ displayName: name });
  }

  return (
    <FormRow
      label="Tên hiển thị"
      htmlFor="account-display-name"
      hint="Tuỳ chọn"
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
          setValue(e.target.value);
          if (error) setError(displayNameError(e.target.value) ?? undefined);
        }}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        aria-invalid={error ? true : undefined}
        className={`h-[52px] w-full rounded-xl border-2 bg-card px-4 text-base text-text outline-none focus:border-blue ${
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

  async function handleSignOut() {
    await signOut();
    router.push("/signin");
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

      <AuthNotice />
    </AppShell>
  );
}
