# Module `home-control`

Le module porte l'inventaire, les capacités, l'état confirmé et les commandes des appareils domestiques. Il ne connaît ni Home Panel ni un fabricant Zigbee.

## Adaptateur Home Assistant

Home Core peut utiliser Home Assistant comme passerelle domotique en configurant `HOME_CORE_HOME_ASSISTANT_URL` et `HOME_CORE_HOME_ASSISTANT_TOKEN`. L'adaptateur utilise l'API REST Home Assistant, conserve les `entity_id` comme identifiants de périphériques et relit l'état après chaque commande pour ne jamais annoncer une réussite supposée. Les entités `light`, `switch` et `sensor` sont actuellement inventoriées ; les commandes `turn_on` et `turn_off` sont supportées pour les lumières et interrupteurs.

- `model.Device` décrit un appareil et ses capacités (`switch`, `current`, `power`).
- `model.DeviceState` distingue l'état observé de l'action demandée.
- `application.Service` expose l'inventaire, la lecture d'état et `turn_on` / `turn_off`.
- `application.Connector` est le port de sortie ; chaque protocole peut l'implémenter.

L'adaptateur Zigbee dépend d'un `Transport` minimal. Le coordinateur, le bridge, MQTT ou une bibliothèque Zigbee feront l'objet d'une décision séparée. Aucune commande ne doit être considérée comme réussie sans l'état retourné par `WriteSwitch`.

Les mesures de courant et de puissance sont optionnelles : un appareil qui ne les expose pas renvoie des champs absents, jamais des zéros inventés.

## Reste à faire

### Intégration et matériel

- Choisir et documenter le coordinateur ou bridge Zigbee compatible avec la cible Raspberry Pi.
- Décider du transport réel : bibliothèque Zigbee native, bridge local, MQTT ou intégration Home Assistant.
- Ajouter l'implémentation concrète de `zigbee.Transport`, sans exposer de secret dans le dépôt.
- Implémenter la découverte, l'appairage, le retrait et le rafraîchissement de l'inventaire.
- Mapper les identifiants externes, les fabricants, les modèles et les pièces vers `model.Device`.
- Gérer les événements d'état entrants et la reconnexion du transport.

### Contrat métier

- Compléter les capacités : variation, scène, énergie cumulée, tension, puissance instantanée et disponibilité selon les appareils.
- Définir les unités, la précision, la date d'observation et les règles de valeurs absentes ou incohérentes.
- Ajouter les erreurs typées : appareil inconnu, hors ligne, capacité absente, délai dépassé et réponse incertaine.
- Ajouter une clé d'idempotence aux commandes physiques et définir leur durée de conservation.
- Définir les règles de confirmation pour les commandes à conséquence et le modèle `ActorContext`.

### Application Home Core

- Ajouter l'adaptateur entrant HTTP ou WebSocket derrière l'authentification et l'autorisation de Home Core.
- Exposer les routes d'inventaire, d'état et de commande sans donner d'accès direct à Home Assistant ou au coordinateur.
- Ajouter le registre local de protocole uniquement lorsque plusieurs connecteurs seront réellement actifs.
- Brancher le module dans le démarrage de `home-core` avec une configuration explicite et un mode indisponible sûr.
- Ajouter l'audit minimal des commandes et les métriques de santé de l'intégration.

### Fiabilité et sécurité

- Tester les pertes réseau, les délais, les doublons, les redémarrages et les états contradictoires.
- Vérifier qu'une commande n'est jamais annoncée comme réussie sans état confirmé.
- Définir la stratégie de cache, de reprise et de synchronisation après reconnexion.
- Protéger les secrets et documenter leur injection par environnement ou gestionnaire de secrets.
- Vérifier les permissions par profil, le mode invité et les confirmations avant toute commande physique.

### Validation produit et exploitation

- Valider un scénario réel de prise : inventaire, lecture on/off, courant, puissance, allumage, extinction et appareil hors ligne.
- Tester la compatibilité avec les interrupteurs muraux et le comportement après coupure électrique.
- Définir les critères d'acceptation Home Panel pour distinguer état réel, commande en cours, échec et indisponibilité.
- Ajouter une procédure d'installation, d'appairage, de diagnostic et de restauration.
- Mettre à jour les diagrammes et l'ADR lorsque le coordinateur, le transport ou le modèle de déploiement sera choisi.
