const { PDFDocument } = require('pdf-lib');
const fetch = require('node-fetch');

class CERFAService {
  constructor(googleApiKey) {
    this.googleApiKey = googleApiKey;
  }

  async detectParcelles(address, radius = 50) {
    try {
      console.log('Detection parcelles pour:', address);
      
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${this.googleApiKey}`;
      const geocodeRes = await fetch(geocodeUrl);
      const geocodeData = await geocodeRes.json();
      
      if (geocodeData.status !== 'OK') {
        throw new Error(`Geocoding failed: ${geocodeData.status}`);
      }
      
      const location = geocodeData.results[0].geometry.location;
      const lat = location.lat;
      const lon = location.lng;
      
      console.log('Coordonnees:', lat, lon);
      
      const cadastreUrl = `https://apicarto.ign.fr/api/cadastre/parcelle?geom={"type":"Point","coordinates":[${lon},${lat}]}`;
      const cadastreRes = await fetch(cadastreUrl);
      const cadastreData = await cadastreRes.json();
      
      const parcelles = [];
      
      if (cadastreData.features && cadastreData.features.length > 0) {
        cadastreData.features.forEach(feature => {
          const p = feature.properties;
          parcelles.push({
            section: p.section.replace(/^0+/, ''),
            numero: p.numero,
            superficie: Math.round(p.contenance),
            commune: p.nom_com,
            codeCommune: p.code_com,
            codeInsee: p.code_insee,
            id: `${p.section}-${p.numero}`
          });
        });
      }
      
      return {
        address: geocodeData.results[0].formatted_address,
        coords: { lat, lon },
        parcelles: parcelles
      };
      
    } catch (error) {
      console.error('Erreur detectParcelles:', error);
      throw error;
    }
  }

  async generateCERFA(project, installer, parcelleChoisie, signatureUrl = null, tamponUrl = null) {
    try {
      console.log('Generation CERFA pour projet:', project.reference);
      
      const templatePath = require('path').join(__dirname, 'templates', 'cerfa_16702-01.pdf');
      const templateBytes = await require('fs').promises.readFile(templatePath);
      const pdfDoc = await PDFDocument.load(templateBytes);
      const form = pdfDoc.getForm();
      
      const addr = project.beneficiary.address;
      const fullAddress = `${addr.street}, ${addr.postalCode} ${addr.city}`;
      
      const streetMatch = addr.street.match(/^(\d+[A-Z]?)/);
      const streetNum = streetMatch ? streetMatch[1] : '';
      const streetName = addr.street.replace(/^\d+[A-Z]?\s*/, '');
      
      const installerStreetNum = installer.address.street.split(' ')[0];
      const installerStreetName = installer.address.street.replace(/^\d+\s*/, '');
      const emailParts = installer.contact.email.split('@');
      
      const dateStr = new Date().toLocaleDateString('fr-FR').replace(/\//g, '');
      
      const fields = {
        'D2D_denomination': installer.company,
        'D2R_raison': installer.legalName || installer.company,
        'D2S_siret': installer.siret,
        'D2J_type': installer.companyType || 'SASU',
        'D2N_nom': installer.contact.lastName,
        'D2P_prenom': installer.contact.firstName,
        'D3N_numero': installerStreetNum,
        'D3V_voie': installerStreetName,
        'D3L_localite': installer.address.city,
        'D3C_code': installer.address.postalCode,
        'D3T_telephone': installer.contact.phone,
        'D5GE1_email': emailParts[0],
        'D5GE2_email': emailParts[1],
        'T2Q_numero': streetNum,
        'T2V_voie': streetName,
        'T2L_localite': addr.city.toUpperCase(),
        'T2C_code': addr.postalCode,
        'T2F_prefixe': parcelleChoisie.prefix || '000',
        'T2S_section': parcelleChoisie.section,
        'T2N_numero': parcelleChoisie.numero,
        'T2T_superficie': parcelleChoisie.superficie.toString(),
        'D5T_total': parcelleChoisie.superficie.toString(),
        'C2ZD1_description': project.description || 'Installation de panneaux photovoltaiques sur toiture',
        'C2ZP1_crete': project.installation?.powerKwc?.toString() || '',
        'C2ZR1_destination': 'Autoconsommation avec revente surplus',
        'E1L_lieu': installer.address.city,
        'E1D_date': dateStr
      };
      
      const checkboxes = {
        'C2ZB1_existante': true,
        'C2ZI1_agrivoltaique': true,
        'D5A_acceptation': true,
        'T3B_CUnc': true,
        'T3S_lotnc': true,
        'T3T_ZACnc': true,
        'T3E_AFUnc': true,
        'T3F_PUPnc': true
      };
      
      for (const [name, value] of Object.entries(fields)) {
        try {
          form.getTextField(name).setText(String(value));
        } catch (err) {}
      }
      
      for (const [name, value] of Object.entries(checkboxes)) {
        try {
          const field = form.getCheckBox(name);
          if (value) field.check();
          else field.uncheck();
        } catch (err) {}
      }
      
      if (signatureUrl) {
        await this.addSignature(pdfDoc, signatureUrl);
      }
      
      if (tamponUrl) {
        await this.addTampon(pdfDoc, tamponUrl);
      }
      
      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);
      
    } catch (error) {
      console.error('Erreur generateCERFA:', error);
      throw error;
    }
  }

  async addSignature(pdfDoc, signatureUrl) {
    try {
      const response = await fetch(signatureUrl);
      const imageBuffer = await response.buffer();
      const signatureImage = await pdfDoc.embedPng(imageBuffer);
      
      const pages = pdfDoc.getPages();
      const signaturePage = pages[pages.length - 1];
      
      signaturePage.drawImage(signatureImage, {
        x: 400,
        y: 120,
        width: 150,
        height: 50
      });
      
      console.log('Signature ajoutee');
    } catch (error) {
      console.error('Erreur addSignature:', error);
    }
  }

  async addTampon(pdfDoc, tamponUrl) {
    try {
      const response = await fetch(tamponUrl);
      const imageBuffer = await response.buffer();
      const tamponImage = await pdfDoc.embedPng(imageBuffer);
      
      const pages = pdfDoc.getPages();
      const tamponPage = pages[pages.length - 1];
      
      tamponPage.drawImage(tamponImage, {
        x: 100,
        y: 120,
        width: 100,
        height: 100
      });
      
      console.log('Tampon ajoute');
    } catch (error) {
      console.error('Erreur addTampon:', error);
    }
  }
}

module.exports = CERFAService;
