/**
 * The first-meal tour (cc-42): five steps over Hôm nay and the add sheet. Pure state, no storage and no DOM; the
 * overlay (components/onboarding) and the screens feed it events.
 *
 * Steps 1 and 5 have a button (Tiếp, Hoàn tất). Steps 2 to 4 advance only when the user really does the thing
 * (tap the + in the bar, pick a food, confirm the portion). Bỏ qua hướng dẫn ends the tour for good; leaving the
 * flow (any other screen) ends it silently, so it can be replayed from Cài đặt.
 */

export type TourStepId = "kcal" | "add" | "search" | "portion" | "result";

/** What a screen reports: the real action behind steps 2 to 4. */
export type TourAction = "add-opened" | "food-picked" | "portion-confirmed";

export interface TourStep {
  id: TourStepId;
  /** The element the spotlight measures: data-tour="<target>" */
  target: string;
  /** The screen the step lives on */
  path: "/" | "/add";
  advance: "button" | "action";
  /** For an "action" step: the action that moves it on */
  action?: TourAction;
}

export const TOUR_STEPS: readonly TourStep[] = [
  { id: "kcal", target: "home-hero", path: "/", advance: "button" },
  { id: "add", target: "nav-add", path: "/", advance: "action", action: "add-opened" },
  { id: "search", target: "add-results", path: "/add", advance: "action", action: "food-picked" },
  { id: "portion", target: "portion-panel", path: "/add", advance: "action", action: "portion-confirmed" },
  { id: "result", target: "nutrient-column", path: "/", advance: "button" },
];

export type TourState =
  | { status: "off" }
  | { status: "step"; index: number }
  /** finished: Hoàn tất. skipped: Bỏ qua hướng dẫn (for good). left: the user went elsewhere (silent). */
  | { status: "done"; reason: "finished" | "skipped" | "left" };

export type TourEvent =
  | { type: "start" }
  | { type: "next" }
  | { type: "skip" }
  /** The step's element is not on screen: go on to the next step (the end, after the last) */
  | { type: "skipStep" }
  | { type: "action"; name: TourAction };

export function tourReduce(state: TourState, event: TourEvent): TourState {
  if (event.type === "start") return { status: "step", index: 0 };
  if (state.status !== "step") return state;
  const step = TOUR_STEPS[state.index];
  switch (event.type) {
    case "skip":
      return { status: "done", reason: "skipped" };
    case "skipStep":
      return state.index === TOUR_STEPS.length - 1 ? { status: "done", reason: "finished" } : { status: "step", index: state.index + 1 };
    case "next":
      if (step.advance !== "button") return state;
      return state.index === TOUR_STEPS.length - 1 ? { status: "done", reason: "finished" } : { status: "step", index: state.index + 1 };
    case "action":
      return step.advance === "action" && step.action === event.name ? { status: "step", index: state.index + 1 } : state;
  }
}

/** A route change while the tour runs: the action it means, the same step, or the end (silently). */
export function tourStepFor(state: TourState, pathname: string): TourState {
  if (state.status !== "step") return state;
  const step = TOUR_STEPS[state.index];
  if (pathname === step.path) return state;
  // + was tapped: the add sheet is open
  if (step.id === "add" && pathname === "/add") return { status: "step", index: state.index + 1 };
  // The portion was confirmed: the add sheet closed on Hôm nay, which now shows the food
  if (step.id === "portion" && pathname === "/") return { status: "step", index: state.index + 1 };
  return { status: "done", reason: "left" };
}
