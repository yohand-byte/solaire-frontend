# ADR-0003 — Pin images, Secret Manager, IAM moindre privilège

Status: Proposed

## Context
Baseline: usage de `:latest` et tags non digest + token en clair (API_PROXY_TOKEN sur gentle) + rôles IAM larges (roles/editor, storage.admin, cross-project datastore.user). Objectif: améliorer traçabilité, rollback, et réduire blast radius.

## Decision
- Cloud Run déployé sur digest uniquement: `image@sha256:...`.
- Secrets uniquement via Secret Manager:
  - Cloud Run: secretKeyRef
  - Cloud Functions: secretEnv / secretKeyRef
- IAM: suppression des rôles larges au profit de rôles ciblés au besoin.

## Consequences
- Rollback fiable: retour révision/image consignée.
- Rotation secrets possible.
- Nécessite une discipline pipeline (capturer digest, versionner décisions).

## Alternatives (rejetées)
- Garder tags flottants: non traçable, rollback faible.
- Secrets en env plaintext: fuite + rotation difficile.
- roles/editor “pour aller vite”: dette et exposition.

## Rollback
- Réaffecter image précédente (tag ou revision) et restaurer IAM depuis backups.
- En dernier recours: rétablir env plaintext (uniquement si blocage critique).
---
