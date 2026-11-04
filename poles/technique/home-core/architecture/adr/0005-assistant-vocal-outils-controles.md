# ADR-0005 — Assistant vocal et outils contrôlés

## Statut

Acceptée pour le contrat d’orchestration. Le premier adaptateur STT utilise Google Cloud Speech-to-Text V2 avec le modèle Chirp 3 en `fr-FR`, dans la région européenne ; le fournisseur reste remplaçable par le port applicatif. La détection du mot-clé utilise sherpa-onnx dans Home Core et remplace le prototype openWakeWord exécuté sur macOS.

## Décision

Home Core orchestre une interaction vocale selon la chaîne `audio → vérification de locuteur → STT → interprétation d’intention → politique de confirmation → outil de module → réponse`. Chaque étape est un port applicatif du module `assistant`. Les outils appellent les façades des modules `home-control`, `google-workspace` ou autres modules autorisés.

Les commandes maison déterministes peuvent être interprétées sans LLM. La vérification de locuteur compare un embedding vocal à des profils enrôlés et retourne `unknown` sous le seuil de confiance. Les lectures Gmail/Drive et les actions externes restent soumises à l’identité, aux droits et, si nécessaire, à une confirmation explicite. Une correspondance vocale seule ne constitue jamais une authentification forte.

## Conséquences

- L’audio brut n’est pas journalisé par défaut et son envoi hors domicile doit être explicite.
- Le résultat d’un outil est vérifiable : exécuté, confirmation requise, refusé, indisponible ou échoué.
- STT, LLM, TTS, Home Assistant, Gmail et Drive sont remplaçables par des adaptateurs testables.
- La capture locale conserve un pré-roll court, attend une fin de parole stabilisée et limite la phrase à 15 secondes.
- La transcription est renvoyée au Home Panel avant la réponse afin de distinguer une erreur de capture d'une erreur d'interprétation.
- Après le mot-clé, Home Panel réutilise le flux microphone déjà autorisé afin d'éviter deux captures concurrentes. Une reconnaissance navigateur `fr-FR` peut afficher des résultats intermédiaires pendant la parole ; le STT Home Core reste la transcription finale de référence.

## Extension — mot-clé local multiarchitecture

Le mot-clé est détecté dans le conteneur Home Core par sherpa-onnx Keyword Spotting avec un modèle anglais GigaSpeech quantifié. L'adaptateur implémente le port `WakeWordDetector` du module `assistant` et accepte des trames PCM mono 16 kHz. Les expressions initiales sont `Hey Jarvis` et `Jarvis`.

En développement macOS, Home Panel capture le microphone autorisé par le navigateur, convertit le signal en PCM 16 kHz et l'envoie à Home Core. Docker Desktop n'accède pas directement au microphone du Mac. Sur Raspberry Pi, un adaptateur ALSA fournira les mêmes trames au même port depuis `/dev/snd`. Le détecteur, son modèle et les règles de session restent identiques sur Linux `amd64` et `arm64`.

Les trames de veille restent locales au réseau Docker et ne sont envoyées ni au STT Google ni au fournisseur IA. Seul l'extrait enregistré après détection est transmis à l'adaptateur STT. sherpa-onnx impose CGO et des bibliothèques dynamiques ; l'image Home Core utilise donc une base glibc multiarchitecture au lieu d'un binaire Alpine totalement statique. Aucun second serveur ni microservice n'est introduit.

## Extension — état vocal exposé au Home Panel

Home Core expose un état vocal éphémère (`idle`, `listening`, `thinking`, `answered`, `error`).
Le listener local publie les transitions au Core ; Home Panel ne se connecte jamais directement au
micro, à Google ou à Gemini. Le statut ne conserve ni audio ni secret et la réponse est retirée
automatiquement après quelques secondes.
