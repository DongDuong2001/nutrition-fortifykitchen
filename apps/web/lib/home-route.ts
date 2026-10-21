/**
 * Hôm nay's route, on its own so the error pages, the 404 and the header can link to it without pulling in the whole
 * navigation map (lib/nav re-exports it): each of those is its own entry, and a shared module under the split size is
 * copied into every one of them.
 */
export const HOME_ROUTE = "/app";

/** Tổng quan's route (the bottom nav's second tab, lib/nav NAV_TABS), for the same pages: the 404 and the error page's "Về Tổng quan". */
export const OVERVIEW_ROUTE = "/trends";
