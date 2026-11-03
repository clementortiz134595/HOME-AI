# Home Panel

- Nom technique : `home-panel`
- Statut : première interface statique
- Rôle : interface tablette dédiée à l'appartement.

Ce projet accueille l'expérience murale : informations du foyer, scènes, commandes domestiques et vues de suivi. La première interface est volontairement sans données réelles ni actions câblées ; elle adopte une palette claire et une trame de points sur les panneaux de synthèse.

Le design system de référence est [shadcn/ui avec Geist](../../design/design-system/dossier.md).

## Exécution locale

Le projet est un monolithe Docker autonome. Depuis ce dossier :

```bash
docker compose up --build
```

Ouvrir ensuite `http://localhost:5173`. L'image de production statique peut être construite avec :

```bash
docker compose -f compose.production.yaml up -d --build
```

Elle est alors servie sur `http://localhost:8080`.

Le panel appelle la météo via `/v1/weather/la-ciotat`. En développement, Vite
redirige cette route vers Home Core sur `127.0.0.1:18080`. En production, le
conteneur Home Core doit être joignable sous le nom Docker `home-core` sur le
même réseau que le panel ; Nginx conserve ainsi une route same-origin pour le
navigateur.
