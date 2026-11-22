# Module `reminders`

Le module gère des rappels/événements internes à Home Core et leurs échéances Push. L’assistant vocal reçoit les intentions Gemini structurées `reminders.create`, `reminders.update` et `reminders.delete`.

Pour créer un événement, Gemini doit fournir `title` et `date` au format `YYYY-MM-DD`, avec `details` optionnel. Les clients peuvent compléter une échéance précise avec `scheduledAt` en RFC3339 UTC et `timeZone`. Les rappels historiques sans heure restent lisibles et ne produisent pas de notification automatique.

## Notifications Push

Home Core expose `GET /v1/notifications/push/config`, `POST /v1/notifications/push/subscribe` et `DELETE /v1/notifications/push/subscribe`. Les abonnements Web Push ne stockent que l’endpoint et les clés publiques de chiffrement du navigateur dans SQLite. La clé VAPID privée reste exclusivement dans le fichier local `/home/clement/.config/home-ai/home-core.env` sur la Raspberry Pi.

Générer les clés hors du dépôt, par exemple sur la Raspberry Pi :

```sh
npx web-push generate-vapid-keys --json
chmod 600 /home/clement/.config/home-ai/home-core.env
```

Renseigner ensuite `HOME_CORE_PUSH_VAPID_PUBLIC_KEY`, `HOME_CORE_PUSH_VAPID_PRIVATE_KEY` et `HOME_CORE_PUSH_VAPID_SUBJECT` dans ce fichier. Ne jamais les placer dans Git, dans le frontend ou dans les journaux. Le scheduler du monolithe vérifie les échéances toutes les 30 secondes, revendique une notification avant l’envoi et supprime les abonnements retournant HTTP 404/410.
