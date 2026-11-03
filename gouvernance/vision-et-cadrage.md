# Vision et cadrage

## Ambition

Construire un assistant personnel de type « Jarvis », fiable pour la maison et agréable pour les échanges généraux. Il doit être accessible par la voix et par une application web responsive, fonctionner progressivement dans un appartement loué et ne dépendre d'aucun constructeur unique.

## Principes retenus

- Home Assistant assure le pilotage local des appareils ; l'interface principale reste une application web personnalisée.
- Le dashboard est un site web disponible dès le départ. Une application mobile native pourra venir plus tard ; une tablette n'est qu'un client futur, pas un prérequis matériel.
- L'accès extérieur est reporté. Lorsqu'il sera étudié, l'interface d'administration de Home Assistant et ses secrets ne seront jamais exposés au navigateur.
- Le mot-clé « Hey Jarvis » est détecté localement. Les scènes déterministes doivent continuer à fonctionner si une brique cloud est indisponible.
- Les profils retenus sont Clément et Lise. Le dashboard du foyer permet de passer de l'un à l'autre par glissement, sans authentification locale demandée à ce stade.
- Les calendriers, rappels, conversations et voix après activation peuvent être traités dans le cloud pour ce projet personnel. Le choix précis des services et les réglages par profil restent à définir.

## Contraintes de départ

- Appartement loué à La Ciotat d'environ 70 m² : salon, cuisine, chambre, chambre secondaire/bureau, salle d'eau et WC. Les pièces les plus utilisées sont le salon, la cuisine, la chambre et le bureau. Pas de câblage permanent, perçage ou modification du logement.
- Routeur Internet et Raspberry Pi 4 placés dans le salon. Le Pi peut être relié en Ethernet ; il utilise actuellement une carte microSD de 16 Go. Sa mémoire vive, son alimentation et son stockage futur restent à confirmer.
- Aucune lampe ni équipement connecté n'est encore acquis. Les futurs équipements d'éclairage doivent préserver le fonctionnement normal des interrupteurs muraux.
- Chauffage et climatisation sont présents mais non pilotables à ce stade ; leurs modèles et télécommandes seront étudiés ultérieurement.
- Budget initial maximal : 250 €, réalisé par achats progressifs.
- Les marques, prix et compatibilités restent à étudier avant toute décision d'achat.

## Décisions à obtenir en priorité

1. Inventaire du Raspberry Pi : RAM exacte, alimentation et état de la carte microSD de 16 Go.
2. Source et intégration iCloud Calendar dans le dashboard web.
3. Modèles de climatisation et chauffage lorsqu'une commande à distance deviendra utile.
4. Inventaire des luminaires, culots et prises avant le premier achat domotique.
