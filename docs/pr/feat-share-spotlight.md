# feat/share-spotlight: make "Chia sẻ" easy to find

Front end only (apps/web). **Stacks on `feat/custom-food-nutrients`** (Part 1, its own PR); retarget as the stack merges.

People miss Hôm nay's share button. This change labels the button and adds a one-time pointer on it, instead of a toast that only says the feature exists.

## 1. The button
On Hôm nay, the share glyph and "Chia sẻ" sit in a 44 px glass pill (cobalt, 15 px bold). Its accessible name stays "Chia sẻ ngày này". It stays on one line and is not cut at 360 px, at 360 px with 150 % text, or at 390 px; nothing in the header is cut and the page does not scroll sideways. Checked by the probe.

## 2. The spotlight
It is the existing share tip (`home-share` in `lib/tips.ts`), reworked.
- **When it shows:** Hôm nay, today, with one food or more (an empty day makes an empty image), for an account that has never shared (`share-day` in onboarding-flags `used`).
- **Order:** it is now the first of Hôm nay's tips.
- **Right after Có gì mới:** `lib/interruption` gets one exception to "one interruption per app open". Once Có gì mới has opened and closed, the one tip marked `afterWhatsNew` (this one) may follow it, once (`mayFollowWhatsNew` / `claimFollowWhatsNew`). No other tip can follow it.
- **On an empty day:** nothing follows Có gì mới. The spotlight shows the first time Hôm nay is opened with a food logged.
- **What it looks like:** the page is dimmed except a box around the pill. The bubble reads "Chia sẻ ngày ăn của bạn / Ảnh tóm tắt đẹp, gửi ngay cho bạn bè hoặc HLV.", with "Để sau" (the visible skip) and "Thử ngay" (opens the share sheet). It uses the existing Spotlight, so it gets the m-pop fade and scale in and out and the 120 ms cross-fade under reduced motion.
- **Counts as the day's one tip:** it sets `tipShownAt`, so the 24 h gap applies.
- **When it stops:**
  - after a share (`share-day`);
  - after "Thử ngay" (`share-tip-try`);
  - after "Để sau" twice (`shareLater` in onboarding-flags; Esc counts as Để sau).
  It is the one tip that can show again after it was seen (`Tip.again`).

## 3. The nudge
`lib/share-nudge.ts` (pure, unit tests). When today first reaches 80 % of its kcal target with five or more vitamins or minerals at Gần đủ or Đạt (80 % or more, rounded the way the bars round), the app's one toast shows "Hôm nay ăn khá đủ chất — chia sẻ nhé?" with **Chia sẻ** for 4 s (a new `share` toast kind; its action opens the share sheet).
- **"First reaches":** the day was under the line the last time Hôm nay looked, in this app open. The state is module-level, so an add from the Tự nhập form or a food page counts too. A day already over the line when the app opens gets no nudge.
- **Timing:** it waits until the toast on screen (the add's Hoàn tác) has gone, and shows on Hôm nay only.
- **Limits:** at most once a day (`shareNudgeIso`), never on the day the spotlight showed (`shareTipIso`), never with tips off.

## 4. Có gì mới
`2026-10-22a` gains the item "Chia sẻ ngày ăn bằng một chạm" and a tour step on `home-share`. The entry's tour is now 8 steps, the cap, so "Thử ngay" for an older account is 21c's first step plus 22a's seven on Hôm nay (`releases.test.ts`, `cc_46.py`, `cc_tutorials.py`).

## Probe `tests/probes/share_spotlight.py` (green)
- The button at 360, 360 at 150 % and 390.
- The spotlight after Có gì mới with food logged, at all three sizes: its copy, buttons, the box holds the pill, the page is dimmed, the bubble is on screen and nothing in it is cut. It saves its day. Thử ngay opens the share sheet and is remembered.
- Not after Có gì mới on an empty day; shown on the next app open with one food; not after a share; Để sau twice and never again.
- The nudge:
  - a day under the line gets none;
  - Chỉ ghi kcal 900 takes the sample day from 46 % to 85 %, and the add's toast comes first, then the nudge;
  - its Chia sẻ opens the share sheet;
  - none on a day already over the line at app open, a second time the same day, on the spotlight's day, or with tips off.

Other probes follow the change:
- `cc_42_onboarding.py`: its old share-tip part (3 foods, round hole, Đã hiểu) is replaced by this probe, and its contexts start as an account that has shared.
- `cc_46`, `cc_51_haptics` and `cc_tutorials`: their accounts have shared once.
- `cc_46` and `polish_1020`: after Có gì mới only the share tip may follow, and nothing after it.

Screenshots in `docs/screenshots/share-spotlight/`: `button-*`, `spotlight-*`, `nudge-390`.

## Gates
`npm run gate:full` on 6f2015c (the whole stack: #49's 8cabdc1, Part 1, this), port 3151:
- green: typecheck, lint:design, vitest (all unit tests), build:demo, test:align (73 s), test:hydration (107 s), check:live-bundle;
- probe:all: 136 PASS, 4 REPORT, 1 QUAR (design-floor-landing.py), 1 FAIL, 1 SKIP.

The one failure was `cc_46.py`'s "no tip after it in the same app open", the rule this branch deliberately changes. It now allows the share tip only, and nothing after it, and was re-run green.

Also run on their own against this build: `share_spotlight.py`, `cc_42_onboarding.py`, `cc_tutorials.py`, `polish_1020.py`, `cc_51_haptics.py`, `custom_food_nutrients.py` and `v3_foods.py`, all green.

## Judgement calls (OPEN_QUESTIONS)
- The prompt's one sentence is split into the bubble's title and body.
- Thử ngay ends the spotlight even if no image is shared: the person found the button.
- Esc counts as Để sau.
- The nudge only keeps itself off the spotlight's day; the spotlight is not kept off the nudge's day (the brief says it one way).

DESIGN.md rules touched: D-ONB-01 (Để sau on the bubble), D-ONB-02, D-ONB-03 (the item stays in Có gì mới), D-CTL-01 (the 44 px pill), D-MOT (Spotlight's motion).
