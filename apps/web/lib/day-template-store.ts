import { apiClient, pendingTemplateOps } from "./api-client";
import { isLiveMode } from "./api-mode";
import { currentAccountId } from "./auth-actions";
import { isDemo } from "./demo";
import { createDeviceStore } from "./device-store";
import { mergeDayTemplates, parseDayTemplates, templateWrites, withUuidIds, type DayTemplate } from "./day-templates";
import { DAY_TEMPLATES_KEY, DAY_TEMPLATES_SYNCED_KEY, accountStorage } from "./storage-keys";
import { generateUuid } from "./uuid";

/**
 * Ngày ăn mẫu on this device (per account) and on the server. Every change goes to the device at once and, for a signed-in
 * account, through the outbox to /day-templates (PUT by id, DELETE), so an offline save is sent later and sending it twice changes
 * nothing. On load the server's list is merged in (lib/day-templates mergeDayTemplates); the device's first sync uploads the
 * templates it made before.
 */
export const dayTemplateStore = createDeviceStore<DayTemplate[]>({ key: DAY_TEMPLATES_KEY, parse: parseDayTemplates, empty: [] });

const syncing = (): boolean => isLiveMode() && !isDemo() && currentAccountId() !== null;

function send(writes: { put: DayTemplate[]; remove: string[] }): void {
  for (const template of writes.put) void apiClient.queueDayTemplate(template);
  for (const id of writes.remove) void apiClient.deleteDayTemplate(id);
}

/** The list after a save, an edit or a delete: on the device now, the difference to the server through the outbox. */
export function saveDayTemplates(next: DayTemplate[]): void {
  const prev = dayTemplateStore.get();
  dayTemplateStore.set(next);
  if (syncing()) send(templateWrites(prev, next));
}

function firstSyncDone(): boolean {
  try {
    return accountStorage()?.getItem(DAY_TEMPLATES_SYNCED_KEY) === "1";
  } catch {
    return false;
  }
}

/** Reads the server's list and merges it into the device's. Nothing changes when the server could not be read. */
export async function syncDayTemplates(): Promise<void> {
  if (!syncing()) return;
  const items = await apiClient.getDayTemplates();
  if (items === null) return;
  const firstSync = !firstSyncDone();
  const local = withUuidIds(dayTemplateStore.get(), generateUuid);
  const { list, upload } = mergeDayTemplates(parseDayTemplates(JSON.stringify(items)), local, pendingTemplateOps(), firstSync);
  dayTemplateStore.set(list);
  send({ put: upload, remove: [] });
  if (firstSync) {
    try {
      accountStorage()?.setItem(DAY_TEMPLATES_SYNCED_KEY, "1");
    } catch {
      // Storage blocked: the next load uploads again, which the server takes as the same saves
    }
  }
}
