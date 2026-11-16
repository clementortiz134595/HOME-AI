# Module Costs

Le module `costs` agrège les coûts confirmés et les estimations déjà enregistrées par Home Core. Son endpoint de lecture `GET /v1/costs/summary` retourne le mois courant, le mois précédent, une projection au rythme constaté, les catégories du mois et l'historique des douze derniers mois.

Par défaut, les montants sont stockés en centimes dans SQLite. Lorsqu'une table d’export détaillé Cloud Billing est configurée dans `HOME_CORE_GCP_BILLING_TABLE`, l’adaptateur `gcpbilling` lit directement les coûts réels dans BigQuery avec les identifiants applicatifs Google du conteneur. La table est entièrement qualifiée et reste une configuration de déploiement : aucun identifiant de compte de facturation ni jeton n’est envoyé au Panel ni inscrit dans le code.

L’export doit utiliser une devise EUR ; Home Core refuse une devise inattendue plutôt que de présenter un total erroné. Cette lecture est volontairement sans écriture : l'import d'un relevé fournisseur ou la saisie manuelle d'une dépense reste un parcours administrateur authentifié distinct. En l'absence d'écriture ou de ligne GCP, la réponse porte le statut `empty`; aucun montant n'est inventé.
