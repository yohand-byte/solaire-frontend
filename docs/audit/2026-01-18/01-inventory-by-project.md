# 01 — Inventaire par projet

Notation:
- Public Run: présence de `allUsers` sur roles/run.invoker (cf. /tmp/run_iam/*.json)
- Secrets: uniquement noms (Secret Manager) ou “env plaintext” si observé
- Valeurs exactes non présentes dans les preuves → `TBD`

## gentle-mapper-479320-j1 (828508661560)

### Cloud Run (4 services)
| Service | URL canonique | URL a.run.app (test) | Image | Service Account | Public Run | Secrets / Env | Notes |
|---|---|---|---|---|---|---|---|
| cerfa-api | https://cerfa-api-828508661560.europe-west1.run.app | https://cerfa-api-xfwqgqc7ca-ew.a.run.app | @sha256:19fcff… | 828508661560-compute@developer.gserviceaccount.com | Oui | env: API_KEY | “/” retourne 404 |
| crm-webhook | https://crm-webhook-828508661560.europe-west1.run.app | https://crm-webhook-xfwqgqc7ca-ew.a.run.app | @sha256:0cd4e4… | 828508661560-compute@developer.gserviceaccount.com | Oui | none | “/” retourne 200 |
| solaire-api | https://solaire-api-828508661560.europe-west1.run.app | https://solaire-api-xfwqgqc7ca-ew.a.run.app | @sha256:1c4a6b… | 828508661560-compute@developer.gserviceaccount.com | Oui | env: CADASTRE_BUFFER_M, GOOGLE_CLOUD_PROJECT, GCLOUD_PROJECT | “/” retourne 200 |
| solaire-frontend (master-crm) | https://solaire-frontend-828508661560.europe-west1.run.app | https://solaire-frontend-xfwqgqc7ca-ew.a.run.app | master-crm:pwa-nginx2 (tag non digest) | 828508661560-compute@developer.gserviceaccount.com | Oui | env plaintext: API_PROXY_TARGET, API_PROXY_TOKEN, API_PROXY_PREFIX, DEPLOY_TS | Front statique (200) |

### Cloud Functions
- Aucune listée (API Cloud Functions signalée désactivée dans les preuves).

### Firestore
- Base: FIRESTORE_NATIVE (europe-west1), PITR disabled.
- Rules: aucune release publiée observée (releases none).

### IdentityToolkit / Auth
- API désactivée (403) dans les preuves.

### Storage buckets (extraits)
- gentle-mapper-479320-j1_cloudbuild
- run-sources-gentle-mapper-479320-j1-europe-west1
- solaire-facile-documents
- yohan-cloud-backup-{codex,temp}
IAM bucket: pas de allUsers/allAuthenticated observé. UBLA/PAP: null (à durcir dans remédiation).

### Secret Manager
- API Secret Manager désactivée (SERVICE_DISABLED) dans les preuves.

### IAM projet (extraits)
- roles/editor sur SA compute.
- owner user.
- cloudbuild.builds.editor user.

---

## solaire-frontend (29459740400)

### Cloud Run (7 services)
| Service | URL canonique | URL a.run.app (test) | Image | Service Account | Public Run | Secrets / Env | Notes |
|---|---|---|---|---|---|---|---|
| core-api | https://core-api-29459740400.europe-west1.run.app | https://core-api-z5hnfoy7ya-ew.a.run.app | @sha256:efed990… | 29459740400-compute@developer.gserviceaccount.com | Oui | none | “/” 404 |
| dp-generator | https://dp-generator-29459740400.europe-west1.run.app | https://dp-generator-z5hnfoy7ya-ew.a.run.app | @sha256:7e3f0d… | 29459740400-compute@developer.gserviceaccount.com | Oui | secretKeyRef: google-maps-api-key (GOOGLE_API_KEY) | “/” GET 200 |
| html-carto-api | https://html-carto-api-29459740400.europe-west1.run.app | https://html-carto-api-z5hnfoy7ya-ew.a.run.app | gcr.io/solaire-frontend/html-carto-api (tag non digest) | 29459740400-compute@developer.gserviceaccount.com | Oui | none | “/” GET 200 |
| sendclientmagiclink | https://sendclientmagiclink-29459740400.europe-west1.run.app | https://sendclientmagiclink-z5hnfoy7ya-ew.a.run.app | gcf-artifacts:version_1 | 29459740400-compute@developer.gserviceaccount.com | Oui | secretKeyRef: SMTP_* | “/” GET 400 (callable) |
| solaire-api | https://solaire-api-29459740400.europe-west1.run.app | https://solaire-api-z5hnfoy7ya-ew.a.run.app | @sha256:3b5d5e… | 29459740400-compute@developer.gserviceaccount.com | Oui | env: FRONTEND_ORIGIN, CONTINUE_URL, FIREBASE_WEB_API_KEY, DEBUG_RETURN_LINK, ADMIN_API_KEY | “/” 404 |
| solaire-dp-generator | https://solaire-dp-generator-29459740400.europe-west1.run.app | https://solaire-dp-generator-z5hnfoy7ya-ew.a.run.app | @sha256:63b172… | 29459740400-compute@developer.gserviceaccount.com | Oui | secretKeyRef: google-maps-api-key, solaire-api-token | “/” GET 200 |
| solaire-frontend | https://solaire-frontend-29459740400.europe-west1.run.app | https://solaire-frontend-z5hnfoy7ya-ew.a.run.app | eu.gcr.io/solaire-frontend/solaire-frontend:latest (digest 94bcfb4d5a21) | 29459740400-compute@developer.gserviceaccount.com | Oui | secretKeyRef: solaire-api-token (API_PROXY_TOKEN) | Front statique (200) |

### Cloud Functions (Gen2)
- sendClientMagicLink: callable; ingress ALLOW_ALL; secrets SMTP_* référencés (versions v1/v2 observées).

### Firestore
- Base: FIRESTORE_NATIVE (nam5), PITR disabled.
- Indexes: 11 composites (clients, credits_transactions, documents, dossiers, files, leads, projectDocuments_v2, projects).
- Ruleset: présent (admin-only write; reads auth selon collections).

### IdentityToolkit / Auth
- Email/password: enabled.
- authorizedDomains incluent: localhost, firebaseapp.com, web.app, et certains run.app (selon export).

### Storage buckets (extraits)
- gcf-v2-sources-29459740400-*
- gcf-v2-uploads-29459740400.*.cloudfunctions.appspot.com
- run-sources-solaire-frontend-europe-west1
- solaire-frontend_cloudbuild
IAM bucket: pas de allUsers/allAuthenticated observé. UBLA/PAP: null.

### Secret Manager (liste observée)
- OPENAI_API_KEY
- google-maps-api-key
- solaire-api-token
- SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM / SMTP_SECURE

### IAM projet (extraits)
- roles/editor sur compute/cloudservices/appspot.
- roles/datastore.user inclut un membre cross-project (828508661560-compute).
- roles/firebaseauth.admin sur adminsdk + un SA applicatif (selon export).
- user owner + run.admin + iam.serviceAccountAdmin.

---

## solaire-admin (294963767896)

### Cloud Run
- Aucun service listé.

### Cloud Functions
- Aucune listée.

### Firestore
- Base: FIRESTORE_NATIVE (nam5), PITR disabled.
- Ruleset: permissif (auth != null => read/write /**) + règle spécifique leads create (champs min).

### IdentityToolkit / Auth
- Email/password: enabled.
- authorizedDomains: localhost, firebaseapp.com, web.app (selon export).

### Storage
- Liste buckets vide dans les preuves (à revalider si nécessaire).

### Secret Manager
- API Secret Manager désactivée (SERVICE_DISABLED) dans les preuves.

### IAM projet (extraits)
- roles/editor sur compute + appspot.
- firebaseauth.admin sur adminsdk.
- user owner.

---

## mcp-gcp-prod (596239108234)

### Cloud Run (2 services)
| Service | URL canonique | URL a.run.app (test) | Image | Service Account | Public Run | Secrets / Env | Notes |
|---|---|---|---|---|---|---|---|
| mcp-api | https://mcp-api-596239108234.europe-west1.run.app | https://mcp-api-tui46uz4wa-ew.a.run.app | @sha256:b1614c… | 596239108234-compute@developer.gserviceaccount.com | Oui | none | “/” 404 |
| solaire-api | https://solaire-api-596239108234.europe-west1.run.app | https://solaire-api-tui46uz4wa-ew.a.run.app | @sha256:96a6bd… | 596239108234-compute@developer.gserviceaccount.com | Oui | none | “/” 404 |

### Storage
- run-sources-mcp-gcp-prod-europe-west1 (IAM: pas de allUsers observé; UBLA/PAP null).

### Secret Manager / Firestore / IdentityToolkit / Functions
- APIs signalées désactivées dans les preuves.

### IAM projet (extraits)
- roles/editor sur SA compute.
- user owner.

---

## mcp-gcp-prod-481314 (568369588098)

### Cloud Run (1 service)
| Service | URL canonique | URL a.run.app (test) | Image | Service Account | Public Run | Secrets / Env | Notes |
|---|---|---|---|---|---|---|---|
| mcp-router | https://mcp-router-568369588098.europe-west1.run.app | https://mcp-router-abrokygzpa-ew.a.run.app | @sha256:445733… | 568369588098-compute@developer.gserviceaccount.com | Oui | env names: ANTHROPIC_API_KEY, OPENAI_API_KEY, MISTRAL_API_KEY | “/” GET 200 |

### Storage
- run-sources-mcp-gcp-prod-481314-europe-west1 (IAM: pas de allUsers observé; UBLA/PAP null).

### IAM projet (extraits)
- roles/editor + roles/storage.admin sur SA compute.
- user owner.

---

## Synthèse duplications
- “solaire-api” existe dans 3 projets (gentle-mapper, solaire-frontend, mcp-gcp-prod): dérive possible + ambiguïté opérationnelle.
---
