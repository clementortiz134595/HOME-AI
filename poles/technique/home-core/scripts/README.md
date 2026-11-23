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

Le déploiement normal est déclenché par un runner GitHub Actions installé sur
la Pi lorsque le workflow de publication GHCR d'un tag `v*` se termine. Le
runner établit lui-même une connexion sortante vers GitHub : aucun port entrant
sur le réseau domestique, secret SSH GitHub ou webhook local n'est nécessaire.

Créer le runner une seule fois depuis **Settings > Actions > Runners > New
self-hosted runner** du dépôt. Choisir Linux/ARM64, puis exécuter les commandes
affichées avec l'utilisateur `clement`, en ajoutant le label `home-ai-rpi` :

```bash
mkdir -p ~/actions-runner && cd ~/actions-runner
# télécharger et extraire l'archive Linux ARM64 proposée par GitHub
./config.sh --url https://github.com/clementortiz134595/HOME-AI \
  --token '<jeton-éphémère-GitHub>' --name home-ai-rpi \
  --labels home-ai-rpi --work _work --unattended
sudo ./svc.sh install clement
sudo ./svc.sh start
```

Le jeton affiché par GitHub expire rapidement. Ne pas le copier dans un fichier,
une variable shell persistante ou le dépôt. Vérifier l'état depuis GitHub ou :

```bash
sudo systemctl status actions.runner.clementortiz134595-HOME-AI.home-ai-rpi
```

Le minuteur de vérification périodique des tags est désactivé en production :
le runner est l'unique déclencheur automatique. Il peut être réactivé
explicitement comme solution de secours lors d'un incident, puis désactivé à
nouveau :

```bash
sudo systemctl enable --now home-ai-release-watcher.timer
# après rattrapage :
sudo systemctl disable --now home-ai-release-watcher.timer
```

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

Pour utiliser les images ARM64 publiées par GitHub Actions, configurer dans le
fichier local `~/.config/home-ai/deploy.env` (ou le fichier indiqué par
`HOME_AI_DEPLOY_ENV_FILE`) :

```sh
HOME_AI_IMAGE_REGISTRY=ghcr.io/clementortiz134595
HOME_AI_HOME_CORE_IMAGE=ghcr.io/clementortiz134595/home-core:v0.1.17
HOME_AI_HOME_PANEL_IMAGE=ghcr.io/clementortiz134595/home-panel:v0.1.17
HOME_AI_HOME_APP_IMAGE=ghcr.io/clementortiz134595/home-app:v0.1.17
```

Le script tire alors les images et utilise `--no-build`. Les identifiants GHCR,
s'ils sont nécessaires pour des paquets privés, restent dans la configuration
Docker locale de la Raspberry et ne sont jamais commités.

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

Home App requiert les fichiers locaux `home-app.pem` et
`home-app-key.pem`. Le script de release choisit automatiquement
`~/.config/home-ai/home-app-certs` lorsqu'il existe ; sinon, définir
`HOME_APP_CERTS_DIR` dans l'environnement du service runner. Il vérifie ces
deux fichiers **avant** de mettre à jour les conteneurs, afin qu'un certificat
manquant ne provoque jamais de déploiement partiel suivi d'un rollback.

## Accès LAN optionnel au Home Panel

Par défaut, Home Panel reste limité à `127.0.0.1:13000` et passe par Tailscale Serve. Pour l'ouvrir explicitement aux appareils du réseau local, créer hors du dépôt `~/.config/home-ai/deploy.env` avec :

```sh
HOME_PANEL_BIND_ADDRESS=0.0.0.0
```

La release suivante lit ce fichier pour Docker Compose. Seul Home Panel est alors publié sur le LAN ; Home Core et Home Assistant restent privés. Cette ouverture doit être réservée à un réseau domestique de confiance.

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
