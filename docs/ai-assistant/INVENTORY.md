# AI Assistant Inventory

## Arborescence pertinente
- `src/` : app Vite principale (App.jsx tabulaire), sous-dossiers `admin/`, `client/`, `hooks/`, `lib/`, `api/`, `types/`.
- `functions/` : Cloud Functions (TypeScript) avec stub `src/index.ts`, `package.json` minimal (`firebase-functions` 4.x, `firebase-admin` 12.x).
- `packages/shared/` : helpers Firestore communs (CRUD leads/clients/dossiers, générateur de références) utilisés par `src/lib/firestore.ts`.
- `apps/master-crm/` : copie historique de l’app (même structure que `src/`), pas ciblée par le hosting actuel.
- `apps/solaire-facile/` : stub router admin/client, hosting Firebase pointe vers `apps/solaire-facile/dist`.

## Auth / rôles / accès Firestore
- Initialisation Firebase côté client : `src/lib/firestore.ts` (envs `VITE_FIREBASE_*` obligatoires) expose `auth`, `db`, et wrappers vers `packages/shared/src/firestore`.
- Claims & navigation : `src/hooks/useAuth.tsx` (claims `role`, `installerId`), `src/routing/afterLogin.ts` pour router vers `/admin/dashboard` ou `/client/dashboard`.
- Accès temps réel : `src/hooks/useCollection.tsx` et `src/hooks/useDocument.tsx` (filtre installerId si rôle `installer`).
- Règles Firestore (`firestore.rules`) : admins par claim/allowlist ont lecture/écriture globale, propriétaires clients peuvent lire certains docs (clients/dossiers), fallback deny-all pour collections inconnues.
- Pas de `storage.rules` présent à la racine.

## Pages / routes dossier
- Admin : listing dans `src/admin/AdminDashboard.tsx` (Firestore), navigation vers `/dossiers/:id` rendu par `src/admin/AdminFileDetail.tsx` (fiche dossier structurée).
- Client : `/client/dossiers` (liste) et `/client/dossiers/:id` via `src/client/Files.tsx` et `src/client/FileDetail.tsx` (appels API `API_URL`).
- Legacy SPA : onglet "Dossiers" + composant `FileDetail` interne à `src/App.jsx` (API Cloud Run, pas de router).
- Routes guards disponibles : `src/admin/AdminRoute.tsx`, `src/client/ClientRoute.tsx` (non câblés dans App.jsx actuel).

## Snapshots configs clés
- `firebase.json` : hosting `solaire-frontend` (public `apps/solaire-facile/dist`, rewrites `/admin/**`, `/client/**`, catch-all), Firestore rules/indexes standard.
- `firestore.rules` : helpers `isAdmin`, `isOwnerClient`; règles pour `leads`, `clients`, `dossiers`, `users`, `credits_transactions`, `counters`; wildcard deny-all final.
- `functions/src/index.ts` : stub sans exports (Spark plan mentionné).
- `functions/package.json` : dépendances `firebase-functions` ^4.0.0, `firebase-admin` ^12.0.0.
- `apps/` et `src/` présents; build Docker principal cible `dist/` racine (Vite).
