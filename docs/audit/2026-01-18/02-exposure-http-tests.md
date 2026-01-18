# 02 — Exposition HTTP (tests read-only)

Source: /tmp/cloudrun_curl.log (HEAD/GET/OPTIONS sur “/” et “/api”, sans auth).

| Projet | Service | URL test | “/” (H/G/O) | “/api” (H/G/O) | Notes |
|---|---|---|---|---|---|
| gentle-mapper | cerfa-api | https://cerfa-api-xfwqgqc7ca-ew.a.run.app | 404/404/404 | 404/404/404 | JSON court |
| gentle-mapper | crm-webhook | https://crm-webhook-xfwqgqc7ca-ew.a.run.app | 200/200/200 | 200/200/200 | x-powered-by: Express |
| gentle-mapper | solaire-api | https://solaire-api-xfwqgqc7ca-ew.a.run.app | 200/200/204 | 404/404/204 | CORS methods larges observées |
| gentle-mapper | solaire-frontend | https://solaire-frontend-xfwqgqc7ca-ew.a.run.app | 200/200/405 | 200/200/405 | static HTML |
| mcp-gcp-prod | mcp-api | https://mcp-api-tui46uz4wa-ew.a.run.app | 404/404/404 | 404/404/404 | CSP strict |
| mcp-gcp-prod | solaire-api | https://solaire-api-tui46uz4wa-ew.a.run.app | 404/404/204 | 404/404/204 | OPTIONS 204 |
| mcp-gcp-prod-481314 | mcp-router | https://mcp-router-abrokygzpa-ew.a.run.app | 200/200/200 | 404/404/404 | ACAO: * observé |
| solaire-frontend | core-api | https://core-api-z5hnfoy7ya-ew.a.run.app | 404/404/204 | 404/404/204 | OPTIONS 204 |
| solaire-frontend | dp-generator | https://dp-generator-z5hnfoy7ya-ew.a.run.app | 405/200/405 | 404/404/404 | GET “/” répond |
| solaire-frontend | html-carto-api | https://html-carto-api-z5hnfoy7ya-ew.a.run.app | 405/200/405 | 404/404/404 | GET “/” répond |
| solaire-frontend | sendclientmagiclink | https://sendclientmagiclink-z5hnfoy7ya-ew.a.run.app | 400/400/204 | 400/400/204 | callable, POST attendu |
| solaire-frontend | solaire-api | https://solaire-api-z5hnfoy7ya-ew.a.run.app | 404/404/204 | 404/404/204 | OPTIONS 204 |
| solaire-frontend | solaire-dp-generator | https://solaire-dp-generator-z5hnfoy7ya-ew.a.run.app | 200/200/204 | 404/404/204 | GET “/” répond |
| solaire-frontend | solaire-frontend | https://solaire-frontend-z5hnfoy7ya-ew.a.run.app | 200/200/405 | 200/200/405 | static HTML |

Conclusion baseline: aucune barrière 401/403 observée sur ces endpoints “/” et “/api”, et l’IAM Run montre allUsers sur roles/run.invoker pour tous les services listés.
---
