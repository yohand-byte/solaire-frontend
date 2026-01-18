# API DP Solaire

Serveur Express qui génère les dossiers DP (DP1 à DP11) et sert l’UI statique `/dp`.

## Variables d’environnement
- `GOOGLE_API_KEY` (ou `GOOGLE_MAPS_API_KEY`) : Street View.
- `FIREBASE_CONFIG_B64` **ou** `FIREBASE_CONFIG` : service account Firebase (JSON ou base64).
- `API_TOKEN` (optionnel) : clé d’API pour protéger les endpoints.
- `PORT` (par défaut 8080), `HOST` (par défaut 127.0.0.1 — mettre 0.0.0.0 en conteneur).

## Lancer en local
```bash
cd api
GOOGLE_API_KEY=xxx PORT=3001 HOST=127.0.0.1 npm run start
```
Visiter `http://localhost:3001/dp`.

## Déploiement (Render en Docker)
Fichiers ajoutés : `Dockerfile`, `.dockerignore`, `render.yaml`.
1) Connecter le repo à Render.
2) Choisir “Deploy to Render” avec `render.yaml`, type Web Service (plan Free).
3) Définir les variables d’environnement (`GOOGLE_API_KEY`, `FIREBASE_CONFIG_B64`, `API_TOKEN` si besoin). `PORT=8080`, `HOST=0.0.0.0` sont déjà dans le Dockerfile.
Le service expose l’UI `/dp` et les endpoints `/api/*` sur le même domaine.
```
