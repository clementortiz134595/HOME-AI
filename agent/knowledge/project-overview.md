# Vue d'ensemble HOME AI

HOME AI est un projet personnel d'assistant domestique de type Jarvis. Le périmètre actuellement cadré couvre Home Panel, l'interface visuelle du foyer, et Home Core, le cœur local qui porte l'assistant, les données, les intégrations et les règles d'accès. La référence fonctionnelle détaillée est [le référentiel Home Panel & Home Core](../../poles/produit/fonctionnalites-home-core-panel.md) ; l'application mobile native est reportée à un cadrage ultérieur.

Les capacités visées comprennent l'accueil du foyer, l'agenda et les rappels, les questions libres à l'assistant IA, la voix, Google Calendar, les scènes et automatisations, le contrôle des luminaires et prises, les profils et une mémoire contrôlable. Home Panel expose les usages ; Home Core centralise permissions, secrets, règles métier et intégrations. Home Assistant demeure le moteur local des appareils.

L'architecture envisagée est hybride : Home Assistant et la Raspberry Pi assurent le contrôle local ; l'IA peut être locale ou cloud selon le besoin. Home Core reste un monolithe modulaire Docker ; chacun de ses modules applique une architecture hexagonale et constitue l'unique frontière vers les intégrations. Les scènes domestiques déterministes doivent rester utiles lorsque les services cloud sont indisponibles.

Contraintes actuelles : appartement loué, achats progressifs, budget matériel indicatif de 200–250 €, Raspberry Pi probablement modèle 4 à inventorier, accès extérieur sécurisé requis. Les choix Vue 3, Node.js, TypeScript, SQLite et Docker sont des hypothèses à confirmer.
