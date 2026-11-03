# ADR-0008 — Gmail en lecture seule depuis la voix

- Statut : accepté pour le premier incrément
- Date : 2026-11-04

Home Core utilise OAuth 2.0 Authorization Code avec le scope `gmail.readonly`. Le refresh token est stocké dans le volume local dédié avec permissions `0600`. L’intention vocale `gmail.search` passe par une confirmation avant l’appel Gmail API. Aucun jeton ni contenu de mail ne transite par Home Panel ou les journaux.

La façade MCP éventuelle devra déléguer au même port applicatif et ne pourra pas contourner les permissions.
