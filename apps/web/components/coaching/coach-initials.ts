/** The last two initials of a name ("Học viên A" gives "VA"), upper case, for the avatar circle. */
export function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(-2)
    .join("")
    .toLocaleUpperCase("vi-VN");
}
