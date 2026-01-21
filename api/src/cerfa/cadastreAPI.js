const fetch = require('node-fetch');

class CadastreAPI {
  constructor(googleApiKey) {
    this.googleApiKey = googleApiKey;
  }

  async geocodeAddress(address) {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${this.googleApiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return { lat: location.lat, lon: location.lng, formatted: data.results[0].formatted_address };
    }
    throw new Error(`Geocoding failed: ${data.status}`);
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
