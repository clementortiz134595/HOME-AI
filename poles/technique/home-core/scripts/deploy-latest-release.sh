#!/usr/bin/env bash
set -euo pipefail

# Called by the Raspberry Pi timer. It remains pull-based: no inbound endpoint
# is exposed, and Docker images are built locally for the Pi architecture.

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repository_root="$(cd "$script_dir/../../../.." && pwd)"
state_dir="${HOME_AI_DEPLOY_STATE_DIR:-$HOME/.local/state/home-ai}"
last_success_file="$state_dir/last-successful-revision"

cd "$repository_root"

if [[ -n "$(git status --porcelain --untracked-files=all)" ]]; then
  printf '%s\n' "Le clone de déploiement contient des modifications. Vérification de release abandonnée pour ne rien écraser." >&2
  exit 1
fi

git fetch --prune --tags origin
latest_tag="$(git tag --list 'v[0-9]*' --sort=-version:refname | sed -n '1p')"

if [[ -z "$latest_tag" ]]; then
  printf '%s\n' "Aucun tag de release v* disponible sur origin."
  exit 0
fi

target_revision="$(git rev-parse "$latest_tag^{commit}")"
if [[ -f "$last_success_file" ]] && [[ "$(<"$last_success_file")" == "$target_revision" ]]; then
  printf 'La release %s est déjà déployée.\n' "$latest_tag"
  exit 0
fi

exec "$script_dir/deploy-release.sh" "$latest_tag"
