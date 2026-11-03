# ADR-0004 — API Workspace avant façade MCP

- Statut : accepté pour le cadrage
- Date : 2026-11-03

Google Workspace est un module Home Core avec ports Gmail et Drive. Une façade MCP future est un adaptateur entrant : elle ne porte ni OAuth, ni règles de lecture/écriture, ni secrets. Cette décision évite que les agents contournent les confirmations ou dupliquent les connecteurs.

La connexion réelle attend un projet Google Cloud et un consentement utilisateur pour les scopes choisis. Les écritures Drive resteront soumises à une confirmation quand `identity-access` sera livré.
