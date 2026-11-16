#!/usr/bin/env bash
set -euo pipefail

panel_port="${HOME_PANEL_PORT:-13000}"
serve_port="${TAILSCALE_SERVE_PORT:-8443}"

if ! command -v tailscale >/dev/null 2>&1; then
  printf '%s\n' "Tailscale n'est pas installé. Installez-le sur l'hôte Raspberry Pi : https://tailscale.com/download/linux"
  exit 1
fi

if ! tailscale status --json >/dev/null 2>&1; then
  printf '%s\n' "La Raspberry Pi n'est pas connectée à Tailscale. Exécutez d'abord : sudo tailscale up"
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  printf '%s\n' "curl est requis pour vérifier le Home Panel local."
  exit 1
fi

if ! curl --fail --silent --show-error --output /dev/null "http://127.0.0.1:${panel_port}/"; then
  printf '%s\n' "Le Home Panel ne répond pas sur 127.0.0.1:${panel_port}. Démarrez d'abord Docker Compose."
  exit 1
fi

tailscale serve --https="${serve_port}" --bg "${panel_port}"
tailscale serve status

printf '%s\n' "Home Panel exposé uniquement au tailnet Tailscale. Vérifiez l'URL HTTPS affichée depuis un appareil autorisé."
