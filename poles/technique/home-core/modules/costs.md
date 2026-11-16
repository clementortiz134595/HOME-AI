# Module Costs

Le module `costs` agrège les coûts confirmés et les estimations déjà enregistrées par Home Core. Son endpoint de lecture `GET /v1/costs/summary` retourne le mois courant, le mois précédent, une projection au rythme constaté, les catégories du mois et l'historique des douze derniers mois.

Les montants sont stockés en centimes dans SQLite. Cette première version est volontairement en lecture seule : l'import d'un relevé fournisseur ou la saisie manuelle d'une dépense sera ajouté seulement avec un parcours administrateur authentifié. En l'absence d'écriture, la réponse porte le statut `empty`; aucun montant n'est inventé.
