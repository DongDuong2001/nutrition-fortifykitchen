"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { PillButton } from "@/components/ui/pill-button";
import { SectionTitle } from "@/components/ui/section-title";
import { Segmented } from "@/components/ui/segmented";
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
import { cue } from "@/lib/cue";


/**
 * cc-64 (N9): a whole-number field that keeps what is typed (clearing it does not snap to 0) and commits a number,
 * clamped to min–max, when it loses focus. A text field with the numeric keypad, not type="number".
 */
function NumberField({ value, onCommit, min, max, className, "aria-label": ariaLabel }: { value: number; onCommit: (n: number) => void; min: number; max: number; className: string; "aria-label": string }) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  const shown = focused ? text : String(value);
  return (
    <input
      type="text"
      inputMode="numeric"
      enterKeyHint="done"
      autoComplete="off"
      aria-label={ariaLabel}
      value={shown}
      onFocus={() => {
        setText(String(value));
        setFocused(true);
      }}
      onChange={(e) => setText(e.target.value.replace(/[^0-9]/g, ""))}
      onBlur={() => {
        setFocused(false);
        const n = Number(text);
        if (text !== "" && Number.isFinite(n)) onCommit(Math.min(max, Math.max(min, Math.round(n))));
      }}
      // 16 px at least (iOS zooms into smaller fields); the call sites pass text-base too
      className={`text-base ${className}`}
    />
  );
}


type MacroTone = "dam" | "tinhbot" | "beo";
/** V3-SPEC §1: a macro's identity colour on its dot, its grams and its slider fill (the deep shade; classes are written out so Tailwind finds them). */
const MACRO_TONE: Record<MacroTone, { dot: string; text: string }> = {
  dam: { dot: "bg-macro-dam-text", text: "text-macro-dam-text" },
  tinhbot: { dot: "bg-macro-tinhbot-text", text: "text-macro-tinhbot-text" },
  beo: { dot: "bg-macro-beo-text", text: "text-macro-beo-text" },
};

const STEP_BUTTON =
  "flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-surface p-0 text-text active:scale-[0.97] transition-press motion-reduce:active:scale-100 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-cobalt";

/**
 * The slider of a ratio row (V3Macros): an 8 px track in the macro's colour, a 28 px white thumb in a 44 px hit area. A custom
 * role="slider" like the design's: arrows step by 1, Page keys by 5, Home and End jump to the ends; a drag follows the pointer.
 */
function RatioSlider({ value, min, max, onChange, label, tone }: { value: number; min: number; max: number; onChange: (n: number) => void; label: string; tone: MacroTone }) {
  const track = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const pos = ((value - min) / (max - min)) * 100;
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n)));
  const fromPointer = (clientX: number) => {
    const rect = track.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    onChange(clamp(min + ((clientX - rect.left) / rect.width) * (max - min)));
  };
  return (
    <div className="grid grid-cols-[28px_minmax(0,1fr)_32px] items-center gap-1">
      <span className="text-xs tabular-nums text-secondary">{min}%</span>
      <div
        ref={track}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${value} phần trăm`}
        style={{ touchAction: "pan-y" }}
        className="relative mx-[14px] h-11 cursor-pointer select-none rounded-full focus-visible:outline-cobalt"
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          fromPointer(e.clientX);
        }}
        onPointerMove={(e) => dragging.current && fromPointer(e.clientX)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
        onKeyDown={(e) => {
          const step = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -5, PageUp: 5 }[e.key];
          if (step !== undefined) onChange(clamp(value + step));
          else if (e.key === "Home") onChange(min);
          else if (e.key === "End") onChange(max);
          else return;
          e.preventDefault();
        }}
      >
        <div aria-hidden="true" className="absolute -left-[14px] -right-[14px] top-[18px] h-2 rounded-full bg-track" />
        <div aria-hidden="true" style={{ width: `calc(${pos}% + 14px)` }} className={`absolute -left-[14px] top-[18px] h-2 rounded-full ${MACRO_TONE[tone].dot}`} />
        <div aria-hidden="true" style={{ left: `${pos}%` }} className="absolute top-2 -ml-[14px] h-7 w-7 rounded-full border border-card-border bg-card shadow-md" />
      </div>
      <span className="text-right text-xs tabular-nums text-secondary">{max}%</span>
    </div>
  );
}

function MacroRowName({ name, tone, grams, kcal }: { name: string; tone: MacroTone; grams: string; kcal: number }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-callout font-bold text-text">
        <span aria-hidden="true" className={`mr-2 inline-block h-2 w-2 rounded-full align-[1px] ${MACRO_TONE[tone].dot}`} />
        {name}
      </span>
      <span className="text-cap tabular-nums text-secondary">
        <span className={`font-bold ${MACRO_TONE[tone].text}`}>{grams}</span> · {formatNumber(kcal)} kcal
      </span>
    </div>
  );
}

/** The V3 header of this screen: Huỷ on the leading side and Lưu on the trailing side of the title (an edit screen, as in V3Macros). */
function MacroHeader({ onSave, saveDisabled }: { onSave?: () => void; saveDisabled?: boolean }) {
  return (
    <AppHeader
      variant="sub"
      title="Mục tiêu đa lượng"
      lead={
        <Link href="/settings/targets" className="inline-flex h-11 w-16 items-center justify-center rounded-full bg-fill text-callout font-semibold text-text no-underline active:scale-[0.97] transition-press motion-reduce:active:scale-100 focus-visible:outline-cobalt">
          Huỷ
        </Link>
      }
      actions={
        onSave ? (
          <button
            type="button"
            onClick={onSave}
            disabled={saveDisabled}
            className="inline-flex h-11 w-16 cursor-pointer items-center justify-center rounded-full border-0 bg-cobalt p-0 text-callout font-bold text-on-accent active:scale-[0.97] transition-press motion-reduce:active:scale-100 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-cobalt"
          >
            Lưu<span className="sr-only"> mục tiêu đa lượng</span>
          </button>
        ) : undefined
      }
      layout="wide"
      alignGroup="macro-targets-header"
    />
  );
}

/**
 * fix/macro-split-save: the form mounts only once the store has loaded the saved profile, so its fields start from the
 * saved split (before, they started from the sample profile's 25/55/20 and never caught up).
 */
export function MacroTargetsScreen() {
  const { hydrated } = useDiary();
  if (!hydrated) {
    return (
      <AppShell alignContainer="macro-targets-page">
        <MacroHeader />
        <main className="mx-auto w-full max-w-[560px] p-4 lg:mx-0 lg:max-w-[780px] lg:p-8">
          <div className="h-64 rounded-card bg-divider animate-pulse motion-reduce:animate-none" />
        </main>
      </AppShell>
    );
  }
  return <MacroTargetsForm />;
}

function MacroTargetsForm() {
  const router = useRouter();
  const { profile, targets, updateProfile, notify } = useDiary();

  // Mode: "ratios" | "fixed" | "keto" | "default"
  const [mode, setMode] = useState<MacroTargetMode>(profile.macroMode ?? "ratios");

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

    // cc-64 (A3): the app's toast, which stays while the screen goes back to Mục tiêu
    cue("save");
    notify("Đã lưu mục tiêu đa lượng mới");
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
    // cc-64 (A3): the app's toast, which stays while the screen goes back to Mục tiêu
    cue("save");
    notify("Đã lưu mục tiêu đa lượng mới");
    setTimeout(() => {
      router.push("/settings/targets");
    }, 600);
  }

  const shownKcal = mode === "fixed" ? fixedCalc.totalKcal : energyKcal;
  const rows: {
    tone: MacroTone;
    name: string;
    word: string;
    pct: number;
    setPct: (n: number) => void;
    pctRange: [number, number];
    fixed: number;
    setFixed: (n: number) => void;
    fixedRange: [number, number];
    ratioGrams: number;
    ratioKcal: number;
    fixedKcal: number;
    fixedAria: string;
    ketoPct: number;
  }[] = [
    { tone: "dam", name: "Đạm", word: "đạm", pct: proteinPct, setPct: setProteinPct, pctRange: [5, 80], fixed: fixedProtein, setFixed: setFixedProtein, fixedRange: [10, 400], ratioGrams: ratioCalc.protein.min, ratioKcal: ratioCalc.proteinKcal, fixedKcal: fixedCalc.proteinKcal, fixedAria: "Số gram đạm cố định", ketoPct: 20 },
    { tone: "tinhbot", name: "Tinh bột", word: "tinh bột", pct: carbsPct, setPct: setCarbsPct, pctRange: [5, 85], fixed: fixedCarbs, setFixed: setFixedCarbs, fixedRange: [10, 600], ratioGrams: ratioCalc.carbs.min, ratioKcal: ratioCalc.carbsKcal, fixedKcal: fixedCalc.carbsKcal, fixedAria: "Số gram tinh bột cố định", ketoPct: 5 },
    { tone: "beo", name: "Chất béo", word: "chất béo", pct: fatPct, setPct: setFatPct, pctRange: [5, 80], fixed: fixedFat, setFixed: setFixedFat, fixedRange: [10, 300], ratioGrams: ratioCalc.fat.min, ratioKcal: ratioCalc.fatKcal, fixedKcal: fixedCalc.fatKcal, fixedAria: "Số gram chất béo cố định", ketoPct: 75 },
  ];
  const presetOn = (r: MacroRatios) => mode === "ratios" && proteinPct === r.proteinPct && carbsPct === r.carbsPct && fatPct === r.fatPct;
  const FIELD = "h-11 rounded-[10px] border-0 bg-surface text-center font-bold tabular-nums text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-cobalt";

  return (
    <AppShell alignContainer="macro-targets-page">
      <MacroHeader onSave={handleSave} saveDisabled={mode === "ratios" && !isRatioValid} />

      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 pb-12 pt-0 lg:mx-0 lg:max-w-[780px] lg:px-8 lg:pt-6">
        {/* The subtitle sits under the title, aligned to it (Huỷ 64 px + 12 px gap) */}
        <p className="m-0 pl-[76px] text-callout leading-snug text-secondary">Chia tỉ lệ đạm, tinh bột và chất béo theo mục tiêu của bạn</p>

        {/* Thẻ mục tiêu năng lượng */}
        <Card as="section" aria-labelledby="energy-target-title" className="flex flex-col gap-2">
          <SectionTitle id="energy-target-title">Mục tiêu năng lượng</SectionTitle>
          <div className="flex items-baseline justify-between py-1">
            <span className="text-sm text-secondary">Năng lượng mục tiêu</span>
            <div className="flex items-baseline gap-2 text-cobalt">
              <span className="font-display text-headline italic font-extrabold leading-none tabular-nums">{formatNumber(shownKcal)}</span>
              <span className="text-callout font-semibold">kcal</span>
            </div>
          </div>
          <p className="m-0 border-t border-divider pt-2 text-cap leading-snug text-secondary">
            Tính từ hồ sơ ({formatNumber(profile.weightKg)} kg) và mục tiêu thể trạng. Số kcal này dùng làm cơ sở chia các chất đa lượng.
          </p>
        </Card>

        {/* Thẻ chỉnh Macro Targets */}
        <Card as="section" aria-labelledby="macro-settings-title" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <SectionTitle id="macro-settings-title">Chia theo đa lượng</SectionTitle>
            <span className="text-cap text-secondary">Chọn phương pháp phân bổ dinh dưỡng đa lượng</span>
          </div>

          {/* Segmented control: Tỉ lệ | Cố định | Keto */}
          <Segmented<MacroTargetMode>
            label="Cách chia đa lượng"
            value={mode}
            onChange={setMode}
            items={[
              { key: "ratios", label: "Tỉ lệ" },
              { key: "fixed", label: "Cố định" },
              { key: "keto", label: "Keto" },
            ]}
            className="bg-surface!"
          />

          <p className="m-0 text-cap leading-snug text-secondary">
            {mode === "ratios" &&
              "Tỉ lệ chia năng lượng thành đạm, tinh bột và chất béo. Khi cân nặng thay đổi, số gram tự cập nhật để giữ vững tỉ lệ này."}
            {mode === "fixed" &&
              "Cố định trực tiếp số gram đạm, tinh bột và chất béo mỗi ngày. Tổng năng lượng sẽ được tính tự động từ số gram này."}
            {mode === "keto" &&
              "Chế độ Keto phân bổ năng lượng cực thấp từ tinh bột (5%), vừa phải đạm (20%) và rất giàu chất béo (75%)."}
          </p>

          {/* 3 hàng đa lượng: Đạm, Tinh bột, Chất béo */}
          <div>
            {rows.map((r, i) => {
              const grams = mode === "fixed" ? `${formatAmount(r.fixed, "g")} g` : `${formatAmount(r.ratioGrams, "g")} g`;
              const kcal = mode === "fixed" ? r.fixedKcal : r.ratioKcal;
              return (
                <div key={r.tone} data-align-group="macro-row" className={`flex flex-col gap-0.5 py-3 ${i === 0 ? "pt-0" : "border-t border-divider"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <MacroRowName name={r.name} tone={r.tone} grams={grams} kcal={kcal} />
                    <div className="flex shrink-0 items-center gap-1">
                      {mode === "ratios" && (
                        <>
                          <button type="button" aria-label={`Giảm tỉ lệ phần trăm ${r.word}`} disabled={r.pct <= r.pctRange[0]} onClick={() => r.setPct(Math.max(r.pctRange[0], r.pct - 1))} className={STEP_BUTTON}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                              <path d="M6 12h12" />
                            </svg>
                          </button>
                          <span className="flex items-center gap-0.5">
                            <NumberField min={r.pctRange[0]} max={r.pctRange[1]} aria-label={`Tỉ lệ phần trăm ${r.word}`} value={r.pct} onCommit={r.setPct} className={`w-[52px] ${FIELD}`} />
                            <span className="text-cap font-semibold text-secondary">%</span>
                          </span>
                          <button type="button" aria-label={`Tăng tỉ lệ phần trăm ${r.word}`} disabled={r.pct >= r.pctRange[1]} onClick={() => r.setPct(Math.min(r.pctRange[1], r.pct + 1))} className={STEP_BUTTON}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                              <path d="M12 6v12M6 12h12" />
                            </svg>
                          </button>
                        </>
                      )}
                      {mode === "fixed" && (
                        <span className="flex items-center gap-1">
                          <NumberField min={r.fixedRange[0]} max={r.fixedRange[1]} aria-label={r.fixedAria} value={r.fixed} onCommit={r.setFixed} className={`w-16 ${FIELD}`} />
                          <span className="text-cap font-semibold text-secondary">g</span>
                        </span>
                      )}
                      {mode === "keto" && <span className="inline-flex h-11 items-center rounded-[10px] bg-surface px-3 text-cap font-bold text-secondary">{r.ketoPct} %</span>}
                    </div>
                  </div>
                  {mode === "ratios" && <RatioSlider value={r.pct} min={r.pctRange[0]} max={r.pctRange[1]} onChange={r.setPct} label={`Tỉ lệ ${r.word}`} tone={r.tone} />}
                </div>
              );
            })}
          </div>

          {/* Tổng tỉ lệ và cảnh báo */}
          <div className="flex items-center justify-between gap-2 border-t border-divider pt-3">
            <span role="status" className={`flex items-center gap-1.5 text-callout font-bold ${isRatioValid ? "text-success" : "text-destructive-text"}`}>
              {isRatioValid && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              )}
              Tổng {formatNumber(totalPct)}%
            </span>
            <span className="text-cap font-semibold tabular-nums text-cobalt">{formatNumber(shownKcal)} kcal</span>
          </div>

          {mode === "ratios" && !isRatioValid && (
            <p className="m-0 text-cap font-semibold text-destructive-text">
              Tổng ba tỉ lệ phải bằng đúng 100% (hiện tại: {totalPct}%). Hãy điều chỉnh lại các ô nhập.
            </p>
          )}

          {/* Gợi ý tỉ lệ nhanh (Presets) */}
          <div className="flex flex-col gap-2 border-t border-divider pt-4">
            <SectionTitle as="h3">Gợi ý tỉ lệ phổ biến</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {Object.entries(MACRO_PRESETS).map(([key, p]) => {
                const on = presetOn(p.ratios);
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => handlePreset(key)}
                    className={`inline-flex min-h-11 cursor-pointer items-center rounded-full border-0 px-3.5 text-cap active:scale-[0.97] transition-press motion-reduce:active:scale-100 focus-visible:outline-cobalt ${
                      on ? "bg-ink font-bold text-on-dark" : "bg-surface font-semibold text-text"
                    }`}
                  >
                    {p.name} ({p.ratios.proteinPct}/{p.ratios.carbsPct}/{p.ratios.fatPct})
                  </button>
                );
              })}
            </div>
          </div>

          <PillButton type="button" variant="tertiary" onClick={handleResetDefault} className="text-body-lg">
            Khôi phục mặc định theo HLV
          </PillButton>
        </Card>
      </main>
    </AppShell>
  );
}
