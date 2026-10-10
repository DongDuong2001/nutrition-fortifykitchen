"use client";

import { useNutrientProgress } from "@/hooks/use-nutrient-progress";
import { DailyProgress } from "@/lib/api-client";
import { ProgressBar } from "@/components/ui/progress-bar";
import { FlameIcon, SparklesIcon } from "runeicons";

interface NutrientSummaryProps {
  progress?: DailyProgress;
}

export function NutrientSummary({ progress }: NutrientSummaryProps) {
  const { macros, micros, totalCalories, targetCalories } = useNutrientProgress(progress);

  const calPercentage = Math.round((totalCalories / (targetCalories || 2000)) * 100);

  return (
    <div className="p-4 sm:p-6 rounded-lg bg-ink border-2 border-black sm:border-[2.5px] shadow-[4px_4px_0px_0px_black] sm:shadow-[6px_6px_0px_0px_black]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b-2 border-black">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[4px] bg-level-green text-black border-2 border-black shadow-[2px_2px_0px_0px_black] flex items-center justify-center shrink-0 font-black">
              <FlameIcon className="w-4 h-4 text-black" />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight uppercase truncate">
              Daily Nutrition Progress
            </h2>
          </div>
          <p className="text-xs text-muted-on-dark mt-1 font-medium">
            Calculated from logged meal entries across 26 nutrients
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3.5 py-1.5 rounded-[4px] bg-ink border-2 border-black shadow-[2px_2px_0px_0px_black] text-right">
            <div className="text-[10px] font-black uppercase tracking-wider text-muted-on-dark">Calories</div>
            <div className="text-base sm:text-lg font-black text-level-green font-mono">
              {totalCalories} <span className="text-xs text-muted-on-dark font-normal">/ {targetCalories} kcal</span>
            </div>
          </div>
        </div>
      </div>

      {/* Calories Overview Bar */}
      <div className="py-4 sm:py-5 border-b-2 border-black">
        <ProgressBar
          value={calPercentage}
          label="Calories Consumed"
          consumedLabel={`${calPercentage}% of ${targetCalories} kcal`}
          color={calPercentage > 105 ? "rose" : "emerald"}
        />
      </div>

      {/* Macros Grid (Responsive for all screen sizes) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 py-5 border-b-2 border-black">
        {macros.slice(1).map((m) => (
          <div
            key={m.name}
            className="p-3 sm:p-4 rounded-[6px] bg-ink border-2 border-black shadow-[3px_3px_0px_0px_black] flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start gap-1 mb-1.5">
                <span className="text-[11px] sm:text-xs font-black uppercase text-muted-on-dark truncate">{m.name}</span>
                <span className="px-1.5 py-0.5 rounded-[2px] bg-level-green text-black border border-black font-black text-[10px] font-mono shrink-0">
                  {m.percentage}%
                </span>
              </div>
              <div className="text-lg sm:text-xl font-black text-white font-mono tracking-tight">
                {m.consumed}
                <span className="text-xs font-medium text-muted-on-dark ml-1">{m.unit}</span>
              </div>
              <div className="text-[10px] text-secondary font-mono mt-0.5">Target: {m.target} {m.unit}</div>
            </div>
            <div className="mt-3">
              <ProgressBar
                value={m.percentage}
                color={m.percentage > 110 ? "amber" : "emerald"}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Essential Micronutrients Preview */}
      <div className="pt-5">
        <div className="flex items-center gap-2 mb-3.5">
          <SparklesIcon className="w-3.5 h-3.5 text-level-yellow" />
          <h3 className="text-xs font-black text-white uppercase tracking-wider">
            Key Micronutrients & Electrolytes (26 Tracked)
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          {micros.map((item) => (
            <div
              key={item.name}
              className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-[4px] bg-ink border-2 border-black shadow-[2px_2px_0px_0px_black] flex items-center justify-between gap-1"
            >
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-muted-on-dark truncate">{item.name}</div>
                <div className="text-xs sm:text-sm font-black text-white font-mono">
                  {item.consumed} <span className="text-[10px] text-secondary">{item.unit}</span>
                </div>
              </div>
              <div className="text-xs font-black text-level-green font-mono shrink-0">{item.percentage}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
