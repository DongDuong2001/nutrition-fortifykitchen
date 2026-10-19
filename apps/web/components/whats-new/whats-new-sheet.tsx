"use client";

import React from "react";
import { Sheet } from "@/components/ui/sheet";
import { PillButton } from "@/components/ui/pill-button";
import { IconCheck, IconEye, IconGrid, IconHome, IconShare, IconTarget } from "@/components/ui/icons";
import { CloseIcon } from "@/components/pwa/install-icons";
import { SHEET_ICON_BUTTON, SHEET_TITLE_CLASS } from "@/components/pwa/install-sheet";
import type { Release, ReleaseIcon } from "@/lib/releases";

const TITLE_ID = "whats-new-title";

const RELEASE_ICONS: Record<ReleaseIcon, React.ComponentType<{ size?: number }>> = {
  home: IconHome,
  select: IconCheck,
  target: IconTarget,
  meal: IconEye,
  bars: IconGrid,
  share: IconShare,
};

/** One release's items: 36 px icon tile, 15 px bold title, 14 px body, a divider between items. Also on /settings/whats-new. */
export function ReleaseItems({ release, alignGroup }: { release: Release; alignGroup: string }) {
  return (
    <ul data-align-group={alignGroup} className="m-0 flex list-none flex-col p-0">
      {release.items.map((item) => {
        const Icon = RELEASE_ICONS[item.icon];
        return (
          <li key={item.title} className="flex gap-3 border-t border-divider py-3 first:border-t-0">
            <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface text-cobalt">
              <Icon size={20} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="m-0 text-callout font-bold leading-snug text-text">{item.title}</p>
              <p className="m-0 text-sm leading-snug text-secondary">{item.body}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * "Có gì mới" (WNSheet): the items of every release the account has not seen, grouped by release, newest first, with
 * "Thử ngay (1 phút)" when their tours have a step to show (`canTour`). A bottom sheet on the phone, a centred 480 px
 * dialog from 1024 px; the list scrolls when it is long. cc-55: it moves like every other sheet (the shared m-sheet
 * motion), so a close calls onClose at once and the sheet slides away by itself.
 */
export function WhatsNewSheet({ releases, canTour, open, onClose }: { releases: readonly Release[]; canTour: boolean; open: boolean; onClose: (tryTour: boolean) => void }) {
  const newest = releases[0];
  const close = (tryTour: boolean) => {
    if (open) onClose(tryTour);
  };

  return (
    <Sheet
      open={open}
      onClose={() => close(false)}
      labelledBy={TITLE_ID}
      initialFocusId={TITLE_ID}
      desktopDialog
      className="gap-3 lg:w-[480px]! lg:max-w-[480px]!"
    >
      <header data-align-group="wn-sheet" className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="m-0 text-xs font-bold text-cobalt">Cập nhật {newest?.date}</p>
          <h2 id={TITLE_ID} tabIndex={-1} className={`${SHEET_TITLE_CLASS} text-title outline-none`}>
            Có gì mới
          </h2>
        </div>
        <button type="button" aria-label="Đóng" onClick={() => close(false)} className={`${SHEET_ICON_BUTTON} -mr-2`}>
          <CloseIcon />
        </button>
      </header>
      {/* One group per release; a later group of another day names its day. Focusable so the keyboard can scroll it. */}
      <div
        data-align-group="wn-sheet"
        role="region"
        aria-label="Các thay đổi"
        tabIndex={0}
        className="flex max-h-[55dvh] flex-col overflow-y-auto overscroll-contain rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-cobalt"
      >
        {releases.map((release, i) => (
          <section key={release.id} aria-label={`Cập nhật ${release.date}`} className={i > 0 ? "border-t-2 border-divider pt-2" : ""}>
            {i > 0 && release.date !== releases[i - 1].date && <p className="m-0 text-xs font-bold text-cobalt">Cập nhật {release.date}</p>}
            <ReleaseItems release={release} alignGroup="wn-items" />
          </section>
        ))}
      </div>
      <div data-align-group="wn-sheet" className="flex flex-col gap-2">
        {canTour && <PillButton onClick={() => close(true)}>Thử ngay (1 phút)</PillButton>}
        <PillButton variant="secondary" onClick={() => close(false)}>
          Để sau
        </PillButton>
      </div>
    </Sheet>
  );
}
