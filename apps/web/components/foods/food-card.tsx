import { Food } from "@/lib/api-client";

interface FoodCardProps {
  food: Food;
  onSelect?: (food: Food) => void;
}

export function FoodCard({ food, onSelect }: FoodCardProps) {
  return (
    <div className="p-4 sm:p-5 rounded-lg bg-[#141C2B] border-2 border-black sm:border-[2.5px] shadow-[4px_4px_0px_0px_#000] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[5px_5px_0px_0px_#000] transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-black text-sm sm:text-base text-[#F8FAFC] tracking-tight">{food.name}</h4>
          <span className="px-2 py-0.5 rounded-[3px] bg-[#10B981] text-black border-2 border-black font-black text-[10px] uppercase font-mono shrink-0 shadow-[1.5px_1.5px_0px_0px_#000]">
            {food.is_custom ? "Custom" : "Verified"}
          </span>
        </div>
        <p className="text-xs text-[#94A3B8] font-mono mt-1">Standard serving: {food.serving_size_g}g</p>
      </div>

      <div className="mt-4 pt-3 border-t-2 border-black flex items-center justify-between gap-2">
        <span className="text-xs sm:text-sm font-black text-[#10B981] font-mono">
          {food.per_100g_nutrients.calories} <span className="text-[10px] text-[#94A3B8] font-normal">kcal/100g</span>
        </span>
        {onSelect && (
          <button
            onClick={() => onSelect(food)}
            className="neo-btn neo-btn-emerald px-3 py-1 text-xs text-black border-2 border-black min-h-[34px]"
          >
            Select
          </button>
        )}
      </div>
    </div>
  );
}
