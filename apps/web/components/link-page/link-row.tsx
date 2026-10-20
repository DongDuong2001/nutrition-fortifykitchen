import type { ReactNode } from "react";

/**
 * One row of the link page (LinkKhanh.dc.html): icon, name over one line, and the action word. The whole row is the
 * one link or button (ROW_CLASS goes on it); the 1 px divider is on the <li> around it, inside the 68 px (72 px) row.
 */
export const ROW_CLASS =
  "grid min-h-[67px] grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-x-[14px] px-1 text-left no-underline lg:min-h-[71px] lg:grid-cols-[36px_minmax(0,1fr)_auto] lg:gap-x-4";

/** The 32 px (36 px on desktop) square the icon fills. */
export const ROW_ICON_CLASS = "h-8 w-8 rounded-lg lg:h-9 lg:w-9 lg:rounded-[9px]";

export function LinkRowContent({ icon, title, line, action }: { icon: ReactNode; title: string; line: string; action: string }) {
  return (
    <>
      {icon}
      <span className="flex min-w-0 flex-col gap-[2px]">
        <span className="text-[1.1875rem] font-bold leading-[normal] text-ink lg:text-[1.25rem]">{title}</span>
        <span className="text-sm leading-[normal] text-secondary lg:text-callout">{line}</span>
      </span>
      <span className="flex min-h-11 items-center text-body-lg font-bold text-cobalt lg:text-[1.125rem]">{action}</span>
    </>
  );
}
