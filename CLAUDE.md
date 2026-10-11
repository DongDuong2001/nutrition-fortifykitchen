# Claude Code: project instructions

@AGENTS.md

The shared rules above apply to every agent. Everything below applies only to Claude Code.

## Context to load (read on demand, not all at once)
- `HANDOFF.md` and `design/SPEC.md`: design source of truth.
- `PROGRESS.md`: what's done, plus the **Now working** board.
- `docs/` (00–06, nutrient-catalog.md): read only the section a task needs.
- `design/screens/<Screen>.dc.html`: open only the screens named in the task.

## Working alongside Antigravity
- Claude Code works in its **own git worktree** at `../nutrition-fk-claude` on its own branch, `feat/ui-cc-<task>`. Never edit the main checkout.
- Before starting, add your task to the **Now working** table in PROGRESS.md (owner = Claude Code, plus the files or routes you'll touch). Don't touch files that another row has claimed.
- **Port 3101** for Claude Code (Antigravity owns 3100). The port rules in AGENTS.md apply with 3101 instead of 3100. For `npm run test:align`, set `ALIGN_BASE_URL=http://localhost:3101`.
- When done, rebase onto `feat/ui`, run all gates, then merge with `--ff-only` into `feat/ui` yourself after the gates pass. Push only when the user approves.
- After merging, switch the worktree back to your feat/ui-cc-* branch; never leave it on feat/ui.

## Saving quota
- Default model: Haiku (high effort). Switch to Sonnet (medium) only for changes to shared code (`lib/`, `components/ui`) or tricky bugs. Don't use Opus or extra-high effort unless the user asks.
- Use subagents for broad searches ("where is X used") so file dumps stay out of the main context.
- Read files in ranges. Never paste whole design files or lockfiles into the conversation.
- Run `/clear` between tasks, and `/compact` when a task runs long.
- Keep replies short: what changed, the gate output and the screenshot paths. No recaps.
