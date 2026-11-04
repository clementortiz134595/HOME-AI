# Module `chores`

Le module gère les tâches ménagères, simples ou périodiques. Une tâche porte un objectif, une date optionnelle, un ou plusieurs responsables et une récurrence hebdomadaire optionnelle. Une rotation est représentée par `alternating:true` et l'ordre de `assignees`.

L’assistant vocal accepte les intentions structurées Gemini `chores.create`, `chores.update` et `chores.delete`. Gemini propose uniquement le JSON validé ; Home Core exécute l’opération.

Exemple d’intention :

```json
{"name":"chores.create","parameters":{"objective":"faire les poussières du salon","assignees":["Lise","Clément"],"frequency":"weekly","intervalWeeks":1,"alternating":true},"sensitive":false}
```
