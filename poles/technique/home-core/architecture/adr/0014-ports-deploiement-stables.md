# ADR-0014 — Ports de déploiement stables

- Statut : accepté
- Date : 2026-11-16

## Contexte

La Raspberry Pi exécute plusieurs piles Docker et des relais Tailscale. Une publication de port variable rend les favoris, les diagnostics et les accès LAN imprévisibles.

## Décision

Les ports d'hôte sont fixes et configurables seulement par des variables explicites : Home Panel `13000` (`HOME_PANEL_PORT`) sur le LAN et Home Core `18080` (`HOME_CORE_HOST_PORT`) sur la boucle locale. Home Assistant conserve `8123` dans sa pile hôte dédiée. Home App conserve `13444` sur la boucle locale ; Tailscale relaie le Panel sur `8443` et Home App sur `8444`.

Home Panel reste l'unique client navigateur de Home Core : exposer le Panel sur le LAN ne publie pas l'API Home Core.

## Conséquences

- Les adresses de favoris et les procédures de diagnostic sont stables après un redémarrage Docker ou de la Raspberry Pi.
- Toute modification de port doit être faite dans le fichier d'environnement persistant de la pile avant son redémarrage.
- Une collision de port empêche le service de démarrer, ce qui est préférable à une réattribution automatique.
