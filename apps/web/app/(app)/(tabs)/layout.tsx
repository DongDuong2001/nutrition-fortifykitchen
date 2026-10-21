import { TabsShell } from "@/components/ui/app-shell";

/**
 * cc-57: Hôm nay, Tổng quan, Khám phá and Cài đặt share one frame (sidebar, bottom nav), so switching tabs swaps only
 * the page. The URLs are unchanged (this is a route group). A tab switch has no transition (lib/nav-direction "tab").
 * The `sheet` slot (@sheet) is where /add opens over whichever tab it was opened from (an intercepting route): the tab
 * under the sheet stays mounted, so closing the sheet shows it exactly as it was.
 */
export default function TabsLayout({ children, sheet }: { children: React.ReactNode; sheet: React.ReactNode }) {
  return (
    <>
      <TabsShell>{children}</TabsShell>
      {sheet}
    </>
  );
}
