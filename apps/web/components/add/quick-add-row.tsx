import React from "react";

export interface QuickAddRowProps {
  name: string;
  /** Second line: the portion and kcal, or the number of foods. */
  meta: string;
  /** Tap the row to add. Names the action for screen readers, e.g. "Thêm Yến mạch 60 g". */
  addLabel: string;
  onAdd: () => void;
  /** After the row: a chevron that opens the portion panel, or a ⋯ that manages the item. */
  trailing?: React.ReactNode;
  withBorderTop?: boolean;
}

/**
 * One tap adds. A row of the add sheet and of Bữa ăn của tôi in Khám phá: the whole left part is the add button
 * (name, meta, a + mark), the right part is a separate 44 px control. Row min 52 px (UI-RULES row pattern).
 */
export function QuickAddRow({ name, meta, addLabel, onAdd, trailing, withBorderTop = true }: QuickAddRowProps) {
  return (
    <div data-quick-row className={`flex items-center gap-1 ${withBorderTop ? "border-t border-divider" : ""}`}>
      <button
        type="button"
        onClick={onAdd}
        aria-label={addLabel}
        className="flex min-h-[52px] min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl border-0 bg-transparent py-2 text-left text-text active:scale-[0.99] motion-reduce:active:scale-100"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="line-clamp-2 text-[15px] font-semibold leading-snug">{name}</span>
          <span className="line-clamp-2 text-[13px] leading-tight text-secondary">{meta}</span>
        </span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="shrink-0 text-blue" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
      {trailing}
    </div>
  );
}

