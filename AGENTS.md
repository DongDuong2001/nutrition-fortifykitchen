# Agent rules: H1T MICRO

Read these before any task: `HANDOFF.md`, `design/SPEC.md`, `docs/`, then `tasks/00_task_runner_rules.md`.

## Scope (who does what)
- **Database and backend belong to Dong.** Do NOT touch `migrations/`, `apps/api/`, `docker-compose.yml`, or the database. Do not run migrations.
- Work only in `apps/web/` (and `packages/` if needed): frontend task 04 plus the design screens.
- Until Dong's API is ready, use typed mock data matching the sample day in `design/SPEC.md`. Put it behind the existing `lib/api-client.ts` interface so it can be swapped for real calls later.

## Workflow
- The task order in `tasks/00` applies to Dong's backend work. Frontend work runs in parallel from task 04.
- Quality gates for frontend work: in `apps/web`, run `npx tsc --noEmit` and `npm run build`
- Commit to `main` in small commits. Prefix each message with the task number, e.g. `task-01: add auth middleware`.
- Never add AI or tool names to commits, code or comments. No `Co-Authored-By` lines.
- Never commit secrets. Use `.env` (gitignored), based on `.env.example`.
- When a task is done, stop and report: what changed, the gate results, and any open questions.

## Product rules
- All targets and recommendations come only from the coach's rules in `HANDOFF.md` and `docs/03-srs.md`. Never invent nutrition values.
- UI copy is Vietnamese. Number format: 1.041 and 2,1.
- **The design wins over the scaffold.** Where `tasks/` or existing code conflicts with `design/`, follow `design/` and the "Design overrides the scaffold" section of `HANDOFF.md`.
- No "Coach" tags or chips in the UI.
- Fortify Kitchen menu sync is kept for later. Do not build it.
- Out of scope: Redis, Asynq, Meilisearch and gamification.

## UI
- Rebuild the screens in `design/screens/*.dc.html` as React components. Skip the `Browser*` files; they only wrap phone screens in a Safari frame.
- Mobile first: 390 px phone. At 1024 px and up, use the `Desktop*` layouts.
- Every tap target is at least 44 px. Use real buttons, links and labels, and add `aria` attributes as in the designs.

## How to work (every task)
1. **Plan first.** Before writing code, reply with a short plan: the screens or components involved, the files you will create or change, and anything unclear. Then build.
2. **Reuse before you create.** Check `components/` and `lib/` for an existing piece first. One component per pattern; no near-duplicates.
3. **One screen or component per commit.** Keep diffs small so they are easy to review.
4. **Build from the design file.** Open the matching `design/screens/<Name>.dc.html`. Copy its structure, spacing, copy text and sample data exactly.
5. **Check it visually.** Run the app and screenshot the screen at 390×844, and at 1440 wide if it has a Desktop version. Compare it with the design file side by side and fix any differences before committing.
6. **Don't guess.** If the design, docs and code disagree, or a value is missing, add a line to `OPEN_QUESTIONS.md` and carry on with the rest. Never invent nutrition values or copy.
7. **Log progress.** After each commit, add one line to `PROGRESS.md`: date, commit prefix, what was built, and what's left.

## Code rules
- Keep business logic out of components:
  - Targets and calculations go in `lib/targets.ts`, as pure functions with unit tests.
  - The bar level goes in `lib/levels.ts`, using `n = min(10, floor(pct/10))` and the 4 colour levels.
- Use the design tokens from `globals.css` `@theme`. No raw hex values in components.
- Format numbers with one shared helper (`lib/format.ts`, `vi-VN`: 1.041 and 2,1).
- Server Components by default. Use `"use client"` only where there is state or interaction.
- Every list or data screen handles loading (skeleton), empty and error states, as in `TodayStates`, `EmptyToday` and `ServerError`.

## Definition of done (check before every commit)
- [ ] Matches the design at 390 px (and at 1440 px for desktop screens). Copy is exact Vietnamese.
- [ ] Every tap target is at least 44 px. Buttons, links and labels are real elements; icon-only buttons have `aria-label`; focus ring is visible.
- [ ] Press feedback is scale 0.97 over 150 ms, with a `prefers-reduced-motion` fallback.
- [ ] Loading, empty and error states are handled.
- [ ] No "Coach" tags, no raw hex, no `console.log`, no `TODO` without an entry in `OPEN_QUESTIONS.md`.
- [ ] `npx tsc --noEmit`, `npm run build` and the unit tests pass.
- [ ] `PROGRESS.md` is updated.

## UI/UX skill (required for UI work)
The ui-ux-pro-max skill lives in `.agent/skills/ui-ux-pro-max/`. Read its `SKILL.md` once, and use it for every UI task:
- **Before building a screen or component,** look up the relevant UX rules, for example:
  `python3 .agent/skills/ui-ux-pro-max/scripts/search.py "form validation loading" --domain ux`
  Other domains: `chart`, `typography`, and `--stack nextjs` / `--stack shadcn` for implementation tips.
- **Before committing,** run its Quick Reference checks as a final review: §1–§3 (accessibility, touch, performance), plus §8 forms and §9 navigation where relevant.
- **Do NOT run `--design-system`** or take colours, fonts or styles from it. The H1T MICRO design is already decided in `design/` and `HANDOFF.md`. Use the skill for UX quality rules only.

## Ponytail (minimal-code skill)
Ponytail is in `.agent/skills/ponytail*/` (MIT licence included). It also loads as an always-on rule from `.agents/rules/ponytail.md`.
- **Always on, at the `full` level. Never use `ultra`:** ultra questions requirements, and the design and requirements here are already decided.
- **Before writing code,** climb its ladder: does it need to exist, then the standard library, a native browser feature, an installed package, one line, and only then minimal code. Prefer native elements, such as `<input type="date">` and `<dialog>`, over custom widgets.
- **Before each commit,** run the `ponytail-review` skill on your diff. Use `ponytail-audit` occasionally across `apps/web`.
- **Ponytail never overrides:**
  - the design (`design/`);
  - the Definition of done, which includes loading, empty and error states, 44 px targets, aria attributes, and press and reduced-motion handling;
  - the tests for `lib/targets.ts` and `lib/levels.ts`.

  When "minimal" conflicts with any of these, they win.

## Quality skills (in `.agent/skills/`)
Read each skill's `SKILL.md` before first use.
- **`test-driven-development`:** required for `lib/targets.ts`, `lib/levels.ts`, `lib/format.ts` and any calculation. Write the failing test first, then the code. The expected values must come from the coach's rules in `HANDOFF.md`, not from the code.
- **`systematic-debugging`:** use it for any bug, failing test or build error. Find the root cause before changing code, and never stack guess-fixes.
- **`verification-before-completion`:** required before every commit and every "done" report. Run the gates and the visual check, and show the evidence (command output, screenshot path). Never claim done without it.
- **`webapp-testing`** (Playwright): use it for the visual check and for click-through flows at 390×844 and 1440×900, for example Today → Add food → Today, and Micros → Vitamin tab → Nutrient detail. Save screenshots to `apps/web/.screenshots/`, which is gitignored.
  - One-time setup: `pip3 install playwright && python3 -m playwright install chromium`.
