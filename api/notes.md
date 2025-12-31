Notes de déploiement / tests
- Pour reconstruire le bundle DP après modification : supprimer `.dp-generator.cjs` puis relancer l'API (rebuild auto via esbuild).
- Sequence pages actuelle : 11 pages (Cover, DP1 1/1000, DP1 1/2000, DP1 1/5000, DP2 avant, DP2 après, DP4, DP5, DP6, DP7/8, DP11).
- Payload couverture : `logoDataUrl` → `logoBuffer`, options taille via `logoWidth`/`logoHeight`.
- StreetView : requiert `GOOGLE_API_KEY` ou `GOOGLE_MAPS_API_KEY`.  
