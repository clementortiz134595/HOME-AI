# Spécification — Zigbee Simulator

## Besoin

En attendant le matériel, les contrats Home Core doivent être testés avec des états réalistes et des pannes explicites.

## Premier incrément

- pièces : `salon`, `cuisine`, `chambre` ;
- appareils : lumières, prise, capteur de température ;
- capacités : `switch`, `brightness`, `temperature` ;
- états : valeur, horodatage simulé, disponibilité et qualité de liaison ;
- réseau : coordinateur logique, routeurs, appareils finaux et voisins ;
- événements : état observé, appareil rejoint/quitte, erreur de transport ;
- commandes : `turn_on`, `turn_off`, `set_brightness`, ciblage par appareil ou pièce ;
- clé d'idempotence pour les mutations ;
- résultat explicite : exécuté, indisponible, refusé ou échoué.

## Défauts injectables

Latence, appareil hors ligne, route indisponible, réponse malformée et batterie faible.

## Hors périmètre

Chiffrement radio réel, appairage, compatibilité fabricant, OTA, groupes Zigbee, binding et remplacement de Home Assistant en production.

## Critères d'acceptation

1. Une commande ciblant une pièce retourne un résultat par appareil.
2. Un appareil hors ligne produit `unavailable` et ne modifie pas son état confirmé.
3. Une répétition avec la même clé ne déclenche pas deux mutations.
4. Une perte de route est visible comme une erreur exploitable, sans faux succès.
5. Les scénarios sont rejouables à partir d'une fixture versionnée.
6. Le contrat reste compatible avec le port `home-control` de Home Core.
