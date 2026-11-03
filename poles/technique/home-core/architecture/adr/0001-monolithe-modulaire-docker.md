# ADR-0001 — Monolithe modulaire Docker

- Statut : accepté pour le cadrage initial
- Date : 2026-11-03
- Décideur : architecture HOME AI

## Contexte

Home Core doit opérer localement sur un serveur domestique, possiblement une Raspberry Pi, et conserver un contrôle explicite des permissions, secrets et intégrations. Le premier périmètre comprend les profils, les commandes Home Assistant, les scènes, l'agenda, les rappels, l'assistant et la santé du système. Il faut pouvoir livrer, diagnostiquer, sauvegarder et faire évoluer cette base sans surdimensionner l'exploitation.

## Décision

Home Core est un monolithe modulaire livré dans une pile Docker Compose dédiée contenant une application unique. Chaque module est conçu selon une architecture hexagonale :

- `model` contient les règles métier sans dépendance technique ;
- `application` contient les cas d'usage et les ports ;
- `adapters` implémentent les entrées et sorties techniques ;
- `registry` est optionnel et reste local à un module lorsqu'il résout un besoin de découverte ou de routage.

Les modules ne partagent pas leurs adaptateurs, leurs détails de stockage ou des clients externes. Ils communiquent par contrats applicatifs explicites. Home Panel passe uniquement par l'API de Home Core.

## Alternatives étudiées

| Alternative | Décision | Motif |
| --- | --- | --- |
| Microservices par capacité | Écartée à ce stade | Coût de déploiement, observabilité, réseau et persistance disproportionné pour un serveur domestique. |
| Monolithe non modulaire | Écartée | Le couplage rendrait les permissions, les intégrations et les tests difficiles à faire évoluer. |
| Home Panel connecté directement aux fournisseurs | Écartée | Exposerait des secrets et dupliquerait validation, autorisation et gestion des erreurs. |

## Conséquences

- Le démarrage, les sauvegardes et les diagnostics restent centrés sur une seule application Docker.
- Les frontières de module doivent être testables et documentées ; elles rendent une extraction ultérieure possible, mais ne la justifient pas aujourd'hui.
- Une panne de fournisseur externe doit être représentée par un résultat et un mode dégradé, pas masquée par une réponse supposée.
- Toute proposition de conteneur supplémentaire, bus distribué ou accès direct depuis Home Panel nécessite un ADR qui apporte un besoin mesuré et le coût opérationnel.

## Validations restantes

- Confirmer la machine cible, son architecture et le budget de ressources.
- Choisir le runtime, la persistance, l'authentification et la stratégie de sauvegarde.
- Tester les modes dégradés Home Assistant, Internet et IA avant la première livraison utilisable.
