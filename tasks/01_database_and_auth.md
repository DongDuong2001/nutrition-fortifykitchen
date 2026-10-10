# Task 01: Database Connection & Supabase Auth Middleware

## Objectives
1. Connect Go backend to Supabase PostgreSQL 17 using `github.com/jackc/pgx/v5/pgxpool` over port 5432 (Session mode, prepared statements supported).
2. Configure search path to include `nutrition, public`.
3. Implement HTTP authentication middleware in `internal/auth/middleware.go`:
   - Parse and validate Bearer JWT token from `Authorization` header.
   - Extract `sub` as User UUID and attach to request context (`auth.UserIDKey`).
   - Extract `app_metadata.role` and verify `app_metadata.role == "admin"` for routes under `/api/v1/admin/*`.
   - Return 401 Unauthorized for missing or invalid tokens.
   - Return 403 Forbidden when non-admin accesses admin endpoints.

## Verification
- Run database connection test against PostgreSQL 17.
- Unit test auth middleware with valid user token, valid admin token, invalid token, and missing token.
- Pass `go vet ./...` and `go test ./...`.
