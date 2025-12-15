# Architecture

- **Frontend** : React + Vite (mixed JS/TS) déployé sur Firebase Hosting (`solaire-frontend.web.app`). Utilise Firestore (leads, files, users) et Firebase Auth.
- **Backend** : Cloud Run `https://solaire-frontend-828508661560.europe-west1.run.app` exposant `POST /files` pour créer des dossiers avec `installerId = INST123`. Le front admin lit directement Firestore, les leads & clients passent par cet API.
- **Collections** :
  - `leads` : prospects (status, source, dates). 
  - `clients` : installateurs (instId, pack, segment, etc.).
  - `files` : dossiers (reference, pack, statutGlobal/status, clientFinal, address, power, nextAction/nextActionDate, suivi administratif, documents, history, etc.).
  - `users` : `role`, `installerId`, `email` par UID.
- **Hooks** :
  - `useAuth` orchestre l’auth Firebase + doc `users/{uid}` et expose `role`, `canAccessAdmin`, `canEditFiles`.
  - `useCollection` & `useDocument` attendent l’auth before snapshot et filtrent sur `installerId` pour les clients.
- **Admin** : `/dashboard` (AdminDashboard), `/planning` (AdminPlanning), `/dossiers/:id` (AdminFileDetail), `/dev/seed`, `/admin/fix-installer`, `/style.css` centralise les classes.
- **Client** : `/client/login`, `/client/dashboard`, `/client/dossiers/:id` (intact).
