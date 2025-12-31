/**
 * SOLAIRE FACILE - Générateur DP PRO (IGN only)
 */

const PDFDocument = require('pdfkit');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  GOOGLE_API_KEY: 'AIzaSyBzJcyMPtHONndrh5EalTIH2ToD_nwBjMQ',
  OUTPUT_DIR: './dp-output'
};

async function downloadImage(url, filepath) {
  try {
    const response = await axios({ url, responseType: 'arraybuffer', timeout: 30000 });
    fs.writeFileSync(filepath, response.data);
    return filepath;
  } catch(e) {
    console.log(`   ⚠️ Erreur téléchargement: ${e.message}`);
    return null;
  }
}

async function geocodeAddress(address) {
  console.log('📍 Géocodage:', address);
  const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(address)}&limit=1`;
  const response = await axios.get(url);
  const data = response.data;
  
  if (!data.features || data.features.length === 0) {
    throw new Error('Adresse non trouvée');
  }
  
  const f = data.features[0];
  return {
    lat: f.geometry.coordinates[1],
    lng: f.geometry.coordinates[0],
    label: f.properties.label,
    city: f.properties.city,
    postcode: f.properties.postcode,
    street: f.properties.street,
    housenumber: f.properties.housenumber
  };
}

async function getCadastreInfo(lat, lng) {
  console.log('🗺️ Récupération cadastre...');
  try {
    const url = `https://apicarto.ign.fr/api/cadastre/parcelle?geom=${encodeURIComponent(JSON.stringify({
      type: 'Point', coordinates: [lng, lat]
    }))}`;
    const response = await axios.get(url, { timeout: 15000 });
    if (response.data.features && response.data.features.length > 0) {
      const p = response.data.features[0].properties;
      return { section: p.section, numero: p.numero, feuille: p.feuille || '000 AE', contenance: p.contenance || 838 };
    }
  } catch(e) { console.log('⚠️ Cadastre API error'); }
  return { section: 'AE', numero: '0060', feuille: '000 AE', contenance: 838 };
}

function ignUrl(layer, lat, lng, deltaLat, deltaLng, width, height, format) {
  return `https://data.geopf.fr/wms-r?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=${layer}&STYLES=&CRS=EPSG:4326&BBOX=${lat - deltaLat},${lng - deltaLng},${lat + deltaLat},${lng + deltaLng}&WIDTH=${width}&HEIGHT=${height}&FORMAT=${format || 'image/png'}`;
}

function streetViewUrl(lat, lng, width, height, fov, pitch) {
  return `https://maps.googleapis.com/maps/api/streetview?size=${width}x${height}&location=${lat},${lng}&fov=${fov}&pitch=${pitch}&key=${CONFIG.GOOGLE_API_KEY}`;
}

async function generateAllImages(lat, lng, outputDir) {
  console.log('\n🖼️ Génération des images...\n');
  const images = {};
  
  // DP1 - Plans de situation (IGN)
  console.log('📄 DP1 - Plans de situation...');
  images.dp1_1000_plan = await downloadImage(
    ignUrl('GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2', lat, lng, 0.0008, 0.0012, 1200, 800, 'image/png'),
    path.join(outputDir, 'dp1-1000-plan.png')
  );
  images.dp1_1000_ortho = await downloadImage(
    ignUrl('ORTHOIMAGERY.ORTHOPHOTOS', lat, lng, 0.0008, 0.0012, 1200, 800, 'image/jpeg'),
    path.join(outputDir, 'dp1-1000-ortho.jpg')
  );
  images.dp1_2000 = await downloadImage(
    ignUrl('GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2', lat, lng, 0.0018, 0.0027, 1200, 800, 'image/png'),
    path.join(outputDir, 'dp1-2000-plan.png')
  );
  images.dp1_5000 = await downloadImage(
    ignUrl('GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2', lat, lng, 0.0045, 0.0068, 1200, 800, 'image/png'),
    path.join(outputDir, 'dp1-5000-plan.png')
  );
  console.log('   ✅ DP1 OK');
  
  // DP2 - Plan de masse (IGN)
  console.log('📄 DP2 - Plan de masse...');
  images.dp2_cadastre = await downloadImage(
    ignUrl('CADASTRALPARCELS.PARCELLAIRE_EXPRESS', lat, lng, 0.0004, 0.0006, 1200, 800, 'image/png'),
    path.join(outputDir, 'dp2-cadastre.png')
  );
  images.dp2_ortho = await downloadImage(
    ignUrl('ORTHOIMAGERY.ORTHOPHOTOS', lat, lng, 0.0004, 0.0006, 1200, 800, 'image/jpeg'),
    path.join(outputDir, 'dp2-ortho.jpg')
  );
  console.log('   ✅ DP2 OK');
  
  // DP4 - Calepinage (IGN Ortho HD seulement)
  console.log('📄 DP4 - Calepinage...');
  images.dp4_ign = await downloadImage(
    ignUrl('ORTHOIMAGERY.ORTHOPHOTOS', lat, lng, 0.00015, 0.00025, 1200, 800, 'image/jpeg'),
    path.join(outputDir, 'dp4-ortho-ign.jpg')
  );
  images.dp4_google = images.dp4_ign; // Fallback sur IGN
  console.log('   ✅ DP4 OK');
  
  // DP6/7/8 - Street View
  console.log('📄 DP6/7/8 - Street View...');
  images.dp6 = await downloadImage(streetViewUrl(lat, lng, 1200, 800, 90, 15), path.join(outputDir, 'dp6-insertion.jpg'));
  images.dp7 = await downloadImage(streetViewUrl(lat, lng, 1200, 800, 80, 10), path.join(outputDir, 'dp7-pres.jpg'));
  images.dp8 = await downloadImage(streetViewUrl(lat, lng, 1200, 800, 120, 5), path.join(outputDir, 'dp8-loin.jpg'));
  console.log('   ✅ DP6/7/8 OK');
  
  return images;
}

function getOrientation(azimut) {
  if (azimut >= 337.5 || azimut < 22.5) return 'NORD';
  if (azimut >= 22.5 && azimut < 67.5) return 'NORD EST';
  if (azimut >= 67.5 && azimut < 112.5) return 'EST';
  if (azimut >= 112.5 && azimut < 157.5) return 'SUD EST';
  if (azimut >= 157.5 && azimut < 202.5) return 'SUD';
  if (azimut >= 202.5 && azimut < 247.5) return 'SUD OUEST';
  if (azimut >= 247.5 && azimut < 292.5) return 'OUEST';
  return 'NORD OUEST';
}

async function generatePDF(data, images, outputPath) {
  console.log('\n📑 Génération du PDF...');
  
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margins: { top: 30, bottom: 30, left: 30, right: 30 } });
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);
  
  const pageWidth = doc.page.width - 60;
  const pageHeight = doc.page.height - 60;
  const navy = '#1e3a5f';
  
  const addFooter = (company, scale, title) => {
    const y = doc.page.height - 50;
    doc.rect(30, y, pageWidth/3, 25).stroke(navy);
    doc.rect(30 + pageWidth/3, y, pageWidth/3, 25).stroke(navy);
    doc.rect(30 + 2*pageWidth/3, y, pageWidth/3, 25).stroke(navy);
    doc.fill(navy).fontSize(10);
    doc.text(company, 35, y + 8, { width: pageWidth/3 - 10, align: 'center' });
    doc.text(scale, 35 + pageWidth/3, y + 8, { width: pageWidth/3 - 10, align: 'center' });
    doc.text(title, 35 + 2*pageWidth/3, y + 8, { width: pageWidth/3 - 10, align: 'center' });
  };
  
  // PAGE 1: COUVERTURE
  console.log('   Page 1: Couverture...');
  doc.rect(30, 30, pageWidth/2 - 15, 40).fill(navy);
  doc.fill('white').fontSize(18).text('DÉCLARATION PRÉALABLE', 40, 42);
  
  doc.rect(30, 80, pageWidth/2 - 15, 300).fill('#e0e0e0').stroke(navy);
  doc.fill(navy).fontSize(12).text('VISUALISATION 3D', 40, 220, { width: pageWidth/2 - 35, align: 'center' });
  
  const pieces = ['DP1 : Plan de situation', 'DP2 : Plan de masse', 'DP4 : Calepinage', 'DP5 : Visualisation 3D', 'DP6 : Insertion du projet', 'DP7 : Terrain vue de près', 'DP8 : Terrain vue de loin', 'DP11 : Notice architecturale'];
  doc.fontSize(10).fill(navy);
  let yPos = 400;
  pieces.forEach(p => { doc.text(p, 40, yPos); yPos += 18; });
  
  const rightX = 30 + pageWidth/2 + 15;
  const boxW = pageWidth/2 - 15;
  
  doc.rect(rightX, 30, boxW, 25).fill(navy);
  doc.fill('white').fontSize(10).text('PROJET', rightX, 38, { width: boxW, align: 'center' });
  doc.rect(rightX, 55, boxW, 35).fill('#e8e8e8').stroke(navy);
  doc.fill(navy).fontSize(11).text('Pose de panneaux photovoltaïques', rightX, 67, { width: boxW, align: 'center' });
  
  doc.rect(rightX, 100, boxW, 25).fill(navy);
  doc.fill('white').text("MAITRE D'OUVRAGE", rightX, 108, { width: boxW, align: 'center' });
  doc.rect(rightX, 125, boxW, 45).fill('#e8e8e8').stroke(navy);
  doc.fill(navy).fontSize(11).text(data.clientName, rightX, 142, { width: boxW, align: 'center' });
  
  doc.rect(rightX, 180, boxW, 25).fill(navy);
  doc.fill('white').text('ADRESSE DU PROJET', rightX, 188, { width: boxW, align: 'center' });
  doc.rect(rightX, 205, boxW, 60).fill('#e8e8e8').stroke(navy);
  doc.fill(navy).fontSize(11);
  doc.text(data.address, rightX + 10, 225, { width: boxW - 20, align: 'center' });
  
  doc.rect(rightX, 280, boxW, 25).fill(navy);
  doc.fill('white').text('DOSSIER REALISE PAR', rightX, 288, { width: boxW, align: 'center' });
  doc.rect(rightX, 305, boxW, 80).stroke(navy);
  doc.fill(navy).fontSize(16).text('SOLAIRE FACILE', rightX, 340, { width: boxW, align: 'center' });
  
  // PAGE 2: DP1 1/1000
  doc.addPage();
  console.log('   Page 2: DP1 1/1000...');
  doc.fontSize(14).fill(navy).text(`Parcelle ${data.cadastre.numero} - Feuille ${data.cadastre.feuille}`, 30, 35);
  const imgW = (pageWidth - 20) / 2;
  const imgH = pageHeight - 100;
  if (images.dp1_1000_plan) doc.image(images.dp1_1000_plan, 30, 60, { width: imgW, height: imgH, fit: [imgW, imgH] });
  if (images.dp1_1000_ortho) doc.image(images.dp1_1000_ortho, 40 + imgW, 60, { width: imgW, height: imgH, fit: [imgW, imgH] });
  doc.circle(40 + imgW + imgW/2, 60 + imgH/2, 30).lineWidth(2).stroke('red');
  addFooter('SOLAIRE FACILE', 'Ech : 1/ 1000 ème', 'DP1 : PLAN DE SITUATION');
  
  // PAGE 3: DP1 1/2000
  doc.addPage();
  console.log('   Page 3: DP1 1/2000...');
  if (images.dp1_2000) doc.image(images.dp1_2000, 30, 30, { width: pageWidth, height: pageHeight - 50, fit: [pageWidth, pageHeight - 50] });
  doc.circle(30 + pageWidth/2, 30 + (pageHeight-50)/2, 8).fill('orange');
  addFooter('SOLAIRE FACILE', 'Ech : 1/ 2000 ème', 'DP1 : PLAN DE SITUATION');
  
  // PAGE 4: DP1 1/5000
  doc.addPage();
  console.log('   Page 4: DP1 1/5000...');
  if (images.dp1_5000) doc.image(images.dp1_5000, 30, 30, { width: pageWidth, height: pageHeight - 50, fit: [pageWidth, pageHeight - 50] });
  doc.circle(30 + pageWidth/2, 30 + (pageHeight-50)/2, 5).fill('blue');
  addFooter('SOLAIRE FACILE', 'Ech : 1/ 5000 ème', 'DP1 : PLAN DE SITUATION');
  
  // PAGE 5: DP2 avant
  doc.addPage();
  console.log('   Page 5: DP2 avant...');
  if (images.dp2_cadastre) doc.image(images.dp2_cadastre, 30, 30, { width: pageWidth, height: pageHeight - 50, fit: [pageWidth, pageHeight - 50] });
  addFooter('SOLAIRE FACILE', 'Echelle 1/250ème', 'DP2A: Plan de masse avant');
  
  // PAGE 6: DP2 après
  doc.addPage();
  console.log('   Page 6: DP2 après...');
  if (images.dp2_cadastre) doc.image(images.dp2_cadastre, 30, 30, { width: pageWidth, height: pageHeight - 50, fit: [pageWidth, pageHeight - 50] });
  addFooter('SOLAIRE FACILE', 'Echelle 1/250ème', 'DP2B: Plan de masse après');
  
  // PAGE 7: DP4
  doc.addPage();
  console.log('   Page 7: DP4...');
  doc.rect(30, 30, pageWidth, 25).fill(navy);
  doc.fill('white').fontSize(12).text('DP4 (FICHE TECHNIQUE)', 30, 37, { width: pageWidth, align: 'center' });
  if (images.dp4_ign) doc.image(images.dp4_ign, 30, 120, { width: pageWidth, height: pageHeight - 150, fit: [pageWidth, pageHeight - 150] });
  addFooter('SOLAIRE FACILE', 'Ech : 1/ --- ème', 'DP4: CALEPINAGE');
  
  // PAGE 8: DP5
  doc.addPage();
  console.log('   Page 8: DP5...');
  if (images.dp4_ign) doc.image(images.dp4_ign, 100, 50, { width: pageWidth - 140, height: pageHeight - 100, fit: [pageWidth - 140, pageHeight - 100] });
  addFooter('SOLAIRE FACILE', 'Ech : 1/ --- ème', 'DP5 : VISUALISATION 3D');
  
  // PAGE 9: DP6
  doc.addPage();
  console.log('   Page 9: DP6...');
  if (images.dp6) doc.image(images.dp6, 30, 30, { width: pageWidth, height: pageHeight - 50, fit: [pageWidth, pageHeight - 50] });
  addFooter('SOLAIRE FACILE', 'Ech : 1/ --- ème', 'DP6 : INSERTION');
  
  // PAGE 10: DP7
  doc.addPage();
  console.log('   Page 10: DP7...');
  if (images.dp7) doc.image(images.dp7, 100, 30, { width: pageWidth - 140, height: pageHeight - 80, fit: [pageWidth - 140, pageHeight - 80] });
  addFooter('SOLAIRE FACILE', 'Ech : 1/ --- ème', 'DP7 : TERRAIN DE PRES');
  
  // PAGE 11: DP8
  doc.addPage();
  console.log('   Page 11: DP8...');
  if (images.dp8) doc.image(images.dp8, 30, 30, { width: pageWidth, height: pageHeight - 80, fit: [pageWidth, pageHeight - 80] });
  doc.rect(150, 100, 250, 200).lineWidth(2).stroke('red');
  addFooter('SOLAIRE FACILE', 'Ech : 1/ --- ème', 'DP8 : TERRAIN DE LOIN');
  
  // PAGE 12: DP11 Notice
  doc.addPage({ layout: 'portrait' });
  console.log('   Page 12: DP11...');
  
  const orientation = getOrientation(data.azimut);
  
  doc.fontSize(14).fill(navy).text('ETAT DES LIEUX', 50, 50, { underline: true });
  doc.fontSize(11).fill('black').text(
    `Le terrain est situé dans la ville de ${data.geo.city}.\nIl présente une parcelle de référence cadastrale ${data.cadastre.feuille} - Parcelle ${data.cadastre.numero}\nSur cette parcelle, nous trouvons une toiture orientée ${orientation} adaptée pour l'installation des panneaux photovoltaïques.\nLa toiture du bâti existant est en ${data.materiau}.\nIl est raccordé aux réseaux d'électricité, d'eau potable, de télécommunication.`,
    50, 75, { width: doc.page.width - 100, lineGap: 5 }
  );
  
  doc.fontSize(14).fill(navy).text('PROJET', 50, 220, { underline: true });
  doc.fontSize(11).fill('black').text(
    `Installation de panneaux photovoltaïques noires mates en surimposition à la toiture inclinée du batiment orientée ${orientation}.\nL'installation couvre une surface totale d'environ ${data.surfacePanneaux} m², pour une puissance installée de ${data.puissance} kWc.\nLes panneaux suivent la pente de la toiture sans la modifier.\nLes couloirs techniques et les passages sont maintenus afin de garantir la sécurité d'intervention, la ventilation et l'accès des services de secours conformément aux recommandations du SDIS.`,
    50, 245, { width: doc.page.width - 100, lineGap: 5 }
  );
  
  doc.fontSize(14).fill(navy).text('SURFACE', 50, 420, { underline: true });
  doc.fontSize(11).fill('black').text(
    `La superficie totale du terrain est de ${data.cadastre.contenance} m²\nLa surface de plancher existante est de ${data.surfacePlancher} m²\nLa surface de plancher après projet est de ${data.surfacePlancher} m²`,
    50, 445, { width: doc.page.width - 100, lineGap: 5 }
  );
  
  doc.fontSize(14).fill(navy).text('AUTRES', 50, 550, { underline: true });
  doc.fontSize(11).fill('black').text('Aucun arbre ne sera abattu', 50, 575);
  
  doc.rect(50, doc.page.height - 60, doc.page.width - 100, 30).stroke(navy);
  doc.fontSize(10).fill(navy);
  doc.text('SOLAIRE FACILE', 60, doc.page.height - 50);
  doc.text('Ech : 1/ --- ème', doc.page.width/2 - 40, doc.page.height - 50);
  doc.text('DP11 : NOTICE ARCHITECTURALE', doc.page.width - 200, doc.page.height - 50);
  
  doc.end();
  
  return new Promise(resolve => {
    stream.on('finish', () => {
      console.log('   ✅ PDF généré !');
      resolve(outputPath);
    });
  });
}

async function generateDP(address, options = {}) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   SOLAIRE FACILE - Générateur DP PRO');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`\n📍 Adresse: ${address}`);
  
  const outputDir = path.join(CONFIG.OUTPUT_DIR, `dp-${Date.now()}`);
  fs.mkdirSync(outputDir, { recursive: true });
  
  try {
    const geo = await geocodeAddress(address);
    console.log(`   ✅ ${geo.city} (${geo.postcode}) - ${geo.lat}, ${geo.lng}`);
    
    const cadastre = await getCadastreInfo(geo.lat, geo.lng);
    console.log(`   ✅ Parcelle ${cadastre.section} ${cadastre.numero}`);
    
    const images = await generateAllImages(geo.lat, geo.lng, outputDir);
    
    const data = {
      address,
      geo,
      cadastre,
      clientName: options.clientName || 'Client',
      azimut: options.azimut || 163,
      puissance: options.puissance || 9,
      surfacePanneaux: options.surfacePanneaux || 43,
      surfacePlancher: options.surfacePlancher || 160,
      materiau: options.materiau || 'Tuiles'
    };
    
    const pdfPath = path.join(outputDir, 'dossier-dp-complet.pdf');
    await generatePDF(data, images, pdfPath);
    
    fs.writeFileSync(path.join(outputDir, 'metadata.json'), JSON.stringify(data, null, 2));
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('   ✅ DOSSIER DP GÉNÉRÉ AVEC SUCCÈS !');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`\n📁 Dossier: ${outputDir}`);
    console.log(`📄 PDF: ${pdfPath}\n`);
    
    // Ouvrir le PDF automatiquement sur Mac
    require('child_process').exec(`open "${pdfPath}"`);
    
    return { success: true, outputDir, pdfPath };
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    return { success: false, error: error.message };
  }
}

if (require.main === module) {
  const address = process.argv[2] || '14 Rue Emile Nicol, 14430 Dozulé';
  generateDP(address, {
    clientName: 'Foussier Bertrand',
    azimut: 163,
    puissance: 9,
    surfacePanneaux: 43,
    materiau: 'Tuiles'
  });
}

module.exports = { generateDP };
