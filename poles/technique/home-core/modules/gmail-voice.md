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

Le premier accès se fait en ouvrant `/v1/workspace/google/gmail/oauth/connect` depuis un navigateur autorisé. Le refresh token est écrit dans le volume Docker `home-core-secrets` avec le mode `0600`. Le scope utilisé est uniquement `https://www.googleapis.com/auth/gmail.readonly`.

Une phrase vocale contenant « mail », « mails », « email » ou « Gmail » est routée vers `gmail.search`. La lecture est précédée par la politique de confirmation de Home Core afin de protéger les données personnelles sur un écran partagé.
