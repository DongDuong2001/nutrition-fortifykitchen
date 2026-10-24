import { describe, expect, it } from "vitest";
import {
  safeDecode,
  NO_COACHING,
  canManageClients,
  coachingAvailable,
  effectiveCoaching,
  canReview,
  dismissLevelZeroHint,
  isConsistent,
  leaveCoach,
  levelNotice,
  levelUp,
  linkCoach,
  normaliseCode,
  normaliseCoaching,
  seenPatch,
  serverLevelOf,
  setClientLevel,
  showLevelZeroHint,
  toLevel,
  LEVELS,
  type CoachingState,
} from "../coaching-link";

const KHANH = { id: "coach-khanh", name: "HLV Khánh" };
const linked = (level: number, seen = level): CoachingState => ({ ...NO_COACHING, coach: KHANH, level: toLevel(level), levelSeen: toLevel(seen) });

describe("defaults and reading", () => {
  it("a user with no coach is Level 0", () => {
    expect(NO_COACHING).toEqual({ role: "user", level: 0, coach: null, levelSeen: 0, hintSeen: false });
    expect(isConsistent(NO_COACHING)).toBe(true);
  });

  it("an old profile with none of the fields loads as user, Level 0, no coach", () => {
    expect(normaliseCoaching({ sex: "male", weightKg: 65 })).toEqual(NO_COACHING);
    expect(normaliseCoaching(null)).toEqual(NO_COACHING);
    expect(normaliseCoaching("x")).toEqual(NO_COACHING);
  });

  it("keeps a consistent stored state", () => {
    const stored = { role: "coach", level: 3, coach: KHANH, levelSeen: 2, hintSeen: true };
    expect(normaliseCoaching(stored)).toEqual(stored);
  });

  it("repairs the invariant: a Level without a coach is 0, a coach with Level 0 starts at 1", () => {
    expect(normaliseCoaching({ level: 4, coach: null })).toMatchObject({ level: 0, coach: null, levelSeen: 0 });
    expect(normaliseCoaching({ level: 0, coach: KHANH })).toMatchObject({ level: 1, coach: KHANH });
    expect(isConsistent(normaliseCoaching({ level: 5 }))).toBe(true);
  });

  it("rejects an unknown role and a bad level", () => {
    expect(normaliseCoaching({ role: "owner" }).role).toBe("user");
    expect(normaliseCoaching({ level: 9, coach: KHANH }).level).toBe(1);
    expect(normaliseCoaching({ level: 2.5, coach: KHANH }).level).toBe(1);
    expect(toLevel("3")).toBe(0);
  });

  it("drops a coach that has no id or name", () => {
    expect(normaliseCoaching({ level: 2, coach: { id: "", name: "x" } })).toMatchObject({ coach: null, level: 0 });
    expect(normaliseCoaching({ level: 2, coach: { id: "a" } })).toMatchObject({ coach: null, level: 0 });
  });
});

describe("link, leave and set", () => {
  it("linking sets Level 1 and keeps the celebration (0 → 1) to be played", () => {
    const s = linkCoach(NO_COACHING, KHANH);
    expect(s).toMatchObject({ level: 1, coach: KHANH, levelSeen: 0 });
    expect(isConsistent(s)).toBe(true);
    expect(levelUp(s)).toEqual({ from: 0, to: 1 });
  });

  it("leaving sets Level 0 and no coach, and shows no card", () => {
    const s = leaveCoach(linked(3, 2));
    expect(s).toMatchObject({ level: 0, coach: null, levelSeen: 0 });
    expect(levelNotice(s)).toBeNull();
    expect(isConsistent(s)).toBe(true);
  });

  it("the coach sets 1 to 5 and nothing else", () => {
    expect(setClientLevel(linked(1), 4).level).toBe(4);
    expect(setClientLevel(linked(3), 9).level).toBe(5);
    expect(setClientLevel(linked(3), 0).level).toBe(1);
    expect(setClientLevel(NO_COACHING, 3)).toBe(NO_COACHING);
  });

  it("level 0 if and only if no coach holds through every operation", () => {
    let s: CoachingState = NO_COACHING;
    const steps: ((x: CoachingState) => CoachingState)[] = [
      (x) => linkCoach(x, KHANH),
      (x) => setClientLevel(x, 4),
      (x) => ({ ...x, ...seenPatch(x, false) }),
      (x) => setClientLevel(x, 2),
      (x) => leaveCoach(x),
      (x) => setClientLevel(x, 3),
      (x) => linkCoach(x, KHANH),
    ];
    for (const step of steps) {
      s = step(s);
      expect(isConsistent(s)).toBe(true);
    }
    for (const lvl of LEVELS) expect(isConsistent(normaliseCoaching({ level: lvl, coach: lvl === 0 ? null : KHANH }))).toBe(true);
  });
});

describe("one-time cards", () => {
  it("a lower Level is the calm card, naming both Levels", () => {
    expect(levelNotice(linked(1, 2))).toEqual({ kind: "lowered", from: 2, to: 1 });
  });

  it("a higher Level is no card: it is the celebration (levelUp)", () => {
    expect(levelNotice(linked(3, 2))).toBeNull();
    expect(levelNotice(linked(1, 0))).toBeNull();
  });

  it("none at the Level already seen, and none at Level 0 with nothing seen", () => {
    expect(levelNotice(linked(2, 2))).toBeNull();
    expect(levelNotice(NO_COACHING)).toBeNull();
  });

  it("needs no coach: a Level the API lowered (live mode) is a card too", () => {
    expect(levelNotice({ ...NO_COACHING, level: 1, levelSeen: 3 })).toEqual({ kind: "lowered", from: 3, to: 1 });
  });

  it("dismissing marks the Level seen, once", () => {
    const s = { ...linked(1, 2), ...seenPatch(linked(1, 2), false) };
    expect(s.levelSeen).toBe(1);
    expect(levelNotice(s)).toBeNull();
  });

  it("the Level 0 hint shows once to a user with no coach", () => {
    expect(showLevelZeroHint(NO_COACHING)).toBe(true);
    expect(showLevelZeroHint(dismissLevelZeroHint(NO_COACHING))).toBe(false);
    expect(showLevelZeroHint(linked(2))).toBe(false);
    expect(showLevelZeroHint({ ...NO_COACHING, role: "coach" })).toBe(false);
  });
});

describe("levelUp: the celebration's trigger", () => {
  it("plays when the Level is above the one seen, from any Level", () => {
    expect(levelUp(linked(3, 2))).toEqual({ from: 2, to: 3 });
    expect(levelUp(linked(5, 4))).toEqual({ from: 4, to: 5 });
  });

  it("0 → 1 is a promotion too (joining a coach in mock mode)", () => {
    expect(levelUp(linked(1, 0))).toEqual({ from: 0, to: 1 });
  });

  it("needs no coach object (live mode reads the Level from the profile)", () => {
    expect(levelUp({ ...NO_COACHING, level: 2, levelSeen: 0 })).toEqual({ from: 0, to: 2 });
  });

  it("never at the Level seen or below it", () => {
    expect(levelUp(linked(2, 2))).toBeNull();
    expect(levelUp(linked(1, 3))).toBeNull();
    expect(levelUp(NO_COACHING)).toBeNull();
  });

  it("once: after it is seen it does not play again", () => {
    expect(levelUp({ ...linked(3, 1), ...seenPatch(linked(3, 1), false) })).toBeNull();
  });
});

describe("roles and codes", () => {
  it("coach and admin manage clients, only admin reviews", () => {
    expect(canManageClients("user")).toBe(false);
    expect(canManageClients("coach")).toBe(true);
    expect(canManageClients("admin")).toBe(true);
    expect(canReview("coach")).toBe(false);
    expect(canReview("admin")).toBe(true);
  });

  it("codes are compared trimmed and in capitals", () => {
    expect(normaliseCode("  ab3d-5fgh ")).toBe("AB3D-5FGH");
    expect(normaliseCode("ab3d - 5fgh")).toBe("AB3D-5FGH");
  });
});

describe("live-mode guard", () => {
  const coached: CoachingState = { role: "user", level: 3, coach: KHANH, levelSeen: 2, hintSeen: false };

  it("coaching exists in mock and demo mode only", () => {
    expect(coachingAvailable(false)).toBe(true);
    expect(coachingAvailable(true)).toBe(false);
  });

  it("mock mode: the state is read as it is", () => {
    expect(effectiveCoaching(coached, false)).toBe(coached);
  });

  it("live mode without the API's Level: no coach and Level 0 whatever was stored, as before", () => {
    const live = effectiveCoaching(coached, true);
    expect(live).toMatchObject({ level: 0, coach: null, levelSeen: 0 });
    expect(isConsistent(live)).toBe(true);
    expect(levelNotice(live)).toBeNull();
  });

  it("live mode forces the role to user until the API returns it, whatever the stored profile says", () => {
    for (const role of ["coach", "admin"] as const) expect(effectiveCoaching({ ...coached, role }, true).role).toBe("user");
    expect(effectiveCoaching({ ...coached, role: "admin" }, false).role).toBe("admin");
  });

  it("live mode with the API's Level: that Level and levelSeen, still no coach", () => {
    const live = effectiveCoaching(coached, true, { level: 4, levelSeen: 2 });
    expect(live).toMatchObject({ role: "user", level: 4, levelSeen: 2, coach: null });
    expect(levelUp(live)).toEqual({ from: 2, to: 4 });
  });

  it("mock mode ignores a Level from the API: the mock coach decides", () => {
    expect(effectiveCoaching(coached, false, { level: 5, levelSeen: 5 })).toBe(coached);
  });

  it("the guard does not touch the stored state", () => {
    effectiveCoaching(coached, true);
    expect(coached.level).toBe(3);
  });
});

describe("serverLevelOf: the Level fields of GET /me", () => {
  it("reads level and levelSeen", () => {
    expect(serverLevelOf({ level: 3, levelSeen: 1 })).toEqual({ level: 3, levelSeen: 1 });
  });

  it("none when the API does not send level (an API before the Level columns)", () => {
    expect(serverLevelOf({})).toBeUndefined();
    expect(serverLevelOf({ levelSeen: 2 })).toBeUndefined();
    expect(serverLevelOf(null)).toBeUndefined();
    expect(serverLevelOf(undefined)).toBeUndefined();
  });

  it("a missing or bad levelSeen is 0; a bad level is 0", () => {
    expect(serverLevelOf({ level: 2 })).toEqual({ level: 2, levelSeen: 0 });
    expect(serverLevelOf({ level: 2, levelSeen: 9 })).toEqual({ level: 2, levelSeen: 0 });
    expect(serverLevelOf({ level: 7, levelSeen: 1 })).toEqual({ level: 0, levelSeen: 1 });
  });
});

describe("seenPatch: where levelSeen is written", () => {
  it("mock mode: on the stored profile", () => {
    expect(seenPatch(linked(3, 2), false, undefined)).toEqual({ levelSeen: 3 });
  });

  it("live mode with the API's Level: on the profile's server Level (sent with the next profile save)", () => {
    expect(seenPatch({ ...NO_COACHING, level: 4, levelSeen: 2 }, true, { level: 4, levelSeen: 2 })).toEqual({ serverLevel: { level: 4, levelSeen: 4 } });
  });

  it("live mode without it: nothing to write (Level 0, nothing shown)", () => {
    expect(seenPatch(NO_COACHING, true, undefined)).toBeNull();
  });
});

describe("safeDecode", () => {
  it("decodes a route parameter, and gives an empty string for a bad one", () => {
    expect(safeDecode("H1T%20AB")).toBe("H1T AB");
    expect(safeDecode("abc")).toBe("abc");
    expect(safeDecode("%E0%A4%A")).toBe("");
    expect(safeDecode("100%")).toBe("");
  });
});
