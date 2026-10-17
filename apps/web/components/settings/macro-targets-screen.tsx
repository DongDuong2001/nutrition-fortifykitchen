"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { PillButton } from "@/components/ui/pill-button";
import { SectionTitle } from "@/components/ui/section-title";
import { useDiary } from "@/lib/diary-store";
import { formatAmount, formatNumber } from "@/lib/format";
import {
  calculateMacrosFromFixed,
  calculateMacrosFromRatios,
  MACRO_PRESETS,
  type MacroFixedGrams,
  type MacroRatios,
  type MacroTargetMode,
} from "@/lib/targets";

export function MacroTargetsScreen() {
  const router = useRouter();
  const { profile, targets, hydrated, updateProfile } = useDiary();

  // Mode: "ratios" | "fixed" | "keto" | "default"
  const [mode, setMode] = useState<MacroTargetMode>(profile.macroMode ?? "ratios");
  const [savedToast, setSavedToast] = useState(false);

  // Ratios state
  const defaultRatios: MacroRatios = profile.macroRatios ?? { proteinPct: 25, carbsPct: 55, fatPct: 20 };
  const [proteinPct, setProteinPct] = useState<number>(defaultRatios.proteinPct);
  const [carbsPct, setCarbsPct] = useState<number>(defaultRatios.carbsPct);
  const [fatPct, setFatPct] = useState<number>(defaultRatios.fatPct);

  // Fixed grams state
  const defaultFixed: MacroFixedGrams = profile.macroFixed ?? {
    proteinGrams: targets.protein.min,
    carbsGrams: targets.carbs.min,
    fatGrams: targets.fat.min,
  };
  const [fixedProtein, setFixedProtein] = useState<number>(defaultFixed.proteinGrams);
  const [fixedCarbs, setFixedCarbs] = useState<number>(defaultFixed.carbsGrams);
  const [fixedFat, setFixedFat] = useState<number>(defaultFixed.fatGrams);

  // Energy target
  const baseEnergy = targets.calories.min;
  const energyKcal = profile.customEnergyKcal ?? baseEnergy;

  // Calculations
  const currentRatios: MacroRatios =
    mode === "keto" ? MACRO_PRESETS.keto.ratios : { proteinPct, carbsPct, fatPct };
  const ratioCalc = calculateMacrosFromRatios(energyKcal, currentRatios);
  const fixedCalc = calculateMacrosFromFixed({
    proteinGrams: fixedProtein,
    carbsGrams: fixedCarbs,
    fatGrams: fixedFat,
  });

  const totalPct = mode === "fixed" ? 100 : ratioCalc.totalPct;
  const isRatioValid = totalPct === 100;

  function handlePreset(presetKey: string) {
    const preset = MACRO_PRESETS[presetKey];
    if (!preset) return;
    setMode("ratios");
    setProteinPct(preset.ratios.proteinPct);
    setCarbsPct(preset.ratios.carbsPct);
    setFatPct(preset.ratios.fatPct);
  }

  function handleSave() {
    if (mode === "ratios" && !isRatioValid) return;

    if (mode === "default") {
      updateProfile({
        macroMode: "default",
        macroRatios: undefined,
        macroFixed: undefined,
      });
    } else if (mode === "fixed") {
      updateProfile({
        macroMode: "fixed",
        macroFixed: { proteinGrams: fixedProtein, carbsGrams: fixedCarbs, fatGrams: fixedFat },
        customEnergyKcal: fixedCalc.totalKcal,
      });
    } else if (mode === "keto") {
      updateProfile({
        macroMode: "keto",
        macroRatios: MACRO_PRESETS.keto.ratios,
      });
    } else {
      updateProfile({
        macroMode: "ratios",
        macroRatios: { proteinPct, carbsPct, fatPct },
      });
    }

    setSavedToast(true);
    setTimeout(() => {
      router.push("/settings/targets");
    }, 600);
  }

  function handleResetDefault() {
    setMode("default");
    setProteinPct(25);
    setCarbsPct(55);
    setFatPct(20);
    updateProfile({
      macroMode: "default",
      macroRatios: undefined,
      macroFixed: undefined,
      customEnergyKcal: undefined,
    });
    setSavedToast(true);
    setTimeout(() => {
      router.push("/settings/targets");
    }, 600);
  }

  if (!hydrated) {
    return (
      <AppShell alignContainer="macro-targets-page">
        <AppHeader variant="sub" title="Mục tiêu đa lượng" backHref="/settings/targets" layout="wide" />
        <main className="mx-auto w-full max-w-[560px] p-4 lg:mx-0 lg:max-w-[1240px] lg:p-8">
          <div className="h-64 rounded-2xl bg-divider animate-pulse motion-reduce:animate-none" />
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell alignContainer="macro-targets-page">
      <AppHeader
        variant="sub"
        title="Mục tiêu đa lượng"
        subtitle="Chia tỉ lệ đạm, tinh bột và chất béo theo mục tiêu của bạn"
        backHref="/settings/targets"
        layout="wide"
        alignGroup="macro-targets-header"
      />

      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 pb-12 pt-4 lg:mx-0 lg:max-w-[780px] lg:px-8 lg:pt-6">
        {savedToast && (
          <div role="status" aria-live="polite" className="rounded-xl bg-blue/20 border border-blue px-4 py-3 text-[14px] font-bold text-sky">
            Đã lưu mục tiêu đa lượng mới
          </div>
        )}

        {/* Thẻ mục tiêu năng lượng */}
        <Card as="section" aria-labelledby="energy-target-title" className="flex flex-col gap-2">
          <SectionTitle id="energy-target-title">Mục tiêu năng lượng</SectionTitle>
          <div className="flex items-baseline justify-between py-1">
            <span className="text-[14px] text-secondary">Năng lượng mục tiêu</span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-[28px] font-extrabold leading-none tabular-nums text-text">
                {formatNumber(mode === "fixed" ? fixedCalc.totalKcal : energyKcal)}
              </span>
              <span className="text-[15px] font-semibold text-secondary">kcal</span>
            </div>
          </div>
          <p className="m-0 text-[13px] leading-relaxed text-secondary border-t border-divider pt-2">
            Tính từ hồ sơ ({formatNumber(profile.weightKg)} kg) và mục tiêu thể trạng. Số kcal này dùng làm cơ sở chia các chất đa lượng.
          </p>
        </Card>

        {/* Thẻ chỉnh Macro Targets */}
        <Card as="section" aria-labelledby="macro-settings-title" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <SectionTitle id="macro-settings-title">Chia theo đa lượng</SectionTitle>
            <span className="text-[13px] text-secondary">Chọn phương pháp phân bổ dinh dưỡng đa lượng</span>
          </div>

          {/* Segmented control: Tỉ lệ | Cố định | Keto */}
          <div role="tablist" aria-label="Cách chia đa lượng" className="grid grid-cols-3 gap-1 rounded-xl bg-page p-1 border border-card-border">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "ratios"}
              onClick={() => setMode("ratios")}
              className={`min-h-11 rounded-lg text-[13px] font-bold transition-all ${
                mode === "ratios" ? "bg-card text-text shadow-sm" : "bg-transparent text-secondary hover:text-text"
              }`}
            >
              Tỉ lệ
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "fixed"}
              onClick={() => setMode("fixed")}
              className={`min-h-11 rounded-lg text-[13px] font-bold transition-all ${
                mode === "fixed" ? "bg-card text-text shadow-sm" : "bg-transparent text-secondary hover:text-text"
              }`}
            >
              Cố định
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "keto"}
              onClick={() => setMode("keto")}
              className={`min-h-11 rounded-lg text-[13px] font-bold transition-all ${
                mode === "keto" ? "bg-card text-text shadow-sm" : "bg-transparent text-secondary hover:text-text"
              }`}
            >
              Keto
            </button>
          </div>

          <p className="m-0 text-[13px] leading-snug text-secondary">
            {mode === "ratios" &&
              "Tỉ lệ chia năng lượng thành đạm, tinh bột và chất béo. Khi cân nặng thay đổi, số gram tự cập nhật để giữ vững tỉ lệ này."}
            {mode === "fixed" &&
              "Cố định trực tiếp số gram đạm, tinh bột và chất béo mỗi ngày. Tổng năng lượng sẽ được tính tự động từ số gram này."}
            {mode === "keto" &&
              "Chế độ Keto phân bổ năng lượng cực thấp từ tinh bột (5%), vừa phải đạm (20%) và rất giàu chất béo (75%)."}
          </p>

          {/* 3 Hàng Macro: Đạm, Tinh bột, Béo */}
          <div className="flex flex-col divide-y divide-divider border-t border-b border-divider">
            {/* Đạm */}
            <div className="flex min-h-[56px] items-center justify-between gap-3 py-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="h-3 w-3 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
                <div className="flex flex-col">
                  <span className="text-[15px] font-bold text-text">Đạm</span>
                  <span className="text-[13px] tabular-nums text-secondary">
                    {mode === "fixed" ? `${formatNumber(fixedCalc.proteinKcal)} kcal` : `${formatNumber(ratioCalc.proteinKcal)} kcal`}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="font-display text-[16px] font-bold tabular-nums text-text">
                  {mode === "fixed" ? `${formatAmount(fixedProtein, "g")} g` : `${formatAmount(ratioCalc.protein.min, "g")} g`}
                </span>

                {mode === "ratios" && (
                  <div className="flex items-center gap-1 rounded-lg border border-card-border bg-page px-2 py-1">
                    <input
                      type="number"
                      min="5"
                      max="80"
                      step="1"
                      aria-label="Tỉ lệ phần trăm đạm"
                      value={proteinPct}
                      onChange={(e) => setProteinPct(Number(e.target.value) || 0)}
                      className="w-10 border-0 bg-transparent text-center font-display text-[15px] font-bold tabular-nums text-text focus:outline-none"
                    />
                    <span className="text-xs font-semibold text-secondary">%</span>
                  </div>
                )}

                {mode === "fixed" && (
                  <div className="flex items-center gap-1 rounded-lg border border-card-border bg-page px-2 py-1">
                    <input
                      type="number"
                      min="10"
                      max="400"
                      step="1"
                      aria-label="Số gram đạm cố định"
                      value={fixedProtein}
                      onChange={(e) => setFixedProtein(Number(e.target.value) || 0)}
                      className="w-12 border-0 bg-transparent text-center font-display text-[15px] font-bold tabular-nums text-text focus:outline-none"
                    />
                    <span className="text-xs font-semibold text-secondary">g</span>
                  </div>
                )}

                {mode === "keto" && (
                  <span className="rounded-lg border border-card-border bg-page px-2.5 py-1 text-xs font-bold text-secondary">
                    20 %
                  </span>
                )}
              </div>
            </div>

            {/* Tinh bột */}
            <div className="flex min-h-[56px] items-center justify-between gap-3 py-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="h-3 w-3 shrink-0 rounded-full bg-sky" aria-hidden="true" />
                <div className="flex flex-col">
                  <span className="text-[15px] font-bold text-text">Tinh bột</span>
                  <span className="text-[13px] tabular-nums text-secondary">
                    {mode === "fixed" ? `${formatNumber(fixedCalc.carbsKcal)} kcal` : `${formatNumber(ratioCalc.carbsKcal)} kcal`}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="font-display text-[16px] font-bold tabular-nums text-text">
                  {mode === "fixed" ? `${formatAmount(fixedCarbs, "g")} g` : `${formatAmount(ratioCalc.carbs.min, "g")} g`}
                </span>

                {mode === "ratios" && (
                  <div className="flex items-center gap-1 rounded-lg border border-card-border bg-page px-2 py-1">
                    <input
                      type="number"
                      min="5"
                      max="85"
                      step="1"
                      aria-label="Tỉ lệ phần trăm tinh bột"
                      value={carbsPct}
                      onChange={(e) => setCarbsPct(Number(e.target.value) || 0)}
                      className="w-10 border-0 bg-transparent text-center font-display text-[15px] font-bold tabular-nums text-text focus:outline-none"
                    />
                    <span className="text-xs font-semibold text-secondary">%</span>
                  </div>
                )}

                {mode === "fixed" && (
                  <div className="flex items-center gap-1 rounded-lg border border-card-border bg-page px-2 py-1">
                    <input
                      type="number"
                      min="10"
                      max="600"
                      step="1"
                      aria-label="Số gram tinh bột cố định"
                      value={fixedCarbs}
                      onChange={(e) => setFixedCarbs(Number(e.target.value) || 0)}
                      className="w-12 border-0 bg-transparent text-center font-display text-[15px] font-bold tabular-nums text-text focus:outline-none"
                    />
                    <span className="text-xs font-semibold text-secondary">g</span>
                  </div>
                )}

                {mode === "keto" && (
                  <span className="rounded-lg border border-card-border bg-page px-2.5 py-1 text-xs font-bold text-secondary">
                    5 %
                  </span>
                )}
              </div>
            </div>

            {/* Chất béo */}
            <div className="flex min-h-[56px] items-center justify-between gap-3 py-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="h-3 w-3 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
                <div className="flex flex-col">
                  <span className="text-[15px] font-bold text-text">Chất béo</span>
                  <span className="text-[13px] tabular-nums text-secondary">
                    {mode === "fixed" ? `${formatNumber(fixedCalc.fatKcal)} kcal` : `${formatNumber(ratioCalc.fatKcal)} kcal`}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="font-display text-[16px] font-bold tabular-nums text-text">
                  {mode === "fixed" ? `${formatAmount(fixedFat, "g")} g` : `${formatAmount(ratioCalc.fat.min, "g")} g`}
                </span>

                {mode === "ratios" && (
                  <div className="flex items-center gap-1 rounded-lg border border-card-border bg-page px-2 py-1">
                    <input
                      type="number"
                      min="5"
                      max="80"
                      step="1"
                      aria-label="Tỉ lệ phần trăm chất béo"
                      value={fatPct}
                      onChange={(e) => setFatPct(Number(e.target.value) || 0)}
                      className="w-10 border-0 bg-transparent text-center font-display text-[15px] font-bold tabular-nums text-text focus:outline-none"
                    />
                    <span className="text-xs font-semibold text-secondary">%</span>
                  </div>
                )}

                {mode === "fixed" && (
                  <div className="flex items-center gap-1 rounded-lg border border-card-border bg-page px-2 py-1">
                    <input
                      type="number"
                      min="10"
                      max="300"
                      step="1"
                      aria-label="Số gram chất béo cố định"
                      value={fixedFat}
                      onChange={(e) => setFixedFat(Number(e.target.value) || 0)}
                      className="w-12 border-0 bg-transparent text-center font-display text-[15px] font-bold tabular-nums text-text focus:outline-none"
                    />
                    <span className="text-xs font-semibold text-secondary">g</span>
                  </div>
                )}

                {mode === "keto" && (
                  <span className="rounded-lg border border-card-border bg-page px-2.5 py-1 text-xs font-bold text-secondary">
                    75 %
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Hàng tổng phần trăm và cảnh báo */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[14px] font-bold text-text">Tổng tỉ lệ phần trăm</span>
            <div className="flex items-center gap-2">
              <span
                className={`font-display text-[16px] font-extrabold tabular-nums ${
                  isRatioValid ? "text-emerald-500" : "text-destructive-text"
                }`}
              >
                {formatNumber(totalPct)},0 %
              </span>
            </div>
          </div>

          {mode === "ratios" && !isRatioValid && (
            <p className="m-0 text-[13px] font-semibold text-destructive-text">
              Tổng ba tỉ lệ phải bằng đúng 100% (hiện tại: {totalPct}%). Hãy điều chỉnh lại các ô nhập.
            </p>
          )}

          {/* Gợi ý tỉ lệ nhanh (Presets) */}
          <div className="flex flex-col gap-2 pt-2 border-t border-divider">
            <span className="text-[13px] font-semibold text-secondary">Gợi ý tỉ lệ phổ biến</span>
            <div className="flex flex-wrap gap-2">
              {Object.entries(MACRO_PRESETS).map(([key, p]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handlePreset(key)}
                  className="inline-flex min-h-[36px] items-center rounded-full border border-card-border bg-card px-3 text-xs font-bold text-text hover:bg-page active:scale-[0.97]"
                >
                  {p.name} ({p.ratios.proteinPct}/{p.ratios.carbsPct}/{p.ratios.fatPct})
                </button>
              ))}
            </div>
          </div>

          {/* Nút hành động */}
          <div className="flex flex-col gap-2 pt-4">
            <PillButton type="button" variant="primary" disabled={mode === "ratios" && !isRatioValid} onClick={handleSave}>
              Lưu mục tiêu đa lượng
            </PillButton>
            <PillButton type="button" variant="secondary" onClick={handleResetDefault}>
              Khôi phục mặc định theo HLV
            </PillButton>
          </div>
        </Card>
      </main>
    </AppShell>
  );
}
