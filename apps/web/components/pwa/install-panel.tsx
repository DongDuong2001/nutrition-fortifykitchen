"use client";

import React, { useEffect, useState } from "react";
import { clearInstallEvent, readInstallDevice, useInstallEvent } from "@/lib/install-browser";
import { AddSquareIcon, CheckIcon, ShareIcon } from "@/components/pwa/install-icons";
import { Card } from "@/components/ui/card";
import { PillButton } from "@/components/ui/pill-button";
import { installView, type InstallView } from "@/lib/pwa";

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
  const [env, setEnv] = useState<{ standalone: boolean; ios: boolean; safari: boolean } | null>(null);
  const event = useInstallEvent();

  useEffect(() => {
    const device = readInstallDevice();
    setEnv({ standalone: device.standalone, ios: device.phone === "ios", safari: device.safari });
    const onInstalled = () => setEnv((prev) => (prev ? { ...prev, standalone: true } : prev));
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  if (!env) return <div aria-hidden="true" className="min-h-[120px]" />;

  const view: InstallView = installView({ standalone: env.standalone, canPrompt: event !== null, ios: env.ios });

  const install = async () => {
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    clearInstallEvent(); // the event can be used once
  };

  if (view === "installed") {
    return (
      <Card as="section" aria-label="Đã cài" className="flex min-h-14 items-center gap-3">
        <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cobalt text-on-accent">
          <CheckIcon />
        </span>
        <p className="m-0 text-callout font-bold text-text">Đã cài trên máy này</p>
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
          <p className="m-0 text-cap leading-snug text-secondary">Mở trang này bằng Safari để thêm vào màn hình chính.</p>
        )}
        <ol aria-label="Các bước cài trên iPhone" className="m-0 flex list-none flex-col gap-3 p-0">
          {IOS_STEPS.map((step, i) => (
            <li key={step.text}>
              <Card className="flex min-h-14 items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cobalt text-sm font-bold tabular-nums text-on-accent"
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 text-callout leading-snug text-text">{step.text}</span>
                <span aria-hidden="true" className="shrink-0 text-cobalt">
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
    <Card as="section" aria-label="Chưa hỗ trợ cài" className="min-h-14">
      <p className="m-0 text-callout leading-snug text-text">
        Trình duyệt này chưa cho cài ứng dụng. Mở H1T MICRO bằng Chrome hoặc Safari để cài.
      </p>
    </Card>
  );
}
