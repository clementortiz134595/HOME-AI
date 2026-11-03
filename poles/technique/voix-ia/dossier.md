# Dossier technique — Voix & IA

## Spécification

Une enceinte avec micro lance l'écoute après détection locale de « Hey Jarvis ». Commandes de maison : rapides et déterministes. Questions générales : conversation hybride selon les capacités disponibles. Prévoir un témoin d'écoute et un coupe-micro à terme.

## Études

Évaluer micro, haut-parleur, wake word, STT, TTS, modèles locaux ou cloud, coût, qualité audio, esthétique et compatibilité réelle avec Home Assistant.

## Architecture

Wake word local → transcription → routeur d'intentions → commande Home Assistant ou LLM → synthèse vocale. La détection du mot-clé ne constitue pas une authentification personnelle.

## ADR

Consigner le matériel audio, les traitements cloud autorisés, les durées de conservation et le mode dégradé.

## Diagrammes

À créer : chaîne audio, routage d'intention et frontières de données personnelles.

## Interactions

Définir les signaux d'écoute, les réponses courtes, les confirmations et le comportement en cas de compréhension insuffisante.

## Tests

Tester latence, mot-clé, bruit ambiant, échec réseau, commande locale et protection contre les accès sensibles par simple voix.
