# ADR-0020 — Notifications Web Push pour les rappels Home AI

- Statut : accepté
- Date : 2026-11-22

## Décision

Le module `agenda-reminders` conserve les échéances et leur état de livraison dans SQLite. Un adaptateur sortant Web Push, configuré par VAPID, envoie une notification générique à chaque abonnement enregistré. Le scheduler réside dans le processus Home Core ; le navigateur ne planifie aucune notification.

Les clés VAPID sont injectées au démarrage depuis `/home/clement/.config/home-ai/home-core.env` (permissions `600`) via `HOME_AI_SECRETS_FILE`. La clé privée n’est jamais exposée par l’API. Seule la clé publique est lue par la PWA depuis la route de configuration. Les abonnements persistants se limitent à endpoint, `p256dh` et `auth`.

## Conséquences

- Les rappels existants de type date seule restent compatibles et ne sont pas envoyés automatiquement.
- Un rappel horodaté est revendiqué avant l’envoi, marqué envoyé seulement après livraison et retenté après erreur ou redémarrage.
- Les abonnements HTTP 404/410 sont supprimés.
- Home App demande l’autorisation uniquement à la suite d’un geste utilisateur. Sur iOS, la PWA doit être installée sur l’écran d’accueil.
- L’accès reste le périmètre local/Tailscale existant : Home Core n’est pas publié sur le LAN ou Internet. Une authentification utilisateur plus fine reste une évolution de `identity-access` à définir.
