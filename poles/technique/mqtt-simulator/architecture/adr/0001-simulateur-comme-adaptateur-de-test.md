# ADR-0001 — Simulateur Zigbee comme adaptateur de test

- Statut : remplacé par ADR-0003
- Date : 2026-11-03

## Contexte

Le matériel Zigbee n'est pas encore disponible, mais les contrats Home Core doivent pouvoir être testés avec des états réalistes et des pannes explicites.

## Décision proposée à l'origine

Construire un simulateur local qui implémente le même port `Connector` que l'intégration Zigbee. Il est activé par composition de test ou profil de développement, sans créer de microservice.

## Alternatives

- Attendre le matériel : validation retardée.
- Mocker chaque cas dans Home Core : ne teste ni l'inventaire ni le transport.
- Utiliser un coordinateur virtuel externe : dépendance et choix prématurés.

## Remplacement

La mise en œuvre MQTT ne simule pas le protocole Zigbee et ne se branche pas sur le port `Connector` de Home Core. L'ADR-0003 sépare désormais le simulateur MQTT déployé du transport de fixture interne à Home Core. Cette ADR reste conservée comme historique du besoin de tests sans matériel.

## Conséquences initiales

Les scénarios métier et les erreurs sont validables avant l'achat. Le choix du coordinateur et de la sécurité radio reste ouvert jusqu'à l'essai matériel.
