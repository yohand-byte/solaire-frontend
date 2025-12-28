# Rollback Admin Portal (Option 2 + 3)

Ce guide couvre:
- Option 2: sauvegarde locale avant modification.
- Option 3: retour Git sur un commit stable.

## Option 2 - Sauvegarde locale

1. Donner les droits d'execution au script (une seule fois):

```bash
chmod +x scripts/backup-admin-portal.sh
```

2. Lancer la sauvegarde:

```bash
scripts/backup-admin-portal.sh
```

3. Le backup est cree dans `backups/admin-portal-YYYYMMDD-HHMMSS/`.

## Option 3 - Rollback Git (fichiers admin)

### A. Restaurer uniquement certains fichiers

```bash
git log --oneline -- apps/solaire-facile/src/admin apps/solaire-facile/src/routes.tsx
git restore --source <commit_sha> -- apps/solaire-facile/src/admin apps/solaire-facile/src/routes.tsx
```

### B. Creer un revert propre

```bash
git revert <commit_sha>
```

### C. Revenir temporairement a un commit pour valider

```bash
git switch -c rollback-check
git checkout <commit_sha> -- apps/solaire-facile/src/admin apps/solaire-facile/src/routes.tsx
```

Remarque: utiliser `git reset --hard` uniquement si vous savez que l'historique peut etre reecrit.
