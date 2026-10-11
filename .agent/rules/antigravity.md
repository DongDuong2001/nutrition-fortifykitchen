# Antigravity: working rules (always on)
Read AGENTS.md first. These rules add to it and win if anything conflicts.

## Scope
- Do only what the task prompt lists. No extra refactors, renames, clean-ups or "while I'm here" changes. Put ideas in BACKLOG.md as one line each.
- Touch only files in your ownership area (AGENTS.md → File ownership) and the files the prompt names. If you need a change in Claude Code's files, add it to OPEN_QUESTIONS.md and continue without it.
- Never edit .claude/, CLAUDE.md, apps/api/, migrations/ or .env.
- Claim the task on the PROGRESS "Now working" board before the first edit; clear the row when done.

## Speed
- No long plans. At most 5 bullet lines of plan, then start. No separate plan, task-list or walkthrough documents unless the prompt asks.
- Read only the files the prompt names and the files you will change, in ranges. Don't explore the repo.
- If the prompt is unclear, take the simplest reading, note it in OPEN_QUESTIONS.md and keep going. Don't stop to ask unless the change can't be undone.
- If the same gate fails twice for the same reason, stop guessing: use systematic-debugging once, and if it still fails, stop and report.

## Stop
- When the user says stop, make no further edits or commits until told to continue.

## Quality
- No `any`, no `as` casts or index signatures added just to silence TypeScript, no raw hex in components.
- Write the test first for any logic change (test-driven-development).

## Finish
- Run `npm run check` once at the end, plus the probes the prompt lists. Show real alignment pair counts.
- One commit per task (fix rounds: "<task>-fix-N"). Author Vu Thien Minh Hao <s3938011@rmit.edu.vn>, no AI names or trailers. Don't push.
- Never write "approved" anywhere. Status is "ready for review"; only the user approves.
- In PROGRESS, write a summary of the gates (pass/fail, test count, pair counts, screenshot paths), not raw logs.
- Final report: at most 15 lines (commit hash, files changed, gate summary, screenshots, open questions). No recap of what you did.
