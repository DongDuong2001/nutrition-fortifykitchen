import { AddScreen } from "@/components/add/add-screen";

/**
 * /add opened from a tab (the + of the nav, a meal's + Thêm): Next intercepts the route and draws the sheet in the tabs
 * layout's `sheet` slot, so the real screen under it stays mounted and is never redrawn. A reload or a shared link
 * gets app/(app)/add/page.tsx instead.
 */
export default function AddSheetPage() {
  return <AddScreen />;
}
