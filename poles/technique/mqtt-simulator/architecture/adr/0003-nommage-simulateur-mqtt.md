# ADR-0003 — Nommer le runtime déployé « Simulateur MQTT »

- Statut : accepté
- Date : 2026-11-16

## Contexte

Le runtime déployé sur la Raspberry Pi charge une fixture d'appareils et la publie via MQTT Discovery. Il ne simule ni le protocole Zigbee, ni le coordinateur, ni le maillage radio. Le nom historique « Zigbee Simulator » confondait le type d'appareils représentés avec le protocole effectivement simulé et rendait l'architecture difficile à lire.

## Décision

Renommer le projet et le service en `mqtt-simulator`. Employer « simulateur MQTT » pour le runtime qui parle MQTT à Mosquitto et Home Assistant. Renommer le transport interne de Home Core en `fixture` : il charge des données de test, mais n'émule pas Zigbee.

Le nom « simulateur Zigbee » est réservé à un futur composant qui émulera au minimum un coordinateur et les interactions de réseau Zigbee. Aucun tel composant n'est créé dans cette décision.

## Alternatives

- Conserver « Zigbee Simulator » : plus court, mais techniquement faux pour le runtime MQTT actuel.
- Nommer le composant « pont MQTT » : décrit sa mécanique mais pas son rôle de production d'appareils et d'états simulés.
- Créer maintenant un simulateur Zigbee : périmètre prématuré sans besoin de validation radio ni matériel de référence.

## Conséquences

Les chemins de fixture, noms de service, image Docker, variable d'environnement et métadonnées MQTT utilisent le terme MQTT. Les déploiements existants doivent être recréés avec la nouvelle extension Compose. Home Core, Home Assistant et Apple Maison conservent leurs frontières : Home Core passe par l'API de Home Assistant ; Apple Maison passe par HomeKit Bridge.
