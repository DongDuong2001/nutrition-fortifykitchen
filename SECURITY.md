# Security Policy

## 1. Supported Versions

Security updates and patches are actively maintained for the following versions:

| Component | Supported Version | Status |
| :--- | :--- | :--- |
| `apps/api` (Go Backend) | >= 1.24 | Supported |
| `apps/web` (Next.js Frontend) | >= 16.0 | Supported |
| PostgreSQL Schema | 17.x | Supported |

---

## 2. Reporting a Vulnerability

If you discover a security vulnerability within this project, please follow the responsible disclosure process below:

1. **Do not open a public GitHub issue** to report security vulnerabilities.
2. Email the maintainers directly with details of the vulnerability.
3. Include the following information in your report:
   - Detailed description of the vulnerability.
   - Exact steps or proof-of-concept to reproduce the behavior.
   - Affected endpoints, packages, or components.
   - Potential impact and severity assessment.

Maintainers will acknowledge receipt of your report within 48 hours and provide updates until the issue is resolved and published.

---

## 3. Authentication & Access Control

### Supabase Auth JWT Verification
- All authenticated API routes under `/api/v1/diary/*`, `/api/v1/foods/*`, and `/api/v1/admin/*` require a valid Bearer token in the `Authorization` header.
- The backend verifies the token and extracts the `user_id` into the request context.
- Admin endpoints strictly enforce Role-Based Access Control (RBAC). Access is restricted to users whose `nutrition.profiles.role` is `admin` (looked up by the authenticated user id; the JWT `app_metadata.role` claim is ignored). Requests failing this condition receive HTTP 403 Forbidden.

### Webhook Signature Verification
- **PayOS VietQR Gateway (`/api/v1/payments/webhook`)**:
  All incoming payloads are verified using HMAC-SHA256 with the configured checksum key. Payloads with mismatched signatures are rejected immediately.
- **GitHub Vault (`/api/v1/vault/webhook`)**:
  Webhook deliveries are validated using HMAC-SHA256 signature verification matching the `X-Hub-Signature-256` header against `GITHUB_VAULT_WEBHOOK_SECRET`.

---

## 4. Secret Management & Best Practices

- Never commit private credentials, tokens, or environment files (`.env`, `.env.local`) to source control.
- Always use fine-grained GitHub Personal Access Tokens (PAT) scoped strictly to required repositories.
- In production deployments, ensure `DATABASE_URL` connections enforce SSL (`sslmode=require` or `sslmode=verify-full`).
