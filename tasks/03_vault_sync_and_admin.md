# Task 03: GitHub Vault Sync, Admin Review & PayOS Webhook

## Objectives
1. Implement GitHub Vault Ingestion in `internal/vault`:
   - Endpoint: `POST /api/v1/vault/webhook`.
   - Verify GitHub HMAC SHA-256 signature using `GITHUB_VAULT_WEBHOOK_SECRET`.
   - Fetch updated Markdown coach files using GitHub API with `GITHUB_VAULT_PAT`.
   - Persist into `nutrition.coach_drafts` with status `draft`, file path, markdown content, and commit hash.
2. Implement Admin Review in `internal/vault`:
   - Endpoint: `GET /api/v1/admin/drafts` (List pending drafts).
   - Endpoint: `PATCH /api/v1/admin/drafts/{id}/status` (Approve to `published` or reject to `rejected`).
   - Guarded by admin middleware (`app_metadata.role == "admin"`).
3. Implement PayOS VietQR Webhook in `internal/payment`:
   - Endpoint: `POST /api/v1/payments/webhook`.
   - Verify PayOS HMAC-SHA256 checksum signature with `PAYOS_CHECKSUM_KEY`.
   - Process payment confirmation payload idempotently and return HTTP 200 with `{ "success": true }`.

## Verification
- Unit test webhook signature verifications (valid signature, tampered signature).
- Unit test draft state transitions (`draft` -> `published`, `draft` -> `rejected`).
- Pass `go vet ./...` and `go test ./...`.
