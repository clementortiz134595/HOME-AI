# Dossier produit — Dashboard & PWA

## Spécification

L'accueil affiche le calendrier de la semaine, les éléments à venir, la météo et trois ou quatre actions rapides : Salon, Tout éteindre, Maison et Parler à l'IA. Les fonctions détaillées vivent dans des pages dédiées.

## Interactions

Grandes zones tactiles, informations lisibles à distance, retour d'état immédiat après une commande et accès explicite aux données personnelles. Une tablette partagée ne révèle pas les rappels privés sans authentification.

## Études

Évaluer la PWA responsive, le comportement hors ligne, l'authentification d'une vue privée et l'accès distant sécurisé avant de figer la stack.

## Dossier technique

L'interface web ne communique jamais directement avec Home Assistant. Elle passe par l'API interne authentifiée, qui contrôle les permissions et relaie les commandes autorisées.

## Diagrammes

À créer : carte de navigation, flux de connexion et séquence de commande rapide.

## ADR

ADR-001 : application web personnalisée comme interface principale. Ajouter ici les futures décisions de navigation, de PWA et de stratégie d'accès distant.

## Tests d'acceptation

Une commande rapide doit montrer son état réel ou une erreur intelligible. L'accueil doit rester utile sur mobile, ordinateur et écran mural sans achat d'un terminal dédié.
