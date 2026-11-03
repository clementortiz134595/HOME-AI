# ADR-0005 — Assistant vocal et outils contrôlés

## Statut

Acceptée pour le contrat d’orchestration. Le premier adaptateur STT utilise Google Cloud Speech-to-Text V2 avec le modèle Chirp 3 en `fr-FR`, dans la région européenne ; le fournisseur reste remplaçable par le port applicatif.

## Décision

Home Core orchestre une interaction vocale selon la chaîne `audio → vérification de locuteur → STT → interprétation d’intention → politique de confirmation → outil de module → réponse`. Chaque étape est un port applicatif du module `assistant`. Les outils appellent les façades des modules `home-control`, `google-workspace` ou autres modules autorisés.

Les commandes maison déterministes peuvent être interprétées sans LLM. La vérification de locuteur compare un embedding vocal à des profils enrôlés et retourne `unknown` sous le seuil de confiance. Les lectures Gmail/Drive et les actions externes restent soumises à l’identité, aux droits et, si nécessaire, à une confirmation explicite. Une correspondance vocale seule ne constitue jamais une authentification forte.

## Conséquences

- L’audio brut n’est pas journalisé par défaut et son envoi hors domicile doit être explicite.
- Le résultat d’un outil est vérifiable : exécuté, confirmation requise, refusé, indisponible ou échoué.
- STT, LLM, TTS, Home Assistant, Gmail et Drive sont remplaçables par des adaptateurs testables.
- La capture locale conserve un pré-roll court, attend une fin de parole stabilisée et limite la phrase à 15 secondes.
- La transcription est renvoyée au Home Panel avant la réponse afin de distinguer une erreur de capture d'une erreur d'interprétation.

## Extension — état vocal exposé au Home Panel

Home Core expose un état vocal éphémère (`idle`, `listening`, `thinking`, `answered`, `error`).
Le listener local publie les transitions au Core ; Home Panel ne se connecte jamais directement au
micro, à Google ou à Gemini. Le statut ne conserve ni audio ni secret et la réponse est retirée
automatiquement après quelques secondes.
