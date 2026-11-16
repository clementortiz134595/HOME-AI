# Mot-clé local dans Docker

Le prototype Python/openWakeWord sur macOS a été retiré. Home Core embarque
désormais sherpa-onnx Keyword Spotting et le modèle GigaSpeech quantifié dans
son image Docker multiarchitecture.

En développement, Home Panel demande l'autorisation du microphone au
navigateur, convertit les trames en PCM mono 16 kHz et les envoie uniquement à
`POST /v1/assistant/wake` sur Home Core. Après détection de « Bonjour Jarvis »,
« Jarvis », le panel ouvre la capture de la question et l'envoie à
`POST /v1/assistant/voice`.

Les trames de veille restent dans le réseau local et ne sont pas envoyées à
Google. Sur Raspberry Pi, l'adaptateur d'entrée sera ALSA via `/dev/snd` ; le
détecteur sherpa-onnx et son modèle restent inchangés.

## Lancer

Depuis la racine du dépôt :

```bash
docker compose up -d --build
```

## Déployer une release GitHub sur le Raspberry Pi

La Pi surveille les tags `v*` toutes les cinq minutes. Lorsqu'un nouveau tag
est détecté, elle sélectionne son commit, reconstruit localement les images
ARM64 de Home Core, Home Panel et Home App, puis vérifie les trois services.
Le déploiement reste pull-based : GitHub ne peut pas se connecter au
réseau domestique.

Installer cette surveillance une seule fois, depuis le clone de déploiement
propre sur la Raspberry Pi :

```bash
./poles/technique/home-core/scripts/install-release-watcher.sh
```

Le minuteur `home-ai-release-watcher.timer` est persistant : un tag manqué
pendant un arrêt de la Pi est traité à son redémarrage. Pour déclencher une
vérification sans attendre :

```bash
sudo systemctl start home-ai-release-watcher.service
```

Le déploiement manuel reste disponible pour une release précise :

```bash
./poles/technique/home-core/scripts/deploy-release.sh <tag>
```

Le script ne déploie que des tags présents sur `origin`, attend la santé de
Home Core et annule vers la révision précédente en cas d'échec. Pour demander
ce retour manuellement :

```bash
./poles/technique/home-core/scripts/deploy-release.sh --rollback
```

Le clone doit rester sans modification locale. Le minuteur comme le script
manuel refusent de déployer si le checkout a été modifié. Les secrets et
données persistantes ne doivent jamais être stockés dans ce checkout.
L'override local de Home App (`~/.config/home-ai/home-app.compose.override.yaml`)
est conservé et chargé lorsqu'il existe.

Ouvrir ensuite Home Panel sur le port publié par Compose et autoriser le
microphone dans le navigateur.

## Accès distant privé Tailscale

Sur la Raspberry Pi, installer le client Tailscale selon la
[documentation officielle](https://tailscale.com/download/linux), puis connecter
l'hôte au tailnet avec `sudo tailscale up`. Cette étape ouvre une authentification
dans le navigateur ; ne pas enregistrer de clé d'authentification dans le dépôt.

Une fois la pile démarrée depuis la racine du dépôt, activer l'entrée HTTPS
privée :

```bash
./poles/technique/home-core/scripts/configure-tailscale-serve.sh
```

Le script vérifie que le Panel répond sur `127.0.0.1:13000`, configure
`tailscale serve --https=8443 --bg 13000`, puis affiche l'URL privée. Le port
`8443` évite le conflit avec Home App, qui utilise déjà `443` sur l'hôte. Il peut
être remplacé par `TAILSCALE_SERVE_PORT` lorsqu'un point d'entrée HTTPS unique
aura été retenu. Tailscale peut demander d'activer MagicDNS et les certificats
HTTPS lors de la première exécution.
L'URL est accessible seulement aux appareils autorisés du tailnet. Ne pas
activer Funnel ni une redirection de port sur le routeur.
