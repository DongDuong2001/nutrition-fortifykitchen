import { TabsShell } from "@/components/ui/app-shell";

/**
 * cc-57: Hôm nay, Tổng quan, Khám phá and Cài đặt share one frame (sidebar, bottom nav), so switching tabs swaps only
 * the page. The URLs are unchanged (this is a route group). A tab switch has no transition (lib/nav-direction "tab").
 */
export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return <TabsShell>{children}</TabsShell>;
}
