import React from "react";
import { SectionTitle } from "@/components/ui/section-title";

/**
 * A titled horizontal carousel: scroll-snap, the next card's edge stays visible, a real list. Children are
 * <li> cards (a fixed width, shrink-0 snap-start). It bleeds 16 px to the screen edge so cards slide under the gutter.
 */
export function Carousel({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <section aria-label={title} id={id} className="flex flex-col">
      <SectionTitle as="h3" className="flex min-h-[44px] items-center">
        {title}
      </SectionTitle>
      <ul
        role="list"
        className="m-0 -mx-4 flex snap-x snap-mandatory list-none gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 [scrollbar-width:none]"
      >
        {children}
      </ul>
    </section>
  );
}
