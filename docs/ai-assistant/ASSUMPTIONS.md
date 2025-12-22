# AI Assistant Assumptions
- CRM cible pour l’assistant : application Vite racine (`src/`), en particulier la fiche dossier admin `src/admin/AdminFileDetail.tsx` (Firestore). Les apps `apps/master-crm` et `apps/solaire-facile` restent inchangées/stub.
- `git pull --rebase` non exécuté (branche `debug/prod` sans suivi distant configuré). On continue sur la branche locale `feat/crm-ai-assistant`.
- Absence de `storage.rules` : aucune règle storage ajoutée tant qu’un besoin explicite n’existe pas.
- Fonctions cloud actuelles vides : ajout de nouvelles fonctions prévu en Node.js 20 sans toucher aux exports existants.
- Le trigger `indexDossierDoc` attend `metadata.dossierId` sur les objets Storage et ignore les fichiers volumineux (> ~2.5 Mo) ou non textuels.
