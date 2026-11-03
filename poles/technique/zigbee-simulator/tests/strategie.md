# Stratégie de test

| ID | Scénario | Résultat attendu |
| --- | --- | --- |
| ZS-01 | Allumer les lumières du salon | Résultat exécuté par appareil et états `on` confirmés |
| ZS-02 | Régler une luminosité | Valeur observée égale à la valeur demandée |
| ZS-03 | Appareil hors ligne | `unavailable`, aucun état inventé |
| ZS-04 | Perte de route | `failed` avec cause exploitable |
| ZS-05 | Rejouer la même clé | Une seule mutation observée |
| ZS-06 | Mesure du capteur | Événement reçu sans commande artificielle |

Chaque scénario conserve commande, événements observés et résultat final dans un format sans donnée personnelle. La mise en œuvre du harnais et du runtime est reportée à la décision d'exécution de Home Core ; la fixture versionnée fournit dès maintenant le contrat de départ.
