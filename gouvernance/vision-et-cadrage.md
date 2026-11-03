# Vision et cadrage

## Ambition

Construire un assistant personnel de type « Jarvis », fiable pour la maison et agréable pour les échanges généraux. Il doit être accessible par la voix et par une application web responsive, fonctionner progressivement dans un appartement loué et ne dépendre d'aucun constructeur unique.

## Principes retenus

- Home Assistant assure le pilotage local des appareils ; l'interface principale reste une application web personnalisée.
- L'application doit fonctionner sur iPhone, Mac et future tablette murale. La tablette n'est qu'un client, pas un prérequis matériel.
- L'accès extérieur passe par un backend authentifié ; l'interface d'administration de Home Assistant et ses secrets ne sont jamais exposés au navigateur.
- Le mot-clé « Hey Jarvis » est détecté localement. Les scènes déterministes doivent continuer à fonctionner si une brique cloud est indisponible.
- Les données personnelles sont séparées entre les profils Clément, second habitant à confirmer et Invité. La voix seule ne vaut pas preuve d'identité pour une action sensible.
- Les rappels privés vont au téléphone et ne sont pas affichés sur un écran partagé sans authentification.

## Contraintes de départ

- Appartement loué à La Ciotat : pas de câblage permanent, perçage ou modification du logement.
- Raspberry Pi probablement modèle 4, à inventorier avant tout choix de stack ou achat.
- Budget initial indicatif : 200 à 250 €, réalisé par achats progressifs.
- Les marques, prix et compatibilités restent à étudier avant toute décision d'achat.

## Décisions à obtenir en priorité

1. Inventaire du Raspberry Pi : modèle, RAM, stockage, alimentation et disponibilité permanente.
2. Mode d'accès extérieur initial : VPN privé ou URL HTTPS protégée.
3. Premier cas d'usage à livrer : agenda/rappels, voix ou premier appareil connecté.
4. Identité du second profil : confirmer « Lise » ou « Louise » avant de créer les identifiants.
