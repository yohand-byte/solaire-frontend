# Déploiement Solaire Frontend (Vite + GH Pages)

## Prérequis
- Node 18
- npm
- API URL accessible (ex: https://solaire-api.onrender.com)

## Variables
- REACT_APP_API_URL (ex: http://localhost:3000)
- REACT_APP_FIREBASE_CONFIG (JSON stringify ou via .env)
- VITE_API_WS_URL (optionnel, websocket, ex: http://localhost:3000)

## Build locale
```bash
npm install
npm run build
npm run preview -- --host --port 4173
```

## GitHub Pages
- Build déjà configuré via workflow Smoke Health (build + smoke)
- Publier via Pages (branche main, dossier /docs ou action dédiée si ajoutée)

## Smoke local minimal
```bash
API_URL=http://localhost:3000 npm run build
curl http://localhost:3000/health
```
