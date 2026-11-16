# Simulateur MQTT

> Statut : prototype de développement, sans matériel domotique.

Le simulateur MQTT publie une maison de démonstration dans un broker Mosquitto local. Il utilise MQTT Discovery pour rendre les lumières, prises, capteurs, rideaux et thermostats visibles dans Home Assistant, puis dans Apple Maison via le pont HomeKit de Home Assistant.

Il simule des **appareils domestiques**, pas le protocole radio Zigbee. Il ne contient ni maillage radio, ni coordinateur, ni appairage, ni chiffrement Zigbee. Un futur simulateur Zigbee ne pourra porter ce nom que lorsqu'il émule réellement ces comportements.

## Objectif

Valider sans matériel les parcours Home Assistant et Apple Maison : découverte d'appareils, publication d'états, commandes MQTT et retour d'état confirmé. Home Core peut consommer les mêmes appareils par l'adaptateur Home Assistant ; il ne parle pas directement au broker MQTT.

## Exécution

`mqtt/compose.home-assistant.yaml` démarre :

- `mqtt` : broker Mosquitto local, limité à `127.0.0.1` ;
- `mqtt-simulator` : charge la fixture et publie MQTT Discovery ainsi que les états retenus.

Dans Home Assistant, l'intégration **MQTT** est configurée une seule fois avec l'hôte `127.0.0.1` et le port `1883`. Les entités de la fixture sont alors découvertes automatiquement. Le pont HomeKit est une étape aval distincte : il expose les entités choisies à Apple Maison, qui ne lit jamais MQTT directement.

## Structure

- [specification.md](specification.md) — périmètre et critères d'acceptation ;
- [architecture/README.md](architecture/README.md) — frontières et contrats ;
- [architecture/adr/0001-simulateur-comme-adaptateur-de-test.md](architecture/adr/0001-simulateur-comme-adaptateur-de-test.md) — décision historique remplacée ;
- [architecture/adr/0002-pont-mqtt-home-assistant.md](architecture/adr/0002-pont-mqtt-home-assistant.md) — décision de transport MQTT ;
- [architecture/adr/0003-nommage-simulateur-mqtt.md](architecture/adr/0003-nommage-simulateur-mqtt.md) — frontière et nom retenus ;
- [diagrammes/flux-home-assistant-mqtt.mmd](diagrammes/flux-home-assistant-mqtt.mmd) — flux déployé ;
- [tests/strategie.md](tests/strategie.md) — stratégie de preuve ;
- [code/fixtures/maison-demo.json](code/fixtures/maison-demo.json) — maison de démonstration.

## Limites

Le broker n'est jamais exposé au LAN. Le simulateur ne remplace ni Home Assistant, ni un coordinateur, ni un futur réseau Zigbee réel. Aucun secret ni identifiant réseau ne doit être ajouté ici.
