# ADR-0010 — Secrets locaux persistants hors worktree

## Contexte

Les clés des fournisseurs externes ne doivent pas être versionnées. Un fichier `.env` ignoré dans un worktree est toutefois perdu ou absent lorsqu'une nouvelle branche ou un nouveau worktree est utilisé, ce qui rend le démarrage de Home Core dépendant du checkout courant.

## Décision

La configuration sensible de Home Core est conservée dans `~/.config/home-ai/home-core.env` avec les permissions `600`. Docker Compose charge ce fichier via `HOME_AI_SECRETS_FILE`, avec ce chemin comme valeur par défaut. Le script `scripts/bootstrap-secrets.sh` crée le fichier une seule fois depuis l'ancien `.env` local ou depuis `.env.example`, puis réapplique les permissions à chaque exécution.

Le fichier reste hors dépôt et n'est jamais copié dans l'image Docker. Les variables sont injectées uniquement dans le conteneur Home Core au démarrage.

## Conséquences

- Les clés survivent aux merges, changements de branche, worktrees et reconstructions Docker.
- Une nouvelle machine doit exécuter le script puis renseigner les valeurs manquantes.
- Le chemin peut être remplacé par `HOME_AI_SECRETS_FILE` pour un autre gestionnaire local de secrets.
