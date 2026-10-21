# Database Backup and Restore Guide

This document describes the automated backup architecture and the procedure for decrypting and restoring PostgreSQL database snapshots for H1T MICRO.

---

## 1. Automated Backup Pipeline

The GitHub Actions workflow `.github/workflows/db-backup.yml` executes daily at 19:00 UTC (02:00 AM Asia/Ho_Chi_Minh) and supports manual on-demand execution.

### Schemas & Tables Dumped
- **`nutrition` schema**: Contains all foods, diary logs, user profiles, targets, and coaching records.
- **`auth` schema**: Essential user authentication identities (`auth.users`, `auth.identities`) required to satisfy foreign key constraints with `nutrition.profiles.user_id` and `nutrition.diary_logs.user_id`.

### Excluded Ephemeral & Security-Sensitive Tables
To prevent storing active tokens or session artifacts in cold storage backups, the following tables are explicitly excluded via `--exclude-table`:
- `auth.sessions`
- `auth.refresh_tokens`
- `auth.one_time_tokens`
- `auth.flow_state`
- `auth.mfa_challenges`
- `auth.audit_log_entries`

### Asymmetric Encryption
The database dump is compressed with `gzip -9` and encrypted before leaving the CI runner using **GPG asymmetric encryption**:
- **CI Secret (`BACKUP_GPG_PUBLIC_KEY`)**: Contains only the public key. The CI runner can encrypt snapshots, but cannot decrypt them.
- **Private Key**: Stored securely offline in an encrypted hardware key or administrator password vault. It is never placed into CI secrets or server environment variables.
- Output file format: `nutrition_backup_YYYYMMDD_HHMMSS.sql.gz.gpg`

---

## 2. Decryption Procedure

To decrypt a backup downloaded from Cloudflare R2 / S3 or GitHub Actions artifacts:

### Prerequisites
- GnuPG (`gpg`) installed on your local administrative workstation.
- Your GPG private key imported into your local GPG keyring:
  ```bash
  gpg --import admin-private-key.asc
  ```

### Decrypt and Decompress
Run the following command to decrypt and decompress in a single streaming pipeline:
```bash
gpg --decrypt nutrition_backup_YYYYMMDD_HHMMSS.sql.gz.gpg | gunzip > restore.sql
```

Alternatively, decrypt and uncompress in two steps:
```bash
# 1. Decrypt GPG envelope
gpg --decrypt --output backup.sql.gz nutrition_backup_YYYYMMDD_HHMMSS.sql.gz.gpg

# 2. Decompress gzip archive
gunzip -k backup.sql.gz
```

---

## 3. Database Restoration Procedure

Once `restore.sql` is ready, restore into the target PostgreSQL database:

### Safety Precautions
1. Verify database target URL. Never run a restore against production without an explicit scheduled maintenance window.
2. Ensure you have created a fresh pre-restore backup of the current database before proceeding.

### Execute Restore
Use `psql` to execute the restore script. Using `--single-transaction` ensures the restore either commits completely or rolls back on any error:
```bash
psql "$DATABASE_URL" \
  --single-transaction \
  --set ON_ERROR_STOP=on \
  --file=restore.sql
```

### Post-Restore Verification
After the command completes successfully:
1. Verify tables in `nutrition` and `auth`:
   ```sql
   SELECT count(*) FROM nutrition.foods;
   SELECT count(*) FROM nutrition.profiles;
   SELECT count(*) FROM auth.users;
   ```
2. Verify foreign key constraints between `nutrition.profiles` and `auth.users`:
   ```sql
   SELECT p.user_id FROM nutrition.profiles p
   LEFT JOIN auth.users u ON p.user_id = u.id
   WHERE u.id IS NULL;
   ```
   (Should return 0 rows).
3. Test logging in via the web application to confirm user sessions and profiles are operational.
