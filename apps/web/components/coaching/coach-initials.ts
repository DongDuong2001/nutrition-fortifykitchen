const segmenter = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter("vi", { granularity: "grapheme" }) : null;

/** The first character a person sees in a word: a grapheme (an emoji with its joiners, a letter with its accents), not a UTF-16 unit. */
function firstGrapheme(word: string): string {
  if (segmenter) {
    for (const part of segmenter.segment(word)) return part.segment;
    return "";
  }
  return Array.from(word)[0] ?? "";
}

/**
 * The initials of a name for the avatar circle, upper case: the first character of the first and of the last word
 * ("Nguyễn Văn A" gives "NA", "Học viên A" gives "HA", "Linh" gives "L"). Empty words (a double space, a stray
 * space at either end) are skipped, and an emoji or a letter with accents counts as one character ("👩‍🍳 Mai" gives
 * "👩‍🍳M", never "�"). A name with no word gives "".
 */
export function initialsOf(name: string): string {
  const words = name.normalize("NFC").split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const picked = words.length === 1 ? [words[0]] : [words[0], words[words.length - 1]];
  return picked.map(firstGrapheme).join("").toLocaleUpperCase("vi-VN");
}
