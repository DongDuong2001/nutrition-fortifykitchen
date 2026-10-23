import { markUsed } from "@/lib/onboarding-store";
import React from "react";
import Link from "next/link";
import { Carousel } from "@/components/ui/carousel";
import { getNutrientDefinition } from "@/lib/nutrients";
import { NUTRIENT_COLORS, nutrientDot } from "@/lib/nutrient-colors";
import { RICH_NUTRIENT_IDS, richName } from "@/lib/rich-in";

/**
 * "Món giàu vi chất": one tile per nutrient with a rich-in list, as a carousel on Khám phá. The tile says
 * "Giàu <nutrient>" in Saira and opens /explore/rich/[nutrient].
 * V3-SPEC §1: the tile is the nutrient's colour (lib/nutrient-colors). White text needs 4,5:1, which the base system
 * colours (yellow, orange, cyan, green) do not give, so the tile takes the deep shade (`nutrientDot`, as the design file
 * does). A long name (Magnesium, Potassium) steps down from 26 to 22 px so it stays on one line in the 152 px tile; Đạm and Chất xơ have no colour and stay ink.
 */
export function RichCarousel() {
  return (
    <Carousel title="Món giàu vi chất" id="explore-rich">
      {RICH_NUTRIENT_IDS.map((id) => {
        const def = getNutrientDefinition(id);
        const name = def ? richName(def) : id;
        const coloured = id in NUTRIENT_COLORS;
        return (
          <li key={id} className="w-[9.5rem] shrink-0 snap-start">
            <Link
              href={`/explore/rich/${id}`}
              onClick={() => markUsed("rich-in")}
              style={coloured ? { background: nutrientDot(id) } : undefined}
              className={`m-hover flex h-full min-h-[112px] flex-col justify-between gap-3 rounded-card p-4 text-on-accent no-underline active:scale-[0.97] transition-press motion-reduce:active:scale-100 ${coloured ? "" : "bg-ink"}`}
            >
              <span className={`font-display font-black italic leading-none tracking-[-0.01em] ${name.length > 8 ? "text-title-sm" : "text-title"}`}>Giàu {name}</span>
              <span className="text-cap font-semibold">Xem món</span>
            </Link>
          </li>
        );
      })}
    </Carousel>
  );
}
