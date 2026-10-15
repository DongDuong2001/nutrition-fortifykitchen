import type { Level, LevelNotice } from "./coaching-link";
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

/** The label above Hôm nay's nutrient column. */
export function levelLabel(level: Level, coachName: string): string {
  return `Level ${level} · ${coachName}`;
}

/** The one-time card for a change: linked, raised (with what it adds, worked out) or lowered. */
export function noticeText(coachName: string, notice: LevelNotice): string {
  if (notice.kind === "linked") return `Bạn đang được ${coachName} theo dõi · Level ${notice.to}`;
  if (notice.kind === "lowered") return `${coachName} đã đổi Level của bạn thành ${notice.to}`;
  const added = addedNames(notice.from, notice.to);
  return added.length > 0
    ? `${coachName} đã nâng bạn lên Level ${notice.to}: thêm ${added.join(", ")}`
    : `${coachName} đã nâng bạn lên Level ${notice.to}`;
}

/** One line per Level for the explainer: how many micros Hôm nay lists, and the extras from Level 3. */
export function levelSummaryLine(level: Level): string {
  const count = countedForLevel(level).length;
  const extras = nutrientsForLevel(level).extras.length > 0 ? " và chi tiết béo, xơ" : "";
  if (level === 0) return `${count} vi chất cơ bản · chưa có huấn luyện viên`;
  if (level === 1) return `${count} vi chất cơ bản`;
  return `${count} vi chất${extras}`;
}
