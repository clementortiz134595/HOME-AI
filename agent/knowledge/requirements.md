# Exigences de référence

Le périmètre fonctionnel complet en cours de cadrage est maintenu dans [Fonctionnalités Home Panel & Home Core](../../poles/produit/fonctionnalites-home-core-panel.md). Ce fichier en conserve les règles non négociables à appliquer par défaut.

## Contraintes Home Core

- Home Core est un serveur local déployé dans Docker comme monolithe modulaire ; aucun microservice n'est présumé.
- Chaque module suit une architecture hexagonale avec adaptateurs, application et modèle. Un registre reste optionnel et local au besoin qui le justifie.
- Home Panel ne communique pas directement avec Home Assistant, Google Calendar, les fournisseurs météo ou IA.
- Les diagrammes Mermaid décrivent les flux métier et d'intégration avant l'implémentation ; un choix structurant fait l'objet d'un ADR.

- Deux applications : Home Panel est l'interface visible du foyer ; Home Core orchestre les données, permissions, intégrations et règles. L'application mobile native n'est pas encore dans le périmètre.
- Assistant : questions libres, conversation, actions en langage naturel et transparence sur les actions/outils ; une panne d'IA ne doit pas empêcher les commandes locales déterministes.
- Dashboard : agenda, rappels, météo, état du foyer et commandes rapides ; vue partagée sûre sur tablette, navigateur et ordinateur.
- Calendrier : Google Calendar est connecté par Home Core ; création/modification d'événements demande une identification et une confirmation adaptées.
- Domotique : éclairage, prises, états réels, commandes par pièce, scènes et routines ; chaque action indique succès, erreur, hors ligne ou incertitude sans jamais simuler une réussite.
- Personnel : calendriers, rappels, mémoire et préférences sont cloisonnés par profil ; le mode Invité n'expose aucune donnée privée.
- Voix : mot-clé local envisagé, réponses courtes pour les commandes de maison, indicateur d'écoute ; jamais d'authentification sensible par voix seule.
- Sécurité : Home Panel passe par une API authentifiée de Home Core ; aucun jeton ou accès d'administration Home Assistant n'est exposé au navigateur.
- Vie privée : minimisation des journaux, consentement, consultation/correction/suppression de mémoire et règles de rétention ; audio et données envoyées hors du domicile doivent être explicites.
- Résilience : Home Assistant et Home Core préservent autant que possible le contrôle local, les scènes et les routines en cas de panne Internet ou de fournisseur cloud.
