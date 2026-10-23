"use client";

import React, { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { PillButton } from "@/components/ui/pill-button";
import { CUSTOM_MINUTES_MAX, CUSTOM_MINUTES_MIN, CUSTOM_MINUTES_STEP, clampTrainingMinutes } from "@/lib/training";

const STEP_BUTTON =
  "flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-fill p-0 text-text active:scale-[0.97] transition-press motion-reduce:active:scale-100 disabled:cursor-default disabled:opacity-40";

/**
 * Tùy chỉnh (feat/training-custom-minutes): the training time for a session longer (or other) than the chips, 30 to 480
 * minutes in 30-minute steps. A − and + (44 px) and a number field (numeric keyboard); a number outside the range or off the
 * steps is clamped when the field is left and on Xong. Ngày tập and Hồ sơ open the same sheet.
 */
export function TrainingMinutesPicker({
  open,
  initial,
  onClose,
  onPick,
}: {
  open: boolean;
  /** The minutes it opens on (clamped) */
  initial: number;
  onClose: () => void;
  onPick: (minutes: number) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Thời gian tập" titleId="training-minutes-title" desktopDialog>
      {open && <PickerBody initial={clampTrainingMinutes(initial)} onPick={onPick} />}
    </Sheet>
  );
}

function PickerBody({ initial, onPick }: { initial: number; onPick: (minutes: number) => void }) {
  const [text, setText] = useState(String(initial));
  const value = clampTrainingMinutes(Number(text.replace(/[^\d]/g, "")) || 0);
  const step = (delta: number) => setText(String(clampTrainingMinutes(value + delta)));
  return (
    <div className="flex flex-col gap-4">
      <div data-align-group="training-minutes" className="flex items-center justify-center gap-3">
        <button type="button" aria-label={`Bớt ${CUSTOM_MINUTES_STEP} phút`} disabled={value <= CUSTOM_MINUTES_MIN} onClick={() => step(-CUSTOM_MINUTES_STEP)} className={STEP_BUTTON}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M5 12h14" />
          </svg>
        </button>
        <label className="flex items-baseline gap-2">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            aria-label="Số phút tập"
            value={text}
            onChange={(e) => setText(e.target.value.replace(/[^\d]/g, "").slice(0, 3))}
            onBlur={() => setText(String(value))}
            className="h-12 w-24 rounded-xl border-0 bg-card text-center font-display text-title font-black italic tabular-nums text-text shadow-field outline-none focus:shadow-[inset_0_0_0_2px_var(--color-cobalt)]"
          />
          <span className="text-callout font-semibold text-secondary">phút</span>
        </label>
        <button type="button" aria-label={`Thêm ${CUSTOM_MINUTES_STEP} phút`} disabled={value >= CUSTOM_MINUTES_MAX} onClick={() => step(CUSTOM_MINUTES_STEP)} className={STEP_BUTTON}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
      <p className="m-0 text-center text-cap leading-snug text-secondary">
        Từ {CUSTOM_MINUTES_MIN} đến {CUSTOM_MINUTES_MAX} phút, mỗi bước {CUSTOM_MINUTES_STEP} phút.
      </p>
      <PillButton type="button" onClick={() => onPick(value)}>
        Xong
      </PillButton>
    </div>
  );
}
