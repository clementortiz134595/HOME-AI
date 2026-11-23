#!/usr/bin/env bash
set -euo pipefail

# Deploy a Git tag from a clean clone on the Raspberry Pi. This script is
# intentionally pull-based: GitHub validates the release, while the Pi keeps
# no inbound deployment endpoint and remains the builder for its ARM64 image.

usage() {
  printf '%s\n' "Usage: $0 <git-tag> | --rollback"
}

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repository_root="$(cd "$script_dir/../../../.." && pwd)"
state_dir="${HOME_AI_DEPLOY_STATE_DIR:-$HOME/.local/state/home-ai}"
last_success_file="$state_dir/last-successful-revision"
previous_success_file="$state_dir/previous-successful-revision"
health_url="${HOME_AI_HEALTH_URL:-http://127.0.0.1:18080/healthz}"
home_panel_health_url="${HOME_AI_HOME_PANEL_HEALTH_URL:-http://127.0.0.1:${HOME_PANEL_PORT:-13000}/}"
home_app_health_url="${HOME_AI_HOME_APP_HEALTH_URL:-https://127.0.0.1:${HOME_APP_TLS_PORT:-13444}/}"
home_app_override="${HOME_AI_HOME_APP_COMPOSE_OVERRIDE:-$HOME/.config/home-ai/home-app.compose.override.yaml}"
deploy_env_file="${HOME_AI_DEPLOY_ENV_FILE:-$HOME/.config/home-ai/deploy.env}"
wait_timeout="${HOME_AI_DEPLOY_WAIT_TIMEOUT:-180}"
default_home_app_certs_dir="$HOME/.config/home-ai/home-app-certs"
image_registry="${HOME_AI_IMAGE_REGISTRY:-}"
if [[ -z "$image_registry" && -f "$deploy_env_file" ]]; then
  image_registry="$(sed -n 's/^HOME_AI_IMAGE_REGISTRY=//p' "$deploy_env_file" | tail -1)"
fi

if [[ $# -ne 1 ]]; then
  usage
  exit 2
fi

# The GitHub runner is a systemd service and does not inherit the interactive
# shell environment used by the legacy Home App service. Prefer the per-user
# directory when it exists; an explicit HOME_APP_CERTS_DIR remains authoritative.
if [[ -z "${HOME_APP_CERTS_DIR:-}" && -d "$default_home_app_certs_dir" ]]; then
  export HOME_APP_CERTS_DIR="$default_home_app_certs_dir"
fi
home_app_certs_dir="${HOME_APP_CERTS_DIR:-/etc/home-ai/home-app-certs}"

validate_home_app_certificates() {
  local certificate_file="$home_app_certs_dir/home-app.pem"
  local private_key_file="$home_app_certs_dir/home-app-key.pem"

  if [[ ! -r "$certificate_file" || ! -r "$private_key_file" ]]; then
    printf 'Certificats HTTPS Home App introuvables ou illisibles dans %s. Déploiement annulé avant modification des conteneurs.\n' "$home_app_certs_dir" >&2
    return 1
  fi
}

cd "$repository_root"

if ! command -v docker >/dev/null 2>&1; then
  printf '%s\n' "Docker est requis pour déployer HOME AI." >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  printf '%s\n' "curl est requis pour vérifier Home Core après le déploiement." >&2
  exit 1
fi

if [[ -n "$(git status --porcelain --untracked-files=all)" ]]; then
  printf '%s\n' "Le clone de déploiement contient des modifications. Abandon du déploiement pour ne rien écraser." >&2
  exit 1
fi

mkdir -p "$state_dir"

deploy_revision() {
  local revision="$1"

  if [[ -n "$image_registry" ]]; then
    local image_tag="${HOME_AI_IMAGE_TAG:-$(git tag --points-at "$revision" | sort -V | tail -1)}"
    if [[ -z "$image_tag" ]]; then
      printf '%s\n' "Impossible de déterminer le tag d'image pour $revision." >&2
      return 1
    fi
    export HOME_AI_HOME_CORE_IMAGE="${HOME_AI_HOME_CORE_IMAGE:-$image_registry/home-core:$image_tag}"
    export HOME_AI_HOME_PANEL_IMAGE="${HOME_AI_HOME_PANEL_IMAGE:-$image_registry/home-panel:$image_tag}"
    export HOME_AI_HOME_APP_IMAGE="${HOME_AI_HOME_APP_IMAGE:-$image_registry/home-app:$image_tag}"
  fi

  git checkout --detach "$revision"
  if ! docker network inspect home-ai >/dev/null 2>&1; then
    docker network create home-ai >/dev/null
  fi

  local -a home_ai_compose=(docker compose)
  if [[ -f "$deploy_env_file" ]]; then
    home_ai_compose+=(--env-file "$deploy_env_file")
  fi
  home_ai_compose+=(--project-name home-ai)
  if [[ -n "$image_registry" ]]; then
    "${home_ai_compose[@]}" pull home-core home-panel
    "${home_ai_compose[@]}" up -d --no-build --wait --wait-timeout "$wait_timeout"
  else
    "${home_ai_compose[@]}" up -d --build --wait --wait-timeout "$wait_timeout"
  fi
  curl --fail --silent --show-error --output /dev/null "$health_url"
  curl --fail --silent --show-error --output /dev/null "$home_panel_health_url"

  local -a home_app_compose=(
    docker compose
    --project-name home-app
    --file poles/technique/home-app/compose.production.yaml
  )
  if [[ -f "$home_app_override" ]]; then
    home_app_compose+=(--file "$home_app_override")
  fi
  if [[ -n "$image_registry" ]]; then
    "${home_app_compose[@]}" pull app
    "${home_app_compose[@]}" up -d --no-build --wait --wait-timeout "$wait_timeout"
  else
    "${home_app_compose[@]}" up -d --build --wait --wait-timeout "$wait_timeout"
  fi
  curl --insecure --fail --silent --show-error --output /dev/null "$home_app_health_url"
}

current_revision="$(git rev-parse HEAD)"
current_success="$current_revision"
if [[ -f "$last_success_file" ]]; then
  current_success="$(<"$last_success_file")"
fi

if [[ "$1" == "--rollback" ]]; then
  if [[ ! -s "$previous_success_file" ]]; then
    printf '%s\n' "Aucune révision précédente enregistrée pour le rollback." >&2
    exit 1
  fi
  target_revision="$(<"$previous_success_file")"
else
  git fetch --prune --tags origin
  if ! git show-ref --verify --quiet "refs/tags/$1"; then
    printf 'Le tag Git "%s" est introuvable sur origin.\n' "$1" >&2
    exit 1
  fi
  target_revision="$(git rev-parse "$1^{commit}")"
fi

validate_home_app_certificates

if ! deploy_revision "$target_revision"; then
  printf '%s\n' "Le déploiement a échoué ; retour à la révision précédente." >&2
  deploy_revision "$current_success"
  exit 1
fi

printf '%s\n' "$current_success" > "$previous_success_file"
printf '%s\n' "$target_revision" > "$last_success_file"
printf 'HOME AI est déployé sur %s.\n' "$target_revision"
