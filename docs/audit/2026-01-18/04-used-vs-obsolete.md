# 04 — Used vs Obsolete (baseline prudente)

But: classifier sans “inventer” d’usage. Toute ligne doit soit (a) référencer une preuve, soit (b) rester “Incertain”.

| Statut | Élément | Preuve minimale | Caller / Flux | Données touchées | Notes / Action |
|---|---|---|---|---|---|
| Utilisé (confirmé) | solaire-frontend (master-crm) | HTTP 200 sur “/” | Navigateur / CRM | UI | Rester public seulement si explicitement voulu |
| Utilisé (confirmé) | solaire-frontend (proj solaire-frontend) | HTTP 200 sur “/” | Navigateur / PWA | UI | À maintenir, mais IAM à cadrer |
| Utilisé (confirmé) | dp-generator | HTTP GET 200 sur “/” | Flux DP | Dossiers DP | Doit devenir privé derrière proxy/orchestrator |
| Utilisé (confirmé) | html-carto-api | HTTP GET 200 sur “/” | Flux carto | Carto / HTML | Image non figée; doit devenir privé si sensible |
| Utilisé (confirmé) | solaire-dp-generator | HTTP GET 200 sur “/” | Flux DP | DP | Doit devenir privé derrière proxy/orchestrator |
| Utilisé (confirmé) | mcp-router | HTTP GET 200 sur “/” | Gateway MCP | JSON | Contient env names LLM; à durcir |
| Incertain | cerfa-api | HTTP 404 sur “/” | TBD | TBD | Confirmer si endpoint réel ≠ “/” |
| Incertain | crm-webhook | HTTP 200 sur “/” | Webhooks | Payloads | Identifier producteurs/consommateurs |
| Incertain | solaire-api (gentle) | HTTP 200 sur “/” | CRM API | CRM | Nom trompeur (200 sur “/” peut être placeholder) |
| Incertain | solaire-api (proj solaire-frontend) | HTTP 404 sur “/” | API | CRM/DP | Endpoint réel probablement autre que “/” |
| Candidate decommission | solaire-api (mcp-gcp-prod) | HTTP 404 sur “/” et “/api” | TBD | TBD | Décommission seulement après preuve “unused” |
| Candidate decommission | mcp-api | HTTP 404 sur “/” et “/api” | TBD | TBD | Décommission seulement après preuve “unused” |
| Incertain | yohan-cloud-backup-* buckets | Inventaire buckets | Admin | Backups | Hors prod; documenter but, puis décider |
---
