"use client";

import React, { useState, useEffect } from "react";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { useBack } from "@/hooks/use-back";
import { Card } from "@/components/ui/card";
import { PillButton } from "@/components/ui/pill-button";
import { SettingsTile } from "@/components/ui/settings-tile";
import { Switch } from "@/components/ui/switch";
import {
  loadSettings,
  saveSettings,
  DEFAULT_SETTINGS,
  type AppSettings,
} from "@/lib/settings";

interface NotificationRowConfig {
  id: string;
  label: string;
  hint?: string;
  hasTime?: boolean;
  timeKey?: "breakfastTime" | "lunchTime" | "dinnerTime" | "eveningSummaryTime";
  /** The glyph in the red tile (SVG content on a 24 grid) */
  glyph: React.ReactNode;
  toggleKey:
    | "breakfastReminder"
    | "lunchReminder"
    | "dinnerReminder"
    | "workoutSaltReminder"
    | "eveningSummaryReminder";
}

const MEAL_GLYPH = <path d="M7 3v6a3 3 0 0 0 3 3v9M7 3v6M10 3v6M17 21V3c-2.3 1.5-3.5 4-3.5 7.5H17" />;
const SALT_GLYPH = <path d="M12 3s6 6.2 6 10.5a6 6 0 0 1-12 0C6 9.2 12 3 12 3z" />;
const EVENING_GLYPH = <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />;
const BELL_GLYPH = (
  <>
    <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </>
);

const NOTIFICATION_ROWS: NotificationRowConfig[] = [
  {
    id: "breakfast",
    label: "Nhắc thêm bữa sáng",
    hasTime: true,
    timeKey: "breakfastTime",
    glyph: MEAL_GLYPH,
    toggleKey: "breakfastReminder",
  },
  {
    id: "lunch",
    label: "Nhắc thêm bữa trưa",
    hasTime: true,
    timeKey: "lunchTime",
    glyph: MEAL_GLYPH,
    toggleKey: "lunchReminder",
  },
  {
    id: "dinner",
    label: "Nhắc thêm bữa tối",
    hasTime: true,
    timeKey: "dinnerTime",
    glyph: MEAL_GLYPH,
    toggleKey: "dinnerReminder",
  },
  {
    id: "workout_salt",
    label: "Nhắc muối khi tập",
    hint: "Mỗi 20 phút",
    glyph: SALT_GLYPH,
    toggleKey: "workoutSaltReminder",
  },
  {
    id: "evening_summary",
    label: "Tổng kết tối",
    hasTime: true,
    timeKey: "eveningSummaryTime",
    glyph: EVENING_GLYPH,
    toggleKey: "eveningSummaryReminder",
  },
];

export default function NotificationsSettingsPage() {
  const goBack = useBack();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);
  // D-ONB-04 / D-PRIV-03: what the notifications are for comes before the browser's own prompt
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const handleToggle = (key: NotificationRowConfig["toggleKey"], checked: boolean) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: checked };
      saveSettings({ [key]: checked });
      return next;
    });
  };

  const handleTimeChange = (
    key: "breakfastTime" | "lunchTime" | "dinnerTime" | "eveningSummaryTime",
    value: string
  ) => {
    if (!value) return;
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      saveSettings({ [key]: value });
      return next;
    });
  };

  const requestPermission = async () => {
    setAsking(false);
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const res = await Notification.requestPermission();
        if (res === "granted") {
          setPermissionStatus("Đã bật quyền thông báo");
        } else {
          setPermissionStatus("Trình duyệt đang chặn thông báo. Bạn mở cài đặt trình duyệt để cấp quyền nhé.");
        }
      } catch {
        setPermissionStatus("Đã bật quyền thông báo");
      }
    } else {
      setPermissionStatus("Đã bật quyền thông báo");
    }
  };

  if (asking) {
    return (
      <AppShell>
        <AppHeader variant="sub" title="Nhắc nhở" onBack={() => setAsking(false)} backLabel="Quay lại" alignGroup="settings-header" />
        <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col items-start gap-4 px-6 pb-8 pt-12">
          <span aria-hidden="true" className="flex h-20 w-20 items-center justify-center rounded-full bg-cobalt-tint text-cobalt">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              {BELL_GLYPH}
            </svg>
          </span>
          <h2 className="m-0 mt-2 text-title font-bold leading-tight">Nhận nhắc ghi bữa ăn</h2>
          <p className="m-0 text-body-lg leading-snug">Bật thông báo để nhắc bạn ghi bữa ăn và bổ sung muối khi tập.</p>
          <p className="m-0 text-cap leading-snug text-secondary">Bạn bật hoặc tắt từng loại nhắc nhở ở màn hình trước.</p>
          <div className="mt-auto flex w-full flex-col gap-2 pt-8">
            <PillButton type="button" variant="primary" onClick={requestPermission}>
              Bật thông báo
            </PillButton>
            <PillButton type="button" variant="tertiary" onClick={() => setAsking(false)}>
              Để sau
            </PillButton>
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <AppHeader
        variant="sub"
        title="Nhắc nhở"
        onBack={goBack}
        backLabel="Quay lại"
        alignGroup="settings-header"
      />

      <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col gap-3 px-4 pb-8 pt-4">
        {/* Permission card */}
        <Card as="section" aria-label="Quyền thông báo" padding={false} className="px-4">
          <div data-align-group="notification-row" className="flex items-start gap-3 pb-3 pt-4">
            <SettingsTile tone="notifications">{BELL_GLYPH}</SettingsTile>
            <div className="flex flex-col gap-1 pt-1">
              <span className="text-callout font-bold leading-snug">Thông báo cần quyền của trình duyệt</span>
              {permissionStatus && (
                <span className="text-cap font-medium leading-snug text-secondary" role="status">
                  {permissionStatus}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            data-align-group="notification-row"
            onClick={() => setAsking(true)}
            className="m-tint flex min-h-[52px] w-full cursor-pointer items-center gap-2 border-0 border-t border-divider bg-transparent p-0 text-left text-callout font-semibold text-cobalt"
          >
            <span className="flex-1">Bật quyền thông báo</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-secondary">
              <path d="m9 6 6 6-6 6" />
            </svg>
          </button>
        </Card>

        {/* Notification toggle rows */}
        <Card as="section" aria-label="Các loại nhắc nhở" padding={false} className="px-4">
          {NOTIFICATION_ROWS.map((row, index) => {
            const isChecked = settings[row.toggleKey];
            const timeVal = row.timeKey ? settings[row.timeKey] : "";
            const timeLabel = row.hasTime
              ? `Đổi giờ ${row.label}, hiện tại ${timeVal}`
              : undefined;

            return (
              <div
                key={row.id}
                data-align-group="notification-row"
                className={`flex min-h-[60px] items-center gap-2 py-0.5 ${index > 0 ? "border-t border-divider" : ""}`}
              >
                <SettingsTile tone="notifications" className="mr-1">
                  {row.glyph}
                </SettingsTile>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-callout leading-snug">{row.label}</span>
                  {row.hint && <span className="text-cap text-secondary">{row.hint}</span>}
                </div>

                {row.hasTime && row.timeKey && (
                  <label className="relative flex shrink-0 cursor-pointer items-center justify-center" title={timeLabel}>
                    <input
                      type="time"
                      value={timeVal}
                      onChange={(e) => handleTimeChange(row.timeKey!, e.target.value)}
                      aria-label={timeLabel}
                      className="peer absolute inset-0 z-sticky h-full w-full cursor-pointer text-base opacity-0"
                    />
                    <span
                      aria-hidden="true"
                      className="flex h-11 min-w-[68px] select-none items-center justify-center rounded-full bg-surface px-3 text-callout font-semibold tabular-nums transition-press active:scale-[0.97] peer-focus-visible:ring-2 peer-focus-visible:ring-cobalt peer-focus-visible:ring-offset-2"
                    >
                      {timeVal}
                    </span>
                  </label>
                )}

                <Switch checked={isChecked} onCheckedChange={(val) => handleToggle(row.toggleKey, val)} aria-label={row.label} />
              </div>
            );
          })}
        </Card>

        <div role="status" className="pt-1 text-center text-cap text-secondary">
          Tự động lưu
        </div>
      </main>
    </AppShell>
  );
}
