const fetch = require('node-fetch');

class CadastreAPI {
  constructor() {
    // No API key needed - using free French government APIs
  }

  async geocodeAddress(address) {
    // Using French government free geocoding API instead of Google Maps
    const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(address)}&limit=1`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      const coords = feature.geometry.coordinates;
      return { 
        lat: coords[1], 
        lon: coords[0], 
        formatted: feature.properties.label 
      };
    }
    throw new Error('Geocoding failed: Address not found');
  }

  async getParcelleFromCoords(lat, lon) {
    const url = `https://apicarto.ign.fr/api/cadastre/parcelle?geom={"type":"Point","coordinates":[${lon},${lat}]}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const parcelle = data.features[0].properties;
      return {
        prefix: parcelle.code_arr || '000',
        section: parcelle.section.replace(/^0+/, ''),
        numero: parcelle.numero,
        superficie: Math.round(parcelle.contenance),
        commune: parcelle.nom_com,
        codeCommune: parcelle.code_com
      };
    }
    throw new Error('Parcelle non trouvee');
  }

  async getParcelleFromAddress(address) {
    const coords = await this.geocodeAddress(address);
    const parcelle = await this.getParcelleFromCoords(coords.lat, coords.lon);
    return { ...parcelle, coords };
  }
}

module.exports = CadastreAPI;
