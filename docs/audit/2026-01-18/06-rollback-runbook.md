# 06 — Runbook rollback (standard)

## 1) Sauvegardes avant tout changement
- IAM projet:
  - gcloud projects get-iam-policy <PROJECT_ID> > backup/iam-<PROJECT_ID>.yaml
- IAM Cloud Run:
  - gcloud run services get-iam-policy <SERVICE> --project=<PROJECT_ID> --region=europe-west1 > backup/run-<PROJECT_ID>-<SERVICE>-iam.yaml
- Spec Cloud Run:
  - gcloud run services describe <SERVICE> --project=<PROJECT_ID> --region=europe-west1 --format=json > backup/run-<PROJECT_ID>-<SERVICE>-spec.json
- Révision + image courante:
  - gcloud run services describe <SERVICE> --project=<PROJECT_ID> --region=europe-west1 --format='value(status.latestReadyRevisionName,spec.template.spec.containers[0].image)' > backup/run-<PROJECT_ID>-<SERVICE>-rev-image.txt
- Firestore rules:
  - firebaserules releases list --project <PROJECT_ID> > backup/firestore-releases-<PROJECT_ID>.txt
  - firebaserules rulesets list --project <PROJECT_ID> > backup/firestore-rulesets-<PROJECT_ID>.txt
  - (si connu) firebaserules rulesets get <RULESET_ID> --project <PROJECT_ID> > backup/firestore-ruleset-<PROJECT_ID>-<RULESET_ID>.json
- Buckets:
  - gcloud storage buckets describe gs://<BUCKET> --format=json > backup/bucket-<BUCKET>.json
  - gcloud storage buckets get-iam-policy gs://<BUCKET> --format=json > backup/bucket-<BUCKET>-iam.json

## 2) Rollback Cloud Run IAM
- gcloud run services set-iam-policy <SERVICE> backup/run-<PROJECT_ID>-<SERVICE>-iam.yaml --project=<PROJECT_ID> --region=europe-west1

## 3) Rollback Cloud Run trafic / révision
- gcloud run services update-traffic <SERVICE> --project=<PROJECT_ID> --region=europe-west1 --to-revisions <REV>=100

## 4) Rollback image (si update image)
- gcloud run services update <SERVICE> --project=<PROJECT_ID> --region=europe-west1 --image <OLD_IMAGE>

## 5) Rollback Firestore rules
- firebaserules releases update cloud.firestore --project <PROJECT_ID> --ruleset <OLD_RULESET_ID>

## 6) Vérifications post-rollback
- Rejouer HEAD/GET/OPTIONS sur “/” et “/api” (mêmes commandes que l’audit) et consigner.
- Vérifier IAM (présence/absence allUsers conforme au rollback attendu).
- Vérifier la révision active Cloud Run.
---
