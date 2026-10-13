import React from "react";
import { AttentionRow } from "@/components/overview/parts/attention-row";
import { SectionTitle } from "@/components/ui/section-title";

export interface AttentionItem {
  id: string;
  href: string;
  title: string;
  line: string;
  extra?: string;
  number: string;
  gap?: boolean;
}

/** "Cần chú ý": at most three facts as AttentionRows under a section title. Renders nothing when empty. */
export function AttentionList({ items, title = "Cần chú ý" }: { items: AttentionItem[]; title?: string }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="ov-attention" className="flex flex-col gap-2">
      <SectionTitle id="ov-attention">{title}</SectionTitle>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {items.slice(0, 3).map((item) => (
          <li key={item.id}>
            <AttentionRow href={item.href} title={item.title} line={item.line} extra={item.extra} number={item.number} gap={item.gap} />
          </li>
        ))}
      </ul>
    </section>
  );
}
