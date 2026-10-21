"use client";

import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Presence } from "@/components/ui/presence";
import { Spotlight } from "@/components/onboarding/spotlight";
import { IconArrowUp } from "@/components/ui/icons";
import { useDiary } from "@/lib/diary-store";
import { canVibrate } from "@/lib/haptics";
import { getTodayIsoVN } from "@/lib/date";
import { DEFAULT_FLAGS, type OnboardingFlags } from "@/lib/onboarding-flags";
import { finishTour, loadFlags, markTipSeen, onboardingDisabled, setTipsOff, subscribeFlags } from "@/lib/onboarding-store";
import { HOME_ROUTE } from "@/lib/nav";
import {
  claimInterruption,
  interruptionBlockedByUi,
  mayInterrupt,
  interruptionVersion,
  probeUi,
  setInterruptionDue,
  subscribeInterruption,
} from "@/lib/interruption";
import { tourStepAfter, type ReleaseTourStep } from "@/lib/releases";
import { TIPS, pickTip, tipDue, type PortionControls, type Tip, type TipContext } from "@/lib/tips";
import { TOUR_STEPS, tourReduce, tourStepFor, type TourState } from "@/lib/tour";
import {
  emitSignal,
  isOverlayOpen,
  isPresent,
  PORTION_PRESENCES,
  readTour,
  readWhatsNewTour,
  setOverlayOpen,
  setTipBusy,
  subscribeSignal,
  subscribeTipBusy,
  subscribeTour,
  whatsNewSteps,
  writeTour,
  writeWhatsNewTour,
  type WhatsNewTour,
} from "@/lib/tour-bus";

const OFF: TourState = { status: "off" };
const TIP_DELAY_MS = 500;
/** A tip held back by a focused field or a moving sheet looks again this often. */
const TIP_RETRY_MS = 400;

const LEVELS = [
  { name: "Thiếu", range: "dưới 50%", bar: "bg-level-thieu" },
  { name: "Trung bình", range: "50–79%", bar: "bg-level-trungbinh" },
  { name: "Gần đủ", range: "80–99%", bar: "bg-level-gandu" },
  { name: "Đạt", range: "từ 100% trở lên", bar: "bg-level-dat" },
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
  "min-h-11 cursor-pointer rounded-full border-0 bg-cobalt px-5 text-sm font-bold text-on-accent active:scale-[0.97] transition-press motion-reduce:active:scale-100";
const quietButton =
  "min-h-11 cursor-pointer rounded-full border-0 bg-transparent px-3 text-sm font-semibold text-secondary active:scale-[0.97] transition-press motion-reduce:active:scale-100";

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
      <p className="m-0 text-xs font-bold text-cobalt">
        Bước {index + 1}/{TOUR_STEPS.length}
      </p>
      <h2 id="tour-title" className="m-0 text-lg font-bold leading-snug">
        {copy.title}
      </h2>
      <p className="m-0 text-sm leading-relaxed text-secondary">{copy.body}</p>
      {last && (
        <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0">
          {LEVELS.map((l) => (
            <li key={l.name} className="flex items-center gap-2 text-cap">
              <span aria-hidden="true" className={`h-[9px] w-[9px] shrink-0 rounded-[3px] ${l.bar}`} />
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
          <span className="inline-flex items-center gap-1 text-cap font-bold text-cobalt">
            {hint}
            {/* Points at the highlighted element: up when the card is under it, down when the card is above it */}
            <IconArrowUp size={16} className="group-data-[placement=above]:rotate-180" />
          </span>
        )}
      </div>
    </>
  );
}

/** A step of the "Có gì mới" tour (WNTour): "Mới · n/3", title, body, dots, Bỏ qua / Tiếp / Xong. */
function WhatsNewCard({ step, index, total, onNext, onSkip }: { step: ReleaseTourStep; index: number; total: number; onNext: () => void; onSkip: () => void }) {
  const last = index === total - 1;
  return (
    <>
      <p className="m-0 text-xs font-bold text-cobalt">
        Mới · {index + 1}/{total}
      </p>
      <h2 className="m-0 text-lg font-bold leading-snug">{step.title}</h2>
      <p className="m-0 text-callout leading-relaxed text-secondary">{step.body}</p>
      <div className="flex items-center justify-between gap-2">
        <span aria-hidden="true" className="flex gap-1">
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={`h-2 w-2 rounded-full ${i === index ? "bg-cobalt" : "bg-divider"}`} />
          ))}
        </span>
        <div className="flex items-center gap-1">
          {!last && (
            <button type="button" onClick={onSkip} className={quietButton}>
              Bỏ qua
            </button>
          )}
          <button type="button" onClick={onNext} className={primaryButton}>
            {last ? "Xong" : "Tiếp"}
          </button>
        </div>
      </div>
    </>
  );
}

function TipCard({ tip, onGotIt, onTry, onTurnOff }: { tip: Tip; onGotIt: () => void; onTry: () => void; onTurnOff: () => void }) {
  return (
    <>
      <p className="m-0 text-xs font-bold text-cobalt">Mẹo · lần đầu</p>
      <h2 id="tip-title" className="m-0 text-lg font-bold leading-snug">
        {tip.title}
      </h2>
      <p className="m-0 text-sm leading-relaxed text-secondary">{tip.body}</p>
      {tip.note && <p className="m-0 text-cap leading-snug text-secondary">{tip.note}</p>}
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={onTurnOff} className={`${quietButton} -ml-3`}>
          Tắt mọi mẹo
        </button>
        {tip.tryLabel ? (
          <div className="flex items-center gap-1">
            <button type="button" onClick={onGotIt} className={quietButton}>
              Đã hiểu
            </button>
            <button type="button" onClick={onTry} className={primaryButton}>
              {tip.tryLabel}
            </button>
          </div>
        ) : (
          <button type="button" onClick={onGotIt} className={primaryButton}>
            Đã hiểu
          </button>
        )}
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
  const { data, unsavedIds, isEditable } = useDiary();
  const [mounted, setMounted] = useState(false);
  const [tour, setTour] = useState<TourState>(OFF);
  const [flags, setFlags] = useState<OnboardingFlags>(DEFAULT_FLAGS);
  const [tipId, setTipId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  // The "Có gì mới" tour (cc-46), and whether its sheet is open (no tip then)
  const [wn, setWn] = useState<WhatsNewTour | null>(null);
  const [wnSheet, setWnSheet] = useState(false);
  // A sheet the user opened, and the portion controls, are on screen (each has a tip of its own)
  const [sheetOpen, setSheetOpen] = useState(false);
  const [controls, setControls] = useState<PortionControls>({});
  // No network (the header says Ngoại tuyến): its tip waits for this
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const read = () => setOffline(navigator.onLine === false);
    read();
    window.addEventListener("online", read);
    window.addEventListener("offline", read);
    return () => {
      window.removeEventListener("online", read);
      window.removeEventListener("offline", read);
    };
  }, []);
  // One tip per visit: reset when the route changes (or Chọn nhiều món opens)
  const visit = useRef({ path: "", tipShown: false });
  const foodsToday = data.meals.reduce((n, m) => n + m.items.length, 0);

  // What the tips need to know about this screen
  const tipContext = useCallback((): TipContext => {
    const date = new URLSearchParams(window.location.search).get("date");
    return {
      pathname,
      // Only a day that cannot be edited (older than yesterday) gets the "chỉ để xem" tip
      pastDay: date !== null && date < getTodayIsoVN() && !isEditable(date),
      foodsToday,
      selectMode,
      unsaved: unsavedIds.size,
      touch: window.matchMedia?.("(pointer: coarse)").matches === true,
      vibrate: canVibrate(),
      sheetOpen,
      ...controls,
      offline,
    };
  }, [pathname, foodsToday, selectMode, unsavedIds, sheetOpen, controls, offline, isEditable]);

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
    setWn(readWhatsNewTour());
    const offTour = subscribeTour(() => {
      sync(false);
      setWn(readWhatsNewTour());
    });
    const readPresence = () => {
      setWnSheet(isOverlayOpen("whats-new"));
      // Sheets that open by themselves (Có gì mới, the install pop-up) are not "a sheet the user opened"
      setSheetOpen(isPresent("sheet") && !isOverlayOpen("whats-new") && !isOverlayOpen("install"));
      setControls((was) => {
        const now: PortionControls = Object.fromEntries(PORTION_PRESENCES.map((name) => [name, isPresent(name)]));
        return PORTION_PRESENCES.every((name) => !!was[name] === !!now[name]) ? was : now;
      });
    };
    readPresence();
    const offBusy = subscribeTipBusy(readPresence);
    const offSignal = subscribeSignal((signal) => {
      if (signal === "select-mode") {
        visit.current.tipShown = false;
        setSelectMode(true);
        // A "Có gì mới" step that waits for a long press on a food moves on
        const current = readWhatsNewTour();
        if (current) {
          const next = tourStepAfter(whatsNewSteps(current), current.index, "long-press");
          if (next !== current.index) writeWhatsNewTour(next === null ? null : { ...current, index: next });
        }
      }
      if (signal === "select-off") setSelectMode(false);
    });
    return () => {
      offFlags();
      offTour();
      offBusy();
      offSignal();
    };
  }, [sync]);

  useEffect(() => {
    sync(true);
    // "Có gì mới" runs on Hôm nay only: leaving ends it
    if (pathname !== HOME_ROUTE && readWhatsNewTour()) writeWhatsNewTour(null);
    // A new screen is a new visit
    visit.current = { path: pathname, tipShown: false };
    setTipId(null);
    setSelectMode(false);
  }, [pathname, sync]);

  const tourActive = tour.status === "step";
  const wnActive = wn !== null;
  useEffect(() => setOverlayOpen("whats-new-tour", wnActive), [wnActive]);
  useEffect(() => () => setOverlayOpen("whats-new-tour", false), []);
  // A tour whose release or step is gone (an old session) just ends
  useEffect(() => {
    if (wn && !whatsNewSteps(wn)[wn.index]) writeWhatsNewTour(null);
  }, [wn]);

  // The tip this screen would show now (null when none is due)
  const dueTip = useCallback((): Tip | null => {
    if (tourActive || wnActive || wnSheet || onboardingDisabled() || visit.current.tipShown) return null;
    return pickTip({ ctx: tipContext(), flags, tourActive });
  }, [tourActive, wnActive, wnSheet, tipContext, flags]);

  // Opening a sheet, or a portion control turning up, is a new visit for its own tip (when that tip is still due)
  const contextNow = useRef(tipContext);
  contextNow.current = tipContext;
  useEffect(() => {
    if (!sheetOpen && !PORTION_PRESENCES.some((name) => controls[name])) return;
    const ctx = contextNow.current();
    if (TIPS.some((t) => t.inSheet && tipDue(t, ctx, loadFlags()))) visit.current.tipShown = false;
  }, [sheetOpen, controls]);

  // A "Có gì mới" step that waits for a tap on its element moves on after the tap has done its job (Chưa lưu sends)
  const wnSteps = whatsNewSteps(wn);
  const wnStep = wn ? wnSteps[wn.index] : undefined;
  useEffect(() => {
    if (!wn || wnStep?.advanceOn !== "tap") return;
    const target = wnStep.target;
    const onClick = (e: MouseEvent) => {
      if (!(e.target instanceof Element) || !e.target.closest(`[data-tour="${target}"]`)) return;
      setTimeout(() => {
        const current = readWhatsNewTour();
        if (!current || current.index !== wn.index || current.releaseIds.join() !== wn.releaseIds.join()) return;
        const next = tourStepAfter(whatsNewSteps(current), wn.index, "tap");
        writeWhatsNewTour(next === null ? null : { ...wn, index: next });
      }, 0);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [wn, wnStep]);

  // The tip of this visit, once the screen has settled. It is the last of the three things that open by themselves (Có gì mới,
  // the install pop-up, a tip) and only one of them opens per app open (lib/interruption); and it never opens over a field that has
  // focus or a sheet that is still moving: it tries again a moment later.
  const interruptions = useSyncExternalStore(subscribeInterruption, interruptionVersion, () => 0);
  useEffect(() => {
    if (!mounted || tipId) return;
    const tip = dueTip();
    setInterruptionDue("tip", tip !== null);
    if (!tip) return;
    let timer: ReturnType<typeof setTimeout>;
    const attempt = () => {
      // Asked first, and nothing polls while it is no: something else opened or is due, and this effect looks again when that changes
      // (the `interruptions` version) or on the next screen visit. The tip stays due; it is not dropped.
      if (!mayInterrupt("tip")) return;
      if (interruptionBlockedByUi(probeUi())) {
        timer = setTimeout(attempt, TIP_RETRY_MS);
        return;
      }
      if (!claimInterruption("tip")) return;
      visit.current.tipShown = true;
      setTipId(tip.id);
    };
    timer = setTimeout(attempt, TIP_DELAY_MS);
    return () => clearTimeout(timer);
  }, [mounted, tipId, dueTip, interruptions]);
  useEffect(() => () => setInterruptionDue("tip", false), []);

  // Others that open by themselves (the install pop-up) wait while a tip is open or due
  useEffect(() => {
    if (mounted) setTipBusy(tipId !== null || dueTip() !== null);
  }, [mounted, tipId, dueTip]);
  useEffect(() => () => setTipBusy(null), []);

  if (!mounted) return null;

  // The tour is drawn only on the screen of its step: Thêm bữa đầu tiên starts it one screen early
  if (tour.status === "step" && pathname !== TOUR_STEPS[tour.index].path) return <Presence>{null}</Presence>;
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
      <Presence>
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
      </Presence>
    );
  }

  if (wn && pathname === HOME_ROUTE) {
    // Tiếp, Xong and a target that is not on screen all use the same rule (lib/releases tourStepAfter)
    const endWn = () => {
      writeWhatsNewTour(null);
      emitSignal("end-select");
    };
    const goTo = (index: number | null) => {
      if (index === null || index >= wnSteps.length) return endWn();
      // The last step points at a tab (Cài đặt, Khám phá), which Chọn nhiều món hides on the phone
      if (index === wnSteps.length - 1) emitSignal("end-select");
      writeWhatsNewTour({ ...wn, index });
    };
    const step = wnSteps[wn.index];
    if (!step) return <Presence>{null}</Presence>;
    return (
      <Presence>
      <Spotlight
        key={`wn-${wn.releaseIds.join("+")}-${wn.index}`}
        target={step.target}
        fallback={step.fallback}
        scroll
        tone="news"
        ariaLabel={`Hướng dẫn bước ${wn.index + 1} trên ${wnSteps.length}`}
        interactive={step.advanceOn !== undefined}
        onEscape={endWn}
        onMissing={() => goTo(tourStepAfter(wnSteps, wn.index, "missing"))}
      >
        <WhatsNewCard
          step={step}
          index={wn.index}
          total={wnSteps.length}
          onNext={() => goTo(tourStepAfter(wnSteps, wn.index, "next"))}
          onSkip={endWn}
        />
      </Spotlight>
      </Presence>
    );
  }

  const tip = tipId ? TIPS.find((t) => t.id === tipId) : null;
  if (!tip) return <Presence>{null}</Presence>;
  return (
    <Presence>
    <Spotlight
      key={`tip-${tip.id}`}
      target={tip.target}
      round={tip.round}
      labelledBy="tip-title"
      onShown={() => markTipSeen(tip.id)}
      onEscape={() => setTipId(null)}
      onMissing={() => setTipId(null)}
    >
      <TipCard
        tip={tip}
        onGotIt={() => setTipId(null)}
        onTry={() => {
          setTipId(null);
          emitSignal("open-share");
        }}
        onTurnOff={() => {
          setTipsOff(true);
          setTipId(null);
        }}
      />
    </Spotlight>
    </Presence>
  );
}
