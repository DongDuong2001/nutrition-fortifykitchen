"use client";

import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { useBack } from "@/hooks/use-back";

/** Học viên: the coach's client list. Behind the role gate of app/coach/layout.tsx (coach and admin only). */
export default function CoachPage() {
  const goBack = useBack();
  return (
    <AppShell>
      <AppHeader variant="sub" title="Học viên" onBack={goBack} />
      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 pt-4 pb-6 lg:mx-0 lg:px-8">
        <p className="m-0 text-[15px] text-secondary">Chưa có học viên. Gửi mã cho học viên để bắt đầu.</p>
      </main>
    </AppShell>
  );
}
