# Build / commandes (split apps)

## Solaire Facile (Firebase Hosting)
```bash
cd apps/solaire-facile
npm install   # dépendances déjà présentes au root, ce stub suffit
npm run build
# sortie : apps/solaire-facile/dist
```

## Master CRM (Cloud Run)
```bash
cd apps/master-crm
npm install   # dépendances déjà présentes au root
npm run build
# sortie : apps/master-crm/dist
```

## Cloud Build (exemple, à adapter) – pas exécuté
```bash
IMAGE=europe-west1-docker.pkg.dev/<PROJECT_ID>/solaire-frontend/master-crm:<tag>
gcloud builds submit --config cloudbuild.frontend.yaml \
  --substitutions=_IMAGE=$IMAGE,_VITE_API_URL=https://solaire-api-828508661560.europe-west1.run.app \
  --project gentle-mapper-479320-j1
# Ajouter au besoin : _VITE_FIREBASE_API_KEY=..., etc.
```

## Firebase Hosting (exemple, à adapter) – pas exécuté
```bash
cd apps/solaire-facile
npm run build
# puis déploiement (à faire manuellement) :
# firebase deploy --only hosting --project solaire-frontend
```

## Notes
- Aucun déploiement n’a été exécuté dans cette branche.
- Les valeurs VITE_FIREBASE_API_KEY sont laissées en placeholder dans les .env.production générés.
