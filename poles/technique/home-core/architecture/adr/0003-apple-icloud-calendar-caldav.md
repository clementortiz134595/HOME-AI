# ADR-0003 — iCloud Calendar par CalDAV en lecture seule

- Statut : accepté pour le premier incrément Agenda
- Date : 2026-11-03

## Contexte

Home Core doit pouvoir lire les calendriers d'un compte Apple sans exposer les identifiants au Home Panel. Le service n'a pas encore de gestion d'identité, de consentement persistant ni de stockage chiffré des connecteurs.

## Décision

Le premier connecteur Apple se limite à iCloud Calendar via CalDAV et est implémenté comme adaptateur sortant de `agenda-reminders`. Il ne réalise que la découverte de calendriers et la lecture d'événements dans une plage temporelle explicite.

Les comptes sont fournis au démarrage par la variable secrète `APPLE_CALDAV_ACCOUNTS_JSON`. L'adaptateur utilise le nom de compte Apple et un mot de passe spécifique à l'app ; le mot de passe principal Apple n'est ni demandé, ni stocké. Un registre applicatif sélectionne le compte local demandé.

## Conséquences

- Plusieurs comptes peuvent être configurés sans mélanger leurs identifiants ; seuls leurs identifiants locaux non secrets sont présents dans l'API.
- Le service ne peut pas encore connecter un compte depuis l'interface : cette fonction attend le stockage sécurisé et `identity-access`.
- Toute écriture, gestion d'invitations, alarme, récurrence complexe ou autre service Apple exige une nouvelle décision, des autorisations et des tests dédiés.
