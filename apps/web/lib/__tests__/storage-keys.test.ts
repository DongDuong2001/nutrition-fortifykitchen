import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ADDED_ENTRIES_KEY,
  PROFILE_KEY,
  RECENT_FOODS_KEY,
  SAMPLE_EDITS_KEY,
  SETTINGS_STORAGE_KEY,
  TRAINING_CHECKLIST_KEY,
  dropLegacyKeys,
  OFFLINE_OUTBOX_KEY,
  dropLegacyPersonal,
  keyedStorage,
  loadMigrated,
  storageKey,
  type KeyValueStore,
} from "../storage-keys";
import { FAVOURITES_KEY } from "../favourites";
import { SAVED_MEALS_KEY } from "../saved-meals";
import { SAMPLE_PROFILE, loadProfile, readStoredProfile, writeStoredProfile } from "../profile";
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from "../settings";
import { readDay, writeDay } from "../training-checklist";
import { signInWithPassword, signOut, signUpWithPassword } from "../auth-actions";

// The account scenarios below run in account mode (not demo). Demo has its own keys and is checked elsewhere.
const demo = vi.hoisted(() => ({ on: false }));
vi.mock("../demo", () => ({ isDemo: () => demo.on }));

function memory(initial: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v;
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
}

describe("storageKey", () => {
  it("scopes a key to the account, and demo keeps its own _demo twin", () => {
    expect(storageKey(ADDED_ENTRIES_KEY, false, "a@x.vn")).toBe("h1t_added_entries_v1_a@x.vn");
    expect(storageKey(ADDED_ENTRIES_KEY, true, "a@x.vn")).toBe("h1t_added_entries_v1_demo");
    expect(storageKey(RECENT_FOODS_KEY, true, null)).toBe("h1t_recent_foods_v2_demo");
  });

  it("has no key without an account (outside demo)", () => {
    expect(storageKey(ADDED_ENTRIES_KEY, false, null)).toBeNull();
  });
});

describe("keyedStorage", () => {
  it("two accounts do not see each other's entries", () => {
    const real = memory();
    const a = keyedStorage(real, false, "a@x.vn");
    const b = keyedStorage(real, false, "b@x.vn");
    a.setItem(ADDED_ENTRIES_KEY, '[{"id":"a1"}]');
    expect(b.getItem(ADDED_ENTRIES_KEY)).toBeNull();
    b.setItem(ADDED_ENTRIES_KEY, '[{"id":"b1"}]');
    expect(a.getItem(ADDED_ENTRIES_KEY)).toBe('[{"id":"a1"}]');
    expect(b.getItem(ADDED_ENTRIES_KEY)).toBe('[{"id":"b1"}]');
    // signing A back in finds A's data again
    expect(keyedStorage(real, false, "a@x.vn").getItem(ADDED_ENTRIES_KEY)).toBe('[{"id":"a1"}]');
  });

  it("demo reads and writes the _demo keys only, whatever the account", () => {
    const real = memory({ h1t_favourite_foods_v1_a: '["a"]' });
    const demo = keyedStorage(real, true, "a");
    expect(demo.getItem(FAVOURITES_KEY)).toBeNull();
    demo.setItem(FAVOURITES_KEY, '["b"]');
    expect(real.data).toEqual({ h1t_favourite_foods_v1_a: '["a"]', h1t_favourite_foods_v1_demo: '["b"]' });
    expect(keyedStorage(real, true, null).getItem(FAVOURITES_KEY)).toBe('["b"]');
    expect(keyedStorage(real, false, "a").getItem(FAVOURITES_KEY)).toBe('["a"]');
  });

  it("without an account nothing is read or written", () => {
    const real = memory({ [ADDED_ENTRIES_KEY]: "[1]" });
    const none = keyedStorage(real, false, null);
    expect(none.getItem(ADDED_ENTRIES_KEY)).toBeNull();
    none.setItem(ADDED_ENTRIES_KEY, "[2]");
    none.removeItem(ADDED_ENTRIES_KEY);
    expect(real.data).toEqual({ [ADDED_ENTRIES_KEY]: "[1]" });
  });
});

describe("dropLegacyKeys (X8: the old unscoped keys are deleted, never adopted by whoever loads first)", () => {
  const legacy = () => ({
    [ADDED_ENTRIES_KEY]: '[{"id":"old"}]',
    [SAMPLE_EDITS_KEY]: '{"s":1}',
    [RECENT_FOODS_KEY]: '[{"foodId":"f","servingLabel":"1 g"}]',
    [FAVOURITES_KEY]: '["f"]',
    [SAVED_MEALS_KEY]: '[{"id":"m"}]',
  });

  it("deletes every old key and gives nothing to any account", () => {
    const local = memory(legacy());
    dropLegacyKeys(local, null);
    expect(local.data).toEqual({});
    expect(keyedStorage(local, false, "a@x.vn").getItem(ADDED_ENTRIES_KEY)).toBeNull();
  });

  it("an account's own data stays, the old keys go", () => {
    const local = memory({ ...legacy(), [`${ADDED_ENTRIES_KEY}_a@x.vn`]: '[{"id":"mine"}]' });
    dropLegacyKeys(local, null);
    expect(local.data).toEqual({ [`${ADDED_ENTRIES_KEY}_a@x.vn`]: '[{"id":"mine"}]' });
  });

  it("an old sessionStorage copy goes too", () => {
    const local = memory();
    const session = memory({ [ADDED_ENTRIES_KEY]: '[{"id":"s"}]' });
    dropLegacyKeys(local, session);
    expect(local.data).toEqual({});
    expect(session.data).toEqual({});
  });

  it("leaves demo keys alone", () => {
    const local = memory({ ...legacy(), [`${ADDED_ENTRIES_KEY}_demo`]: '[{"id":"d"}]' });
    dropLegacyKeys(local, null);
    expect(local.data[`${ADDED_ENTRIES_KEY}_demo`]).toBe('[{"id":"d"}]');
  });

  it("does nothing with no storage", () => {
    expect(() => dropLegacyKeys(null, null)).not.toThrow();
  });
});

describe("loadMigrated (session values move to local storage once)", () => {
  const KEY = "k";

  it("nothing anywhere: null", () => {
    expect(loadMigrated(KEY, memory(), memory())).toBeNull();
  });

  it("local only: returned, nothing else changes", () => {
    const local = memory({ k: "L" });
    expect(loadMigrated(KEY, local, memory())).toBe("L");
    expect(local.data).toEqual({ k: "L" });
  });

  it("session only: copied to local, then removed from session", () => {
    const local = memory();
    const session = memory({ k: "S" });
    expect(loadMigrated(KEY, local, session)).toBe("S");
    expect(local.data).toEqual({ k: "S" });
    expect(session.data).toEqual({});
    // A second load reads the local copy
    expect(loadMigrated(KEY, local, session)).toBe("S");
  });

  it("both: local wins and the session value is removed", () => {
    const local = memory({ k: "L" });
    const session = memory({ k: "S" });
    expect(loadMigrated(KEY, local, session)).toBe("L");
    expect(local.data).toEqual({ k: "L" });
    expect(session.data).toEqual({});
  });

  it("a local write that fails keeps the session value and still returns it", () => {
    const local: KeyValueStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {},
    };
    const session = memory({ k: "S" });
    expect(loadMigrated(KEY, local, session)).toBe("S");
    expect(session.data).toEqual({ k: "S" });
  });

  it("blocked storages are not fatal", () => {
    const blocked: KeyValueStore = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    expect(loadMigrated(KEY, blocked, blocked)).toBeNull();
    expect(loadMigrated(KEY, null, null)).toBeNull();
    expect(loadMigrated(KEY, null, memory({ k: "S" }))).toBe("S");
  });
});

describe("dropLegacyPersonal (the old profile, settings and ticks are deleted; the old outbox is the one thing an account takes)", () => {
  it("deletes each old global value and gives it to no account", () => {
    const local = memory({ [PROFILE_KEY]: '{"sex":"male"}', [SETTINGS_STORAGE_KEY]: '{"language":"en"}', [TRAINING_CHECKLIST_KEY]: "{}" });
    dropLegacyPersonal(local, "a@x.vn");
    expect(local.data).toEqual({});
  });

  it("the old unscoped offline outbox is writes that never reached the server: the first account takes it, so nothing is lost", () => {
    const local = memory({ [OFFLINE_OUTBOX_KEY]: '[{"id":"e1"}]' });
    dropLegacyPersonal(local, "a@x.vn");
    expect(local.getItem(`${OFFLINE_OUTBOX_KEY}_a@x.vn`)).toBe('[{"id":"e1"}]');
    expect(local.getItem(OFFLINE_OUTBOX_KEY)).toBeNull();
    // A later account finds nothing left to take
    dropLegacyPersonal(local, "b@x.vn");
    expect(local.getItem(`${OFFLINE_OUTBOX_KEY}_b@x.vn`)).toBeNull();
  });

  it("an account that has an outbox of its own keeps it, and the old key still goes", () => {
    const local = memory({ [OFFLINE_OUTBOX_KEY]: "old", [`${OFFLINE_OUTBOX_KEY}_a@x.vn`]: "own" });
    dropLegacyPersonal(local, "a@x.vn");
    expect(local.getItem(`${OFFLINE_OUTBOX_KEY}_a@x.vn`)).toBe("own");
    expect(local.getItem(OFFLINE_OUTBOX_KEY)).toBeNull();
  });

  it("does nothing without storage or without an old value", () => {
    expect(() => dropLegacyPersonal(null, "a@x.vn")).not.toThrow();
    const local = memory();
    dropLegacyPersonal(local, "a@x.vn");
    expect(local.data).toEqual({});
  });
});

describe("account data stays with its account (profile, reminders and training ticks)", () => {
  let local: KeyValueStore & { data: Record<string, string> };

  beforeEach(() => {
    demo.on = false;
    local = memory();
    vi.stubGlobal("localStorage", local);
    vi.stubGlobal("window", { localStorage: local, sessionStorage: memory() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("A's data never shows for B, and comes back for A after signing in again", async () => {
    await signUpWithPassword("a@example.com", "abcdef12");
    writeStoredProfile({
      ...SAMPLE_PROFILE,
      sex: "female",
      birthYear: 1995,
      weightKg: 58,
      goal: "cut",
      periodMode: true,
      displayName: "An",
    });
    saveSettings({ breakfastTime: "06:45", dinnerReminder: true });
    writeDay("2026-10-11", { minutes: 60, ticked: ["intra-carb"] });

    const aProfile = {
      sex: "female",
      birthYear: 1995,
      weightKg: 58,
      goal: "cut",
      periodMode: true,
      trainingMinutesDefault: 60,
      displayName: "An",
    };
    expect(loadProfile(2026)).toEqual(expect.objectContaining(aProfile));

    await signOut();
    await signUpWithPassword("b@example.com", "abcdef12");
    expect(readStoredProfile(2026)).toBeNull();
    expect(loadProfile(2026)).toEqual(SAMPLE_PROFILE);
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    expect(readDay("2026-10-11")).toBeNull();

    writeStoredProfile({ ...SAMPLE_PROFILE, weightKg: 80 });
    await signOut();
    expect(await signInWithPassword("a@example.com", "abcdef12")).toEqual({ ok: true });
    expect(loadProfile(2026)).toEqual(expect.objectContaining(aProfile));
    expect(loadSettings()).toEqual({ ...DEFAULT_SETTINGS, breakfastTime: "06:45", dinnerReminder: true });
    expect(readDay("2026-10-11")).toEqual({ minutes: 60, ticked: ["intra-carb"] });
  });

  it("X8: the old global values are deleted: no account, the first one included, gets them", async () => {
    local.setItem(PROFILE_KEY, JSON.stringify({ ...SAMPLE_PROFILE, displayName: "Cũ" }));
    await signUpWithPassword("a@example.com", "abcdef12");
    expect(loadProfile(2026)).toEqual(SAMPLE_PROFILE);
    expect(local.getItem(PROFILE_KEY)).toBeNull();

    await signOut();
    await signUpWithPassword("b@example.com", "abcdef12");
    expect(loadProfile(2026)).toEqual(SAMPLE_PROFILE);
  });
});
