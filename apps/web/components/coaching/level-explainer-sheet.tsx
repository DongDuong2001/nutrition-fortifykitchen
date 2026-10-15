"use client";

import { Sheet } from "@/components/ui/sheet";
import { PillButton } from "@/components/ui/pill-button";
import { LevelBadge } from "@/components/profile/level-badge";
import { LEVELS, type Level } from "@/lib/coaching-link";
import { ASK_COACH_TEXT, levelSummaryLine } from "@/lib/level-copy";

/**
 * "Level là gì?": what Level means, what each Level shows, the user's own highlighted, and how to move up.
 * The Level is the coach's to set, so the way up is to ask the coach.
 */
export function LevelExplainerSheet({ open, onClose, level }: { open: boolean; onClose: () => void; level: Level }) {
  return (
    <Sheet open={open} onClose={onClose} title="Level là gì?" titleId="level-explainer-title" desktopDialog>
      <p className="m-0 px-1 text-[13px] leading-snug text-secondary">
        Level do huấn luyện viên đặt cho bạn. Level càng cao, Hôm nay càng hiện nhiều vi chất.
      </p>
      <ol className="m-0 flex list-none flex-col p-0">
        {LEVELS.map((l) => {
          const current = l === level;
          return (
            <li
              key={l}
              data-align-group="level-row"
              aria-current={current ? "true" : undefined}
              className={`flex min-h-[56px] items-center gap-3 border-t border-divider px-2 py-2 first:border-t-0 ${current ? "rounded-xl bg-blue/10" : ""}`}
            >
              <LevelBadge level={l} />
              <span className="min-w-0 flex-1 text-[15px] leading-snug text-text">
                <span className={current ? "font-bold" : ""}>{levelSummaryLine(l)}</span>
                {current && <span className="ml-1 text-[13px] font-semibold text-blue">· Level của bạn</span>}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="m-0 px-1 text-[15px] font-bold text-text">{ASK_COACH_TEXT}</p>
      <PillButton type="button" variant="secondary" onClick={onClose}>
        Đóng
      </PillButton>
    </Sheet>
  );
}
