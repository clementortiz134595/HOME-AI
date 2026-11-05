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
- Réseau Compose privé par défaut. Les ports publiés sont réduits à l'API Home Panel, avec une exposition réseau explicitement décidée.
- `healthcheck`, politique de redémarrage, utilisateur non privilégié et système de fichiers en lecture seule lorsque le runtime le permet.
- Limites CPU/mémoire fondées sur des mesures de la machine cible, non sur des valeurs supposées.
- Journaux structurés vers la sortie standard, avec filtrage des secrets et des données sensibles.

## Hors périmètre de la première configuration

- Déployer Home Assistant dans la même pile Docker.
- Publier Home Assistant sur Internet ou contourner son contrôle d'accès.
- Ajouter Redis, un bus de messages, une base séparée ou une plateforme d'orchestration sans besoin mesuré et ADR.
- Choisir prématurément l'accès distant : VPN privé et HTTPS restent à étudier.

## Validation avant livraison Docker

1. Construire l'image pour l'architecture cible.
2. Redémarrer la pile et vérifier la conservation des données.
3. Restaurer une sauvegarde dans un environnement de test.
4. Vérifier l'absence de secret dans l'image, la configuration affichée et les journaux.
5. Simuler l'indisponibilité de Home Assistant, Internet et IA ; les commandes locales déterministes doivent annoncer leur état réel.
