# Dossier produit — Maison & routines

## Spécification

Priorités : éclairage, extinction générale, arrivée, départ et coucher. Température et consommation restent des vues secondaires. Les déclencheurs combinent présence via smartphone avec consentement et commandes vocales explicites.

## Interactions

Chaque action confirme l'état réel. Les routines doivent être compréhensibles, modifiables et désactivables sans intervention technique.

## Études

Identifier les premières lampes ou prises, les contraintes d'interrupteur et l'intérêt des scènes au coucher du soleil.

## Dossier technique

Home Assistant orchestre les appareils et les scènes. Les scènes déterministes restent disponibles si le cloud IA est indisponible.

## Diagrammes

À créer : cycle d'une routine, états d'un appareil et chemin de retour d'erreur.

## ADR

Consigner les choix de protocoles, d'équipements et de comportement dégradé.

## Tests d'acceptation

La routine signale qu'un appareil est hors ligne et ne prétend jamais qu'une commande a réussi sans retour d'état.
