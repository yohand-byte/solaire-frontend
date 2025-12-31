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
