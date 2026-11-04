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
