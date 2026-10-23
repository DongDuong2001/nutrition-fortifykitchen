import type { Level, LevelNotice } from "./coaching-link";
import { MAX_LEVEL } from "./coaching-link";
import { addedNames, countedForLevel, nutrientsForLevel } from "./level-nutrients";

/** The words of the Level flow (cc-28c), in one place so the screens and the probes read the same text. */

export const WRONG_CODE = "Mã không đúng. Kiểm tra lại với HLV của bạn.";
export const NO_COACH_TEXT = "Bạn chưa có huấn luyện viên";
export const ZERO_HINT_TEXT = "Có huấn luyện viên? Nhập mã để HLV theo dõi và mở thêm chỉ số";
export const ASK_COACH_TEXT = "Hỏi HLV để lên Level";

export function joinPrompt(coachName: string): string {
  return `Tham gia theo dõi với ${coachName}?`;
}

export function leaveConfirm(coachName: string): string {
  return `Rời ${coachName}? Level của bạn sẽ về 0 và Hôm nay hiện danh sách cơ bản.`;
}

export function levelSourceText(level: Level): string {
  return `Level ${level} · do HLV đặt`;
}

/** The calm one-time card for a lower Level (a higher one is the celebration). Without a coach object (live mode): "HLV". */
export function noticeText(coachName: string | null, notice: LevelNotice): string {
  return `${coachName ?? "HLV"} đã đổi Level của bạn thành ${notice.to}`;
}

/** One line per Level for the explainer: how many micros Hôm nay lists, and the extras from Level 3. */
export function levelSummaryLine(level: Level): string {
  const count = countedForLevel(level).length;
  const extras = nutrientsForLevel(level).extras.length > 0 ? " và chi tiết béo, xơ" : "";
  if (level === 0) return `${count} vi chất cơ bản · chưa có huấn luyện viên`;
  if (level === 1) return `${count} vi chất cơ bản`;
  return `${count} vi chất${extras}`;
}

/** Level 5's reward, in the explainer and as the celebration's gift. */
const GOLD_FRAME = "khung ảnh chia sẻ vàng";

/** The explainer's line for a Level: levelSummaryLine, and the gold share frame at Level 5. */
export function explainerSummaryLine(level: Level): string {
  return level === MAX_LEVEL ? `${levelSummaryLine(level)} · ${GOLD_FRAME}` : levelSummaryLine(level);
}

/** The explainer's "next" row, for the Level after `level`: what it adds (addedNames), or the gold frame when it adds none. */
export function explainerNextLine(level: Level): string {
  const next = (level + 1) as Level;
  if (level === 0) return `Tiếp theo: + ${levelSummaryLine(1)}`;
  const added = addedNames(level, next);
  return `Tiếp theo: + ${added.length > 0 ? added.join(", ") : GOLD_FRAME}`;
}

export type LevelStep = { from: Level; to: Level };

/** The celebration's line under "Lên Level n!": who raised it. 0 → 1 with a coach is the coach starting to follow. */
export function levelUpSubtitle(step: LevelStep, coachName: string | null): string {
  if (!coachName) return `Bạn vừa được nâng lên Level ${step.to}.`;
  return step.from === 0 ? `${coachName} đang theo dõi bạn.` : `${coachName} vừa nâng Level cho bạn.`;
}

/**
 * The celebration's reward: "Hôm nay theo dõi a → b vi chất, thêm:" and one chip per added nutrient (addedNames). Reaching
 * Level 5 the gift is the gold share frame; from Level 4 that is all it adds, so the line names the top Level instead.
 */
export function levelUpReward(step: LevelStep): { lead: string; countFrom: number; countTo: number; tail: string; chips: string[]; top: boolean } {
  const countFrom = countedForLevel(step.from).length;
  const countTo = countedForLevel(step.to).length;
  const nutrients = addedNames(step.from, step.to);
  const chips = step.to === MAX_LEVEL ? [...nutrients, "Khung ảnh chia sẻ vàng"] : nutrients;
  if (step.to === MAX_LEVEL && nutrients.length === 0)
    return { lead: `Level cao nhất · đủ ${countTo} vi chất · quà mới:`, countFrom, countTo, tail: "", chips, top: true };
  return { lead: "Hôm nay theo dõi", countFrom, countTo, tail: "vi chất, thêm:", chips, top: false };
}

/** What the polite live region says when the celebration opens. */
export function levelUpAnnouncement(step: LevelStep, coachName: string | null): string {
  const reward = levelUpReward(step);
  const head = `Lên Level ${step.to}. ${levelUpSubtitle(step, coachName)}`;
  if (reward.chips.length === 0) return head;
  const count = reward.top ? reward.lead : `${reward.lead} ${reward.countFrom} → ${reward.countTo} ${reward.tail}`;
  return `${head} ${count} ${reward.chips.join(", ")}.`;
}
