const PDFDocument = require('pdfkit');
const fetch = require('node-fetch');

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

// ============================================
// FONCTIONS DE RÉCUPÉRATION DES DONNÉES
// ============================================

// 1. Geocoding : Adresse → Coordonnées
async function geocodeAddress(address) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== 'OK' || !data.results[0]) {
    throw new Error('Adresse non trouvée');
  }

  const result = data.results[0];
  return {
    formatted: result.formatted_address,
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    placeId: result.place_id,
    components: {
      street: result.address_components.find(c => c.types.includes('route'))?.long_name || '',
      number: result.address_components.find(c => c.types.includes('street_number'))?.long_name || '',
      city: result.address_components.find(c => c.types.includes('locality'))?.long_name || '',
      postalCode: result.address_components.find(c => c.types.includes('postal_code'))?.long_name || '',
      department: result.address_components.find(c => c.types.includes('administrative_area_level_2'))?.long_name || '',
      region: result.address_components.find(c => c.types.includes('administrative_area_level_1'))?.long_name || ''
    }
  };
}

// 2. Solar API : Données du toit
async function getSolarData(lat, lng) {
  const url = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&requiredQuality=MEDIUM&key=${GOOGLE_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.error) {
    console.warn('Solar API error:', data.error.message);
    return null;
  }

  const solar = data.solarPotential || {};
  const mainRoof = solar.roofSegmentStats?.[0] || {};

  return {
    maxPanels: solar.maxArrayPanelsCount || 0,
    maxAreaM2: solar.maxArrayAreaMeters2 || 0,
    roofAreaM2: solar.wholeRoofStats?.areaMeters2 || 0,
    groundAreaM2: solar.wholeRoofStats?.groundAreaMeters2 || 0,
    sunshineHours: solar.maxSunshineHoursPerYear || 0,
    pitchDegrees: mainRoof.pitchDegrees || 30,
    azimuthDegrees: mainRoof.azimuthDegrees || 180,
    carbonOffset: solar.carbonOffsetFactorKgPerMwh || 0,
    imageryDate: data.imageryDate || {},
    center: data.center || { latitude: lat, longitude: lng }
  };
}

// 3. Cadastre IGN : Données parcellaires
async function getCadastreData(lat, lng) {
  try {
    const url = `https://apicarto.ign.fr/api/cadastre/parcelle?lon=${lng}&lat=${lat}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.features && data.features.length > 0) {
      const parcelle = data.features[0].properties;
      return {
        commune: parcelle.nom_commune || '',
        codeCommune: parcelle.code_commune || '',
        section: parcelle.section || '',
        numero: parcelle.numero || '',
        feuille: parcelle.feuille || '',
        contenance: parcelle.contenance || 0,
        reference: `${parcelle.section || ''} ${parcelle.numero || ''}`
      };
    }
  } catch (err) {
    console.warn('Cadastre API error:', err.message);
  }
  return null;
}

// 4. Street View : URLs des images
function getStreetViewUrls(lat, lng, address) {
  const base = 'https://maps.googleapis.com/maps/api/streetview';
  const common = 'size=640x640&scale=2&source=outdoor';
  return {
    close: `${base}?${common}&location=${lat},${lng}&fov=90&pitch=10&key=${GOOGLE_API_KEY}`,
    far: `${base}?${common}&location=${lat},${lng}&fov=120&pitch=5&key=${GOOGLE_API_KEY}`,
    front: `${base}?${common}&location=${encodeURIComponent(address)}&fov=100&pitch=15&key=${GOOGLE_API_KEY}`
  };
}

// 5. Cartographie : Geoportail / IGN (WMS)
// NOTE: on garde les mêmes clés (satellite_*) pour ne pas casser le reste du code,
// mais elles pointeront vers des orthophotos IGN (ORTHOIMAGERY.ORTHOPHOTOS).
function ignWmsUrl(layer, lat, lng, dLat, dLng, width, height, format) {
  const base = 'https://data.geopf.fr/wms-r/wms';
  const bbox = `${lat - dLat},${lng - dLng},${lat + dLat},${lng + dLng}`;
  const fmt = format || 'image/png';
  return `${base}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=${encodeURIComponent(layer)}&STYLES=&CRS=EPSG:4326&BBOX=${bbox}&WIDTH=${width}&HEIGHT=${height}&FORMAT=${encodeURIComponent(fmt)}`;
}

function getMapUrls(lat, lng) {
  const W = 1200;
  const H = 800;

  return {
    dp1_plan_1000: ignWmsUrl('GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2', lat, lng, 0.0008, 0.0012, W, H, 'image/png'),
    dp1_ortho_1000: ignWmsUrl('ORTHOIMAGERY.ORTHOPHOTOS', lat, lng, 0.0008, 0.0012, W, H, 'image/jpeg'),
    dp1_plan_2000: ignWmsUrl('GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2', lat, lng, 0.0018, 0.0027, W, H, 'image/png'),
    dp1_plan_5000: ignWmsUrl('GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2', lat, lng, 0.0045, 0.0068, W, H, 'image/png'),

    dp2_cadastre: ignWmsUrl('CADASTRALPARCELS.PARCELLAIRE_EXPRESS', lat, lng, 0.0004, 0.0006, W, H, 'image/png'),
    dp2_ortho: ignWmsUrl('ORTHOIMAGERY.ORTHOPHOTOS', lat, lng, 0.0004, 0.0006, W, H, 'image/jpeg'),

    satellite_close: ignWmsUrl('ORTHOIMAGERY.ORTHOPHOTOS', lat, lng, 0.00015, 0.00025, W, H, 'image/jpeg'),
    satellite_medium: ignWmsUrl('ORTHOIMAGERY.ORTHOPHOTOS', lat, lng, 0.0008, 0.0012, W, H, 'image/jpeg'),
    satellite_far: ignWmsUrl('ORTHOIMAGERY.ORTHOPHOTOS', lat, lng, 0.0018, 0.0027, W, H, 'image/jpeg'),

    roadmap: ignWmsUrl('GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2', lat, lng, 0.0008, 0.0012, W, H, 'image/png'),
    terrain: ignWmsUrl('GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2', lat, lng, 0.0045, 0.0068, W, H, 'image/png')
  };
}

// 6. Télécharger une image et retourner le buffer
async function downloadImage(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = await res.buffer();
    return buffer;
  } catch (err) {
    console.warn('Image download error:', err.message);
    return null;
  }
}

// ============================================
// ANALYSE COMPLÈTE D'UNE ADRESSE
// ============================================

async function analyzeAddress(address) {
  const geo = await geocodeAddress(address);
  const solar = await getSolarData(geo.lat, geo.lng);
  const cadastre = await getCadastreData(geo.lat, geo.lng);
  const streetView = getStreetViewUrls(geo.lat, geo.lng, address);
  const maps = getMapUrls(geo.lat, geo.lng);

  return {
    address: geo,
    solar,
    cadastre,
    images: {
      streetView,
      maps
    }
  };
}

// ============================================
// GÉNÉRATION DU PDF DP
// ============================================

async function generateDPDocument(project, analysisData) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: false });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = 595;
      const pageHeight = 842;
      const margin = 40;

      const beneficiary = project.beneficiary || {};
      const installation = project.installation || {};
      const address = analysisData.address || {};
      const solar = analysisData.solar || {};
      const cadastre = analysisData.cadastre || {};

      const clientName = `${beneficiary.firstName || ''} ${beneficiary.lastName || ''}`.trim() || 'Client';
      const fullAddress = address.formatted || `${beneficiary.address?.street || ''}, ${beneficiary.address?.postalCode || ''} ${beneficiary.address?.city || ''}`;
      const panelsCount = installation.panelsCount || solar.maxPanels || 8;
      const power = installation.power || Math.round(panelsCount * 0.375 * 10) / 10;
      const roofType = installation.roofType || 'tuile';
      const orientation = getOrientationText(solar.azimuthDegrees || 180);

      console.log('Téléchargement des images...');
      const images = {};

      if (analysisData.images?.maps?.satellite_close) images.satelliteClose = await downloadImage(analysisData.images.maps.satellite_close);
      if (analysisData.images?.maps?.satellite_medium) images.satelliteMedium = await downloadImage(analysisData.images.maps.satellite_medium);
      if (analysisData.images?.maps?.satellite_far) images.satelliteFar = await downloadImage(analysisData.images.maps.satellite_far);
      if (analysisData.images?.maps?.roadmap) images.roadmap = await downloadImage(analysisData.images.maps.roadmap);
      if (analysisData.images?.streetView?.front) images.streetFront = await downloadImage(analysisData.images.streetView.front);
      if (analysisData.images?.streetView?.close) images.streetClose = await downloadImage(analysisData.images.streetView.close);
      if (analysisData.images?.streetView?.far) images.streetFar = await downloadImage(analysisData.images.streetView.far);

      doc.addPage();

      doc.rect(0, 0, pageWidth / 2, pageHeight).fill('#1E3A5F');

      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(22);
      doc.text('DÉCLARATION PRÉALABLE', 30, 40, { width: pageWidth / 2 - 60, align: 'center' });

      if (images.satelliteClose) {
        doc.image(images.satelliteClose, 30, 100, { width: pageWidth / 2 - 60, height: 200 });
      } else {
        doc.rect(30, 100, pageWidth / 2 - 60, 200).fill('#CCCCCC');
        doc.fillColor('#666666').fontSize(12).text('Image satellite', 100, 190);
      }

      const dpList = [
        'DP1 : Plan de situation',
        'DP2 : Plan de masse',
        'DP4 : Calepinage',
        'DP5 : Visualisation 3D',
        'DP6 : Insertion du projet',
        'DP7 : Terrain vue de près',
        'DP8 : Terrain vue de loin',
        'DP11 : Note architecturale'
      ];

      doc.fillColor('#1E3A5F').font('Helvetica-Bold').fontSize(10);
      let dpY = 330;
      dpList.forEach(item => {
        doc.fillColor('#1E3A5F').text(item, 30, dpY);
        dpY += 18;
      });

      const rightX = pageWidth / 2 + 20;

      doc.rect(rightX, 40, pageWidth / 2 - 40, 60).fill('#1E3A5F');
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(11).text('PROJET', rightX, 50, { width: pageWidth / 2 - 40, align: 'center' });
      doc.font('Helvetica').fontSize(10).text('Pose de panneaux photovoltaïques', rightX, 70, { width: pageWidth / 2 - 40, align: 'center' });

      doc.rect(rightX, 120, pageWidth / 2 - 40, 60).fill('#1E3A5F');
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(11).text("MAITRE D'OUVRAGE", rightX, 130, { width: pageWidth / 2 - 40, align: 'center' });
      doc.font('Helvetica').fontSize(10).text(clientName, rightX, 155, { width: pageWidth / 2 - 40, align: 'center' });

      doc.rect(rightX, 200, pageWidth / 2 - 40, 80).fill('#1E3A5F');
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(11).text('ADRESSE DU PROJET', rightX, 210, { width: pageWidth / 2 - 40, align: 'center' });
      doc.font('Helvetica').fontSize(9).text(fullAddress, rightX + 10, 235, { width: pageWidth / 2 - 60, align: 'center' });

      doc.rect(rightX, 300, pageWidth / 2 - 40, 40).fill('#1E3A5F');
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(11).text('DOSSIER REALISE PAR', rightX, 315, { width: pageWidth / 2 - 40, align: 'center' });

      const logoY = 360;
      doc.fillColor('#F59E0B').font('Helvetica-Bold').fontSize(28).text('SOLAIRE', rightX + 20, logoY);
      doc.fillColor('#1E3A5F').text('FACILE', rightX + 130, logoY);
      doc.fillColor('#6B7280').font('Helvetica').fontSize(10).text('Votre énergie solaire simplifiée', rightX + 20, logoY + 35);

      doc.addPage();

      const parcelleRef = cadastre ? `Parcelle ${cadastre.numero || '----'} - Section ${cadastre.section || '----'}` : 'Parcelle ---- - Section ----';
      doc.fillColor('#1E3A5F').font('Helvetica-Bold').fontSize(16).text(parcelleRef, margin, 30);

      drawCompassRose(doc, pageWidth - 80, 60, 40);

      if (images.roadmap) doc.image(images.roadmap, margin, 80, { width: pageWidth / 2 - 50, height: 280 });

      if (images.satelliteMedium) {
        doc.image(images.satelliteMedium, pageWidth / 2, 80, { width: pageWidth / 2 - margin, height: 280 });
        doc.circle(pageWidth / 2 + (pageWidth / 2 - margin) / 2, 80 + 140, 30).strokeColor('#FF0000').lineWidth(3).stroke();
      }

      drawDPFooter(doc, pageWidth, pageHeight, 'SOLAIRE FACILE', '1/ 1000 ème', 'DP1 : PLAN DE SITUATION');

      doc.addPage();
      drawCompassRose(doc, pageWidth - 80, 60, 40);
      if (images.satelliteMedium) doc.image(images.satelliteMedium, margin, 60, { width: pageWidth - 2 * margin, height: 400 });
      drawDPFooter(doc, pageWidth, pageHeight, 'SOLAIRE FACILE', '1/ 2000 ème', 'DP1 : PLAN DE SITUATION');

      doc.addPage();
      drawCompassRose(doc, pageWidth - 80, 60, 40);
      if (images.satelliteFar) doc.image(images.satelliteFar, margin, 60, { width: pageWidth - 2 * margin, height: 400 });
      drawDPFooter(doc, pageWidth, pageHeight, 'SOLAIRE FACILE', '1/ 5000 ème', 'DP1 : PLAN DE SITUATION');

      doc.addPage();

      const tableY = 40;
      doc.rect(margin, tableY, pageWidth - 2 * margin, 25).fill('#1E3A5F');
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(12).text('DP4 (FICHE TECHNIQUE)', margin, tableY + 7, { width: pageWidth - 2 * margin, align: 'center' });

      const rows = [
        ['NOM', clientName],
        ['ADRESSE', `${address.components?.number || ''} ${address.components?.street || ''}`],
        ['C.P', address.components?.postalCode || '', 'VILLE', address.components?.city || ''],
        ['TYPE', 'PANNEAUX PHOTOVOLTAÏQUES'],
        ['ORIENTATION DU TOIT', orientation, 'ORIENTATION PANNEAUX', 'PAYSAGE']
      ];

      let rowY = tableY + 25;
      rows.forEach((row) => {
        doc.rect(margin, rowY, pageWidth - 2 * margin, 20).fillAndStroke('#FFFFFF', '#1E3A5F');
        doc.fillColor('#1E3A5F').font('Helvetica').fontSize(9);

        if (row.length === 2) {
          doc.font('Helvetica-Bold').text(row[0], margin + 5, rowY + 6, { width: 100 });
          doc.font('Helvetica').text(row[1], margin + 110, rowY + 6);
        } else if (row.length === 4) {
          doc.font('Helvetica-Bold').text(row[0], margin + 5, rowY + 6, { width: 100 });
          doc.font('Helvetica').text(row[1], margin + 110, rowY + 6, { width: 120 });
          doc.font('Helvetica-Bold').text(row[2], margin + 250, rowY + 6, { width: 120 });
          doc.font('Helvetica').text(row[3], margin + 380, rowY + 6);
        }
        rowY += 20;
      });

      if (images.satelliteClose) {
        doc.image(images.satelliteClose, margin, rowY + 20, { width: pageWidth - 2 * margin, height: 350 });

        const panelW = 30;
        const panelH = 18;
        const startX = pageWidth / 2 - 80;
        const startY = rowY + 120;

        doc.fillColor('#1a1a2e').strokeColor('#333366');
        for (let r = 0; r < Math.min(Math.ceil(panelsCount / 4), 4); r++) {
          for (let c = 0; c < Math.min(4, panelsCount - r * 4); c++) {
            doc.rect(startX + c * (panelW + 3), startY + r * (panelH + 3), panelW, panelH).fillAndStroke();
          }
        }
      }

      doc.fillColor('#1E3A5F').font('Helvetica').fontSize(8);
      doc.text(`${panelsCount} panneaux - ${power} kWc`, margin, rowY + 390);
      doc.text('Distance entre les panneaux = 0.02 m', margin, rowY + 402);

      drawCompassRose(doc, pageWidth - 80, rowY + 380, 35);
      drawDPFooter(doc, pageWidth, pageHeight, 'SOLAIRE FACILE', '1/ --- ème', 'DP4: CALEPINAGE');

      doc.addPage();
      if (images.streetClose) doc.image(images.streetClose, margin, 60, { width: pageWidth - 2 * margin, height: 450 });
      doc.fillColor('#1E3A5F').font('Helvetica').fontSize(10);
      doc.text(`PROJECTION ${orientation} DEPUIS LA RUE`, margin, 520, { width: pageWidth - 2 * margin, align: 'center', underline: true });
      drawDPFooter(doc, pageWidth, pageHeight, 'SOLAIRE FACILE', '1/ --- ème', 'DP7 : TERRAIN DE PRES');

      doc.addPage();
      if (images.streetFar) doc.image(images.streetFar, margin, 60, { width: pageWidth - 2 * margin, height: 450 });
      drawDPFooter(doc, pageWidth, pageHeight, 'SOLAIRE FACILE', '1/ --- ème', 'DP8 : TERRAIN DE LOIN');

      doc.addPage();

      const noteY = 50;
      doc.fillColor('#1E3A5F').font('Helvetica-Bold').fontSize(14);

      doc.text('ETAT DES LIEUX', margin, noteY);
      doc.moveTo(margin, noteY + 18).lineTo(pageWidth - margin, noteY + 18).strokeColor('#F59E0B').lineWidth(2).stroke();

      doc.font('Helvetica').fontSize(10).fillColor('#333333');
      const etatLieux = `Le terrain est situé dans la ville de ${address.components?.city || '---'}.
Il présente une parcelle de référence cadastrale ${cadastre?.section || '---'} - Parcelle ${cadastre?.numero || '---'}
Sur cette parcelle, nous trouvons une toiture orientée ${orientation} adaptée pour l'installation des panneaux photovoltaïques.
La toiture du bâti existant est en ${roofType}.
Il est raccordé aux réseaux d'électricité, d'eau potable, de télécommunication.`;

      doc.text(etatLieux, margin, noteY + 30, { width: pageWidth - 2 * margin, lineGap: 5 });

      doc.font('Helvetica-Bold').fontSize(14).fillColor('#1E3A5F');
      doc.text('PROJET', margin, noteY + 150);
      doc.moveTo(margin, noteY + 168).lineTo(pageWidth - margin, noteY + 168).strokeColor('#F59E0B').lineWidth(2).stroke();

      const surfacePanneaux = Math.round(panelsCount * 1.96 * 10) / 10;
      const projetText = `Installation de panneaux photovoltaïques noirs mats en surimposition à la toiture inclinée du bâtiment orientée ${orientation}.
L'installation couvre une surface totale d'environ ${surfacePanneaux} m², pour une puissance installée de ${power} kWc.
Les panneaux suivent la pente de la toiture sans la modifier.
Les couloirs techniques et les passages sont maintenus afin de garantir la sécurité d'intervention, la ventilation et l'accès des services de secours conformément aux recommandations du SDIS.`;

      doc.font('Helvetica').fontSize(10).fillColor('#333333');
      doc.text(projetText, margin, noteY + 180, { width: pageWidth - 2 * margin, lineGap: 5 });

      doc.font('Helvetica-Bold').fontSize(14).fillColor('#1E3A5F');
      doc.text('SURFACE', margin, noteY + 310);
      doc.moveTo(margin, noteY + 328).lineTo(pageWidth - margin, noteY + 328).strokeColor('#F59E0B').lineWidth(2).stroke();

      const surfaceText = `La superficie totale du terrain est de ${cadastre?.contenance || '---'} m²
La surface de plancher existante est de --- m²
La surface de plancher après projet est de --- m²`;

      doc.font('Helvetica').fontSize(10).fillColor('#333333');
      doc.text(surfaceText, margin, noteY + 340, { width: pageWidth - 2 * margin, lineGap: 5 });

      doc.font('Helvetica-Bold').fontSize(14).fillColor('#1E3A5F');
      doc.text('AUTRES', margin, noteY + 420);
      doc.moveTo(margin, noteY + 438).lineTo(pageWidth - margin, noteY + 438).strokeColor('#F59E0B').lineWidth(2).stroke();

      doc.font('Helvetica').fontSize(10).fillColor('#333333');
      doc.text('Aucun arbre ne sera abattu', margin, noteY + 450);

      drawDPFooter(doc, pageWidth, pageHeight, 'SOLAIRE FACILE', '1/ --- ème', 'DP11 : NOTICE ARCHITECTURALE');

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

function getOrientationText(azimuth) {
  if (azimuth >= 337.5 || azimuth < 22.5) return 'NORD';
  if (azimuth >= 22.5 && azimuth < 67.5) return 'NORD-EST';
  if (azimuth >= 67.5 && azimuth < 112.5) return 'EST';
  if (azimuth >= 112.5 && azimuth < 157.5) return 'SUD-EST';
  if (azimuth >= 157.5 && azimuth < 202.5) return 'SUD';
  if (azimuth >= 202.5 && azimuth < 247.5) return 'SUD-OUEST';
  if (azimuth >= 247.5 && azimuth < 292.5) return 'OUEST';
  if (azimuth >= 292.5 && azimuth < 337.5) return 'NORD-OUEST';
  return 'SUD';
}

function drawCompassRose(doc, x, y, size) {
  doc.save();

  doc.circle(x, y, size).strokeColor('#666666').lineWidth(1).stroke();

  doc.strokeColor('#999999').lineWidth(0.5);
  doc.moveTo(x, y - size + 5).lineTo(x, y + size - 5).stroke();
  doc.moveTo(x - size + 5, y).lineTo(x + size - 5, y).stroke();

  doc.fillColor('#1E3A5F');
  doc.moveTo(x, y - size + 8).lineTo(x - 6, y - 5).lineTo(x + 6, y - 5).closePath().fill();

  doc.font('Helvetica-Bold').fontSize(8).fillColor('#1E3A5F');
  doc.text('N', x - 4, y - size - 5);
  doc.text('S', x - 3, y + size - 2);
  doc.text('E', x + size + 2, y - 4);
  doc.text('O', x - size - 10, y - 4);

  doc.restore();
}

function drawDPFooter(doc, pageWidth, pageHeight, company, scale, title) {
  const footerY = pageHeight - 50;
  const footerHeight = 30;

  doc.moveTo(40, footerY).lineTo(pageWidth - 40, footerY).strokeColor('#CCCCCC').lineWidth(1).stroke();

  const colWidth = (pageWidth - 80) / 3;

  doc.rect(40, footerY + 5, colWidth, footerHeight).strokeColor('#1E3A5F').lineWidth(1).stroke();
  doc.rect(40 + colWidth, footerY + 5, colWidth, footerHeight).stroke();
  doc.rect(40 + 2 * colWidth, footerY + 5, colWidth, footerHeight).stroke();

  doc.fillColor('#1E3A5F').font('Helvetica-Bold').fontSize(10);
  doc.text(company, 40, footerY + 15, { width: colWidth, align: 'center' });
  doc.font('Helvetica').fontSize(9);
  doc.text(scale, 40 + colWidth, footerY + 15, { width: colWidth, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(9);
  doc.text(title, 40 + 2 * colWidth, footerY + 15, { width: colWidth, align: 'center' });
}

module.exports = {
  analyzeAddress,
  generateDPDocument,
  geocodeAddress,
  getSolarData,
  getCadastreData
};
