import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSyncAlerts, raiseSessionExpired, raiseStorageAlert, clearStorageAlert, resetSyncAlerts, subscribeSyncAlerts, STORAGE_FULL_MESSAGE } from "../sync-state";
import { requestPersistentStorage, resetPersistRequest } from "../storage-persist";
import { storageErrorKind } from "../storage-error";

beforeEach(() => {
  resetSyncAlerts();
  resetPersistRequest();
});
afterEach(() => vi.unstubAllGlobals());

describe("lasting alerts", () => {
  it("the storage alert stays until it is cleared, and listeners hear each change once", () => {
    const heard = vi.fn();
    subscribeSyncAlerts(heard);
    raiseStorageAlert("quota");
    raiseStorageAlert("quota");
    expect(getSyncAlerts()).toEqual({ storage: "quota", sessionExpired: false });
    expect(heard).toHaveBeenCalledTimes(1);
    clearStorageAlert();
    expect(getSyncAlerts().storage).toBeNull();
    expect(heard).toHaveBeenCalledTimes(2);
  });

  it("the session alert is its own", () => {
    raiseSessionExpired();
    expect(getSyncAlerts()).toEqual({ storage: null, sessionExpired: true });
  });

  it("the message says what happened to the entry just added", () => {
    expect(STORAGE_FULL_MESSAGE).toBe("Máy hết chỗ lưu, mục vừa ghi chưa được lưu");
  });
});

describe("storageErrorKind", () => {
  it("tells a full disk from a blocked one", () => {
    expect(storageErrorKind(new DOMException("full", "QuotaExceededError"))).toBe("quota");
    expect(storageErrorKind(new Error("The quota has been exceeded"))).toBe("quota");
    expect(storageErrorKind(new DOMException("no", "SecurityError"))).toBe("blocked");
    expect(storageErrorKind(new Error("IndexedDB unavailable"))).toBe("blocked");
    expect(storageErrorKind(new Error("boom"))).toBe("other");
  });
});

describe("navigator.storage.persist()", () => {
  it("is asked once per page, and a browser without it is fine", async () => {
    const persist = vi.fn(async () => true);
    vi.stubGlobal("navigator", { storage: { persist, persisted: async () => false } });
    expect(await requestPersistentStorage()).toBe(true);
    expect(await requestPersistentStorage()).toBeNull();
    expect(persist).toHaveBeenCalledTimes(1);
    resetPersistRequest();
    vi.stubGlobal("navigator", {});
    expect(await requestPersistentStorage()).toBeNull();
  });

  it("an origin that is persisted already is not asked again", async () => {
    const persist = vi.fn(async () => true);
    vi.stubGlobal("navigator", { storage: { persist, persisted: async () => true } });
    expect(await requestPersistentStorage()).toBe(true);
    expect(persist).not.toHaveBeenCalled();
  });

  it("a browser that throws is not an error", async () => {
    vi.stubGlobal("navigator", { storage: { persist: async () => { throw new Error("no"); }, persisted: async () => false } });
    expect(await requestPersistentStorage()).toBeNull();
  });
});
