"use client";

import { BottomNav, type BottomNavProps } from "@/components/ui/bottom-nav";

export function BottomDock(props: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-ink md:hidden">
      <BottomNav {...props} />
    </div>
  );
}
