"use client";

import React, { useState, useEffect } from "react";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { RadioCard } from "@/components/settings/radio-card";
import { useBack } from "@/hooks/use-back";
import {
  loadSettings,
  saveSettings,
  DEFAULT_SETTINGS,
  type AppSettings,
} from "@/lib/settings";

export default function LanguageSettingsPage() {
  const goBack = useBack();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const handleUpdate = (partial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveSettings(partial);
      return next;
    });
  };

  return (
    <AppShell>
      <AppHeader
        variant="sub"
        title="Ngôn ngữ"
        onBack={goBack}
        backLabel="Quay lại"
        alignGroup="settings-header"
      />

      <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col gap-3 px-4 pb-8 pt-4">
        <RadioCard
          titleId="lg-label"
          title="Ngôn ngữ"
          options={[
            { id: "vi", label: "Tiếng Việt" },
            { id: "en", label: "English" },
          ]}
          value={settings.language}
          onChange={(language) => handleUpdate({ language })}
        />

        <RadioCard
          titleId="dc-label"
          title="Đơn vị · Dấu thập phân"
          options={[
            { id: "comma", label: "Dấu phẩy (2,5)" },
            { id: "dot", label: "Dấu chấm (2.5)" },
          ]}
          value={settings.decimalSeparator}
          onChange={(decimalSeparator) => handleUpdate({ decimalSeparator })}
        />

        <RadioCard
          titleId="en-label"
          title="Đơn vị · Năng lượng"
          options={[
            { id: "kcal", label: "kcal" },
            { id: "kJ", label: "kJ" },
          ]}
          value={settings.energyUnit}
          onChange={(energyUnit) => handleUpdate({ energyUnit })}
        />

        <div role="status" className="pt-1 text-center text-cap text-secondary">
          Tự động lưu
        </div>
      </main>
    </AppShell>
  );
}
