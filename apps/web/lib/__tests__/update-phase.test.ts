import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { UPDATE_TOAST_MS, canApplyUpdate, updatePhase, updateToastVisible } from "../update-phase";
import { UPDATE_BAR_HEIGHT_PX } from "../update-bar";

// cc-68 (S10, S15) and fix/polish-1020 item 2: "Có bản mới" is applied when the app goes to the background or by the next cold
// open, never while writes wait; its toast goes after 5 s and sits above the nav with room left for it.

describe("applying the update", () => {
  it("a tap applies it once nothing waits or is being sent", () => {
    expect(canApplyUpdate({ tapped: true, busy: false })).toBe(true);
    expect(canApplyUpdate({ tapped: true, busy: true })).toBe(false);
  });

  it("the app going to the background applies it too, but never while writes wait", () => {
    expect(canApplyUpdate({ tapped: false, inBackground: true, busy: false })).toBe(true);
    expect(canApplyUpdate({ tapped: false, inBackground: true, busy: true })).toBe(false);
    // Nothing said yes: the update waits for the next cold open
    expect(canApplyUpdate({ tapped: false, inBackground: false, busy: false })).toBe(false);
    expect(canApplyUpdate({ tapped: false, busy: false })).toBe(false);
  });

  it("the toast phases are as they were", () => {
    expect(updatePhase({ tapped: false, busy: true, saving: false, offline: false, failed: 0 })).toBe("ready");
    expect(updatePhase({ tapped: true, busy: true, saving: true, offline: false, failed: 0 })).toBe("waiting");
    expect(updatePhase({ tapped: true, busy: true, saving: false, offline: true, failed: 0 })).toBe("blocked");
  });
});

describe("the toast", () => {
  it("stays 5 s when nobody taps it, and as long as a tap on Tải lại waits on writes", () => {
    expect(UPDATE_TOAST_MS).toBe(5000);
    expect(updateToastVisible({ tapped: false, expired: false })).toBe(true);
    expect(updateToastVisible({ tapped: false, expired: true })).toBe(false);
    expect(updateToastVisible({ tapped: true, expired: true })).toBe(true);
  });

  it("sits right above the 72 px nav, and the tab frame, Hôm nay's list and the diary toast leave room for it (--update-bar-h)", () => {
    const root = path.resolve(__dirname, "../..");
    const offer = readFileSync(path.join(root, "components/pwa/update-offer.tsx"), "utf8");
    expect(offer).toContain("bottom-[calc(72px+env(safe-area-inset-bottom))]");
    expect(offer).toContain("setUpdateBar(visible)");
    expect(UPDATE_BAR_HEIGHT_PX).toBe(64);
    for (const file of ["components/ui/app-shell.tsx", "components/home/home-screen.tsx", "components/diary-toast.tsx"]) {
      expect(readFileSync(path.join(root, file), "utf8")).toContain("var(--update-bar-h,0px)");
    }
  });
});
