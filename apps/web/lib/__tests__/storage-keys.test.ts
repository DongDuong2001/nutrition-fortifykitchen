import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ADDED_ENTRIES_KEY,
  PROFILE_KEY,
  RECENT_FOODS_KEY,
  SAMPLE_EDITS_KEY,
  SETTINGS_STORAGE_KEY,
  TRAINING_CHECKLIST_KEY,
  adoptLegacyKeys,
  adoptLegacyPersonal,
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

describe("adoptLegacyKeys (the old unscoped keys move to the first account, once)", () => {
  const legacy = () => ({
    [ADDED_ENTRIES_KEY]: '[{"id":"old"}]',
    [SAMPLE_EDITS_KEY]: '{"s":1}',
    [RECENT_FOODS_KEY]: '[{"foodId":"f","servingLabel":"1 g"}]',
    [FAVOURITES_KEY]: '["f"]',
    [SAVED_MEALS_KEY]: '[{"id":"m"}]',
  });

  it("moves every old key to the account and deletes the old keys", () => {
    const local = memory(legacy());
    adoptLegacyKeys(local, null, "a@x.vn");
    expect(local.data).toEqual({
      [`${ADDED_ENTRIES_KEY}_a@x.vn`]: '[{"id":"old"}]',
      [`${SAMPLE_EDITS_KEY}_a@x.vn`]: '{"s":1}',
      [`${RECENT_FOODS_KEY}_a@x.vn`]: '[{"foodId":"f","servingLabel":"1 g"}]',
      [`${FAVOURITES_KEY}_a@x.vn`]: '["f"]',
      [`${SAVED_MEALS_KEY}_a@x.vn`]: '[{"id":"m"}]',
    });
  });

  it("a second account gets nothing: the old keys moved once", () => {
    const local = memory(legacy());
    adoptLegacyKeys(local, null, "a@x.vn");
    adoptLegacyKeys(local, null, "b@x.vn");
    expect(keyedStorage(local, false, "b@x.vn").getItem(ADDED_ENTRIES_KEY)).toBeNull();
    expect(keyedStorage(local, false, "a@x.vn").getItem(ADDED_ENTRIES_KEY)).toBe('[{"id":"old"}]');
  });

  it("an account that already has data keeps it and the old keys stay untouched", () => {
    const local = memory({ ...legacy(), [`${ADDED_ENTRIES_KEY}_a@x.vn`]: '[{"id":"mine"}]' });
    adoptLegacyKeys(local, null, "a@x.vn");
    expect(local.data[`${ADDED_ENTRIES_KEY}_a@x.vn`]).toBe('[{"id":"mine"}]');
    expect(local.data[ADDED_ENTRIES_KEY]).toBe('[{"id":"old"}]');
  });

  it("empty scoped values count as no data", () => {
    const local = memory({ ...legacy(), [`${ADDED_ENTRIES_KEY}_a@x.vn`]: "[]", [`${SAMPLE_EDITS_KEY}_a@x.vn`]: "{}" });
    adoptLegacyKeys(local, null, "a@x.vn");
    expect(local.data[`${ADDED_ENTRIES_KEY}_a@x.vn`]).toBe('[{"id":"old"}]');
    expect(local.data[ADDED_ENTRIES_KEY]).toBeUndefined();
  });

  it("an old sessionStorage copy goes to the account too", () => {
    const local = memory();
    const session = memory({ [ADDED_ENTRIES_KEY]: '[{"id":"s"}]' });
    adoptLegacyKeys(local, session, "a@x.vn");
    expect(local.data).toEqual({ [`${ADDED_ENTRIES_KEY}_a@x.vn`]: '[{"id":"s"}]' });
    expect(session.data).toEqual({});
  });

  it("leaves demo keys alone", () => {
    const local = memory({ ...legacy(), [`${ADDED_ENTRIES_KEY}_demo`]: '[{"id":"d"}]' });
    adoptLegacyKeys(local, null, "a@x.vn");
    expect(local.data[`${ADDED_ENTRIES_KEY}_demo`]).toBe('[{"id":"d"}]');
  });

  it("does nothing with no storage", () => {
    expect(() => adoptLegacyKeys(null, null, "a@x.vn")).not.toThrow();
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

describe("adoptLegacyPersonal (the old profile, settings and training ticks move to the first account, once)", () => {
  it("moves each old global value to the first account and removes the old key", () => {
    const local = memory({ [PROFILE_KEY]: '{"sex":"male"}', [SETTINGS_STORAGE_KEY]: '{"language":"en"}' });
    adoptLegacyPersonal(local, "a@x.vn");
    expect(local.getItem(`${PROFILE_KEY}_a@x.vn`)).toBe('{"sex":"male"}');
    expect(local.getItem(`${SETTINGS_STORAGE_KEY}_a@x.vn`)).toBe('{"language":"en"}');
    expect(local.getItem(PROFILE_KEY)).toBeNull();
    expect(local.getItem(SETTINGS_STORAGE_KEY)).toBeNull();
  });

  it("a later account finds nothing left to take", () => {
    const local = memory({ [TRAINING_CHECKLIST_KEY]: '{"2026-10-11":{"minutes":60,"ticked":[]}}' });
    adoptLegacyPersonal(local, "a@x.vn");
    adoptLegacyPersonal(local, "b@x.vn");
    expect(local.getItem(`${TRAINING_CHECKLIST_KEY}_b@x.vn`)).toBeNull();
    expect(local.getItem(`${TRAINING_CHECKLIST_KEY}_a@x.vn`)).toBe('{"2026-10-11":{"minutes":60,"ticked":[]}}');
  });

  it("keeps an account's own value, and the old key still goes", () => {
    const local = memory({ [PROFILE_KEY]: "old", [`${PROFILE_KEY}_a@x.vn`]: "own" });
    adoptLegacyPersonal(local, "a@x.vn");
    expect(local.getItem(`${PROFILE_KEY}_a@x.vn`)).toBe("own");
    expect(local.getItem(PROFILE_KEY)).toBeNull();
  });

  it("does nothing without storage or without an old value", () => {
    expect(() => adoptLegacyPersonal(null, "a@x.vn")).not.toThrow();
    const local = memory();
    adoptLegacyPersonal(local, "a@x.vn");
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

  it("the old global values are kept for the first account only", async () => {
    local.setItem(PROFILE_KEY, JSON.stringify({ ...SAMPLE_PROFILE, displayName: "Cũ" }));
    await signUpWithPassword("a@example.com", "abcdef12");
    expect(loadProfile(2026).displayName).toBe("Cũ");
    expect(local.getItem(PROFILE_KEY)).toBeNull();

    await signOut();
    await signUpWithPassword("b@example.com", "abcdef12");
    expect(loadProfile(2026)).toEqual(SAMPLE_PROFILE);
  });
});
