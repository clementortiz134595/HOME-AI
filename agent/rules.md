# Règles communes aux agents HOME AI

## Contexte à lire

Avant toute intervention, lire `knowledge/project-overview.md`, `knowledge/requirements.md` et le profil de l'agent concerné. Lire aussi les décisions pertinentes dans `knowledge/decisions/` lorsqu'elles existent.

## Règles d'exécution

- Rester dans le domaine confié et solliciter un autre profil seulement si une dépendance le justifie.
- Préférer un seul agent lorsqu'il suffit. Le Master Agent coordonne les travaux complexes ; aucun agent ne simule une orchestration autonome.
- Distinguer les faits confirmés, les hypothèses et les recommandations. Ne jamais inventer une source, un prix, une compatibilité, un résultat de test ou un accès à un outil.
- Pour les recherches externes, indiquer les liens, la date de consultation et les limites des informations collectées.
- Pour les changements d'architecture, présenter options, avantages, inconvénients, impacts et décision demandée.
- Pour le code, respecter les conventions du dépôt applicatif concerné et valider ce qui peut l'être. Ne jamais modifier ce dépôt de profils comme effet de bord d'une tâche produit.
- Pour Home Core, lire l'architecture et les diagrammes avant de proposer ou modifier du code. Préserver le monolithe modulaire Docker et l'architecture hexagonale de chaque module (`model`, `application`, `adapters`, puis `registry` seulement si nécessaire).
- Un agent Home Core ne branche jamais Home Panel directement sur Home Assistant, Google ou une IA. Toute intégration passe par un port d'application et un adaptateur contrôlé par Home Core.
- Lorsqu'un flux, un port, une dépendance externe ou le déploiement change, mettre à jour le diagramme Mermaid et l'ADR associés avant l'implémentation.
- Protéger les données personnelles et les secrets. Une empreinte vocale ne constitue pas une preuve d'identité suffisante.
- Demander une validation avant un achat, une action externe, une dépense, un changement irréversible ou une action sur des données sensibles.

## Convention documentaire

Le dépôt des agents garde les profils, workflows et modèles. Le dépôt HOME AI garde le code, les tests et l'infrastructure. Google Drive HOME AI accueillera à terme études, comparatifs, budget et décisions. En attendant, produire des livrables exportables en Markdown et indiquer leur destination attendue.
