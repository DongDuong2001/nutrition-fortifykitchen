/** The last two initials of a name ("Nguyễn Thu Hà" gives "TH"), upper case, for the avatar circle. */
export function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(-2)
    .join("")
    .toLocaleUpperCase("vi-VN");
}
