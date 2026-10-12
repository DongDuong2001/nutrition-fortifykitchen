import { TodayScreen } from "@/components/today/today-screen";

/** Nhật ký. Same component as `/` for now; `?date=` picks a past day (read-only). */
export default function DiaryPage() {
  return <TodayScreen />;
}
