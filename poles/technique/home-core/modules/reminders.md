# Module `reminders`

Le module gère des rappels/événements internes à Home Core. L’assistant vocal reçoit les intentions Gemini structurées `reminders.create`, `reminders.update` et `reminders.delete`.

Pour créer un événement, Gemini doit fournir `title` et `date` au format `YYYY-MM-DD`, avec `details` optionnel. L’exécution reste dans Home Core ; Gemini ne déclenche jamais directement une opération.
