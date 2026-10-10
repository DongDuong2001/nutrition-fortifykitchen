import React from "react";
import { Food } from "@/lib/api-client";

interface FoodCardProps {
  food: Food;
  onSelect?: (food: Food) => void;
}

export function FoodCard({ food, onSelect }: FoodCardProps) {
  return (
    <div className="p-4 sm:p-5 rounded-[18px] bg-card border border-black/10 transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-bold text-sm sm:text-base text-text tracking-tight">{food.name}</h4>
          <span className="px-2 py-0.5 rounded-full bg-level-green/10 text-level-green font-bold text-[10px] uppercase shrink-0">
            {food.is_custom ? "Tuỳ chỉnh" : "Đã duyệt"}
          </span>
        </div>
        <p className="text-xs text-secondary mt-1">Khẩu phần chuẩn: {food.serving_size_g} g</p>
      </div>

      <div className="mt-4 pt-3 border-t border-divider flex items-center justify-between gap-2">
        <span className="text-xs sm:text-sm font-bold text-text tabular-nums">
          {food.per_100g_nutrients.calories} <span className="text-[10px] text-secondary font-normal">kcal/100g</span>
        </span>
        {onSelect && (
          <button
            type="button"
            onClick={() => onSelect(food)}
            className="px-3 py-1.5 rounded-full text-xs font-bold bg-blue text-white min-h-[34px] cursor-pointer hover:bg-blue/90 transition-colors"
          >
            Chọn
          </button>
        )}
      </div>
    </div>
  );
}
