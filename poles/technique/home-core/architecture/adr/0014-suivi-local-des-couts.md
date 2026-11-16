# ADR-0014 — Suivi local des coûts

## Décision

Le module `costs` de Home Core expose une synthèse en lecture seule à Home Panel via `GET /v1/costs/summary`. Il agrège des écritures de coût horodatées persistées dans SQLite, exprimées en centimes, avec une catégorie et le caractère estimé ou confirmé. Home Panel ne calcule ni ne simule un montant.

## Raisons

Les valeurs affichées auparavant étaient des maquettes sans source. Le serveur est le seul endroit où des mesures de fournisseurs, abonnements ou estimations validées peuvent être rapprochées sans exposer de jeton ou de facture au navigateur. SQLite préserve le choix de monolithe local et garantit que l'historique reste disponible après redémarrage.

## Conséquences

- Sans écriture source, l'API retourne une synthèse vide et le Panel le dit explicitement.
- La projection est une extrapolation du rythme du mois courant ; elle est nulle tant qu'aucune écriture n'existe.
- Le premier incrément ne crée pas d'écriture depuis le navigateur : l'import des relevés fournisseurs et la saisie d'une dépense nécessitent un flux administrateur authentifié distinct.
- Les coûts restent séparés des secrets, références de paiement et détails de facture.
