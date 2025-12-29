import fs from 'fs/promises';
import sharp from 'sharp';

export type OverlaySpec = {
  svg: string;
  left?: number;
  top?: number;
};

export function svgDottedCircle(
  width: number,
  height: number,
  centerX: number,
  centerY: number,
  radius: number
): string {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <circle
    cx="${centerX}"
    cy="${centerY}"
    r="${radius}"
    fill="none"
    stroke="#DC2626"
    stroke-width="4"
    stroke-dasharray="10 8"
  />
</svg>
`.trim();
}

export function svgCenterPoint(
  width: number,
  height: number,
  centerX: number,
  centerY: number,
  radius: number
): string {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <circle
    cx="${centerX}"
    cy="${centerY}"
    r="${radius}"
    fill="#F59E0B"
    stroke="#B45309"
    stroke-width="2"
  />
</svg>
`.trim();
}

export function svgNorthArrow(width: number, height: number, size: number, x: number, y: number): string {
  const arrowHeight = size;
  const arrowWidth = Math.round(size * 0.6);
  const tipX = x + arrowWidth / 2;
  const tipY = y;
  const baseY = y + arrowHeight;
  const leftX = x;
  const rightX = x + arrowWidth;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <polygon
    points="${tipX},${tipY} ${rightX},${baseY} ${leftX},${baseY}"
    fill="#111827"
  />
  <text
    x="${tipX}"
    y="${y - 6}"
    text-anchor="middle"
    font-family="Noto Sans"
    font-size="${Math.round(size * 0.35)}"
    fill="#111827"
    font-weight="700"
  >N</text>
</svg>
`.trim();
}

export async function overlaySvgsOnImage(
  basePath: string,
  overlays: OverlaySpec[],
  outPath: string
): Promise<string> {
  const base = sharp(basePath);
  const inputs = overlays.map((overlay) => ({
    input: Buffer.from(overlay.svg),
    left: overlay.left ?? 0,
    top: overlay.top ?? 0,
  }));

  await base.composite(inputs).toFile(outPath);
  return outPath;
}

export async function addDp1Overlays(basePath: string, outPath: string): Promise<string> {
  const meta = await sharp(basePath).metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;

  const centerX = Math.round(width / 2);
  const centerY = Math.round(height / 2);
  const circleRadius = Math.round(Math.min(width, height) * 0.1);
  const pointRadius = Math.max(6, Math.round(Math.min(width, height) * 0.015));

  const arrowSize = Math.round(Math.min(width, height) * 0.12);
  const arrowX = Math.round(width - arrowSize * 0.8 - 20);
  const arrowY = 24;

  const overlays: OverlaySpec[] = [
    { svg: svgDottedCircle(width, height, centerX, centerY, circleRadius) },
    { svg: svgCenterPoint(width, height, centerX, centerY, pointRadius) },
    { svg: svgNorthArrow(width, height, arrowSize, arrowX, arrowY) },
  ];

  return overlaySvgsOnImage(basePath, overlays, outPath);
}

export async function writeSvg(path: string, svg: string): Promise<void> {
  await fs.writeFile(path, svg);
}
