# DESIGN.md: the H1T MICRO design floor

Version 1 · 21/10/2026 · owner Hao · built from Apple's Human Interface Guidelines (HIG, as of October 2026) and the WWDC25/26 design talks.

## What this file is

- **A floor, not a look.** `design/` and `design/SPEC.md` still decide how H1T MICRO looks. This file sets the minimums for usability, accessibility, motion and copy that every screen must meet. A screen that breaks a rule here is a bug, even when it matches the design file. If a design file breaks a rule, add a line to OPEN_QUESTIONS and follow this file.
- **Rule IDs.** Every rule has an ID (`D-TYPE-03`). Reviews cite the ID, and commits that fix one name it.
- **Check column.** `auto` means the `design-floor` probe or a unit test checks it, so it fails CI. `review` means a person checks it in review against the screenshots.
- **Web translation.** Apple writes in points (pt). On the web, 1 pt = 1 CSS px. Dynamic Type becomes rem sizes plus the browser or OS text size. Apple's settings map to media queries: Reduce Motion to `prefers-reduced-motion`, Reduce Transparency to `prefers-reduced-transparency`, Increase Contrast to `prefers-contrast: more`, and Dark Mode to `prefers-color-scheme`.
- **Status.** ✅ met today · ⚠️ partly met · ❌ not met (see "Gaps" at the end).

## 1 · Principles (Apple's 8, as they apply here)

| ID | Rule | Check |
|---|---|---|
| D-PRIN-01 | **Purpose.** Every screen and control earns its place. If it does not help someone log food or understand nutrients, cut it. | review |
| D-PRIN-02 | **Agency.** People can leave any flow, skip any tour and undo any add or delete. No mode traps. | review |
| D-PRIN-03 | **Responsibility.** Ask for data only when it is needed, and say why. Never invent nutrition values (AGENTS.md). Show the source of every number. | review |
| D-PRIN-04 | **Familiarity.** Anything that looks the same behaves the same everywhere. Never repurpose a familiar symbol (trash means delete, heart means favourite). | review |
| D-PRIN-05 | **Flexibility.** Works by touch, keyboard and screen reader, at any text size, from 320 px to 1440 px wide. | auto + review |
| D-PRIN-06 | **Simplicity is not minimalism.** Fewest steps and fewest words, but never hide what people need behind extra taps. | review |
| D-PRIN-07 | **Craft.** Every control responds at touch-down. Scrolling stays at 60 fps. Icons align to the pixel. | auto + review |
| D-PRIN-08 | **Delight comes from the other seven.** No confetti or decoration that delays the task. | review |

## 2 · Layout

| ID | Rule | Check | Status |
|---|---|---|---|
| D-LAY-01 | The most important item sits at the top and on the leading (left) side. | review | ✅ |
| D-LAY-02 | Group related items with space, a card or a divider. Aligned items read as related and indented items as subordinate (AGENTS layout rules 1–4). | auto (`test:align`) | ✅ |
| D-LAY-03 | Use progressive disclosure: show the summary first and the detail one tap away. | review | ✅ |
| D-LAY-04 | No horizontal page scroll at any width from 320 to 1440 px, or at 200% text size. Only deliberate sideways rows (chips, carousels) scroll. | auto | ✅ |
| D-LAY-05 | Content adapts to text size: side-by-side items stack, rows grow taller, and text never overlaps. | auto (200% pass) + review | ⚠️ |
| D-LAY-06 | Respect safe areas: fixed bars pad with `env(safe-area-inset-*)`, and no control sits under the notch or the home indicator. | review | ✅ |
| D-LAY-07 | The same features exist at every width. Only how much is visible at once may change (tab bar on a phone, sidebar on desktop). | review | ✅ |
| D-LAY-08 | Controls sit next to the content they change. | review | ✅ |

## 3 · Typography

| ID | Rule | Check | Status |
|---|---|---|---|
| D-TYPE-01 | **No readable text under 11 px** (`0.6875rem`, Apple's iOS minimum). The only exception is decorative mock UI that is `aria-hidden` (the landing phone). | auto | ✅ |
| D-TYPE-02 | Body and list text is 15 px or more (Apple Subhead 15, Body 17). Captions are 12–13 px. 11 px is only for uppercase labels. | review | ✅ |
| D-TYPE-03 | Every text field is 16 px or more, so iOS Safari never zooms in. | auto | ✅ |
| D-TYPE-04 | Sizes are in rem so text follows the user's text size. The layout must hold at **200%** (Apple's target), with no clipped meaningful text (AGENTS layout rule 5). | auto | ⚠️ |
| D-TYPE-05 | At large text sizes, keep the hierarchy and keep primary items at the top. Grow the meaningful icons with the text (size icons in `em`). | review | ⚠️ |
| D-TYPE-06 | No light weights (under 400). Only the loaded weights: Manrope 400/600/700 and Saira 800/900. | auto (lint) | ✅ |
| D-TYPE-07 | At most two typefaces (Manrope and Saira). | review | ✅ |
| D-TYPE-08 | Text of three lines or more never uses tight leading (line-height ≥ 1.4). | review | ✅ |
| D-TYPE-09 | Numbers that change or line up in columns use tabular figures. | review | ✅ |

## 4 · Colour and contrast

| ID | Rule | Check | Status |
|---|---|---|---|
| D-COL-01 | **Text contrast is at least 4.5:1** up to 17 px, and 3:1 from 18.66 px bold or 24 px regular (WCAG AA, as Apple's Accessibility Inspector uses). Check it on the real background, including ink, chips and tints. | auto | ✅ |
| D-COL-02 | New colours for small text aim for 7:1 (Apple's dark-mode guidance for custom colours). | review | — |
| D-COL-03 | Icons and the edges of controls are at least 3:1 against what is behind them. | auto | ✅ |
| D-COL-04 | **Colour never carries meaning alone.** The level colours always come with a % or a word, and category colours with a label. | review | ✅ |
| D-COL-05 | **One meaning per colour.** Cobalt means action, `level-*` means progress only, and destructive red means delete only. Category illustration colours never mean status. | review | ✅ |
| D-COL-06 | Every colour has a `prefers-contrast: more` variant that is clearly stronger. | auto | ⚠️ |
| D-COL-07 | Colours are tokens from `globals.css`. No raw hex in components. | auto (lint) | ✅ |
| D-COL-08 | **Dark mode:** follow the system (`prefers-color-scheme`) and never add an in-app appearance switch. A dark palette is dimmer behind and brighter in front, not an inversion. | review | ❌ (planned, see Gaps) |

## 5 · Materials (Liquid Glass, decided 21/10: floating controls only)

| ID | Rule | Check | Status |
|---|---|---|---|
| D-MAT-01 | Glass (a blur plus a tint) is only for the **floating functional layer**: the tab bar and the top bar of a sheet. **Never in the content layer** (cards, lists, rows, chips). | review | ❌ (not built yet) |
| D-MAT-02 | Use the regular variant only: blur plus a tint strong enough that text on it passes D-COL-01 over the *worst* content that can scroll beneath. | auto | — |
| D-MAT-03 | Never put glass on glass. One glass layer at a time. | review | — |
| D-MAT-04 | Under `prefers-reduced-transparency`, glass becomes solid. Under `prefers-contrast: more`, it becomes solid and gains the `card-border` edge. | auto | ⚠️ |
| D-MAT-05 | Never animate `backdrop-filter`. Glass fades or moves with opacity and transform only (`motion.test.ts`). | auto | ✅ |
| D-MAT-06 | Colour on glass is used sparingly: only the primary action (the cobalt + button) is tinted. | review | ✅ |
| D-MAT-07 | A modal sheet dims what is behind it (`scrim`, 40%). Apple's minimum for clear glass is 35%. | review | ✅ |
| D-MAT-08 | Where content scrolls under a floating bar, use a soft edge fade instead of a hard divider. Use one edge effect per view, and only where a floating bar exists. | review | ⚠️ |

## 6 · Motion

| ID | Rule | Check | Status |
|---|---|---|---|
| D-MOT-01 | Motion has a purpose: it shows where something came from or went, or that an action landed. No motion for decoration. | review | ✅ |
| D-MOT-02 | **Motion is never the only signal.** Every animated change also changes text, an icon or `aria-live`. | review | ✅ |
| D-MOT-03 | **Never block input during an animation.** Every animation can be interrupted, and a tap mid-transition acts at once. | auto (probe) | ✅ |
| D-MOT-04 | Feedback animations are short and precise (press 160 ms, sheets 300–350 ms; tokens in `globals.css`). | auto (`motion.test`) | ✅ |
| D-MOT-05 | Things people do all day (chips, rows, toggles) get minimal motion. | review | ✅ |
| D-MOT-06 | Motion follows the gesture: a sheet that came up goes down, and back slides the opposite way to forward (`nav-direction`). | review | ✅ |
| D-MOT-07 | Under `prefers-reduced-motion`, slides become fades, springs tighten (no bounce), and there is no scale, zoom or blur animation. | auto | ✅ |
| D-MOT-08 | Nothing flashes more than 3 times a second, and nothing oscillates for long. | review | ✅ |

## 7 · Controls and touch

| ID | Rule | Check | Status |
|---|---|---|---|
| D-CTL-01 | **Every hit area is at least 44×44 px** (Apple's default). A smaller visual grows its hit area invisibly (`before:-inset-*`). Never below 28 px visible. | auto | ✅ |
| D-CTL-02 | Targets sit at least 8 px apart edge to edge. Unbezelled icons get about 12 px of clear space around the glyph. | auto | ✅ |
| D-CTL-03 | Every control shows a pressed state at touch-down (`press-feedback`, AGENTS motion rules). | auto | ✅ |
| D-CTL-04 | At most one or two prominent (filled) buttons per view. The preferred choice stands out by style, not size. | review | ✅ |
| D-CTL-05 | A destructive action is never the primary button and never the default. | review | ✅ |
| D-CTL-06 | Button labels start with a verb ("Thêm", "Lưu", "Xoá"), in one or two words. | review | ✅ |
| D-CTL-07 | An action that takes time shows progress inside the button ("Đang lưu…") and cannot be tapped twice. | review | ⚠️ |
| D-CTL-08 | Icon-only buttons have an `aria-label` matching what a sighted person would call it (Voice Control). | auto | ✅ |
| D-CTL-09 | Every gesture has a visible alternative: a swipe-to-delete row also has a delete in its menu, and a sheet you can drag down also has a close button. | review | ✅ |
| D-CTL-10 | Use only simple gestures (tap, swipe, drag). No multi-finger gestures. | review | ✅ |

## 8 · Navigation and the tab bar

| ID | Rule | Check | Status |
|---|---|---|---|
| D-NAV-01 | The tab bar switches top-level sections. It stays visible on every tab screen and is covered only by a modal. | review | ✅ |
| D-NAV-02 | Never hide or disable a tab. If a section is empty, say why inside it. | review | ✅ |
| D-NAV-03 | Every tab has a one-word label under its icon. | review | ✅ |
| D-NAV-04 | Badges are only for something that needs attention, and they clear once seen. | review | ✅ |
| D-NAV-05 | Back always returns to where people were, with scroll position and filters kept. | auto (probe) | ✅ |
| D-NAV-06 | Every screen has its own URL (deep link) and works on reload. | auto (smoke) | ✅ |
| D-NAV-07 | Accepted deviation: the centre **+** is an action inside the tab bar, which Apple's tab bar guidance advises against. It stays because logging is the app's main job. It must look clearly different from the tabs (a filled cobalt circle) and must never be selected like a tab. | review | ✅ (accepted) |

## 9 · Sheets and dialogs

| ID | Rule | Check | Status |
|---|---|---|---|
| D-SHT-01 | Only one sheet at a time. A sheet that opens another sheet closes itself first. | review | ✅ |
| D-SHT-02 | A resizable sheet has a grabber, and tapping the grabber cycles its heights. | review | ⚠️ |
| D-SHT-03 | Every sheet closes by swipe down **and** by a visible button, and Esc closes it on desktop. | auto (probe) | ✅ |
| D-SHT-04 | If a sheet holds unsaved input, ask before closing ("Bỏ thay đổi?"). | review | ⚠️ |
| D-SHT-05 | Apple's button placement (March 2026): Cancel or Close on the **leading** side and Done on the trailing side. In later steps, Back goes on the leading side. Never show Done alone, and never show Cancel, Done and Back together. | review | ❌ (the + sheet's X is on the trailing side; see Gaps) |
| D-SHT-06 | Long or multi-step flows (setup, custom food) are full screens, not sheets. | review | ✅ |
| D-SHT-07 | Alerts hold a title, optional text and at most 3 buttons. Button labels are verbs (never "OK" for a choice, never "Có/Không"). Cancel is labelled "Huỷ". Never show an alert at launch. | review | ✅ |

## 10 · Feedback, errors and undo

| ID | Rule | Check | Status |
|---|---|---|---|
| D-FB-01 | The weight of feedback matches the event: a routine add gets a quiet toast, and an alert is only for something critical that needs a decision. | review | ✅ |
| D-FB-02 | **Prefer undo to confirmation.** Every add, edit or delete of a diary entry can be undone. Confirm first only for a loss that is both unexpected and irreversible (deleting an account or a custom food). | review | ✅ |
| D-FB-03 | **Limit timed UI.** A toast that auto-dismisses never holds the only path to an action: the undo is also reachable after the toast (from the entry itself). The timer pauses on hover, focus or press. | review | ⚠️ |
| D-FB-04 | Feedback reaches screen readers through `aria-live="polite"` and never steals focus. | auto | ✅ |
| D-FB-05 | Errors appear next to the field or section, say what happened and how to fix it, and never blame the user. No "Oops", and no "chúng tôi" in errors. | review | ✅ |
| D-FB-06 | When something cannot be done (offline, read-only day), say so and why, in place. | review | ✅ |

## 11 · Loading, empty and offline

| ID | Rule | Check | Status |
|---|---|---|---|
| D-LOAD-01 | Show something at once: a skeleton in the shape of the real content, with no blank screens and no layout jump when data lands. | auto (hydration) | ✅ |
| D-LOAD-02 | Load in the background and keep the screen usable while it loads. | review | ✅ |
| D-LOAD-03 | If a wait lasts more than about 1–2 s, show progress (determinate when the length is known). | review | ✅ |
| D-LOAD-04 | Empty states say what goes there and give one next step as a button or link. Nothing critical lives only in an empty state. | review | ✅ |
| D-LOAD-05 | Offline shows cached data plus a quiet label, never a blocking error. | auto (offline probe) | ✅ |

## 12 · Onboarding, tours and tips

| ID | Rule | Check | Status |
|---|---|---|---|
| D-ONB-01 | Onboarding is short, optional and teaches by doing. Every tour can be skipped, and a skipped tour never returns by itself. | review | ✅ |
| D-ONB-02 | Tips appear in context, next to the control they explain, once each (`lib/tips.ts`). | auto (`tutorial-targets`) | ✅ |
| D-ONB-03 | A skipped or dismissed lesson stays findable ("Có gì mới", Help). | review | ✅ |
| D-ONB-04 | Ask for a permission (notifications, camera) when the feature is first used, never at launch, and say what it is for. | review | ✅ |
| D-ONB-05 | Postpone non-essential setup and use sensible defaults. | review | ✅ |

## 13 · Writing (Vietnamese UI)

| ID | Rule | Check | Status |
|---|---|---|---|
| D-WRT-01 | Use plain words and the fewest that do the job, with no jargon. Write nutrient names the way users know them. | review | ✅ |
| D-WRT-02 | The most important information comes first on every screen and in every sentence. | review | ✅ |
| D-WRT-03 | Keep one set of terms everywhere: Thêm, Lưu, Xong, Huỷ, Tiếp tục, Quay lại. | review | ⚠️ |
| D-WRT-04 | On touch screens say "chạm", never "nhấp" or "click". | auto (grep) | ✅ |
| D-WRT-05 | Links say where they go. No "bấm vào đây". | review | ✅ |
| D-WRT-06 | To send people to a setting, link straight to it rather than describing the path. | review | ✅ |
| D-WRT-07 | Every field has a visible label, a placeholder with an example, and its error beside it. | review | ✅ |
| D-WRT-08 | Numbers use `lib/format.ts` (1.041 · 2,1). | auto | ✅ |

## 14 · Charts and nutrient bars

| ID | Rule | Check | Status |
|---|---|---|---|
| D-CHT-01 | Bars compare amounts and lines show trends over time. Bars start at zero. | review | ✅ |
| D-CHT-02 | The title or label says what the chart means, and the data is the most prominent thing in it. | review | ✅ |
| D-CHT-03 | Every bar has an accessible name with the real value, unit and target ("Sắt 8,2 / 18 mg, 46%"), and the date in words. | auto | ⚠️ |
| D-CHT-04 | Colour plus text or shape: a level colour is never the only cue (D-COL-04). | review | ✅ |
| D-CHT-05 | Interaction is optional: nothing critical is only visible on tap or hover. | review | ✅ |
| D-CHT-06 | When a chart changes, the change is also announced in text, not only animated (D-MOT-02). | review | ✅ |

## 15 · Icons and images

| ID | Rule | Check | Status |
|---|---|---|---|
| D-ICN-01 | One icon family: MynaUI and our own, 24 px grid, 1.8 px stroke, round caps. No emoji as icons. | review | ✅ |
| D-ICN-02 | Use familiar metaphors for familiar actions (share, delete, close, back), and never reuse one for another meaning. | review | ✅ |
| D-ICN-03 | Decorative icons are `aria-hidden`. Meaningful icon-only controls have a label (D-CTL-08). | auto | ✅ |
| D-ICN-04 | Category icons follow `prompts/food-icons.html`: an earthy palette with an ink outline, and the label always beside the icon. | review | — (being built) |
| D-ICN-05 | Raster images ship at 2x and 3x (`srcset`) and keep their aspect ratio (`object-fit`). Nothing is stretched. | review | ✅ |
| D-ICN-06 | PWA icons include a maskable variant. Keep the app icon simple and recognisable at 29 px. | review | ✅ |

## 16 · Search

| ID | Rule | Check | Status |
|---|---|---|---|
| D-SRCH-01 | The placeholder says what can be searched ("Tìm món: cơm, trứng…"). | review | ✅ |
| D-SRCH-02 | Results update as people type, with the most relevant first. | auto (search tests) | ✅ |
| D-SRCH-03 | Recent searches or foods show before typing. A clear (×) button appears once there is text. | review | ⚠️ |
| D-SRCH-04 | A filter (chip) narrows what search covers, starts on the broad scope (Tất cả), and combines with the query. | review | ✅ |

## 17 · Accessibility (cross-cutting)

| ID | Rule | Check | Status |
|---|---|---|---|
| D-A11Y-01 | Everything works with a keyboard, the tab order follows the visual order, and the focus ring is always visible. | auto (probe) | ✅ |
| D-A11Y-02 | Use real elements: `<button>`, `<a href>`, `<input>` with `<label>`. No click handlers on a div. | auto (lint) | ✅ |
| D-A11Y-03 | Each screen has one `h1`, and headings go in order. | auto | ✅ |
| D-A11Y-04 | Nothing plays sound or video by itself. | review | ✅ |
| D-A11Y-05 | Test each release with VoiceOver on iPhone and TalkBack on Android for the core flow (add food, see nutrients). | review | ⚠️ |

---

## Audit of the live app (21/10/2026, lehongkhanh.vn, 390×844, logged-in account)

I measured six routes automatically (`/app`, `/add`, `/explore`, `/explore/rau`, `/trends`, `/settings`):
- **Hit areas (D-CTL-01):** 0 under 44 px once expanded hit areas are counted.
- **Text size (D-TYPE-01):** 0 readable text under 11 px. The landing page's decorative phone mock-up uses 10 px, which is allowed when `aria-hidden`.
- **Contrast (D-COL-01):** 0 failures. One hit was a screen-reader-only label, a false positive.
- **200% text (D-TYPE-04, D-LAY-04):** no horizontal scroll on Hôm nay or Khám phá. On Hôm nay, two labels are cut off with an ellipsis ("Hôm nay" in the header, and the empty text of the share card). **Fix.**

## Gaps (what fails or is missing today)

1. **D-COL-08 dark mode ❌.** The app is light only. It is a large job, so it needs a decision from Hao on when to plan it. Until then, never hard-code light-only assumptions in new code: use tokens only.
2. **D-SHT-05 sheet close button ❌.** The + sheet's close (X) sits on the top-right. Apple's March 2026 guidance puts Close or Cancel on the leading side. This conflicts with `design/` and needs a decision from Hao.
3. **D-MAT-01–04 glass ❌.** Not built. A task should add glass to the tab bar and the sheet header only, with solid fallbacks.
4. **D-FB-03 timed toast ⚠️.** Check that Hoàn tác is still reachable after the toast is gone (from the entry). If not, add it.
5. **D-TYPE-04/05 200% text ⚠️.** Two ellipses on Hôm nay. Meaningful icons should also grow with the text.
6. **D-SHT-02 grabber ⚠️, D-SHT-04 unsaved changes ⚠️, D-SRCH-03 clear button ⚠️, D-CHT-03 bar labels ⚠️, D-CTL-07 button progress ⚠️, D-WRT-03 terms ⚠️, D-A11Y-05 screen-reader pass ⚠️.** These need a check, each then fixed or marked ✅.

## Enforcement

- **Definition of done (AGENTS.md):** "Meets DESIGN.md: no `auto` rule fails, and every `review` rule touched by the change was checked."
- **`tests/probes/design-floor.py`** (`# PROBE_COVERS: app/**`): checks D-CTL-01/02, D-TYPE-01/03/04, D-COL-01/03, D-LAY-04, D-CTL-08 and D-A11Y-03 on every route at 390 and 1280 px, and again with the root font at 200%. A failure prints the rule ID.
- **Lint:** no font weight under 400 (D-TYPE-06), no raw hex (D-COL-07), "nhấp"/"click" in UI copy (D-WRT-04), no `onClick` on a div or span (D-A11Y-02).

## Sources

- Apple Human Interface Guidelines: [Design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles) · [Layout](https://developer.apple.com/design/human-interface-guidelines/layout) · [Typography](https://developer.apple.com/design/human-interface-guidelines/typography) · [Color](https://developer.apple.com/design/human-interface-guidelines/color) · [Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode) · [Materials](https://developer.apple.com/design/human-interface-guidelines/materials) · [Motion](https://developer.apple.com/design/human-interface-guidelines/motion) · [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) · [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons) · [Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) · [Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars) · [Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets) · [Alerts](https://developer.apple.com/design/human-interface-guidelines/alerts) · [Scroll views](https://developer.apple.com/design/human-interface-guidelines/scroll-views) · [Search fields](https://developer.apple.com/design/human-interface-guidelines/search-fields) · [Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback) · [Loading](https://developer.apple.com/design/human-interface-guidelines/loading) · [Onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding) · [Writing](https://developer.apple.com/design/human-interface-guidelines/writing) · [Charts](https://developer.apple.com/design/human-interface-guidelines/charts)
- [UI Design Dos and Don'ts](https://developer.apple.com/design/tips/) · [What's new in design](https://developer.apple.com/design/whats-new/) · [Design resources](https://developer.apple.com/design/resources/)
- WWDC26 [Principles of great design](https://developer.apple.com/videos/play/wwdc2026/250/) · WWDC25 [Get to know the new design system](https://developer.apple.com/videos/play/wwdc2025/356/)
