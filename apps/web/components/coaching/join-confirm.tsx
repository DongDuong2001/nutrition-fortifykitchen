"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { DiaryProviderWrapper } from "@/components/diary-provider-wrapper";
import { WrongCode } from "@/components/coaching/wrong-code";
import { useCoaching } from "@/hooks/use-coaching";
import { joinPrompt } from "@/lib/level-copy";
import { findCoachByCode } from "@/lib/mock-coach-server";
import { HOME_ROUTE } from "@/lib/nav";
import { navigateFromSheet } from "@/lib/sheet-history";

/**
 * /join/<code> for a signed-in visitor: confirm, then the user is linked and lands on Hôm nay. /join is outside the diary
 * provider (a signed-out visitor never needs it), so this brings its own, and the page loads it only for a signed-in visitor.
 */
export function JoinConfirm({ raw }: { raw: string }) {
  return (
    <DiaryProviderWrapper>
      <JoinConfirmBody raw={raw} />
    </DiaryProviderWrapper>
  );
}

function JoinConfirmBody({ raw }: { raw: string }) {
  const router = useRouter();
  const { hydrated, coach: linked, joinByCode } = useCoaching();
  const target = findCoachByCode(raw);
  const [open, setOpen] = useState(true);
  const ready = hydrated;

  return (
    <AppShell>
      <AppHeader variant="sub" title="Tham gia HLV" backHref={HOME_ROUTE} layout="wide" />
      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 pb-6 pt-4 lg:mx-0 lg:px-8">
        {!ready ? (
          <div aria-busy="true" className="h-[120px] rounded-[18px] bg-divider motion-safe:animate-pulse" />
        ) : !target ? (
          <WrongCode />
        ) : linked?.id === target.id ? (
          <Card className="flex flex-col gap-3">
            <p className="m-0 text-[15px] leading-snug text-text">Bạn đang được {target.name} theo dõi.</p>
            <Link href={HOME_ROUTE} className="inline-flex min-h-[44px] items-center text-[15px] font-bold text-blue no-underline">
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
            navigateFromSheet(router, HOME_ROUTE);
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
              navigateFromSheet(router, HOME_ROUTE);
            }}
          >
            Tham gia
          </PillButton>
          <PillButton
            type="button"
            variant="secondary"
            onClick={() => {
              setOpen(false);
              navigateFromSheet(router, HOME_ROUTE);
            }}
          >
            Để sau
          </PillButton>
        </Sheet>
      )}
    </AppShell>
  );
}
