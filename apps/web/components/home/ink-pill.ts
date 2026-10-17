/**
 * The inset ink pill of Hôm nay (Hao, 17/10): the meal headers on the left and the group headers of the vi chất
 * column. The wrapper holds the inset (4 px, 6 px from lg) on the white page so a sticky pill hides the rows under it;
 * the pill's own padding puts its label on the rows' 12 px text edge. The share image is drawn at 390 px on any
 * screen, so it takes the phone sizes only (`share`).
 */
export function inkPill(share = false) {
  return {
    wrap: `bg-page px-1 pt-1 ${share ? "" : "lg:px-1.5 lg:pt-1.5"}`,
    pill: `flex h-6 items-center gap-3 rounded-md px-2 ${share ? "" : "lg:h-9 lg:rounded-lg lg:px-1.5"}`,
    label: `text-[11px] font-extrabold uppercase leading-none tracking-[0.06em] ${share ? "" : "lg:text-xs"}`,
    kcal: `font-display text-[13px] font-extrabold leading-none tabular-nums ${share ? "" : "lg:text-[15px]"}`,
  };
}
