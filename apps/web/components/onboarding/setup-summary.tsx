"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isNewUser, readFirstRunFacts, setupSummary, summaryAddHref, type SetupSummary as Summary } from "@/lib/first-run";
import { loadProfile } from "@/lib/profile";
import { useCoaching } from "@/hooks/use-coaching";
import { readPendingCoachCode, clearPendingCoachCode } from "@/lib/pending-coach";
import { onboardingDisabled } from "@/lib/onboarding-store";
import { startTour } from "@/lib/tour-bus";
import { AppHeader } from "@/components/ui/app-header";
import { PillButton } from "@/components/ui/pill-button";

interface Ready {
  summary: Summary;
  /** Nothing was ever logged: the first meal comes with the tour. Otherwise the button goes to the overview. */
  first: boolean;
}

// The three things the tour teaches (design/onboarding-mockups, Main)
const TOUR_PREVIEW = ["Thêm món và chọn khẩu phần", "Đọc màu của vi chất", "Biết chất nào còn thiếu"];

const TITLE = "Hồ sơ đã lưu";

/** Last step of setup: the daily targets as facts, then one button to the first meal. */
export function SetupSummary() {
  const router = useRouter();
  const [ready, setReady] = useState<Ready | null>(null);
  const { hydrated, joinByCode, available } = useCoaching();
  // A coach code typed in setup or kept from /join/<code>: used once, here, when the profile is saved
  const [coachNote, setCoachNote] = useState<string | null>(null);
  useEffect(() => {
    if (!hydrated || !available) return;
    const code = readPendingCoachCode();
    if (!code) return;
    const coach = joinByCode(code);
    if (coach) setCoachNote(`Bạn đang được ${coach.name} theo dõi · Level 1`);
    else {
      clearPendingCoachCode();
      setCoachNote("Mã huấn luyện viên chưa đúng. Bạn có thể nhập lại trong Cài đặt › Huấn luyện viên.");
    }
    // joinByCode changes with the profile; the code is read and cleared once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, available]);

  // Profile and clock are client-only: nothing renders from them before mount (no hydration mismatch).
  useEffect(() => {
    const now = new Date();
    setReady({ summary: setupSummary(loadProfile(now.getFullYear())), first: isNewUser(readFirstRunFacts()) });
  }, []);

  // Thêm bữa đầu tiên: Hôm nay with the tour. With the tour off on this device (probes) it opens the add sheet as before.
  const beginTour = () => {
    if (onboardingDisabled()) {
      router.push(summaryAddHref(new Date()));
      return;
    }
    startTour();
    router.push("/");
  };

  return (
    <div className="flex min-h-dvh flex-col bg-page lg:items-center lg:px-4 lg:py-8">
      <div className="lg:hidden">
        <AppHeader variant="sub" title={TITLE} progress={{ current: 2, total: 2 }} />
      </div>

      <main className="flex flex-1 flex-col gap-6 px-4 py-5 lg:w-full lg:max-w-[760px] lg:flex-none lg:rounded-[20px] lg:border lg:border-card-border lg:bg-card lg:p-8">
        <h1 className="m-0 hidden font-display text-[32px] font-black italic uppercase lg:block">{TITLE}</h1>

        {ready === null ? (
          <div aria-busy="true" className="min-h-[320px] flex-1 rounded-[18px] bg-divider animate-pulse motion-reduce:animate-none lg:flex-none" />
        ) : (
          <section aria-labelledby="setup-done-title" className="flex flex-1 flex-col gap-4 lg:flex-none">
            <h2 id="setup-done-title" className="m-0 font-display text-[28px] font-black italic uppercase leading-tight">
              Thiết lập xong
            </h2>
            <p className="m-0 text-base leading-relaxed text-text">
              Mục tiêu của bạn: {ready.summary.energy} mỗi ngày.{" "}
              {ready.first && "Cùng ghi bữa đầu tiên trong 1 phút, có hướng dẫn từng bước."}
            </p>
            {ready.first && (
              <ol className="m-0 flex list-none flex-col gap-2 p-0">
                {TOUR_PREVIEW.map((text, i) => (
                  <li key={text} className="flex min-h-[44px] items-center gap-3 rounded-[18px] border border-card-border bg-card px-4 py-2">
                    <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue/10 text-sm font-bold text-blue">
                      {i + 1}
                    </span>
                    <span className="text-[15px] font-semibold leading-snug">{text}</span>
                  </li>
                ))}
              </ol>
            )}
            <p className="m-0 text-[13px] leading-snug text-secondary">Bạn có thể sửa mục tiêu bất cứ lúc nào trong Cài đặt.</p>
          </section>
        )}

        {coachNote && (
          <p role="status" className="m-0 rounded-xl bg-card px-4 py-3 text-[13px] leading-snug text-text border border-card-border">
            {coachNote}
          </p>
        )}

        <div className="mt-auto flex flex-col gap-2 lg:mt-0">
          {ready?.first ? (
            <>
              <PillButton disabled={ready === null} onClick={beginTour} data-tour="tour-start">
                Thêm bữa đầu tiên
              </PillButton>
              <Link
                href="/"
                className="inline-flex min-h-[44px] items-center justify-center px-2 text-[15px] font-semibold text-secondary no-underline"
              >
                Để sau
              </Link>
              <p className="m-0 text-center text-xs leading-snug text-secondary">Xem lại hướng dẫn trong Cài đặt › Ứng dụng</p>
            </>
          ) : (
            <PillButton href="/" disabled={ready === null}>
              Xem tổng quan
            </PillButton>
          )}
        </div>
      </main>
    </div>
  );
}
