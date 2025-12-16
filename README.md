# Solaire Admin Facile CRM

## ✅ État actuel
- Projet Vite/React + Firebase (Spark) hébergé sur `https://solaire-frontend.web.app`.
- Auth Firebase (admin/client) avec Firestore rules propres (admin lecture/écriture, client lecture sur `files`).
- Seed admin `/dev/seed` permet de vider/recréer leads, clients, dossiers (**installerId = INST123**, références `DOS-YYYY-NNNN`).
- Portail client : `/client/login`, `/client/dashboard`, `/client/dossiers/:id` (lecture de `files`, dossiers listés + détail cliquable).
- `scripts/seed-demo.js` : script Node pour réinitialiser (login admin + reseed). `createFileSafeClient` gère la réf + transaction.

## 🧪 Procédure de test local
1. `npm install` (si nécessaire) puis `npm run dev`.
2. Aller sur `http://localhost:5173/dev/seed`, se logguer en admin (`yohan.d@qualiwatt.com / Hashem0409@`).
3. Cliquer sur *Vider les collections* puis *Seed de démo* pour régénérer les données.
4. Ouvrir `http://localhost:5173/client/login`, se connecter en installateur (`installateur1@test.com / 123456789`).
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
