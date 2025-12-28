# Solaire Admin Facile CRM

## Résumé des mises à jour (Codex + Yohan CRM Updates)
- Portail Admin Firebase (/admin) branché sur l’API REST (projets, leads, installateurs, documents, workflow).
- Dashboard admin: stats via API, progrès 0-100, mini workflow (DP/Consuel/Enedis/EDF OA), liens directs vers détails.
- Détails projet admin: workflow éditable (PATCH), progression, documents (liste + upload + preview).
- Détails lead admin: lecture API, conversion lead -> installateur + undo convert.
- Docs admin: onglet Documents relié à `/api/documents` avec listing global.
- Portail Client (/client): magic link Firebase réel, dashboard installateur, suivi dossier en lecture seule.
- Client dossier: étapes workflow affichées (labels), progression globale, documents en lecture.
- CRM Cloud Run: notifications in-app (cloche + dropdown), préférences sauvegardées, mode sombre persistant.
- CRM Installateurs: création de projet depuis un installateur (modal), liste projets filtrée.
- Formulaire projet: ajout puissance panneau (Wc) + calcul auto du nombre de panneaux.
- Workflow/indexes: index Firestore documents + projects.
- Rollback: script `scripts/backup-admin-portal.sh` + guide `docs/ROLLBACK_ADMIN_PORTAL.md`.

## ✅ État actuel
- Projet Vite/React + Firebase (Spark) hébergé sur `https://solaire-frontend.web.app`.
- Auth Firebase (admin/client) avec Firestore rules propres (admin lecture/écriture, client lecture sur `files`).
- Seed admin `/dev/seed` permet de vider/recréer leads, clients, dossiers (**installerId = INST123**, références `DOS-YYYY-NNNN`).
- Portail client : `/client/login`, `/client/dashboard`, `/client/dossiers/:id` (lecture de `files`, dossiers listés + détail cliquable).
- `scripts/seed-demo.js` : script Node pour réinitialiser (login admin + reseed). `createFileSafeClient` gère la réf + transaction.

## 🧪 Procédure de test local
1. `npm install` (si nécessaire) puis `npm run dev`.
2. Aller sur `http://localhost:5173/dev/seed`, se connecter avec les identifiants admin conservés en secret (voir variables d’environnement, aucun mot de passe n’est versionné).
3. Cliquer sur *Vider les collections* puis *Seed de démo* pour régénérer les données.
4. Ouvrir `http://localhost:5173/client/login`, se connecter en installateur avec les identifiants fournis en dehors du dépôt (ou créés via le seed).
5. Vérifier `/client/dashboard` (totaux + tableau cliquable) et `/client/dossiers/:id`.
6. Regarder `/dev/seed` : le bouton seed fonctionne à nouveau si besoin.

## 🚀 Déploiement (prod)
```bash
npm run build
firebase deploy --only hosting,firestore:rules --project solaire-frontend
```
- Hosting final sur `https://solaire-frontend.web.app`.
- Règles Firestore disponibles dans `firestore.rules`.

## 🧰 Points d’attention
- Dossiers protégés côté Firestore via `allow read: if isSignedIn()` (client peut lire ses `installerId`, admin tout). ``
- `useCollection` attend `useAuth` avant la lecture (évite erreurs `Missing permissions`).
- `scripts/seed-demo.js` peut être lancé sur n’importe quelle machine disposant des credentials admin.
- Toujours exécuter `node scripts/seed-demo.js` après un nettoyage (`/dev/seed > Vider les collections`).

## 🌐 Environnements / Variables
- `REACT_APP_API_URL` (ex: http://localhost:3000)
- `REACT_APP_FIREBASE_CONFIG` (JSON stringify du config Firebase)
- `VITE_API_WS_URL` (optionnel, ex: http://localhost:3000 pour le websocket)

## 📦 Build statique
```bash
npm install
npm run build
```
Le bundle est produit dans `dist/` (utilisé pour Pages/hosting).

## 🔗 Déploiement (GH Pages / hosting)
- Voir DEPLOYMENT.md pour les étapes GH Pages.

<!-- rebuild pages -->
