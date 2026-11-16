# Architecture

Le simulateur MQTT est un runtime de développement autonome. Il charge une fixture déterministe, publie MQTT Discovery et les états associés dans Mosquitto, puis écoute les topics de commande. Home Assistant est le seul consommateur de ces messages ; Apple Maison est atteint par le pont HomeKit de Home Assistant.

```text
Fixture de maison
        │
        ▼
Simulateur MQTT
        │ MQTT Discovery, états et commandes
        ▼
Mosquitto local ───► Home Assistant ───► HomeKit Bridge ───► Apple Maison
```

Le simulateur n'est pas un adaptateur du port `Connector` de `home-control`. Ce port reste dans Home Core : en développement, son transport de fixture alimente les tests HTTP ; avec Home Assistant configuré, Home Core utilise son adaptateur Home Assistant. Les deux usages peuvent partager la même fixture, mais ils sont deux frontières distinctes.

## Contrat MQTT

- découverte : `homeassistant/{domain}/{identity}/config` ;
- disponibilité : `home-ai/simulator/availability` ;
- état : `home-ai/simulator/{deviceID}/state` ;
- commande : `home-ai/simulator/{deviceID}/set` ;
- thermostat : topics dédiés pour température et mode.

Les publications d'état et de découverte sont retenues et émises avec QoS 1. Après une commande reçue, le simulateur met à jour son état en mémoire et republie l'état confirmé.
