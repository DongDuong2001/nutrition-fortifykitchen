"use client";

import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Sheet } from "@/components/ui/sheet";
import { SwitchGlide } from "@/components/ui/switch-glide";
import { SettingsTile, type SettingsTileTone } from "@/components/ui/settings-tile";
import { SETTINGS_ICONS } from "@/components/settings/settings-icons";
import { useDiary } from "@/lib/diary-store";
import {
  FEEDBACK_EMAIL,
  FEEDBACK_TYPES,
  accountCode,
  buildFeedback,
  closeFeedback,
  currentFeedback,
  deviceName,
  gmailUrl,
  mailtoUrl,
  markFeedbackSeen,
  subscribeFeedback,
  type FeedbackRequest,
  type FeedbackType,
} from "@/lib/feedback";

const TYPE_LOOK: Record<FeedbackType, { tone: SettingsTileTone; glyph: React.ReactNode }> = {
  bug: { tone: "notifications", glyph: SETTINGS_ICONS.bug },
  data: { tone: "targets", glyph: SETTINGS_ICONS.chart },
  food: { tone: "body", glyph: SETTINGS_ICONS.plus },
  idea: { tone: "app", glyph: SETTINGS_ICONS.tips },
  complaint: { tone: "privacy", glyph: SETTINGS_ICONS.flag },
};

const CHEVRON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-secondary" aria-hidden="true">
    <path d="M9 5l7 7-7 7" />
  </svg>
);
const OUT = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-secondary" aria-hidden="true">
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </svg>
);

const ROW = "flex min-h-16 w-full items-center gap-3 py-2 text-left text-text no-underline m-tint transition-press cursor-pointer";

/**
 * Góp ý & hỗ trợ (feedback-mailto, boards 2 and 3): one sheet for the app, opened by openFeedback() from Cài đặt, the food
 * page (Báo sai số liệu) and an empty search (Yêu cầu thêm món). Step 1 picks the kind; step 2 (Gửi qua…) shows the email
 * the app wrote and opens it in Gmail or the Mail app, or copies the address. The steps glide inside the one sheet.
 */
export function FeedbackHost() {
  const request = useSyncExternalStore(subscribeFeedback, currentFeedback, () => null);
  // Kept while the sheet slides away, so its content does not blank out mid-exit
  const last = useRef<FeedbackRequest | null>(null);
  if (request) last.current = request;
  const shown = request ?? last.current;

  useEffect(() => {
    if (request) markFeedbackSeen();
  }, [request]);

  return (
    <Sheet open={request !== null} onClose={closeFeedback} labelledBy="feedback-title" desktopDialog stacked={shown?.stacked}>
      {shown && <FeedbackSteps key={`${shown.screen}|${shown.type ?? ""}|${shown.food?.id ?? shown.search ?? ""}`} request={shown} />}
    </Sheet>
  );
}

function FeedbackSteps({ request }: { request: FeedbackRequest }) {
  const [type, setType] = useState<FeedbackType | null>(request.type ?? null);
  // After a step change the new step's title takes the focus when it mounts (SwitchGlide draws the old step for 80 ms first,
  // so a ref shared by both titles would focus the one that is leaving)
  const [switched, setSwitched] = useState(false);
  const go = (next: FeedbackType | null) => {
    setSwitched(true);
    setType(next);
  };

  return (
    <SwitchGlide id={type ? "send" : "pick"} order={type ? 1 : 0}>
      {type ? <SendStep type={type} request={request} onBack={() => go(null)} focusTitle={switched} /> : <PickStep onPick={go} focusTitle={switched} />}
    </SwitchGlide>
  );
}

function StepHeader({ title, back, focusTitle }: { title: string; back?: () => void; focusTitle: boolean }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focusTitle) headingRef.current?.focus();
  }, [focusTitle]);
  return (
    <div className="-mx-4 mb-1 grid grid-cols-[44px_1fr_44px] items-center gap-2 px-4 pt-1 pb-2">
      <button
        type="button"
        onClick={back ?? closeFeedback}
        aria-label={back ? "Quay lại" : "Đóng"}
        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-0 bg-fill p-0 text-text active:scale-[0.97] transition-press motion-reduce:active:scale-100"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d={back ? "M15 6l-6 6 6 6" : "M6 6l12 12M18 6 6 18"} />
        </svg>
      </button>
      <h2 id="feedback-title" ref={headingRef} tabIndex={-1} className="m-0 text-center text-body-lg font-bold leading-tight text-text outline-none">
        {title}
      </h2>
      <span aria-hidden="true" />
    </div>
  );
}

function PickStep({ onPick, focusTitle }: { onPick: (type: FeedbackType) => void; focusTitle: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <StepHeader title="Góp ý & hỗ trợ" focusTitle={focusTitle} />
      <p className="m-0 text-callout leading-snug text-secondary">Bạn muốn gửi gì? Mình đọc hết từng email và trả lời sớm nhất có thể.</p>
      <ul className="m-0 flex list-none flex-col p-0">
        {FEEDBACK_TYPES.map((t, i) => (
          <li key={t.id}>
            <button type="button" onClick={() => onPick(t.id)} data-align-group="feedback-row" className={`${ROW} bg-transparent ${i > 0 ? "border-t border-solid border-divider" : ""}`}>
              <SettingsTile tone={TYPE_LOOK[t.id].tone} size={36}>
                {TYPE_LOOK[t.id].glyph}
              </SettingsTile>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-base font-bold leading-snug">{t.title}</span>
                <span className="text-cap leading-snug text-secondary">{t.description}</span>
              </span>
              {CHEVRON}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SendStep({
  type,
  request,
  onBack,
  focusTitle,
}: {
  type: FeedbackType;
  request: FeedbackRequest;
  onBack: () => void;
  focusTitle: boolean;
}) {
  const { notify } = useDiary();
  const [code, setCode] = useState("");
  useEffect(() => {
    let live = true;
    void accountCode().then((c) => live && setCode(c));
    return () => {
      live = false;
    };
  }, []);
  // The time is when this step opened, so the preview and the email say the same
  const [at] = useState(() => new Date());
  const mail = useMemo(
    () =>
      buildFeedback({
        type,
        context: {
          screen: request.screen,
          food: request.food,
          search: request.search,
          version: process.env.NEXT_PUBLIC_APP_VERSION || "?",
          device: typeof navigator === "undefined" ? "" : deviceName(navigator.userAgent, navigator.maxTouchPoints),
          accountCode: code,
          at,
        },
      }),
    [type, request, code, at]
  );

  const copy = async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(FEEDBACK_EMAIL);
      ok = true;
    } catch {
      ok = false;
    }
    notify(ok ? "Đã sao chép" : `Chưa sao chép được. Địa chỉ: ${FEEDBACK_EMAIL}`);
  };

  return (
    <div className="flex flex-col gap-3">
      <StepHeader title="Gửi qua…" back={onBack} focusTitle={focusTitle} />
      <section aria-label="Email sẽ được soạn sẵn" data-align-group="feedback-send" className="flex flex-col gap-2 rounded-card bg-page p-4">
        <span className="text-cap font-bold text-secondary">Email sẽ được soạn sẵn</span>
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm">
          <dt className="text-secondary">Gửi tới</dt>
          <dd className="m-0 min-w-0 break-words font-semibold">{FEEDBACK_EMAIL}</dd>
          <dt className="text-secondary">Tiêu đề</dt>
          <dd className="m-0 min-w-0 break-words font-semibold">{mail.subject}</dd>
        </dl>
        <p className="m-0 whitespace-pre-line break-words rounded-xl bg-card p-3 text-cap leading-normal text-secondary">{mail.body.replace(/\n{3,}/g, "\n…\n")}</p>
        <span className="text-xs leading-snug text-secondary">Không gửi email, cân nặng hay nhật ký ăn của bạn.</span>
      </section>
      <ul className="m-0 flex list-none flex-col p-0" data-align-group="feedback-send">
        <li>
          <a href={gmailUrl(mail)} target="_blank" rel="noopener noreferrer" onClick={closeFeedback} className={`${ROW} min-h-14`}>
            <SettingsTile tone="notifications">{SETTINGS_ICONS.mail}</SettingsTile>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-callout font-semibold leading-snug">Gmail</span>
              <span className="text-cap leading-snug text-secondary">Mở Gmail với email soạn sẵn</span>
            </span>
            {OUT}
          </a>
        </li>
        <li>
          <a href={mailtoUrl(mail)} onClick={closeFeedback} className={`${ROW} min-h-14 border-t border-solid border-divider`}>
            <SettingsTile tone="app">{SETTINGS_ICONS.mail}</SettingsTile>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-callout font-semibold leading-snug">Ứng dụng Mail</span>
              <span className="text-cap leading-snug text-secondary">Mail của máy (iPhone, Samsung…)</span>
            </span>
            {OUT}
          </a>
        </li>
        <li>
          <button type="button" onClick={copy} className={`${ROW} min-h-14 border-t border-solid border-divider bg-transparent`}>
            <SettingsTile tone="privacy">{SETTINGS_ICONS.copy}</SettingsTile>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-callout font-semibold leading-snug">Sao chép địa chỉ email</span>
              <span className="break-words text-cap leading-snug text-secondary">{FEEDBACK_EMAIL}</span>
            </span>
          </button>
        </li>
      </ul>
    </div>
  );
}
