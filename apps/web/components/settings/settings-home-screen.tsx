"use client";

import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { Row } from "@/components/ui/row";
import { SectionTitle } from "@/components/ui/section-title";
import Link from "next/link";
import { AppCard } from "@/components/settings/profile-cards";
import { profileSummary } from "@/components/settings/profile-summary";
import { useDiary } from "@/lib/diary-store";
import { targetRangeText } from "@/lib/profile";

// The Pro offer, dark as in design/v2/cai-dat.html. Its one action goes to the paywall.
function ProOffer() {
  return (
    <section aria-labelledby="settings-pro-title" className="flex flex-col gap-3 rounded-[18px] bg-surface-dark p-4 text-on-dark">
      <div className="flex flex-col gap-1">
        <h2 id="settings-pro-title" className="m-0 text-base font-bold">
          H1T MICRO Pro
        </h2>
        <p className="m-0 text-[13px] leading-snug text-muted-subtitle">Xem các gói và quyền lợi của tài khoản</p>
      </div>
      <Link
        href="/paywall"
        className="inline-flex min-h-[44px] items-center self-start rounded-full bg-card px-5 text-[15px] font-bold text-ink transition-transform duration-150 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        Xem gói
      </Link>
    </section>
  );
}

/** The Cài đặt tab (IA v2): the profile card, the day's targets, app settings, Pro and the account. */
export function SettingsHomeScreen() {
  const { profile, targets, hydrated } = useDiary();

  return (
    <AppShell alignContainer="settings-page">
      <AppHeader variant="tab" title="Cài đặt" layout="wide" alignGroup="settings-header" />

      <main className="mx-auto grid w-full max-w-[560px] grid-cols-1 items-start gap-4 px-4 pb-6 pt-4 lg:mx-0 lg:max-w-[1240px] lg:grid-cols-2 lg:px-8 lg:pb-12 lg:pt-5">
        {hydrated ? (
          <>
            <div className="flex flex-col gap-4">
              <Card as="section" aria-label="Hồ sơ của bạn" className="flex flex-col gap-1">
                <div data-align-group="settings-row">
                  <Row label="Hồ sơ của bạn" hint={profileSummary(profile)} href="/settings/profile" />
                </div>
              </Card>
              <Card as="section" aria-label="Mục tiêu" className="flex flex-col gap-1">
                <div data-align-group="settings-row">
                  <Row
                    label="Mục tiêu mỗi ngày"
                    hint={`${targetRangeText(targets.calories, "kcal")} · đạm ${targetRangeText(targets.protein, "g")}`}
                    href="/settings/targets"
                  />
                </div>
              </Card>
              <AppCard />
            </div>

            <div className="flex flex-col gap-4">
              <ProOffer />
              <Card as="section" aria-labelledby="settings-account-title" className="flex flex-col gap-1">
                <SectionTitle id="settings-account-title">Tài khoản</SectionTitle>
                <div data-align-group="settings-row">
                  <Row label={<span className="text-destructive-text">Đăng xuất</span>} href="/signin" />
                </div>
              </Card>
              <Card as="section" aria-labelledby="settings-danger-title" className="flex flex-col gap-1">
                <h2 id="settings-danger-title" className="m-0 text-base font-bold text-destructive-text">
                  Vùng nguy hiểm
                </h2>
                <div data-align-group="settings-row">
                  <Row
                    label={<span className="text-destructive-text">Xoá tài khoản</span>}
                    hint="Có bước xác nhận trước khi xoá"
                    href="/settings/delete-account"
                  />
                </div>
              </Card>
            </div>
          </>
        ) : (
          <div aria-busy="true" aria-live="polite" className="flex flex-col gap-4 lg:col-span-2">
            <div className="h-[120px] rounded-[18px] bg-divider animate-pulse motion-reduce:animate-none" />
            <div className="h-[120px] rounded-[18px] bg-divider animate-pulse motion-reduce:animate-none" />
            <div className="h-[200px] rounded-[18px] bg-divider animate-pulse motion-reduce:animate-none" />
          </div>
        )}
      </main>
    </AppShell>
  );
}
