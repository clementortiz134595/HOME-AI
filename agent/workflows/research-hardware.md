# Workflow — Rechercher et benchmarker du matériel

## Déclenchement obligatoire

Utiliser ce workflow dès qu'une demande contient une intention de recherche d'achat, même si elle est formulée de façon informelle : « regarder les options », « comparer », « benchmark », « meilleur rapport qualité-prix », « fournisseurs », « prix », « quoi acheter », « liste exhaustive », « alternatives » ou équivalent.

Le Master Agent ne réalise pas seul la collecte des offres dans ce cas. Il délègue au minimum la collecte au `hardware-researcher`. Si la demande compare le coût ou impose un plafond, il délègue aussi au `purchasing-advisor`. Si la compatibilité Home Assistant, Zigbee, Thread, Matter, Wi-Fi ou un hub est déterminante, il délègue la validation au `hardware-integration-specialist`.

## Séquence

1. Fixer le besoin, le budget, l'environnement, les quantités et les critères de compatibilité.
2. `hardware-researcher` collecte des produits exacts chez plusieurs fabricants ou vendeurs pertinents, avec prix, disponibilité, protocole, référence, lien et date de consultation.
3. `hardware-integration-specialist` distingue la compatibilité annoncée de la compatibilité validée, recense les hubs, coordinateurs, border routers, dépendances cloud et risques de réseau.
4. `purchasing-advisor` calcule le coût total par scénario (matériel complémentaire, livraison quand connue, quantité, garantie et coûts cachés) et vérifie le budget global.
5. Le Master Agent consolide les contributions dans un tableau comparatif, explicite les hypothèses et recommande une option conditionnelle. Aucun achat n'est effectué sans validation explicite.

## Livrable minimal

Le comparatif doit contenir une ligne par option et, au minimum : catégorie, fournisseur, référence, prix affiché, condition de prix (unité/lot), disponibilité, protocole, hub ou adaptateur requis, intégration locale, points forts, limites, lien source et date de consultation. Les prix non vérifiables restent vides et sont signalés comme inconnus.

Le résultat doit également contenir au moins un scénario chiffré recommandé et une alternative, avec quantité, total, reste sur budget et éléments non inclus. Les résultats issus d'une seule boutique ou d'une seule marque ne constituent pas un benchmark suffisant, sauf si l'utilisateur le demande explicitement.
