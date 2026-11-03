# Instructions de travail — HOME AI

## Lecture obligatoire avant une intervention

1. Lire [`agent/rules.md`](agent/rules.md) et le profil d'agent concerné.
2. Lire le [référentiel fonctionnel Home Panel & Home Core](poles/produit/fonctionnalites-home-core-panel.md).
3. Pour tout travail sur le serveur, lire l'[architecture Home Core](poles/technique/home-core/architecture/README.md) et les diagrammes associés.

## Frontières de Home Core

- Home Core est le seul point d'accès du Home Panel vers Home Assistant, les calendriers et les fournisseurs IA.
- Le serveur est un monolithe modulaire livré dans un conteneur Docker ; ne pas introduire de microservice sans ADR validé.
- Chaque module respecte l'architecture hexagonale : `model`, `application`, `adapters`. Les ports sont définis par l'application et les adaptateurs les implémentent.
- Un registre est permis lorsqu'il découple la découverte ou le routage d'une intégration, jamais comme conteneur de dépendances global.
- Les modules ne lisent pas directement les adaptateurs ni les données internes d'un autre module. Ils passent par un contrat explicite, un port ou un événement applicatif documenté.
- Les secrets, jetons OAuth et données personnelles ne sont jamais inscrits dans le dépôt, les journaux ou les réponses d'API.

## Avant toute implémentation

Mettre à jour les diagrammes Mermaid et l'ADR concerné si une frontière, un flux sensible, une dépendance externe ou le modèle de déploiement change. Les choix de framework, de stockage et de fournisseur restent ouverts jusqu'à une décision explicitement documentée.
