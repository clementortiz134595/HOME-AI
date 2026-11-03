# Dossier produit — Assistant personnel

## Spécification

Profils conceptuels : Clément, second habitant à confirmer, Invité. Les agendas et rappels personnels sont séparés ; les informations de la maison sont partagées selon autorisation. Créer ou modifier un événement nécessite une identification appropriée et une confirmation selon le risque.

## Interactions

Les commandes domestiques reçoivent une réponse courte et déterministe. Les questions générales ont une réponse plus naturelle. Les rappels personnels vont sur iPhone et ne déclenchent pas d'annonce vocale automatique par défaut.

## Études

Définir la source des rappels, la politique de confirmation, la gestion d'identité explicite et les commandes de consultation, correction et effacement de mémoire.

## Dossier technique

Séparer l'identité, les permissions d'agenda, les outils et la mémoire. Une empreinte vocale seule ne donne jamais accès à des données ou actions sensibles.

## Diagrammes

À créer : parcours de création d'événement et matrice d'accès par profil.

## ADR

ADR-003 : espaces personnels isolés, espace commun du logement et Invité sans mémoire personnelle persistante par défaut.

## Tests d'acceptation

Un Invité ne peut ni consulter ni modifier un agenda privé. Une action importante affiche une confirmation et laisse une trace d'audit minimale.
