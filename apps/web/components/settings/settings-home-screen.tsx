"use client";

import { AppHeader } from "@/components/ui/app-header";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-title";
import { SettingsRow } from "@/components/settings/settings-row";
import Link from "next/link";
import { AppCard, SupportCard } from "@/components/settings/profile-cards";
import { SETTINGS_ICONS } from "@/components/settings/settings-icons";
import { profileSummary, profileTitle } from "@/components/settings/profile-summary";
import { useAccount } from "@/components/settings/use-account";
import { useDiary } from "@/lib/diary-store";
import { useCoaching } from "@/hooks/use-coaching";
import { canManageClients } from "@/lib/coaching-link";
import { targetRangeText } from "@/lib/profile";

/**
 * The profile card, the one dark accent of Cài đặt: the name, the profile in one line and the day's targets in
 * Saira. The whole card opens Hồ sơ.
 */
function ProfileHero() {
  const { profile, targets } = useDiary();
  return (
    <Link
      href="/settings/profile"
      className="flex flex-col gap-3 rounded-card bg-ink p-4 text-on-dark no-underline active:scale-[0.97] transition-press motion-reduce:transition-none motion-reduce:active:scale-100"
    >
      <span className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 flex-col gap-1">
          <span className="break-words text-base font-bold leading-snug">{profileTitle(profile)}</span>
          <span className="text-cap leading-snug text-muted-subtitle">{profileSummary(profile)}</span>
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="mt-1 shrink-0 text-muted-subtitle" aria-hidden="true">
          <path d="M9 5l7 7-7 7" />
        </svg>
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-cap font-semibold text-muted-subtitle">Mục tiêu mỗi ngày</span>
        <span className="font-display text-display font-black italic leading-none tabular-nums text-sky tracking-[0.01em]">
          {targetRangeText(targets.calories, "kcal")}
        </span>
        <span className="font-display text-2xl font-extrabold not-italic leading-none tabular-nums text-on-dark tracking-[0.01em]">
          đạm {targetRangeText(targets.protein, "g")}
        </span>
      </span>
    </Link>
  );
}

// The Pro offer: a light card with one outline pill, so the profile card stays the one dark accent
function ProOffer() {
  return (
    <Card as="section" aria-labelledby="settings-pro-title" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <SectionHeader id="settings-pro-title">H1T MICRO Pro</SectionHeader>
        <p className="m-0 text-cap leading-snug text-secondary">Xem các gói và quyền lợi của tài khoản</p>
      </div>
      <Link
        href="/paywall"
        className="inline-flex min-h-11 items-center self-start rounded-full bg-card px-5 text-callout font-bold shadow-[inset_0_0_0_1.5px_var(--color-card-border)] text-text no-underline active:scale-[0.97] transition-press motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        Xem gói
      </Link>
    </Card>
  );
}

/** The Cài đặt tab (IA v2): the profile card, "Của bạn" (targets, account), app settings, Hỗ trợ, Pro and the danger zone. */
export function SettingsHomeScreen() {
  const { hydrated } = useDiary();
  const { account, loaded: accountLoaded } = useAccount();
  const { coach, level, role, available } = useCoaching();

  return (
    <>
      <AppHeader variant="tab" title="Cài đặt" layout="wide" alignGroup="settings-header" />

      <main className="mx-auto grid w-full max-w-[560px] grid-cols-1 items-start gap-4 px-4 pb-6 pt-4 lg:mx-0 lg:max-w-[1240px] lg:grid-cols-2 lg:px-8 lg:pb-12 lg:pt-5">
        {hydrated ? (
          <>
            <div className="flex flex-col gap-4">
              <ProfileHero />
              <Card as="section" aria-label="Của bạn" className="flex flex-col gap-1">
                <SectionHeader>Của bạn</SectionHeader>
                <SettingsRow dense tone="targets" glyph={SETTINGS_ICONS.target} label="Mục tiêu mỗi ngày" href="/settings/targets" data-align-group="settings-row" />
                {available && (
                  <SettingsRow
                    dense
                    tone="training"
                    glyph={SETTINGS_ICONS.account}
                    label="Huấn luyện viên"
                    hint={coach ? `${coach.name} · Level ${level}` : "Nhập mã để HLV theo dõi bạn"}
                    href="/settings/coach"
                    data-align-group="settings-row"
                  />
                )}
                {available && canManageClients(role) && (
                  <SettingsRow
                    dense
                    tone="training"
                    glyph={SETTINGS_ICONS.account}
                    label="Học viên"
                    hint="Level và nhật ký của học viên"
                    href="/coach"
                    data-align-group="settings-row"
                  />
                )}
                <SettingsRow
                  dense
                  tone="profile"
                  glyph={SETTINGS_ICONS.account}
                  label="Tài khoản"
                  hint={accountLoaded ? (account?.email ?? "Chưa đăng nhập") : undefined}
                  href="/settings/account"
                  data-align-group="settings-row"
                />
              </Card>
              <AppCard />
              <SupportCard />
            </div>

            {/* Desktop: the danger zone ends the right column, level with the end of the left one */}
            <div className="flex flex-col gap-4 lg:self-stretch">
              <ProOffer />
              <Card as="section" aria-labelledby="settings-danger-title" className="flex flex-col gap-1 lg:mt-auto">
                <SectionHeader id="settings-danger-title" className="text-destructive-text!">
                  Vùng nguy hiểm
                </SectionHeader>
                <SettingsRow
                  dense
                  tone="privacy"
                  glyph={SETTINGS_ICONS.trash}
                  label={<span className="text-destructive-text">Xóa tài khoản</span>}
                  hint="Có bước xác nhận trước khi xóa"
                  href="/settings/delete-account"
                  data-align-group="settings-row"
                />
              </Card>
            </div>
          </>
        ) : (
          <div aria-busy="true" aria-live="polite" className="flex flex-col gap-4 lg:col-span-2">
            <div className="h-[160px] rounded-card bg-divider animate-pulse motion-reduce:animate-none" />
            <div className="h-[120px] rounded-card bg-divider animate-pulse motion-reduce:animate-none" />
            <div className="h-[200px] rounded-card bg-divider animate-pulse motion-reduce:animate-none" />
          </div>
        )}
      </main>
    </>
  );
}
