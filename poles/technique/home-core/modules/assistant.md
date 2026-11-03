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
