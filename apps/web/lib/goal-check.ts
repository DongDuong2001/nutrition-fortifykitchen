import {
  FIRST_FOOD,
  firstFoodDue,
  goalsMet,
  momentFor,
  reachedGoals,
  seenToday,
  withGoals,
  type GoalDay,
  type GoalRecord,
  type Moment,
} from "./goals";

/**
 * feat/sound-goals §3: what one look at today's numbers does, pure, so lib/diary-store's effect only applies it. A change counts as
 * a local add only when it follows an add into TODAY (an add into yesterday changes nothing today, so a later refetch must not
 * pass for it), within a short window as a backstop. The first food ever and the goals the add reached become one moment.
 */

/** How long after an add the change it makes still counts as local. */
export const LOCAL_ADD_WINDOW_MS = 3000;

/** An add made here: what the account had before it (for the first food) and when. */
export interface AddMark {
  hadEntries: boolean;
  hadRecents: boolean;
  at: number;
}

/** The mark of an add into `day`, or null when `day` is not today. */
export function addMark(day: string, today: string, before: { hadEntries: boolean; hadRecents: boolean }, now: number): AddMark | null {
  return day === today ? { ...before, at: now } : null;
}

export interface GoalCheck {
  /** Goals this look reached (a local add, today, the first time today) */
  reached: string[];
  /** The record with every goal met today */
  record: GoalRecord;
  /** The first food ever came with this add: remember it */
  firstFoodUsed: boolean;
  /** Every goal of the moment, the first food first */
  keys: string[];
  moment: Moment | null;
  /** What waits for Hôm nay: all of `keys`, or from a Ngày tập add only what can only play there (Đủ chất, the first food) */
  queue: string[];
}

export function checkGoals({
  before,
  after,
  mark,
  now,
  today,
  record,
  source,
  firstFood,
}: {
  before: GoalDay | null;
  after: GoalDay;
  mark: AddMark | null;
  now: number;
  today: string;
  record: GoalRecord | null;
  source: "training" | null;
  firstFood: { seen: boolean; recentsAnswered: boolean; demo: boolean };
}): GoalCheck {
  const local = mark !== null && now - mark.at < LOCAL_ADD_WINDOW_MS;
  const reached = reachedGoals(before, after, { localAdd: local, isToday: true, seen: seenToday(record, today) });
  const nextRecord = withGoals(record, today, goalsMet(after));
  const firstFoodUsed = local && firstFood.recentsAnswered && firstFoodDue({ seen: firstFood.seen, hadEntries: mark.hadEntries, hadRecents: mark.hadRecents, demo: firstFood.demo });
  const keys = firstFoodUsed ? [FIRST_FOOD, ...reached] : reached;
  const moment = momentFor(keys);
  // Ngày tập records its nutrient goals and replays none of them on Hôm nay; Đủ chất and the first food can only play here
  const queue = source === "training" ? keys.filter((key) => key === "column" || key === FIRST_FOOD) : keys;
  return { reached, record: nextRecord, firstFoodUsed, keys, moment, queue };
}
