"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Spotlight } from "@/components/onboarding/spotlight";
import { IconArrowUp } from "@/components/ui/icons";
import { useDiary } from "@/lib/diary-store";
import { getTodayIsoVN } from "@/lib/date";
import { DEFAULT_FLAGS, type OnboardingFlags } from "@/lib/onboarding-flags";
import { finishTour, loadFlags, markTipSeen, onboardingDisabled, setTipsOff, subscribeFlags } from "@/lib/onboarding-store";
import { TIPS, pickTip, type Tip } from "@/lib/tips";
import { TOUR_STEPS, tourReduce, tourStepFor, type TourState } from "@/lib/tour";
import { readTour, subscribeSignal, subscribeTour, writeTour } from "@/lib/tour-bus";

const OFF: TourState = { status: "off" };
const TIP_DELAY_MS = 500;

const LEVELS = [
  { name: "Thiếu", range: "dưới 50%", bar: "bg-level-red" },
  { name: "Trung bình", range: "50–79%", bar: "bg-level-yellow" },
  { name: "Gần đủ", range: "80–99%", bar: "bg-level-green" },
  { name: "Đạt", range: "từ 100% trở lên", bar: "bg-level-blue" },
] as const;

const TOUR_COPY: Record<string, { title: string; body: string; hint?: string }> = {
  kcal: {
    title: "Năng lượng đã tiêu thụ hôm nay",
    body: "Số kcal bạn đã ăn so với mục tiêu tính từ hồ sơ của bạn. Bốn thanh bên dưới là tinh bột, đạm, chất béo và chất xơ.",
  },
  add: {
    title: "Thêm món đầu tiên",
    body: "Nút Thêm đồ ăn luôn ở giữa thanh dưới. Chạm vào để mở danh sách các món ăn và thêm đồ ăn vào bữa ăn của bạn.",
    hint: "Chạm vào nút Thêm",
  },
  search: {
    title: "Tìm món ăn",
    body: "Gõ tên món bạn vừa ăn, ví dụ “phở”, rồi chạm vào món đúng nhất. Bữa ăn sẽ được chọn sẵn theo khung giờ ăn hoặc tùy vào lựa chọn của bạn.",
    hint: "Chạm vào món",
  },
  portion: {
    title: "Chọn khẩu phần",
    body: "Chọn định lượng bạn đã ăn: 1 tô, nửa tô hoặc tự nhập gram. Vi chất sẽ được tính tự động.",
  },
  result: {
    title: "Đọc màu của chỉ số vi chất",
    body: "Mỗi thanh là % nhu cầu cả ngày. Mục tiêu: đưa mọi chất lên mức Đạt.",
  },
};

const primaryButton =
  "min-h-11 cursor-pointer rounded-full border-0 bg-blue px-5 text-sm font-bold text-on-accent active:scale-[0.97] motion-reduce:active:scale-100";
const quietButton =
  "min-h-11 cursor-pointer rounded-full border-0 bg-transparent px-3 text-sm font-semibold text-secondary active:scale-[0.97] motion-reduce:active:scale-100";

/** The label of the real confirm button of step 4 ("Thêm vào Bữa trưa"), so the hint names the right meal. */
function portionButtonText(): string {
  const el = document.querySelector<HTMLElement>('[data-tour="portion-add"]');
  return el?.textContent?.trim() ? `Chạm ${el.textContent.trim()}` : "Chạm nút Thêm vào";
}

function TourCard({ index, onNext, onSkip }: { index: number; onNext: () => void; onSkip: () => void }) {
  const step = TOUR_STEPS[index];
  const copy = TOUR_COPY[step.id];
  const hint = step.id === "portion" ? portionButtonText() : copy.hint;
  const last = index === TOUR_STEPS.length - 1;
  return (
    <>
      <p className="m-0 text-xs font-bold text-blue">
        Bước {index + 1}/{TOUR_STEPS.length}
      </p>
      <h2 id="tour-title" className="m-0 text-lg font-bold leading-snug">
        {copy.title}
      </h2>
      <p className="m-0 text-sm leading-relaxed text-secondary">{copy.body}</p>
      {last && (
        <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0">
          {LEVELS.map((l) => (
            <li key={l.name} className="flex items-center gap-2 text-[13px]">
              <span aria-hidden="true" className={`h-2 w-6 shrink-0 rounded-full ${l.bar}`} />
              <span>
                <strong className="font-bold">{l.name}</strong> <span className="text-secondary">{l.range}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={onSkip} className={`${quietButton} -ml-3`}>
          Bỏ qua hướng dẫn
        </button>
        {step.advance === "button" ? (
          <button type="button" onClick={onNext} className={primaryButton}>
            {last ? "Hoàn tất" : "Tiếp"}
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 text-[13px] font-bold text-blue">
            {hint}
            {/* Points at the highlighted element: up when the card is under it, down when the card is above it */}
            <IconArrowUp size={16} className="group-data-[placement=above]:rotate-180" />
          </span>
        )}
      </div>
    </>
  );
}

function TipCard({ tip, onGotIt, onTurnOff }: { tip: Tip; onGotIt: () => void; onTurnOff: () => void }) {
  return (
    <>
      <p className="m-0 text-xs font-bold text-blue">Mẹo · lần đầu</p>
      <h2 id="tip-title" className="m-0 text-lg font-bold leading-snug">
        {tip.title}
      </h2>
      <p className="m-0 text-sm leading-relaxed text-secondary">{tip.body}</p>
      {tip.note && <p className="m-0 text-[13px] leading-snug text-secondary">{tip.note}</p>}
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={onTurnOff} className={`${quietButton} -ml-3`}>
          Tắt mọi mẹo
        </button>
        <button type="button" onClick={onGotIt} className={primaryButton}>
          Đã hiểu
        </button>
      </div>
    </>
  );
}

/**
 * The first-run tour and the first-visit tips (cc-42). Mounted once under the diary provider; it draws nothing on the
 * server and until it has mounted (no hydration difference). Rules: at most one tip per visit, none while the tour
 * runs, a tip only on the first visit to its screen and only when the feature was never used (lib/tips).
 */
export function OnboardingLayer() {
  const pathname = usePathname() ?? "/";
  const { data } = useDiary();
  const [mounted, setMounted] = useState(false);
  const [tour, setTour] = useState<TourState>(OFF);
  const [flags, setFlags] = useState<OnboardingFlags>(DEFAULT_FLAGS);
  const [tipId, setTipId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  // One tip per visit: reset when the route changes (or Chọn nhiều món opens)
  const visit = useRef({ path: "", tipShown: false });
  const foodsToday = data.meals.reduce((n, m) => n + m.items.length, 0);

  // Read the running tour. On a route change (applyRoute) the route also moves it on or ends it (lib/tour tourStepFor);
  // when only the tour changed (a button, an action, Thêm bữa đầu tiên) the screen is left alone.
  const sync = useCallback((applyRoute: boolean) => {
    if (onboardingDisabled()) {
      if (readTour().status !== "off") writeTour(OFF);
      setTour(OFF);
      return;
    }
    const current = readTour();
    const next = applyRoute ? tourStepFor(current, window.location.pathname) : current;
    if (next.status === "done") {
      if (next.reason !== "left") finishTour();
      writeTour(OFF);
      setTour(OFF);
      return;
    }
    if (next !== current) writeTour(next);
    setTour(next);
  }, []);

  useEffect(() => {
    setMounted(true);
    setFlags(loadFlags());
    const offFlags = subscribeFlags(() => setFlags(loadFlags()));
    const offTour = subscribeTour(() => sync(false));
    const offSignal = subscribeSignal((signal) => {
      if (signal === "select-mode") {
        visit.current.tipShown = false;
        setSelectMode(true);
      }
    });
    return () => {
      offFlags();
      offTour();
      offSignal();
    };
  }, [sync]);

  useEffect(() => {
    sync(true);
    // A new screen is a new visit
    visit.current = { path: pathname, tipShown: false };
    setTipId(null);
    setSelectMode(false);
  }, [pathname, sync]);

  const tourActive = tour.status === "step";

  // The tip of this visit, once the screen has settled
  useEffect(() => {
    if (!mounted || tourActive || onboardingDisabled() || visit.current.tipShown || tipId) return;
    const search = new URLSearchParams(window.location.search);
    const date = search.get("date");
    const tip = pickTip({
      ctx: { pathname, pastDay: date !== null && date < getTodayIsoVN(), foodsToday, selectMode },
      flags,
      tourActive,
    });
    if (!tip) return;
    const timer = setTimeout(() => {
      visit.current.tipShown = true;
      setTipId(tip.id);
    }, TIP_DELAY_MS);
    return () => clearTimeout(timer);
  }, [mounted, tourActive, pathname, foodsToday, selectMode, flags, tipId]);

  if (!mounted) return null;

  // The tour is drawn only on the screen of its step: Thêm bữa đầu tiên starts it one screen early
  if (tour.status === "step" && pathname !== TOUR_STEPS[tour.index].path) return null;
  if (tour.status === "step") {
    const step = TOUR_STEPS[tour.index];
    const act = (event: Parameters<typeof tourReduce>[1]) => {
      const next = tourReduce(tour, event);
      if (next.status === "done") {
        finishTour();
        writeTour(OFF);
        setTour(OFF);
      } else {
        writeTour(next);
        setTour(next);
      }
    };
    return (
      <Spotlight
        key={`tour-${step.id}`}
        target={step.target}
        labelledBy="tour-title"
        interactive={step.advance === "action"}
        onEscape={() => act({ type: "skip" })}
        onMissing={() => {
          const next = tourReduce(tour, { type: "skipStep" });
          if (next.status === "done") {
            finishTour();
            writeTour(OFF);
            setTour(OFF);
          } else {
            writeTour(next);
            setTour(next);
          }
        }}
      >
        <TourCard index={tour.index} onNext={() => act({ type: "next" })} onSkip={() => act({ type: "skip" })} />
      </Spotlight>
    );
  }

  const tip = tipId ? TIPS.find((t) => t.id === tipId) : null;
  if (!tip) return null;
  return (
    <Spotlight
      key={`tip-${tip.id}`}
      target={tip.target}
      labelledBy="tip-title"
      onShown={() => markTipSeen(tip.id)}
      onEscape={() => setTipId(null)}
      onMissing={() => setTipId(null)}
    >
      <TipCard
        tip={tip}
        onGotIt={() => setTipId(null)}
        onTurnOff={() => {
          setTipsOff(true);
          setTipId(null);
        }}
      />
    </Spotlight>
  );
}
