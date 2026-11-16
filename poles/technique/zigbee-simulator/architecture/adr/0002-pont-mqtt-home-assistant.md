# ADR-0002 — Pont MQTT local vers Home Assistant

- Statut : accepté pour le simulateur de développement
- Date : 2026-11-16

## Décision

Le simulateur publie la fixture en MQTT Discovery dans Home Assistant via un
broker Mosquitto lié à `127.0.0.1`. Les entités obtenues sont des lumières,
prises et capteurs de température. Les commandes MQTT mettent à jour l'état
simulé. Apple Maison reste en aval de Home Assistant, via HomeKit Bridge.

## Conséquences

Le pont est réservé au développement : il n'émule ni la radio, ni un
coordinateur, ni l'appairage Zigbee. Le broker n'est jamais exposé au LAN.
