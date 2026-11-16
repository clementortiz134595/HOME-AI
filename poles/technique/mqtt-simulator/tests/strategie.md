# Stratégie de test

| ID | Scénario | Résultat attendu |
| --- | --- | --- |
| MS-01 | Démarrer le simulateur | Publication de disponibilité, Discovery et états retenus |
| MS-02 | Découvrir une lumière | Entité `light` créée par Home Assistant |
| MS-03 | Allumer une prise depuis Home Assistant | Commande MQTT reçue, puis état `ON` confirmé |
| MS-04 | Modifier la luminosité | État JSON de la lumière mis à jour et confirmé |
| MS-05 | Lire une température | Entité `sensor` avec valeur et unité `°C` |
| MS-06 | Redémarrer Home Assistant | Les publications retenues redécouvrent les entités |
| MS-07 | Ouvrir Apple Maison | Les entités sélectionnées sont visibles via HomeKit Bridge |

Les tests MQTT vérifient les topics, leur contenu et les états réémis. Les tests HomeKit vérifient l'exposition par Home Assistant ; Apple Maison ne se connecte jamais au broker MQTT.
