import axios from 'axios';
import fs from 'fs/promises';
import sharp from 'sharp';
import type { LambertPoint } from './geo';

export type BBox = [number, number, number, number];

export type MapFrame = {
  widthMm: number;
  heightMm: number;
};

export type BBoxFromScale = {
  bbox: BBox;
  widthPx: number;
  heightPx: number;
  metersPerPixel: number;
};

export type WmsRequest = {
  layer: string;
  bbox: BBox;
  widthPx: number;
  heightPx: number;
  format?: 'image/png' | 'image/jpeg';
  transparent?: boolean;
  dpi?: number;
};

const IGN_WMS_ENDPOINT = 'https://data.geopf.fr/wms-r';
const MAX_TILE_SIZE = 2048;

export function bboxFromScale(
  center: LambertPoint,
  scale: number,
  frame: MapFrame,
  dpi: number
): BBoxFromScale {
  const widthPx = Math.round((frame.widthMm / 25.4) * dpi);
  const heightPx = Math.round((frame.heightMm / 25.4) * dpi);

  const widthMeters = (frame.widthMm * scale) / 1000;
  const heightMeters = (frame.heightMm * scale) / 1000;

  const minx = center.x - widthMeters / 2;
  const maxx = center.x + widthMeters / 2;
  const miny = center.y - heightMeters / 2;
  const maxy = center.y + heightMeters / 2;

  return {
    bbox: [minx, miny, maxx, maxy],
    widthPx,
    heightPx,
    metersPerPixel: widthMeters / widthPx,
  };
}

export function buildWmsUrl({
  layer,
  bbox,
  widthPx,
  heightPx,
  format = 'image/png',
  transparent = false,
  dpi,
}: WmsRequest): string {
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    VERSION: '1.3.0',
    REQUEST: 'GetMap',
    LAYERS: layer,
    STYLES: '',
    CRS: 'EPSG:2154',
    BBOX: bbox.join(','),
    WIDTH: String(widthPx),
    HEIGHT: String(heightPx),
    FORMAT: format,
    TRANSPARENT: transparent ? 'TRUE' : 'FALSE',
  });

  if (dpi) {
    params.set('FORMAT_OPTIONS', `dpi:${dpi}`);
  }

  return `${IGN_WMS_ENDPOINT}?${params.toString()}`;
}

async function fetchWmsBuffer(url: string): Promise<Buffer> {
  const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
  return Buffer.from(response.data);
}

function bboxForTile(bbox: BBox, fullWidth: number, fullHeight: number, x: number, y: number, w: number, h: number): BBox {
  const [minx, miny, maxx, maxy] = bbox;
  const spanX = maxx - minx;
  const spanY = maxy - miny;

  const x0 = minx + (x / fullWidth) * spanX;
  const x1 = minx + ((x + w) / fullWidth) * spanX;

  const yTop = maxy - (y / fullHeight) * spanY;
  const yBottom = maxy - ((y + h) / fullHeight) * spanY;

  return [x0, yBottom, x1, yTop];
}

export async function fetchWmsImage(request: WmsRequest): Promise<Buffer> {
  const { widthPx, heightPx } = request;
  const format = request.format || 'image/png';

  if (widthPx <= MAX_TILE_SIZE && heightPx <= MAX_TILE_SIZE) {
    const url = buildWmsUrl(request);
    return fetchWmsBuffer(url);
  }

  const cols = Math.ceil(widthPx / MAX_TILE_SIZE);
  const rows = Math.ceil(heightPx / MAX_TILE_SIZE);

  const composites: sharp.OverlayOptions[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = col * MAX_TILE_SIZE;
      const y = row * MAX_TILE_SIZE;
      const w = Math.min(MAX_TILE_SIZE, widthPx - x);
      const h = Math.min(MAX_TILE_SIZE, heightPx - y);

      const tileBbox = bboxForTile(request.bbox, widthPx, heightPx, x, y, w, h);
      const url = buildWmsUrl({ ...request, bbox: tileBbox, widthPx: w, heightPx: h });
      const tileBuffer = await fetchWmsBuffer(url);

      composites.push({ input: tileBuffer, left: x, top: y });
    }
  }

  const base = sharp({
    create: {
      width: widthPx,
      height: heightPx,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    },
  }).composite(composites);

  if (format.includes('jpeg')) {
    return base.jpeg({ quality: 92 }).toBuffer();
  }

  return base.png().toBuffer();
}

export async function saveWmsImage(request: WmsRequest, outPath: string): Promise<string> {
  const buffer = await fetchWmsImage(request);
  await fs.writeFile(outPath, buffer);
  return outPath;
}
