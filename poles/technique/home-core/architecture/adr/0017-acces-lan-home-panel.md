# ADR-0017 — Accès LAN explicite au Home Panel

## Décision

Home Panel reste lié par défaut à `127.0.0.1:13000` et accessible à distance via Tailscale Serve. Une personne administratrice peut l’ouvrir sur le réseau local de confiance en ajoutant `HOME_PANEL_BIND_ADDRESS=0.0.0.0` à `~/.config/home-ai/deploy.env` sur la Raspberry Pi. Le script de release lit ce fichier local avec Docker Compose.

Cette option ne publie que Home Panel. Home Core, Home Assistant, SSH et les données persistantes restent hors du LAN exposé par Docker.

## Raisons

L’accès direct depuis un téléphone sur le Wi-Fi domestique peut être souhaité sans dépendre de Tailscale. Le paramètre explicite conserve le comportement privé par défaut et évite de confondre cette ouverture locale avec un accès Internet public.

## Conséquences

- Le navigateur du LAN peut utiliser `http://<ip-raspberry>:13000` lorsque l’option est activée.
- Le réseau local devient une frontière de confiance pour cette interface ; l’ouverture doit être retirée si le Wi-Fi est partagé ou non maîtrisé.
- Tailscale Serve reste la voie HTTPS privée pour les appareils autorisés hors LAN.
- Aucun port de Home Core ou de Home Assistant n’est rendu accessible par ce réglage.
