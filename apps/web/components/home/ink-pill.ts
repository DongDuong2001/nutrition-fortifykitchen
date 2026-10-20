/**
 * The inset ink pill of Hôm nay (Hao, 17/10): the meal headers on the left and the group headers of the vi chất
 * column. The wrapper holds the inset (4 px, 6 px from lg) on the white page so a sticky pill hides the rows under it;
 * the pill's own padding puts its label on the rows' 12 px text edge. The share image is drawn at 390 px on any
 * screen, so it takes the phone sizes only (`share`). At large text sizes the kcal stays on one line: the label gives
 * way first (it starts at its narrowest, so it wraps and the pill grows), and only when even that does not fit does the
 * kcal move to a line of its own (the header button wraps), so "459 kcal" never breaks.
 */
export function inkPill(share = false) {
  return {
    wrap: `bg-page px-1 pt-1 ${share ? "" : "lg:px-1.5 lg:pt-1.5"}`,
    pill: `flex min-h-6 items-center gap-3 rounded-md px-2 ${share ? "" : "lg:min-h-9 lg:rounded-lg lg:px-1.5"}`,
    label: `min-w-0 grow basis-[min-content] text-micro font-bold uppercase leading-none tracking-caps ${share ? "whitespace-nowrap" : "lg:text-xs"}`,
    kcal: `shrink-0 whitespace-nowrap font-display text-cap font-extrabold leading-none tabular-nums ${share ? "" : "lg:text-callout"}`,
  };
}
