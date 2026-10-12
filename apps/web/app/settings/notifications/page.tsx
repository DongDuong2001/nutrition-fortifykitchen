"use client";

import React, { useState, useEffect } from "react";
import { AppHeader } from "@/components/ui/app-header";
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
  toggleKey:
    | "breakfastReminder"
    | "lunchReminder"
    | "dinnerReminder"
    | "workoutSaltReminder"
    | "eveningSummaryReminder";
}

const NOTIFICATION_ROWS: NotificationRowConfig[] = [
  {
    id: "breakfast",
    label: "Nhắc ghi bữa sáng",
    hasTime: true,
    timeKey: "breakfastTime",
    toggleKey: "breakfastReminder",
  },
  {
    id: "lunch",
    label: "Nhắc ghi bữa trưa",
    hasTime: true,
    timeKey: "lunchTime",
    toggleKey: "lunchReminder",
  },
  {
    id: "dinner",
    label: "Nhắc ghi bữa tối",
    hasTime: true,
    timeKey: "dinnerTime",
    toggleKey: "dinnerReminder",
  },
  {
    id: "workout_salt",
    label: "Nhắc muối khi tập",
    hint: "Mỗi 20 phút",
    toggleKey: "workoutSaltReminder",
  },
  {
    id: "evening_summary",
    label: "Tổng kết tối",
    hasTime: true,
    timeKey: "eveningSummaryTime",
    toggleKey: "eveningSummaryReminder",
  },
];

export default function NotificationsSettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);

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
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const res = await Notification.requestPermission();
        if (res === "granted") {
          setPermissionStatus("Đã bật quyền thông báo");
        } else {
          setPermissionStatus("Trình duyệt từ chối quyền thông báo");
        }
      } catch {
        setPermissionStatus("Đã bật quyền thông báo");
      }
    } else {
      setPermissionStatus("Đã bật quyền thông báo");
    }
  };

  return (
    <div className="w-full min-h-screen bg-page text-text font-sans flex flex-col">
      <AppHeader
        variant="sub"
        title="NHẮC NHỞ"
        backHref="/profile"
        backLabel="Quay lại"
        alignGroup="settings-header"
      />

      <main className="flex-1 w-full max-w-[560px] mx-auto px-4 pt-3 pb-8 flex flex-col gap-2.5">
        {/* Permission card */}
        <div className="bg-card border border-card-border rounded-[18px] p-3 md:p-4 flex flex-col gap-2">
          <div className="flex gap-2.5 items-start">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="shrink-0 mt-0.5 text-secondary"
            >
              <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z" />
              <path d="M10 20a2 2 0 0 0 4 0" />
            </svg>
            <div className="text-[15px] font-bold leading-snug">
              Thông báo cần quyền của trình duyệt
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={requestPermission}
              className="self-start h-11 px-4.5 rounded-full border border-black/12 bg-card text-ink text-sm font-semibold hover:bg-surface-tint active:scale-[0.97] transition-transform cursor-pointer"
            >
              Bật quyền thông báo
            </button>
            {permissionStatus && (
              <span className="text-xs text-secondary font-medium" role="status">
                {permissionStatus}
              </span>
            )}
          </div>
        </div>

        {/* Notification toggle rows */}
        <section className="bg-card border border-card-border rounded-[18px] px-4 py-1">
          {NOTIFICATION_ROWS.map((row, index) => {
            const isChecked = settings[row.toggleKey];
            const timeVal = row.timeKey ? settings[row.timeKey] : "";
            const timeLabel = row.hasTime
              ? `Đổi giờ ${row.label}, hiện tại ${timeVal}`
              : undefined;

            return (
              <div
                key={row.id}
                className={`flex items-center gap-2 min-h-[56px] py-1 ${
                  index > 0 ? "border-t border-divider" : ""
                }`}
              >
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <span className="text-[15px] font-normal leading-normal">{row.label}</span>
                  {row.hint && (
                    <span className="text-[13px] text-secondary leading-normal">{row.hint}</span>
                  )}
                </div>

                {row.hasTime && row.timeKey && (
                  <label
                    className="relative shrink-0 flex items-center justify-center cursor-pointer"
                    title={timeLabel}
                  >
                    <input
                      type="time"
                      value={timeVal}
                      onChange={(e) =>
                        handleTimeChange(row.timeKey!, e.target.value)
                      }
                      aria-label={timeLabel}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                    />
                    <span
                      aria-hidden="true"
                      className="flex items-center justify-center h-11 min-w-[64px] px-3 rounded-[22px] border border-black/12 bg-card text-ink text-sm font-semibold tabular-nums hover:bg-surface-tint active:scale-[0.97] transition-transform select-none"
                    >
                      {timeVal}
                    </span>
                  </label>
                )}

                <Switch
                  checked={isChecked}
                  onCheckedChange={(val) => handleToggle(row.toggleKey, val)}
                  aria-label={row.label}
                />
              </div>
            );
          })}
        </section>

        <div role="status" className="text-[13px] text-secondary text-center pt-1">
          Tự động lưu
        </div>
      </main>
    </div>
  );
}
