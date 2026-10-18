"use client";

import React from "react";
import { Sheet } from "@/components/ui/sheet";
import { Chip } from "@/components/ui/chip";
import { getTrainingPhases, TRAINING_SIZE_NAME, type TrainingSize } from "@/lib/training";

// cc-52: the two choices, each with the doses it pre-fills (from the coach's ranges, lib/training)
const CHOICES: { size: TrainingSize; hint: string }[] = [
  { size: "be", hint: "Liều thấp" },
  { size: "bu", hint: "Liều cao" },
];

function dosesOf(size: TrainingSize): string {
  const items = getTrainingPhases(20, [], { size })[1].items;
  return `Muối ${items[0].dose} mỗi 20 phút · tinh bột nhanh ${items[1].dose}`;
}

/** "Bạn thuộc nhóm nào?": asked on the first open of Ngày tập, and again from the chip. */
export function TrainingSizeSheet({
  open,
  value,
  onChoose,
  onClose,
}: {
  open: boolean;
  value: TrainingSize | null;
  onChoose: (size: TrainingSize) => void;
  onClose: () => void;
}) {
  return (
    // Focus starts on the heading, so neither choice looks picked before the user picks one
    <Sheet open={open} onClose={onClose} labelledBy="training-size-title" initialFocusId="training-size-title" desktopDialog>
      <div className="px-1 mb-1">
        <h2 id="training-size-title" tabIndex={-1} className="m-0 text-lg font-bold leading-tight text-text outline-none">
          Bạn thuộc nhóm nào?
        </h2>
        <p className="m-0 mt-0.5 text-sm text-secondary">Liều muối và tinh bột nhanh khi tập được điền sẵn theo nhóm của bạn.</p>
      </div>
      <div data-align-group="training-size" className="grid grid-cols-2 gap-3 pt-1">
        {CHOICES.map(({ size, hint }) => (
          <button
            key={size}
            type="button"
            aria-pressed={value === size}
            onClick={() => onChoose(size)}
            className={`flex min-h-[120px] cursor-pointer flex-col items-start justify-between gap-2 rounded-[18px] border-2 p-4 text-left active:scale-[0.97] transition-press motion-reduce:transition-none motion-reduce:active:scale-100 ${
              value === size ? "border-blue bg-cobalt-tint" : "border-card-border bg-card hover:bg-hover"
            }`}
          >
            <span className="flex flex-col">
              <span className="font-display text-[32px] font-extrabold italic leading-none text-text">{TRAINING_SIZE_NAME[size]}</span>
              <span className="text-sm font-semibold text-secondary">{hint}</span>
            </span>
            <span className="text-[13px] leading-snug text-text">{dosesOf(size)}</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

/** The small "Bé · đổi" chip on Ngày tập: opens the sheet. Before a choice: "Chọn Bự / Bé". */
export function TrainingSizeChip({ size, onClick, className = "" }: { size: TrainingSize | null; onClick: () => void; className?: string }) {
  return (
    <Chip
      onClick={onClick}
      aria-pressed={undefined}
      aria-haspopup="dialog"
      aria-label={size ? `Nhóm ${TRAINING_SIZE_NAME[size]}. Đổi nhóm` : "Chọn nhóm Bự hoặc Bé"}
      data-tour="training-size"
      className={className}
    >
      {size ? `${TRAINING_SIZE_NAME[size]} · đổi` : "Chọn Bự / Bé"}
    </Chip>
  );
}
