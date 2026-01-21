const { PDFDocument } = require('pdf-lib');
const fetch = require('node-fetch');

class CERFAService {
  constructor(googleApiKey) {
    this.googleApiKey = googleApiKey;
  }

  async detectParcelles(address) {
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${this.googleApiKey}`;
    const geocodeRes = await fetch(geocodeUrl);
    const geocodeData = await geocodeRes.json();
    
    if (geocodeData.status !== 'OK') throw new Error('Geocoding failed');
    
    const { lat, lng } = geocodeData.results[0].geometry.location;
    const cadastreUrl = `https://apicarto.ign.fr/api/cadastre/parcelle?geom={"type":"Point","coordinates":[${lng},${lat}]}`;
    const cadastreRes = await fetch(cadastreUrl);
    const cadastreData = await cadastreRes.json();
    
    const parcelles = cadastreData.features.map(f => ({
      section: f.properties.section.replace(/^0+/, ''),
      numero: f.properties.numero,
      superficie: Math.round(f.properties.contenance)
    }));
    
    return { parcelles, coords: { lat, lon: lng } };
  }
}

module.exports = CERFAService;
