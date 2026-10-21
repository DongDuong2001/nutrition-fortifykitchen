import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

// fluid-add (item 8): the first open of a lazy sheet on Hôm nay was 300 ms slower than the second, because a next/dynamic
// component that suspends the first time it renders is shown 300 ms after its fallback (React throttles a reveal). The sheets'
// modules are resolved ahead and every sheet is mounted closed once they are in, so a first open only toggles `open`.

const src = readFileSync(path.resolve(__dirname, "../../components/home/home-screen.tsx"), "utf8");

describe("Hôm nay's lazy sheets", () => {
  it("are not next/dynamic components", () => {
    expect(src).not.toMatch(/dynamic\(\(\) => load/);
    expect(src).not.toMatch(/dynamic\(\(\) => import\(["']\.\/share-sheet/);
  });

  it("resolve their modules on the first touch or when idle, into one module variable every screen reads", () => {
    expect(src).toContain("let loadedSheets: HomeSheets | null = null;");
    expect(src).toContain("subscribeSheets(() => startTransition(() => setSheets(loadedSheets)))");
    expect(src).toMatch(/document\.addEventListener\("pointerdown", onTouch, \{ capture: true, passive: true \}\)/);
    expect(src).toMatch(/requestIdleCallback\(go, \{ timeout: 3000 \}\)/);
  });

  it("mount the closed sheets in a transition, and never load them from the touch on the + that opens the add sheet", () => {
    expect(src).toMatch(/startTransition\(\(\) => setSheets\(loadedSheets\)\)/);
    expect(src).toContain('closest?.(\'#mobile-add-fab, #desktop-add-btn, a[href^="/add"]\')');
    // …and only while Hôm nay is the page, not while the add sheet is up over it
    expect(src).toMatch(/window\.location\.pathname !== HOME_ROUTE/);
  });

  it("mount each sheet closed once its chunk is in (the second argument of useOnceOpen)", () => {
    for (const flag of ["sourcesMounted", "mealMenuMounted", "explainerMounted", "saveDayMounted", "pickerMounted", "dayMenuMounted", "copyTargetMounted", "moveTargetMounted", "pastTargetMounted", "calendarMounted"]) {
      expect(src).toMatch(new RegExp(`const ${flag} = useOnceOpen\\([^;]*, sheets !== null\\);`));
    }
  });
});
