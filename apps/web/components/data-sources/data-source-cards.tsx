import React from "react";
import { Card } from "@/components/ui/card";
import { SettingsTile } from "@/components/ui/settings-tile";
import { SETTINGS_ICONS } from "@/components/settings/settings-icons";
import { DATA_SOURCES, DATA_READING_GUIDE } from "@/lib/data-sources";

const INFO_GLYPH = (
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v6M12 7.5v.01" />
  </>
);

/** One column on the phone; on desktop the sources sit two to a row and the reading guide spans both. */
export function DataSourceCards() {
  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
      {DATA_SOURCES.map((source) => (
        <Card as="article" key={source.id} className="flex select-text flex-col gap-1 p-4">
          <div className="mb-1 flex items-center gap-3">
            <SettingsTile tone="data">{source.id === "custom" ? SETTINGS_ICONS.account : SETTINGS_ICONS.database}</SettingsTile>
            <h3 className="m-0 text-callout font-bold leading-snug text-text">{source.name}</h3>
          </div>
          <p className="m-0 text-cap leading-normal text-secondary">{source.description}</p>
        </Card>
      ))}

      <Card as="article" className="flex select-text flex-col gap-2 p-4 lg:col-span-2">
        <div className="flex items-center gap-3">
          <SettingsTile tone="privacy">{INFO_GLYPH}</SettingsTile>
          <h3 className="m-0 text-callout font-bold leading-snug text-text">{DATA_READING_GUIDE.title}</h3>
        </div>
        <ul className="m-0 flex list-disc flex-col gap-1 pl-4 text-cap leading-normal text-secondary">
          <li>{DATA_READING_GUIDE.bullet1}</li>
          <li>{DATA_READING_GUIDE.bullet2}</li>
        </ul>
      </Card>
    </div>
  );
}
