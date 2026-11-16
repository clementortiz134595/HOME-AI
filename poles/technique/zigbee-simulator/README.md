# Zigbee Simulator

> Statut : cadrage technique — prototype sans matériel

Le Zigbee Simulator fournit un environnement local déterministe pour tester Home Core avant la réception du coordinateur et des appareils physiques. Il représente les pièces, les appareils Zigbee, leurs capacités, le réseau maillé et les retours d'état observés.

## Objectif

Permettre de valider les parcours Home Core suivants sans Home Assistant ni matériel : inventorier les pièces et appareils, commander par pièce, lancer une scène, recevoir un état confirmé ou une erreur, et simuler latence, appareil hors ligne, perte de route et batterie faible.

Le simulateur est un adaptateur de développement et de test. Il ne remplace ni Home Assistant ni le futur coordinateur Zigbee.

## Pont MQTT vers Home Assistant

`mqtt/mqtt_bridge.py` publie automatiquement la fixture par MQTT Discovery.
Il est exécuté avec un Mosquitto local limité à `127.0.0.1`, afin que les
lumières, prises et capteurs soient visibles dans Home Assistant sans exposer
le broker au réseau. La surcharge Compose à lancer avec Home Assistant est
`mqtt/compose.home-assistant.yaml`. Voir l'ADR-0002 et
`diagrammes/flux-home-assistant-mqtt.mmd`.

La maison de démonstration comprend aussi un rideau pilotable et un capteur
d'ouverture de fenêtre, afin de visualiser les cartes et commandes Home
Assistant et Apple Maison au-delà des éclairages et prises.

Dans Home Assistant, ajouter une seule fois l'intégration **MQTT** depuis
**Paramètres > Appareils et services**, avec l'hôte `127.0.0.1` et le port
`1883`. Les entités Discovery de la fixture apparaissent alors automatiquement.

## Structure

- [specification.md](specification.md) — périmètre et critères d'acceptation ;
- [architecture/README.md](architecture/README.md) — frontières et contrats ;
- [architecture/adr/0001-simulateur-comme-adaptateur-de-test.md](architecture/adr/0001-simulateur-comme-adaptateur-de-test.md) — décision ;
- [diagrammes/flux-commande-piece.mmd](diagrammes/flux-commande-piece.mmd) — flux de commande ;
- [tests/strategie.md](tests/strategie.md) — stratégie de preuve ;
- [code/fixtures/maison-demo.json](code/fixtures/maison-demo.json) — maison de démonstration.

## Limites

Le transport radio réel, le coordinateur, la sécurité Zigbee et la compatibilité fabricants restent à valider avec le matériel. Aucun secret ou identifiant réseau ne doit être ajouté ici.
