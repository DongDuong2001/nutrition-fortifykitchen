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
  credentials: string[];
  experienceYears: number;
  clientsHelped: number;
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

export const FEATURED_COACHES: CoachProfile[] = [
  {
    id: "coach-khanh",
    name: "Lê Hồng Khánh",
    title: "Trưởng ban Chuyên môn H1T",
    bio: "Nhà sáng lập phương pháp dinh dưỡng vi chất H1T MICRO. Hơn 8 năm kinh nghiệm huấn luyện dinh dưỡng thể thao, tăng cơ và tối ưu chuyển hóa cho vận động viên và người tập luyện phong trào.",
    specialties: ["Tăng cơ", "Dinh dưỡng thể thao", "Tối ưu vi chất", "Giảm mỡ bền vững"],
    credentials: [
      "Chứng chỉ Dinh dưỡng Thể thao CISSN",
      "Huấn luyện viên Thể hình (chứng chỉ bậc 1)",
      "Tác giả giáo trình H1T System",
    ],
    experienceYears: 8,
    clientsHelped: 1250,
    social: {
      zaloGroup: "https://zalo.me/g/h1t-community",
      facebookCommunity: "https://facebook.com/groups/h1t.nutrition",
      bookingUrl: "https://h1t.vn/tu-van-khanh",
    },
    recommendedFoods: ["Ức gà áp chảo", "Yến mạch ngâm qua đêm", "Trứng gà luộc", "Súp lơ xanh"],
    featured: true,
  },
  {
    id: "coach-ha",
    name: "Nguyễn Thu Hà",
    title: "Chuyên gia Dinh dưỡng Nữ & Chu kỳ",
    bio: "Chuyên sâu về cân bằng hormone, điều chỉnh dinh dưỡng theo từng pha chu kỳ kinh nguyệt và giảm mỡ bền vững cho phụ nữ hiện đại.",
    specialties: ["Dinh dưỡng nữ giới", "Chu kỳ kinh nguyệt", "Giảm mỡ bền vững"],
    credentials: [
      "Cử nhân Dinh dưỡng & Khoa học Thực phẩm",
      "Chứng chỉ Female Athlete Health & Performance",
    ],
    experienceYears: 6,
    clientsHelped: 840,
    social: {
      zaloGroup: "https://zalo.me/g/h1t-women",
      facebookCommunity: "https://facebook.com/groups/h1t.women",
      bookingUrl: "https://h1t.vn/tu-van-ha",
    },
    recommendedFoods: ["Cá hồi nướng", "Hạt chia", "Rau chân vịt", "Hạt bí ngô"],
    featured: true,
  },
  {
    id: "coach-duc",
    name: "Trần Minh Đức",
    title: "Huấn luyện viên Hiệu suất & Sức bền",
    bio: "Chuyên gia lập kế hoạch dinh dưỡng trong thi đấu sức bền (Marathon, Triathlon) và phục hồi cơ bắp cường độ cao.",
    specialties: ["Sức bền & Marathon", "Dinh dưỡng thể thao", "Tăng cơ"],
    credentials: [
      "Chứng chỉ Strength & Conditioning Coach (CSCS)",
      "Ironman Finisher & Sport Nutritionist",
    ],
    experienceYears: 5,
    clientsHelped: 620,
    social: {
      zaloGroup: "https://zalo.me/g/h1t-endurance",
      facebookCommunity: "https://facebook.com/groups/h1t.endurance",
      bookingUrl: "https://h1t.vn/tu-van-duc",
    },
    recommendedFoods: ["Chuối tiêu", "Bột củ dền", "Nước dừa tươi", "Khoai lang luộc"],
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

export interface CoachApplication {
  id: string;
  name: string;
  email: string;
  specialty: string;
  experienceYears: number;
  socialLink: string;
  message: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export const COACH_APPLICATIONS_STORAGE_KEY = "h1t_coach_applications_v1";

export const INITIAL_COACH_APPLICATIONS: CoachApplication[] = [
  {
    id: "app-vu-nguyen",
    name: "Vũ Minh Tuấn",
    email: "tuan.vu@example.com",
    specialty: "Tăng cơ",
    experienceYears: 4,
    socialLink: "https://zalo.me/g/tuanvu-nutrition",
    message: "Tôi đã đạt 45 ngày ghi chép liên tiếp và 20 vi chất. Muốn đồng hành hướng dẫn người mới trong nhóm.",
    status: "pending",
    createdAt: "2026-10-14T09:30:00.000Z",
  },
  {
    id: "app-mai-anh",
    name: "Hoàng Mai Anh",
    email: "maianh.fit@example.com",
    specialty: "Dinh dưỡng nữ giới",
    experienceYears: 3,
    socialLink: "https://facebook.com/groups/maianh.healthy",
    message: "Chứng chỉ sơ cấp Precision Nutrition, mong muốn chia sẻ thực đơn vi chất nữ.",
    status: "pending",
    createdAt: "2026-10-15T08:15:00.000Z",
  },
];

let memoryApplications: CoachApplication[] | null = null;

export function getCoachApplications(): CoachApplication[] {
  if (memoryApplications !== null) {
    return memoryApplications;
  }
  try {
    const storage = typeof window !== "undefined" ? window.localStorage : globalThis.localStorage;
    const raw = storage?.getItem(COACH_APPLICATIONS_STORAGE_KEY);
    if (!raw) {
      storage?.setItem(COACH_APPLICATIONS_STORAGE_KEY, JSON.stringify(INITIAL_COACH_APPLICATIONS));
      memoryApplications = [...INITIAL_COACH_APPLICATIONS];
      return memoryApplications;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      memoryApplications = [...INITIAL_COACH_APPLICATIONS];
      return memoryApplications;
    }
    memoryApplications = parsed;
    return memoryApplications;
  } catch {
    return INITIAL_COACH_APPLICATIONS;
  }
}

export function submitCoachApplication(data: Omit<CoachApplication, "id" | "status" | "createdAt">): CoachApplication {
  const newApp: CoachApplication = {
    ...data,
    id: `app-${Date.now()}`,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  const current = getCoachApplications();
  const updated = [newApp, ...current];
  memoryApplications = updated;
  try {
    const storage = typeof window !== "undefined" ? window.localStorage : globalThis.localStorage;
    storage?.setItem(COACH_APPLICATIONS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // fallback
  }
  return newApp;
}

export function updateCoachApplicationStatus(id: string, status: "approved" | "rejected"): void {
  const current = getCoachApplications();
  const updated = current.map((a) => (a.id === id ? { ...a, status } : a));
  memoryApplications = updated;
  try {
    const storage = typeof window !== "undefined" ? window.localStorage : globalThis.localStorage;
    storage?.setItem(COACH_APPLICATIONS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // fallback
  }
}

