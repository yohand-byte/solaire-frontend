# 00 — Périmètre, contraintes, sources

## Objectif
Figer une baseline d’audit (inventaire + exposition + risques + plan + rollback) et préparer la traçabilité GitHub (ADR, runbooks, templates, backlog).
ZÉRO changement infra. ZÉRO déploiement. ZÉRO modification de code applicatif.

## Projets dans le périmètre
- gentle-mapper-479320-j1 (828508661560) — MASTER CRM (référence)
- solaire-frontend (29459740400) — DP Generator + services associés
- solaire-admin (294963767896)
- mcp-gcp-prod (596239108234)
- mcp-gcp-prod-481314 (568369588098)

## Contraintes absolues (read-only)
- Aucun changement IAM / Firestore / Storage / Secrets / Cloud Run / Cloud Functions.
- Aucune activation d’API (si prompt d’activation → consigné “API disabled”).
- Tests HTTP uniquement HEAD / GET / OPTIONS sur “/” et “/api” (aucun POST/PUT/PATCH/DELETE).
- Aucun secret en clair (uniquement des noms de variables et références de secrets).
- Toute action future (P0/P1/P2) doit passer par une issue GitHub avec preuve + rollback + DoD.

## Sources de preuves (exports)
- Cloud Run describe: /tmp/run_describes/*.json
- Cloud Run IAM: /tmp/run_iam/*.json
- IAM projets: /tmp/project_iam/*.json
- Tests HTTP: /tmp/cloudrun_curl.log
- Firestore: /tmp/firestore/* (db_desc, indexes, ruleset)
- IdentityToolkit: /tmp/identitytoolkit/*.json
- Buckets: /tmp/buckets/* (list, desc, iam)
- Secrets (uniquement solaire-frontend): /tmp/secrets/solaire-frontend_*.json
- APIs activées: /tmp/apis/*.txt
- Images: /tmp/solaire_frontend_image_tags.txt, /tmp/master_crm_tags.json

## Constats baseline (sans débat, consignés)
- Cloud Run: invoker `allUsers` (roles/run.invoker) sur tous les services listés.
- Endpoints répondent sans auth (200/400/404) sur “/” et parfois “/api”.
- Images non figées: `:latest` et/ou tags non digest sur certains services.
- Secrets: Secret Manager actif surtout sur solaire-frontend; ailleurs, API Secret Manager souvent désactivée. Au moins un token (API_PROXY_TOKEN) existe en clair dans env sur gentle.
- IAM projets: présence de rôles larges (ex: roles/editor) sur SAs génériques; cas de cross-project datastore.user; storage.admin sur un compute SA sur mcp-gcp-prod-481314.
- Firestore: solaire-admin règles permissives (auth != null => read/write /**). gentle-mapper sans ruleset publié. solaire-frontend règles plus restrictives côté write.
- IdentityToolkit: actif sur solaire-frontend et solaire-admin; désactivé/403 sur gentle/mcp*.
- Firebase: actif sur solaire-frontend et solaire-admin; non confirmé/absent sur gentle-mapper et mcp*.
---
