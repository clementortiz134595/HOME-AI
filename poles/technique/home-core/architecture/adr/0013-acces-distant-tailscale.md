# ADR-0013 — Accès distant privé par Tailscale

- Statut : accepté pour le prototype
- Date : 2026-11-16
- Décideur : architecture HOME AI

## Contexte

Home Core et Home Panel tournent sur une Raspberry Pi domestique, mais doivent
être utilisables depuis l'extérieur. L'accès distant ne doit pas rendre Home
Assistant, l'API Home Core, SSH ou les ports Docker publics. La connexion doit
fonctionner sans dépendre d'une redirection de port du routeur ni d'une adresse
IPv4 publique, y compris derrière un CGNAT.

## Décision

La Raspberry Pi et les appareils personnels autorisés rejoignent un réseau
privé Tailscale. Le daemon Tailscale est installé sur l'hôte Raspberry Pi, hors
des conteneurs. Il publie deux points d'entrée HTTPS privés :

- Home Panel sur `8443`, vers `127.0.0.1:13000` ;
- Home App sur `8444`, vers `https+insecure://127.0.0.1:13444`.

Le second proxy conserve le certificat local de développement uniquement entre
Tailscale et le conteneur ; Tailscale Serve fournit le certificat HTTPS valide
au navigateur. Les deux interfaces dirigent leurs appels `/v1` vers Home Core
sur le réseau Docker privé partagé `home-ai`.

Les services applicatifs publiés par Docker restent liés à `127.0.0.1` :

- Home Panel : `127.0.0.1:13000` ;
- Home App : `127.0.0.1:13444` ;
- Home Core : `127.0.0.1:18080`, pour le diagnostic local seulement.

Home Core, Home Panel et Home App rejoignent le réseau Docker externe `home-ai`.
Il est créé une fois sur l'hôte et reste le seul réseau partagé entre les deux
projets Compose ; aucune API n'est publiée par ce réseau sur le LAN.

L'accès est accordé dans la politique Tailscale aux seuls comptes et appareils
personnels autorisés. Home Core conserve sa propre authentification et ses
autorisations métier : l'appartenance au tailnet ne crée pas une session Home
Core et ne remplace pas une confirmation d'action sensible.

Tailscale Funnel, les redirections de ports du routeur, UPnP et l'exposition
directe de Home Assistant sont exclus du périmètre initial.

## Alternatives étudiées

| Alternative | Décision | Motif |
| --- | --- | --- |
| VPN privé Tailscale | Retenue | Accès chiffré entre appareils autorisés, sans port entrant public ni dépendance à l'IP publique. |
| Domaine public + reverse proxy HTTPS | Différée | Utile si un navigateur sans client VPN doit accéder au service, mais augmente l'exposition et l'exploitation. |
| Tailscale Funnel | Écartée | Rend un service disponible depuis Internet public ; contraire au besoin d'accès privé initial. |
| Redirection de port du routeur | Écartée | Expose un service domestique et dépend du routeur, de l'IP publique et de sa maintenance. |

## Conséquences

- Chaque appareil distant doit disposer du client Tailscale, être connecté au
  tailnet et respecter sa politique d'accès.
- L'URL HTTPS privée est fournie par Tailscale Serve ; elle reste inaccessible
  à Internet public.
- La Raspberry Pi doit conserver une sortie Internet pour joindre le réseau
  Tailscale ; les commandes domotiques locales continuent de fonctionner sans
  accès distant quand Internet est indisponible.
- La mise en service exige une authentification interactive du compte Tailscale
  sur la Raspberry Pi et une revue de la politique d'accès ; aucun secret ou
  clé d'authentification n'est ajouté au dépôt.

## Validations restantes

1. Installer Tailscale sur la Raspberry Pi, puis l'autoriser dans le tailnet.
2. Activer MagicDNS et les certificats HTTPS du tailnet, selon la documentation
   Tailscale.
3. Configurer Tailscale Serve sur `8443` pour le Panel et `8444` pour Home App,
   puis vérifier qu'ils redémarrent après reboot.
4. Vérifier depuis un appareil autorisé l'accès HTTPS aux deux interfaces et le
   refus depuis un appareil hors tailnet.
5. Vérifier qu'aucun port Home Panel, Home App, Home Core ou Home Assistant n'écoute sur
   l'interface réseau publique de la Raspberry Pi.

## Références

- [Tailscale Serve](https://tailscale.com/docs/features/tailscale-serve)
- [Héberger un serveur Docker privé](https://tailscale.com/docs/solutions/host-private-server-docker)
- [Tailscale Funnel](https://tailscale.com/docs/features/tailscale-funnel)
