# ADR-0002 — Runtime Go pour le premier noyau Home Core

- Statut : accepté pour le premier incrément
- Date : 2026-11-03

## Contexte

Le premier module appelle une API météo publique depuis un serveur local, doit être facilement conteneurisé et ne nécessite pas encore de bibliothèque métier spécialisée. Le choix de runtime doit rester simple à exploiter sur une cible domestique.

## Décision

Le premier incrément de Home Core est écrit en Go 1.23, en utilisant la bibliothèque standard pour HTTP, JSON, tests et arrêt contrôlé. L'image Docker construit un binaire Linux et l'exécute sans privilège. Le socle reste statique tant qu'aucun adaptateur ne requiert de bibliothèque native ; sherpa-onnx constitue l'exception documentée pour la détection locale du mot-clé et active CGO dans une image glibc multiarchitecture.

## Conséquences

- Une image compacte et un processus unique simplifient le déploiement sur une machine domestique.
- Les ports d'application préservent le remplacement d'Open-Meteo et l'ajout de connecteurs IA, domotique ou agenda.
- Les SDK spécifiques devront être évalués avant introduction ; un besoin démontré peut justifier une bibliothèque Go ou une décision de coexistence, pas un second serveur par défaut.
- Les bibliothèques dynamiques sherpa-onnx et ONNX Runtime sont embarquées dans la même image et le même processus Home Core sur Linux `amd64` et `arm64`.
