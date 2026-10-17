import { markUsed } from "@/lib/onboarding-store";
import React from "react";
import Link from "next/link";
import { Carousel } from "@/components/ui/carousel";
import { getNutrientDefinition } from "@/lib/nutrients";
import { RICH_NUTRIENT_IDS, richName } from "@/lib/rich-in";

// The tile colour follows the nutrient group: vitamins cobalt, minerals ink, everything else the dark surface
const TILE_TONE: Record<string, string> = {
  vitamins: "bg-blue text-on-accent",
  minerals: "bg-ink text-on-dark",
};
const DEFAULT_TONE = "bg-surface-dark text-on-dark";

/**
 * "Món giàu vi chất": one tile per nutrient with a rich-in list, as a carousel at the top of Khám phá. The
 * tile says "Giàu <nutrient>" in Saira and opens /explore/rich/[nutrient].
 */
export function RichCarousel() {
  return (
    <Carousel title="Món giàu vi chất" id="explore-rich">
      {RICH_NUTRIENT_IDS.map((id) => {
        const def = getNutrientDefinition(id);
        const name = def ? richName(def) : id;
        const tone = TILE_TONE[def?.group ?? ""] ?? DEFAULT_TONE;
        return (
          <li key={id} className="w-[9.5rem] shrink-0 snap-start">
            <Link
              href={`/explore/rich/${id}`}
              onClick={() => markUsed("rich-in")}
              className={`flex min-h-[112px] flex-col justify-between gap-3 rounded-[18px] p-4 no-underline active:scale-[0.97] motion-reduce:active:scale-100 ${tone}`}
            >
              <span className="font-display text-[26px] font-black italic leading-none">
                Giàu {name}
              </span>
              <span className="text-[13px] font-semibold opacity-80">Xem món</span>
            </Link>
          </li>
        );
      })}
    </Carousel>
  );
}
