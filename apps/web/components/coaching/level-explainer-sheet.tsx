"use client";

import { Sheet } from "@/components/ui/sheet";
import { LevelBadge } from "@/components/profile/level-badge";
import { LEVELS, type Level } from "@/lib/coaching-link";
import { ASK_COACH_TEXT, explainerNextLine, explainerSummaryLine } from "@/lib/level-copy";

/**
 * "Level là gì?" (LevelExplainer.dc.html): what Level means, the ladder with the mini badges, the user's own row tinted, what the
 * next one adds, the past ones quieter. The Level is the coach's to set, so the way up is to ask the coach.
 */
export function LevelExplainerSheet({ open, onClose, level }: { open: boolean; onClose: () => void; level: Level }) {
  return (
    <Sheet open={open} onClose={onClose} title="Level là gì?" titleId="level-explainer-title" desktopDialog>
      <p className="m-0 px-1 text-cap leading-snug text-secondary">HLV đặt Level cho bạn. Level càng cao, Hôm nay càng hiện nhiều vi chất.</p>
      <ol className="m-0 flex list-none flex-col p-0">
        {LEVELS.map((l) => {
          const current = l === level;
          return (
            <li
              key={l}
              data-align-group="level-row"
              aria-current={current ? "true" : undefined}
              className={`flex min-h-13 items-center gap-2 border-t py-1.5 pr-2 ${current ? "rounded-xl bg-cobalt-tint" : ""} ${
                current || l === 0 ? "border-transparent" : "border-divider"
              }`}
            >
              <span className="flex w-23 flex-none justify-center">
                <LevelBadge level={l} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className={`text-sm leading-snug ${current ? "font-bold text-text" : l < level ? "text-secondary" : "text-text"}`}>
                  {explainerSummaryLine(l)}
                </span>
                {current && <span className="text-xs font-bold text-cobalt">Level của bạn</span>}
                {l === level + 1 && <span className="text-xs leading-4 text-secondary-strong">{explainerNextLine(level)}</span>}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="flex items-center gap-3 rounded-card bg-page px-4 py-3">
        <svg viewBox="0 0 24 24" width="22" height="22" className="flex-none text-cobalt" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l.9-5.4A8 8 0 1 1 21 12z" />
        </svg>
        <p className="m-0 text-sm leading-snug text-text">
          <b>{ASK_COACH_TEXT}.</b> Lên Level là có màn chúc mừng và thêm vi chất ngay trong Hôm nay.
        </p>
      </div>
    </Sheet>
  );
}
