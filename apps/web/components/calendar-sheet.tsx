"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { useDiary } from "@/lib/diary-store";
import { dayEntries, dayStatus, entriesKcal, monthGrid, monthOf, shiftMonth, type DayStatus } from "@/lib/day-history";
import { getWeekdayName } from "@/lib/format";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const STATUS_TEXT: Record<DayStatus, string> = {
  met: "đạt mục tiêu",
  under: "thiếu kcal",
  over: "vượt mục tiêu",
  none: "chưa ghi",
};

interface CalendarSheetProps {
  open: boolean;
  onClose: () => void;
  /** The day being viewed. The picker opens on its month. */
  selectedIso: string;
  onPick: (iso: string) => void;
}

/** "Chọn ngày": a month grid to pick any past day. Future days cannot be picked. */
export function CalendarSheet({ open, onClose, selectedIso, onPick }: CalendarSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title="Chọn ngày" desktopDialog>
      <CalendarMonth selectedIso={selectedIso} onPick={onPick} />
    </Sheet>
  );
}

// Mounted only while open, so each opening starts on the viewed day's month.
function CalendarMonth({ selectedIso, onPick }: Pick<CalendarSheetProps, "selectedIso" | "onPick">) {
  const { todayIso, data, targets } = useDiary();
  const [month, setMonth] = useState(() => monthOf(selectedIso));
  if (!todayIso) return null;
  const today: string = todayIso;

  const grid = monthGrid(month, today);
  const range = targets.calories;
  const canGoNext = month < monthOf(today);

  // Today's kcal comes from the diary; a past day from its own entries
  const statusOf = (iso: string): DayStatus => {
    const kcal = iso === today ? data.calories.consumed : entriesKcal(dayEntries(iso, today));
    return dayStatus(kcal, range);
  };

  const [, m] = month.split("-");
  const monthTitle = `Tháng ${Number(m)}, ${month.slice(0, 4)}`;

  return (
    <div className="flex flex-col gap-3 py-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth((prev) => shiftMonth(prev, -1))}
          aria-label="Tháng trước"
          className="w-11 h-11 rounded-lg bg-paper text-text flex items-center justify-center cursor-pointer active:scale-[0.97] transition-transform"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <div className="text-base font-bold text-text">{monthTitle}</div>
        <button
          type="button"
          onClick={() => setMonth((prev) => shiftMonth(prev, 1))}
          disabled={!canGoNext}
          aria-label="Tháng sau"
          className="w-11 h-11 rounded-lg bg-paper text-text flex items-center justify-center cursor-pointer active:scale-[0.97] transition-transform disabled:opacity-50 disabled:pointer-events-none"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 justify-items-center">
        {WEEKDAYS.map((w) => (
          <div key={w} className="w-11 h-6 flex items-center justify-center text-xs font-bold text-secondary">
            {w}
          </div>
        ))}
        {Array.from({ length: grid.leading }, (_, i) => (
          <div key={`blank-${i}`} aria-hidden="true" className="w-11 h-11" />
        ))}
        {grid.days.map((day) => {
          const status = day.future ? "none" : statusOf(day.iso);
          const isSelected = day.iso === selectedIso;
          const isToday = day.iso === todayIso;
          const dot = status === "met" ? "bg-blue" : status === "under" ? "bg-red" : "bg-transparent";
          const label = [
            `${getWeekdayName(day.iso)} ${day.day} tháng ${Number(m)}`,
            isToday ? "hôm nay" : null,
            day.future ? "chưa tới" : STATUS_TEXT[status],
          ]
            .filter(Boolean)
            .join(", ");
          return (
            <button
              key={day.iso}
              type="button"
              disabled={day.future}
              aria-label={label}
              aria-current={isSelected ? "date" : undefined}
              onClick={() => onPick(day.iso)}
              className={`w-11 h-11 rounded-full flex flex-col items-center justify-center gap-0.5 text-[15px] font-semibold tabular-nums cursor-pointer active:scale-[0.97] transition-transform disabled:opacity-40 disabled:pointer-events-none ${
                isSelected ? "bg-blue text-white" : "bg-transparent text-text"
              }`}
            >
              <span>{day.day}</span>
              <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : dot}`} />
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-secondary px-1">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-blue" />
          Đạt mục tiêu kcal
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-red" />
          Thiếu
        </span>
        <span>Không chấm: chưa ghi</span>
      </div>
    </div>
  );
}
