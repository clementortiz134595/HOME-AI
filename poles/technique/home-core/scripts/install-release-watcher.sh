#!/usr/bin/env bash
set -euo pipefail

# Install the Pi-side timer once. Releases are then detected by polling GitHub
# from the Pi; GitHub never receives network access to the home network.

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repository_root="$(cd "$script_dir/../../../.." && pwd)"
unit_name="${HOME_AI_RELEASE_WATCHER_NAME:-home-ai-release-watcher}"
service_file="/etc/systemd/system/${unit_name}.service"
timer_file="/etc/systemd/system/${unit_name}.timer"
deploy_user="${HOME_AI_DEPLOY_USER:-$(id -un)}"

if [[ "$(id -u)" -eq 0 ]]; then
  printf '%s\n' "Exécute ce script avec ton utilisateur habituel et sudo disponible." >&2
  exit 2
fi

if ! command -v systemctl >/dev/null 2>&1; then
  printf '%s\n' "systemd est requis pour installer la surveillance des releases." >&2
  exit 1
fi

tmp_service="$(mktemp)"
tmp_timer="$(mktemp)"
trap 'rm -f "$tmp_service" "$tmp_timer"' EXIT

cat >"$tmp_service" <<EOF
[Unit]
Description=Deploy the latest HOME AI Git tag
Wants=network-online.target
After=network-online.target docker.service

[Service]
Type=oneshot
User=${deploy_user}
WorkingDirectory=${repository_root}
Environment=HOME=/home/${deploy_user}
ExecStart=${repository_root}/poles/technique/home-core/scripts/deploy-latest-release.sh
EOF

cat >"$tmp_timer" <<EOF
[Unit]
Description=Check GitHub tags for a HOME AI release

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min
RandomizedDelaySec=30s
Persistent=true
Unit=${unit_name}.service

[Install]
WantedBy=timers.target
EOF

sudo install -o root -g root -m 0644 "$tmp_service" "$service_file"
sudo install -o root -g root -m 0644 "$tmp_timer" "$timer_file"
sudo systemctl daemon-reload
sudo systemctl enable --now "${unit_name}.timer"
sudo systemctl start "${unit_name}.service"
sudo systemctl status "${unit_name}.timer" --no-pager
