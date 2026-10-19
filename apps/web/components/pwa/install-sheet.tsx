"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AddSquareIcon,
  BoltIcon,
  CheckIcon,
  ChevronLeftIcon,
  CloseIcon,
  CopyIcon,
  DotsIcon,
  DotsVerticalIcon,
  DownloadIcon,
  GlobeIcon,
  InfoIcon,
  PhoneIcon,
  ShareIcon,
} from "@/components/pwa/install-icons";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { Toast } from "@/components/ui/toast";
import { Presence } from "@/components/ui/presence";
import { clearInstallEvent, readInstallDevice, useInstallEvent, type InstallDevice } from "@/lib/install-browser";
import type { InAppBrowser } from "@/lib/pwa";

/** The link the in-app browser copies: the link page, which opens the install steps on a phone (?install=1). */
export const INSTALL_URL = "https://lehongkhanh.vn/?install=1";
const INSTALL_HOST = "lehongkhanh.vn";

type View = "ask" | "ios" | "android" | "inapp";

/** "later": Để sau, the close button, Esc or the scrim. "done": Tôi đã cài xong. */
export type InstallSheetResult = "later" | "done";

interface InstallSheetProps {
  open: boolean;
  onClose: (result: InstallSheetResult) => void;
}

const TITLE_ID = "install-sheet-title";
export const SHEET_TITLE_CLASS = "m-0 font-display font-extrabold italic uppercase leading-none text-text";
export const SHEET_ICON_BUTTON =
  "inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-text active:scale-[0.97] transition-press motion-reduce:transition-none motion-reduce:active:scale-100";
const LATER_BUTTON =
  "inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-full border-0 bg-transparent px-4 text-[15px] font-bold text-secondary transition-press m-tint motion-reduce:transition-none";
const RING = "ring-[3px] ring-blue";

function startView(device: InstallDevice): View {
  return device.inApp ? "inapp" : "ask";
}

function Step({ n, title, sub, children }: { n: number; title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue font-display text-base font-extrabold italic text-on-accent"
      >
        {n}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="m-0 text-[15px] font-semibold leading-snug text-text">{title}</p>
        {children}
        {sub && <p className="m-0 text-[13px] leading-snug text-secondary">{sub}</p>}
      </div>
    </li>
  );
}

/** A browser's bottom or top bar, drawn small: the back chevron, the address, and the menu button that step points at. */
function MiniBar({ menu }: { menu: React.ReactNode }) {
  return (
    <div aria-hidden="true" className="flex items-center gap-2 rounded-xl border border-card-border bg-surface p-2">
      <span className="shrink-0 text-secondary">
        <ChevronLeftIcon />
      </span>
      <span className="min-w-0 flex-1 rounded-full bg-card px-3 py-1 text-center text-[13px] text-secondary">{INSTALL_HOST}</span>
      {menu}
    </div>
  );
}

function RingedButton({ children }: { children: React.ReactNode }) {
  return <span className={`inline-flex shrink-0 items-center justify-center rounded-full p-1 text-text ${RING}`}>{children}</span>;
}

function RingedRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div aria-hidden="true" className={`flex items-center justify-between gap-3 rounded-xl bg-card px-3 py-3 text-[15px] text-text ${RING}`}>
      <span>{label}</span>
      <span className="text-text">{icon}</span>
    </div>
  );
}

function SubHeader({ title, onBack, onClose }: { title: string; onBack?: () => void; onClose: () => void }) {
  return (
    <header className="flex items-center gap-2">
      {onBack && (
        <button type="button" aria-label="Quay lại chọn loại máy" onClick={onBack} className={`${SHEET_ICON_BUTTON} -ml-2`}>
          <ChevronLeftIcon />
        </button>
      )}
      <h2 id={TITLE_ID} className={`${SHEET_TITLE_CLASS} min-w-0 flex-1 text-[26px]`}>
        {title}
      </h2>
      <button type="button" aria-label="Đóng" onClick={onClose} className={`${SHEET_ICON_BUTTON} -mr-2`}>
        <CloseIcon />
      </button>
    </header>
  );
}

function AskView({ detected, onPick, onLater }: { detected: "ios" | "android" | null; onPick: (v: "ios" | "android") => void; onLater: () => void }) {
  const benefits = [
    { icon: <BoltIcon />, text: "Mở bằng 1 chạm từ màn hình chính" },
    { icon: <PhoneIcon />, text: "Toàn màn hình, không còn thanh trình duyệt" },
    { icon: <CheckIcon />, text: "Không cần App Store hay CH Play" },
  ];
  const choices = [
    { id: "ios" as const, name: "iPhone", note: "Safari" },
    { id: "android" as const, name: "Android", note: "Chrome, Samsung…" },
  ];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <img src="/icons/icon-512.png" alt="" width={56} height={56} className="h-14 w-14 shrink-0 rounded-[14px]" />
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={TITLE_ID} className={`${SHEET_TITLE_CLASS} text-[22px]`}>
            CÀI H1T MICRO VÀO MÁY CỦA BẠN
          </h2>
          <p className="m-0 text-[13px] leading-snug text-secondary">Như một ứng dụng thật, chỉ mất 20 giây.</p>
        </div>
      </div>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {benefits.map((b) => (
          <li key={b.text} className="flex items-center gap-3 text-[14px] font-semibold leading-snug text-text">
            <span aria-hidden="true" className="inline-flex shrink-0 text-blue">
              {b.icon}
            </span>
            {b.text}
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-3">
        <p id="install-which-phone" className="m-0 text-xs font-bold uppercase leading-tight text-secondary">
          Bạn đang dùng điện thoại nào?
        </p>
        <div role="group" aria-labelledby="install-which-phone" className="grid grid-cols-2 gap-3 pt-2">
          {choices.map((c) => {
            const mine = detected === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onPick(c.id)}
                className={`relative flex min-h-[76px] cursor-pointer flex-col items-start justify-center gap-1 rounded-2xl px-4 py-3 text-left active:scale-[0.97] transition-press motion-reduce:transition-none motion-reduce:active:scale-100 ${
                  mine ? "border-2 border-blue bg-cobalt-tint" : "border border-card-border bg-card"
                }`}
              >
                {mine && (
                  <span className="absolute -top-3 left-3 rounded-full bg-blue px-2 py-1 text-[11px] font-bold leading-none text-on-accent">
                    Máy của bạn
                  </span>
                )}
                <span className="text-base font-bold leading-tight text-text">{c.name}</span>
                <span className="text-[13px] leading-tight text-secondary">{c.note}</span>
              </button>
            );
          })}
        </div>
      </div>
      <button type="button" onClick={onLater} className={LATER_BUTTON}>
        Để sau
      </button>
    </div>
  );
}

function IosView({ onBack, onClose, onDone, onLater }: { onBack: () => void; onClose: () => void; onDone: () => void; onLater: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <SubHeader title="CÀI TRÊN IPHONE" onBack={onBack} onClose={onClose} />
      <ol className="m-0 flex list-none flex-col gap-4 p-0">
        <Step n={1} title="Chạm nút ••• ở thanh dưới của Safari">
          <MiniBar
            menu={
              <RingedButton>
                <DotsIcon />
              </RingedButton>
            }
          />
        </Step>
        <Step n={2} title="Chạm Chia sẻ">
          <div aria-hidden="true" className="flex">
            <span className={`inline-flex items-center justify-center rounded-xl bg-card p-2 text-text ${RING}`}>
              <ShareIcon />
            </span>
          </div>
        </Step>
        <Step n={3} title="Kéo xuống, chọn Thêm vào MH chính" sub="Không thấy? Chạm Xem thêm ở cuối danh sách.">
          <RingedRow label="Thêm vào MH chính" icon={<AddSquareIcon />} />
        </Step>
        <Step n={4} title="Chạm Thêm ở góc trên bên phải" sub="Biểu tượng H1T MICRO sẽ nằm trên màn hình chính." />
      </ol>
      <div className="flex items-start gap-3 rounded-xl bg-cobalt-tint p-3 text-blue">
        <span aria-hidden="true" className="inline-flex shrink-0">
          <InfoIcon />
        </span>
        <p className="m-0 text-[13px] leading-snug text-text">iOS 18 trở về trước: nút Chia sẻ nằm ngay trên thanh dưới, bỏ qua bước 1.</p>
      </div>
      <div className="flex flex-col gap-2">
        <PillButton type="button" onClick={onDone}>
          Tôi đã cài xong
        </PillButton>
        <button type="button" onClick={onLater} className={LATER_BUTTON}>
          Để sau
        </button>
      </div>
    </div>
  );
}

function AndroidView({
  canPrompt,
  onInstall,
  onBack,
  onClose,
  onDone,
  onLater,
}: {
  canPrompt: boolean;
  onInstall: () => void;
  onBack: () => void;
  onClose: () => void;
  onDone: () => void;
  onLater: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <SubHeader title="CÀI TRÊN ANDROID" onBack={onBack} onClose={onClose} />
      {canPrompt && (
        <section aria-labelledby="install-fastest" className="flex flex-col gap-3 rounded-2xl bg-cobalt-tint p-4">
          <p id="install-fastest" className="m-0 text-xs font-bold uppercase leading-tight text-blue">
            Cách nhanh nhất
          </p>
          <PillButton type="button" onClick={onInstall}>
            <span className="inline-flex items-center gap-2">
              <DownloadIcon />
              Cài đặt ngay
            </span>
          </PillButton>
          <p className="m-0 text-[13px] leading-snug text-secondary">Điện thoại sẽ hỏi lại một lần, chọn Cài đặt.</p>
        </section>
      )}
      <div className="flex flex-col gap-4">
        {canPrompt && <p className="m-0 text-xs font-bold uppercase leading-tight text-secondary">Hoặc làm trong Chrome</p>}
        <ol className="m-0 flex list-none flex-col gap-4 p-0">
          <Step n={1} title="Chạm nút ⋮ ở góc trên bên phải">
            <MiniBar
              menu={
                <RingedButton>
                  <DotsVerticalIcon />
                </RingedButton>
              }
            />
          </Step>
          <Step n={2} title="Chọn Cài đặt ứng dụng" sub="Máy cũ ghi Thêm vào màn hình chính.">
            <RingedRow label="Cài đặt ứng dụng" icon={<DownloadIcon />} />
          </Step>
          <Step n={3} title="Chạm Cài đặt" />
        </ol>
        <p className="m-0 text-[13px] leading-snug text-secondary">Samsung Internet: chạm ≡ › Thêm trang vào › Màn hình chính.</p>
      </div>
      <div className="flex flex-col gap-2">
        <PillButton type="button" variant={canPrompt ? "secondary" : "primary"} onClick={onDone}>
          Tôi đã cài xong
        </PillButton>
        <button type="button" onClick={onLater} className={LATER_BUTTON}>
          Để sau
        </button>
      </div>
    </div>
  );
}

function InAppView({ app, onClose, onCopy, onLater }: { app: InAppBrowser; onClose: () => void; onCopy: () => void; onLater: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <SubHeader title="MỞ BẰNG TRÌNH DUYỆT TRƯỚC" onClose={onClose} />
      <p className="m-0 text-[15px] leading-snug text-text">
        Bạn đang mở H1T MICRO trong {app}. Ứng dụng chỉ cài được từ Safari (iPhone) hoặc Chrome (Android).
      </p>
      <ol className="m-0 flex list-none flex-col gap-4 p-0">
        <Step n={1} title="Chạm nút ••• ở góc trên bên phải" />
        <Step n={2} title="Chọn Mở bằng trình duyệt">
          <RingedRow label="Mở bằng trình duyệt" icon={<GlobeIcon />} />
        </Step>
        <Step n={3} title="Hướng dẫn cài đặt sẽ hiện lại trong trình duyệt" />
      </ol>
      <div className="flex flex-col gap-2">
        <PillButton type="button" onClick={onCopy}>
          <span className="inline-flex items-center gap-2">
            <CopyIcon />
            Sao chép liên kết
          </span>
        </PillButton>
        <p className="m-0 text-center text-[13px] leading-snug text-secondary">Rồi dán {INSTALL_HOST} vào Safari hoặc Chrome.</p>
        <button type="button" onClick={onLater} className={LATER_BUTTON}>
          Để sau
        </button>
      </div>
    </div>
  );
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // No clipboard permission (an in-app browser, an insecure origin): fall back to a hidden field
    try {
      const field = document.createElement("textarea");
      field.value = text;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      const ok = document.execCommand("copy");
      field.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/**
 * Cài ứng dụng lên màn hình chính (design: onboarding canvas, Install-Ask / -iOS / -Android / -InApp). Four views in
 * one bottom sheet: pick the phone, the iPhone steps, the Android steps (with "Cài đặt ngay" where Chrome holds the
 * install event) and, inside Zalo, Facebook and the like, how to open the page in a real browser first.
 */
export function InstallSheet({ open, onClose }: InstallSheetProps) {
  const [device, setDevice] = useState<InstallDevice | null>(null);
  const [view, setView] = useState<View>("ask");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const event = useInstallEvent();

  // The device and the first view are read when the sheet opens, never on the server
  useEffect(() => {
    if (!open) return;
    const read = readInstallDevice();
    setDevice(read);
    setView(startView(read));
    setToast(null);
  }, [open]);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    []
  );

  const later = useCallback(() => onClose("later"), [onClose]);
  const done = useCallback(() => onClose("done"), [onClose]);
  const backToAsk = useCallback(() => setView("ask"), []);

  const install = async () => {
    if (!event) return;
    try {
      await event.prompt();
      await event.userChoice;
    } catch {
      // The browser refused a second prompt; the steps below still work
    }
    clearInstallEvent(); // the event can be used once
  };

  const copy = async () => {
    const ok = await copyText(INSTALL_URL);
    setToast(ok ? "Đã sao chép liên kết" : `Chưa sao chép được. Nhập ${INSTALL_HOST} vào Safari hoặc Chrome.`);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  };

  return (
    <>
      <Sheet open={open} onClose={later} labelledBy={TITLE_ID} desktopDialog className="max-h-[92dvh] overflow-y-auto">
        {view === "ask" && <AskView detected={device?.phone ?? null} onPick={setView} onLater={later} />}
        {view === "ios" && <IosView onBack={backToAsk} onClose={later} onDone={done} onLater={later} />}
        {view === "android" && (
          <AndroidView canPrompt={event !== null} onInstall={install} onBack={backToAsk} onClose={later} onDone={done} onLater={later} />
        )}
        {view === "inapp" && <InAppView app={device?.inApp ?? "Zalo"} onClose={later} onCopy={copy} onLater={later} />}
      </Sheet>
      <Presence>
        {open && toast && (
          <div className="pointer-events-none fixed inset-x-0 bottom-[calc(24px+env(safe-area-inset-bottom))] z-[60] px-3">
            <Toast message={toast} />
          </div>
        )}
      </Presence>
    </>
  );
}
