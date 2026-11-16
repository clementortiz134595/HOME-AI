# ADR-0015 — Releases GitHub déployées par le Raspberry Pi

- Statut : accepté
- Date : 2026-11-16
- Décideur : architecture HOME AI

## Contexte

Le code HOME AI était présent sur le Mac, sur la Raspberry Pi et sur plusieurs
remotes Git, avec des modifications locales sur la machine de production. La
provenance de l'image en cours d'exécution ne pouvait donc pas être déterminée
de manière fiable. La Raspberry Pi est une cible ARM64 locale qui exécute la
pile Docker Compose et dispose d'un accès sortant à GitHub.

## Décision

GitHub est la source de vérité unique du code. Les changements passent par la
CI GitHub Actions : tests Go, vérification des deux interfaces web et
validation de la configuration Docker Compose.

Une release est un tag Git créé après validation de `main`. La Raspberry Pi
utilise un clone de déploiement propre, sans modification locale. Un minuteur
systemd local recherche les nouveaux tags `v*` toutes les cinq minutes et
exécute `scripts/deploy-latest-release.sh`. Ce dernier appelle
`scripts/deploy-release.sh <tag>`, sélectionne exactement le commit du tag,
construit localement les images ARM64 de Home Core, Home Panel et Home App,
attend la santé de Home Core et Home App, puis conserve les deux dernières
révisions réussies pour un rollback local.

Le Pi ne reçoit aucune connexion entrante de GitHub : le déploiement est un
pull contrôlé depuis le réseau domestique. Les secrets, jetons OAuth et
données persistantes restent hors du checkout Git dans la configuration locale
et les volumes Docker.

Aucune sauvegarde automatisée de la Pi n'est mise en place à cette étape, à la
décision explicite du propriétaire. Toute migration de données doit donc rester
compatible avec un retour au commit précédent tant qu'une stratégie de
sauvegarde et de restauration n'a pas été validée.

## Alternatives étudiées

| Alternative | Décision | Motif |
| --- | --- | --- |
| Build local et surveillance des tags sur le Pi | Retenue | Simple, gratuit, sans endpoint de déploiement entrant et adapté à l'ARM64. |
| GitHub Actions vers le Pi en SSH | Différée | Demande une connectivité et des secrets CI supplémentaires. |
| Image publiée dans un registre privé | Différée | Utile si les builds locaux deviennent coûteux, inutile à ce stade. |
| Modifications directes du code sur le Pi | Écartée | Empêche de connaître et de reproduire la version déployée. |

## Conséquences

- Le clone de production doit être propre ; le script refuse un déploiement si
  des fichiers sont modifiés ou non suivis.
- Un tag de release déclenche le déploiement au plus tard au prochain passage
  du minuteur ; un arrêt de la Pi n'empêche pas le rattrapage au redémarrage.
- Un rollback applicatif peut revenir au commit précédent, mais ne remplace pas
  une restauration de données après une migration destructive.
- GitLab ne reçoit plus de push manuel : il peut être retiré ou configuré comme
  miroir à sens unique ultérieurement.
- Les conteneurs restent ceux du monolithe Home Core ; cette décision n'ajoute
  ni microservice ni système d'orchestration.
