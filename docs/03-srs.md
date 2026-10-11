# 3. Software Requirements Specification (SRS)

Every PRD feature maps to testable requirements below. All targets, algorithms and recommendations come from the published version of the coach's knowledge base; the numbers in "Calculation rules" are its current content and change only through a published version.

## Functional requirements

| ID | Requirement | PRD | Release |
| --- | --- | --- | --- |
| FR-01 | Users sign up and log in with email and password through the shared account system; a session lasts 7 days | F1 | 1 |
| FR-02 | Users can view and edit sex, age (18–100), weight (30–200 kg), goal and, for women, the period option; targets update immediately | F2, F5 | 1 |
| FR-03 | The diary has one page per calendar day (user's local date) with four meals: breakfast, lunch, dinner, snacks | F3 | 1 |
| FR-04 | Users add an entry by choosing a food, a serving and a quantity (0.25 steps); the entry stores grams and a snapshot of the food's nutrients per 100 g | F3, F4 | 1 |
| FR-05 | Users can delete an entry and change its quantity; changes save to the server within 2 seconds | F3 | 1 |
| FR-06 | "Copy previous day" copies all entries from the day before into the current day | F3 | 1 |
| FR-07 | Search ignores Vietnamese accents and case, matches Vietnamese and English names, and filters by category; estimated values are labelled | F4 | 1 |
| FR-08 | Targets are calculated from the published coach-knowledge version (see Calculation rules); a target is a range \[min, max\] or a minimum | F5 | 1 |
| FR-09 | Each nutrient shows eaten amount, target and % of the minimum, with status low (<50%), near (50–99%), ok (≥100% and ≤ max), over (> max); reference values are labelled | F6 | 1 |
| FR-10 | All text is available in Vietnamese and English; the choice is saved per user | F7 | 1 |
| FR-11 | Users can download all their data (JSON) and delete their account and data; deletion completes within 30 days | F8 | 1 |
| FR-12 | Diary data saved by the current Fortify Kitchen tracker can be handed over once; duplicates are skipped | F9 | 2 |
| FR-13 | Fortify menu items appear in search, scaled by box size, with an "Order" link to Fortify Kitchen | F10 | 2 |
| FR-14 | An import reads the coach's Obsidian vault and creates a draft knowledge version; nothing reaches users until published | F11 | 2 |
| FR-15 | The admin review screen lists every change in a draft (added, removed, old value → new value) and blocks publishing if a required field is missing or out of range | F11 | 2 |
| FR-16 | Only Hào (admin role) can publish or roll back a version; each published version records who published it and when | F11 | 2 |
| FR-17 | Users can upgrade to the paid tier; paid features check the user's active plan on the server | F12 | 2 |
| FR-18 | Paid users get "running low" suggestions: up to 4 nutrients under 70%, lowest first, each with up to 3 foods from the knowledge base, ranked by amount per serving | F13 | 2 |
| FR-19 | Suggestions and advice never include a food or rule that is not in the published knowledge version | F13 | 2 |
| FR-20 | Paid users set today as rest or a 45, 60, 90 or 120-minute session; training salt, fast carbs and the sodium target follow it; quick-add buttons add the coach's pre- and intra-workout items | F13 | 2 |
| FR-21 | Free users see paid features as locked cards with an "Upgrade" button, never as errors | F12 | 2 |

## Calculation rules (from the coach)

W = body weight in kg, M = today's training minutes (0 on rest days). 1 g salt = 393 mg sodium.

| Nutrient | Rule | Source |
| --- | --- | --- |
| Energy | Build 35–40, maintain 30–35, cut 25–30, deep cut 20–25 kcal × W | Coach |
| Protein | 1.6–2.2 g × W | Coach |
| Fat | 0.5–1.0 g × W | Coach |
| Carbs | (energy − protein mid × 4 − fat mid × 9) / 4, for the energy min and max | Coach ("remainder") |
| Fiber | 14 g per 1000 kcal, kept within men 30–40 g, women 20–30 g | Coach |
| Potassium | 80–100 mg × W | Coach |
| Sodium | (4–6 g salt + 1–1.5 g salt × M / 20) × 393 mg | Coach, update 08/10/2026 |
| Calcium | 1200–1500 mg | Coach |
| Magnesium | 50% of calcium: 600–750 mg | Coach |
| Iron | Men 8 mg; women 18 mg, 28 mg near or during the period | Coach |
| Zinc | Men 12 mg, women 8 mg | Coach |
| Training fast carbs | 30–45 g × M / 60 | Coach |
| Vitamins A, C, D, E, K, B1–B12, phosphorus, selenium, copper | Vietnamese RDA by sex and age band, shown as reference | Viện Dinh dưỡng 2016; WHO/IOM for gaps |

Example: a 65 kg man maintaining weight, training 60 minutes, gets 1950–2275 kcal, 104–143 g protein, and 2751–4127 mg sodium (7–10.5 g salt).

Release 1 uses the rules above as the first knowledge version, loaded from `docs/coach-food-list.md` and reviewed by Hào. From Release 2 they come from the coach's Obsidian vault.

## Coach knowledge base

| Rule | Requirement |
| --- | --- |
| Format | One Obsidian note per topic (sodium, training day, foods, supplements). Numbers live in a fixed block of fields at the top of the note; explanations in plain text below |
| Required fields | Each rule has an id, unit, value or range, applies-to (sex, goal, training), and a source note |
| Validation | Import rejects unknown units, missing ids, min > max, and values outside safe bounds set in code (e.g. salt per day 0–15 g) |
| Versioning | Every import is a new draft version; publishing makes it the active version; the previous version stays available for rollback |
| Traceability | Every target and suggestion shown to a user can name the knowledge version and note it came from |
| Gaps | Where the coach has no number, the app shows the Vietnamese RDA value labelled "reference" and gives no advice |

## Non-functional requirements

| ID | Area | Requirement |
| --- | --- | --- |
| NFR-01 | Performance | Diary page interactive in under 2.5 s on a mid-range Android phone over 4G; search results under 200 ms for the built-in food list |
| NFR-02 | Availability | 99.5% monthly uptime for the API |
| NFR-03 | Security | Passwords hashed; auth token in an HttpOnly, Secure cookie; HTTPS only; rate limit on auth endpoints |
| NFR-04 | Privacy | Consent to process diet and body data at sign-up; data used only to run the app; no sale or sharing; export and delete (FR-18) |
| NFR-05 | Compatibility | Latest 2 versions of Chrome, Safari, Edge; works from 360 px wide; installable as a PWA (later) |
| NFR-06 | Accessibility | WCAG 2.1 AA contrast; every control reachable by keyboard; status not shown by colour alone |
| NFR-07 | Localisation | Vietnamese default; numbers formatted per language (1.950 vs 1,950) |
| NFR-08 | Maintainability | Coach rules come only from the published knowledge version; changing a number needs no code change; unit tests cover every rule above |
| NFR-09 | Data accuracy | Each food records its source (USDA, label, estimate) and when it was last checked |

## Data and privacy rules

- Personal data stored: email, name, sex, age, weight, goal, period option, diary entries, training days. Nothing else.
- Weight, diet and period data count as health-related personal data. Under Vietnam's personal data protection rules (Decree 13/2023/NĐ-CP and the Personal Data Protection Law taking effect in 2026), get explicit consent and allow withdrawal; have this reviewed by someone qualified before launch.
- Diary entries store a nutrient snapshot so history does not change when a food's values are corrected later.
- The app shows a disclaimer: general guidance, not medical advice; pregnancy, breastfeeding or health conditions need a doctor.
- Payment: the app stores only the plan, its status and dates; card or bank details stay with the payment provider.

## Update after scaffold review (10/10/2026)

The scaffold's 4 tables (`foods`, `diary_logs`, `user_targets`, `coach_drafts`) cover logging and targets. The designed screens need these additional data requirements.

| Requirement | Needed by screen | Suggested storage |
| --- | --- | --- |
| Weight history (date, kg) | Cân nặng | `weight_logs` table |
| Training duration per day (Nghỉ, 45, 60, 90, 120 min) | Ngày tập, Hôm nay | column on a per-day record or `training_days` table |
| Period toggle (near/in period) for women | Hồ sơ | `user_targets` or profile column |
| Reminder settings (meal times, salt during training, evening summary) | Nhắc nhở | `notification_prefs` table |
| Subscription and payments (plan, status, PayOS order) | H1T MICRO Pro | `subscriptions` + `payments` tables |
| User-created foods (owner, private) | Tạo món mới | `foods.created_by` + visibility |
| Language and units (decimal comma/dot, kcal/kJ) | Ngôn ngữ | profile columns |
| Account deletion with CSV export | Xoá tài khoản | export endpoint + hard delete job |

- **Meal slots:** Bữa sáng, Bữa trưa, Trước tập, Bữa tối, Bữa phụ. The default slot is picked by time of day.
- **Nutrient count:** 26 = 5 macros + 21 micros (9 minerals, 12 vitamins). The scaffold already matches this.
