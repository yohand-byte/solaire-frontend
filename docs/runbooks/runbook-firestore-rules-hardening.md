# Runbook — Durcissement Firestore Rules

## Sauvegarde
- firebaserules releases list --project <PROJ>
- firebaserules rulesets list --project <PROJ>
- firebaserules rulesets get <RULESET_ID> --project <PROJ> > backup/firestore-ruleset-<PROJ>-<RULESET_ID>.json

## Mise à jour (principe)
- Deny-by-default.
- Règles par collection.
- Writes uniquement pour rôles/admin explicites.
- Reads uniquement si nécessaire (scopées par userId/tenant).

## Publication
- firebaserules releases update cloud.firestore --project <PROJ> --ruleset <NEW_RULESET_ID>

## Validation
- Tests applicatifs lecture/écriture par rôle.
- Vérifier absence d’accès large “auth != null => /**”.

## Rollback
- firebaserules releases update cloud.firestore --project <PROJ> --ruleset <OLD_RULESET_ID>
---
