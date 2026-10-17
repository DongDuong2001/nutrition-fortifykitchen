/**
 * The coach link page at "/" (LinkKhanh.dc.html): who the coach is and where each link goes. "#" and null are
 * placeholders until Hao supplies the real links, photo and logo (OPEN_QUESTIONS cc-45).
 */
export const COACH = {
  name: "Lê Hồng Khánh",
  initials: "LHK",
  tagline: "Huấn luyện viên · HIT1 Coaching · 1 set là đủ",
  /** A square photo under public/, or null for the initials. */
  photo: null as string | null,
};

export const COACH_SOCIAL = [
  { id: "facebook", label: "Facebook", href: "#" },
  { id: "youtube", label: "YouTube", href: "#" },
  { id: "tiktok", label: "TikTok", href: "#" },
] as const;

export const FORTIFY_KITCHEN = {
  name: "Fortify Kitchen",
  line: "Bếp ăn chuẩn vị, ngon, lành và phải chăng",
  orderHref: "#",
  /** A square logo under public/, or null for the "FK" tile. */
  logo: null as string | null,
};
