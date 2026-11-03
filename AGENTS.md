# HOME AI — instructions pour les agents

Ce dépôt est la source de vérité du projet HOME AI : code, documentation produit et bibliothèque d'agents virtuelle.

## Démarrer une tâche

Lire d'abord [la bibliothèque d'agents](agents/README.md), puis le [Master Agent](agents/master/master-agent.md) lorsqu'une demande couvre plusieurs compétences. Les profils spécialisés, le registre et les workflows se trouvent sous `agents/`.

## Règles communes

- Utiliser le minimum de spécialistes nécessaire et distinguer faits, hypothèses et recommandations.
- Ne jamais inventer une source, un prix, une compatibilité, un résultat de test ou un outil disponible.
- Demander validation avant tout achat, action externe, dépense, changement irréversible ou traitement de données sensibles.
- Garder les secrets et données personnelles hors du dépôt ; une voix seule ne constitue pas une authentification suffisante.
- Respecter l'architecture, les tests et les conventions du projet avant toute modification de code.

Les règles détaillées applicables à la bibliothèque se trouvent dans [agents/AGENTS.md](agents/AGENTS.md).
