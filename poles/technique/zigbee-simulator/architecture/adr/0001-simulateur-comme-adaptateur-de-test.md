# ADR-0001 — Simulateur Zigbee comme adaptateur de test

- Statut : proposé
- Date : 2026-11-03

## Contexte

Le matériel Zigbee n'est pas encore disponible, mais les contrats Home Core doivent pouvoir être testés avec des états réalistes et des pannes explicites.

## Décision proposée

Construire un simulateur local qui implémente le même port `Connector` que l'intégration Zigbee. Il est activé par composition de test ou profil de développement, sans créer de microservice.

## Alternatives

- Attendre le matériel : validation retardée.
- Mocker chaque cas dans Home Core : ne teste ni l'inventaire ni le transport.
- Utiliser un coordinateur virtuel externe : dépendance et choix prématurés.

## Conséquences

Les scénarios métier et les erreurs sont validables avant l'achat. Le choix du coordinateur et de la sécurité radio reste ouvert jusqu'à l'essai matériel.
