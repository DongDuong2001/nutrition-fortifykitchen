import { getEmptySegmentColor, homeBarColor, type HomeBarTone } from "../../lib/levels";
import type { ShareCardModel } from "../../lib/share-card";

/** Story format. Drawn at pixelRatio 1: the file is exactly this size. */
export const SHARE_WIDTH = 1080;
export const SHARE_HEIGHT = 1920;

// The card sits in a 1080×1420 safe area (y 250 to 1670), centred vertically: 250 px stay clear above and below for the
// story app's own UI.
const SAFE_TOP = 250;
const MARGIN = 72;
const INNER = 48;
const RIGHT = SHARE_WIDTH - MARGIN;
const SKEW = Math.tan((-14 * Math.PI) / 180);

const FOOTER = "H1T MICRO · Theo dõi vi chất mỗi ngày";
const HERO_LABEL = "Năng lượng cả ngày";
const LACKING_LABEL = "Thiếu nhiều nhất";
const STATIC_TEXT = `H1T MICRO${FOOTER}${HERO_LABEL}${LACKING_LABEL}/–%·`;

/** What the card is drawn with: a colour resolver and the two font families (CSS values). */
export interface ShareTheme {
  /** A colour token as `var(--color-x)` (or a plain colour) to a colour the canvas understands. */
  color: (value: string) => string;
  display: string;
  sans: string;
}

const COLOR = {
  paper: "var(--color-paper)",
  card: "var(--color-card)",
  border: "var(--color-card-border)",
  ink: "var(--color-ink)",
  text: "var(--color-text)",
  secondary: "var(--color-secondary)",
  cobalt: "var(--color-cobalt)",
  sky: "var(--color-sky)",
  onDark: "var(--color-on-dark)",
  mutedOnDark: "var(--color-muted-on-dark)",
  surfaceDark: "var(--color-surface-dark)",
};

type Ctx = CanvasRenderingContext2D;

function roundedRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draws text and returns its width, so the next piece can sit beside it. */
function text(ctx: Ctx, value: string, x: number, y: number, font: string, fill: string, align: CanvasTextAlign = "left"): number {
  ctx.font = font;
  ctx.fillStyle = fill;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(value, x, y);
  return ctx.measureText(value).width;
}

/** The largest size, down to `min`, at which the text fits `maxWidth`: a name wraps in size, never in ellipsis. */
function fitSize(ctx: Ctx, value: string, fontFor: (size: number) => string, size: number, min: number, maxWidth: number): number {
  let s = size;
  ctx.font = fontFor(s);
  while (s > min && ctx.measureText(value).width > maxWidth) {
    s -= 2;
    ctx.font = fontFor(s);
  }
  return s;
}

/** The slanted 10-segment bar of Hôm nay, with its fill from lib/levels (two-tone or four levels). */
function drawBar(ctx: Ctx, theme: ShareTheme, x: number, y: number, w: number, h: number, segments: number, tone: HomeBarTone, surface: "light" | "dark") {
  const gap = 8;
  const segW = (w - gap * 9) / 10;
  const fill = theme.color(homeBarColor(tone, surface));
  const empty = theme.color(getEmptySegmentColor(surface));
  for (let i = 0; i < 10; i++) {
    ctx.save();
    ctx.translate(x + i * (segW + gap) + segW / 2, y + h / 2);
    ctx.transform(1, 0, SKEW, 1, 0, 0);
    ctx.fillStyle = i < segments ? fill : empty;
    ctx.fillRect(-segW / 2, -h / 2, segW, h);
    ctx.restore();
  }
}

/**
 * Draws the day-summary card, top to bottom: wordmark and date, the kcal hero, the four bars, the micros.
 * Pure drawing from the view model: no clock, no storage, no network.
 */
export function drawShareCard(ctx: Ctx, model: ShareCardModel, theme: ShareTheme): void {
  const c = (value: string) => theme.color(value);
  const display = (weight: number, size: number, italic = false) => `${italic ? "italic " : ""}${weight} ${size}px ${theme.display}`;
  const sans = (weight: number, size: number) => `${weight} ${size}px ${theme.sans}`;

  ctx.fillStyle = c(COLOR.paper);
  ctx.fillRect(0, 0, SHARE_WIDTH, SHARE_HEIGHT);

  // Wordmark and date
  let y = SAFE_TOP + 66;
  const wordW = text(ctx, "H1T ", MARGIN, y, display(900, 72, true), c(COLOR.ink));
  text(ctx, "MICRO", MARGIN + wordW, y, display(900, 72, true), c(COLOR.cobalt));
  text(ctx, model.dateLabel, RIGHT, y, sans(700, 40), c(COLOR.secondary), "right");

  // Kcal hero (ink card)
  const heroTop = SAFE_TOP + 120;
  const heroH = 370;
  ctx.fillStyle = c(COLOR.surfaceDark);
  roundedRect(ctx, MARGIN, heroTop, SHARE_WIDTH - MARGIN * 2, heroH, 40);
  ctx.fill();
  const inL = MARGIN + INNER;
  const inR = RIGHT - INNER;
  text(ctx, HERO_LABEL, inL, heroTop + 62, sans(700, 30), c(COLOR.sky));
  const levelW = text(ctx, model.kcal.level, inR, heroTop + 66, sans(700, 34), c(COLOR.onDark), "right");
  text(ctx, model.kcal.pctText, inR - levelW - 20, heroTop + 70, display(900, 64), c(COLOR.onDark), "right");
  y = heroTop + 250;
  const kcalW = text(ctx, model.kcal.value, inL, y, display(900, 190), c(COLOR.onDark));
  text(ctx, `/ ${model.kcal.target}`, inL + kcalW + 24, y, sans(600, 38), c(COLOR.mutedOnDark));
  drawBar(ctx, theme, inL, heroTop + heroH - 40 - 32, inR - inL, 32, model.kcal.segments, model.kcal.tone, "dark");

  // The four bars (white card)
  const barsTop = heroTop + heroH + 30;
  const barsH = 476;
  ctx.fillStyle = c(COLOR.card);
  roundedRect(ctx, MARGIN, barsTop, SHARE_WIDTH - MARGIN * 2, barsH, 40);
  ctx.fill();
  ctx.strokeStyle = c(COLOR.border);
  ctx.lineWidth = 2;
  ctx.stroke();
  model.bars.forEach((bar, i) => {
    const top = barsTop + 34 + i * 108;
    const nameW = text(ctx, bar.label, inL, top + 40, sans(700, 40), c(COLOR.text));
    text(ctx, bar.amount, inL + nameW + 20, top + 40, sans(600, 34), c(COLOR.secondary));
    const wordW2 = text(ctx, bar.level, inR, top + 40, sans(700, 32), c(COLOR.secondary), "right");
    text(ctx, bar.pctText, inR - wordW2 - 20, top + 44, display(800, 56), c(COLOR.text), "right");
    drawBar(ctx, theme, inL, top + 62, inR - inL, 24, bar.segments, bar.tone, "light");
  });

  // Micros (white card)
  const microsTop = barsTop + barsH + 30;
  const microsH = 310;
  ctx.fillStyle = c(COLOR.card);
  roundedRect(ctx, MARGIN, microsTop, SHARE_WIDTH - MARGIN * 2, microsH, 40);
  ctx.fill();
  ctx.strokeStyle = c(COLOR.border);
  ctx.stroke();
  text(ctx, model.micros.text, inL, microsTop + 98, display(900, 64), c(COLOR.ink));
  text(ctx, LACKING_LABEL, inL, microsTop + 150, sans(700, 26), c(COLOR.secondary));
  const colGap = 24;
  const colW = (inR - inL - colGap * 2) / 3;
  model.lacking.forEach((item, i) => {
    const x = inL + i * (colW + colGap);
    const size = fitSize(ctx, item.name, (s) => sans(700, s), 36, 22, colW);
    text(ctx, item.name, x, microsTop + 204, sans(700, size), c(COLOR.text));
    text(ctx, item.pctText, x, microsTop + 262, display(900, 64), c(COLOR.ink));
  });

  text(ctx, FOOTER, SHARE_WIDTH / 2, microsTop + microsH + 56, sans(600, 28), c(COLOR.secondary), "center");
}

function cssVar(name: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!value) throw new Error(`Thiếu biến CSS ${name}`);
  return value;
}

/** The light Cobalt Sign tokens and the two loaded font families, read from the page (the app has no dark theme). */
export function readShareTheme(): ShareTheme {
  const color = (value: string) => {
    const match = /^var\((--[\w-]+)\)$/.exec(value);
    return match ? cssVar(match[1]) : value;
  };
  return { color, display: cssVar("--font-saira-condensed-face"), sans: cssVar("--font-manrope-face") };
}

/** Every string the card draws, so the fonts can be loaded for exactly those characters (Vietnamese subset). */
function cardText(model: ShareCardModel): string {
  return [
    STATIC_TEXT,
    model.dateLabel,
    model.kcal.value,
    model.kcal.target,
    model.kcal.pctText,
    model.kcal.level,
    ...model.bars.flatMap((b) => [b.label, b.amount, b.pctText, b.level]),
    model.micros.text,
    ...model.lacking.flatMap((l) => [l.name, l.pctText]),
  ].join("");
}

/** Draws the card on an offscreen 1080×1920 canvas, after the fonts are in, and returns the PNG as a file. */
export async function renderShareCard(model: ShareCardModel): Promise<File> {
  const theme = readShareTheme();
  const sample = cardText(model);
  await Promise.all([
    document.fonts.load(`900 100px ${theme.display}`, sample),
    document.fonts.load(`800 100px ${theme.display}`, sample),
    document.fonts.load(`600 40px ${theme.sans}`, sample),
    document.fonts.load(`700 40px ${theme.sans}`, sample),
  ]);
  await document.fonts.ready;

  const canvas = document.createElement("canvas");
  canvas.width = SHARE_WIDTH;
  canvas.height = SHARE_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Không vẽ được ảnh");
  drawShareCard(ctx, model, theme);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Không tạo được ảnh");
  return new File([blob], model.filename, { type: "image/png" });
}
