import { formatNumber } from "../../lib/format";
import { goalName } from "../../lib/onboarding";
import type { Profile } from "../../lib/profile";

export function sexLabel(sex: Profile["sex"]): string {
  return sex === "male" ? "Nam" : "Nữ";
}

/** "Nam · sinh 2003 · 65 kg · Giữ cân": the profile card and the Hồ sơ header. */
export function profileSummary(profile: Profile): string {
  return `${sexLabel(profile.sex)} · sinh ${profile.birthYear} · ${formatNumber(profile.weightKg)} kg · ${goalName(profile.goal)}`;
}

/** The Cài đặt profile card title: the name when one is set. */
export function profileTitle(profile: Profile): string {
  return profile.displayName || "Hồ sơ của bạn";
}
