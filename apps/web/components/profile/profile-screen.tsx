"use client";

import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import {
  AccountCard,
  AppCard,
  BodyCard,
  GoalCard,
  ProCard,
  TargetsCard,
} from "@/components/profile/profile-cards";
import { useDiary } from "@/lib/diary-store";

/**
 * The Hồ sơ content (body, goal, targets, app, Pro, account). Served at /settings (the Cài đặt tab) and at
 * /settings/profile (a pushed screen with a back button). Step 3 of IA v2 splits the two.
 */
export function ProfileScreen({ title, backHref }: { title: string; backHref?: string }) {
  const { hydrated } = useDiary();

  return (
    <AppShell alignContainer="profile-page">
        <AppHeader
          variant={backHref ? "sub" : "tab"}
          title={title.toUpperCase()}
          backHref={backHref}
          layout="wide"
          alignGroup="profile-header"
        />

        <main className="mx-auto grid w-full max-w-[560px] grid-cols-1 items-start gap-3.5 px-4 pb-6 pt-3 lg:mx-0 lg:max-w-[1240px] lg:grid-cols-2 lg:gap-4 lg:px-8 lg:pb-12 lg:pt-5">
          {hydrated ? (
            <>
              <div className="flex flex-col gap-3.5 lg:gap-4">
                <BodyCard alignGroup="profile-header" />
                <GoalCard />
                <TargetsCard />
              </div>
              <div className="flex flex-col gap-3.5 lg:gap-4">
                <AppCard />
                <ProCard />
                <AccountCard />
              </div>
            </>
          ) : (
            <div aria-busy="true" aria-live="polite" className="flex flex-col gap-3.5 lg:col-span-2">
              <div className="h-[220px] rounded-[18px] bg-divider animate-pulse motion-reduce:animate-none" />
              <div className="h-[160px] rounded-[18px] bg-divider animate-pulse motion-reduce:animate-none" />
            </div>
          )}
        </main>
    </AppShell>
  );
}
