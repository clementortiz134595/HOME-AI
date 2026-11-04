# Gmail depuis la voix

Home Core expose le parcours OAuth Gmail en lecture seule :

```text
GET /v1/workspace/google/gmail/oauth/connect
GET /v1/workspace/google/gmail/oauth/callback
```

Variables requises :

- `HOME_CORE_GMAIL_CLIENT_ID`
- `HOME_CORE_GMAIL_CLIENT_SECRET`
- `HOME_CORE_GMAIL_REDIRECT_URL` — par défaut `http://localhost:8080/v1/workspace/google/gmail/oauth/callback`
- `HOME_CORE_GMAIL_TOKEN_PATH` — par défaut `/var/lib/home-core/gmail-token.json`

Le premier accès se fait en ouvrant `/v1/workspace/google/gmail/oauth/connect` depuis un navigateur autorisé. Le refresh token est écrit dans le volume Docker `home-core-secrets` avec le mode `0600`. Les scopes utilisés sont `https://www.googleapis.com/auth/gmail.readonly` et `https://www.googleapis.com/auth/drive.readonly`; un nouveau consentement est nécessaire si le jeton existant n'accorde pas encore Drive.

Une phrase vocale contenant « mail », « mails », « email » ou « Gmail » est routée vers `gmail.search`; une demande de document ou de fichier vers `drive_search`. La première confirmation peut être mémorisée pour la session courante afin d'éviter de répéter l'accord pour les appels Gmail/Drive suivants.

### Appels d’outils Gemini

Le parcours texte (`POST /v1/assistant/questions`) et vocal utilise désormais
Gemini pour sélectionner `gmail_search` puis `gmail_read`. Le corps d’un mail est
accessible uniquement avec un identifiant fourni par une recherche précédente.
La réponse `status: confirmation_required` contient un `confirmationId` valable
cinq minutes, à usage unique. Home Panel affiche un bouton de confirmation qui
rappelle l’envoi des résultats à Gemini. Chaque accès demande son propre accord.

Exemple de confirmation :

```json
{"confirmationId":"identifiant retourné dans la réponse précédente"}
```

Ce JSON est envoyé au même endpoint `/v1/assistant/questions`. Une nouvelle
confirmation peut être requise pour lire un résultat trouvé. Maximum six appels
par demande ; dix résultats de recherche et un corps de mail borné sont envoyés
au modèle. L’état de la demande reste en mémoire et disparaît au redémarrage.
Aucun outil d’envoi, suppression ou modification n’est déclaré.
