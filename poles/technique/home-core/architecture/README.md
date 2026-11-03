# Architecture — Home Core

> Statut : premier incrément en cours. Ce document fixe les frontières de conception ; le module Weather est le premier module exécutable. La base de données et les fournisseurs IA restent à choisir.

## Décision directrice

Home Core est un **monolithe modulaire** exécuté localement dans un conteneur Docker. Le déploiement initial contient une seule application : elle peut évoluer et être testée comme une unité, tout en conservant des modules métier indépendants. Aucun découpage en microservices, bus distribué ou base partagée entre services n'est prévu.

Le Home Panel utilise l'API de Home Core. Home Assistant, Google Calendar, la météo et les modèles IA restent des dépendances externes joignables uniquement par des adaptateurs Home Core. Ainsi, le navigateur ne reçoit aucun secret et les règles d'autorisation restent centralisées.

## Modules initiaux

| Module | Responsabilité | Dépendances externes autorisées |
| --- | --- | --- |
| `identity-access` | Profils, sessions, rôles, autorisations et vue invité. | Stockage des identités et sessions. |
| `home-control` | Inventaire, capacités, états et commandes d'appareils. | Home Assistant. |
| `routines-scenes` | Scènes, modes maison, routines et confirmations. | Port de commande maison, planificateur. |
| `agenda-reminders` | Calendriers, rappels, échéances et notifications. | Google Calendar, stockage, planificateur. |
| `weather` | Conditions actuelles et prévisions localisées. | Fournisseur météo via un port dédié. |
| `assistant` | Questions libres, interprétation d'intention, confirmations et réponses. | Fournisseur IA autorisé, ports des autres modules. |
| `memory-preferences` | Préférences, mémoire contrôlable et rétention. | Stockage chiffré si retenu. |
| `system-health` | Santé, capacités disponibles, audit minimal et diagnostics. | Horloge, stockage, sondes d'intégration. |

Un module est propriétaire de son modèle et de ses règles. Il ne peut pas requêter directement le stockage ou les adaptateurs d'un autre module. Les échanges passent par une façade applicative, un contrat typé ou un événement applicatif local documenté. Les dépendances sont orientées vers le domaine : l'application déclare les ports dont elle a besoin ; les adaptateurs les implémentent.

## Architecture hexagonale dans chaque module

```text
module/
├── model/          # entités, objets-valeur, règles et événements métier
├── application/    # cas d'usage, ports d'entrée et ports de sortie
├── adapters/
│   ├── inbound/    # HTTP, WebSocket, tâches planifiées, commandes assistant
│   └── outbound/   # stockage, Home Assistant, Google, IA, météo, horloge
└── registry/       # optionnel : découverte/routage de capacités ou connecteurs
```

- **Model** : ne dépend ni du réseau, ni du framework, ni du stockage.
- **Application** : orchestre les cas d'usage, vérifie les politiques et définit les interfaces vers l'extérieur.
- **Adapters** : transforment les protocoles et données externes en contrats d'application ; ils ne portent pas la règle métier.
- **Registry** : réservé à un besoin explicite de sélection de connecteur ou de capacité (par exemple, associer une capacité d'appareil au bon adaptateur). Sa surface est minimale, testée et locale au module ; il ne remplace pas l'injection de dépendances.

Les adaptateurs entrants réalisent l'authentification et la validation de forme. Les cas d'usage réalisent l'autorisation métier finale et retournent un résultat explicite : exécuté, refusé, confirmation requise, en attente, indisponible ou échoué.

## Contrats transverses

Les contrats suivants sont à établir avant leur première implémentation :

- `ActorContext` : identité, rôle, contexte d'écran partagé et autorisations utiles.
- `CommandResult` : résultat vérifiable d'une commande, jamais une réussite supposée.
- `ConfirmationRequest` : action proposée, raison, portée et expiration.
- `Capability` : action réellement supportée par un appareil ou une intégration.
- `AuditEntry` : trace minimale d'une action importante, sans conversation ou jeton inutile.
- `IntegrationHealth` : disponibilité, dernière synchronisation, mode dégradé et cause exploitable.

Les appels de mutation doivent recevoir une clé d'idempotence lorsqu'une répétition pourrait déclencher une action physique, créer un événement ou envoyer une notification.

## Priorité de construction

1. Socle d'exécution : configuration, observabilité minimale, API interne et santé.
2. `weather` : météo de La Ciotat, afin de valider le premier flux API externe de bout en bout.
3. `identity-access`, `home-control` et `system-health`.
4. Commandes d'éclairage/prises, état confirmé et une scène simple via `routines-scenes`.
5. `agenda-reminders`, puis assistant texte qui passe par les mêmes cas d'usage et confirmations.
6. Mémoire, voix, accès distant et automatisations à conséquences physiques, après cadrages spécifiques.

## Décisions restantes avant les modules suivants

- Stockage local, chiffrement au repos, migrations et stratégie de sauvegarde.
- Contrat d'authentification Home Panel et mode administrateur.
- Interface Home Assistant et mécanisme de réception des changements d'état.
- Fournisseurs autorisés pour météo, calendrier et IA, avec comportement hors ligne.
- Politique de conservation des transcriptions, mémoire et journal d'audit.

Voir les [diagrammes Mermaid](../diagrammes/README.md) et le [plan Docker](../infrastructure/docker.md).
La décision de structure est consignée dans l'[ADR-0001](adr/0001-monolithe-modulaire-docker.md).
Le runtime du premier incrément est consigné dans l'[ADR-0002](adr/0002-runtime-go.md).
