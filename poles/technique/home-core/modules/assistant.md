# Module `assistant`

Le module fournit les questions libres du Home Panel via Home Core.

## Contrat HTTP initial

`POST /v1/assistant/questions`

```json
{"text":"Qui est Napoléon Bonaparte ?"}
```

Réponse réussie :

```json
{"text":"...","provider":"gemini","model":"gemini-2.5-flash-native-audio-preview-12-2025","generated":true}
```

Les erreurs de forme renvoient `400`. Une configuration absente ou une panne du fournisseur renvoie `502` avec `assistant_unavailable`. Le fournisseur ne reçoit que la question et aucun secret n'est retourné au client.

## Configuration

- `HOME_CORE_AI_BASE_URL` : URL de base de l'API Gemini.
- `HOME_CORE_AI_API_KEY` : clé conservée par Home Core, jamais côté navigateur ni dans les logs.
- `HOME_CORE_AI_MODEL` : modèle à utiliser ; choix initial : `gemini-2.5-flash-native-audio-preview-12-2025`.

Pour l'audio bidirectionnel, l'adaptateur devra utiliser Gemini Live API ; le client texte actuel reste un incrément de transition et ne doit pas être présenté comme une intégration audio complète.

Ce premier incrément ne fournit aucun outil au modèle et ne permet pas de déclencher une action sur la maison. Les commandes locales restent indépendantes de la disponibilité de l'IA.

## Contrat vocal initial

Home Core expose aussi `POST /v1/assistant/speech` avec `{"text":"..."}` et retourne un flux `audio/mpeg` généré par ElevenLabs. La clé reste côté Home Core via `HOME_CORE_TTS_API_KEY`; le modèle par défaut est `eleven_v4_turbo` et la voix est configurable via `HOME_CORE_TTS_VOICE_ID`.

`POST /v1/assistant/voice` accepte un corps audio `audio/webm` (limite 10 MiB). La réponse contient la transcription et la réponse texte de l’assistant :

```json
{"transcript":"Qui est Napoléon ?","answer":{"text":"..."}}
```

Le navigateur capture le microphone avec `MediaRecorder` et arrête la capture après environ une seconde de silence, ou après dix secondes. L’adaptateur STT utilise Google Cloud Speech-to-Text V2 avec le modèle Chirp 3 :

- `HOME_CORE_STT_BASE_URL` : préfixe d'API, par défaut `https://speech.googleapis.com/v2/projects`.
- `HOME_CORE_STT_API_KEY` : clé Google Cloud conservée par Home Core, avec l’API Speech-to-Text activée.
- `HOME_CORE_STT_PROJECT` : projet Google Cloud qui porte Speech-to-Text.
- `HOME_CORE_STT_LOCATION` : région V2, `eu` par défaut.
- `HOME_CORE_STT_LANGUAGE` : langue BCP-47, par défaut `fr-FR`.

## Mot-clé local

`POST /v1/assistant/wake` accepte des trames PCM float32 little-endian, mono 16 kHz. L'adaptateur sherpa-onnx les traite dans Home Core et répond `{"detected":true}` lorsqu'il reconnaît « Bonjour Jarvis ». Les trames de veille restent locales et ne sont jamais transmises au STT Google.

Le modèle GigaSpeech quantifié et ONNX Runtime sont embarqués dans l'image Docker Linux `amd64`/`arm64`. Home Panel fournit les trames depuis le navigateur sur macOS ; l'adaptateur Raspberry Pi utilisera ensuite ALSA via `/dev/snd` sans modifier le détecteur.

## Cerveau d'orchestration

Le cas d'usage `NewAgent` assemble la chaîne applicative vocale : transcription, interprétation d'intention via Gemini en JSON, politique de confirmation et registre d'outils. Gemini peut produire `home.turn_on`, `home.turn_off`, `agenda.list`, `gmail.search`, `drive.search` ou `assistant.question`. Home Core valide la liste d'intentions autorisées, force le caractère sensible de Gmail, Drive et agenda, puis décide si une confirmation est nécessaire. Les autres phrases deviennent `assistant.question` et sont envoyées au même fournisseur via le port `QuestionAnswerer`.

Le modèle ne déclenche jamais directement un outil : il propose une intention et ses paramètres. Home Core conserve l'exécution, les permissions, la confirmation et le retour d'erreur. L'ancien interpréteur déterministe reste disponible comme fallback technique si aucun interpréteur n'est fourni, mais l'assemblage de production injecte le client Gemini.

Les intégrations concrètes sont injectées dans le registre par Home Core. Un outil absent retourne `unavailable` et ne déclenche aucune action implicite. Cette implémentation ne prétend pas fournir à elle seule les adaptateurs STT, TTS, Home Assistant, Gmail ou Drive : ceux-ci doivent être branchés séparément.

## Vérification biométrique vocale

`SpeakerVerifier` compare l'embedding produit par un `VoiceEmbedder` à des profils enrôlés via un `VoiceProfileStore`. Il retourne un profil et une confiance au-dessus du seuil, sinon `unknown`. Le dépôt ne conserve pas l'audio brut dans les profils. L'adaptateur d'embedding reste à choisir et doit être local ou explicitement autorisé ; la correspondance vocale ne remplace pas une authentification forte pour les données et actions sensibles.

Home Panel propose l'enrôlement via `POST /v1/assistant/voice-profiles/{profileId}` avec un extrait audio `audio/webm`. Le parcours UI est disponible ; l'API répond `503 voice_enrollment_unavailable` tant qu'un `VoiceEmbedder` concret n'est pas configuré dans Home Core.
