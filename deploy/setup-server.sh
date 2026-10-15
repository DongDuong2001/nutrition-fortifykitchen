#!/usr/bin/env bash
# One-time (idempotent) server setup for a fresh Ubuntu 24.04 VPS.
# Run as root:  bash setup-server.sh
#
# Does: deploy user + SSH key, SSH hardening, ufw, fail2ban, unattended-upgrades,
# 2 GB swap, Docker Engine + compose plugin from Docker's official apt repo.
# Prints what it did. Never prints keys or secrets.
set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-deploy}"
SWAP_SIZE_GB=2
SSHD_DROPIN="/etc/ssh/sshd_config.d/00-hardening.conf"

SUMMARY=()
log()  { printf '==> %s\n' "$*"; }
done_() { SUMMARY+=("$1"); }

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root." >&2
  exit 1
fi

# shellcheck disable=SC1091
. /etc/os-release
if [ "${ID:-}" != "ubuntu" ] || [ "${VERSION_ID:-}" != "24.04" ]; then
  echo "This script targets Ubuntu 24.04 (found ${PRETTY_NAME:-unknown})." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

log "Updating apt and base packages"
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg ufw fail2ban unattended-upgrades >/dev/null
done_ "packages: ca-certificates curl gnupg ufw fail2ban unattended-upgrades"

# --- deploy user ---------------------------------------------------------------
if id "$DEPLOY_USER" >/dev/null 2>&1; then
  log "User $DEPLOY_USER already exists"
else
  log "Creating user $DEPLOY_USER"
  adduser --disabled-password --gecos "" "$DEPLOY_USER" >/dev/null
  done_ "created user $DEPLOY_USER (no password)"
fi
usermod -aG sudo "$DEPLOY_USER"

SUDOERS_FILE="/etc/sudoers.d/90-$DEPLOY_USER"
echo "$DEPLOY_USER ALL=(ALL) NOPASSWD:ALL" > "${SUDOERS_FILE}.tmp"
chmod 440 "${SUDOERS_FILE}.tmp"
visudo -cf "${SUDOERS_FILE}.tmp" >/dev/null
mv "${SUDOERS_FILE}.tmp" "$SUDOERS_FILE"
done_ "sudo for $DEPLOY_USER without a password (login is key-only)"

DEPLOY_HOME="$(getent passwd "$DEPLOY_USER" | cut -d: -f6)"
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$DEPLOY_HOME/.ssh"
AUTH_KEYS="$DEPLOY_HOME/.ssh/authorized_keys"
touch "$AUTH_KEYS"
if [ -s /root/.ssh/authorized_keys ]; then
  # append only keys that are not already there
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    grep -qxF "$line" "$AUTH_KEYS" || printf '%s\n' "$line" >> "$AUTH_KEYS"
  done < /root/.ssh/authorized_keys
fi
chown "$DEPLOY_USER:$DEPLOY_USER" "$AUTH_KEYS"
chmod 600 "$AUTH_KEYS"
KEY_COUNT="$(grep -cE '^(ssh-|ecdsa-|sk-)' "$AUTH_KEYS" || true)"
done_ "SSH keys for $DEPLOY_USER: $KEY_COUNT (copied from root authorized_keys)"

# --- SSH hardening (only when the deploy user can actually log in) -------------
if [ "$KEY_COUNT" -gt 0 ]; then
  log "Disabling root and password SSH login"
  cat > "$SSHD_DROPIN" <<SSHD
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
SSHD
  # 00- prefix: sshd uses the first value it reads, so this wins over cloud-init drop-ins.
  sshd -t
  systemctl reload ssh 2>/dev/null || systemctl restart ssh
  done_ "ssh: root login and password login disabled ($SSHD_DROPIN)"
else
  log "SKIPPED SSH hardening: no SSH key found for $DEPLOY_USER (would lock you out)"
  done_ "ssh: NOT hardened, add a key to /root/.ssh/authorized_keys and re-run"
fi

# --- firewall ------------------------------------------------------------------
log "Configuring ufw"
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw allow 22/tcp >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw allow 443/udp >/dev/null
ufw --force enable >/dev/null
done_ "ufw: deny incoming, allow 22/tcp 80/tcp 443/tcp 443/udp"

# --- fail2ban ------------------------------------------------------------------
log "Configuring fail2ban"
cat > /etc/fail2ban/jail.d/sshd.local <<'F2B'
[sshd]
enabled = true
backend = systemd
maxretry = 5
findtime = 10m
bantime = 1h
F2B
systemctl enable --now fail2ban >/dev/null 2>&1
systemctl restart fail2ban
done_ "fail2ban: sshd jail (5 tries / 10 min, 1 h ban)"

# --- unattended upgrades -------------------------------------------------------
log "Enabling unattended-upgrades"
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'APT'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT
systemctl enable --now unattended-upgrades >/dev/null 2>&1
done_ "unattended-upgrades enabled (security updates)"

# --- swap ----------------------------------------------------------------------
if swapon --show --noheadings | grep -q .; then
  log "Swap already active"
  done_ "swap: already present, left unchanged"
else
  log "Creating ${SWAP_SIZE_GB} GB swap"
  if [ ! -f /swapfile ]; then
    fallocate -l "${SWAP_SIZE_GB}G" /swapfile
    chmod 600 /swapfile
    mkswap /swapfile >/dev/null
  fi
  swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  done_ "swap: ${SWAP_SIZE_GB} GB at /swapfile"
fi
echo 'vm.swappiness=10' > /etc/sysctl.d/99-swappiness.conf
sysctl -q -p /etc/sysctl.d/99-swappiness.conf

# --- Docker --------------------------------------------------------------------
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  log "Docker and the compose plugin are already installed"
  done_ "docker: already installed ($(docker --version | cut -d, -f1))"
else
  log "Installing Docker Engine from Docker's apt repository"
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin >/dev/null
  done_ "docker: installed ($(docker --version | cut -d, -f1))"
fi
systemctl enable --now docker >/dev/null 2>&1
usermod -aG docker "$DEPLOY_USER"
done_ "$DEPLOY_USER added to the docker group (takes effect on next login)"

echo
echo "Server setup finished. What was done:"
for line in "${SUMMARY[@]}"; do
  printf '  - %s\n' "$line"
done
echo
echo "Next: open a NEW terminal and check 'ssh ${DEPLOY_USER}@<server-ip>' works before closing this session."
