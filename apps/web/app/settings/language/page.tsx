"use client";

import React, { useState, useEffect } from "react";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
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

      <main className="flex-1 w-full max-w-[560px] mx-auto px-4 pt-4 pb-8 flex flex-col gap-3">
        {/* Section 1: Ngôn ngữ */}
        <section className="bg-card border border-card-border rounded-[18px] lg:shadow-card px-4 pt-2 pb-0.5">
          <h2 id="lg-label" className="m-0 mb-0.5 text-[13px] font-semibold text-secondary">
            Ngôn ngữ
          </h2>
          <div role="radiogroup" aria-labelledby="lg-label">
            {[
              { id: "vi", label: "Tiếng Việt" },
              { id: "en", label: "English" },
            ].map((r) => {
              const isSelected = settings.language === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handleUpdate({ language: r.id as "vi" | "en" })}
                  className="w-full text-left border-0 border-t border-divider first:border-t-0 bg-transparent text-text min-h-[56px] py-1.5 flex items-center justify-between gap-3 text-base cursor-pointer active:scale-[0.99] transition-transform"
                >
                  <span className="flex-1 font-medium">{r.label}</span>
                  <span
                    aria-hidden="true"
                    className="w-6 h-6 flex items-center justify-center shrink-0"
                  >
                    {isSelected && (
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-blue"
                      >
                        <path d="M5 12.5l4.5 4.5L19 7.5" />
                      </svg>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 2: Đơn vị · Dấu thập phân */}
        <section className="bg-card border border-card-border rounded-[18px] lg:shadow-card px-4 pt-2 pb-0.5">
          <h2 id="dc-label" className="m-0 mb-0.5 text-[13px] font-semibold text-secondary">
            Đơn vị · Dấu thập phân
          </h2>
          <div role="radiogroup" aria-labelledby="dc-label">
            {[
              { id: "comma", label: "Dấu phẩy (2,5)" },
              { id: "dot", label: "Dấu chấm (2.5)" },
            ].map((r) => {
              const isSelected = settings.decimalSeparator === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() =>
                    handleUpdate({ decimalSeparator: r.id as "comma" | "dot" })
                  }
                  className="w-full text-left border-0 border-t border-divider first:border-t-0 bg-transparent text-text min-h-[56px] py-1.5 flex items-center justify-between gap-3 text-base cursor-pointer active:scale-[0.99] transition-transform"
                >
                  <span className="flex-1 font-medium">{r.label}</span>
                  <span
                    aria-hidden="true"
                    className="w-6 h-6 flex items-center justify-center shrink-0"
                  >
                    {isSelected && (
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-blue"
                      >
                        <path d="M5 12.5l4.5 4.5L19 7.5" />
                      </svg>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 3: Đơn vị · Năng lượng */}
        <section className="bg-card border border-card-border rounded-[18px] lg:shadow-card px-4 pt-2 pb-0.5">
          <h2 id="en-label" className="m-0 mb-0.5 text-[13px] font-semibold text-secondary">
            Đơn vị · Năng lượng
          </h2>
          <div role="radiogroup" aria-labelledby="en-label">
            {[
              { id: "kcal", label: "kcal" },
              { id: "kJ", label: "kJ" },
            ].map((r) => {
              const isSelected = settings.energyUnit === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() =>
                    handleUpdate({ energyUnit: r.id as "kcal" | "kJ" })
                  }
                  className="w-full text-left border-0 border-t border-divider first:border-t-0 bg-transparent text-text min-h-[56px] py-1.5 flex items-center justify-between gap-3 text-base cursor-pointer active:scale-[0.99] transition-transform"
                >
                  <span className="flex-1 font-medium">{r.label}</span>
                  <span
                    aria-hidden="true"
                    className="w-6 h-6 flex items-center justify-center shrink-0"
                  >
                    {isSelected && (
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-blue"
                      >
                        <path d="M5 12.5l4.5 4.5L19 7.5" />
                      </svg>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <div role="status" className="text-[13px] text-secondary text-center pt-1">
          Tự động lưu
        </div>
      </main>
    </AppShell>
  );
}
