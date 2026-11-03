# Module Weather — La Ciotat

## Responsabilité

Exposer à Home Panel et, plus tard, au module Assistant, les conditions actuelles, une synthèse de la journée et les prévisions des trois prochains jours pour **La Ciotat (France)**. Le premier contrat ne permet pas de consulter une autre ville : il évite qu'une recherche de localisation non cadrée devienne une fonction implicite.

## Contrat HTTP

```text
GET /v1/weather/la-ciotat
```

- `200` : conditions actuelles, ville géocodée, résumé français, prévisions de la journée et prévisions sur trois jours.
- `502 weather_unavailable` : le fournisseur ou le réseau ne répond pas ; aucune donnée périmée n'est présentée comme actuelle.
- `404 not_found` : route ou ville non supportée par ce premier contrat.

`GET /healthz` vérifie uniquement que l'application peut répondre. Il ne prétend pas qu'Open-Meteo est disponible.

## Synthèse de la journée

Le champ `today` contient précisément trois créneaux de la date locale : `morning` (09:00), `afternoon` (15:00) et `evening` (21:00). Chaque créneau donne température, ressenti, risque de précipitation, code WMO et résumé. L'API ne retourne pas la série horaire brute.

## Structure hexagonale

```text
internal/weather/
├── model/                         # rapport météo et traduction des codes WMO
├── application/                   # cas d'usage GetWeather et port ForecastProvider
└── adapters/
    ├── inbound/http/              # contrat HTTP local
    └── outbound/openmeteo/        # géocodage France et prévision Open-Meteo
```

Il n'y a pas de registre : un seul fournisseur est branché au premier jalon. Si plusieurs fournisseurs sont validés ultérieurement, leur sélection sera introduite dans un registre local au module, avec une décision documentée.

## Fournisseur

L'adaptateur appelle successivement l'API de géocodage Open-Meteo, filtrée sur `FR`, puis l'API de prévision avec le fuseau de la localisation. Aucun jeton n'est nécessaire pour ce scénario public. Les spécifications de référence sont la [documentation de géocodage Open-Meteo](https://open-meteo.com/en/docs/geocoding-api) et la [documentation de prévision](https://open-meteo.com/en/docs).

## Lancer localement

```bash
go test ./...
go run ./cmd/home-core
curl http://127.0.0.1:18080/v1/weather/la-ciotat
```

Ou avec Docker :

```bash
docker compose up --build
```
