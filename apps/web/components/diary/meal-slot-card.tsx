"use client";

import { DiaryLog } from "@/lib/api-client";
import { UtensilsIcon, PlusIcon } from "runeicons";

interface MealSlotCardProps {
  slot: "breakfast" | "lunch" | "dinner" | "snack";
  title: string;
  logs: DiaryLog[];
  onAddFood: (slot: "breakfast" | "lunch" | "dinner" | "snack") => void;
}

export function MealSlotCard({ slot, title, logs, onAddFood }: MealSlotCardProps) {
  const slotLogs = logs.filter((l) => l.meal_slot.toLowerCase() === slot.toLowerCase());

  const slotCalories = Math.round(
    slotLogs.reduce((sum, l) => sum + (l.nutrients_snapshot.calories || 0), 0)
  );
  const slotProtein = Math.round(
    slotLogs.reduce((sum, l) => sum + (l.nutrients_snapshot.protein || 0), 0) * 10
  ) / 10;
  const slotCarbs = Math.round(
    slotLogs.reduce((sum, l) => sum + (l.nutrients_snapshot.carbohydrates || 0), 0) * 10
  ) / 10;
  const slotFat = Math.round(
    slotLogs.reduce((sum, l) => sum + (l.nutrients_snapshot.fat || 0), 0) * 10
  ) / 10;

  return (
    <div className="p-4 sm:p-5 rounded-lg bg-[#141C2B] border-2 border-black sm:border-[2.5px] shadow-[4px_4px_0px_0px_#000] sm:shadow-[5px_5px_0px_0px_#000] flex flex-col justify-between">
      <div>
        {/* Slot Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b-2 border-black">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-[4px] bg-[#10B981] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000] flex items-center justify-center shrink-0">
              <UtensilsIcon className="w-4 h-4 text-black" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-[#F8FAFC] uppercase tracking-tight truncate">{title}</h3>
            <span className="px-2 py-0.5 rounded-[3px] bg-[#0B0F17] text-[#94A3B8] border-2 border-black font-black text-[10px] uppercase font-mono shrink-0">
              {slotLogs.length}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <span className="text-sm sm:text-base font-black text-[#10B981] font-mono">{slotCalories}</span>{" "}
              <span className="text-[10px] font-bold uppercase text-[#94A3B8]">kcal</span>
            </div>
            <button
              onClick={() => onAddFood(slot)}
              className="neo-btn neo-btn-emerald px-3 py-1.5 text-xs text-black border-2 border-black flex items-center gap-1.5 font-black uppercase tracking-wider min-h-[36px]"
            >
              <PlusIcon className="w-3.5 h-3.5 stroke-[3]" />
              <span>Log Food</span>
            </button>
          </div>
        </div>

        {/* Slot Entries */}
        {slotLogs.length === 0 ? (
          <div className="py-7 text-center text-xs font-bold uppercase tracking-wider text-[#64748B] bg-[#0B0F17]/60 border-2 border-dashed border-black/80 rounded-[4px] my-3">
            No items logged for {title}
          </div>
        ) : (
          <div className="space-y-2 my-3">
            {slotLogs.map((log) => (
              <div
                key={log.id}
                className="p-2.5 sm:p-3 rounded-[4px] bg-[#0B0F17] border-2 border-black shadow-[2px_2px_0px_0px_#000] flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-black text-[#F8FAFC] truncate">
                    Food Item ({log.quantity} × {log.serving_size_g}g)
                  </div>
                  <div className="text-[11px] text-[#94A3B8] font-mono mt-0.5 truncate">
                    {Math.round(log.quantity * log.serving_size_g)}g • P: {log.nutrients_snapshot.protein}g | C: {log.nutrients_snapshot.carbohydrates}g | F: {log.nutrients_snapshot.fat}g
                  </div>
                </div>
                <div className="text-xs sm:text-sm font-black text-[#10B981] font-mono shrink-0">
                  {log.nutrients_snapshot.calories} kcal
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Slot Macros Footer */}
      {slotLogs.length > 0 && (
        <div className="pt-3 border-t-2 border-black flex flex-wrap justify-between items-center text-[11px] text-[#94A3B8] font-mono gap-1">
          <span className="font-bold uppercase text-[#F8FAFC]">Slot Totals:</span>
          <span>
            P: <strong className="text-[#F8FAFC]">{slotProtein}g</strong> • C: <strong className="text-[#F8FAFC]">{slotCarbs}g</strong> • F: <strong className="text-[#F8FAFC]">{slotFat}g</strong>
          </span>
        </div>
      )}
    </div>
  );
}
