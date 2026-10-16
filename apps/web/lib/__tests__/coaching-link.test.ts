import { describe, expect, it } from "vitest";
import {
  NO_COACHING,
  canManageClients,
  coachingAvailable,
  effectiveCoaching,
  canReview,
  dismissLevelNotice,
  dismissLevelZeroHint,
  isConsistent,
  leaveCoach,
  levelNotice,
  linkCoach,
  normaliseCode,
  normaliseCoaching,
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
  it("linking sets Level 1 and keeps the card to be shown", () => {
    const s = linkCoach(NO_COACHING, KHANH);
    expect(s).toMatchObject({ level: 1, coach: KHANH, levelSeen: 0 });
    expect(isConsistent(s)).toBe(true);
    expect(levelNotice(s)).toEqual({ kind: "linked", from: 0, to: 1 });
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
      (x) => dismissLevelNotice(x),
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
  it("raised and lowered name both Levels", () => {
    expect(levelNotice(linked(3, 2))).toEqual({ kind: "raised", from: 2, to: 3 });
    expect(levelNotice(linked(1, 2))).toEqual({ kind: "lowered", from: 2, to: 1 });
  });

  it("none at the Level already seen, and none at Level 0", () => {
    expect(levelNotice(linked(2, 2))).toBeNull();
    expect(levelNotice(NO_COACHING)).toBeNull();
  });

  it("dismissing marks the Level seen, once", () => {
    const s = dismissLevelNotice(linked(3, 2));
    expect(s.levelSeen).toBe(3);
    expect(levelNotice(s)).toBeNull();
  });

  it("the Level 0 hint shows once to a user with no coach", () => {
    expect(showLevelZeroHint(NO_COACHING)).toBe(true);
    expect(showLevelZeroHint(dismissLevelZeroHint(NO_COACHING))).toBe(false);
    expect(showLevelZeroHint(linked(2))).toBe(false);
    expect(showLevelZeroHint({ ...NO_COACHING, role: "coach" })).toBe(false);
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
    expect(normaliseCode("  h1t-khanh ")).toBe("H1T-KHANH");
    expect(normaliseCode("h1t - khanh")).toBe("H1T-KHANH");
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

  it("live mode: no coach and Level 0 whatever was stored, so the invariant holds", () => {
    const live = effectiveCoaching(coached, true);
    expect(live).toMatchObject({ level: 0, coach: null, levelSeen: 0 });
    expect(isConsistent(live)).toBe(true);
    expect(levelNotice(live)).toBeNull();
  });

  it("live mode keeps the role", () => {
    expect(effectiveCoaching({ ...coached, role: "admin" }, true).role).toBe("admin");
  });

  it("the guard does not touch the stored state", () => {
    effectiveCoaching(coached, true);
    expect(coached.level).toBe(3);
  });
});
