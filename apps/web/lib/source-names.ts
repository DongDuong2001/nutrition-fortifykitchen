/**
 * The one table of food source codes: what the food page calls a source (foodSourceLabel) and the small tag of a search
 * result (searchTag). Both read it, so a source the catalogue gains is named in one place and the two cannot drift.
 */

export type SearchTagLabel = "USDA" | "Nhãn" | "VN" | "Canada" | "ASEAN" | "Tài liệu" | "Ước tính" | "Của tôi" | "Tự nhập" | "Chưa rõ";

export interface SourceName {
  /** The food page and the source sheet ("CNF (Canada)"). */
  label: string;
  /** The search result's tag ("Canada"). */
  tag: SearchTagLabel;
  /** The numbers are not the food's own (shared or worked out): the tag shows as a warning. */
  warning?: boolean;
}

const USDA: SourceName = { label: "USDA", tag: "USDA" };
const VN: SourceName = { label: "Bảng TPDD Việt Nam", tag: "VN" };
const ESTIMATE: SourceName = { label: "Ước tính", tag: "Ước tính", warning: true };
const OWN: SourceName = { label: "Của tôi", tag: "Của tôi" };

/** By normalised code (sourceKey). Any code that starts with "usda" is USDA (usda_sr_legacy, usda_foundation, usda_fndds). */
export const SOURCE_NAMES: Readonly<Record<string, SourceName>> = {
  usda: USDA,
  label: { label: "Nhãn", tag: "Nhãn" },
  "vn-fct": VN,
  "vn-table": VN,
  "vn-nin": VN,
  cnf: { label: "CNF (Canada)", tag: "Canada" },
  asean: { label: "ASEAN", tag: "ASEAN" },
  literature: { label: "Tài liệu", tag: "Tài liệu" },
  community: ESTIMATE,
  "recipe-calc": ESTIMATE,
  user: OWN,
  custom: OWN,
};

/** A source code as the table keys it: trimmed, lower case, spaces and underscores as "-" ("VN FCT" → "vn-fct"). */
export const sourceKey = (source?: string | null): string => (source ?? "").trim().toLowerCase().replace(/[\s_]+/g, "-");

/** The names of a source, or null for none or one the table does not know. */
export function sourceName(source?: string | null): SourceName | null {
  const key = sourceKey(source);
  if (key.startsWith("usda")) return USDA;
  return Object.hasOwn(SOURCE_NAMES, key) ? SOURCE_NAMES[key] : null;
}
