/**
 * The display name (setup, Cài đặt, the share image): one set of rules, so a name that passes in one place passes in
 * all. It is Unicode-normalised (NFC, so "ệ" typed as two code points equals the one-point form), stripped of control
 * and invisible format characters (a zero-width space is not a name) except the zero-width joiner that holds an emoji
 * together (👩‍🍳 is one picture, not 👩 and 🍳), trimmed, at most 40 code points, and has at least one letter or digit.
 */
export const DISPLAY_NAME_MAX = 40;

const ZWJ = "\u200D";

/** The name as it is saved. Empty means not set. */
export function cleanDisplayName(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFC")
    .replace(/[\p{Cc}\p{Cf}]/gu, (c) => (c === ZWJ ? c : ""))
    .replace(/^[\s\u200D]+|[\s\u200D]+$/g, "");
}

/**
 * What an input holds: at most DISPLAY_NAME_MAX code points. The maxLength attribute counts UTF-16 units, so it cuts
 * an emoji name at 20 and can split a pair in two; this counts as validateDisplayName does.
 */
export function limitDisplayName(value: string): string {
  const points = Array.from(value);
  return points.length > DISPLAY_NAME_MAX ? points.slice(0, DISPLAY_NAME_MAX).join("") : value;
}

/** A Vietnamese error when the name cannot be used, else null. Blank is an error: a name is required. */
export function validateDisplayName(value: string | null | undefined): string | null {
  const name = cleanDisplayName(value);
  if (name === "") return "Nhập tên hiển thị";
  if ([...name].length > DISPLAY_NAME_MAX) return `Tên hiển thị tối đa ${DISPLAY_NAME_MAX} ký tự`;
  if (!/[\p{L}\p{N}]/u.test(name)) return "Tên cần có ít nhất một chữ cái hoặc chữ số";
  return null;
}
