#!/usr/bin/env bash
set -euo pipefail

secrets_dir="${HOME_AI_CONFIG_DIR:-$HOME/.config/home-ai}"
secrets_file="${HOME_AI_SECRETS_FILE:-$secrets_dir/home-core.env}"
legacy_file="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/.env"

mkdir -p "$secrets_dir"
if [[ ! -e "$secrets_file" ]]; then
  if [[ -f "$legacy_file" ]]; then
    cp "$legacy_file" "$secrets_file"
  else
    cp "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/.env.example" "$secrets_file"
  fi
fi

chmod 600 "$secrets_file"
printf 'Secrets Home Core persistants : %s\n' "$secrets_file"
printf 'Configurez les valeurs manquantes dans ce fichier, puis lancez docker compose up -d --build.\n'
