# Dossier technique — Backend & API

## Spécification

Le backend orchestre profils, calendrier, rappels, mémoire, notifications et commandes Home Assistant. Il ne stocke aucun secret dans le navigateur.

## Études

Comparer les stacks Node et Python après inventaire des contraintes du Raspberry Pi. Évaluer SQLite pour V1 et les besoins d'évolution.

## Architecture

Frontend authentifié → API interne autorisée → connecteurs calendrier, stockage mémoire et Home Assistant. Les données personnelles sont cloisonnées par profil.

## ADR

Consigner la stack, le modèle de permissions, la stratégie de journalisation et le stockage.

## Diagrammes

À créer : composants, séquence de commande distante et modèle de données des profils.

## Interactions

Décrire les contrats d'API, les erreurs utilisables par le frontend et les confirmations nécessaires.

## Tests

Tester autorisations, isolation des données, erreurs de connecteurs et idempotence des actions sensibles.
