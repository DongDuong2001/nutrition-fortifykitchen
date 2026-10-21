"use client";

import React from "react";
import Link from "next/link";

export interface SegmentedItem<K extends string> {
  key: K;
  label: React.ReactNode;
  /** Links (a sub-tab bar) navigate and mark the current one with aria-current; without href they are buttons. */
  href?: string;
  /** Screen-reader text added after the label ("7" → "7 ngày"). */
  srSuffix?: string;
}

/**
 * The segmented control (V3-SPEC §1 segTrack, design-floor 8): a #E3E3E8 track with 4 px padding and 12 px corners on
 * the page; each segment is a 44 px hit area around a 36 px pill, the selected one white with a hairline ring and bold
 * ink text, the others secondary. Equal columns (`fill`, the default: AGENTS layout rule 4) or fitted to their labels.
 * Links get aria-current; buttons get aria-pressed inside a labelled group.
 */
export function Segmented<K extends string>({
  items,
  value,
  onChange,
  label,
  fill = true,
  as = "group",
  className = "",
  alignGroup,
}: {
  items: SegmentedItem<K>[];
  value: K;
  onChange?: (key: K) => void;
  /** The accessible name of the group or nav. */
  label: string;
  fill?: boolean;
  /** "group" (buttons with aria-pressed), "nav" (links with aria-current) or "tabs" (role tablist / tab with aria-selected: one
   * choice switches what the screen lists). */
  as?: "group" | "nav" | "tabs";
  className?: string;
  alignGroup?: string;
}) {
  const track = `rounded-xl bg-seg-track p-1 ${fill ? "grid" : "inline-flex"} ${className}`;
  const style = fill ? { gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` } : undefined;
  const pill = (on: boolean) =>
    `relative flex h-9 w-full items-center justify-center whitespace-nowrap rounded-[9px] px-3 text-cap transition-press ${
      on ? "bg-raised font-bold text-text shadow-[0_0_0_1px_var(--color-card-border)]" : "font-semibold text-secondary"
    }`;
  const cell = "-my-1 flex min-h-11 min-w-11 items-center justify-center no-underline transition-press active:scale-[0.97] motion-reduce:active:scale-100";
  const body = items.map((item) => {
    const on = item.key === value;
    const inner = (
      <span className={pill(on)}>
        {item.label}
        {item.srSuffix && <span className="sr-only">{item.srSuffix}</span>}
      </span>
    );
    return item.href ? (
      <Link key={item.key} href={item.href} aria-current={on ? "page" : undefined} onClick={() => onChange?.(item.key)} className={cell}>
        {inner}
      </Link>
    ) : as === "tabs" ? (
      <button key={item.key} type="button" role="tab" aria-selected={on} onClick={() => onChange?.(item.key)} className={`${cell} border-0 bg-transparent p-0`}>
        {inner}
      </button>
    ) : (
      <button key={item.key} type="button" aria-pressed={on} onClick={() => onChange?.(item.key)} className={`${cell} border-0 bg-transparent p-0`}>
        {inner}
      </button>
    );
  });
  return as === "nav" ? (
    <nav aria-label={label} data-align-group={alignGroup} className={track} style={style}>
      {body}
    </nav>
  ) : (
    <div role={as === "tabs" ? "tablist" : "group"} aria-label={label} data-align-group={alignGroup} className={track} style={style}>
      {body}
    </div>
  );
}
