# Backend (Cloud Run) - Phase 1

## Variables d'environnement (Cloud Run)
- FRONTEND_ORIGIN=https://solaire-frontend.web.app
- CONTINUE_URL=https://solaire-frontend.web.app/client/login
- FIREBASE_WEB_API_KEY=<web api key>
- DEBUG_RETURN_LINK=false

## Commandes locales
```
npm i
npm run start:api
```

## Build Docker backend
```
docker build -f Dockerfile.api -t europe-west1-docker.pkg.dev/solaire-frontend/solaire-api/app:latest .
docker push europe-west1-docker.pkg.dev/solaire-frontend/solaire-api/app:latest
```

## Déploiement Cloud Run
```
gcloud run deploy solaire-api \
  --image europe-west1-docker.pkg.dev/solaire-frontend/solaire-api/app:latest \
  --region europe-west1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars FRONTEND_ORIGIN=https://solaire-frontend.web.app,CONTINUE_URL=https://solaire-frontend.web.app/client/login,FIREBASE_WEB_API_KEY=YOUR_KEY,DEBUG_RETURN_LINK=false
```
