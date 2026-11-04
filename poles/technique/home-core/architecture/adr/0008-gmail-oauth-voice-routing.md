# ADR-0008 — Gmail en lecture seule depuis la voix

- Statut : accepté pour le premier incrément
- Date : 2026-11-04

Home Core utilise OAuth 2.0 Authorization Code avec les scopes `gmail.readonly` et `drive.readonly`. Le refresh token est stocké dans le volume local dédié avec permissions `0600`. Les intentions Gmail et Drive passent par une confirmation avant le premier appel de la session ; l’utilisateur peut explicitement mémoriser cette autorisation pour les appels suivants. Aucun jeton ni contenu de mail ou Drive ne transite par Home Panel ou les journaux.

La façade MCP éventuelle devra déléguer au même port applicatif et ne pourra pas contourner les permissions.

## Extension — sélection des outils par Gemini

Gemini reçoit uniquement les déclarations des outils Gmail et Drive configurés et propose
`gmail_search`, `gmail_read`, `drive_search` ou `drive_read`. Home Core valide chaque appel et conserve la
conversation en mémoire pendant cinq minutes avec un identifiant aléatoire à usage
unique. Avant le premier accès Gmail ou Drive, la réponse demande une confirmation explicite
et annonce que le résultat sera envoyé à Gemini. Le client confirme via
`POST /v1/assistant/questions` avec `confirmationId` ; l’option `rememberSession` étend l’accord aux outils de la source pendant la session. Les résultats structurés sont retournés à Gemini pour la synthèse ou
la proposition suivante. Les contenus de mails sont des données non fiables,
jamais des instructions. La boucle est bornée et aucun outil d'écriture n'est exposé.

Ce mécanisme de consentement ne remplace pas l'authentification du déploiement :
l'API doit rester dans le périmètre privé autorisé. Aucun historique ni résultat
Gmail n'est journalisé ou persisté. Les commandes maison déterministes restent locales.
