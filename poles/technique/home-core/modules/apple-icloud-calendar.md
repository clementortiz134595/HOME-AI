# Connecteur Apple iCloud Calendar

## Périmètre du premier jalon

Le connecteur lit les calendriers et événements d'un ou plusieurs comptes iCloud Calendar configurés localement. Il utilise le protocole CalDAV ; « iCalendar » désigne ici les données d'événements au format iCalendar retournées par CalDAV, pas un lien public `.ics`.

Ce jalon est strictement en lecture seule. Il ne crée, ne modifie, ne supprime ni ne partage d'événement. Mail, Contacts, Photos, iCloud Drive et les autres services Apple sont hors périmètre : ils nécessiteront chacun leur propre module, consentement et diagrammes.

## Contrat HTTP local

```text
GET /v1/calendars/apple/{accountId}
GET /v1/calendars/apple/{accountId}/events?calendar={calendarId}&from={RFC3339}&to={RFC3339}
```

Le premier endpoint retourne les calendriers visibles du compte. Le second ne retourne que les événements de la plage demandée, normalisés en `id`, titre, début, fin et indicateur journée entière. Le client doit URL-encoder le `calendarId` retourné par le premier endpoint.

| Réponse | Signification |
| --- | --- |
| `200` | Lecture réussie. |
| `400 invalid_period` | Plage absente, invalide ou inversée. |
| `404 account_not_configured` | Le compte local demandé n'est pas disponible dans Home Core. |
| `502 calendar_unavailable` | iCloud ou le réseau est indisponible ; aucune donnée inventée n'est retournée. |

## Configuration des comptes

La liste des comptes réside dans la variable d'environnement secrète `APPLE_CALDAV_ACCOUNTS_JSON`. Elle est un tableau JSON sur une seule ligne : chaque entrée porte un `id` local non secret, l'adresse Apple utilisée comme `username`, un `appPassword` et, facultativement, un endpoint CalDAV.

Ne pas inscrire une vraie valeur dans `.env.example`, Git, les logs ou une requête HTTP. Apple requiert l'authentification à deux facteurs pour générer un mot de passe spécifique à une app, qui peut être révoqué individuellement depuis le compte Apple. Voir la [documentation Apple sur les mots de passe spécifiques](https://support.apple.com/en-us/102654).

La configuration actuelle est volontairement injectée au démarrage. Le stockage chiffré, le parcours d'autorisation et la révocation depuis Home Panel seront ajoutés seulement après que `identity-access` et le stockage sécurisé auront été conçus.

## Structure hexagonale

```text
internal/agenda/
├── model/                                  # Calendar et Event normalisés
├── application/                            # ports CalendarProvider et Registry de comptes
└── adapters/
    ├── inbound/http/                       # API locale de lecture
    └── outbound/applecaldav/               # CalDAV, XML DAV et iCalendar
```

Le `Registry` est justifié ici : il choisit explicitement le connecteur du compte demandé, sans exposer son identité Apple ou ses secrets à l'API. Chaque compte conserve ses propres identifiants à l'exécution.

## Limites connues

- Seuls les champs nécessaires à l'agenda sont exposés ; description, lieu, participants et alarmes sont volontairement ignorés.
- Les événements récurrents complexes et les invitations seront approfondis avant toute interface utilisateur.
- L'adaptateur utilise le CalDAV standard. Apple documente la prise en charge des comptes CalDAV dans ses apps ; la compatibilité effective est à valider avec un compte de test avant une synchronisation réelle. [Documentation Apple CalDAV](https://support.apple.com/guide/iphone/change-calendar-settings-iphc37be2016/27/ios/27)
