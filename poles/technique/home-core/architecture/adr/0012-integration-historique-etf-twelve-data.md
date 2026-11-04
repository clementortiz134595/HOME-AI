# ADR-0012 — Historique des ETF via EODHD

## Statut

Acceptée — 2026-11-04

## Contexte

Le module `insights` expose six ETF suivis par Home Panel, mais son historique était une fixture calculée et ne représentait pas des cours réels. Le besoin porte sur des graphiques historiques journaliers, avec un coût et une exploitation compatibles avec un Home Core local.

## Décision

Home Core utilise l’API EODHD via un adaptateur sortant dédié. L’API key reste uniquement dans la configuration du serveur. Les données sont normalisées par le cas d’usage `GetMarketHistory`, mises en cache vingt-quatre heures et exposées avec un statut `live`, `cached` ou `unavailable`.

Les appels utilisent les tickers de marché configurés dans l’adaptateur (actuellement les symboles Paris sous la forme `SYMBOL.PA`) et la valeur `adjusted_close`. La source est remplaçable par un autre adaptateur sans modifier le contrat du module.

## Alternatives écartées

- Scraping Yahoo, Amundi ou justETF : dépendance fragile au HTML et protections anti-bot.
- Yahoo Chart non documenté : utile pour un prototype, mais non contractuel et sujet aux limitations d’accès.
- Twelve Data : l’offre gratuite refuse l’historique Euronext et renvoie une erreur de plan.
- Euronext Web Services : source primaire pertinente, mais onboarding et offre commerciale disproportionnés pour six ETF personnels.
- Alpha Vantage : couverture intéressante, mais l’historique complet ajusté est premium.

## Conséquences

- Une clé EODHD est nécessaire pour les historiques live.
- Sans clé ou en cas d’échec fournisseur, l’API signale l’indisponibilité et ne fabrique aucune valeur.
- Le cache réduit la dépendance réseau et permet un mode dégradé contrôlé.
- Les cours affichés sont des cours de marché historiques et ne constituent pas une valeur de portefeuille ou un conseil financier.
