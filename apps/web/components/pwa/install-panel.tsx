"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { PillButton } from "@/components/ui/pill-button";
import { installView, isIosDevice, isIosSafari, type InstallView } from "@/lib/pwa";

// Chrome's install event; not in the DOM lib.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface Detected {
  standalone: boolean;
  ios: boolean;
  safari: boolean;
}

function detect(): Detected {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return {
    standalone: window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true,
    ios: isIosDevice(nav.userAgent, nav.maxTouchPoints),
    safari: isIosSafari(nav.userAgent, nav.maxTouchPoints),
  };
}

const ICON = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function ShareIcon() {
  return (
    <svg {...ICON}>
      <path d="M12 15V4M8 8l4-4 4 4" />
      <path d="M6 11H5a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1h-1" />
    </svg>
  );
}

function AddSquareIcon() {
  return (
    <svg {...ICON}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg {...ICON}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

const IOS_STEPS = [
  { icon: <ShareIcon />, text: "Chạm Chia sẻ ở thanh dưới Safari" },
  { icon: <AddSquareIcon />, text: "Chọn “Thêm vào MH chính”" },
  { icon: <CheckIcon />, text: "Chạm “Thêm” ở góc trên bên phải" },
];

/**
 * The install state of this device (cc2-14): one button where the browser offers beforeinstallprompt,
 * three steps on iPhone and iPad, "Đã cài trên máy này" when already running as an app, and a short
 * note where nothing can be offered. Renders only the app card until mounted so server and client agree.
 */
export function InstallPanel() {
  const [env, setEnv] = useState<Detected | null>(null);
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setEnv(detect());
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setEvent(null);
      setEnv((prev) => (prev ? { ...prev, standalone: true } : prev));
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!env) return <div aria-hidden="true" className="min-h-[120px]" />;

  const view: InstallView = installView({ standalone: env.standalone, canPrompt: event !== null, ios: env.ios });

  const install = async () => {
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    setEvent(null); // the event can be used once
  };

  if (view === "installed") {
    return (
      <Card as="section" aria-label="Đã cài" className="flex min-h-[56px] items-center gap-3">
        <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue text-on-accent">
          <CheckIcon />
        </span>
        <p className="m-0 text-[15px] font-bold text-text">Đã cài trên máy này</p>
      </Card>
    );
  }

  if (view === "prompt") {
    return (
      <PillButton type="button" onClick={install}>
        Cài ứng dụng
      </PillButton>
    );
  }

  if (view === "ios") {
    return (
      <div className="flex flex-col gap-3">
        {!env.safari && (
          <p className="m-0 text-[13px] leading-snug text-secondary">Mở trang này bằng Safari để thêm vào màn hình chính.</p>
        )}
        <ol aria-label="Các bước cài trên iPhone" className="m-0 flex list-none flex-col gap-3 p-0">
          {IOS_STEPS.map((step, i) => (
            <li key={step.text}>
              <Card className="flex min-h-[56px] items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue text-sm font-bold tabular-nums text-on-accent"
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 text-[15px] leading-snug text-text">{step.text}</span>
                <span aria-hidden="true" className="shrink-0 text-blue">
                  {step.icon}
                </span>
              </Card>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <Card as="section" aria-label="Chưa hỗ trợ cài" className="min-h-[56px]">
      <p className="m-0 text-[15px] leading-snug text-text">
        Trình duyệt này chưa cho cài ứng dụng. Mở H1T MICRO bằng Chrome hoặc Safari để cài.
      </p>
    </Card>
  );
}
