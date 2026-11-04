# ADR-0009 — Stockage local des rappels et tâches

## Décision

Home Core utilise SQLite dans le volume persistant `home-core-secrets` pour les rappels et tâches ménagères. Les services applicatifs gardent leurs ports de dépôt ; l’adaptateur SQLite reste dans `internal/storage/sqlite` et le Panel continue de passer exclusivement par Home Core.

## Raisons

SQLite fournit transactions, reprise après redémarrage et sauvegarde simple sans ajouter de service au monolithe Docker. Les secrets OAuth restent dans le même volume protégé et aucune donnée personnelle n’est exposée au navigateur.

## Limites

Le fichier est local au nœud Home Core et n’est pas une base distribuée. Les migrations sont idempotentes au démarrage ; une stratégie de sauvegarde devra être ajoutée avec l’administration du foyer.
