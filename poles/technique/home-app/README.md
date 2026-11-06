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
- Barre flottante : Accueil, Domotique, Tâches ménagères, Rappels.
- Domotique : inventaire, état et allumage/extinction via les contrats existants de Home Core ; erreurs et états inconnus explicites. Actualisation manuelle.
- Tâches et rappels : écrans d’attente, à raccorder après définition des contrats API et sessions privées. Aucune donnée de démonstration.
- Portrait adaptatif, zones sûres iPhone et blocage visuel en paysage. Le manifeste demande le portrait ; iOS peut ignorer le verrouillage système, d’où le blocage visuel.
- Capture arrêtée en quittant l’accueil, en arrière-plan ou en paysage. Aucun audio conservé dans le stockage navigateur.
- Installation : manifeste, icônes PNG et service worker de production. Cache du shell statique uniquement, API et commandes exclues. Hors connexion, seul le shell reste accessible après une première visite complète.

## Téléphone et déploiement

Sur téléphone, servir via HTTPS pour utiliser le micro et installer la PWA. Safari iOS : Partager → Sur l’écran d’accueil ; Chrome Android : Installer l’application. L’installation physique iOS/Android et le microphone réel restent à vérifier sur appareil.

Le Dockerfile fournit une cible de production nginx. `docker compose -f compose.production.yaml up --build` expose le frontend sur le port 8081. Le service `home-core:8080` doit être joignable depuis le réseau Compose (réseau partagé `home-ai`, à créer/configurer avec le déploiement Home Core). Placer un reverse proxy HTTPS devant nginx. Aucune exposition directe de Home Assistant, aucun jeton intégré au frontend. L’authentification et l’accès distant restent ceux du déploiement Home Core ; aucun parcours de connexion nouveau n’est implémenté ici.

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
