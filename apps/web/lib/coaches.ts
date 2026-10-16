export interface CoachSocialLinks {
  zaloGroup?: string;
  facebookCommunity?: string;
  bookingUrl?: string;
}

export interface CoachProfile {
  id: string;
  name: string;
  title: string;
  avatarUrl?: string;
  bio: string;
  specialties: string[];
  /** Only what has been verified. Empty until Hao supplies the real ones (OPEN_QUESTIONS). */
  credentials: string[];
  experienceYears?: number;
  clientsHelped?: number;
  social: CoachSocialLinks;
  recommendedFoods: string[];
  featured: boolean;
}

export const COACH_SPECIALTIES = [
  "Tất cả",
  "Tăng cơ",
  "Giảm mỡ bền vững",
  "Dinh dưỡng nữ giới",
  "Dinh dưỡng thể thao",
  "Sức bền & Marathon",
];

/**
 * The sample coaches of mock and demo mode (live mode shows none: lib/coaching-link coachingAvailable). Khánh is the
 * real coach; his card carries only what is known, and the rest waits for the real text (OPEN_QUESTIONS). The other
 * two are placeholders, named so.
 */
export const FEATURED_COACHES: CoachProfile[] = [
  {
    id: "coach-khanh",
    name: "Lê Hồng Khánh",
    title: "Huấn luyện viên H1T",
    bio: "Giới thiệu đang được cập nhật.",
    specialties: ["Tăng cơ", "Dinh dưỡng thể thao", "Tối ưu vi chất", "Giảm mỡ bền vững"],
    credentials: [],
    social: {},
    recommendedFoods: [],
    featured: true,
  },
  {
    id: "coach-ha",
    name: "HLV Demo A",
    title: "Huấn luyện viên mẫu",
    bio: "Hồ sơ mẫu của chế độ demo, không phải người thật.",
    specialties: ["Dinh dưỡng nữ giới", "Chu kỳ kinh nguyệt", "Giảm mỡ bền vững"],
    credentials: [],
    social: {},
    recommendedFoods: [],
    featured: true,
  },
  {
    id: "coach-duc",
    name: "HLV Demo B",
    title: "Huấn luyện viên mẫu",
    bio: "Hồ sơ mẫu của chế độ demo, không phải người thật.",
    specialties: ["Sức bền & Marathon", "Dinh dưỡng thể thao", "Tăng cơ"],
    credentials: [],
    social: {},
    recommendedFoods: [],
    featured: true,
  },
];

export function getCoachById(id: string): CoachProfile | null {
  return FEATURED_COACHES.find((c) => c.id === id) || null;
}

export function filterCoachesBySpecialty(specialty: string): CoachProfile[] {
  if (!specialty || specialty === "Tất cả") {
    return FEATURED_COACHES;
  }
  return FEATURED_COACHES.filter((c) => c.specialties.includes(specialty));
}
