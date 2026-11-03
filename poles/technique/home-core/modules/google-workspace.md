# Module Google Workspace

## But

Donner aux futurs agents des capacités explicites et traçables pour rechercher et lire Gmail, rechercher et lire Google Drive, puis créer ou mettre à jour des fichiers Drive. Le module est une API interne Home Core ; une façade MCP ultérieure délèguera à ces mêmes cas d'usage.

## Frontières et sécurité

- Gmail est en lecture/recherche uniquement dans le premier jalon. Aucun envoi, archivage ou suppression.
- Drive peut rechercher, lire et écrire des fichiers. Toute écriture par un agent devra passer par une confirmation et un audit une fois `identity-access` disponible.
- L'accès Google utilise OAuth 2.0 avec jetons de rafraîchissement chiffrés à terme. Ni jeton, ni contenu de mail, ni contenu Drive ne va dans les journaux.
- Les scopes nécessaires sont déclarés au consentement : `gmail.readonly` pour Gmail ; Drive large sera requis pour rechercher l'ensemble du Drive et écrire, ce qui est un scope restreint à cadrer avant connexion réelle.

## API cible

```text
GET  /v1/workspace/google/{accountId}/gmail/search?q={query}
GET  /v1/workspace/google/{accountId}/gmail/messages/{messageId}
GET  /v1/workspace/google/{accountId}/drive/search?q={query}
GET  /v1/workspace/google/{accountId}/drive/files/{fileId}
POST /v1/workspace/google/{accountId}/drive/files
PATCH /v1/workspace/google/{accountId}/drive/files/{fileId}
```

Les opérations Drive mutantes seront inaccessibles sans une politique de confirmation. Le format exact de cette confirmation attend le module d'identité.

## OAuth requis avant connexion réelle

Il faut créer un projet Google Cloud, activer Gmail API et Drive API, configurer l'écran de consentement et enregistrer l'URI de redirection Home Core. Google recommande le flux Authorization Code, qui délivre un jeton de rafraîchissement pour un accès hors ligne. La création du projet et le consentement seront une action utilisateur séparée : ne jamais partager de secret OAuth dans ce dépôt ou dans le chat.

Références : [OAuth Google](https://developers.google.com/identity/protocols/oauth2), [scopes Drive](https://developers.google.com/workspace/drive/api/guides/api-specific-auth), [autorisation Gmail serveur](https://developers.google.com/workspace/gmail/api/auth/web-server).
