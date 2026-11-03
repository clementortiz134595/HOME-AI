# Agent — mode d'emploi de la bibliothèque

Le dossier [`agent/`](agent/README.md) contient toute l'équipe virtuelle de HOME AI. Ce fichier est le point d'entrée : il explique où trouver les profils et comment les utiliser.

```text
agent/
├── README.md        # présentation et utilisation
├── rules.md         # règles communes applicables aux agents
├── master/          # Master Agent, point d'entrée des demandes complexes
├── profiles/        # profils spécialisés, organisés par domaine
├── workflows/       # méthodes de travail réutilisables
├── templates/       # modèles d'études, comparatifs et décisions
├── knowledge/       # contexte partagé du projet
└── registry.yaml    # inventaire des agents actifs
```

## Utilisation

1. Lire [`agent/README.md`](agent/README.md) et [`agent/rules.md`](agent/rules.md).
2. Pour une demande transverse, commencer par le [Master Agent](agent/master/master-agent.md).
3. Pour une demande ciblée, ouvrir le profil adapté dans [`agent/profiles/`](agent/profiles/).
4. Suivre un workflow existant et mettre à jour le registre lors de l'ajout ou de la désactivation d'un agent.

La bibliothèque d'agents aide à construire HOME AI ; elle n'est pas une fonctionnalité de Jarvis et ne remplace pas le code, les tests ou l'infrastructure du produit.
