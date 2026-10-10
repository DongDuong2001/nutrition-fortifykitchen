# Task Runner Execution Rules

## Core Directive
When executing tasks from this folder, AI Agent must complete tasks sequentially. Never start task N+1 until task N passes build and typecheck.

## Execution Constraints
1. **Strict Sequential Order**:
   - `01_database_and_auth.md`
   - `02_go_core_diary_logic.md`
   - `03_vault_sync_and_admin.md`
   - `04_nextjs_diary_ui.md`
2. **Quality Gates Before Proceeding**:
   - `apps/api`: Must pass `go vet ./...` and `go test ./...` with zero compilation errors.
   - `apps/web`: Must pass `npm run build` or `npx tsc --noEmit` with zero type errors.
3. **Architectural Scope**:
   - Do NOT introduce Redis, Asynq, Meilisearch, or public gamification.
   - Adhere strictly to Go 1.24+ modular monolith and Next.js latest App Router.
   - Keep prepared statements enabled on PostgreSQL 17 session mode (port 5432).
