# 2. Product Requirements Document (PRD)

Release 1 ships in a month with 8 features for logging and seeing calories, macros and micronutrients against targets; the coach's recommendations, payments and the Fortify link follow in Release 2.

## Personas (illustrative)

| Persona | Who | Wants | Tier |
| --- | --- | --- | --- |
| Minh, the macro-counter | 24, office worker, gym 5x a week, cutting | Hit protein and stay in calories with Vietnamese food | Free |
| Linh, the Fortify customer | 28, buys a weekly protein plan | See how her boxes fit the rest of the day | Free, may upgrade |
| Tuấn, the serious lifter | Trains for competition, follows the coach | Coach's training-day salt and carbs, gap suggestions, trends | Paid |

## Features

| # | Feature | Tier | Release |
| --- | --- | --- | --- |
| F1 | Sign up and log in (email + password, same account system as Fortify Kitchen) | Free | 1 |
| F2 | Profile: sex, age, weight, goal (build / maintain / cut / deep cut), period option for women | Free | 1 |
| F3 | Daily diary: 4 meals, add / edit / delete entries, change day, copy previous day, synced to the server | Free | 1 |
| F4 | Food search: accent-insensitive, categories, serving sizes | Free | 1 |
| F5 | Targets for energy, macros, fiber and electrolytes from the coach's rules | Free | 1 |
| F6 | Nutrient report: macros, vitamins, minerals, electrolytes with % bars | Free | 1 |
| F7 | Vietnamese and English | Free | 1 |
| F8 | Export my data and delete my account | Free | 1 |
| F9 | Import the diary saved by the current tracker on Fortify Kitchen | Free | 2 |
| F10 | Fortify menu in search and an "Order" link to Fortify Kitchen | Free | 2 |
| F11 | Coach knowledge base: Obsidian notes imported as a draft, Hào approves, then published | Internal | 2 |
| F12 | Paid tier: upgrade, payment, access control | Paid | 2 |
| F13 | Coach recommendations: "running low" suggestions, training-day salt and carbs, quick add | Paid | 2 |
| F14 | Trends and history: 7- and 30-day averages, weight log | Paid | Later |
| F15 | Custom foods and recipes | Paid | Later |
| F16 | AI explanations that answer only from the coach's notes | Paid | Later |

## User stories (Release 1)

**US1 — Log a meal (F3, F4).** As Minh, I want to find "phở" and add one bowl to lunch, so that my day's totals update.

- Typing "pho" (no accents) shows "Phở bò" in the first results.
- Choosing a serving and quantity previews kcal, protein, carbs and fat before adding.
- After adding, totals update within 1 second and the entry appears on my other devices after refresh.

**US2 — See my numbers (F5, F6).** As Minh, I want to see my calories, macros and micronutrients against my targets, so that I know what I am short of.

- Each nutrient shows eaten, target (or range) and %.
- Targets change as soon as I change weight or goal.
- Nutrients without a coach number are marked as reference values.

**US3 — My data is mine (F1, F8).** As Linh, I want my diary saved to my account and the right to take or delete it.

- Logging in on a new device shows the same diary and profile.
- I can download all my data and delete my account.

## User stories (Release 2)

**US4 — Training day (F13, paid).** As Tuấn, I want to mark a 90-minute session, so that my salt and carb targets fit training.

- Choosing 90 minutes shows 4.5–6.75 g training salt and 45–67.5 g fast carbs, and raises the sodium target to match.
- Free users see the card locked with an "Upgrade" button.

**US5 — Coach's picks (F13, paid).** As Tuấn, I want suggestions for what I am low on, so that I fix it today.

- Up to 4 nutrients under 70%, each with up to 3 foods from the coach's knowledge base only.

**US6 — Publish coach knowledge (F11).** As Hào, I want to review what changed in the coach's notes before users see it.

- An import shows a list of changes (old value → new value); nothing changes for users until I press Publish.
- I can roll back to the previous version.

## Release plan

| Release | Contents | Gate to ship |
| --- | --- | --- |
| 1 — within 1 month | F1–F8 | SRS Release 1 requirements pass; coach checks targets on 3 test profiles |
| 2 — right after | F9–F13 | Price decided; first coach-knowledge version published |
| Later | F14–F16 | Decided from Release 2 usage |

## Update after scaffold review (10/10/2026)

The design now covers 36 phone screens, a mobile-browser set and 7 desktop pages. Scope for the screens added since this PRD was written:

| Feature | Release | Note |
| --- | --- | --- |
| Magic-link sign-in (check email, expired link) | 1 | No passwords |
| Calendar, past days, copy yesterday | 1 |  |
| Create your own food | 1 |  |
| Offline banner and pending sync | 1 | PWA |
| Weight, goal, language and reminder settings | 1 |  |
| Delete account with CSV export | 1 |  |
| Trends (7 and 30 days) | 2 | The 7-day view can ship in Release 1 if time allows |
| H1T MICRO Pro paywall | 2 | Payment through PayOS; prices still open |
| Fortify Kitchen menu sync | Later | Kept for later; the product works standalone, like Cronometer |

The UI shows no "Coach" tags. Coach rules stay the only source of targets and suggestions.

## Update 10/10/2026: features learned from Cronometer
See `BACKLOG.md`.
- **Release 1 adds:** water tracking; copy and multi-select of meals and days; recent and favourite foods; recipes built from ingredients; a data-source page.
- **Release 2+:** barcode scanning (Open Food Facts); auto-repeat items and the recipe importer (Pro); AI photo logging; voice logging.
