# ADR-0020 — Publier les images ARM64 avant le déploiement

## Statut

Acceptée

## Contexte

La Raspberry Pi reconstruisait Home Core, Home Panel et Home App à chaque
release. Cela compilait Go en ARM64, réinstallait les dépendances Node et
téléchargeait le modèle wake-word sur la machine domestique.

## Décision

Le workflow GitHub Actions construit les trois images en `linux/arm64` avec
Buildx et les publie dans GHCR, taguées par la release. La Raspberry Pi tire
ces images et lance Compose avec `--no-build`. Le mode local conserve le
comportement précédent lorsque `HOME_AI_IMAGE_REGISTRY` n'est pas défini.

Le fichier `deploy.env` de la Raspberry Pi configure le préfixe d'images et,
si les paquets GHCR sont privés, l'authentification Docker locale. Les tags
de release restent la source de vérité et permettent le rollback.

## Conséquences

- Le temps CPU et les téléchargements lourds sont déplacés vers GitHub Actions.
- La Pi ne compile plus lors d'un déploiement de release configuré par image.
- Une publication GHCR et une connectivité réseau deviennent nécessaires.
- Le modèle wake-word reste inclus dans l'image Home Core et est mis en cache
  par Buildx ; il n'est plus téléchargé sur la Pi.
- Le mode de développement local continue d'utiliser les builds Compose.
