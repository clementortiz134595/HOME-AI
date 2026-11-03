# ADR-0005 — Assistant vocal et outils contrôlés

## Statut

Acceptée pour le contrat d’orchestration ; les fournisseurs STT, TTS et IA restent à choisir.

## Décision

Home Core orchestre une interaction vocale selon la chaîne `audio → vérification de locuteur → STT → interprétation d’intention → politique de confirmation → outil de module → réponse`. Chaque étape est un port applicatif du module `assistant`. Les outils appellent les façades des modules `home-control`, `google-workspace` ou autres modules autorisés.

Les commandes maison déterministes peuvent être interprétées sans LLM. La vérification de locuteur compare un embedding vocal à des profils enrôlés et retourne `unknown` sous le seuil de confiance. Les lectures Gmail/Drive et les actions externes restent soumises à l’identité, aux droits et, si nécessaire, à une confirmation explicite. Une correspondance vocale seule ne constitue jamais une authentification forte.

## Conséquences

- L’audio brut n’est pas journalisé par défaut et son envoi hors domicile doit être explicite.
- Le résultat d’un outil est vérifiable : exécuté, confirmation requise, refusé, indisponible ou échoué.
- STT, LLM, TTS, Home Assistant, Gmail et Drive sont remplaçables par des adaptateurs testables.
- Le MVP ne choisit pas encore de fournisseur ni de matériel audio.
