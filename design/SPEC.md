# H1T MICRO: artboard spec (shared by all agents)

Project dir: P = /tmp/claude-0/-home-claude/62ab0a77-e3dc-5f6e-b4e5-3c6d0fe6d688/scratchpad/hitmicro/project
Product: a Cronometer-style calorie and micronutrient tracker (web app / PWA). All copy is Vietnamese.
Coach Lê Hồng Khánh's rules are the only source of recommendations.
Never add names or credits for any AI or tool, and never add HTML comments about authorship.
Create ONLY the files assigned to you. Do NOT edit existing files or canvas.json. Do NOT touch Desktop.dc.html (it is stale).

## File skeleton (copy exactly from P/Today.dc.html)

- `<!doctype html>`, `<html lang="vi">`, `<head>` with `<meta charset="utf-8">`, a unique `<title>` ("<Tên màn> — H1T MICRO") and `<script src="./support.js"></script>`.
- `<body><x-dc><helmet>` holds the Google Fonts `<link>` tags and the `<style>` block copied VERBATIM from Today.dc.html.
- Then ONE root `<div>`, then `</x-dc>`, then `<script type="text/x-dc" data-dc-script data-props='…'>` with `class Component extends DCLogic { renderVals() { … } }`.

### PHONE screens (390 wide)

The root must start with exactly:

    style="width: 390px; height: {{h}}px; box-sizing: border-box; overflow: hidden; background: #F5F5F7; color: #1D1D1F; font-family: 'Be Vietnam Pro', sans-serif; display: flex; flex-direction: column;"

- data-props: `'{"h":{"editor":null,"default":844},"$preview":{"width":390,"height":844}}'`
- renderVals must return `h: this.props.h ?? 844` plus your data.
- The screen is also mounted at a shorter height (about 700 px) inside a browser frame. So:
  - Build it as header (flex: none), then a scrolling body `flex: 1 1 0; min-height: 0; overflow: hidden;`, then the bottom nav or CTA (flex: none).
  - Never give the body a fixed px height.
  - Put the most important content at the top of the body.

### DESKTOP pages

- Fluid root, no px width: `min-height: 980px; background: #F5F5F7; display: flex; flex-wrap: wrap;`.
- The sidebar and its markup are copied from P/DesktopToday.dc.html.
- Content: `flex: 999 1 560px; min-width: 0;` with an inner `max-width: 1200px`.
- data-props: `'{"$preview":{"width":1440,"height":980}}'`.

## Template rules (they fail silently)

- `{{hole}}` is a dotted lookup only (e.g. `{{m.name}}`): no expressions, `!`, `+`, ternaries or calls. Precompute everything in renderVals.
- Loops: `<sc-for list="{{x}}" as="y" hint-placeholder-count="N">`.
- Conditionals: `<sc-if value="{{x}}" hint-placeholder-val="{{false}}">`.
- Close every element and quote every attribute.
- Links between boards: `<a href="Other.dc.html">`. Style the `<a>` itself as the button; never put a `<button>` inside an `<a>`.
- Only link to files that exist in P or that are on the screen list below.
- Inline styles only, plus the copied helmet `<style>`. Icons are inline stroke SVGs (stroke-width 1.8–2, round caps) with `aria-hidden="true"`. No emoji, `<img>`, `<iframe>` or network URLs other than Google Fonts.
- Accessible as drawn:
  - Use real `<button>`, `<a href>` and `<input>` with a visible `<label>`.
  - Icon-only buttons get `aria-label`.
  - Switches get `role="switch" aria-checked`.
  - Dialogs get `role="dialog" aria-modal="true" aria-labelledby`.
  - Toasts get `role="status"`.

## Tokens

- **Colours:**
  - ink (header, nav, primary dark) #0A0A0B
  - text #1D1D1F
  - page #F5F5F7
  - card #FFFFFF with border `1px solid rgba(0,0,0,0.08)` and radius 18px
  - divider #EEF0F3
  - secondary text #5B6170
  - muted on dark #A3A8B5
  - **blue #1E55F0** is the ONLY action and progress colour
  - sky #A9D1F7 is accent text on black only
  - amber: #C77700 on white, #F5A524 on dark (meaning "under 50%")
  - red #D93036 (destructive or over target)
  - empty bar segment: #E3E5E9 light, #2B2D33 dark
  - warning banner: background #FFF4E0, text #7A4A00
- **Type:**
  - 'Be Vietnam Pro' for everything, with `font-variant-numeric: tabular-nums` on numbers.
  - 'Saira' italic (`font-style: italic; font-stretch: 118%; font-weight: 800`) ONLY for screen titles and hero numbers 20 px and up. Screen titles are UPPERCASE Saira 28px.
  - Sizes: body 15–16px; secondary 13–14px; 12px only for footnotes and bottom-nav labels; never below 12.
- **Shape:**
  - Primary CTA: pill (`border-radius: 9999px`), height 52px, blue background, white 16px/700 text. One primary CTA per screen.
  - Secondary button: pill, white background, `1px solid rgba(0,0,0,0.12)`.
  - Inputs: height ≥48px, radius 10px, border `2px solid #D5D8DF` (focused: #1E55F0).
  - Chips: 44px pills.
  - Every tappable element is ≥44px tall.
  - Sheets: white, radius 20px 20px 0 0, grabber 36×5 #D5D8DF, dim scrim `rgba(10,10,11,0.5)` over the screen behind.
- **Header pattern:** black block `#0A0A0B`, `border-radius: 0 0 20px 20px`, padding 16–20px.
  - Sub-screens have a back button (44×44, `aria-label="Quay lại"`, chevron-left) and the Saira title.
  - Copy the header patterns from SetupProfile.dc.html (sub-screen) or Today.dc.html (main tab).
- **Bottom nav** (main tab screens only): copy the `<nav>` from Today.dc.html exactly (Hôm nay / Vi chất / + / Ngày tập / Hồ sơ) and set `aria-current="page"` plus white colour on the right item. Sub-screens and onboarding have NO bottom nav.

## Sample data (keep everything consistent)

- **User and targets:**
  - Male, born 2003, 65 kg, goal Giữ cân (2.275 kcal: 35 kcal/kg, the upper end since cc-73b), training 60 phút today.
  - Today is Thứ Bảy 10/10/2026.
  - Email ban@email.com.
- **Meals today:**
  - Bữa sáng 459 kcal: Yến mạch 60 g 228, Yogurt kefir 200 ml 126, Chuối 1 quả 105.
  - Bữa trưa 488 kcal: Cơm gạo lứt 150 g 168, Thịt bò nạc 150 g 320.
  - Trước tập 94 kcal: Chà là 30 g 84, Bột củ dền 3 g 10.
  - Bữa tối and Bữa phụ are empty.
  - Total 1.041 kcal, còn 909.
- **Targets come from the code (V3-SPEC §6, 22/10):** every target and percentage of the sample day is computed by lib/targets.ts and lib/rda.ts for this user (lib/mock/sample-day.ts builds SAMPLE_DAY with them; lib/__tests__/sample-day-targets.test.ts holds every screen to them). The food amounts below are unchanged.
- **Macros:** Đạm 62/143 g (43%), Tinh bột 133/280 g (48%), Chất béo 21/65 g (32%), Chất xơ 14/32 g (44%). Kcal 1.041 / 2.275 (46%), còn 1.234.
- **Micros:** 9/22 đạt (Khoáng chất 6/10, Vitamin 3/12). Most lacking: Vitamin D 2,1/15 µg (14%) and Vitamin E 3,2/15 mg (21%).
  - Minerals: Sodium 2.900 / 2.750–4.130 mg 105%, Iron 11/8 mg 138%, Zinc 12,4/11 mg 113%, Phosphorus 1.050/700 mg 150%, Selenium 52/55 µg 95%, Copper 0,8/0,9 mg 89%, Potassium 3.900/3.400 mg 115%, Magnesium 410/400 mg 102%, Calcium 331/1.000 mg 33%, Manganese 1,8/2,3 mg 78%.
  - Vitamins: B12 3,1/2,4 µg 129%, B2 1,4/1,3 mg 108%, B3 18/16 mg 113%, B6 1,1/1,3 mg 85%, B5 4,1/5 mg 82%, A 520/900 µg 58%, B1 0,9/1,2 mg 75%, Folate 290/400 µg 73%, K 85/120 µg 71%, E 3,2/15 mg 21%, C 48/90 mg 53%, D 2,1/15 µg 14%.
- **Coach rules:**
  - kcal/kg by goal, the upper end of the coach's range (cc-73b, 20/10; the sample day below is from before): Tăng cơ 40, Giữ cân 35, Giảm mỡ 30, Giảm mỡ nhanh 25.
  - Protein 2,2 g/kg; fat 1 g/kg.
  - Salt 4–6 g/day + 1–1,5 g per 20 min of training.
  - Iron 8 mg (men) / 18 mg (women), 28 mg when near or in a period.
- **Vietnamese number format:** dot thousands, comma decimals (1.041; 2,1).

## Self-check before you report

For each file you created:
- `<x-dc>` 1 open / 1 close; every `sc-for` and `sc-if` closed.
- No hole contains a space-operator, `!`, `(`, `?` or `+`.
- Every hole name exists in renderVals.
- Every `href="*.dc.html"` target exists in P or is on the full screen list.
- Phone roots use `height: {{h}}px`.

Then report one line per file. Do not paste the file contents.

## Full screen list (names you may link to)

- Existing: SignUp, SetupProfile, SetupGoal, EmptyToday, Today, EditEntry, AddFood, Micros, MicrosVitamins, NutrientDetail, Training, Profile, TodayStates, DesktopToday.
- New phone: CheckEmail, LinkExpired, SignIn, InstallApp, NotFound, ServerError, MealSwitcher, SearchEmpty, CreateFood, FoodDetail, TodayAdded, TodayUndo, CopyYesterday, CalendarPicker, PastDay, Trends, TrainingRest, EditWeight, ChangeGoal, Language, Notifications, DeleteAccount, Paywall.
- New desktop: DesktopMicros, DesktopAddFood, DesktopTraining, DesktopProfile, DesktopSignUp, DesktopSetup.

(Each name is a file `<Name>.dc.html` in P.)
