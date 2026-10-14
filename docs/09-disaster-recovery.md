# H1T MICRO — Database Backup & Disaster Recovery Runbook

## 1. Overview & Service Level Objectives

This runbook establishes standard operational procedures for database backup, point-in-time recovery, and disaster recovery across H1T MICRO's PostgreSQL database infrastructure.

### Service Level Objectives (SLOs)
- **Recovery Point Objective (RPO)**:
  - **With Supabase PITR (Point-in-Time Recovery)**: < 2 minutes (continuous WAL archiving).
  - **With Offsite Daily Dumps**: < 24 hours (daily logical backup at 02:00 AM Asia/Ho_Chi_Minh).
- **Recovery Time Objective (RTO)**:
  - **Dashboard Point-in-Time Restore**: < 15 minutes.
  - **Full Logical Dump Restoration via `psql`**: < 30 minutes.

---

## 2. The 3-Pillar Backup Architecture

| Pillar | Mechanism | Frequency | Storage Location | Retention | Primary Protection |
|---|---|---|---|---|---|
| **1. Cloud Managed** | Supabase Automated Daily Backups + PITR | Continuous WAL + Daily 00:00 UTC snapshot | Supabase AWS infrastructure | 7 to 30 days | Operational mistakes, accidental deletion, rapid rollback |
| **2. Offsite Cold Storage** | GitHub Actions Workflow (`db-backup.yml`) | Daily at 02:00 AM VN (`cron: '0 19 * * *'`) | AWS S3 / Cloudflare R2 bucket + GitHub Artifacts | 30 days (S3/R2), 7 days (Artifacts) | Cloud region outage, provider lockout, disaster recovery |
| **3. Pre-Migration Guard** | `make db-backup` CLI | Manual / Pre-migration | Local / Staging storage (`backups/`) | Operational lifecycle | Destructive migration safety, pre-deploy snapshot |

---

## 3. Operational Runbooks

### Scenario A: Accidental Deletion or Corrupted User Data

When records from `nutrition.diary_logs`, `nutrition.profiles`, or `nutrition.weight_logs` are deleted or corrupted due to an application bug or accidental operator action:

#### Option 1: Supabase Point-in-Time Recovery (Recommended for PITR-enabled projects)
1. Navigate to the Supabase Dashboard: **Project Settings** > **Database** > **Backups**.
2. Select **Point in Time**.
3. Choose the exact timestamp (e.g., 5 minutes prior to the incident).
4. Initiate restore to a temporary clone or directly restore the database.
5. Extract the affected records and merge back into production.

#### Option 2: Extracting Rows from the Latest Logical Dump
1. Download the latest backup from the S3/R2 bucket or GitHub Actions artifacts:
   ```bash
   aws s3 cp s3://$BACKUP_BUCKET/backups/nutrition_backup_YYYYMMDD_HHMMSS.sql.gz ./latest_backup.sql.gz
   ```
2. Decompress and restore into a temporary local or scratch database:
   ```bash
   createdb temp_recovery
   gunzip -c latest_backup.sql.gz | psql postgresql://postgres:postgres@localhost:5432/temp_recovery
   ```
3. Export only the missing user records:
   ```sql
   \copy (SELECT * FROM nutrition.diary_logs WHERE user_id = '<affected-user-uuid>') TO 'restored_entries.csv' CSV HEADER;
   ```
4. Import into production:
   ```sql
   \copy nutrition.diary_logs FROM 'restored_entries.csv' CSV HEADER;
   ```

---

### Scenario B: Rollback of a Destructive Migration

If a migration runs in production and causes unexpected schema damage:
1. Immediately inspect the down migration script in `migrations/*_*.down.sql`.
2. If the down script cannot restore deleted columns or tables, restore the pre-migration snapshot taken before the deploy:
   ```bash
   make db-restore FILE=backups/nutrition_backup_pre_migration.sql.gz
   ```
3. Verify table schema and data integrity:
   ```sql
   SELECT count(*) FROM nutrition.foods;
   SELECT count(*) FROM nutrition.diary_logs;
   ```

---

### Scenario C: Complete Cloud / Infrastructure Disaster Recovery

If the Supabase project is corrupted, inaccessible, or subject to a major regional outage:

1. **Provision New PostgreSQL 17 Instance**:
   - Create a new project in Supabase (or provision an AWS RDS / Neon / self-hosted PostgreSQL 17 instance).
2. **Fetch the Latest Offsite Backup**:
   ```bash
   aws s3 cp s3://$BACKUP_BUCKET/backups/<latest-backup>.sql.gz ./disaster_recovery.sql.gz
   ```
3. **Verify Archive Integrity**:
   ```bash
   gzip -t disaster_recovery.sql.gz
   sha256sum disaster_recovery.sql.gz
   ```
4. **Initialize Extensions & Auth Schema**:
   ```sql
   CREATE EXTENSION IF NOT EXISTS "pgcrypto";
   CREATE EXTENSION IF NOT EXISTS "unaccent";
   CREATE EXTENSION IF NOT EXISTS "pg_trgm";
   ```
5. **Stream Restore Schema & Data**:
   ```bash
   gunzip -c disaster_recovery.sql.gz | psql "$NEW_DATABASE_URL"
   ```
6. **Apply Latest Migrations**:
   ```bash
   DATABASE_URL="$NEW_DATABASE_URL" make db-migrate
   ```
7. **Update API Environment Variables**:
   - Update `DATABASE_URL` in Render / Cloud container environment settings.
   - Restart the Go API service and verify `/healthz`:
     ```bash
     curl -i https://api.h1tmicro.app/healthz
     ```
   - Expect HTTP 200 with `"status": "healthy"`, `"database": "healthy"`.

---

## 4. Disaster Recovery Drills & Verification

To verify that backups remain recoverable:
1. **Quarterly Drill**: Every quarter, the lead engineer downloads the latest automated S3 backup and restores it into a clean Docker PostgreSQL container.
2. **Success Criteria**:
   - Script completes without unhandled errors.
   - All 5 core tables exist under schema `nutrition`: `profiles`, `foods`, `diary_logs`, `weight_logs`, `coach_drafts`.
   - Record counts match the production snapshot within expected tolerances.
