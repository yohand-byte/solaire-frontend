# ADR-0002 — Intégration DP sans régression CRM: Orchestrator + Proxy

Status: Proposed

## Context
DP Generator et services associés (dp-generator, solaire-dp-generator, html-carto-api) sont aujourd’hui accessibles via Cloud Run public. Le CRM doit rester intact (MASTER CRM = référence). Objectif: intégrer/industrialiser DP sans toucher la fonctionnalité CRM, et clarifier l’appel des services.

## Decision
- Introduire un service “dp-orchestrator” (Cloud Run) responsable de:
  - déclenchement génération DP,
  - orchestration multi-étapes (validation carto, multi-parcelles, etc.),
  - statut et récupération output.
- Exposer au frontend uniquement une façade “proxy” côté API de référence:
  - Le frontend CRM appelle `POST/GET /dp/*` sur l’API de référence.
  - L’API de référence appelle l’orchestrator (privé).
  - L’orchestrator appelle dp-generator/solaire-dp-generator/html-carto-api (privés).

## Consequences
- DP services deviennent privés (IAM invoker).
- Traçabilité: request-id, logs corrélés, statut exploitable côté UI.
- “Sans régression CRM”: aucune modification de logique CRM existante, seulement ajout d’un chemin DP isolé.

## Alternatives (rejetées)
- Appels directs du frontend vers DP services: exposition + coupling.
- Iframe: CORS/SSO fragile, UX dégradée.
- Monorepo/merge total: risque de régression et temps long.

## Rollback
- Revenir au mode actuel (URLs DP publiques) en documentant la bascule:
  - réactiver l’accès public si nécessaire via IAM backup,
  - désactiver l’orchestrator/proxy sans impacter le CRM.
---
