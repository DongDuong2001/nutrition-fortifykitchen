"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { CloseIcon } from "@/components/pwa/install-icons";
import { InstallSheet, SHEET_ICON_BUTTON, SHEET_TITLE_CLASS, type InstallSheetResult } from "@/components/pwa/install-sheet";
import { LinkRowContent, ROW_CLASS, ROW_ICON_CLASS } from "@/components/link-page/link-row";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { markInstallDone, readStandalone } from "@/lib/install-browser";
import { HOME_ROUTE } from "@/lib/nav";
import { isTouchPhone } from "@/lib/pwa";

const TITLE_ID = "access-sheet-title";

/**
 * The H1T MICRO row on the link page. An installed app or a desktop goes straight to Hôm nay (it is a plain link to
 * HOME_ROUTE). A phone in a browser gets a choice first: install the app (the install sheet's steps) or carry on in
 * the browser. Closing the choice returns focus to the row. "?install=1" (the link the in-app browser copies) opens the
 * install steps straight away on a phone; a desktop ignores it. The param is dropped from the address either way.
 */
export function AccessRow() {
  const [choosing, setChoosing] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("install") !== "1") return;
    url.searchParams.delete("install");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    if (!readStandalone() && isTouchPhone(window.matchMedia("(pointer: coarse)").matches, window.innerWidth)) setInstalling(true);
  }, []);

  const open = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (readStandalone() || !isTouchPhone(window.matchMedia("(pointer: coarse)").matches, window.innerWidth)) return;
    e.preventDefault();
    // Safari does not focus a tapped link; the sheet hands focus back to whatever had it when it opened
    e.currentTarget.focus();
    setChoosing(true);
  };

  const install = () => {
    setChoosing(false);
    setInstalling(true);
  };

  const closeInstall = (result: InstallSheetResult) => {
    setInstalling(false);
    if (result === "done") markInstallDone();
  };

  return (
    <>
      <Link href={HOME_ROUTE} onClick={open} className={ROW_CLASS} data-align-group="link-rows">
        <LinkRowContent
          icon={<img src="/icons/icon-192.png" alt="" width={32} height={32} className={`block ${ROW_ICON_CLASS}`} />}
          title="H1T MICRO"
          line="Theo dõi năng lượng và vi chất đã tiêu thụ"
          action="Truy cập"
        />
      </Link>
      <Sheet open={choosing} onClose={() => setChoosing(false)} labelledBy={TITLE_ID}>
        <div className="flex flex-col gap-4">
          <header className="flex items-center gap-2">
            <h2 id={TITLE_ID} className={`${SHEET_TITLE_CLASS} min-w-0 flex-1 text-title`}>
              Dùng H1T MICRO
            </h2>
            <button type="button" aria-label="Đóng" onClick={() => setChoosing(false)} className={`${SHEET_ICON_BUTTON} -mr-2`}>
              <CloseIcon />
            </button>
          </header>
          <p className="m-0 text-callout leading-snug text-text">Cài app lên màn hình chính để mở nhanh, như một ứng dụng.</p>
          <div className="flex flex-col gap-2">
            <PillButton type="button" onClick={install}>
              Cài app
            </PillButton>
            <PillButton variant="secondary" href={HOME_ROUTE} replace>
              Tiếp tục trên web
            </PillButton>
          </div>
        </div>
      </Sheet>
      <InstallSheet open={installing} onClose={closeInstall} />
    </>
  );
}
