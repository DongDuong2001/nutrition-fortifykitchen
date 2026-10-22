export type TabWashTone = "home" | "overview" | "explore";

/**
 * The colour wash at the top of a tab root on a phone (boards TintHomNay, AccTongQuan, AccKhamPha): 240 px of the tab's colour
 * fading to nothing (app/globals.css .tab-wash), behind the header and the content, which sit above it as positioned
 * elements later in the page. It is absolutely placed against the top of the page, so it scrolls away with it. Push screens
 * and sheets get none; from lg it is hidden (desktop is unchanged).
 */
export function TabWash({ tone }: { tone: TabWashTone }) {
  return <div aria-hidden="true" data-tab-wash={tone} className={`tab-wash tab-wash-${tone} pointer-events-none absolute inset-x-0 top-0 h-[240px] lg:hidden`} />;
}
