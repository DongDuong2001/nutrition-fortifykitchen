"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { useCoaching } from "@/hooks/use-coaching";
import { currentAccountId } from "@/lib/auth-actions";
import { WRONG_CODE, joinPrompt } from "@/lib/level-copy";
import { findCoachByCode } from "@/lib/mock-coach-server";
import { writePendingCoachCode } from "@/lib/pending-coach";

/**
 * /join/<code>: the link a coach shares. Signed in: confirm, then the user is linked and lands on Hôm nay.
 * Signed out: the code waits in the session through sign-up and setup (lib/pending-coach).
 */
export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const raw = decodeURIComponent(String(params?.code ?? ""));
  const { hydrated, coach: linked, joinByCode, available } = useCoaching();
  const target = findCoachByCode(raw);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [open, setOpen] = useState(true);

  // Read after mount: the account lives in the browser's storage
  useEffect(() => {
    setSignedIn(currentAccountId() !== null);
  }, []);

  useEffect(() => {
    if (signedIn === false && target) {
      writePendingCoachCode(raw);
      router.replace("/signup");
    }
  }, [signedIn, target, raw, router]);

  // Live mode has no coaching yet: the app's 404
  if (!available) notFound();

  const ready = hydrated && signedIn === true;

  return (
    <AppShell>
      <AppHeader variant="sub" title="Tham gia HLV" backHref="/" layout="wide" />
      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 pb-6 pt-4 lg:mx-0 lg:px-8">
        {!ready && signedIn !== false ? (
          <div aria-busy="true" className="h-[120px] rounded-[18px] bg-divider motion-safe:animate-pulse" />
        ) : !target ? (
          <Card className="flex flex-col gap-3">
            <p role="alert" className="m-0 text-[15px] leading-snug text-text">
              {WRONG_CODE}
            </p>
            <Link href="/settings/coach" className="inline-flex min-h-[44px] items-center text-[15px] font-bold text-blue no-underline">
              Nhập mã khác
            </Link>
          </Card>
        ) : linked?.id === target.id ? (
          <Card className="flex flex-col gap-3">
            <p className="m-0 text-[15px] leading-snug text-text">Bạn đang được {target.name} theo dõi.</p>
            <Link href="/" className="inline-flex min-h-[44px] items-center text-[15px] font-bold text-blue no-underline">
              Về Hôm nay
            </Link>
          </Card>
        ) : null}
      </main>

      {ready && target && linked?.id !== target.id && (
        <Sheet
          open={open}
          onClose={() => {
            setOpen(false);
            router.push("/");
          }}
          title={joinPrompt(target.name)}
          titleId="join-title"
          desktopDialog
        >
          <p className="m-0 px-1 text-[13px] leading-snug text-secondary">
            {target.name} sẽ xem được dữ liệu ăn uống của bạn và đặt Level để mở thêm chỉ số trong Hôm nay.
          </p>
          <PillButton
            type="button"
            onClick={() => {
              joinByCode(target.code);
              setOpen(false);
              router.push("/");
            }}
          >
            Tham gia
          </PillButton>
          <PillButton
            type="button"
            variant="secondary"
            onClick={() => {
              setOpen(false);
              router.push("/");
            }}
          >
            Để sau
          </PillButton>
        </Sheet>
      )}
    </AppShell>
  );
}
