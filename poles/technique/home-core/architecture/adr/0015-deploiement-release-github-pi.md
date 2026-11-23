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

Une release est un tag Git créé après validation de `main`. Après la
publication réussie des images ARM64 dans GHCR, un workflow GitHub Actions
est pris en charge par un runner auto-hébergé, limité au dépôt, sur la
Raspberry Pi. Il exécute le script de déploiement déjà présent dans le clone
de déploiement propre, sans transfert SSH entrant, webhook domestique ni
secret de déploiement dans GitHub.

`scripts/deploy-release.sh <tag>` sélectionne exactement le commit du tag,
tire les images publiées ou construit localement si aucun registre n'est
configuré, attend la santé de Home Core et Home App, puis conserve les deux
dernières révisions réussies pour un rollback local. Le minuteur systemd de
vérification des tags demeure un filet de sécurité temporaire : il permet de
rattraper une release si le runner est arrêté ou si GitHub Actions est
indisponible, mais n'est plus le déclencheur normal du déploiement.

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
| Runner GitHub Actions auto-hébergé sur le Pi | Retenue | Déclenche le déploiement dès la publication de l'image, sans polling ni accès entrant au réseau domestique. |
| Surveillance locale périodique des tags | Filet de sécurité | Rattrape les échecs du déclenchement événementiel ou les indisponibilités du runner. |
| GitHub Actions vers le Pi en SSH | Écartée | Demande une connectivité entrante et des secrets CI supplémentaires. |
| Image publiée dans un registre privé | Déjà utilisée via GHCR | Évite un build local systématique et garde les images versionnées ARM64. |
| Modifications directes du code sur le Pi | Écartée | Empêche de connaître et de reproduire la version déployée. |

## Conséquences

- Le clone de production doit être propre ; le script refuse un déploiement si
  des fichiers sont modifiés ou non suivis.
- Un tag de release déploie dès que la publication des images a réussi et que
  le runner est disponible. Le minuteur assure le rattrapage après un arrêt de
  la Pi ou une indisponibilité de GitHub Actions.
- Le runner est associé exclusivement à ce dépôt, porte le label
  `home-ai-rpi` et ne reçoit que le workflow de déploiement versionné sur la
  branche par défaut. Son jeton d'enregistrement est éphémère et n'est jamais
  conservé dans le dépôt ni dans les fichiers de configuration du projet.
- Un rollback applicatif peut revenir au commit précédent, mais ne remplace pas
  une restauration de données après une migration destructive.
- GitLab ne reçoit plus de push manuel : il peut être retiré ou configuré comme
  miroir à sens unique ultérieurement.
- Les conteneurs restent ceux du monolithe Home Core ; cette décision n'ajoute
  ni microservice ni système d'orchestration.
