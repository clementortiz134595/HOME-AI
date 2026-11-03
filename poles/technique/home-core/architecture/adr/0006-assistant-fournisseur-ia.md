# ADR-0006 — Assistant texte via un port de fournisseur IA configurable

- Statut : accepté pour le premier incrément
- Date : 2026-11-03

## Décision

Le module `assistant` expose un cas d'usage `AskQuestion` et un port `QuestionAnswerer`. Le premier adaptateur appelle l'API Gemini `generateContent`, avec une URL, une clé et un modèle configurables par variables d'environnement. Home Core conserve la clé et retourne au Panel un contrat `Answer` neutre.

Le premier incrément ne donne pas d'outils au modèle et ne déclenche aucune action domestique. Les questions sont validées, le contenu n'est pas journalisé et une indisponibilité du fournisseur retourne une erreur explicite sans empêcher les autres routes locales.

## Alternatives

| Option | Décision | Motif |
| --- | --- | --- |
| SDK propriétaire OpenAI | Reportée | Couplerait le domaine à un fournisseur avant l'évaluation qualité/coût/confidentialité. |
| Modèle local obligatoire | Reportée | Nécessite une mesure de qualité et de ressources sur la cible Raspberry Pi. |
| API Gemini derrière un port | Retenue | Recherche Google, function calling et coût adaptés au premier assistant ; le port permet un remplacement ultérieur. |

## Conséquences

- Un fournisseur compatible peut être utilisé sans modifier le Home Panel ni le cas d'usage.
- La réponse libre dépend du réseau et d'un secret configuré ; le contrôle déterministe de la maison reste indépendant.
- Avant d'ajouter mémoire, outils ou actions, il faudra documenter permissions, consentement, évaluation et confirmation.
