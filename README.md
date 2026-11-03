# HOME AI

HOME AI est un produit domestique : un assistant personnel et un système domotique pilotables par la voix et par une application web responsive. Ce dépôt est organisé comme l'espace de travail d'une petite entreprise, pas seulement comme un dépôt de code.

## Naviguer dans le projet

- [Gouvernance](gouvernance/README.md) : vision, feuille de route, décisions, risques et règles de fonctionnement.
- [Pôle budget & logistique](poles/budget-logistique/README.md) : équipements, fournisseurs, coûts et achats.
- [Pôle produit](poles/produit/README.md) : besoins, parcours et priorités.
- [Pôle technique](poles/technique/README.md) : architecture, applications et exploitation.
- [Pôle design](poles/design/README.md) : expérience, design system et contenus d'interface.
- [Référentiel fonctionnel Home Panel & Home Core](poles/produit/fonctionnalites-home-core-panel.md) : inventaire des fonctionnalités actuellement cadrées ; l'application mobile native viendra plus tard.
- [Modèles](templates/README.md) : structure commune des dossiers de sous-projets et modèles de décision.
- [Équipe virtuelle d'agents](agent.md) : point d'entrée vers les profils, workflows et registre.

Le document de cadrage v0.1 est synthétisé dans [la vision produit](gouvernance/vision-et-cadrage.md). Les achats, prix et compatibilités restent à confirmer : aucun matériel ou fournisseur n'est validé par cette arborescence.

## Lancer l'environnement local

Le Compose racine lance Home Core, Home Panel et monte la fixture du [Zigbee Simulator](poles/technique/zigbee-simulator/README.md) dans le réseau interne :

```bash
docker compose up --build
```

Le panel est disponible sur `http://localhost:3000`. Le port peut être changé avec `HOME_PANEL_PORT=5173`. Home Core reste accessible uniquement par le réseau Docker ; le Panel relaie ses appels `/v1/` vers le service `home-core`.

## Règle de travail

Chaque sous-projet possède un dossier documentaire avant son code. Une décision qui engage l'architecture, le budget, la confidentialité ou l'expérience est enregistrée dans un ADR. Les liens entre exigences, choix, tests et achats sont ajoutés au fil de l'eau.

La base documentaire produit est rédigée en Markdown. Le référentiel [Home Panel & Home Core](poles/produit/fonctionnalites-home-core-panel.md) est la source de vérité fonctionnelle actuelle pour les deux applications.
