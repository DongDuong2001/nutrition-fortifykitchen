# Agent rules: H1T MICRO

Read these before any task: `HANDOFF.md`, `design/SPEC.md`, `docs/`, then `tasks/00_task_runner_rules.md`.
Antigravity: also follow .agent/rules/antigravity.md.

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
- **Information architecture v2 is decided: `design/IA-v2.md`** (tabs, routes, redirects, build order). It is the source of truth for navigation and screen jobs.
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
  - Playwright and Chromium are **already installed** on this machine.
  - For `test:align`, `ALIGN_BASE_URL` defaults to `http://localhost:3100`. Claude Code sets `ALIGN_BASE_URL=http://localhost:3101`.
  - Only if `python3 -c "import playwright"` fails, or launching Chromium errors with "Executable doesn't exist", stop and tell the user. Don't install anything yourself.

## Dev server and ports
Always use **your agent's fixed port**: **3100 for Antigravity, 3101 for Claude Code**. Never pick any other port. The steps below say 3100; Claude Code reads them as 3101.
1. Before starting a server, check the port: `lsof -nP -iTCP:3100 -sTCP:LISTEN`.
   - If our own Next.js server (from `apps/web`) is already running there, **reuse it** and don't start another.
   - If something else is on 3100, or a stale server of ours, stop it: `lsof -tiTCP:3100 -sTCP:LISTEN | xargs kill` (use `kill -9` if it survives). Then start: `npm run dev -- -p 3100`.
2. For a production check, stop the dev server first, then `npm run build && npx next start -p 3100`.
3. Never start servers on 3000–3099 or other ports, and don't ask the user to open a new one.
4. When a task is done, stop any server you started, unless the user asked to keep it running.
5. Playwright screenshots use `http://localhost:3100`.

## Layout and alignment rules (hard rules, checked in review)
1. **Spacing scale only.** Use 4 · 8 · 12 · 16 · 20 · 24 · 32 px (Tailwind 1, 2, 3, 4, 5, 6, 8). No other margins, paddings or gaps.
2. **Shared edges.** Inside a card or panel, every row starts and ends on the same left and right edges. No row stops short, leaving a ragged right side.
3. **Rows that sit above one another share one grid.** If a row of stats sits under a row of chips or inputs, both use the same `grid grid-cols-N` with the same gap, so item *i* is directly above item *i*. Use one text alignment per grid (all centered or all start), never a mix.
4. **Fill or align, never float.** A row of N controls is either a full-width equal-column grid, or a start-aligned flex row with a defined gap. Never leave leftover space without a reason.
5. **No truncating meaningful text.** Tips, food names and nutrient names wrap to a second line (`line-clamp-2` at most). Ellipsis is only for user-generated long strings, with the full text in `title`.
6. **One control per action.** Don't add an icon button that does the same thing as a visible text link.
7. **Use the shared primitives.** Use `ChipGroup`, `StatGroup`, `FormRow` and `Card` sections from `components/ui` instead of hand-built rows. If a primitive is missing, create it there first.

### Alignment self-check (required before "done")
- Run the Playwright alignment check, `apps/web/tests/alignment.spec.ts`. Every element with `data-align-group="<name>"` must share left and right edges within 1 px with the other members of its group. Put the attribute on the rows of every card, panel and sheet you build.
- In PROGRESS.md, write one line per screen: "Edges: <groups checked> pass".
- Open each screenshot at 390 and 1440 and look specifically at column alignment and right edges. Don't just confirm that the screen renders.

## Two agents in this repo (Antigravity + Claude Code)
- Each Claude Code works in its own clone of the repo on its `feat/ui-cc-*` (or `feat/ui-cc2-*`) branch and fast-forwards `feat/ui` itself after the gates pass. Antigravity works on `feat/ui-ag-*` branches only.
- **Now working board:** before starting a task, add a row to the "Now working" table at the top of PROGRESS.md (task, owner, files or routes). Remove it when done. Never edit files claimed by the other agent's row; if you must, stop and tell the user.
- Who may edit which files: see **File ownership** below.

## File ownership
- Claude Code owns everything under apps/web, and is the only agent that commits to feat/ui. The exception is the files of an active Antigravity side-job branch (feat/ui-ag-<task>) that are listed on the Now working board: those are Antigravity's until the row is cleared.
- Antigravity works only on its own branch feat/ui-ag-<task>, never commits to feat/ui, and touches only the files its task names. Claude Code merges its branches.
- **Lanes:** three workers, each with its own port (see Dev server and ports).
  - Antigravity: branches feat/ui-ag-<task>, port 3100.
  - Claude Code: branches feat/ui-cc-<task>, port 3101, in its own clone.
  - Claude Code #2: branches feat/ui-cc2-<n>, port 3102, in its own clone.
- **Every worker:** `git fetch && git rebase origin/feat/ui` before each task. Before merging, rebase again, re-run the gates, then `git merge --ff-only` into feat/ui and push feat/ui only. Never merge commits and never force-push.
- Claim your files on the **Now working** board before editing. Never edit a file another active task has claimed.
- Tests follow their file: lib/__tests__/<name>.test.ts belongs to the owner of lib/<name>.
- Dong's: lib/api-client, lib/supabase-client, apps/api, migrations (UI agents may only read; mock changes go through OPEN_QUESTIONS).
- Dong's backend build plan and decisions: `docs/08-backend-plan.md`.
- Anything not listed: ask in OPEN_QUESTIONS before editing.
- Antigravity needs a change outside its task files? Add one line to OPEN_QUESTIONS and continue without it; never edit directly.
- Both may append to PROGRESS, OPEN_QUESTIONS and BACKLOG. When the user says stop, no agent edits anything until told to continue.

## Commands (so they run without permission prompts)
Run routine work only through these npm scripts in `apps/web`. The user has auto-approved commands that start with `npm run`; anything else may stop and ask.
| Need | Command |
|---|---|
| Free your port (only if held) | `npm run port:free` |
| Start the dev server | `npm run dev:3100` (Claude Code: `npm run dev:3101`) |
| Core gates (typecheck → test → build:demo → test:align → test:hydration, stop at first failure; needs a prod server on ALIGN_BASE_URL) | `npm run check` |
| Demo build for the gates and probes (a plain `npm run build` has no ?demo, ?as or ?level) | `npm run build:demo` |
| Single gate | `npm run typecheck` / `npm run test` / `npm run build` / `npm run test:align` / `npm run test:hydration` |
| Smoke, every route at 390 and 1280 | `npm run probe -- tests/probes/smoke.py` |
| Full probe suite (slow, see below; `PROBE_WORKERS=3` runs three at once, about 12 min instead of 33) | `npm run probe:all` |
- **If any of these scripts is missing, add it to `apps/web/package.json` first** (one small commit, "chore: npm scripts for gates and ports"). `port:free` takes the port from `PORT` (default 3100), frees it only if something is listening, and prints what it did. Use a small Node or shell script in `apps/web/scripts/`, not a pipe in package.json.
- Don't chain raw shell commands (`lsof … | xargs kill`, `cd … && …`) for routine work. Use the scripts.
- **No inline scripts.** Never run `python3 -c "…"`, `node -e "…"` or heredoc scripts. Each one is a new command, so the user has to approve it every time. Put any browser or storage check (Playwright, sessionStorage, page text, screenshots) in a file under `apps/web/tests/probes/<name>.py` and run it with `npm run probe -- tests/probes/<name>.py`. Reuse and edit existing probe files; don't make a new one per run. Read `ALIGN_BASE_URL` for the port (default 3100).
- **If `probe` is missing**, add `"probe": "node scripts/probe.mjs"` to `apps/web/package.json`. `scripts/probe.mjs` runs `python3 <file>` only when the path is inside `tests/probes/` and ends in `.py`; otherwise it exits 1 with a message.
- **Gates per merge (Hao 15/10):** `npm run check` (typecheck, test, build, test:align, test:hydration on a prod server), smoke at 390 and 1280, the task's own probe, and every existing probe that visits a route or covers a file the task changed (grep `tests/probes` for the routes).
- **Full `npm run probe:all`:** nightly and before a release, recorded in PROGRESS.md. It takes 25 to 35 minutes, so it is not run on every task.
- A probe that tests a feature you removed or renamed is updated or deleted in the same commit, never left failing.
- These always need the user's approval, so don't try to work around them: `git push`, `rm`, `git reset`, `npm install`/`pip install`, anything with `sudo` or `curl`, and anything touching `migrations/`, `apps/api/` or `.env`.
