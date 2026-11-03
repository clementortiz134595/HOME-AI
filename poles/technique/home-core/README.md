# Home Core

- Nom technique : `home-core`
- Statut : cadrage d'architecture initial
- Rôle : serveur local, assistant IA et intégrations de la maison.

Home Core est le point de passage privé entre Home Panel et les systèmes du foyer. Il porte les identités, permissions, secrets, règles métier, intégrations et retours d'état ; Home Panel ne dialogue jamais directement avec Home Assistant, Google Calendar ou un fournisseur IA.

Le projet sera livré comme un monolithe Docker autonome, structuré en modules métier. Chaque module applique une architecture hexagonale avec `model`, `application`, `adapters` et un `registry` uniquement lorsqu'un mécanisme de découverte ou de routage est réellement nécessaire.

## Documentation de conception

- [Architecture modulaire et hexagonale](architecture/README.md)
- [Diagrammes Mermaid de flux](diagrammes/README.md)
- [Plan Docker](infrastructure/docker.md)
- [Module Weather — La Ciotat](modules/weather.md)
- [Module Home Control — appareils et protocoles](modules/home-control.md)

Le runtime Go est retenu pour le premier noyau par [ADR-0002](architecture/adr/0002-runtime-go.md). Les choix de base de données, authentification, stockage, intégration Home Assistant et autres fournisseurs externes restent à décider par ADR avant leur implémentation.
