# Synthèse Admin

## Fonctionnalités clés
- **Cockpit Dashboard** : KPI leads + dossiers, actions du jour, retards, tableau filtrable et cliquable.
- **Planning / Agenda** : trois colonnes Aujourd’hui/Semaine/Retard, clic direct vers la fiche.
- **Fiche dossier** : header (référence, badges), suivi administratif détaillé, actions éditables, upload Storage, documents/historique.
- **Spotlight** : Cmd+K / loupe pour chercher leads/clients/dossiers.
- **Rôles** : admin/manager peuvent tout faire, viewer lit seulement, installateur/client porte le portail `/client/*`.

## Calculs clés
- Actions du jour = `nextActionDate` == date du jour (statut != finalisé/clos).
- En retard = `nextActionDate` < aujourd’hui + statut non finalisé.
- StatutGlobal/Status alimentent badges visuels.

## Tests QA rapide
1. `npm run dev` → se loguer en admin (`yohan.d@qualiwatt.com / Hashem0409@`).
2. `/dashboard` : KPI / timeline / table clique → `/dossiers/:id`.
3. `/planning` : voir nbre actions et clic vers fiche.
4. `/dossiers/:id` : modifier action + upload document → voir fichier ajouté.
5. Cmd+K / loupe → taper “DOS-” → cliquer et ouvrir.
6. `/dev/seed` : vider + reseed, vérifier `files` Firestore.

## Procédure de seed
- CLI : `node scripts/seed-demo.js` ou via `/dev/seed` (admin). Réinitialise `users`, `leads`, `clients`, `files`.

## Procédure de secours
- Si les dossiers n’apparaissent plus : `/dev/seed` > “Vider les collections” > “Seed de démo”.
- Pour vérifier l’état Firestore : use CLI `node scripts/seed-demo.js` output + console Firestore.
