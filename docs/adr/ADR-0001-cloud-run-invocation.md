# ADR-0001 — Cloud Run: public vs privé, stratégie d’invocation

Status: Proposed

## Context
Baseline: tous les services Cloud Run listés ont `allUsers` sur roles/run.invoker. Des endpoints répondent 200/400/404 sans auth sur “/” et “/api”. Objectif: réduire surface exposée sans casser le CRM.

## Decision
- Modèle “privé par défaut”.
- Seuls les frontends statiques explicitement publics restent accessibles anonymement.
- Tous les services API / DP / webhooks / callable deviennent privés et sont invoqués via:
  - IAM invoker (service accounts) et/ou
  - façade unique (proxy) contrôlée.

## Consequences
- Nécessite de définir les identités autorisées (SA appelants).
- Tests curl sur endpoints privés doivent retourner 401/403.
- Réduction immédiate du risque d’exposition.

## Alternatives (rejetées)
- Tout laisser public + “clés côté serveur”: fuite probable / posture faible.
- IP allowlist: fragile, maintenance élevée.
- mTLS bout en bout: disproportionné pour ce scope.

## Rollback
- Réappliquer les policies IAM sauvegardées sur les services concernés (run services set-iam-policy).
---

PR test: secret scan workflow
