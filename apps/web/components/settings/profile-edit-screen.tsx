"use client";

import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { SettingsRow } from "@/components/settings/settings-row";
import { SETTINGS_ICONS } from "@/components/settings/settings-icons";
import { BodyCard, GoalCard } from "@/components/settings/profile-cards";
import { profileSummary } from "@/components/settings/profile-summary";
import { useDiary } from "@/lib/diary-store";

/** Hồ sơ, a pushed screen under Cài đặt: sex, birth year, weight, goal and default training. */
export function ProfileEditScreen() {
  const { profile, hydrated } = useDiary();

  return (
    <AppShell alignContainer="profile-page">
      <AppHeader
        variant="sub"
        title="Hồ sơ"
        subtitle={hydrated ? profileSummary(profile) : undefined}
        backHref="/settings"
        layout="wide"
        alignGroup="profile-header"
      />

      <main className="mx-auto grid w-full max-w-[560px] grid-cols-1 items-start gap-4 px-4 pb-6 pt-4 lg:mx-0 lg:max-w-[1240px] lg:grid-cols-2 lg:gap-4 lg:px-8 lg:pb-12 lg:pt-5">
        {hydrated ? (
          <>
            <div className="flex flex-col gap-4">
              <BodyCard alignGroup="profile-header" />
            </div>
            <div className="flex flex-col gap-4">
              <GoalCard />
              <Card as="section" aria-label="Mục tiêu mỗi ngày" padding={false} className="px-4">
                <SettingsRow
                  tone="targets"
                  glyph={SETTINGS_ICONS.target}
                  label="Mục tiêu mỗi ngày tính từ hồ sơ này"
                  href="/settings/targets"
                  divider={false}
                  data-align-group="profile-row"
                />
              </Card>
            </div>
          </>
        ) : (
          <div aria-busy="true" aria-live="polite" className="flex flex-col gap-4 lg:col-span-2">
            <div className="h-[220px] rounded-card bg-divider animate-pulse motion-reduce:animate-none" />
            <div className="h-[160px] rounded-card bg-divider animate-pulse motion-reduce:animate-none" />
          </div>
        )}
      </main>
    </AppShell>
  );
}
