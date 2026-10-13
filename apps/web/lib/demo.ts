// Demo mode: the sample day, sample history, sample weights and seeded Gần đây exist only here.
// A new account starts empty. Turn it on with ?demo=1 (saved in localStorage), off with ?demo=0.

export const DEMO_KEY = "h1t_demo_v1";

export type DemoFlagAction = "set" | "clear" | "keep";

/** Pure rule. NODE_ENV development is always demo; otherwise the saved flag or ?demo= decides. */
export function resolveDemo(input: { nodeEnv: string | undefined; stored: string | null; search: string }): {
  demo: boolean;
  flag: DemoFlagAction;
} {
  const param = new URLSearchParams(input.search).get("demo");
  const dev = input.nodeEnv === "development";
  if (param === "1") return { demo: true, flag: "set" };
  if (param === "0") return { demo: dev, flag: "clear" };
  return { demo: dev || input.stored === "1", flag: "keep" };
}

/** Reads the switch from the browser and applies ?demo=. Client only; on the server it is the NODE_ENV rule. */
export function isDemo(): boolean {
  if (typeof window === "undefined") return resolveDemo({ nodeEnv: process.env.NODE_ENV, stored: null, search: "" }).demo;
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(DEMO_KEY);
  } catch {
    // Storage blocked: only the URL and NODE_ENV count
  }
  const { demo, flag } = resolveDemo({ nodeEnv: process.env.NODE_ENV, stored, search: window.location.search });
  try {
    if (flag === "set") window.localStorage.setItem(DEMO_KEY, "1");
    if (flag === "clear") window.localStorage.removeItem(DEMO_KEY);
  } catch {
    // Storage blocked
  }
  return demo;
}

// What the data helpers (mock history, sample weights) read. The diary store sets it after mount, before
// anything that depends on today renders, so the server and the first client render both see "off".
let active = false;

export function setDemoActive(value: boolean): void {
  active = value;
}

export function demoActive(): boolean {
  return active;
}
