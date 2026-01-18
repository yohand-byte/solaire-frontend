# Runbook — Durcissement IAM Cloud Run

## Objectif
Retirer l’invocation anonyme et définir des invokers autorisés, avec rollback immédiat.

## Procédure
1) Backup IAM (obligatoire)
- gcloud run services get-iam-policy <SVC> --project=<PROJ> --region=europe-west1 > backup/run-<PROJ>-<SVC>-iam.yaml

2) Retirer l’anonyme
- gcloud run services remove-iam-policy-binding <SVC> --project=<PROJ> --region=europe-west1 --member=allUsers --role=roles/run.invoker

3) Ajouter invokers autorisés
- gcloud run services add-iam-policy-binding <SVC> --project=<PROJ> --region=europe-west1 --member=serviceAccount:<CALLER_SA> --role=roles/run.invoker

4) Validation
- curl -I <URL> doit retourner 401/403 (services privés) ou 200 (fronts publics explicitement).
- gcloud run services get-iam-policy <SVC> --project=<PROJ> --region=europe-west1

## Rollback
- gcloud run services set-iam-policy <SVC> backup/run-<PROJ>-<SVC>-iam.yaml --project=<PROJ> --region=europe-west1
---
