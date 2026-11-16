# Plan Docker — Home Core

> Statut : premier socle exécutable. [`compose.yaml`](../compose.yaml) lance l'application météo ; la persistance sera ajoutée avec le premier module qui en a besoin.

## Topologie initiale

Home Core est livré comme **un conteneur applicatif unique** dans un projet Docker Compose dédié. Le monolithe contient les modules métier ; Docker ne crée pas un conteneur par module. Home Assistant reste une dépendance déjà présente sur le réseau local, et non un sous-conteneur de Home Core.

Pour activer la passerelle domotique, injecter `HOME_CORE_HOME_ASSISTANT_URL` et `HOME_CORE_HOME_ASSISTANT_TOKEN` dans Home Core. Le jeton doit provenir d'un secret d'environnement ou d'un gestionnaire de secrets et ne doit jamais être committé.

```text
Raspberry Pi ou serveur local
└── projet Docker Compose home-core
    ├── service home-core
    │   ├── API locale pour Home Panel
    │   ├── modules du monolithe
    │   └── adaptateurs vers Home Assistant, Google et IA
    └── volumes nommés
        ├── donnees applicatives
        └── sauvegardes exportables
```

## Exigences du `compose.yaml`

- Une image multi-architecture compatible avec la cible matérielle réelle (notamment ARM64 si Raspberry Pi compatible).
- Un volume persistant dédié aux données dès qu'un module stocke un état ; un chemin de sauvegarde documenté, exportable et restaurable.
- Variables non sensibles dans un fichier d'exemple versionné. Secrets injectés à l'exécution, absents du dépôt et des logs.
- Réseau Docker privé partagé `home-ai`, créé une fois avec `docker network create home-ai`. Il relie Home Core, Home Panel et Home App sans publier d'API sur le LAN. Les ports publiés sont liés à la boucle locale ; l'accès distant privé est assuré par Tailscale Serve sur l'hôte, conformément à l'[ADR-0013](../architecture/adr/0013-acces-distant-tailscale.md).
- `healthcheck`, politique de redémarrage, utilisateur non privilégié et système de fichiers en lecture seule lorsque le runtime le permet.
- Limites CPU/mémoire fondées sur des mesures de la machine cible, non sur des valeurs supposées.
- Journaux structurés vers la sortie standard, avec filtrage des secrets et des données sensibles.

## Déploiement de release sur Raspberry Pi

GitHub est la source de vérité du code. Après le succès de la CI, une release
est identifiée par un tag Git. La Raspberry Pi conserve un clone de déploiement
propre et le minuteur systemd `home-ai-release-watcher.timer` recherche les
tags `v*` toutes les cinq minutes. Lorsqu'il en trouve un nouveau, il lance
[`scripts/deploy-latest-release.sh`](../scripts/deploy-latest-release.sh), qui
appelle [`scripts/deploy-release.sh`](../scripts/deploy-release.sh).

L'installation du minuteur est une action d'administration unique :

```bash
./poles/technique/home-core/scripts/install-release-watcher.sh
```

Le script sélectionne exactement le commit du tag, reconstruit sur la Pi les
images ARM64 de Home Core, Home Panel et Home App, vérifie Home Core et Home
App, puis conserve les deux dernières révisions réussies. Le déploiement
manuel d'un tag précis reste possible :

```bash
./poles/technique/home-core/scripts/deploy-release.sh <tag>
```

Le script refuse tout clone contenant des modifications locales et restaure
le commit précédemment exécuté si le démarrage échoue. Le rollback manuel est :

```bash
./poles/technique/home-core/scripts/deploy-release.sh --rollback
```

Le clone de production est du code exécutable, jamais un espace de travail :
ne pas y éditer de fichiers ni y créer de `.env`. Les secrets restent dans
`~/.config/home-ai/` (ou le chemin défini par `HOME_AI_SECRETS_FILE`) et les
données applicatives dans les volumes Docker. L'override local optionnel de
Home App est chargé depuis `~/.config/home-ai/home-app.compose.override.yaml`.

La sauvegarde automatique de la Pi n'est pas encore configurée. Cette absence
est un risque accepté provisoirement, pas une garantie de récupération après
une migration de données destructive.

## Hors périmètre de la première configuration

- Déployer Home Assistant dans la même pile Docker.
- Publier Home Assistant sur Internet ou contourner son contrôle d'accès.
- Ajouter Redis, un bus de messages, une base séparée ou une plateforme d'orchestration sans besoin mesuré et ADR.
- Exposer Home Panel, Home Core, SSH ou Home Assistant à Internet public, y compris via Tailscale Funnel ou une redirection de port.

## Validation avant livraison Docker

1. Construire l'image pour l'architecture cible.
2. Redémarrer la pile et vérifier la conservation des données.
3. Restaurer une sauvegarde dans un environnement de test.
4. Vérifier l'absence de secret dans l'image, la configuration affichée et les journaux.
5. Simuler l'indisponibilité de Home Assistant, Internet et IA ; les commandes locales déterministes doivent annoncer leur état réel.
6. Vérifier que le Panel est lié à `127.0.0.1:13000` puis le rendre accessible uniquement via `tailscale serve --bg 13000` depuis un appareil autorisé.
