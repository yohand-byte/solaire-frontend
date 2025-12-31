/**
 * SOLAIRE FACILE - Générateur DP V2
 * Génère automatiquement un dossier de Déclaration Préalable
 * 
 * APIs utilisées:
 * - IGN Géoportail (Ortho, Plan, Cadastre)
 * - Google Street View (DP7/DP8)
 * - Google Geocoding (coordonnées)
 * - API Cadastre IGN (infos parcelle)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  GOOGLE_API_KEY: 'AIzaSyBzJcyMPtHONndrh5EalTIH2ToD_nwBjMQ',
  OUTPUT_DIR: './dp-output'
};

// ============== UTILS ==============

function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    const client = url.startsWith('https') ? https : require('http');
    
    client.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadImage(response.headers.location, filepath).then(resolve).catch(reject);
        return;
      }
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(filepath); });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { resolve(data); }
      });
    }).on('error', reject);
  });
}

// ============== GEOCODING ==============

async function geocodeAddress(address) {
  console.log('📍 Géocodage:', address);
  const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(address)}&limit=1`;
  const data = await httpsGet(url);
  
  if (!data.features || data.features.length === 0) {
    throw new Error('Adresse non trouvée');
  }
  
  const feature = data.features[0];
  return {
    lat: feature.geometry.coordinates[1],
    lng: feature.geometry.coordinates[0],
    label: feature.properties.label,
    city: feature.properties.city,
    postcode: feature.properties.postcode,
    citycode: feature.properties.citycode
  };
}

// ============== CADASTRE ==============

async function getCadastreInfo(lat, lng) {
  console.log('🗺️ Récupération cadastre...');
  const url = `https://apicarto.ign.fr/api/cadastre/parcelle?geom=${encodeURIComponent(JSON.stringify({
    type: 'Point',
    coordinates: [lng, lat]
  }))}`;
  
  try {
    const data = await httpsGet(url);
    if (data.features && data.features.length > 0) {
      const p = data.features[0].properties;
      return {
        section: p.section,
        numero: p.numero,
        feuille: p.feuille || '000',
        contenance: p.contenance,
        commune: p.nom_com
      };
    }
  } catch(e) {
    console.log('⚠️ Cadastre non trouvé, valeurs par défaut');
  }
  
  return { section: 'XX', numero: '0000', feuille: '000', contenance: 0 };
}

// ============== IGN IMAGES ==============

function getIGNUrl(layer, bbox, width, height, format = 'image/png') {
  const [latMin, lngMin, latMax, lngMax] = bbox;
  return `https://data.geopf.fr/wms-r?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=${layer}&STYLES=&CRS=EPSG:4326&BBOX=${latMin},${lngMin},${latMax},${lngMax}&WIDTH=${width}&HEIGHT=${height}&FORMAT=${format}`;
}

async function generateDP1(lat, lng, outputDir) {
  console.log('📄 Génération DP1 - Plans de situation...');
  
  // Échelle 1/1000 (environ 100m)
  const delta1 = 0.0005;
  await downloadImage(
    getIGNUrl('GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2', 
      [lat - delta1, lng - delta1 * 1.5, lat + delta1, lng + delta1 * 1.5], 1200, 800),
    path.join(outputDir, 'dp1-plan-1000.png')
  );
  
  // Échelle 1/2000 (environ 200m)
  const delta2 = 0.001;
  await downloadImage(
    getIGNUrl('GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2',
      [lat - delta2, lng - delta2 * 1.5, lat + delta2, lng + delta2 * 1.5], 1200, 800),
    path.join(outputDir, 'dp1-plan-2000.png')
  );
  
  // Échelle 1/5000 (environ 500m)
  const delta3 = 0.0025;
  await downloadImage(
    getIGNUrl('GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2',
      [lat - delta3, lng - delta3 * 1.5, lat + delta3, lng + delta3 * 1.5], 1200, 800),
    path.join(outputDir, 'dp1-plan-5000.png')
  );
  
  // Ortho avec localisation
  await downloadImage(
    getIGNUrl('ORTHOIMAGERY.ORTHOPHOTOS',
      [lat - delta1, lng - delta1 * 1.5, lat + delta1, lng + delta1 * 1.5], 1200, 800, 'image/jpeg'),
    path.join(outputDir, 'dp1-ortho.jpg')
  );
  
  console.log('   ✅ DP1 généré');
}

async function generateDP2(lat, lng, outputDir) {
  console.log('📄 Génération DP2 - Plan de masse...');
  
  const delta = 0.0003;
  
  // Cadastre seul
  await downloadImage(
    getIGNUrl('CADASTRALPARCELS.PARCELLAIRE_EXPRESS',
      [lat - delta, lng - delta * 1.5, lat + delta, lng + delta * 1.5], 1200, 800),
    path.join(outputDir, 'dp2-cadastre.png')
  );
  
  // Ortho HD pour le fond
  await downloadImage(
    getIGNUrl('ORTHOIMAGERY.ORTHOPHOTOS',
      [lat - delta, lng - delta * 1.5, lat + delta, lng + delta * 1.5], 1200, 800, 'image/jpeg'),
    path.join(outputDir, 'dp2-ortho.jpg')
  );
  
  console.log('   ✅ DP2 généré');
}

async function generateDP4(lat, lng, outputDir) {
  console.log('📄 Génération DP4 - Calepinage (Ortho HD)...');
  
  // Vue très rapprochée du toit
  const delta = 0.00015;
  
  await downloadImage(
    getIGNUrl('ORTHOIMAGERY.ORTHOPHOTOS',
      [lat - delta, lng - delta * 1.5, lat + delta, lng + delta * 1.5], 1200, 800, 'image/jpeg'),
    path.join(outputDir, 'dp4-ortho-hd.jpg')
  );
  
  console.log('   ✅ DP4 généré');
}

async function generateDP7DP8(lat, lng, outputDir) {
  console.log('📄 Génération DP7/DP8 - Street View...');
  
  const baseUrl = 'https://maps.googleapis.com/maps/api/streetview';
  
  // DP7 - Vue de près
  await downloadImage(
    `${baseUrl}?size=1200x800&location=${lat},${lng}&fov=80&pitch=10&key=${CONFIG.GOOGLE_API_KEY}`,
    path.join(outputDir, 'dp7-streetview-pres.jpg')
  );
  
  // DP8 - Vue de loin
  await downloadImage(
    `${baseUrl}?size=1200x800&location=${lat},${lng}&fov=120&pitch=5&key=${CONFIG.GOOGLE_API_KEY}`,
    path.join(outputDir, 'dp8-streetview-loin.jpg')
  );
  
  console.log('   ✅ DP7/DP8 générés');
}

function generateDP11(data) {
  console.log('📄 Génération DP11 - Notice architecturale...');
  
  const azimutToOrientation = (azimut) => {
    if (azimut >= 337.5 || azimut < 22.5) return 'NORD';
    if (azimut >= 22.5 && azimut < 67.5) return 'NORD-EST';
    if (azimut >= 67.5 && azimut < 112.5) return 'EST';
    if (azimut >= 112.5 && azimut < 157.5) return 'SUD-EST';
    if (azimut >= 157.5 && azimut < 202.5) return 'SUD';
    if (azimut >= 202.5 && azimut < 247.5) return 'SUD-OUEST';
    if (azimut >= 247.5 && azimut < 292.5) return 'OUEST';
    return 'NORD-OUEST';
  };
  
  const orientation = azimutToOrientation(data.azimut || 180);
  
  return `
ÉTAT DES LIEUX

Le terrain est situé dans la ville de ${data.city || 'VILLE'}.
Il présente une parcelle de référence cadastrale ${data.feuille || '000'} ${data.section || 'XX'} - Parcelle ${data.numero || '0000'}
Sur cette parcelle, nous trouvons une toiture orientée ${orientation} adaptée pour l'installation des panneaux photovoltaïques.
La toiture du bâti existant est en ${data.materiau || 'Tuiles'}.
Il est raccordé aux réseaux d'électricité, d'eau potable, de télécommunication.

PROJET

Installation de panneaux photovoltaïques noirs mats en surimposition à la toiture inclinée du bâtiment orientée ${orientation}.
L'installation couvre une surface totale d'environ ${data.surfacePanneaux || 'XX'} m², pour une puissance installée de ${data.puissance || 'X'} kWc.
Les panneaux suivent la pente de la toiture sans la modifier.
Les couloirs techniques et les passages sont maintenus afin de garantir la sécurité d'intervention, la ventilation et l'accès des services de secours conformément aux recommandations du SDIS.

SURFACE

La superficie totale du terrain est de ${data.contenance || 'XXX'} m²
La surface de plancher existante est de ${data.surfacePlancher || 'XXX'} m²
La surface de plancher après projet est de ${data.surfacePlancher || 'XXX'} m²

AUTRES

Aucun arbre ne sera abattu
`.trim();
}

// ============== MAIN ==============

async function generateDP(address, options = {}) {
  console.log('═══════════════════════════════════════════════════════');
  console.log('   SOLAIRE FACILE - Générateur DP V2');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`\n📍 Adresse: ${address}\n`);
  
  // Créer dossier output
  const outputDir = path.join(CONFIG.OUTPUT_DIR, Date.now().toString());
  fs.mkdirSync(outputDir, { recursive: true });
  
  try {
    // 1. Géocodage
    const geo = await geocodeAddress(address);
    console.log(`   Coordonnées: ${geo.lat}, ${geo.lng}`);
    console.log(`   Ville: ${geo.city} (${geo.postcode})\n`);
    
    // 2. Cadastre
    const cadastre = await getCadastreInfo(geo.lat, geo.lng);
    console.log(`   Parcelle: ${cadastre.section} ${cadastre.numero}\n`);
    
    // 3. Générer les images
    await generateDP1(geo.lat, geo.lng, outputDir);
    await generateDP2(geo.lat, geo.lng, outputDir);
    await generateDP4(geo.lat, geo.lng, outputDir);
    await generateDP7DP8(geo.lat, geo.lng, outputDir);
    
    // 4. Notice architecturale
    const noticeData = {
      city: geo.city,
      ...cadastre,
      azimut: options.azimut || 180,
      surfacePanneaux: options.surfacePanneaux || 40,
      puissance: options.puissance || 9,
      materiau: options.materiau || 'Tuiles',
      surfacePlancher: options.surfacePlancher || 150
    };
    
    const notice = generateDP11(noticeData);
    fs.writeFileSync(path.join(outputDir, 'dp11-notice.txt'), notice);
    console.log('   ✅ DP11 généré');
    
    // 5. Sauvegarder les métadonnées
    const metadata = {
      address,
      geo,
      cadastre,
      options,
      generatedAt: new Date().toISOString()
    };
    fs.writeFileSync(path.join(outputDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('   ✅ DOSSIER DP GÉNÉRÉ !');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`\n📁 Fichiers dans: ${outputDir}\n`);
    
    // Lister les fichiers
    const files = fs.readdirSync(outputDir);
    files.forEach(f => console.log(`   - ${f}`));
    
    return { success: true, outputDir, metadata };
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    return { success: false, error: error.message };
  }
}

// ============== CLI ==============

if (require.main === module) {
  const address = process.argv[2] || '14 Rue Emile Nicol, 14430 Dozulé';
  
  generateDP(address, {
    puissance: 9,
    surfacePanneaux: 43,
    azimut: 163,
    materiau: 'Tuiles'
  });
}

module.exports = { generateDP };
