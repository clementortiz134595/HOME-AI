# ADR-0018 — Historique des capteurs via Home Core

## Contexte

L’application Home doit afficher les mesures réelles de température, d’humidité et de batterie des capteurs Zigbee. La consultation de leurs relevés sur vingt-quatre heures ne doit pas exposer l’API ni le jeton de Home Assistant au navigateur.

## Décision

Le module `home-control` expose `GET /v1/home-control/devices/{deviceId}/history`. Son port optionnel `HistoryReader` est implémenté par l’adaptateur Home Assistant, qui lit l’historique REST des entités de température et d’humidité associées. Home Core normalise les points et renvoie uniquement leur horodatage et leurs valeurs utiles.

L’application Home lit cet endpoint Home Core pour tracer les deux séries. Elle ne contacte jamais Home Assistant directement.

## Conséquences

- Les données restent locales et le jeton Home Assistant reste côté Home Core.
- L’historique dépend du recorder Home Assistant et peut être vide avant les premiers relevés persistés.
- Une nouvelle mesure nécessite une extension explicite du contrat, de l’adaptateur et de l’interface.
