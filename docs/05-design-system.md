# 5. Design System

Nutrition Web starts from the Fortify Kitchen tokens as they stand in `apps/customer-web/src/app/globals.css`, so Release 1 ships fast; it adds nutrition status colours, data components and paid-tier components. Because it will be its own brand, colours, logo and fonts are set as tokens only, so the brand can change later without touching components.

## Colour

| Token | Hex | Use |
| --- | --- | --- |
| `--background` | #FAF7F2 | Page background (warm cream) |
| `--foreground` | #2E2A27 | Main text (charcoal) |
| `--primary` | #283828 | Deep forest green: primary buttons, energy ring, protein bar, active tab |
| `--primary-foreground` | #FAF7F2 | Text on primary |
| `--secondary` | #A67C52 | Warm brown: small labels, eyebrow text |
| `--accent` | #D97B42 | Warm orange: highlights, "Coach" badge |
| `--muted` | #EFECE6 | Bar tracks, chips, quiet backgrounds |
| `--muted-foreground` | #706B67 | Secondary text, units |
| `--card` | #FFFFFF | Cards and sheets |
| `--border` | #EFECE6 | Card and input borders |
| `--destructive` | #A94442 | Delete, errors |

**Nutrition status (new tokens to add):**

| Token | Proposed value | Meaning | Also shown by |
| --- | --- | --- | --- |
| `--status-low` | rose, e.g. #E0707A | Under 50% of target | % number in bold red |
| `--status-near` | amber, e.g. #E3A23B | 50–99% | % number |
| `--status-ok` | green, e.g. #3E9B6E | Target reached, within range | check icon |
| `--status-over` | amber, e.g. #D98A2B | Above the top of a range | "over" label |
| `--status-reference` | the same hues at 60% opacity | Reference targets (not the coach's) | "tham khảo" label |

Macro bar colours: protein = `--primary`, carbs = sky blue, fat = amber, fiber = green. Check every pair against WCAG AA before launch.

## Typography

| Role | Font | Size / weight |
| --- | --- | --- |
| Headings | Manrope (700, 800) | H1 32–40 px / 800, H2 24 px / 700, card title 14 px / 700 |
| Body | Be Vietnam Pro (400, 600) | 14 px body, 12 px small, 10–11 px captions |
| Numbers | System monospace | Amounts, units and % so columns line up |

Both fonts load with the Vietnamese subset. Numbers use the reader's language format (vi: 1.950; en: 1,950).

## Spacing, radius, shadow

- Spacing on an 8 px grid; card padding 20 px; gap between cards 24 px; page max width 1280 px.
- Radius: inputs and chips 12 px, cards 16–24 px, pills 999 px.
- Shadows: only `--shadow-card` on cards; no gradients.

## Components

| Component | Variants / states | Notes |
| --- | --- | --- |
| Button | primary, outline, ghost; default, hover, disabled, loading | Disabled until the action is valid (e.g. Add with no quantity) |
| Chip | filter, choice (goal, session length) | Selected = primary border + 5% primary fill |
| Meal card | empty, with entries | Header: meal + kcal; rows: name, grams, P/C/F, kcal, delete |
| Energy ring | under, in range, over | Shows eaten / target range and "còn X kcal" |
| Nutrient bar | low, near, ok, over, reference | Label, eaten / target unit, bar, % |
| Suggestion row | default | Food, brand, coach benefit, + amount per serving |
| Training card | rest, session chosen | Session chips; pre and during lists; quick-add buttons |
| Bottom sheet | Add food | Full height on phones, dialog on desktop; Esc closes |
| Badges | Fortify, Coach, estimate | Fortify = primary text; Coach = accent; estimate = muted |
| Toast | success, error | "Đã thêm 30 g chà là" after quick-add |

**Paid tier components (Release 2):**

| Component | States | Notes |
| --- | --- | --- |
| Locked card | locked, unlocked | Shows the feature's title, one line of what it does, a lock icon and "Nâng cấp" button; never a blurred fake result |
| Plan badge | Free, Paid | In the profile and header |
| Plan comparison | — | Two columns, free vs paid, the features as rows with check marks |
| Knowledge diff list (admin) | added, changed, removed, invalid | Old → new value per rule, invalid rows in `--destructive` with the reason |

## Icons

`@mynaui/icons-react`, accessed through the centralized adapter `components/ui/icons.tsx`. In use: chevron navigation, add, trash, search, edit, close, eye/eye-slash toggles, trophy, and star badges. Sizes 14, 16, 20 px; icons never carry meaning alone.

## Data display rules

- A bar's % is always against the target's minimum; the range shows as "min–max".
- Status is shown by colour AND number or label, never colour alone.
- Units always visible (g, mg, µg, kcal); sodium also in grams of salt.
- Reference values are visibly quieter than coach targets.
- Estimated food values carry an "ước tính" badge.

## Voice

Friendly, short, practical, Vietnamese first (Tasty · Affordable · Friendly). Coach advice is quoted in the coach's words and labelled "theo Coach". No guilt words ("bad", "cheat"): say "đang thiếu" (running low) and "vượt" (over).

## Update after scaffold review (10/10/2026)

The final tokens are on the [design canvas](https://claude.ai/artifact/VoPTTkL4uq818xzb4mYjdY). The scaffold's `globals.css` (#2563eb, #0a0a0a, system fonts) must switch to these:

| Token | Value |
| --- | --- |
| Header, nav, ink | #0A0A0B |
| Page | #F5F5F7 |
| Card | #FFFFFF, radius 18, 1px rgba(0,0,0,0.08) |
| Text / secondary | #1D1D1F / #5B6170 |
| Action blue | #1E55F0 |
| Sky (accent on black only) | #A9D1F7 |
| Destructive | #D93036 |
| Fonts | Be Vietnam Pro (all text); Saira italic 800, stretch 118%, for titles and numbers ≥20px |

**Nutrient bars:** 10 segments, `n = min(10, floor(pct/10))`.

| Level | % of target | Light | Dark |
| --- | --- | --- | --- |
| Thiếu | under 50 | #D93036 | #FF6B6B |
| Trung bình | 50–79 | #D99A00 | #F5C518 |
| Gần đủ | 80–99 | #16A34A | #4ADE80 |
| Đạt | 100 and over | #1E55F0 + "✓ Đạt" | #5C86F2 |

Going over 100% is fine and has no warning colour.

The scaffold's `SegmentedBar` (8 segments, manual colour) changes to this rule.

**Components:**

- CTAs are 52px pills.
- Chips are 44px pills.
- Every tap target is at least 44px.
- Pressing scales to 0.97 over 150 ms, and respects reduced motion.
- The focus ring is 3px #1E55F0.
- No "Coach" tags. Tips start with "Mẹo:".
