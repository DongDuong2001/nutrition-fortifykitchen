"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { RadioCard } from "@/components/settings/radio-card";
import { useBack } from "@/hooks/use-back";
import { THEME_CHOICES, darkModeEnabled, loadThemeChoice, saveThemeChoice, type ThemeChoice } from "@/lib/theme";

/**
 * Cài đặt › Giao diện (job 14, behind the dark mode flag): Hệ thống / Sáng / Tối, kept on this device and applied at
 * once. With the flag off the page does not exist for the user (no row links here, and a typed URL is a 404).
 */
export default function AppearanceSettingsPage() {
  const goBack = useBack();
  const [choice, setChoice] = useState<ThemeChoice | null>(null);
  const [enabled, setEnabled] = useState(true);
  useEffect(() => {
    setEnabled(darkModeEnabled());
    setChoice(loadThemeChoice());
  }, []);
  if (!enabled) notFound();

  return (
    <AppShell>
      <AppHeader variant="sub" title="Giao diện" onBack={goBack} backLabel="Quay lại" alignGroup="settings-header" />
      <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col gap-3 px-4 pb-8 pt-4">
        {choice && (
          <RadioCard
            titleId="theme-label"
            title="Giao diện"
            alignGroup="theme-row"
            options={THEME_CHOICES}
            value={choice}
            onChange={(next) => {
              saveThemeChoice(next);
              setChoice(next);
            }}
          />
        )}
        <p className="m-0 px-1 text-cap text-secondary">Hệ thống: sáng hoặc tối theo cài đặt của điện thoại.</p>
      </main>
    </AppShell>
  );
}
