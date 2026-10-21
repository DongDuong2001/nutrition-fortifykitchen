"use client";

import React, { useEffect, useState } from "react";
import { InstallSheet, type InstallSheetResult } from "@/components/pwa/install-sheet";
import { SettingsRow } from "@/components/settings/settings-row";
import { SETTINGS_ICONS } from "@/components/settings/settings-icons";
import { markInstallDone, readStandalone } from "@/lib/install-browser";

/**
 * Cài đặt › Ứng dụng › "Cài ứng dụng lên điện thoại": opens the install sheet any time. Hidden where the app is
 * already installed. Closing it here never snoozes the pop-up on Hôm nay; only "Tôi đã cài xong" is remembered.
 */
export function InstallRow({ alignGroup }: { alignGroup: string }) {
  // Read after mount, so the server and first paint agree
  const [standalone, setStandalone] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => setStandalone(readStandalone()), []);

  if (standalone !== false) return null;

  const close = (result: InstallSheetResult) => {
    setOpen(false);
    if (result === "done") markInstallDone();
  };

  return (
    <>
      <SettingsRow dense tone="app" glyph={SETTINGS_ICONS.install} label="Cài ứng dụng lên điện thoại" onClick={() => setOpen(true)} data-align-group={alignGroup} />
      <InstallSheet open={open} onClose={close} />
    </>
  );
}
