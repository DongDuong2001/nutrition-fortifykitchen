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
import { PillButton } from "@/components/ui/pill-button";
import { StepBars } from "@/components/ui/step-bars";
import { StatusGlyph, StatusMark, STATUS_TITLE_CLASS } from "@/components/onboarding/status-screen";
import { HOME_ROUTE } from "@/lib/nav";

interface Ready {
  summary: Summary;
  /** Nothing was ever logged: the first meal comes with the tour. Otherwise the button goes to the overview. */
  first: boolean;
}

// The three things the tour teaches (design/onboarding-mockups, Main)
const TOUR_PREVIEW = ["Thêm món và chọn khẩu phần", "Đọc màu của vi chất", "Biết chất nào còn thiếu"];

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
    router.push(HOME_ROUTE);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-page text-text lg:items-center lg:px-4 lg:py-8">
      <main className="flex flex-1 flex-col gap-4 px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-[max(16px,env(safe-area-inset-top))] lg:w-full lg:max-w-[760px] lg:flex-none lg:gap-6 lg:rounded-sheet lg:border lg:border-card-border lg:bg-card lg:p-8">
        {/* V3-SPEC §3.6 status screen: the 72 px circle, "Hồ sơ đã lưu" over the one h1, the two finished step bars, then the body */}
        <header className="flex flex-none flex-col items-center gap-2 text-center">
          <StatusMark tone="cobalt" className="mb-2">
            <StatusGlyph>
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </StatusGlyph>
          </StatusMark>
          <p className="m-0 text-callout font-semibold text-secondary">Hồ sơ đã lưu</p>
          <h1 id="setup-done-title" className={STATUS_TITLE_CLASS}>
            Thiết lập xong
          </h1>
        </header>
        <div className="lg:mx-auto lg:w-full lg:max-w-[420px]">
          <StepBars current={2} total={2} tone="light" />
        </div>

        {ready === null ? (
          <div aria-busy="true" className="min-h-[320px] flex-1 rounded-card bg-divider animate-pulse motion-reduce:animate-none lg:flex-none" />
        ) : (
          // cc-64 (P10): the summary fades in over its skeleton (120 ms) and the tour steps rise in 50 ms apart
          <section aria-labelledby="setup-done-title" className="m-content-in flex flex-1 flex-col gap-4 lg:flex-none">
            <p className="m-0 text-center text-base leading-normal text-text">
              Mục tiêu của bạn: <strong className="font-bold tabular-nums">{ready.summary.energy}</strong> mỗi ngày.{" "}
              {ready.first && "Cùng ghi bữa đầu tiên trong 1 phút, có hướng dẫn từng bước."}
            </p>
            {ready.first && (
              <ol className="m-0 flex list-none flex-col gap-2 p-0">
                {TOUR_PREVIEW.map((text, i) => (
                  <li
                    key={text}
                    data-align-group="setup-done-steps"
                    style={{ animationDelay: `${i * 50}ms` }}
                    className="m-row-enter box-border flex min-h-[52px] items-center gap-3 rounded-card border border-transparent bg-card px-4 py-2 shadow-ring lg:shadow-card"
                  >
                    <span aria-hidden="true" className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-surface text-sm font-bold tabular-nums text-text">
                      {i + 1}
                    </span>
                    <span className="text-callout font-semibold leading-snug">{text}</span>
                  </li>
                ))}
              </ol>
            )}
            <p className="m-0 text-center text-cap leading-snug text-secondary">Bạn có thể sửa mục tiêu bất cứ lúc nào trong Cài đặt.</p>
          </section>
        )}

        {coachNote && (
          <p role="status" className="m-0 rounded-xl border border-card-border bg-card px-4 py-3 text-cap leading-snug text-text">
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
                href={HOME_ROUTE}
                className="inline-flex min-h-11 items-center justify-center px-2 text-callout font-semibold text-secondary no-underline"
              >
                Để sau
              </Link>
              <p className="m-0 text-center text-xs leading-snug text-secondary">Xem lại hướng dẫn trong Cài đặt › Ứng dụng</p>
            </>
          ) : (
            <PillButton href={HOME_ROUTE} disabled={ready === null}>
              Xem tổng quan
            </PillButton>
          )}
        </div>
      </main>
    </div>
  );
}
