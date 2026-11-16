# ADR-0010 — Secrets locaux persistants hors worktree

## Contexte

Les clés des fournisseurs externes ne doivent pas être versionnées. Un fichier `.env` ignoré dans un worktree est toutefois perdu ou absent lorsqu'une nouvelle branche ou un nouveau worktree est utilisé, ce qui rend le démarrage de Home Core dépendant du checkout courant.

## Décision

La configuration sensible de Home Core est conservée dans un fichier hors dépôt avec les permissions `600`. Docker Compose charge le chemin fourni par `HOME_AI_SECRETS_FILE` ; son chemin par défaut de déploiement est `/etc/home-ai/home-core.env`. Le script `scripts/bootstrap-secrets.sh` crée par défaut `~/.config/home-ai/home-core.env` pour le développement local, à transmettre explicitement via `HOME_AI_SECRETS_FILE`, puis réapplique les permissions à chaque exécution.

Le fichier reste hors dépôt et n'est jamais copié dans l'image Docker. Les variables sont injectées uniquement dans le conteneur Home Core au démarrage.

## Conséquences

- Les clés survivent aux merges, changements de branche, worktrees et reconstructions Docker.
- Une nouvelle machine doit créer le fichier, renseigner les valeurs manquantes et définir `HOME_AI_SECRETS_FILE` si son chemin diffère de `/etc/home-ai/home-core.env`.
- Le chemin peut être remplacé par `HOME_AI_SECRETS_FILE` pour un autre gestionnaire local de secrets.
