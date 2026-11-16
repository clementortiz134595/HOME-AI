# Spécification — Simulateur MQTT

## Besoin

Avant la réception du matériel, Home Assistant et Apple Maison doivent pouvoir afficher et commander une maison de démonstration à partir de flux MQTT rejouables.

## Premier incrément

- pièces : `salon`, `cuisine`, `chambre` ;
- appareils : lumières, prises, capteurs de température, rideau, capteur d'ouverture et thermostat ;
- MQTT Discovery pour chaque appareil ;
- états MQTT retenus, disponibilité et qualité de service 1 ;
- commandes MQTT : `turn_on`, `turn_off`, luminosité, rideau et thermostat ;
- retour d'état après chaque commande.

## Hors périmètre

Réseau maillé Zigbee, coordinateur, appairage, chiffrement radio, compatibilité fabricant, OTA, groupes Zigbee, binding et émulation de radio. Ces éléments appartiendront à un éventuel simulateur Zigbee distinct.

## Critères d'acceptation

1. La fixture produit des entités Home Assistant par MQTT Discovery.
2. Un état publié met à jour l'entité correspondante dans Home Assistant.
3. Une commande Home Assistant est reçue par le simulateur et produit un état confirmé.
4. Les publications retenues permettent une redécouverte après redémarrage de Home Assistant.
5. Le broker est limité à la machine locale.
6. Le flux est visible dans Apple Maison uniquement via HomeKit Bridge.
