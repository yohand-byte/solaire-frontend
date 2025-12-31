import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import PDFDocument from 'pdfkit';
import sharp from 'sharp';

import { getParcelRef } from './cadastre';
import { geocodeAddress, toLambert93 } from './geo';
import {
  generateDp1Maps,
  generateDp1Overlays,
  generateDp2Cadastre,
  generateDp5,
  generateDp6,
  generateDp7Dp8,
  generateIgnMap,
} from './images';
import type { Dp1ManualOverlayOptions } from './images';
import {
  addDp1Overlays,
  overlaySvgsOnImage,
  svgLegendBox,
  svgPanelRects,
} from './overlays';
import {
  drawFrame,
  drawFooterTriptych,
  drawKeyValueTable,
  drawLabelBox,
  drawTopTitle,
  registerFonts,
  setBodyFont,
  setBoldFont,
  FRAME_MARGIN_PT,
  PAGE_HEIGHT_PT,
  PAGE_WIDTH_PT,
  ptToMm,
} from './template';

export type DpOptions = {
  outputDir?: string;
  dpi?: number;
  overlays?: {
    dp1?: Dp1ManualOverlayOptions;
  };
  cover?: {
    title?: string;
    installerName?: string;
    ownerName?: string;
    logo?: {
      buffer: Buffer;
      width?: number;
      height?: number;
    };
  };
  project?: {
    powerKw?: number | string;
    surfaceM2?: number | string;
    panelType?: string;
    roofType?: string;
    orientation?: string;
    slope?: string;
  };
};

export type DpAssets = {
  dp1: {
    plan1000: string;
    ortho1000: string;
    plan2000: string;
    plan5000: string;
  };
  dp2: {
    avant: string;
    apres: string;
  };
  dp4: {
    ortho: string;
  };
  dp5: {
    ortho: string;
  };
  dp6: {
    view: string;
  };
  dp7: {
    view: string;
  };
  dp8: {
    view: string;
  };
};

const CONTENT_LEFT = FRAME_MARGIN_PT + 20;
const CONTENT_RIGHT = PAGE_WIDTH_PT - FRAME_MARGIN_PT - 20;
const CONTENT_TOP = FRAME_MARGIN_PT + 70;
const CONTENT_BOTTOM = PAGE_HEIGHT_PT - FRAME_MARGIN_PT - 40;
const CONTENT_WIDTH = CONTENT_RIGHT - CONTENT_LEFT;
const CONTENT_HEIGHT = CONTENT_BOTTOM - CONTENT_TOP;

const DP1_GAP = 16;
const DP1_MAP_HEIGHT = 420;
const DP1_MAP_WIDTH = (CONTENT_WIDTH - DP1_GAP) / 2;

const DP1_SINGLE_HEIGHT = 560;
const DP1_SINGLE_WIDTH = CONTENT_WIDTH;

const DP2_MAP_HEIGHT = 380;
const DP5_MAP_HEIGHT = 380;
const DP6_MAP_HEIGHT = 420;
const DP7_MAP_HEIGHT = 420;

const DP4_ROOF_WIDTH = 180;
const DP4_ROOF_HEIGHT = 180;

const DEFAULT_DPI = 300;

function ensureDir(dirPath: string): Promise<void> {
  return fsPromises.mkdir(dirPath, { recursive: true });
}

function drawImageBox(doc: PDFDocument, imagePath: string, x: number, y: number, width: number, height: number): void {
  doc
    .rect(x, y, width, height)
    .lineWidth(0.6)
    .strokeColor('#D1D5DB')
    .stroke();

  doc.image(imagePath, x, y, { width, height });
}

function renderCoverPage(
  doc: PDFDocument,
  title: string,
  address: string,
  cover?: DpOptions['cover']
): void {
  drawFrame(doc);
  drawTopTitle(doc, 'DECLARATION PREALABLE');

  if (cover?.logo?.buffer) {
    const logoWidth = cover.logo.width || 140;
    const logoHeight = cover.logo.height || 60;
    const logoX = CONTENT_LEFT;
    const logoY = FRAME_MARGIN_PT + 28;
    try {
      doc.image(cover.logo.buffer, logoX, logoY, {
        fit: [logoWidth, logoHeight],
        align: 'left',
        valign: 'center',
      });
    } catch {
      // Ignore invalid logo buffers.
    }
  }

  setBoldFont(doc, 18);
  doc.text(title, 0, CONTENT_TOP + 10, { align: 'center', width: PAGE_WIDTH_PT });

  setBodyFont(doc, 11);
  doc.text(address, 0, CONTENT_TOP + 45, { align: 'center', width: PAGE_WIDTH_PT });

  if (cover?.installerName || cover?.ownerName) {
    const lines = [
      cover.installerName ? `Installateur : ${cover.installerName}` : null,
      cover.ownerName ? `Maitre d'ouvrage : ${cover.ownerName}` : null,
    ].filter(Boolean);
    if (lines.length) {
      setBodyFont(doc, 10);
      doc.text(lines.join('\n'), 0, CONTENT_TOP + 65, { align: 'center', width: PAGE_WIDTH_PT });
    }
  }

  doc
    .lineWidth(0.8)
    .strokeColor('#D1D5DB')
    .moveTo(CONTENT_LEFT + 40, CONTENT_TOP + 90)
    .lineTo(CONTENT_RIGHT - 40, CONTENT_TOP + 90)
    .stroke();

  setBoldFont(doc, 12);
  doc.text('Sommaire', CONTENT_LEFT, CONTENT_TOP + 110, { width: CONTENT_WIDTH });

  setBodyFont(doc, 10);
  const sommaire = [
    'DP1 - Plan de situation (1/1000)',
    'DP1 - Plan de situation (1/2000)',
    'DP1 - Plan de situation (1/5000)',
    'DP2 - Plan de masse (Avant)',
    'DP2 - Plan de masse (Apres)',
    'DP4 - Fiche technique',
    'DP5 - Insertion graphique',
    'DP6 - Insertion photographique',
    'DP7 - Photographie proche',
    'DP8 - Photographie lointaine',
    'DP11 - Notice descriptive',
  ];

  sommaire.forEach((item, index) => {
    doc.text(`${index + 1}. ${item}`, CONTENT_LEFT, CONTENT_TOP + 135 + index * 18, {
      width: CONTENT_WIDTH,
    });
  });

  drawFooterTriptych(doc, { left: 'QUALIWATT', center: 'Dossier DP', right: 'COUVERTURE' });
}

function renderDp1Page(
  doc: PDFDocument,
  title: string,
  scaleLabel: string,
  leftImage: string,
  rightImage?: string
): void {
  drawFrame(doc);
  drawTopTitle(doc, title);
  drawFooterTriptych(doc, { left: 'QUALIWATT', center: `Echelle ${scaleLabel}`, right: 'DP1' });

  const mapY = CONTENT_TOP + 30;

  if (rightImage) {
    drawLabelBox(doc, 'Plan', CONTENT_LEFT, mapY - 22, DP1_MAP_WIDTH);
    drawLabelBox(doc, 'Orthophoto', CONTENT_LEFT + DP1_MAP_WIDTH + DP1_GAP, mapY - 22, DP1_MAP_WIDTH);

    drawImageBox(doc, leftImage, CONTENT_LEFT, mapY, DP1_MAP_WIDTH, DP1_MAP_HEIGHT);
    drawImageBox(doc, rightImage, CONTENT_LEFT + DP1_MAP_WIDTH + DP1_GAP, mapY, DP1_MAP_WIDTH, DP1_MAP_HEIGHT);
  } else {
    drawImageBox(doc, leftImage, CONTENT_LEFT, mapY, DP1_SINGLE_WIDTH, DP1_SINGLE_HEIGHT);
  }
}

function renderDp2Page(doc: PDFDocument, title: string, scaleLabel: string, imagePath: string): void {
  drawFrame(doc);
  drawTopTitle(doc, title);
  drawFooterTriptych(doc, { left: 'QUALIWATT', center: `Echelle ${scaleLabel}`, right: 'DP2' });

  const mapY = CONTENT_TOP + 30;
  drawImageBox(doc, imagePath, CONTENT_LEFT, mapY, CONTENT_WIDTH, DP2_MAP_HEIGHT);

  drawLabelBox(doc, 'Parcelle', CONTENT_LEFT + 10, mapY + 12, 100);
  drawLabelBox(doc, 'Implantation', CONTENT_LEFT + 10, mapY + 38, 120);
}

function renderDp4Page(
  doc: PDFDocument,
  data: {
    address: string;
    parcelRef: string;
    powerKw: string;
    surfaceM2: string;
    panelType: string;
    roofType: string;
    orientation: string;
    slope: string;
  },
  orthoPath?: string
): void {
  drawFrame(doc);
  drawTopTitle(doc, 'DP4 - FICHE TECHNIQUE');
  drawFooterTriptych(doc, { left: 'QUALIWATT', center: 'Echelle 1/250', right: 'DP4' });

  const tableX = CONTENT_LEFT;
  const tableY = CONTENT_TOP + 10;
  const tableWidth = 310;

  setBodyFont(doc, 10);
  doc.text('Caracteristiques du projet', tableX, tableY - 18);

  drawKeyValueTable(doc, tableX, tableY, tableWidth, [
    { label: 'Adresse', value: data.address },
    { label: 'Parcelle', value: data.parcelRef },
    { label: 'Puissance', value: data.powerKw },
    { label: 'Surface panneaux', value: data.surfaceM2 },
    { label: 'Type panneaux', value: data.panelType },
    { label: 'Type toiture', value: data.roofType },
    { label: 'Orientation', value: data.orientation },
    { label: 'Pente', value: data.slope },
  ]);

  const imageX = tableX + tableWidth + 30;
  const imageY = tableY;
  drawLabelBox(doc, 'Vue toiture', imageX, imageY - 22, DP4_ROOF_WIDTH);

  if (orthoPath) {
    drawImageBox(doc, orthoPath, imageX, imageY, DP4_ROOF_WIDTH, DP4_ROOF_HEIGHT);
  } else {
    doc
      .rect(imageX, imageY, DP4_ROOF_WIDTH, DP4_ROOF_HEIGHT)
      .lineWidth(0.6)
      .strokeColor('#D1D5DB')
      .stroke();
  }
}

function renderDp5Page(doc: PDFDocument, imagePath: string): void {
  drawFrame(doc);
  drawTopTitle(doc, 'DP5 - INSERTION GRAPHIQUE');
  drawFooterTriptych(doc, { left: 'QUALIWATT', center: 'Echelle 1/500', right: 'DP5' });

  const mapY = CONTENT_TOP + 30;
  drawImageBox(doc, imagePath, CONTENT_LEFT, mapY, CONTENT_WIDTH, DP5_MAP_HEIGHT);
}

function renderDp6Page(doc: PDFDocument, imagePath: string): void {
  drawFrame(doc);
  drawTopTitle(doc, 'DP6 - INSERTION PHOTOGRAPHIQUE');
  drawFooterTriptych(doc, { left: 'QUALIWATT', center: 'Vue terrain', right: 'DP6' });

  const mapY = CONTENT_TOP + 30;
  drawImageBox(doc, imagePath, CONTENT_LEFT, mapY, CONTENT_WIDTH, DP6_MAP_HEIGHT);
}

function renderDp7Page(doc: PDFDocument, imagePath: string): void {
  drawFrame(doc);
  drawTopTitle(doc, 'DP7 - PHOTOGRAPHIE PROCHE');
  drawFooterTriptych(doc, { left: 'QUALIWATT', center: 'Vue terrain', right: 'DP7' });

  const mapY = CONTENT_TOP + 30;
  drawImageBox(doc, imagePath, CONTENT_LEFT, mapY, CONTENT_WIDTH, DP7_MAP_HEIGHT);
}

function renderDp8Page(doc: PDFDocument, imagePath: string): void {
  drawFrame(doc);
  drawTopTitle(doc, 'DP8 - PHOTOGRAPHIE LOINTAINE');
  drawFooterTriptych(doc, { left: 'QUALIWATT', center: 'Vue terrain', right: 'DP8' });

  const mapY = CONTENT_TOP + 30;
  drawImageBox(doc, imagePath, CONTENT_LEFT, mapY, CONTENT_WIDTH, DP7_MAP_HEIGHT);
}

function renderDp7Dp8Page(doc: PDFDocument, dp7Path: string, dp8Path: string): void {
  drawFrame(doc);
  drawTopTitle(doc, 'DP7/DP8 - PHOTOGRAPHIES');
  drawFooterTriptych(doc, { left: 'QUALIWATT', center: 'Vues terrain', right: 'DP7-8' });

  const mapY = CONTENT_TOP + 24;
  const halfHeight = Math.round(DP7_MAP_HEIGHT * 0.48);

  drawLabelBox(doc, 'DP7 - Vue de près', CONTENT_LEFT, mapY - 18, CONTENT_WIDTH);
  drawImageBox(doc, dp7Path, CONTENT_LEFT, mapY, CONTENT_WIDTH, halfHeight);

  const secondY = mapY + halfHeight + 26;
  drawLabelBox(doc, 'DP8 - Vue de loin', CONTENT_LEFT, secondY - 18, CONTENT_WIDTH);
  drawImageBox(doc, dp8Path, CONTENT_LEFT, secondY, CONTENT_WIDTH, halfHeight);
}

function renderDp11Page(doc: PDFDocument, noticeText: string): void {
  drawFrame(doc);
  drawTopTitle(doc, 'DP11 - NOTICE DESCRIPTIVE');
  drawFooterTriptych(doc, { left: 'QUALIWATT', center: 'Notice', right: 'DP11' });

  const textX = CONTENT_LEFT;
  const textY = CONTENT_TOP + 10;
  const textWidth = CONTENT_WIDTH;

  setBodyFont(doc, 10.5);
  doc.text(noticeText, textX, textY, { width: textWidth, align: 'justify' });
}

function buildNoticeText(data: { city: string; parcelRef: string; orientation: string }): string {
  return [
    'ETAT DES LIEUX',
    '',
    `Le terrain est situe dans la ville de ${data.city}.`,
    `Il presente une parcelle de reference cadastrale ${data.parcelRef}.`,
    `La toiture du bati existant est adaptee pour une installation orientee ${data.orientation}.`,
    '',
    'PROJET',
    '',
    'Installation de panneaux photovoltaiques noirs mats en surimposition a la toiture.',
    'Les panneaux suivent la pente de la toiture sans la modifier.',
    'Les couloirs techniques et les passages sont maintenus.',
    '',
    'AUTRES',
    '',
    'Aucun arbre ne sera abattu.',
  ].join('\n');
}

function formatKw(value: number | string | undefined, fallback: string): string {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  if (typeof value === 'number') {
    return `${value} kWc`;
  }
  return value;
}

function formatSurface(value: number | string | undefined, fallback: string): string {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  if (typeof value === 'number') {
    return `${value} m2`;
  }
  return value;
}

async function addPanelsOverlay(basePath: string, outPath: string): Promise<string> {
  const meta = await sharp(basePath).metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;

  const panelWidth = Math.round(width * 0.08);
  const panelHeight = Math.round(height * 0.045);
  const startX = Math.round(width * 0.4);
  const startY = Math.round(height * 0.42);

  const panels = [
    { x: startX, y: startY, width: panelWidth, height: panelHeight },
    { x: startX + panelWidth + 12, y: startY, width: panelWidth, height: panelHeight },
    { x: startX + (panelWidth + 12) * 2, y: startY, width: panelWidth, height: panelHeight },
  ];

  const overlays = [
    { svg: svgPanelRects(width, height, panels) },
    {
      svg: svgLegendBox(
        width,
        height,
        Math.round(width * 0.06),
        Math.round(height * 0.08),
        200,
        28,
        'Panneaux photovoltaiques'
      ),
    },
  ];

  await overlaySvgsOnImage(basePath, overlays, outPath);
  return outPath;
}

export async function generateDpPack(address: string, options: DpOptions = {}): Promise<string> {
  const dpi = options.dpi || DEFAULT_DPI;
  const timestamp = Date.now().toString();
  const outputDir = options.outputDir || path.resolve(process.cwd(), 'dp-output', timestamp);

  await ensureDir(outputDir);

  const geocoded = await geocodeAddress(address);
  const center = toLambert93({ lat: geocoded.lat, lon: geocoded.lon });
  const parcelInfo = await getParcelRef(geocoded.lat, geocoded.lon, geocoded.citycode);
  const parcelRef = parcelInfo?.ref || 'XX 0000';

  const dp1Frames = {
    frame1000: { widthMm: ptToMm(DP1_MAP_WIDTH), heightMm: ptToMm(DP1_MAP_HEIGHT) },
    frame2000: { widthMm: ptToMm(DP1_SINGLE_WIDTH), heightMm: ptToMm(DP1_SINGLE_HEIGHT) },
    frame5000: { widthMm: ptToMm(DP1_SINGLE_WIDTH), heightMm: ptToMm(DP1_SINGLE_HEIGHT) },
  };

  const dp1Maps = await generateDp1Maps(center, outputDir, dp1Frames, dpi);
  const dp1Overlays = await generateDp1Overlays(dp1Maps, outputDir, options.overlays?.dp1);

  const dp1Plan2000Overlay = path.join(outputDir, 'dp1-plan-2000-overlay.png');
  const dp1Plan5000Overlay = path.join(outputDir, 'dp1-plan-5000-overlay.png');
  await addDp1Overlays(dp1Maps.plan2000, dp1Plan2000Overlay);
  await addDp1Overlays(dp1Maps.plan5000, dp1Plan5000Overlay);

  const dp2Frame = { widthMm: ptToMm(CONTENT_WIDTH), heightMm: ptToMm(DP2_MAP_HEIGHT) };
  const dp2Base = await generateDp2Cadastre(center, outputDir, dp2Frame, 250, dpi);
  const dp2Apres = path.join(outputDir, 'dp2-apres.png');
  await addPanelsOverlay(dp2Base.avant, dp2Apres);

  const dp4Frame = { widthMm: ptToMm(DP4_ROOF_WIDTH), heightMm: ptToMm(DP4_ROOF_HEIGHT) };
  const dp4Ortho = path.join(outputDir, 'dp4-ortho-roof.jpg');
  await generateIgnMap({
    center,
    scale: 200,
    frame: dp4Frame,
    dpi,
    layer: 'ORTHOIMAGERY.ORTHOPHOTOS',
    format: 'image/jpeg',
    outPath: dp4Ortho,
  });

  const dp5Frame = { widthMm: ptToMm(CONTENT_WIDTH), heightMm: ptToMm(DP5_MAP_HEIGHT) };
  const dp5Image = await generateDp5(center, outputDir, dp5Frame, 500, dpi);

  const dp6Image = await generateDp6(geocoded.lat, geocoded.lon, outputDir);
  const dp7dp8 = await generateDp7Dp8(geocoded.lat, geocoded.lon, outputDir);

  const assets: DpAssets = {
    dp1: {
      plan1000: dp1Overlays.plan1000,
      ortho1000: dp1Overlays.ortho1000,
      plan2000: dp1Plan2000Overlay,
      plan5000: dp1Plan5000Overlay,
    },
    dp2: {
      avant: dp2Base.avant,
      apres: dp2Apres,
    },
    dp4: {
      ortho: dp4Ortho,
    },
    dp5: {
      ortho: dp5Image,
    },
    dp6: {
      view: dp6Image,
    },
    dp7: {
      view: dp7dp8.dp7,
    },
    dp8: {
      view: dp7dp8.dp8,
    },
  };

  const pdfPath = path.join(outputDir, 'dp-qualiwatt.pdf');
  const doc = new PDFDocument({ autoFirstPage: false });
  const pdfStream = fs.createWriteStream(pdfPath);

  registerFonts(doc);
  doc.pipe(pdfStream);

  const addPage = (): void => {
    doc.addPage({ size: 'A4', layout: 'landscape', margin: 0 });
  };

  const coverTitle = options.cover?.title || 'Installation photovoltaique';
  const installerName = options.cover?.installerName;
  const ownerName = options.cover?.ownerName;

  const powerKw = formatKw(options.project?.powerKw, '9 kWc');
  const surfaceM2 = formatSurface(options.project?.surfaceM2, '40 m2');
  const panelType = options.project?.panelType || 'Noirs mats';
  const roofType = options.project?.roofType || 'Tuiles';
  const orientation = options.project?.orientation || 'Sud';
  const slope = options.project?.slope || '30 degres';

  addPage();
  renderCoverPage(doc, coverTitle, geocoded.label, {
    logo: options.cover?.logo,
    installerName,
    ownerName,
  });

  addPage();
  renderDp1Page(doc, 'DP1 - PLAN DE SITUATION', '1/1000', assets.dp1.plan1000, assets.dp1.ortho1000);

  addPage();
  renderDp1Page(doc, 'DP1 - PLAN DE SITUATION', '1/2000', assets.dp1.plan2000);

  addPage();
  renderDp1Page(doc, 'DP1 - PLAN DE SITUATION', '1/5000', assets.dp1.plan5000);

  addPage();
  renderDp2Page(doc, 'DP2 - PLAN DE MASSE AVANT', '1/250', assets.dp2.avant);

  addPage();
  renderDp2Page(doc, 'DP2 - PLAN DE MASSE APRES', '1/250', assets.dp2.apres);

  addPage();
  renderDp4Page(
    doc,
    {
      address: geocoded.label,
      parcelRef,
      powerKw,
      surfaceM2,
      panelType,
      roofType,
      orientation,
      slope,
    },
    assets.dp4.ortho
  );

  addPage();
  renderDp5Page(doc, assets.dp5.ortho);

  addPage();
  renderDp6Page(doc, assets.dp6.view);

  addPage();
  renderDp7Dp8Page(doc, assets.dp7.view, assets.dp8.view);

  addPage();
  renderDp11Page(
    doc,
    buildNoticeText({ city: geocoded.city || 'VILLE', parcelRef, orientation: orientation.toUpperCase() })
  );

  doc.end();

  await new Promise<void>((resolve, reject) => {
    pdfStream.on('finish', resolve);
    pdfStream.on('error', reject);
    doc.on('error', reject);
  });

  return pdfPath;
}
