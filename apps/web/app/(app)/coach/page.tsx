"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { LevelBadge } from "@/components/profile/level-badge";
import { useBack } from "@/hooks/use-back";
import { useDiary } from "@/lib/diary-store";
import { formatDayLabel } from "@/lib/format";
import { shiftIsoDate } from "@/lib/day-history";
import { NOT_LOGGED_TODAY, lastLoggedText, loggedToday } from "@/lib/coach-preview";
import { readClients, readCoaches, type MockClient, type MockCoach } from "@/lib/mock-coach-server";

const BUTTON =
  "inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-full border border-card-border bg-card px-4 text-callout font-bold text-text active:scale-[0.97] transition-press motion-reduce:active:scale-100";

/** Học viên: the coach's invite code and client list. Behind the role gate of app/coach/layout.tsx. */
export default function CoachPage() {
  const goBack = useBack();
  const { todayIso } = useDiary();
  // The code is made in this browser on first use, so it is read after mount
  const [coach, setCoach] = useState<MockCoach | null>(null);
  const [clients, setClients] = useState<MockClient[] | null>(null);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCoach(readCoaches()[0] ?? null);
    setClients(readClients());
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const code = coach?.code ?? "";
  const link = typeof window === "undefined" ? `/join/${code}` : `${window.location.origin}/join/${code}`;

  async function copy(kind: "code" | "link") {
    const text = kind === "code" ? code : link;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard blocked (no permission, an insecure page): select-and-copy by hand is the fallback, said below
      setCopied(null);
      return;
    }
    setCopied(kind);
    window.setTimeout(() => setCopied((c) => (c === kind ? null : c)), 2500);
  }

  function share() {
    navigator.share({ title: "H1T MICRO", text: `Tham gia theo dõi với ${coach?.name ?? "huấn luyện viên"}`, url: link }).catch(() => {});
  }

  const dayLabel = (daysAgo: number | null) =>
    daysAgo === null || !todayIso ? null : formatDayLabel(shiftIsoDate(todayIso, -daysAgo), new Date(`${todayIso}T12:00:00+07:00`));

  return (
    <AppShell alignContainer="coach-page">
      <AppHeader variant="sub" title="Học viên" onBack={goBack} layout="wide" />
      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 pb-6 pt-4 lg:mx-0 lg:max-w-[760px] lg:px-8">
        <Card as="section" aria-labelledby="coach-code" className="flex flex-col gap-3">
          <h2 id="coach-code" className="m-0 text-base font-bold">
            Mã mời của bạn
          </h2>
          <p data-align-group="coach-invite" className="m-0 font-display text-display-sm font-extrabold italic leading-none tabular-nums text-text">
            {code || "Chưa tạo được mã"}
          </p>
          <div data-align-group="coach-invite" className="flex flex-wrap gap-2">
            <button type="button" onClick={() => copy("code")} className={BUTTON}>
              Sao chép mã
            </button>
            <button type="button" onClick={() => copy("link")} className={BUTTON}>
              Sao chép liên kết
            </button>
            {canShare && (
              <button type="button" onClick={share} className={BUTTON}>
                Chia sẻ
              </button>
            )}
          </div>
          <p role="status" className="m-0 min-h-[20px] text-cap leading-snug text-secondary">
            {copied === "code" ? "Đã sao chép mã" : copied === "link" ? "Đã sao chép liên kết" : `Liên kết: /join/${code}`}
          </p>
        </Card>

        <section aria-labelledby="coach-clients" className="flex flex-col gap-2">
          <h2 id="coach-clients" className="m-0 text-base font-bold">
            Danh sách học viên
          </h2>
          {clients === null ? (
            <div aria-busy="true" className="h-[120px] rounded-card bg-divider motion-safe:animate-pulse" />
          ) : clients.length === 0 ? (
            <Card>
              <p className="m-0 text-callout leading-snug text-secondary">Chưa có học viên. Gửi mã cho học viên để bắt đầu.</p>
            </Card>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {clients.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/coach/clients/${encodeURIComponent(c.id)}`}
                    data-align-group="client-row"
                    className="flex min-h-[64px] items-center gap-3 rounded-card lg:shadow-card border border-card-border bg-card p-3 text-text no-underline active:scale-[0.99] transition-press motion-reduce:active:scale-100"
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="break-words text-callout font-semibold leading-snug">{c.name}</span>
                      <span className="text-cap leading-snug text-secondary">{lastLoggedText(c.lastLoggedDaysAgo, dayLabel(c.lastLoggedDaysAgo))}</span>
                      {!loggedToday(c.lastLoggedDaysAgo) && (
                        <span className="text-cap font-semibold leading-snug text-warning-text">{NOT_LOGGED_TODAY}</span>
                      )}
                    </span>
                    <LevelBadge level={c.level} />
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-secondary" aria-hidden="true">
                      <path d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </AppShell>
  );
}
