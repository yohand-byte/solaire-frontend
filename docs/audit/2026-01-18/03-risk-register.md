# 03 — Registre des risques (baseline)

Références de preuve:
- IAM Run: /tmp/run_iam/*.json
- HTTP: /tmp/cloudrun_curl.log
- Images: /tmp/solaire_frontend_image_tags.txt, /tmp/master_crm_tags.json, /tmp/run_describes/*.json
- IAM projet: /tmp/project_iam/*.json
- Firestore rules: /tmp/firestore/*_ruleset.json, releases (si présents)
- Buckets: /tmp/buckets/*_desc.json, /tmp/buckets/*_iam.json

| ID | Sévérité | Risque | Preuve | Impact | Correctif minimal | Rollback |
|---|---|---|---|---|---|---|
| R-001 | P0 | Cloud Run invoker public (allUsers) sur tous les services | /tmp/run_iam/*.json | Exposition anonyme (API + surfaces internes) | Retirer allUsers, ajouter invokers autorisés (SA / identité) | Réappliquer IAM Run sauvegardé |
| R-002 | P0 | Endpoints répondent sans auth (200/400/404) | /tmp/cloudrun_curl.log | Surface attaquable, fingerprinting, abus potentiels | IAM privé + ingress/auth (selon service) | Restaurer IAM/spec |
| R-003 | P0 | Images non figées (:latest / tags non digest) | /tmp/run_describes/*.json, /tmp/solaire_frontend_image_tags.txt, /tmp/master_crm_tags.json | Rollback difficile, dérive supply-chain | Pin par digest | Retour révision précédente / image précédente |
| R-004 | P0 | Secret en clair (API_PROXY_TOKEN) sur gentle master-crm | /tmp/run_describes/*gentle*.json | Fuite de jeton, rotation impossible | Migrer vers Secret Manager + secretKeyRef | Rétablir env plaintext (dernier recours) |
| R-005 | P0 | IAM projet trop large (roles/editor, storage.admin, cross-project datastore.user) | /tmp/project_iam/*.json | Escalade latérale, blast radius | Moindre privilège (rôles ciblés) | set-iam-policy depuis backup |
| R-006 | P0 | Firestore solaire-admin: RW global si auth | /tmp/firestore/solaire-admin_ruleset.json | Toute auth Firebase => RW large | Règles par collection/rôle | Revenir ruleset précédent |
| R-007 | P1 | Buckets UBLA/PAP non forcés (null) | /tmp/buckets/*_desc.json | Posture non durcie, risque futur | UBLA=ON, PAP=ENFORCED, CORS minimal | Restaurer config bucket |
| R-008 | P1 | “solaire-api” dupliqué sur 3 projets | Inventaire | Ambiguïté + drift | Contrat unique + plan de décommission | Garder mapping actuel |
| R-009 | P1 | Service callable sendClientMagicLink exposé (invoker public + ingress ALLOW_ALL) | /tmp/run_iam/*, /tmp/run_describes/*, /tmp/cloudrun_curl.log | Abus (spam, coûts), surface auth | Retirer public + vérifier auth callable | Restaurer IAM/ingress |
---
