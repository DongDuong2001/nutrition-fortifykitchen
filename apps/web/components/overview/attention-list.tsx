import React from "react";
import { AttentionRow } from "@/components/overview/parts/attention-row";

export interface AttentionItem {
  id: string;
  href: string;
  title: string;
  line: string;
  extra?: string;
  number: string;
  gap?: boolean;
  /** The nutrient's share of its target: colours the number by level */
  percentage?: number | null;
  /** A nutrient id: its colour dot goes before the title */
  dotKey?: string;
}

/** "Cần chú ý": at most three facts as AttentionRows under a 16 px bold heading (V3 trends). Renders nothing when empty. */
export function AttentionList({ items, title = "Cần chú ý", large = false }: { items: AttentionItem[]; title?: string; large?: boolean }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="ov-attention" className="flex flex-col gap-2">
      <h2 id="ov-attention" className="m-0 text-base font-bold leading-snug">
        {title}
      </h2>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {items.slice(0, 3).map((item) => (
          <li key={item.id}>
            <AttentionRow
              href={item.href}
              title={item.title}
              line={item.line}
              extra={item.extra}
              number={item.number}
              gap={item.gap}
              percentage={item.percentage}
              dotKey={item.dotKey}
              large={large}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
