"use client";

import { useState } from "react";
import { Food } from "@/lib/api-client";
import { SearchIcon, CloseIcon, CheckIcon } from "@/lib/runeicons";

const SAMPLE_FOODS: Food[] = [
  {
    id: "food-1",
    name: "Chà là",
    serving_size_g: 30,
    per_100g_nutrients: {
      calories: 280,
      protein: 2.5,
      carbohydrates: 75,
      fat: 0.4,
      fiber: 7,
      sodium: 2,
      potassium: 656,
      calcium: 64,
      iron: 1.0,
      vitamin_a: 7,
      vitamin_c: 0.4,
      vitamin_d: 0,
      vitamin_e: 0.1,
    },
    is_custom: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "food-2",
    name: "Bột củ dền",
    serving_size_g: 3,
    per_100g_nutrients: {
      calories: 333,
      protein: 13,
      carbohydrates: 60,
      fat: 1.2,
      fiber: 20,
      sodium: 50,
      potassium: 1200,
      calcium: 150,
      iron: 4.5,
      vitamin_a: 20,
      vitamin_c: 15,
      vitamin_d: 0,
      vitamin_e: 0.5,
    },
    is_custom: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "food-3",
    name: "Mật mía",
    serving_size_g: 20,
    per_100g_nutrients: {
      calories: 290,
      protein: 0,
      carbohydrates: 74,
      fat: 0,
      fiber: 0,
      sodium: 10,
      potassium: 350,
      calcium: 80,
      iron: 2.1,
      vitamin_a: 0,
      vitamin_c: 0,
      vitamin_d: 0,
      vitamin_e: 0,
    },
    is_custom: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "food-4",
    name: "Yến mạch",
    serving_size_g: 60,
    per_100g_nutrients: {
      calories: 380,
      protein: 13.5,
      carbohydrates: 67,
      fat: 6.5,
      fiber: 10,
      sodium: 6,
      potassium: 380,
      calcium: 54,
      iron: 4.7,
      vitamin_a: 0,
      vitamin_c: 0,
      vitamin_d: 0,
      vitamin_e: 0.7,
    },
    is_custom: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "food-5",
    name: "Kefir",
    serving_size_g: 200,
    per_100g_nutrients: {
      calories: 63,
      protein: 3.5,
      carbohydrates: 4.8,
      fat: 3.3,
      fiber: 0,
      sodium: 40,
      potassium: 150,
      calcium: 120,
      iron: 0.1,
      vitamin_a: 30,
      vitamin_c: 1,
      vitamin_d: 1,
      vitamin_e: 0.1,
    },
    is_custom: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "food-6",
    name: "Chuối",
    serving_size_g: 100,
    per_100g_nutrients: {
      calories: 89,
      protein: 1.1,
      carbohydrates: 23,
      fat: 0.3,
      fiber: 2.6,
      sodium: 1,
      potassium: 358,
      calcium: 5,
      iron: 0.3,
      vitamin_a: 64,
      vitamin_c: 8.7,
      vitamin_d: 0,
      vitamin_e: 0.1,
    },
    is_custom: false,
    created_at: new Date().toISOString(),
  },
];

interface AddFoodSheetProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSlot?: string;
  onLogFood: (food: Food, quantity: number, servingSizeG: number, slot: string) => Promise<void>;
}

export function AddFoodSheet({
  isOpen,
  onClose,
  defaultSlot = "breakfast",
  onLogFood,
}: AddFoodSheetProps) {
  const [selectedSlot, setSelectedSlot] = useState(defaultSlot);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState<Food>(SAMPLE_FOODS[0]);
  const [quantityGrams, setQuantityGrams] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const slotLabels: Record<string, string> = {
    breakfast: "Bữa sáng",
    lunch: "Bữa trưa",
    dinner: "Bữa tối",
    preworkout: "Trước tập",
    intraworkout: "Trong tập",
    postworkout: "Sau tập",
    snack: "Ăn vặt",
  };

  const filteredFoods = SAMPLE_FOODS.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const calculatedCalories = Math.round(
    (selectedFood.per_100g_nutrients.calories * quantityGrams) / 100
  );
  const calculatedCarb = Math.round(
    ((selectedFood.per_100g_nutrients.carbohydrates || 0) * quantityGrams) / 100
  );
  const calculatedKali = Math.round(
    ((selectedFood.per_100g_nutrients.potassium || 0) * quantityGrams) / 100
  );
  const calculatedFiber = Math.round(
    ((selectedFood.per_100g_nutrients.fiber || 0) * quantityGrams) / 100
  );

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onLogFood(selectedFood, 1, quantityGrams, selectedSlot);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-t-3xl md:rounded-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-neutral-100 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-neutral-500">Thêm vào:</span>
              <select
                value={selectedSlot}
                onChange={(e) => setSelectedSlot(e.target.value)}
                className="font-bold text-base text-neutral-900 bg-transparent border-none focus:outline-none cursor-pointer"
              >
                {Object.entries(slotLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Tự chọn theo giờ trong ngày · chạm để đổi
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600 hover:bg-neutral-200 transition-colors"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-neutral-100 shrink-0">
          <div className="relative">
            <SearchIcon className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm món ăn..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-100 text-sm font-medium text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Quick presets tags */}
          <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider shrink-0">
              Gần đây:
            </span>
            {["Yến mạch 60 g", "Kefir 200 ml", "Chuối 1 quả"].map((preset) => (
              <button
                key={preset}
                onClick={() => {
                  const match = SAMPLE_FOODS.find((f) => preset.includes(f.name));
                  if (match) setSelectedFood(match);
                }}
                className="px-3 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200 text-xs font-semibold text-neutral-700 shrink-0 transition-colors"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Food List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredFoods.map((food) => {
            const isSelected = selectedFood.id === food.id;
            return (
              <div
                key={food.id}
                onClick={() => setSelectedFood(food)}
                className={`p-3 rounded-2xl cursor-pointer transition-all flex items-center justify-between ${
                  isSelected
                    ? "bg-blue-50 border border-blue-200 shadow-xs"
                    : "hover:bg-neutral-50 border border-transparent"
                }`}
              >
                <div>
                  <div className="font-bold text-neutral-900 text-sm">{food.name}</div>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    {food.per_100g_nutrients.calories} kcal / 100g ·{" "}
                    {food.per_100g_nutrients.carbohydrates}g carb ·{" "}
                    {food.per_100g_nutrients.potassium || 0} mg kali
                  </div>
                </div>
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <CheckIcon className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Serving Adjustment & Confirm Card (Matches HIT MICRO bottom black card) */}
        <div className="p-4 bg-neutral-950 text-white rounded-t-3xl shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="font-bold text-base text-white">{selectedFood.name}</div>
            <span className="text-[11px] text-neutral-400 font-medium">
              carb chậm · điện giải
            </span>
          </div>

          {/* Gram weight selector pills */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[30, 60, 100, 150].map((grams) => (
              <button
                key={grams}
                type="button"
                onClick={() => setQuantityGrams(grams)}
                className={`py-2 rounded-xl text-xs font-black transition-all ${
                  quantityGrams === grams
                    ? "bg-neutral-800 text-white border border-neutral-600 shadow-inner"
                    : "bg-neutral-900 text-neutral-400 hover:text-white"
                }`}
              >
                {grams} g
              </button>
            ))}
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-4 gap-2 py-3 border-t border-neutral-800 text-center mb-3">
            <div>
              <div className="text-lg font-black italic font-mono text-white leading-none">
                {calculatedCalories}
              </div>
              <div className="text-[10px] text-neutral-400 mt-1">kcal</div>
            </div>
            <div>
              <div className="text-lg font-black italic font-mono text-white leading-none">
                {calculatedCarb} g
              </div>
              <div className="text-[10px] text-neutral-400 mt-1">Carb</div>
            </div>
            <div>
              <div className="text-lg font-black italic font-mono text-white leading-none">
                {calculatedKali}
              </div>
              <div className="text-[10px] text-neutral-400 mt-1">Kali (mg)</div>
            </div>
            <div>
              <div className="text-lg font-black italic font-mono text-white leading-none">
                {calculatedFiber} g
              </div>
              <div className="text-[10px] text-neutral-400 mt-1">Chất xơ</div>
            </div>
          </div>

          {/* Submit CTA */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-2xl bg-blue text-white font-black text-sm tracking-wide transition-all shadow-md active:scale-98"
          >
            {isSubmitting
              ? "Đang lưu..."
              : `Thêm vào ${slotLabels[selectedSlot] || selectedSlot}`}
          </button>
        </div>
      </div>
    </div>
  );
}
