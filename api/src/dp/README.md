# DP PDF Generator (Qualiwatt style)

This module generates DP PDF packs with Qualiwatt-like layout and cartography.

## Requirements
- Node >= 18
- Env vars:
  - GOOGLE_MAPS_API_KEY (Street View)

## Usage
- From /api:
  - Run: `node src/dp/cli.ts "14 Rue Emile Nicol, 14430 Dozule"`

## Output
- Images and final PDF are written to `api/dp-output/<timestamp>/dp-qualiwatt.pdf`.

## Notes
- Fonts: Noto Sans (OFL), stored in `src/dp/assets/fonts/`.
- IGN layers are fetched from data.geopf.fr in EPSG:2154 for exact scale.

## Carto pipeline (état actuel)
- Génération d’images DP côté `api/src/dp/images.ts` :
  - DP1 (plan/ortho 1:1000, 1:2000, 1:5000) : `generateDp1Maps` (IGN WMTS) + `generateDp1Overlays` (annotations Nord/cercle/flèche).
  - DP2A/DP2B (avant/après) : `generateDp2Cadastre` (orthophoto + parcellaire IGN) puis overlay panneaux via `addPanelsOverlay`.
  - DP4 : `generateIgnMap` pour l’orthophoto toiture.
  - DP5 : `generateDp5` (orthophoto + overlays panneaux/légende).
  - DP6 : `generateDp6` (Google Street View + overlays).
  - DP7/DP8 : `generateDp7Dp8` (Google Street View proche/loin).
- Rendu PDF : `api/src/dp/generator.ts` consomme ces assets (sommaire/titres/footers).

## Correspondance attendue avec HTML-CARTO
- Backend HTML-CARTO (repo `HTML-CARTO`) expose actuellement :
  - `/api/geocode` (géocodage data.gouv, fichier `main.py`).
  - `/api/cadastre/parcelle` et `/api/cadastre/parcelles-zone` (cadastre IGN, `main.py`).
  - `/api/orthophoto` et `/api/orthophoto/proxy` (WMTS ORTHOIMAGERY.ORTHOPHOTOS, `main.py`).
  - UI Leaflet activable en mode `?capture=1` (classe `capture-mode` dans `public/app.js`), sans handler serveur `/capture` livré.
- Aucune route HTML-CARTO ne génère aujourd’hui directement les visuels DP (DP1/DP2A/DP2B/DP4/DP5/DP6/DP7/DP8) : pour basculer sur HTML-CARTO il faudra soit appeler l’UI en headless (capture du canvas #map avec lat/lon/zoom/scale), soit réutiliser les couches WMS via un module `htmlCarto.ts`.
