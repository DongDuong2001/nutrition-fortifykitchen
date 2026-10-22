import { useEffect, useState } from "react";
import { loadSettings } from "@/lib/settings";
import { vi, type MessageKey, type Message } from "./vi";
import { en } from "./en";

/**
 * English, the hidden foundation (overnight 23/10, job 15; the plan is docs/plans/english.md). No library: the
 * messages are typed objects (vi is the source, en must have every key), and plurals, numbers and dates come from Intl.
 *
 * The flag is OFF: everyone gets Vietnamese, even an account that already picked English in Cài đặt › Ngôn ngữ (that
 * choice has been on the page since cc-24 and did nothing). It turns on with NEXT_PUBLIC_ENGLISH=1 at build time or, in a
 * demo build only, with h1t_english_preview=1 in localStorage (tests/probes/i18n_foundation.py uses that).
 */

export type Locale = "vi" | "en";
export type Params = Record<string, string | number>;

export const ENGLISH_PREVIEW_KEY = "h1t_english_preview";
const BUILD_ON = process.env.NEXT_PUBLIC_ENGLISH === "1";
const DEMO_BUILD = process.env.NEXT_PUBLIC_DEMO_BUILD === "1";

const MESSAGES: Record<Locale, Record<MessageKey, Message>> = { vi, en };
const INTL_LOCALE: Record<Locale, string> = { vi: "vi-VN", en: "en-US" };

/** Pure: the flag from the build switch and, in a demo build only, the preview key. */
export function englishOn(buildOn: boolean, demoBuild: boolean, preview: string | null): boolean {
  return buildOn || (demoBuild && preview === "1");
}

export function englishEnabled(): boolean {
  let preview: string | null = null;
  try {
    preview = globalThis.localStorage?.getItem(ENGLISH_PREVIEW_KEY) ?? null;
  } catch {}
  return englishOn(BUILD_ON, DEMO_BUILD, preview);
}

/** The locale to draw: the saved Ngôn ngữ while the flag is on, Vietnamese otherwise. */
export function currentLocale(): Locale {
  return englishEnabled() ? loadSettings().language : "vi";
}

/** One message in a locale: {name} placeholders filled, the plural form picked by Intl.PluralRules on {count}. */
export function translate(locale: Locale, key: MessageKey, params: Params = {}): string {
  const message = MESSAGES[locale][key];
  const text =
    typeof message === "string"
      ? message
      : message[new Intl.PluralRules(INTL_LOCALE[locale]).select(Number(params.count ?? 0)) as keyof typeof message] ?? message.other;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in params ? String(params[name]) : whole));
}

export type T = (key: MessageKey, params?: Params) => string;

/** t() for a component. Vietnamese on the server and the first paint (no mismatch); the saved locale after mount. */
export function useT(): T {
  const [locale, setLocale] = useState<Locale>("vi");
  useEffect(() => setLocale(currentLocale()), []);
  return (key, params) => translate(locale, key, params);
}

export function formatNumberIn(locale: Locale, value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], options).format(value);
}

export type { MessageKey };
