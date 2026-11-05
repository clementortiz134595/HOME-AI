# ADR-0005 — Module Home Control extensible par protocole

- Statut : accepté pour le socle
- Date : 2026-11-03

## Contexte

Home Core doit piloter des appareils, commencer par Zigbee, puis intégrer d'autres protocoles. Le choix du coordinateur, du bridge et du transport Zigbee n'est pas encore validé.

## Décision

Home Assistant est retenu comme passerelle d'intégration pour le premier déploiement domotique. L'adaptateur REST utilise `HOME_CORE_HOME_ASSISTANT_URL` et `HOME_CORE_HOME_ASSISTANT_TOKEN`, inventorie les entités `light`, `switch` et `sensor`, exécute `turn_on`/`turn_off`, puis relit l'état avant de retourner un succès.

Le module `home-control` définit un modèle commun d'appareil, de capacité, d'état confirmé et de commande. L'application dépend d'un port `Connector`; chaque protocole implémente ce port dans son adaptateur. L'adaptateur Zigbee expose un port `Transport` minimal, sans dépendance à un fournisseur.

Les mesures électriques sont optionnelles et l'état retourné par l'intégration est la seule confirmation d'une action.

## Conséquences

- Ajouter Matter, Z-Wave ou une intégration Home Assistant ne modifie pas le modèle métier.
- Le choix concret du coordinateur et de la découverte des appareils reste à documenter avant une connexion réelle.
- Une future API entrante devra passer par l'authentification, l'autorisation et l'idempotence transverses de Home Core.
