# ADR-0016 — Coûts GCP via l’export Cloud Billing BigQuery

## Décision

Lorsque `HOME_CORE_GCP_BILLING_TABLE` désigne une table d’export détaillé Cloud Billing entièrement qualifiée, le module `costs` utilise un adaptateur sortant BigQuery. Il interroge les douze derniers mois, agrège les coûts réels et crédits par mois et service, et convertit le résultat en centimes avant de le transmettre à son cas d’usage. Home Panel conserve son unique accès `GET /v1/costs/summary` vers Home Core.

L’adaptateur emploie les Application Default Credentials déjà montées dans le conteneur et le scope Google Cloud Platform. Il n’accepte que les montants EUR ; une devise différente rend le coût indisponible plutôt que de produire une conversion implicite.

## Raisons

Cloud Billing publie les coûts réels et les crédits dans son export BigQuery ; il est ainsi possible de présenter le suivi GCP sans faux chiffres, sans navigateur privilégié et sans nouvelle base de facturation dans Home Core. La table et son suffixe lié au compte de facturation demeurent une configuration de déploiement.

## Conséquences

- Le compte de service ou les ADC du conteneur doivent pouvoir créer un job BigQuery et lire la table configurée ; le jeton ne sort jamais de Home Core.
- Une absence de configuration conserve le dépôt SQLite existant pour les coûts locaux.
- Une intégration configurée mais inaccessible échoue au démarrage afin d’éviter un retour silencieux à des données locales incomplètes.
- Les requêtes sont agrégées au serveur : aucune ligne détaillée d’usage ou de facture n’est exposée au Panel.
