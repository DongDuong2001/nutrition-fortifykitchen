"use client";

import React, { useEffect, useRef, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { PillButton } from "@/components/ui/pill-button";
import { IconCheck, IconEye, IconGrid, IconHome, IconShare, IconTarget } from "@/components/ui/icons";
import { CloseIcon } from "@/components/pwa/install-icons";
import { SHEET_ICON_BUTTON, SHEET_TITLE_CLASS } from "@/components/pwa/install-sheet";
import type { Release, ReleaseIcon } from "@/lib/releases";

const TITLE_ID = "whats-new-title";
const EXIT_MS = 140;

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
              <p className="m-0 text-[15px] font-bold leading-snug text-text">{item.title}</p>
              <p className="m-0 text-sm leading-snug text-secondary">{item.body}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * "Có gì mới" (WNSheet): the latest release's items, with "Thử ngay (1 phút)" when the release has a tour. A bottom
 * sheet on the phone, a centred 480 px dialog from 1024 px. Any close calls onClose once, after the 140 ms exit.
 */
export function WhatsNewSheet({ release, open, onClose }: { release: Release; open: boolean; onClose: (tryTour: boolean) => void }) {
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (open) setLeaving(false);
  }, [open]);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const close = (tryTour: boolean) => {
    if (timer.current) return;
    setLeaving(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      onClose(tryTour);
    }, EXIT_MS);
  };

  return (
    <Sheet
      motion={false}
      open={open}
      onClose={() => close(false)}
      labelledBy={TITLE_ID}
      initialFocusId={TITLE_ID}
      desktopDialog
      className={`gap-3 lg:w-[480px]! lg:max-w-[480px]! ${leaving ? "wn-leave" : "wn-enter"}`}
    >
      <header data-align-group="wn-sheet" className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="m-0 text-xs font-bold text-cobalt">Cập nhật {release.date}</p>
          <h2 id={TITLE_ID} tabIndex={-1} className={`${SHEET_TITLE_CLASS} text-[26px] outline-none`}>
            Có gì mới
          </h2>
        </div>
        <button type="button" aria-label="Đóng" onClick={() => close(false)} className={`${SHEET_ICON_BUTTON} -mr-2`}>
          <CloseIcon />
        </button>
      </header>
      <div data-align-group="wn-sheet">
        <ReleaseItems release={release} alignGroup="wn-items" />
      </div>
      <div data-align-group="wn-sheet" className="flex flex-col gap-2">
        {release.tour && release.tour.length > 0 && <PillButton onClick={() => close(true)}>Thử ngay (1 phút)</PillButton>}
        <PillButton variant="secondary" onClick={() => close(false)}>
          Để sau
        </PillButton>
      </div>
    </Sheet>
  );
}
