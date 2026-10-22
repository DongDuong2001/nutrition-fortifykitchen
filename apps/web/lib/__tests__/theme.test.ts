import { afterEach, describe, expect, it, vi } from "vitest";
import { darkModeOn, isDark, parseThemeChoice } from "@/lib/theme";

describe("theme choice", () => {
  it("reads Sáng and Tối; anything else is Hệ thống", () => {
    expect(parseThemeChoice("light")).toBe("light");
    expect(parseThemeChoice("dark")).toBe("dark");
    expect(parseThemeChoice(null)).toBe("system");
    expect(parseThemeChoice("blue")).toBe("system");
  });

  it("Tối is dark, Sáng is light, Hệ thống follows the phone", () => {
    expect(isDark("dark", false)).toBe(true);
    expect(isDark("light", true)).toBe(false);
    expect(isDark("system", true)).toBe(true);
    expect(isDark("system", false)).toBe(false);
  });

  it("the flag is off unless the build turns it on, or a demo build has the preview key", () => {
    expect(darkModeOn(false, false, null)).toBe(false);
    expect(darkModeOn(false, false, "1")).toBe(false); // the live build ignores the preview key
    expect(darkModeOn(false, true, null)).toBe(false);
    expect(darkModeOn(false, true, "1")).toBe(true);
    expect(darkModeOn(true, false, null)).toBe(true);
  });
});

/** Runs the inline head script against a fake page and returns the data-theme it set (undefined = none). */
async function runScript(env: { demo?: boolean; build?: boolean }, stored: Record<string, string>, systemDark: boolean) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_DEMO_BUILD", env.demo ? "1" : "");
  vi.stubEnv("NEXT_PUBLIC_DARK_MODE", env.build ? "1" : "");
  const { THEME_SCRIPT } = await import("@/lib/theme");
  const dataset: Record<string, string> = {};
  const window = {
    localStorage: { getItem: (k: string) => stored[k] ?? null },
    matchMedia: (q: string) => ({ matches: q.includes("dark") && systemDark }),
  };
  const document = { documentElement: { dataset } };
  new Function("window", "document", THEME_SCRIPT)(window, document);
  return dataset.theme;
}

describe("THEME_SCRIPT (before the first paint)", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("does nothing while the flag is off, whatever is stored", async () => {
    expect(await runScript({}, { h1t_theme_v1: "dark", h1t_dark_preview: "1" }, true)).toBeUndefined();
    expect(await runScript({ demo: true }, { h1t_theme_v1: "dark" }, true)).toBeUndefined();
  });

  it("with the flag on it agrees with isDark for every choice", async () => {
    for (const env of [{ build: true }, { demo: true }]) {
      const preview: Record<string, string> = env.demo ? { h1t_dark_preview: "1" } : {};
      for (const systemDark of [true, false]) {
        for (const stored of [undefined, "system", "light", "dark"] as const) {
          const theme = await runScript(env, { ...preview, ...(stored ? { h1t_theme_v1: stored } : {}) }, systemDark);
          expect(theme === "dark").toBe(isDark(parseThemeChoice(stored), systemDark));
        }
      }
    }
  });
});
