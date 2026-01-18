const path = require('path');
const fs = require('fs');
const fsPromises = require('fs/promises');
const axios = require('axios');
const esbuild = require('esbuild');

const ENTRY_PATH = path.join(__dirname, 'src', 'dp', 'generator.ts');
const BUNDLE_PATH = path.join(__dirname, '.dp-generator.cjs');
const SOURCE_FILES = [
  'generator.ts',
  'images.ts',
  'overlays.ts',
  'template.ts',
  'geo.ts',
  'ign.ts',
  'cadastre.ts',
].map((file) => path.join(__dirname, 'src', 'dp', file));

async function fileStatSafe(filePath) {
  try {
    return await fsPromises.stat(filePath);
  } catch {
    return null;
  }
}

async function isBundleStale() {
  const bundleStat = await fileStatSafe(BUNDLE_PATH);
  if (!bundleStat) {
    return true;
  }
  const sourceStats = await Promise.all(SOURCE_FILES.map(fileStatSafe));
  return sourceStats.some((stat) => stat && stat.mtimeMs > bundleStat.mtimeMs);
}

async function buildBundle() {
  await esbuild.build({
    entryPoints: [ENTRY_PATH],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node18',
    outfile: BUNDLE_PATH,
    sourcemap: 'inline',
    // Keep heavy natives external; bundle proj4 to avoid runtime missing dependency issues
    external: ['axios', 'pdfkit', 'sharp'],
  });
}

async function loadGenerator() {
  const stale = await isBundleStale();
  if (stale) {
    await buildBundle();
    delete require.cache[BUNDLE_PATH];
  }
  return require(BUNDLE_PATH);
}

async function geocodeAddress(address) {
  const response = await axios.get('https://api-adresse.data.gouv.fr/search/', {
    params: { q: address, limit: 1 },
    timeout: 15000,
  });

  const data = response.data;
  if (!data?.features?.length) {
    return null;
  }

  const feature = data.features[0];
  const [lon, lat] = feature.geometry.coordinates;
  const props = feature.properties || {};

  return {
    lat,
    lon,
    label: props.label || address,
    city: props.city,
    postcode: props.postcode,
    citycode: props.citycode,
  };
}

async function getCadastreInfo(lat, lon) {
  const url = process.env.CADASTRE_API_URL || 'https://apicarto.ign.fr/api/cadastre/parcelle';
  try {
    const response = await axios.get(url, {
      params: {
        geom: JSON.stringify({
          type: 'Point',
          coordinates: [lon, lat],
        }),
      },
      timeout: 20000,
      validateStatus: () => true,
    });

    if (response.status < 200 || response.status >= 300) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const feature = response.data?.features?.[0];
    const props = feature?.properties || {};
    if (!feature) {
      return { success: false, error: 'Parcelle non trouvee' };
    }

    return {
      success: true,
      parcelle: props.numero || '',
      feuille: props.feuille || '',
      section: props.section || '',
      commune: props.nom_com || '',
      codeInsee: props.code_insee || '',
      ref: [props.section, props.numero].filter(Boolean).join(' ') || props.idu || '',
    };
  } catch (error) {
    return { success: false, error: error.message || 'Erreur cadastre' };
  }
}

async function analyzeAddress(address) {
  const geocoded = await geocodeAddress(address);
  if (!geocoded) {
    return { address: null, cadastre: null };
  }

  const cadastre = await getCadastreInfo(geocoded.lat, geocoded.lon);

  return {
    address: {
      formatted: geocoded.label,
      lat: geocoded.lat,
      lon: geocoded.lon,
      city: geocoded.city,
      postcode: geocoded.postcode,
      citycode: geocoded.citycode,
    },
    cadastre: cadastre.success ? cadastre : null,
  };
}

async function generateDPDocument(project, analysis, payload = {}) {
  const generator = await loadGenerator();

  const address =
    payload.address ||
    analysis?.address?.formatted ||
    `${project?.beneficiary?.address?.street || ''}, ${project?.beneficiary?.address?.postalCode || ''} ${project?.beneficiary?.address?.city || ''}`.trim();

  if (!address) {
    throw new Error('Adresse manquante');
  }

  const cadastreViewer =
    payload.cadastre_png_url || payload.cadastre_png_path
      ? { url: payload.cadastre_png_url, path: payload.cadastre_png_path }
      : undefined;

  const options = {
    cover: {
      title: payload.coverTitle,
      installerName: payload.nomSociete || project?.installer?.company || '',
      ownerName: payload.maitreOuvrage || project?.beneficiary?.lastName || '',
      logo: payload.logoBuffer
        ? {
            buffer: payload.logoBuffer,
            width: payload.logoWidth ? Number(payload.logoWidth) : undefined,
            height: payload.logoHeight ? Number(payload.logoHeight) : undefined,
          }
        : undefined,
    },
    project: {
      powerKw: payload.puissanceKwc,
      surfaceM2: payload.surfacePanneaux,
      panelType: payload.panelType,
      roofType: payload.typeCouverture,
      orientation: payload.orientationPanneaux,
      slope: payload.penteToiture,
    },
    cadastreViewer,
  };

  const pdfPath = await generator.generateDpPack(address, options);
  return fsPromises.readFile(pdfPath);
}

module.exports = {
  analyzeAddress,
  generateDPDocument,
  getCadastreInfo,
};
