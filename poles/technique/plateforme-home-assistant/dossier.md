# Dossier technique — Plateforme Home Assistant

## Spécification

Installer Home Assistant sur le matériel existant seulement après inventaire du Pi. Le socle doit piloter localement les appareils et rester maintenable.

## Études

Vérifier modèle, RAM, stockage, alimentation, réseau, disponibilité 24/7, stratégie de sauvegarde et protocole domotique.

## Architecture

Home Assistant est le moteur local des appareils et automatisations. Son interface d'administration est séparée de l'application web utilisateur.

## ADR

Créer les ADR pour le stockage, les sauvegardes, l'accès externe et les protocoles matériel.

## Diagrammes

À créer : topologie réseau et chaîne de sauvegarde/restauration.

## Interactions

Décrire l'installation, la supervision et les retours visibles lorsque le serveur ou un appareil est indisponible.

## Tests

Tester redémarrage, restauration d'une sauvegarde, commande locale et indisponibilité Internet.
