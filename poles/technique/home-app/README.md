# App Application · Home App

Première base de l’application mobile personnelle HOME AI, sous forme de SPA/PWA installable. Nom technique : `home-app`. Même pile et mêmes versions que Home Panel : React, TypeScript, Vite, Tailwind, shadcn/ui et `@yogesharc/thinking-orbs`.

## Démarrer

```sh
npm ci
npm run dev -- --port 5174
```

Vite transmet `/v1` à Home Core sur `127.0.0.1:18080`, comme Home Panel. `npm run check` vérifie TypeScript et la compilation de production. `npm run build` produit `dist/`.

## Première version

- Accueil : orb seul avec indication discrète ; toucher pour parler, toucher de nouveau pour envoyer (limite de 20 secondes). Transcription et réponse rendues par Home Core. Aucun fournisseur de reconnaissance vocale appelé directement depuis le navigateur.
- Barre flottante : Accueil, Domotique, Tâches ménagères, Rappels, Système.
- Domotique : inventaire, état et allumage/extinction via les contrats existants de Home Core ; erreurs et états inconnus explicites. Actualisation manuelle.
- Système : état de la Raspberry Pi (RAM, stockage, charge CPU, réseau et disponibilité Internet) depuis `GET /v1/system/metrics`, avec actualisation toutes les 5 secondes. Les métriques indisponibles sont signalées sans réutiliser de valeurs périmées.
- Tâches et rappels : écrans d’attente, à raccorder après définition des contrats API et sessions privées. Aucune donnée de démonstration.
- Portrait adaptatif, zones sûres iPhone et blocage visuel en paysage. Le manifeste demande le portrait ; iOS peut ignorer le verrouillage système, d’où le blocage visuel.
- Capture arrêtée en quittant l’accueil, en arrière-plan ou en paysage. Aucun audio conservé dans le stockage navigateur.
- Installation : manifeste, icônes PNG et service worker de production. Cache du shell statique uniquement, API et commandes exclues. Hors connexion, seul le shell reste accessible après une première visite complète.

## Téléphone et déploiement

Sur téléphone, servir via HTTPS pour utiliser le micro et installer la PWA. Safari iOS : Partager → Sur l’écran d’accueil ; Chrome Android : Installer l’application. L’installation physique iOS/Android et le microphone réel restent à vérifier sur appareil.

Le Dockerfile fournit une cible de production nginx. `docker compose -f compose.production.yaml up --build` lie le HTTPS du frontend à `127.0.0.1:13444` ; le service `home-core:8080` doit être joignable depuis le réseau Compose (réseau partagé `home-ai`, à créer/configurer avec le déploiement Home Core). Tailscale Serve fournit le HTTPS navigateur sur `https://<raspberry>.tailnet.ts.net:8444/` et transmet en HTTPS interne vers nginx. Aucune exposition directe de Home Assistant, aucun jeton intégré au frontend. L’authentification et l’accès distant restent ceux du déploiement Home Core ; aucun parcours de connexion nouveau n’est implémenté ici.

## Rappels et notifications Push

La vue Rappels crée et modifie les rappels Home AI avec une heure facultative. Les rappels historiques sans heure restent visibles mais ne déclenchent pas de notification. Le bouton « Activer les notifications » ne demande la permission qu’après un geste utilisateur, récupère la clé VAPID publique auprès de Home Core et y transmet l’abonnement chiffré du navigateur.

Sur iPhone, installer d’abord Home App via Safari → Partager → Sur l’écran d’accueil, puis ouvrir cette PWA installée avant d’activer les notifications. Safari ne garantit pas l’autorisation Push dans un onglet ordinaire. Les contenus de notification sont volontairement génériques ; consulter l’application pour le détail du rappel.

Décision et flux : [ADR 001](architecture/adr/001-pwa-mobile.md).

## GitHub Actions et GitHub Pages

Le workflow unique [deploy-home-panel-pages.yml](../../../../.github/workflows/deploy-home-panel-pages.yml) construit **les deux applications** à chaque push sur `main`, puis publie un artefact Pages commun. Il peut aussi être lancé manuellement depuis Actions. Les pull requests vérifient les builds sans publier.

- Home Panel : https://clementortiz134595.github.io/HOME-AI/
- Home App : https://clementortiz134595.github.io/HOME-AI/app/

Dans GitHub → Settings → Pages, choisir **GitHub Actions** comme source (déjà utilisée par le workflow Panel distant). Ne pas ajouter un second workflow Pages indépendant : il remplacerait le site existant. L’environnement `github-pages` conserve les règles de déploiement du dépôt. Les URL effectives figurent dans le résumé du job après publication.

Ces adresses deviennent disponibles après intégration des fichiers sur `main` et réussite du workflow. Aucun domaine ni secret supplémentaire nécessaire. GitHub Pages ne fournit **aucun proxy `/v1`** : la voix et la domotique y restent indisponibles tant que l’accès sécurisé à Home Core n’est pas configuré. Ne jamais mettre de clé privée dans les variables Vite publiques.

Pour reproduire le build Pages :

```sh
VITE_BASE_PATH=/HOME-AI/app/ npm run check
```

Le build Docker reste à la racine `/` en l’absence de `VITE_BASE_PATH`. Le manifeste utilise des chemins relatifs et le service worker est limité au chemin de Home App. Voir [ADR 002](architecture/adr/002-github-pages.md).

## Dictée navigateur et animations

La dictée utilise en priorité `SpeechRecognition` / `webkitSpeechRecognition` en `fr-FR` et affiche la transcription intermédiaire. Cette reconnaissance dépend du navigateur et peut utiliser le service de son fournisseur ; elle ne garantit ni un traitement sur l’appareil ni un fonctionnement hors ligne. En l’absence d’API, le mode audio Home Core reste disponible. Une erreur de service navigateur permet de réessayer via Home Core ; un refus micro reste un refus.

Le texte reconnu est envoyé à `/v1/assistant/questions` (`{ "text": "…" }`), contrat conversationnel existant. Les commandes métier du flux vocal Home Core restent propres à `/v1/assistant/voice` : la reconnaissance navigateur n’ajoute pas un nouveau routage domotique. Sur Pages sans accès au serveur, la transcription reste affichée et l’indisponibilité de la réponse est explicite.

Animations thinking-orbs : `waiting` pour l’activation, `using/record` pour l’écoute, `working/gyro` pour la finalisation, `reasoning/twins` pour la réflexion, `idle/blink` vert pour la réponse, `waiting` rose pour l’erreur. La préférence système de réduction des animations est respectée par la bibliothèque. Barre flottante à 6 px au-dessus de la zone sûre.


## Recherche et affichage contextuel

L’accueil conserve le grand orb pour l’écoute. Pendant le traitement, l’orb passe à 52 px et une vue défilante montre la demande, la progression observable et la réponse. Les étapes se replient après affichage et restent consultables.

Cartes disponibles : réponse générale avec titres/listes, biographie avec chronologie des dates effectivement citées, carrousel Gmail adapté du Panel, états domotiques, rappels, tâches, trains et ETF. Les réponses sont toujours conservées comme texte accessible ; les données supplémentaires viennent uniquement de Home Core. Le rendu ne déclenche aucune mutation depuis les mots de la demande. Les confirmations utilisent le jeton opaque renvoyé par Home Core et son contrat existant. Le mode texte conversationnel ne remplace pas le routage métier du mode vocal serveur.

Les ETF sont sélectionnés dans l’inventaire configuré du serveur ; nommer un symbole permet de le cibler. Les variations sont calculées depuis l’historique daté, jamais depuis les cours/variations statiques actuellement présents dans la liste serveur. Aucun rendement de portefeuille n’est calculé sans positions et prix de revient. Les séries indisponibles sont affichées explicitement.

Le backend actuel ne diffuse pas d’événements par appel d’outil : les étapes visibles correspondent à la transcription, la requête assistant, la réception de la réponse et la lecture des sources. Aucun raisonnement interne n’est simulé. Les pièces jointes Gmail s’ouvrent via les liens du serveur ; aucun aperçu Office/PDF n’est ajouté au mobile dans cet incrément.

Tests de contrats : `npm test` (Node 24 ou supérieur) ; inclus dans `npm run check`. Vérifications Chromium effectuées avec sources simulées : carrousel, chronologie, cartes métier, refus/confirmation avant lecture Gmail, recalcul ETF, série indisponible, échec/reprise de source, quatre formats portrait, retour à l’orb. Les données réelles et le micro sur téléphone restent à vérifier sur le déploiement connecté au Home Core du foyer.

Décision et bibliothèque examinée : [ADR 003](architecture/adr/003-reponses-contextuelles.md).
