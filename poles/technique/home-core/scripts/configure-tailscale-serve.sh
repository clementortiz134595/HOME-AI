#!/usr/bin/env bash
set -euo pipefail

panel_port="${HOME_PANEL_PORT:-13000}"
panel_serve_port="${TAILSCALE_PANEL_SERVE_PORT:-8443}"
home_app_port="${HOME_APP_TLS_PORT:-13444}"
home_app_serve_port="${TAILSCALE_HOME_APP_SERVE_PORT:-8444}"

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

if ! curl --insecure --fail --silent --show-error --output /dev/null "https://127.0.0.1:${home_app_port}/"; then
  printf '%s\n' "Home App ne répond pas sur 127.0.0.1:${home_app_port}. Démarrez d'abord sa pile Docker."
  exit 1
fi

tailscale serve --https="${panel_serve_port}" --bg "${panel_port}"
tailscale serve --https="${home_app_serve_port}" --bg "https+insecure://127.0.0.1:${home_app_port}"
tailscale serve status

printf '%s\n' "Home Panel et Home App sont exposés uniquement au tailnet Tailscale. Vérifiez les URL HTTPS affichées depuis un appareil autorisé."
