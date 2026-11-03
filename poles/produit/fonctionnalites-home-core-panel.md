# Référentiel fonctionnel — Home Panel & Home Core

> Statut : vision de référence à découper et valider. Ce document décrit le périmètre fonctionnel cible ; il ne vaut ni choix technique, ni engagement de livraison. L'application mobile native est explicitement hors périmètre pour l'instant.

## Objet et frontières

HOME AI s'organise actuellement autour de deux applications complémentaires :

| Application | Rôle | Utilisateurs et contexte |
| --- | --- | --- |
| **Home Panel** | Interface visuelle partagée et tactile du foyer : consultation, commandes et raccourcis. | Tablette murale ou posée, navigateur sur ordinateur ; certaines vues sont accessibles sur téléphone via le web, sans constituer une application mobile native. |
| **Home Core** | Cœur local privé : assistant, règles métier, données, intégrations, permissions et passerelle contrôlée vers la domotique. | Raspberry Pi ou serveur domestique ; aucun écran utilisateur direct requis. |

Home Panel ne parle jamais directement à Home Assistant, Google ou un fournisseur IA. Home Core porte les identités, autorisations, secrets, validations et retours d'état. Home Assistant reste le moteur des appareils et automatisations de la maison.

Les fonctions ci-dessous sont organisées par capacité utilisateur. Pour chacune, la répartition indique où la fonction doit être visible ou exécutée. Les détails de priorisation, d'équipement et de faisabilité restent à instruire.

## 1. Accueil du foyer et information utile

| Fonctionnalité | Home Panel | Home Core |
| --- | --- | --- |
| Accueil configurable | Affiche une synthèse calme : heure, date, météo, prochain élément utile, état global de la maison et raccourcis. | Agrège les sources, applique les préférences et ne retourne que les données autorisées au contexte d'écran. |
| Agenda du foyer | Vue du jour, semaine et prochains événements ; distinction visible entre information partagée et privée. | Lit et normalise les calendriers autorisés, isole les profils et synchronise les changements confirmés. |
| Rappels et tâches | Liste ce qui est dû, permet de marquer fait, reporter ou créer un rappel selon les droits. | Gère les échéances, récurrences, propriétaires, notifications et historique minimal. |
| Météo et contexte extérieur | Présente les conditions et prévisions utiles à la journée. | Interroge et met en cache une source choisie, avec mode dégradé explicite. |
| État de la maison | Résume appareils indisponibles, alertes, portes/fenêtres ou consommation lorsque les capteurs existent. | Collecte les états Home Assistant et classe les anomalies sans inventer de donnée. |
| Informations du foyer | Affiche messages partagés, liste de courses ou notes communes si ces fonctions sont retenues. | Stocke les données partagées, leurs auteurs et règles de visibilité. |

## 2. Assistant IA conversationnel

| Fonctionnalité | Home Panel | Home Core |
| --- | --- | --- |
| Poser des questions libres | Zone de conversation texte pour questions générales, explications, idées, calculs ou aide à l'organisation. | Orchestre le modèle local ou cloud autorisé, le contexte minimal et les garde-fous. |
| Conversation contextualisée | Montre clairement ce que l'assistant sait ou utilise et permet de corriger une réponse. | Récupère seulement le contexte pertinent et autorisé ; sépare conversation, mémoire personnelle et données du foyer. |
| Actions par langage naturel | Permet de demander une action : « ajoute ceci au calendrier », « éteins le salon », « prépare la routine coucher ». | Détecte l'intention, vérifie le droit, demande une précision ou confirmation puis appelle l'outil adapté. |
| Transparence et contrôle | Affiche si une action a été exécutée, refusée ou reste à confirmer ; accès aux réglages de mémoire. | Journalise l'action nécessaire à l'audit, expose explication et mécanismes de correction/suppression. |
| Continuité en cas d'indisponibilité IA | Explique que la réponse libre est indisponible sans bloquer les commandes déterministes. | Route les commandes maison et règles locales sans dépendre d'un LLM ; déclare les capacités indisponibles. |

## 3. Interaction vocale

| Fonctionnalité | Home Panel | Home Core |
| --- | --- | --- |
| Démarrer une interaction | Bouton tactile « parler » et indicateur d'écoute ; une activation par mot-clé peut être ajoutée après validation matérielle. | Reçoit l'audio, applique la chaîne wake word/STT/routage/TTS retenue et protège le flux audio. |
| Comprendre les commandes | Affiche la transcription et la commande comprise lorsque cela améliore la confiance. | Distingue commande domestique, demande personnelle et question libre ; redemande une précision en cas d'ambiguïté. |
| Répondre oralement | Affiche l'état de réponse et permet d'arrêter la lecture. | Produit une réponse courte pour la domotique et une réponse adaptée aux questions ; gère TTS et les échecs. |
| Vie privée vocale | Rend visible l'état écoute/traitement et les paramètres disponibles. | Prévoit un traitement local du mot-clé s'il est retenu, une politique de rétention et, à terme, un coupe-micro matériel. |

Une voix seule ne suffit jamais à donner accès à une information ou une action sensible.

## 4. Calendrier, rappels et organisation personnelle

| Fonctionnalité | Home Panel | Home Core |
| --- | --- | --- |
| Connecter Google Calendar | Parcours de connexion et de consentement, puis état de synchronisation compréhensible. | Gère OAuth, jetons et synchronisation sans les exposer au navigateur. |
| Consulter les agendas | Affiche les calendriers et créneaux auxquels la session a droit. | Applique les règles de visibilité par profil, calendrier et contexte partagé. |
| Créer, modifier et supprimer un événement | Formulaire et commande en langage naturel ou vocal ; récapitulatif avant validation pour les actions à risque. | Interprète date, fuseau, calendrier cible et invités si autorisés ; exécute l'opération et gère les conflits. |
| Créer et gérer des rappels | Création rapide, échéance, récurrence, report et clôture. | Planifie les notifications, conserve la propriété et applique les canaux autorisés. |
| Notifications | Affiche les rappels pertinents et les erreurs de synchronisation sans révéler d'information privée sur un écran partagé. | Choisit le canal autorisé (panel, navigateur, téléphone à terme), l'horaire et les relances. |

## 5. Contrôle de la maison connectée

| Fonctionnalité | Home Panel | Home Core |
| --- | --- | --- |
| Pilotage des lumières | Allumer, éteindre, varier et choisir une scène/couleur lorsque l'équipement le permet. | Traduit la demande vers Home Assistant, contrôle les droits et retourne l'état réellement confirmé. |
| Pilotage des prises | Allumer/éteindre une prise, visualiser son état et éventuellement la consommation. | Exécute la commande autorisée, traite les délais et signale un appareil indisponible. |
| Autres appareils compatibles | Prévoit les vues et commandes pour stores, chauffage, capteurs, ventilateurs ou médias, seulement après ajout matériel validé. | Expose un modèle de capacité commun et limite chaque appareil aux actions compatibles. |
| Commandes par pièce et favoris | Organise les appareils par pièce, affiche les favoris et les commandes rapides. | Maintient l'inventaire, les pièces, les libellés et la disponibilité. |
| État en temps réel | Montre clairement en cours, réussi, échec, hors ligne ou état inconnu ; ne prétend jamais qu'une commande a réussi sans retour. | Suit les états remontés par Home Assistant, gère les délais, les reprises et les erreurs exploitables. |
| Commandes sensibles | Demande une confirmation adaptée pour les actions pouvant avoir une conséquence importante. | Applique une politique d'autorisation et de confirmation ; conserve une trace minimale. |

## 6. Scènes, routines et automatisations

| Fonctionnalité | Home Panel | Home Core |
| --- | --- | --- |
| Scènes immédiates | Lance des scènes explicites : « Salon », « Tout éteindre », « Arrivée », « Départ », « Coucher ». | Coordonne les appels Home Assistant et renvoie un résultat par appareil ou une erreur intelligible. |
| Routines planifiées | Consulte, active/désactive et explique les routines autorisées. | Planifie des déclencheurs horaires, solaires, de présence consentie ou d'état de capteur. |
| Édition contrôlée | Offre un parcours simple pour ajuster une routine, avec aperçu des effets. | Valide les règles, les permissions et les conflits ; versionne ou conserve un historique minimal. |
| Modes de maison | Affiche et permet de changer des modes tels que présent, absent, nuit ou vacances si retenus. | Détermine les effets autorisés, prévient les actions dangereuses et reste opérant sans IA cloud. |
| Suspendre et reprendre | Permet une désactivation temporaire visible et réversible. | Respecte les exceptions manuelles, les délais et les conditions de reprise. |

## 7. Mémoire, personnalisation et profils

| Fonctionnalité | Home Panel | Home Core |
| --- | --- | --- |
| Profils et sessions | Permet d'identifier la session ou de basculer vers une vue partagée/verrouillée. | Gère comptes, rôles, sessions, permissions et révocations. |
| Espace privé et espace foyer | Sépare visuellement le personnel du partagé ; protège l'accès à la vue privée. | Cloisonne données, calendrier, rappels et mémoire par propriétaire ; définit les données réellement communes. |
| Mémoire de l'assistant | Permet de voir, corriger, supprimer ou désactiver les souvenirs enregistrés. | Conserve seulement les informations utiles avec propriétaire, source, durée de rétention et mécanisme d'effacement. |
| Préférences | Gère unités, langue, ton, pièces/favoris, volume et préférences de notification. | Stocke les préférences autorisées et les applique selon le profil ou l'écran partagé. |
| Mode invité | Offre une interface maison limitée, sans données privées. | Bloque toute lecture ou écriture d'information personnelle et tout outil non autorisé. |

## 8. Sécurité, confidentialité et fiabilité

| Fonctionnalité | Home Panel | Home Core |
| --- | --- | --- |
| Connexion et verrouillage | Connexion explicite pour les fonctions privées ; verrouillage ou retour à la vue foyer sur un écran partagé. | Authentifie, renouvelle et révoque les sessions ; applique les rôles. |
| Consentement et données | Rend accessibles les consentements, données mémorisées, connecteurs actifs et demandes de suppression. | Minimise les données, chiffre et protège les secrets selon l'architecture retenue ; applique rétention et effacement. |
| Journal d'activité utile | Affiche les dernières actions pertinentes avec une visibilité adaptée. | Conserve un audit minimal des actions importantes sans enregistrer inutilement les conversations ou données sensibles. |
| Santé du système | Indique les problèmes actionnables : serveur, intégration, appareil, réseau ou synchronisation. | Surveille les dépendances, sauvegardes, mises à jour et restauration ; différencie absence de données et panne. |
| Fonctionnement dégradé | Présente ce qui reste disponible. | Préserve le contrôle local et les scènes déterministes lors d'une panne Internet ou IA ; évite les actions incertaines. |
| Accès distant | Donne une expérience de connexion cohérente sur appareil autorisé. | Protège l'accès par une solution validée (VPN privé ou HTTPS correctement sécurisé) ; Home Assistant n'est pas exposé directement. |

## 9. Administration du foyer

Ces fonctions sont réservées aux personnes administratrices et ne doivent pas encombrer la vue quotidienne.

- Gérer les membres, profils, rôles et accès invités.
- Connecter ou retirer un calendrier, une intégration IA, une source météo ou un équipement via Home Assistant.
- Inventorier les appareils, les classer par pièce, définir leurs noms et favoris, et contrôler leurs droits.
- Créer, revoir, activer, désactiver et dépanner les scènes et routines.
- Configurer les préférences de confidentialité, rétention, consentements, notifications et accès distant.
- Consulter l'état des intégrations, les journaux minimaux, les sauvegardes et les alertes de maintenance.
- Exporter ou supprimer les données dont la personne a le contrôle, selon les règles de confidentialité retenues.

## 10. Périmètre de livraison et dépendances

### Premier noyau à rendre fiable

1. Home Panel : accueil partagé, météo, état de base du foyer, raccourcis et retours d'état.
2. Home Core : authentification, permissions, API interne, intégration Home Assistant et journal minimal.
3. Domotique : éclairage, prises, commandes par pièce, « Tout éteindre » et une scène simple.
4. Organisation : lecture Google Calendar et rappels personnels protégés.
5. Assistant : conversation texte, commandes formulées naturellement avec confirmation et état réel.
6. Résilience : les commandes et scènes locales restent utilisables sans fournisseur IA cloud.

### Capacités à instruire avant réalisation

- Micro, haut-parleur, mot-clé, transcription et synthèse vocale : matériel, latence, confidentialité et mode dégradé.
- Équipements domotiques : compatibilité, protocole, installation en logement loué et consommation.
- Synchronisation Google Calendar : modèle de consentement, calendriers partagés, conflits et notifications.
- Mémoire : valeur réelle, politique de rétention, outils de contrôle et évaluation des erreurs.
- Automatisations de présence, chauffage, sécurité ou accès : consentement, conséquences physiques et confirmations.
- Accès distant, sauvegardes, reprise après incident et mises à jour.

### Hors périmètre actuel

- Application mobile native Home App et ses notifications/pouvoirs spécifiques : à cadrer dans un référentiel distinct.
- Administration brute de Home Assistant depuis Home Panel.
- Promesse d'une compatibilité universelle avec tout appareil domotique, fournisseur IA ou calendrier.
- Authentification sensible par reconnaissance vocale seule.

## Références du dépôt

- Les exigences synthétiques pour les agents sont dans [le contexte partagé](../../agent/knowledge/requirements.md).
- Les parcours produit associés sont documentés dans [Dashboard & PWA](dashboard-pwa/dossier.md), [Assistant personnel](assistant-personnel/dossier.md) et [Maison & routines](maison-routines/dossier.md).
- Les choix d'architecture, de confidentialité, de sécurité, de matériel ou de fournisseur restent à consigner dans les ADR appropriés.

