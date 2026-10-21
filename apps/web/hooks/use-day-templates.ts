"use client";

import { useMemo, useSyncExternalStore } from "react";
import { CATALOG_FOODS, catalogVersion, subscribeCatalog } from "@/lib/catalog";
import { createDeviceStore } from "@/lib/device-store";
import {
  DAY_TEMPLATES_KEY,
  TEMPLATE_PILL_HIDDEN_KEY,
  hidePillFor,
  isPillHidden,
  parseDayTemplates,
  parsePillHidden,
  templateMealKcal,
  templateTotals,
  type DayTemplate,
} from "@/lib/day-templates";

const templateStore = createDeviceStore<DayTemplate[]>({ key: DAY_TEMPLATES_KEY, parse: parseDayTemplates, empty: [] });
const pillStore = createDeviceStore<string[]>({ key: TEMPLATE_PILL_HIDDEN_KEY, parse: parsePillHidden, empty: [] });

/** The saved days of this device (newest first, as saved). Draws nothing until the page is on the client. */
export function useDayTemplates(): { templates: DayTemplate[]; setTemplates: (next: DayTemplate[]) => void } {
  const templates = useSyncExternalStore(templateStore.subscribe, templateStore.get, templateStore.getServer);
  return { templates, setTemplates: templateStore.set };
}

/** The saved days with what a copy adds ("N món · X kcal", each meal's kcal). The foods are looked up in the catalogue, which may still be on its way. */
export function useDayTemplateRows() {
  const { templates, setTemplates } = useDayTemplates();
  // The catalogue arriving changes what a template adds. Only its version is read: this is on Hôm nay, which loads nothing for it
  const version = useSyncExternalStore(subscribeCatalog, catalogVersion, () => 0);
  const rows = useMemo(
    () => templates.map((template) => ({ template, ...templateTotals(template, CATALOG_FOODS), perMeal: templateMealKcal(template, CATALOG_FOODS) })),
    // version: a catalogue that arrives changes what a template adds
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [templates, version]
  );
  return { rows, templates, setTemplates };
}

/** The "Chép ngày mẫu" pill's ×: whether the pill is hidden for a date, and hiding it for that date only. */
export function useTemplatePillHidden(iso: string | null, todayIso: string | null): { hidden: boolean; hide: () => void } {
  const hiddenDates = useSyncExternalStore(pillStore.subscribe, pillStore.get, pillStore.getServer);
  return {
    hidden: iso !== null && isPillHidden(hiddenDates, iso),
    hide: () => {
      if (iso && todayIso) pillStore.set(hidePillFor(pillStore.get(), iso, todayIso));
    },
  };
}
