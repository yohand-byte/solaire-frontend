# 05 — Plan de remédiation (proposé, non exécuté)

Objectif: sécuriser d’abord (P0), puis architecture (P1), puis intégration UI (P2), sans régression CRM.

## P0 — Sécurité immédiate (sans changement fonctionnel)
1) Cloud Run: privé par défaut
- Retirer allUsers sur tous les services non explicitement publics.
- Ajouter invokers autorisés (service accounts + identités).
- Validation: HEAD/GET attendus 401/403 sur services privés, 200 seulement sur fronts statiques.

2) sendClientMagicLink (Gen2 callable): fermer l’anonyme
- Retirer allUsers et cadrer ingress.
- Vérifier côté function: exiger request.auth (contrat callable).

3) Pin images
- Remplacer :latest et tags non digest par image@sha256:digest.
- Priorité: master-crm:pwa-nginx2, html-carto-api, solaire-frontend:latest.

4) Secrets
- Migrer API_PROXY_TOKEN (gentle) vers Secret Manager + secretKeyRef.
- Inventorier et supprimer (plus tard) les secrets orphelins uniquement après preuve d’inutilité.

5) IAM projet
- Remplacer roles/editor + storage.admin par rôles minimaux.
- Retirer cross-project datastore.user si non strictement requis.

6) Firestore
- solaire-admin: remplacer RW global (auth != null) par règles par collection/rôle.
- gentle-mapper: publier un ruleset explicite (deny-by-default ou accès ciblé).

## P1 — Architecture (sans toucher la fonctionnalité CRM)
1) Orchestrator DP (Cloud Run dédié)
- Nouveau service “dp-orchestrator”.
- DP services deviennent privés; l’orchestrator appelle en interne.
- Traçabilité: request-id / logs / statut.

2) Proxy côté API “référence”
- Ajouter une façade unique “/dp/*” côté API de référence (sans casser CRM).
- Le frontend n’appelle jamais dp-generator directement.

3) Normalisation “solaire-api”
- Décider l’API de référence (MASTER CRM).
- Planifier la convergence et le décommission progressif des duplicats.

4) Stockage outputs DP
- Bucket privé dédié outputs (PAP enforced + UBLA).
- Accès via URL signée courte durée ou proxy authentifié.

## P2 — Intégration UI CRM (sans régression)
1) UI: bouton “Générer DP” + suivi statut
- Appel vers proxy/orchestrator, affichage progression, erreurs.

2) UI: téléchargement sécurisé
- Lien via URL signée short-lived ou endpoint proxy.

## Règle opérationnelle
Aucun changement n’est exécuté sans:
- Issue GitHub (preuve + plan + rollback + DoD)
- Backup IAM/spec/ruleset avant action
- Test de validation documenté
---
