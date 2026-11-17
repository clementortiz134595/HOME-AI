# ADR-0019 — Inventaire des appareils administré via Home Core

## Contexte

Les appareils Home Assistant doivent avoir un nom compréhensible et une pièce, visibles de façon identique dans Home Assistant et dans l’application Home. Une personnalisation seulement côté navigateur serait divergente et perdue selon l’appareil utilisé.

## Décision

Le module `home-control` expose une mise à jour d’inventaire par appareil. Son adaptateur Home Assistant utilise l’API WebSocket authentifiée de Home Assistant pour lire les registres d’entités et de zones, créer une zone lorsqu’elle n’existe pas, puis mettre à jour le nom personnalisé et l’affectation de zone dans le registre adéquat.

L’application Home présente un formulaire explicite de renommage et de sélection/saisie de pièce. Elle n’échange jamais directement avec Home Assistant.

## Conséquences

- Les noms et pièces persistent dans Home Assistant et sont partagés avec ses propres écrans.
- Le jeton Home Assistant reste dans Home Core ; le navigateur ne reçoit que l’inventaire normalisé.
- Une indisponibilité WebSocket empêche la modification et produit une erreur explicite, sans simuler de sauvegarde.
