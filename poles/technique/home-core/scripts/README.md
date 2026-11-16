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
`tailscale serve --bg 13000`, puis affiche l'URL privée. Tailscale peut demander
d'activer MagicDNS et les certificats HTTPS lors de la première exécution.
L'URL est accessible seulement aux appareils autorisés du tailnet. Ne pas
activer Funnel ni une redirection de port sur le routeur.
