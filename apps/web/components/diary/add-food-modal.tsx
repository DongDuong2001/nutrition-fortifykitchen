"use client";

import { useState } from "react";
import { Food } from "@/lib/api-client";

// Default preset foods for immediate interactive logging
const PRESET_FOODS: Food[] = [
  {
    id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    name: "Grilled Chicken Breast (Fortify Kitchen)",
    serving_size_g: 100,
    per_100g_nutrients: {
      calories: 165,
      protein: 31,
      carbohydrates: 0,
      fat: 3.6,
      fiber: 0,
      sodium: 74,
      potassium: 256,
      calcium: 15,
      iron: 1.0,
      vitamin_a: 10,
      vitamin_c: 0,
      vitamin_d: 0.1,
      vitamin_e: 0.3,
    },
    is_custom: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "e38be01a-47bb-4261-b456-9d91a1b2c368",
    name: "Brown Jasmine Rice",
    serving_size_g: 150,
    per_100g_nutrients: {
      calories: 111,
      protein: 2.6,
      carbohydrates: 23,
      fat: 0.9,
      fiber: 1.8,
      sodium: 5,
      potassium: 43,
      calcium: 10,
      iron: 0.4,
      vitamin_a: 0,
      vitamin_c: 0,
      vitamin_d: 0,
      vitamin_e: 0.1,
    },
    is_custom: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "d29ad90f-36aa-4150-a345-8c80f0a1b257",
    name: "Steamed Broccoli & Garlic",
    serving_size_g: 100,
    per_100g_nutrients: {
      calories: 35,
      protein: 2.4,
      carbohydrates: 7.2,
      fat: 0.4,
      fiber: 2.6,
      sodium: 33,
      potassium: 316,
      calcium: 47,
      iron: 0.7,
      vitamin_a: 31,
      vitamin_c: 89.2,
      vitamin_d: 0,
      vitamin_e: 0.8,
    },
    is_custom: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "c18bc80e-2599-4049-9234-7b79e9f0a146",
    name: "Greek Yogurt (Plain 2%)",
    serving_size_g: 170,
    per_100g_nutrients: {
      calories: 73,
      protein: 10,
      carbohydrates: 3.9,
      fat: 2.0,
      fiber: 0,
      sodium: 36,
      potassium: 141,
      calcium: 110,
      iron: 0.1,
      vitamin_a: 25,
      vitamin_c: 0,
      vitamin_d: 0.1,
      vitamin_e: 0.1,
    },
    is_custom: false,
    created_at: new Date().toISOString(),
  },
];

interface AddFoodModalProps {
  slot: "breakfast" | "lunch" | "dinner" | "snack";
  isOpen: boolean;
  onClose: () => void;
  onLog: (food: Food, quantity: number, servingSizeG: number) => Promise<void>;
}

export function AddFoodModal({ slot, isOpen, onClose, onLog }: AddFoodModalProps) {
  const [selectedFood, setSelectedFood] = useState<Food>(PRESET_FOODS[0]);
  const [quantity, setQuantity] = useState<number>(1.0);
  const [customServingG, setCustomServingG] = useState<number>(selectedFood.serving_size_g);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSelectFood = (food: Food) => {
    setSelectedFood(food);
    setCustomServingG(food.serving_size_g);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onLog(selectedFood, quantity, customServingG);
      onClose();
    } catch {
      // Error handled in hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculatedGrams = Math.round(quantity * customServingG);
  const calculatedCalories = Math.round(
    (selectedFood.per_100g_nutrients.calories * calculatedGrams) / 100
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-lg bg-[#141C2B] border-2 sm:border-[3px] border-black shadow-[6px_6px_0px_0px_#000] p-4 sm:p-6 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b-2 border-black shrink-0">
          <div>
            <h3 className="text-base sm:text-lg font-black text-[#F8FAFC] uppercase tracking-tight">
              Log Meal: <span className="text-[#10B981]">{slot}</span>
            </h3>
            <p className="text-xs text-[#94A3B8] font-medium">Select item and calculate 26 nutrients</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-[4px] bg-[#0B0F17] border-2 border-black text-[#F8FAFC] hover:bg-rose-500 hover:text-black font-black flex items-center justify-center text-sm shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] transition-colors"
          >
            X
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1">
          <div>
            <label className="block text-[11px] font-black text-[#F8FAFC] uppercase tracking-wider mb-2">
              Choose Food Item
            </label>
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {PRESET_FOODS.map((food) => (
                <button
                  type="button"
                  key={food.id}
                  onClick={() => handleSelectFood(food)}
                  className={`w-full p-2.5 sm:p-3 rounded-[4px] border-2 border-black text-left flex justify-between items-center transition-all min-h-[44px] ${
                    selectedFood.id === food.id
                      ? "bg-[#10B981] text-black shadow-[3px_3px_0px_0px_#000] font-black"
                      : "bg-[#0B0F17] text-[#94A3B8] shadow-[2px_2px_0px_0px_#000] hover:bg-[#1C263B]"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs sm:text-sm font-black truncate">{food.name}</div>
                    <div className={`text-[10px] font-mono mt-0.5 ${selectedFood.id === food.id ? "text-black/80 font-bold" : "text-[#64748B]"}`}>
                      {food.serving_size_g}g serving • {food.per_100g_nutrients.calories} kcal/100g
                    </div>
                  </div>
                  <div className={`text-xs font-black font-mono shrink-0 ${selectedFood.id === food.id ? "text-black" : "text-[#10B981]"}`}>
                    P: {food.per_100g_nutrients.protein}g
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-[11px] font-black text-[#F8FAFC] uppercase tracking-wider mb-1.5">
                Quantity (Servings)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)}
                className="neo-input w-full px-3 py-2 text-sm font-mono min-h-[42px]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-black text-[#F8FAFC] uppercase tracking-wider mb-1.5">
                Serving Size (g)
              </label>
              <input
                type="number"
                value={customServingG}
                onChange={(e) => setCustomServingG(parseFloat(e.target.value) || 100)}
                className="neo-input w-full px-3 py-2 text-sm font-mono min-h-[42px]"
              />
            </div>
          </div>

          {/* Dynamic Preview */}
          <div className="p-3 rounded-[4px] bg-[#0B0F17] border-2 border-black shadow-[2px_2px_0px_0px_#000] flex justify-between items-center text-xs">
            <span className="text-[#94A3B8] font-bold">
              Total Weight: <strong className="text-[#F8FAFC] font-mono">{calculatedGrams}g</strong>
            </span>
            <span className="text-[#10B981] font-black text-sm font-mono">
              ≈ {calculatedCalories} kcal
            </span>
          </div>

          <div className="flex gap-3 pt-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="neo-btn neo-btn-dark flex-1 py-2.5 text-xs font-black min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="neo-btn neo-btn-emerald flex-1 py-2.5 text-xs font-black min-h-[44px]"
            >
              {isSubmitting ? "Logging..." : "Confirm Log"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
