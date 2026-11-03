# Prototype wake word sur Mac

Ce prototype garde le micro et la détection du mot-clé sur le Mac. Il utilise
`openWakeWord` avec le modèle local `hey_jarvis`, puis envoie uniquement
l'extrait capturé après détection à `POST /v1/assistant/voice` de Home Core.

## Préparer l'environnement

Depuis `poles/technique/home-core` :

```bash
python3 -m venv .venv-mac-wakeword
PIP_USER=no .venv-mac-wakeword/bin/pip install openwakeword sounddevice
.venv-mac-wakeword/bin/python -c 'from openwakeword.utils import download_models; download_models()'
```

## Lancer

Home Core doit déjà être disponible sur `http://127.0.0.1:18080` :

```bash
.venv-mac-wakeword/bin/python scripts/mac-wakeword.py
```

macOS demandera l'autorisation d'accès au microphone au premier lancement.
Les trames avant « Hey Jarvis » restent locales et ne sont pas transmises à
Home Core ni à Google. Le fichier WAV envoyé après détection est traité par
l'adaptateur STT de Home Core.

Ce script est un adaptateur matériel de prototype pour Mac ; il sera remplacé
par l'adaptateur ALSA du serveur domestique lors du déploiement Raspberry Pi.
