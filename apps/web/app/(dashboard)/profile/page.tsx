"use client";

import { AppHeader } from "@/components/ui/app-header";
import { BottomNav } from "@/components/ui/bottom-nav";
import { DesktopSidebar } from "@/components/ui/desktop-sidebar";
import {
  AccountCard,
  AppCard,
  BodyCard,
  GoalCard,
  ProCard,
  TargetsCard,
} from "@/components/profile/profile-cards";
import { useDiary } from "@/lib/diary-store";

export default function ProfilePage() {
  const { hydrated } = useDiary();

  return (
    <div data-align-container="profile-page" className="flex min-h-dvh flex-col bg-page text-text lg:flex-row">
      <DesktopSidebar currentTab="profile" />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader variant="tab" title="HỒ SƠ" className="lg:hidden" alignGroup="profile-header" />
        <h1 className="m-0 hidden px-8 pt-7 font-display text-[34px] font-black italic uppercase lg:block">Hồ sơ</h1>

        <main className="mx-auto grid w-full max-w-[560px] grid-cols-1 items-start gap-3.5 px-4 pb-[104px] pt-3 lg:mx-0 lg:max-w-[1240px] lg:grid-cols-2 lg:gap-4 lg:px-8 lg:pb-12 lg:pt-5">
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
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 bg-ink lg:hidden">
        <BottomNav currentTab="profile" />
      </div>
    </div>
  );
}
