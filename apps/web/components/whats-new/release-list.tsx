import React from "react";
import { SettingsTile, type SettingsTileTone } from "@/components/ui/settings-tile";
import type { Release, ReleaseIcon } from "@/lib/releases";

/** The glyphs of a release item (V3WhatsNew's ICON map, a 24 grid) and the tile colour each one takes. */
const GLYPHS: Record<ReleaseIcon, { tone: SettingsTileTone; paths: React.ReactNode }> = {
  home: { tone: "app", paths: <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" /> },
  select: { tone: "app", paths: <path d="M5 12.5l4.5 4.5L19 7.5" /> },
  target: {
    tone: "targets",
    paths: <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" />,
  },
  meal: {
    tone: "targets",
    paths: <path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z" />,
  },
  bars: { tone: "data", paths: <path d="M4 4h6.5v6.5H4zM13.5 4H20v6.5h-6.5zM4 13.5h6.5V20H4zM13.5 13.5H20V20h-6.5z" /> },
  share: { tone: "app", paths: <path d="M12 15V4M8 8l4-4 4 4M6 11H5a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1h-1" /> },
};

/** One release's items on the Có gì mới page (V3WhatsNew): a 30 px coloured tile, a 15 px bold title, a 14 px body, inset dividers. */
export function ReleaseList({ release, alignGroup }: { release: Release; alignGroup: string }) {
  return (
    <ul data-align-group={alignGroup} className="m-0 flex list-none flex-col p-0">
      {release.items.map((item) => {
        const glyph = GLYPHS[item.icon];
        return (
          <li key={item.title} className="flex items-center gap-3 border-t border-divider py-2 first:border-t-0 first:pt-1">
            <SettingsTile tone={glyph.tone}>{glyph.paths}</SettingsTile>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="m-0 text-callout font-bold leading-tight text-text">{item.title}</p>
              <p className="m-0 text-sm leading-snug text-secondary">{item.body}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
