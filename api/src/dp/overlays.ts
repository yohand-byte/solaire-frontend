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

export type PanelRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function svgPanelRects(
  width: number,
  height: number,
  panels: PanelRect[],
  fill = 'rgba(30, 58, 138, 0.45)',
  stroke = '#1E3A8A'
): string {
  const rects = panels
    .map(
      (panel) =>
        `<rect x="${panel.x}" y="${panel.y}" width="${panel.width}" height="${panel.height}" fill="${fill}" stroke="${stroke}" stroke-width="2" />`
    )
    .join('');

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  ${rects}
</svg>
`.trim();
}

export function svgLegendBox(
  width: number,
  height: number,
  x: number,
  y: number,
  boxWidth: number,
  boxHeight: number,
  text: string
): string {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect x="${x}" y="${y}" width="${boxWidth}" height="${boxHeight}" fill="#FFFFFF" stroke="#D1D5DB" stroke-width="1" />
  <text x="${x + 10}" y="${y + boxHeight / 2 + 4}" font-family="Noto Sans" font-size="12" fill="#111827">${text}</text>
</svg>
`.trim();
}

export function svgInfoBox(
  width: number,
  height: number,
  x: number,
  y: number,
  boxWidth: number,
  boxHeight: number,
  title: string,
  lines: string[]
): string {
  const lineHeight = 14;
  const textLines = lines
    .map((line, index) => {
      const lineY = y + 26 + index * lineHeight;
      return `<text x="${x + 10}" y="${lineY}" font-family="Noto Sans" font-size="11" fill="#111827">${line}</text>`;
    })
    .join('');

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect x="${x}" y="${y}" width="${boxWidth}" height="${boxHeight}" fill="#FFFFFF" stroke="#D1D5DB" stroke-width="1" />
  <text x="${x + 10}" y="${y + 16}" font-family="Noto Sans" font-size="12" fill="#1E3A8A" font-weight="700">${title}</text>
  ${textLines}
</svg>
`.trim();
}

export function svgHouseOutline(
  width: number,
  height: number,
  x: number,
  y: number,
  houseWidth: number,
  houseHeight: number
): string {
  const roofHeight = houseHeight * 0.4;
  const bodyHeight = houseHeight - roofHeight;
  const roofLeft = x;
  const roofRight = x + houseWidth;
  const roofTop = y;
  const roofBase = y + roofHeight;
  const roofMid = x + houseWidth / 2;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <polygon points="${roofLeft},${roofBase} ${roofMid},${roofTop} ${roofRight},${roofBase}" fill="none" stroke="#111827" stroke-width="2" />
  <rect x="${x}" y="${roofBase}" width="${houseWidth}" height="${bodyHeight}" fill="none" stroke="#111827" stroke-width="2" />
</svg>
`.trim();
}
