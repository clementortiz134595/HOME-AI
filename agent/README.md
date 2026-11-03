# HOME AI — bibliothèque d'agents

Ce dossier rassemble les profils d'agents qui accompagnent la conception et le développement de HOME AI. Il ne contient ni le code de Jarvis, ni une plateforme d'orchestration, ni une infrastructure de production.

## Utiliser la bibliothèque

1. Commencer par [master-agent](master/master-agent.md) : il sélectionne le minimum de spécialistes utile et consolide leurs livrables.
2. Donner le contexte du besoin et les contraintes connues. Les faits persistants du projet se trouvent dans [knowledge](knowledge/project-overview.md).
3. Appliquer le workflow adapté dans [workflows](workflows/).
4. Enregistrer une décision ou une étude dans l'espace documentaire prévu (Google Drive HOME AI à terme), en utilisant les modèles de ce dépôt.

Les profils spécialisés sont listés dans [registry.yaml](registry.yaml). Chaque profil indique ses limites et ses collaborations attendues.

## Limites

- Le dépôt applicatif HOME AI reste séparé.
- Aucun achat, envoi externe, accès à un compte ou changement irréversible n'est réalisé sans autorisation explicite.
- Les prix, disponibilités, compatibilités et résultats de tests doivent être vérifiés et sourcés.
- Les secrets, jetons et données personnelles ne figurent pas dans ce dépôt.

## Faire évoluer l'équipe

Copier [le modèle d'agent](templates/agent-template.md), attribuer un identifiant unique, l'ajouter à `registry.yaml` et relire les liens de collaboration. Un agent peut être désactivé dans le registre sans supprimer son historique.
