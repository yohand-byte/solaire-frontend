import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import type { LambertPoint } from './geo';
import type { MapFrame, WmsRequest } from './ign';
import { bboxFromScale, saveWmsImage } from './ign';
import axios from 'axios';
import {
  overlaySvgsOnImage,
  svgCurvedArrow,
  svgHandDrawnCircle,
  svgHouseOutline,
  svgInfoBox,
  svgLegendBox,
  svgNorthArrow,
  svgPanelRects,
} from './overlays';

export type MapSpec = {
  center: LambertPoint;
  scale: number;
  frame: MapFrame;
  dpi: number;
  layer: string;
  format?: 'image/png' | 'image/jpeg';
  transparent?: boolean;
  outPath: string;
};

export type Dp1Frames = {
  frame1000: MapFrame;
  frame2000: MapFrame;
  frame5000: MapFrame;
};

export type Dp1Maps = {
  plan1000: string;
  ortho1000: string;
  plan2000: string;
  plan5000: string;
};

export type Dp1OverlayMaps = {
  plan1000: string;
  ortho1000: string;
};

export type Dp1ManualOverlayOptions = {
  circle?: {
    xRatio: number;
    yRatio: number;
    radiusRatio: number;
  };
  arrow?: {
    startXRatio: number;
    startYRatio: number;
    endXRatio: number;
    endYRatio: number;
    bendRatio?: number;
  };
};

export type Dp2Maps = {
  ortho: string;
  cadastre: string;
  avant: string;
};

export type StreetViewOptions = {
  lat: number;
  lon: number;
  width: number;
  height: number;
  fov: number;
  pitch: number;
  heading: number;
  outPath: string;
};

export type StreetViewResult = {
  path: string;
  width: number;
  height: number;
};

export type Dp7Dp8Images = {
  dp7: string;
  dp8: string;
};

export async function generateIgnMap(spec: MapSpec): Promise<string> {
  const { bbox, widthPx, heightPx } = bboxFromScale(spec.center, spec.scale, spec.frame, spec.dpi);

  const request: WmsRequest = {
    layer: spec.layer,
    bbox,
    widthPx,
    heightPx,
    format: spec.format,
    transparent: spec.transparent,
    dpi: spec.dpi,
  };

  return saveWmsImage(request, spec.outPath);
}

export async function generateDp1Maps(
  center: LambertPoint,
  outDir: string,
  frames: Dp1Frames,
  dpi = 300
): Promise<Dp1Maps> {
  const plan1000 = path.join(outDir, 'dp1-plan-1000.png');
  const ortho1000 = path.join(outDir, 'dp1-ortho-1000.jpg');
  const plan2000 = path.join(outDir, 'dp1-plan-2000.png');
  const plan5000 = path.join(outDir, 'dp1-plan-5000.png');

  await generateIgnMap({
    center,
    scale: 1000,
    frame: frames.frame1000,
    dpi,
    layer: 'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2',
    format: 'image/png',
    outPath: plan1000,
  });

  await generateIgnMap({
    center,
    scale: 1000,
    frame: frames.frame1000,
    dpi,
    layer: 'ORTHOIMAGERY.ORTHOPHOTOS',
    format: 'image/jpeg',
    outPath: ortho1000,
  });

  await generateIgnMap({
    center,
    scale: 2000,
    frame: frames.frame2000,
    dpi,
    layer: 'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2',
    format: 'image/png',
    outPath: plan2000,
  });

  await generateIgnMap({
    center,
    scale: 5000,
    frame: frames.frame5000,
    dpi,
    layer: 'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2',
    format: 'image/png',
    outPath: plan5000,
  });

  return { plan1000, ortho1000, plan2000, plan5000 };
}

export async function generateDp1Overlays(
  maps: Dp1Maps,
  outDir: string,
  manual?: Dp1ManualOverlayOptions
): Promise<Dp1OverlayMaps> {
  const planOverlay = path.join(outDir, 'dp1-plan-1000-overlay.png');
  const orthoOverlay = path.join(outDir, 'dp1-ortho-1000-overlay.png');

  const orthoMeta = await sharp(maps.ortho1000).metadata();
  const orthoWidth = orthoMeta.width || 0;
  const orthoHeight = orthoMeta.height || 0;

  const circle = manual?.circle || { xRatio: 0.56, yRatio: 0.52, radiusRatio: 0.1 };
  const arrow = manual?.arrow || {
    startXRatio: 0.18,
    startYRatio: 0.72,
    endXRatio: 0.52,
    endYRatio: 0.58,
    bendRatio: 0.12,
  };

  const circleX = Math.round(orthoWidth * circle.xRatio);
  const circleY = Math.round(orthoHeight * circle.yRatio);
  const circleRadius = Math.round(Math.min(orthoWidth, orthoHeight) * circle.radiusRatio);

  const arrowStartX = Math.round(orthoWidth * arrow.startXRatio);
  const arrowStartY = Math.round(orthoHeight * arrow.startYRatio);
  const arrowEndX = Math.round(orthoWidth * arrow.endXRatio);
  const arrowEndY = Math.round(orthoHeight * arrow.endYRatio);
  const arrowBend = Math.round(Math.min(orthoWidth, orthoHeight) * (arrow.bendRatio || 0.12));

  const orthoArrowSize = Math.round(Math.min(orthoWidth, orthoHeight) * 0.12);
  const orthoArrowX = Math.round(orthoWidth - orthoArrowSize * 0.8 - 20);
  const orthoArrowY = 24;

  const orthoOverlays = [
    { svg: svgHandDrawnCircle(orthoWidth, orthoHeight, circleX, circleY, circleRadius) },
    {
      svg: svgCurvedArrow(
        orthoWidth,
        orthoHeight,
        arrowStartX,
        arrowStartY,
        arrowEndX,
        arrowEndY,
        arrowBend
      ),
    },
    { svg: svgNorthArrow(orthoWidth, orthoHeight, orthoArrowSize, orthoArrowX, orthoArrowY) },
  ];

  await overlaySvgsOnImage(maps.ortho1000, orthoOverlays, orthoOverlay);

  const meta = await sharp(maps.plan1000).metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;
  const arrowSize = Math.round(Math.min(width, height) * 0.12);
  const arrowX = Math.round(width - arrowSize * 0.8 - 20);
  const arrowY = 24;

  const arrowSvg = svgNorthArrow(width, height, arrowSize, arrowX, arrowY);
  await overlaySvgsOnImage(maps.plan1000, [{ svg: arrowSvg }], planOverlay);

  return { plan1000: planOverlay, ortho1000: orthoOverlay };
}

export async function generateDp2Cadastre(
  center: LambertPoint,
  outDir: string,
  frame: MapFrame,
  scale: number,
  dpi = 300
): Promise<Dp2Maps> {
  const orthoPath = path.join(outDir, 'dp2-ortho.jpg');
  const cadastrePath = path.join(outDir, 'dp2-cadastre.png');
  const avantPath = path.join(outDir, 'dp2-avant.png');

  await generateIgnMap({
    center,
    scale,
    frame,
    dpi,
    layer: 'ORTHOIMAGERY.ORTHOPHOTOS',
    format: 'image/jpeg',
    outPath: orthoPath,
  });

  await generateIgnMap({
    center,
    scale,
    frame,
    dpi,
    layer: 'CADASTRALPARCELS.PARCELLAIRE_EXPRESS',
    format: 'image/png',
    transparent: true,
    outPath: cadastrePath,
  });

  const cadastreBuffer = await sharp(cadastrePath)
    .ensureAlpha()
    .toBuffer();

  await sharp(orthoPath)
    .composite([{ input: cadastreBuffer, opacity: 0.55 }])
    .png()
    .toFile(avantPath);

  return { ortho: orthoPath, cadastre: cadastrePath, avant: avantPath };
}

export async function fetchStreetViewImage(options: StreetViewOptions): Promise<StreetViewResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY;

  async function writePlaceholder(reason: string): Promise<StreetViewResult> {
    const safe = (reason || 'indisponible').replace(/[<>]/g, '');
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${options.width}" height="${options.height}">
  <rect width="100%" height="100%" fill="#F3F4F6"/>
  <rect x="24" y="24" width="${options.width - 48}" height="${options.height - 48}" rx="16" fill="#FFFFFF" stroke="#D1D5DB"/>
  <text x="50%" y="46%" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" fill="#111827" font-weight="700">
    Street View indisponible
  </text>
  <text x="50%" y="54%" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#374151">
    ${safe}
  </text>
  <text x="50%" y="62%" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#6B7280">
    ${options.lat.toFixed(6)}, ${options.lon.toFixed(6)}
  </text>
</svg>`.trim();

    await sharp({
      create: {
        width: options.width,
        height: options.height,
        channels: 3,
        background: { r: 243, g: 244, b: 246 },
      },
    })
      .composite([{ input: Buffer.from(svg) }])
      .jpeg({ quality: 88 })
      .toFile(options.outPath);

    const meta = await sharp(options.outPath).metadata();
    return {
      path: options.outPath,
      width: meta.width || options.width,
      height: meta.height || options.height,
    };
  }

  if (!apiKey) {
    return writePlaceholder('clé GOOGLE_MAPS_API_KEY manquante');
  }

  const url = 'https://maps.googleapis.com/maps/api/streetview';

  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000,
      params: {
        size: `${options.width}x${options.height}`,
        location: `${options.lat},${options.lon}`,
        fov: options.fov,
        pitch: options.pitch,
        heading: options.heading,
        key: apiKey,
      },
      validateStatus: () => true,
    });

    if (response.status < 200 || response.status >= 300) {
      return writePlaceholder(`Google StreetView HTTP ${response.status}`);
    }

    await fs.writeFile(options.outPath, Buffer.from(response.data));
    const meta = await sharp(options.outPath).metadata();
    return {
      path: options.outPath,
      width: meta.width || options.width,
      height: meta.height || options.height,
    };
  } catch (error: any) {
    const msg = (error && (error.message || String(error))) || 'erreur inconnue';
    return writePlaceholder(msg);
  }
}


export async function generateDp7Dp8(
  lat: number,
  lon: number,
  outDir: string,
  width = 2400,
  height = 1600
): Promise<Dp7Dp8Images> {
  const dp7 = path.join(outDir, 'dp7-streetview-proche.jpg');
  const dp8 = path.join(outDir, 'dp8-streetview-loin.jpg');

  await fetchStreetViewImage({
    lat,
    lon,
    width,
    height,
    fov: 80,
    pitch: 8,
    heading: 0,
    outPath: dp7,
  });

  await fetchStreetViewImage({
    lat,
    lon,
    width,
    height,
    fov: 110,
    pitch: 5,
    heading: 20,
    outPath: dp8,
  });

  return { dp7, dp8 };
}

export async function generateDp5(
  center: LambertPoint,
  outDir: string,
  frame: MapFrame,
  scale: number,
  dpi = 300
): Promise<string> {
  const basePath = path.join(outDir, 'dp5-ortho.jpg');
  const outPath = path.join(outDir, 'dp5-ortho-panels.png');

  await generateIgnMap({
    center,
    scale,
    frame,
    dpi,
    layer: 'ORTHOIMAGERY.ORTHOPHOTOS',
    format: 'image/jpeg',
    outPath: basePath,
  });

  const meta = await sharp(basePath).metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;

  const houseWidth = Math.round(width * 0.28);
  const houseHeight = Math.round(height * 0.22);
  const houseX = Math.round(width * 0.36);
  const houseY = Math.round(height * 0.32);

  const panelW = Math.round(houseWidth * 0.22);
  const panelH = Math.round(houseHeight * 0.18);
  const panels = [
    { x: houseX + panelW * 0.2, y: houseY + panelH * 0.6, width: panelW, height: panelH },
    { x: houseX + panelW * 1.5, y: houseY + panelH * 0.6, width: panelW, height: panelH },
    { x: houseX + panelW * 2.8, y: houseY + panelH * 0.6, width: panelW, height: panelH },
    { x: houseX + panelW * 0.2, y: houseY + panelH * 1.8, width: panelW, height: panelH },
    { x: houseX + panelW * 1.5, y: houseY + panelH * 1.8, width: panelW, height: panelH },
  ];

  const overlays = [
    { svg: svgHouseOutline(width, height, houseX, houseY, houseWidth, houseHeight) },
    { svg: svgPanelRects(width, height, panels) },
    {
      svg: svgLegendBox(
        width,
        height,
        Math.round(width * 0.05),
        Math.round(height * 0.82),
        190,
        28,
        'Panneaux photovoltaiques'
      ),
    },
  ];

  await overlaySvgsOnImage(basePath, overlays, outPath);
  return outPath;
}

export async function generateDp6(
  lat: number,
  lon: number,
  outDir: string,
  width = 2400,
  height = 1600
): Promise<string> {
  const basePath = path.join(outDir, 'dp6-streetview.jpg');
  const outPath = path.join(outDir, 'dp6-streetview-panels.png');

  const base = await fetchStreetViewImage({
    lat,
    lon,
    width,
    height,
    fov: 90,
    pitch: 10,
    heading: 0,
    outPath: basePath,
  });

  const actualWidth = base.width;
  const actualHeight = base.height;

  const panelWidth = Math.round(actualWidth * 0.12);
  const panelHeight = Math.round(actualHeight * 0.06);
  const startX = Math.round(actualWidth * 0.43);
  const startY = Math.round(actualHeight * 0.48);

  const panels = [
    { x: startX, y: startY, width: panelWidth, height: panelHeight },
    { x: startX + panelWidth + 10, y: startY, width: panelWidth, height: panelHeight },
    { x: startX, y: startY + panelHeight + 8, width: panelWidth, height: panelHeight },
    { x: startX + panelWidth + 10, y: startY + panelHeight + 8, width: panelWidth, height: panelHeight },
  ];

  const overlays = [
    { svg: svgPanelRects(actualWidth, actualHeight, panels) },
    {
      svg: svgInfoBox(
        actualWidth,
        actualHeight,
        Math.round(actualWidth * 0.05),
        Math.round(actualHeight * 0.08),
        220,
        80,
        'Installation projete',
        ['Panneaux noirs mats', 'Pose en surimposition']
      ),
    },
  ];

  await overlaySvgsOnImage(base.path, overlays, outPath);
  return outPath;
}
