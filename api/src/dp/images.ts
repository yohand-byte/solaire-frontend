import path from 'path';
import sharp from 'sharp';
import type { LambertPoint } from './geo';
import type { MapFrame, WmsRequest } from './ign';
import { bboxFromScale, saveWmsImage } from './ign';
import { addDp1Overlays, overlaySvgsOnImage, svgNorthArrow } from './overlays';

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
  outDir: string
): Promise<Dp1OverlayMaps> {
  const planOverlay = path.join(outDir, 'dp1-plan-1000-overlay.png');
  const orthoOverlay = path.join(outDir, 'dp1-ortho-1000-overlay.png');

  await addDp1Overlays(maps.ortho1000, orthoOverlay);

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
