"use client";

import { useState } from "react";
import { Food } from "@/lib/api-client";
import { SearchIcon } from "runeicons";

const SAMPLE_FOODS: Food[] = [
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
    id: "a11bb22c-33dd-44ee-55ff-66aa77bb88cc",
    name: "Grass-Fed Beef Tenderloin",
    serving_size_g: 100,
    per_100g_nutrients: {
      calories: 218,
      protein: 28,
      carbohydrates: 0,
      fat: 11.8,
      fiber: 0,
      sodium: 54,
      potassium: 380,
      calcium: 18,
      iron: 2.8,
      zinc: 4.5,
      vitamin_a: 0,
      vitamin_c: 0,
      vitamin_d: 0.2,
      vitamin_e: 0.4,
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

export default function FoodsPage() {
  const [foods] = useState<Food[]>(SAMPLE_FOODS);
  const [search, setSearch] = useState("");

  const filtered = foods.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* Header and Search Tool */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b-2 border-black">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#F8FAFC] uppercase tracking-tight">
            Food Catalog
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] font-medium mt-0.5">
            Browse verified culinary ingredients and Fortify Kitchen menu items
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ingredients..."
            className="neo-input w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm placeholder-[#64748B] min-h-[42px]"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#10B981] pointer-events-none">
            <SearchIcon className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Food Cards Grid (Responsive across all screen sizes) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filtered.map((food) => (
          <div
            key={food.id}
            className="p-4 sm:p-5 rounded-lg bg-[#141C2B] border-2 border-black sm:border-[2.5px] shadow-[4px_4px_0px_0px_#000] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[5px_5px_0px_0px_#000] transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-black text-sm sm:text-base text-[#F8FAFC] tracking-tight leading-snug">
                  {food.name}
                </h3>
                <span className="px-2 py-0.5 rounded-[3px] bg-[#10B981] text-black border-2 border-black font-black text-[10px] uppercase font-mono shrink-0 shadow-[1.5px_1.5px_0px_0px_#000]">
                  {food.is_custom ? "Custom" : "Verified"}
                </span>
              </div>
              <div className="text-[11px] text-[#94A3B8] font-mono mt-1">
                Serving: {food.serving_size_g}g
              </div>

              {/* Stat Boxes */}
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mt-4 pt-3.5 border-t-2 border-black text-center">
                <div className="p-1.5 sm:p-2 rounded-[3px] bg-[#0B0F17] border-2 border-black">
                  <div className="text-[9px] font-bold uppercase text-[#94A3B8]">Cals</div>
                  <div className="text-xs sm:text-sm font-black text-[#10B981] font-mono">
                    {food.per_100g_nutrients.calories}
                  </div>
                </div>
                <div className="p-1.5 sm:p-2 rounded-[3px] bg-[#0B0F17] border-2 border-black">
                  <div className="text-[9px] font-bold uppercase text-[#94A3B8]">Prot</div>
                  <div className="text-xs sm:text-sm font-black text-[#F8FAFC] font-mono">
                    {food.per_100g_nutrients.protein}g
                  </div>
                </div>
                <div className="p-1.5 sm:p-2 rounded-[3px] bg-[#0B0F17] border-2 border-black">
                  <div className="text-[9px] font-bold uppercase text-[#94A3B8]">Carb</div>
                  <div className="text-xs sm:text-sm font-black text-[#F8FAFC] font-mono">
                    {food.per_100g_nutrients.carbohydrates}g
                  </div>
                </div>
                <div className="p-1.5 sm:p-2 rounded-[3px] bg-[#0B0F17] border-2 border-black">
                  <div className="text-[9px] font-bold uppercase text-[#94A3B8]">Fat</div>
                  <div className="text-xs sm:text-sm font-black text-[#F8FAFC] font-mono">
                    {food.per_100g_nutrients.fat}g
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t-2 border-black flex justify-between items-center text-[11px] font-mono text-[#64748B]">
              <span>Per 100g basis</span>
              <span className="text-[#10B981] font-bold">Fiber: {food.per_100g_nutrients.fiber}g</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
