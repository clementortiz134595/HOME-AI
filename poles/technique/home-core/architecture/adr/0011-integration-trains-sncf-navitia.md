# ADR-0011 — Départs ferroviaires via les flux SNCF ouverts

## Statut

Accepté — 4 novembre 2026.

## Décision

Home Core interroge l’API publique Train Nomade, qui relaie les flux SNCF ouverts SIRI Lite/GTFS-RT. Aucun jeton n’est requis. Le module `insights` expose `/v1/insights/trains` au Home Panel et normalise les départs de La Ciotat-Ceyreste vers Marseille : horaire réel, horaire théorique, destination, numéro, mode commercial, quai et suppression publiée.

Les absences de quai ou de cause sont conservées comme absences. En cas d’échec ou de jeton absent, l’API retourne une indisponibilité ; aucune donnée de secours simulée n’est affichée pour les trains.

## Conséquences

- Les données dépendent de la couverture et de la fraîcheur temps réel des flux SNCF ouverts.
- Train Nomade est un diffuseur indépendant : l’interface doit citer SNCF comme producteur et Train Nomade comme diffuseur.
- Le périmètre par défaut est la gare SNCF de La Ciotat-Ceyreste (`87751784`) vers Marseille ; la gare est configurable.
