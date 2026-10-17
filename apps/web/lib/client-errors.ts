import { isLiveMode } from "./api-mode";

/**
 * cc-50: failures real users hit go to the API once (POST /api/v1/client-errors), where each is one log line with
 * event client_error: a write the server answered with non-2xx, a sync that could not read the day or threw, the share
 * image, setup. Nothing personal is sent: the screen, the API path with ids replaced, the status, the server's (or the
 * error's) message and the app version. The API adds the user id.
 */
export type ClientErrorKind = "write" | "sync" | "share" | "setup";

export interface ClientErrorReport {
  kind: ClientErrorKind;
  method?: string;
  path?: string;
  status?: number;
  message: string;
}

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const reported = new Set<string>();

const withoutIds = (path?: string) => path?.split("?")[0].replace(UUID, ":id");

/** The text of anything thrown. */
export function errorText(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}

/** One failure: the same kind, call, status and message is reported once per page load. */
export function reportedKey(report: ClientErrorReport): string {
  return [report.kind, report.method, withoutIds(report.path), report.status, report.message].join("|");
}

export function reportClientError(report: ClientErrorReport): void {
  if (!isLiveMode() || typeof window === "undefined") return;
  const key = reportedKey(report);
  if (reported.has(key)) return;
  reported.add(key);
  const body = {
    ...report,
    path: withoutIds(report.path),
    message: report.message.slice(0, 300),
    route: window.location.pathname,
    version: process.env.NEXT_PUBLIC_APP_VERSION || "dev",
  };
  // The API base as getApiBaseUrl has it in the browser (not imported: api-client reports through this module)
  const base = process.env.NEXT_PUBLIC_API_URL || "/api/v1";
  try {
    void fetch(`${base}/client-errors`, {
      method: "POST",
      credentials: "include",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {});
  } catch {
    // Reporting must never break the app
  }
}
