# ADR-0013 — Météo Home Panel fournie par Home Assistant

- Statut : accepté
- Date : 2026-11-15

## Décision

Le module `weather` lit l'entité Home Assistant configurée par
`HOME_CORE_HOME_ASSISTANT_WEATHER_ENTITY_ID`. Il utilise le même URL et jeton
privé que l'intégration domotique, mais dans son propre adaptateur sortant.
Il récupère l'état courant puis les prévisions `daily` et `hourly` via
`weather.get_forecasts`.

Le Home Panel conserve exclusivement `GET /v1/weather/la-ciotat`. Home Core
normalise les unités et ne renvoie que les champs effectivement fournis par le
connecteur météo ; aucun jeton Home Assistant n'est transmis au navigateur.

## Conséquences

- Home Assistant devient la source de vérité météo lorsque les trois variables
  de configuration sont présentes ; Open-Meteo reste le mode de développement
  sans intégration configurée.
- Les prévisions disponibles dépendent du fournisseur météo configuré dans Home
  Assistant. Une absence de champ est explicite, jamais remplacée par une valeur
  inventée.
