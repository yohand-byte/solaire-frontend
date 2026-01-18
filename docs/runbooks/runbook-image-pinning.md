# Runbook — Pinning des images Cloud Run (digest only)

1) Backup spec
- gcloud run services describe <SVC> --project=<PROJ> --region=europe-west1 --format=json > backup/run-<PROJ>-<SVC>-spec.json

2) Identifier digest
- Artifact Registry:
  - gcloud artifacts docker tags list <LOC>-docker.pkg.dev/<PROJ>/<REPO>/<IMAGE> --limit=50
- GCR:
  - gcloud container images list-tags eu.gcr.io/<PROJ>/<IMAGE> --limit=50

3) Update service avec digest
- gcloud run services update <SVC> --project=<PROJ> --region=europe-west1 --image <IMAGE>@sha256:<DIGEST>

4) Validation
- gcloud run services describe <SVC> --project=<PROJ> --region=europe-west1 --format='value(spec.template.spec.containers[0].image)'

Rollback
- Revenir à la révision précédente:
  - gcloud run services update-traffic <SVC> --project=<PROJ> --region=europe-west1 --to-revisions <REV_PREV>=100
---
