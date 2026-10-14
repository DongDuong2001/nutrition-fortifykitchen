# UI rules: one visual system (Cobalt Sign)

Source of truth for how screens look and feel. Written 12/10 (cc2-unify) with the ui-ux-pro-max UX rules
(§1 accessibility, §2 touch, §6 typography, §9 navigation) and `design/IA-v2.md` "Headers and UI unity".
Colours and fonts come from `globals.css` `@theme`; nothing here adds a hex value.

## 1. Scales

| | Value |
|---|---|
| Spacing | 4 · 8 · 12 · 16 · 20 · 24 · 32 px (Tailwind 1, 2, 3, 4, 5, 6, 8) |
| Radius, cards and panels | 18 px (`rounded-[18px]`, `Card`) |
| Radius, sheets and dialogs | 20 px top corners |
| Radius, header bottom edge (phone) | 20 px |
| Radius, buttons, chips, search | full pill |
| Radius, inputs and fields | 12 px (`rounded-xl`) |
| Icons | 22 px, stroke 1,8, `currentColor` |
| Tap target | at least 44 px; list rows at least 48 px |

No `rounded-2xl`, `rounded-[10px]`, `rounded-[14px]` or other one-off radii in screens.

## 2. Type

| Role | Style |
|---|---|
| Screen title (h1) | Saira Condensed italic 800, uppercase, 24 px phone / 32 px desktop, `leading-tight` |
| Big numbers | Saira Condensed italic 900, tabular numbers |
| Section title | Manrope bold 16 px, sentence case (`SectionTitle`) |
| Row text | Manrope 15 px |
| Meta, hints, units | Manrope 13 px, `text-secondary` (on ink: `text-muted-subtitle`) |

No all-caps labels outside the screen title. Section labels are sentence case ("Cơ thể", "Mục tiêu mỗi ngày").
One h1 per page.

## 3. Header (every screen)

`components/ui/app-header.tsx` is the only header. Phone (< 1024 px):

- `bg-ink`, bottom corners 20 px, top padding `max(12px, safe-area-inset-top)`, 16 px sides, bottom 16 px.
- One title row, min height 44 px: 44 px back chevron inline before the title on pushed screens (`aria-label="Quay lại"`),
  the title (Saira 24, on-dark), up to two 44 px icon actions on the right, same quiet style everywhere.
- Tổng quan shows the H1T MICRO wordmark in the title position (the h1 "Tổng quan" is sr-only).
- An optional second row sits INSIDE the same header, never a separate band: Tổng quan sub-tabs (`tabs`),
  Nhật ký date label and day summary (`summary`), Khám phá search (`search`), setup step bars (`progress`).
- Content below starts 16 px under the header, on paper.

Desktop (≥ 1024 px): no full-width ink band. The same header sits on paper: 32 px top padding, Saira 32 title,
back inline, actions right. Ink appears only inside cards (`summary`) with the card radius.
Onboarding and auth screens may keep their own layout but use the same title style.

## 4. Building blocks

| Need | Use |
|---|---|
| Surface | `Card` (white, 1 px `card-border`, 18 px, 16 px padding) |
| Section heading | `SectionTitle` |
| List row | `Row` (min 48 px, `divider` top border, chevron when it navigates) |
| Chips and filters | `Chip` / `ChipGroup` / `ChipRow` (one component, pill, 44 px) |
| Primary action | `PillButton variant="primary"` (cobalt pill, 52 px) |
| Secondary action | `PillButton variant="secondary"` (outline pill) |
| Destructive action | `PillButton variant="destructive"`, text in `destructive-text` |
| Icon action | quiet 44 px button, no fill, 22 px icon |
| Form line | `FormRow` |
| Stats in a row | `StatGroup` |
| Header | `AppHeader` |
| Page frame | `AppShell` |

If a primitive is missing, add it to `components/ui` first.

## 5. Behaviour

- Press feedback: scale 0.97 over 150 ms, none under `prefers-reduced-motion`.
- Loading is a skeleton, empty tells the next step, error says what failed and offers a retry.
- Past days are read-only. Unknown is "—", never 0. No red above a range, no over-limit warnings.
- Vietnamese copy; numbers `1.041` and `2,1`.
- Same action, same word everywhere (Thêm, Sửa, Xoá, Hoàn tác).

## 6. Visual character

What makes the screens feel like H1T MICRO, not a list of cards (set in cc2-20 with Tổng quan › Tóm tắt):

- **One dark hero card per screen.** `bg-surface-dark`, radius 18, 16 px padding, holding the one number the screen is
  about. Everything else sits on paper in white cards. Tổng quan › Tóm tắt also keeps its Vi chất card dark (decided
  with Hao's direction B, cc2-25): that is the second and last dark card on that screen.
- **Key numbers in Saira Condensed** (italic 900 for the hero number, bold 24–44 px for row values), tabular numbers,
  sky on dark and ink on white. The unit and the target sit beside it in 13 px Manrope, `text-secondary`.
- **Slanted segments** (skewX(−14deg), 12 px tall, 4 px gap) for progress: ten segments, n = min(10, floor(pct / 10)).
  Sky filled and `level-empty-dark` empty on dark.
- **Interactive detail on tap.** A row or card opens its detail in place (`aria-expanded`, one open at a time); a bar or
  square is a real button that names its day or nutrient. Detail is a number, not a paragraph.
- **Facts in rows, not sentences.** A fact is a title, one short line and a number. No blockquotes and no left-border
  quotes of prose.
- **Colour means a level.** Cobalt = met, destructive = under, secondary = in progress or unknown. Never red above a
  range.
- **Motion explains a change** (a chevron turning, a bar fading in); nothing moves under `prefers-reduced-motion`.
