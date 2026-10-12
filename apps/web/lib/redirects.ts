/**
 * Permanent redirects from the routes IA v2 replaced (design/IA-v2.md). next.config.ts serves this list,
 * so the table and the tests cannot drift apart. The query string is carried over.
 */
export const PERMANENT_REDIRECTS = [
  { source: "/today", destination: "/diary", permanent: true },
  { source: "/profile", destination: "/settings/profile", permanent: true },
  { source: "/profile/weight", destination: "/settings/profile/weight", permanent: true },
  { source: "/foods", destination: "/explore", permanent: true },
  { source: "/login", destination: "/signin", permanent: true },
] as const;

/** The URL an old route redirects to (query string kept), or null when the route is not redirected. */
export function redirectTarget(url: string): string | null {
  const queryAt = url.indexOf("?");
  const path = queryAt === -1 ? url : url.slice(0, queryAt);
  const query = queryAt === -1 ? "" : url.slice(queryAt);
  const normal = path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
  const hit = PERMANENT_REDIRECTS.find((r) => r.source === normal);
  return hit ? `${hit.destination}${query}` : null;
}
