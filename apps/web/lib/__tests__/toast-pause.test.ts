import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.resolve(__dirname, "../../app/globals.css"), "utf8");
const toast = readFileSync(path.resolve(__dirname, "../../components/ui/toast.tsx"), "utf8");
const host = readFileSync(path.resolve(__dirname, "../../components/diary-toast.tsx"), "utf8");

describe("toast pause and place (cc-63, N4)", () => {
  it("the hover rule sits inside (hover: hover) and (pointer: fine); focus and data-paused are outside it", () => {
    const gated = /@media \(hover: hover\) and \(pointer: fine\) \{\s*\.m-toast:hover \.m-countdown \{\s*animation-play-state: paused;/.exec(css);
    expect(gated).not.toBeNull();
    expect(css).toMatch(/\.m-toast:focus-within \.m-countdown,\s*\.m-toast\[data-paused\] \.m-countdown \{\s*animation-play-state: paused;/);
    // no ungated hover rule left
    expect(css.replace(/@media \(hover: hover\) and \(pointer: fine\) \{\s*\.m-toast:hover \.m-countdown \{[^}]*\}\s*\}/, "")).not.toMatch(/\.m-toast:hover/);
  });

  it("only a mouse pauses it: touch and pen pointers never do", () => {
    expect(toast).toContain('e.pointerType === "mouse" && onPause?.()');
    expect(toast).toContain('e.pointerType === "mouse" && onResume?.()');
    expect(toast).not.toContain("onMouseEnter");
  });

  it("the bar waits while the page is hidden", () => {
    expect(toast).toContain('data-paused={hidden ? "" : undefined}');
  });

  it("sits 12 px above the 72 px nav and the home-indicator inset; on /add above the Khay bar", () => {
    expect(host).toContain("bottom-[calc(72px+var(--update-bar-h,0px)+env(safe-area-inset-bottom)+12px)]");
    expect(host).toContain('usePathname() === "/add"');
    // Over the add sheet the host rides up 54 px (72 + 12 → 138) with a transition: it is moved, never swapped for another class
    expect(host).toContain("data-lift");
    expect(css.replace(/\/\*[\s\S]*?\*\//g, "")).toMatch(/\.m-toast-host\[data-lift\] \{\s*translate: 0 -54px;/);
    expect(css).toMatch(/\.m-toast-host \{\s*transition: translate var\(--m-row\) var\(--ease-out\);/);
  });
});
