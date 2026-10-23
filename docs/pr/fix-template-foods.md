# fix/ui-cc-template-foods: saving a day or a meal keeps every food (overnight 22→23/10, PR 2)

**The bug** (found by the backend-sync session): on a device that did not log today's foods itself, "Lưu ngày này thành mẫu" saved a template with 0 foods. "Lưu bữa này" had the same cause.

**Root cause.**
- Both saves read the day through `mealFoods` (lib/diary-store), which kept only the foods the device's catalogue has ("what is saved is what one tap can add back").
- In live mode the catalogue loads when the browser is idle, or when + opens. A device that only opened Hôm nay may not have it yet; the production catalogue is about 6,000 foods.
- So the server's entries for today were there, but every one was filtered out.
- Hôm nay also kept the template's list in a memo that did not change when the catalogue came. So even after the load, the sheet still said "0 món · 0 kcal" until something else in the diary changed.

**Reproduced first** in `tests/probes/template_foods.py` (live build, the fake API of backend_sync.py):
- device 1 logs two foods;
- device 2 (same account, nothing stored, never opens +) saves the day and Bữa sáng;
- a third device does the same with GET /foods held back.

Before the fix, C failed: "0 món · 0 kcal", PUT /day-templates with no items, and Lưu bữa này disabled. B passed only because the catalogue came before the tap.

**Fix**
- `savableFood` (lib/day-templates):
  - a food the server has (a uuid) is kept whether or not the catalogue has come;
  - a food only this device knows (a one-off dish) is kept when its catalogue has it, as before;
  - a quick kcal entry has no food, as before.
  - `mealFoods` uses it, so Lưu ngày này thành mẫu, Lưu bữa này and the meal menu's count all follow.
- The save sheet works out its own summary (`templateSaveSummary`):
  - every saved food is counted;
  - the kcal shows once the catalogue has every food, and is left out until then, never shown as a 0 for foods not yet counted.
  - While the sheet is open it asks for the catalogue (useCatalogFoods), so the kcal appears a moment later.
  - The toast after Lưu mẫu leaves the kcal out the same way ("Đã lưu Ngày tập · 2 món").
- Applying a template is unchanged: a food the catalogue does not have is skipped there, with the message it already had.

**Tests**
- Unit (lib/__tests__/day-templates.test.ts): savableFood (a uuid without the catalogue, a one-off id with and without it, an empty id), templateSaveSummary (null kcal until every food is known, the same kcal as templateTotals once it is), the toast without kcal.
- Probe: template_foods.py A, B, C green on a live build; backend_sync.py still green on the same build.
- gate:full: all green (795 s, 145 probes; design-floor-landing quarantined as on main).
- Screenshots of the save sheet at 390, 360 and 360 at 150 % text: `apps/web/.screenshots/audit-1023/saveday-*.png` (`_audit_shots.py saveday`).

No release item: it is a fix of 22b's saves, with no new control. Nothing changes on the demo build (its catalogue is always there).
