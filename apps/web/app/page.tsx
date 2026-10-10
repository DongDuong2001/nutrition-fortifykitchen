import Link from "next/link";
import { SparklesIcon, FlameIcon, UtensilsIcon } from "runeicons";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center py-8 sm:py-16 text-center max-w-5xl mx-auto">
      {/* Top Category Tag */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[4px] border-2 border-black bg-[#10B981] text-black font-black text-[11px] sm:text-xs uppercase tracking-wider shadow-[3px_3px_0px_0px_#000] mb-6 sm:mb-8">
        <span className="w-2 h-2 bg-black rounded-none" />
        Nutritional Tracking Platform • 26 Nutrients Monitored
      </div>

      {/* Main Headline */}
      <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-[#F8FAFC] uppercase max-w-4xl leading-[1.08]">
        Nutritional Intake and{" "}
        <span className="bg-[#10B981] text-black px-2 py-0.5 border-2 border-black shadow-[3px_3px_0px_0px_#000] inline-block -rotate-1">
          Meal Logging
        </span>
      </h1>

      <p className="mt-5 sm:mt-7 text-sm sm:text-base md:text-lg text-[#94A3B8] max-w-2xl font-medium leading-relaxed px-2">
        Meal logging system with idempotent record handling, automated 26-nutrient calculations, and menu synchronization.
      </p>

      {/* Action Buttons */}
      <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto px-4">
        <Link
          href="/diary"
          className="neo-btn neo-btn-emerald w-full sm:w-auto px-7 py-3.5 text-sm sm:text-base font-black text-black border-2 border-black min-h-[48px]"
        >
          Open Meal Diary
        </Link>
        <Link
          href="/foods"
          className="neo-btn neo-btn-dark w-full sm:w-auto px-7 py-3.5 text-sm sm:text-base font-black text-[#F8FAFC] border-2 border-black min-h-[48px]"
        >
          View Food Catalog
        </Link>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mt-14 sm:mt-20 w-full text-left">
        <div className="neo-card p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-[4px] bg-[#10B981] text-black border-2 border-black font-black text-base flex items-center justify-center shadow-[2px_2px_0px_0px_#000] mb-4">
              26
            </div>
            <h3 className="text-base sm:text-lg font-black uppercase text-[#F8FAFC]">26 Nutrients Tracked</h3>
            <p className="text-xs sm:text-sm text-[#94A3B8] mt-2 font-medium">
              Calculates macronutrients, electrolytes, minerals, and vitamins per entry based on gram weight and reference data.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t-2 border-black text-[10px] font-black uppercase text-[#10B981] font-mono">
            Nutritional Reference
          </div>
        </div>

        <div className="neo-card p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-[4px] bg-[#3B82F6] text-black border-2 border-black font-black text-base flex items-center justify-center shadow-[2px_2px_0px_0px_#000] mb-4">
              <FlameIcon className="w-5 h-5 text-black" />
            </div>
            <h3 className="text-base sm:text-lg font-black uppercase text-[#F8FAFC]">Optimistic State Updates</h3>
            <p className="text-xs sm:text-sm text-[#94A3B8] mt-2 font-medium">
              Generates client UUIDs for idempotent writes and updates interface state before server confirmation.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t-2 border-black text-[10px] font-black uppercase text-[#3B82F6] font-mono">
            Idempotent Processing
          </div>
        </div>

        <div className="neo-card p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-[4px] bg-[#F59E0B] text-black border-2 border-black font-black text-base flex items-center justify-center shadow-[2px_2px_0px_0px_#000] mb-4">
              <UtensilsIcon className="w-5 h-5 text-black" />
            </div>
            <h3 className="text-base sm:text-lg font-black uppercase text-[#F8FAFC]">Service Integrations</h3>
            <p className="text-xs sm:text-sm text-[#94A3B8] mt-2 font-medium">
              Connects to Fortify Kitchen Core API menu items, PayOS VietQR payment webhooks, and coach draft repositories.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t-2 border-black text-[10px] font-black uppercase text-[#F59E0B] font-mono">
            API & Webhooks
          </div>
        </div>
      </div>
    </div>
  );
}
