"use client";

import React, { useState, useEffect } from "react";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { useBack } from "@/hooks/use-back";
import {
  loadSettings,
  saveSettings,
  DEFAULT_SETTINGS,
  type AppSettings,
} from "@/lib/settings";

interface RadioOption<K extends string> {
  id: K;
  label: string;
}

/** One group of choices (V3Language): a white card, a Saira section header and 56 px radio rows with a cobalt check on the chosen one. */
function RadioCard<K extends string>({
  titleId,
  title,
  options,
  value,
  onChange,
}: {
  titleId: string;
  title: string;
  options: RadioOption<K>[];
  value: K;
  onChange: (id: K) => void;
}) {
  return (
    <Card as="section" padding={false} className="px-4 pt-3 pb-0">
      <SectionTitle id={titleId} className="mb-2">
        {title}
      </SectionTitle>
      <div role="radiogroup" aria-labelledby={titleId}>
        {options.map((r) => {
          const isSelected = value === r.id;
          return (
            <button
              key={r.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              data-align-group="language-row"
              onClick={() => onChange(r.id)}
              className="m-tint flex min-h-14 w-full cursor-pointer items-center gap-3 border-0 border-t border-divider bg-transparent py-2 text-left text-body-lg font-semibold text-text first:border-t-0"
            >
              <span className="flex-1">{r.label}</span>
              <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center">
                {isSelected && (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-cobalt">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

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
