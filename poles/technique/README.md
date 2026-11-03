# Pôle technique

Le pôle technique conçoit, réalise et exploite le socle local, les applications et les intégrations. Chaque sous-projet garde ses exigences, études, architecture, ADR, diagrammes, interactions et stratégie de test à côté du code.

## Les trois projets

- [Home Panel](home-panel/README.md) : interface tablette de l'appartement.
- [Home Core](home-core/README.md) : serveur, assistant IA et intégrations locales.
- [Home App](home-app/README.md) : application mobile.

La découpe est volontairement limitée à ces trois projets. Le cadrage de leurs parcours, architecture, intégrations et code vient dans un second temps.

## Règle d'architecture

Chaque projet est un monolithe Docker autonome : son code, ses dépendances et son déploiement restent dans son propre dossier. Les échanges futurs entre projets seront explicitement documentés ; aucun découpage en microservices n'est prévu par défaut.
