# Déploiement Solaire Frontend (Vite + Cloud Run)

## Prérequis
- Node 18
- npm
- API URL accessible (ex: https://solaire-api.onrender.com)

## Variables (env build Vite)
- VITE_API_URL (ex: https://solaire-api.onrender.com)
- VITE_API_WS_URL (optionnel)
- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_STORAGE_BUCKET
- VITE_FIREBASE_MESSAGING_SENDER_ID
- VITE_FIREBASE_APP_ID

## Build locale
```bash
npm install
npm run build
npm run preview -- --host --port 4173
```

## Cloud Run (Docker)
```
docker build \
  --build-arg VITE_API_URL=https://solaire-api.onrender.com \
  --build-arg VITE_FIREBASE_API_KEY=xxx \
  --build-arg VITE_FIREBASE_AUTH_DOMAIN=solaire-frontend.firebaseapp.com \
  --build-arg VITE_FIREBASE_PROJECT_ID=solaire-frontend \
  --build-arg VITE_FIREBASE_STORAGE_BUCKET=solaire-frontend.appspot.com \
  --build-arg VITE_FIREBASE_MESSAGING_SENDER_ID=xxx \
  --build-arg VITE_FIREBASE_APP_ID=xxx \
  -t gcr.io/your-project/solaire-frontend:latest .

docker run -p 8080:8080 gcr.io/your-project/solaire-frontend:latest
```

## Smoke local minimal
```bash
API_URL=http://localhost:3000 npm run build
curl http://localhost:3000/health
```
