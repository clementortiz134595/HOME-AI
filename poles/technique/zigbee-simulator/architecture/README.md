# Architecture

Le simulateur est un adaptateur sortant de développement branché sur le port `Connector` de `home-control`. Il ne connaît pas les règles d'autorisation de Home Core et ne communique pas directement avec Home Panel.

```text
Home Core / home-control
        │ port Connector
        ▼
Simulated Zigbee Connector
        ├── model : rooms, devices, capabilities, states, faults
        ├── application : routing, idempotency, clock
        └── adapters : fixture loader, simulated transport, event recorder
```

Le modèle de pièce appartient au simulateur uniquement pour représenter l'inventaire de test. Les états sont confirmés seulement après passage par le transport simulé. Le transport doit pouvoir être remplacé par l'adaptateur du coordinateur réel sans modifier le modèle `home-control`.

## Contrat minimal

- `ListDevices()` retourne appareils, pièces et capacités ;
- `Execute(deviceID, command, idempotencyKey)` retourne un `CommandResult` ;
- `Observe()` retourne changements d'état et erreurs ;
- `InjectFault(deviceID, fault)` est réservé au harnais de test.
